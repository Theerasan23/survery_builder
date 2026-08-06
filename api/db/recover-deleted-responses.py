#!/usr/bin/env python3
"""
Rebuild responses + answers that a form edit deleted, from a decoded binlog.

The old PUT /forms/:id handler deleted a form's responses, answers, questions
and options and then re-inserted the questions/options with fresh ids. So the
deleted answers point at question/option ids that no longer exist. This script
maps each dead id onto its current equivalent by matching question text (falling
back to position within the form), and emits INSERT statements that can be
replayed against the live database.

Usage:
    mysqlbinlog --base64-output=DECODE-ROWS -v --database=form_db binlog.* > decoded.txt

    mysql ... -N -e "SELECT q.id, q.order_index, COALESCE(s.order_index,0), q.text
                     FROM questions q LEFT JOIN sections s ON s.id=q.section_id
                     WHERE q.form_id=34 ORDER BY q.id"            > cur_questions.tsv
    mysql ... -N -e "SELECT o.id, o.question_id, o.order_index, o.text
                     FROM options o JOIN questions q ON q.id=o.question_id
                     WHERE q.form_id=34 ORDER BY o.id"            > cur_options.tsv

    ./recover-deleted-responses.py --binlog decoded.txt --form 34 \
        --current-questions cur_questions.tsv --current-options cur_options.tsv \
        --out restore_form34.sql

Nothing is written to any database — the output is a .sql file to review first.
"""

import argparse
import re
import sys
from collections import defaultdict

# Column order per table, straight from the schema. @1 is the first entry.
COLUMNS = {
    'responses': ['id', 'form_id', 'personnel_form_id', 'respondent_id',
                  'submitted_at', 'personnel_id', 'job_id'],
    'answers':   ['id', 'response_id', 'question_id', 'option_id',
                  'answer_text', 'answer_numeric'],
    'questions': ['id', 'section_id', 'form_id', 'personnel_form_id', 'text', 'type',
                  'is_required', 'order_index', 'image_url', 'score', 'u_create',
                  'is_suggestion', 'quiz_label_style', 'columns_config'],
    'options':   ['id', 'question_id', 'text', 'order_index', 'score'],
    'sections':  ['id', 'form_id', 'personnel_form_id', 'title', 'description', 'order_index'],
}

ROW_CMD = re.compile(r'^### (DELETE FROM|INSERT INTO|UPDATE) `[^`]+`\.`([^`]+)`')
FIELD = re.compile(r'^###\s+@(\d+)=(.*)$')
TRAILING_COMMENT = re.compile(r'\s*/\*.*?\*/\s*$')


def parse_value(raw):
    """Turn one mysqlbinlog -v value into a Python value."""
    raw = TRAILING_COMMENT.sub('', raw).strip()
    if raw == 'NULL':
        return None
    if raw.startswith("'"):
        body = raw[1:-1] if raw.endswith("'") else raw[1:]
        out, i = [], 0
        while i < len(body):
            c = body[i]
            if c == '\\' and i + 1 < len(body):
                nxt = body[i + 1]
                out.append({'n': '\n', 'r': '\r', 't': '\t', '0': '\0',
                            "'": "'", '"': '"', '\\': '\\'}.get(nxt, nxt))
                i += 2
            else:
                out.append(c)
                i += 1
        return ''.join(out)
    try:
        return int(raw)
    except ValueError:
        try:
            return float(raw)
        except ValueError:
            return raw


def parse_binlog(path):
    """Collect every deleted row, grouped by table."""
    deleted = defaultdict(list)
    table = None
    fields = {}

    def flush():
        if table in COLUMNS and fields:
            cols = COLUMNS[table]
            row = {}
            for idx, val in fields.items():
                if idx <= len(cols):
                    row[cols[idx - 1]] = val
            deleted[table].append(row)

    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            cmd = ROW_CMD.match(line)
            if cmd:
                flush()
                table = cmd.group(2) if cmd.group(1) == 'DELETE FROM' else None
                fields = {}
                continue
            if table:
                m = FIELD.match(line)
                if m:
                    fields[int(m.group(1))] = parse_value(m.group(2))
                elif not line.startswith('###'):
                    flush()
                    table, fields = None, {}
    flush()
    return deleted


def read_tsv(path, names):
    rows = []
    if not path:
        return rows
    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if not line.strip():
                continue
            parts = line.split('\t')
            if len(parts) < len(names):
                continue
            rows.append(dict(zip(names, parts[:len(names) - 1] + ['\t'.join(parts[len(names) - 1:])])))
    return rows


def sql_literal(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    esc = str(v).replace('\\', '\\\\').replace("'", "\\'")
    esc = esc.replace('\n', '\\n').replace('\r', '\\r')
    return "'" + esc + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--binlog', required=True, help='output of mysqlbinlog --base64-output=DECODE-ROWS -v')
    ap.add_argument('--form', required=True, type=int, help='form_id to recover')
    ap.add_argument('--current-questions', required=True, help='TSV: id, order_index, section_order, text')
    ap.add_argument('--current-options', default=None, help='TSV: id, question_id, order_index, text')
    ap.add_argument('--out', required=True, help='SQL file to write')
    args = ap.parse_args()

    deleted = parse_binlog(args.binlog)

    responses = [r for r in deleted['responses'] if r.get('form_id') == args.form]
    if not responses:
        print(f'No deleted responses found for form {args.form}.', file=sys.stderr)
        return 1
    response_ids = {r['id'] for r in responses}
    answers = [a for a in deleted['answers'] if a.get('response_id') in response_ids]

    # Old structure, as it stood when the rows were deleted.
    old_questions = {q['id']: q for q in deleted['questions'] if q.get('form_id') == args.form}
    old_options = {o['id']: o for o in deleted['options'] if o.get('question_id') in old_questions}

    cur_questions = read_tsv(args.current_questions, ['id', 'order_index', 'section_order', 'text'])
    cur_options = read_tsv(args.current_options, ['id', 'question_id', 'order_index', 'text'])

    by_text = {}
    by_pos = {}
    for q in cur_questions:
        by_text.setdefault(q['text'].strip(), q['id'])
        by_pos.setdefault((q['section_order'], q['order_index']), q['id'])

    # Position of each deleted question, so questions whose text was edited in the
    # same save can still be matched.
    old_section_order = {s['id']: s.get('order_index')
                         for s in deleted['sections'] if s.get('form_id') == args.form}

    # old question id -> current question id
    qmap, unmapped_q, by_position = {}, set(), 0
    for qid, q in old_questions.items():
        text = (q.get('text') or '').strip()
        target = by_text.get(text)
        if target is None:
            sec = old_section_order.get(q.get('section_id'))
            target = by_pos.get((str(sec), str(q.get('order_index'))))
            if target is not None:
                by_position += 1
        if target is None:
            unmapped_q.add(qid)
        else:
            qmap[qid] = int(target)

    # old option id -> current option id, matched within the mapped question
    cur_opt_by_q = defaultdict(dict)
    for o in cur_options:
        cur_opt_by_q[int(o['question_id'])].setdefault(o['text'].strip(), o['id'])
    omap = {}
    for oid, o in old_options.items():
        newq = qmap.get(o.get('question_id'))
        if newq is None:
            continue
        target = cur_opt_by_q.get(newq, {}).get((o.get('text') or '').strip())
        if target is not None:
            omap[oid] = int(target)

    kept, dropped_q, dropped_o = [], 0, 0
    for a in answers:
        oldq = a.get('question_id')
        if oldq not in qmap:
            dropped_q += 1
            continue
        newopt = None
        if a.get('option_id') is not None:
            newopt = omap.get(a['option_id'])
            if newopt is None:
                dropped_o += 1
        kept.append((a['response_id'], qmap[oldq], newopt, a.get('answer_text'), a.get('answer_numeric')))

    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write(f'-- Recovery for form_id={args.form}\n')
        fh.write(f'-- {len(responses)} responses, {len(kept)} answers\n')
        fh.write('-- Review, then apply inside a transaction against a STAGING copy first.\n\n')
        fh.write('START TRANSACTION;\n\n')
        for r in sorted(responses, key=lambda x: x['id']):
            ts = r.get('submitted_at')
            ts_sql = f'FROM_UNIXTIME({ts})' if isinstance(ts, int) else sql_literal(ts)
            fh.write(
                'INSERT IGNORE INTO responses '
                '(id, form_id, personnel_form_id, respondent_id, submitted_at, personnel_id, job_id) VALUES ('
                f"{r['id']}, {sql_literal(r.get('form_id'))}, {sql_literal(r.get('personnel_form_id'))}, "
                f"{sql_literal(r.get('respondent_id'))}, {ts_sql}, "
                f"{sql_literal(r.get('personnel_id'))}, {sql_literal(r.get('job_id'))});\n")
        fh.write('\n')
        for rid, qid, oid, text, num in kept:
            fh.write(
                'INSERT INTO answers (response_id, question_id, option_id, answer_text, answer_numeric) VALUES ('
                f'{rid}, {qid}, {sql_literal(oid)}, {sql_literal(text)}, {sql_literal(num)});\n')
        fh.write('\nCOMMIT;\n')

    print(f'form {args.form}')
    print(f'  responses recovered : {len(responses)}')
    print(f'  answers recovered   : {len(kept)} of {len(answers)}')
    print(f'  questions mapped    : {len(qmap)} of {len(old_questions)}'
          + (f' ({by_position} by position — text was edited)' if by_position else ''))
    if unmapped_q:
        print(f'  ! {len(unmapped_q)} question(s) no longer on the form — {dropped_q} answers skipped')
    if dropped_o:
        print(f'  ! {dropped_o} answers kept but their option could not be matched (option_id set NULL)')
    print(f'  wrote {args.out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
