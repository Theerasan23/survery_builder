'use client';

import { useState, useMemo } from 'react';
import { getFormReport } from '@/lib/actions';
import { BarChart2, Search, ChevronDown, ChevronUp, Star, MessageSquarePlus, AlignLeft, Filter, CheckSquare, List } from 'lucide-react';

// Module-level helpers — pure functions with no React/closure dependencies

const parsePipeTexts = (s) => s ? s.split('||').filter(Boolean) : [];

// Group flat SQL rows into structured question objects
function buildQuestions(rows) {
    const map = {};
    rows.forEach(r => {
        if (!map[r.question_id]) {
            map[r.question_id] = {
                id: r.question_id, text: r.question_text,
                type: r.question_type, order: r.order_index, options: []
            };
        }
        if (r.option_id) {
            map[r.question_id].options.push({
                id: r.option_id, text: r.option_text,
                answer_count: Number(r.answer_count),
                avg_score: r.avg_score ? Number(r.avg_score) : null,
                positive_count: Number(r.positive_count || 0),
                suggestion_count: Number(r.suggestion_count || 0),
                suggestion_texts: parsePipeTexts(r.suggestion_texts)
            });
        } else {
            map[r.question_id]._avg = r.avg_score ? Number(r.avg_score) : null;
            map[r.question_id]._count = Number(r.answer_count || 0);
            map[r.question_id]._texts = parsePipeTexts(r.suggestion_texts);
        }
    });
    return Object.values(map).sort((a, b) => a.order - b.order);
}

// Compute once at module load — only updates on remount (e.g. new day)
const DEFAULT_TODAY = new Date().toISOString().split('T')[0];
const DEFAULT_FIRST_OF_MONTH = DEFAULT_TODAY.slice(0, 8) + '01';

export default function ReportsClient({ forms }) {
    const [formId, setFormId] = useState('');
    const [from, setFrom] = useState(DEFAULT_FIRST_OF_MONTH);
    const [to, setTo] = useState(DEFAULT_TODAY);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedQ, setExpandedQ] = useState({});
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'suggestion' | 'rating' | 'text'

    const load = async () => {
        if (!formId) return;
        setLoading(true);
        setError('');
        setReport(null);
        setExpandedQ({}); // reset expand state when loading a new report
        try {
            const data = await getFormReport(formId, from, to);
            setReport(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggle = (id) => setExpandedQ(prev => ({ ...prev, [id]: !prev[id] }));

    // Memoized — only re-runs when report data changes, not on UI interactions
    const questions = useMemo(
        () => (report ? buildQuestions(report.questions) : []),
        [report]
    );

    // Filtered questions by type
    const filteredQuestions = useMemo(() => {
        if (typeFilter === 'all') return questions;
        if (typeFilter === 'suggestion') return questions.filter(q => q.type === 'choice_suggestion');
        if (typeFilter === 'rating') return questions.filter(q => ['rating', 'rating_grid'].includes(q.type));
        if (typeFilter === 'text') return questions.filter(q => ['short_text', 'long_text', 'organization'].includes(q.type));
        return questions;
    }, [questions, typeFilter]);

    // Overall satisfaction % — memoized, derived from questions
    const { overallAvg, satisfactionPct } = useMemo(() => {
        const ratingQs = questions.filter(q => ['rating', 'rating_grid'].includes(q.type));
        if (!ratingQs.length) return { overallAvg: null, satisfactionPct: null };
        const avg = ratingQs.reduce((sum, q) => {
            if (q.type === 'rating') return sum + (q._avg || 0);
            return sum + q.options.reduce((s, o) => s + (o.avg_score || 0), 0) / (q.options.length || 1);
        }, 0) / ratingQs.length;
        return { overallAvg: avg, satisfactionPct: ((avg / 5) * 100).toFixed(1) };
    }, [questions]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Filter Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    รายงานความพึงพอใจ
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1">เลือกแบบฟอร์ม</label>
                        <select
                            value={formId}
                            onChange={e => { setFormId(e.target.value); setReport(null); }}
                            className="w-full px-3 py-2 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">-- เลือกแบบฟอร์ม --</option>
                            {forms.map(f => (
                                <option key={f.id} value={f.id}>{f.title || `Form #${f.id}`}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1">ตั้งแต่วันที่</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="w-full px-3 py-2 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1">ถึงวันที่</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="w-full px-3 py-2 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>
                <button
                    onClick={load}
                    disabled={!formId || loading}
                    className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-semibold rounded-none text-sm transition-all"
                >
                    <Search className="w-4 h-4" />
                    {loading ? 'กำลังโหลด...' : 'แสดงรายงาน'}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {report && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none p-5 shadow-sm">
                            <p className="text-xs font-medium text-neutral-500 mb-1">จำนวนผู้ตอบ</p>
                            <p className="text-3xl font-bold text-neutral-800 dark:text-white">{report.total_responses}</p>
                        </div>
                        {satisfactionPct && (
                            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none p-5 shadow-sm">
                                <p className="text-xs font-medium text-neutral-500 mb-1">คะแนนเฉลี่ยรวม</p>
                                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{satisfactionPct}%</p>
                                <p className="text-xs text-neutral-400 mt-0.5">{overallAvg.toFixed(2)} / 5.00</p>
                            </div>
                        )}
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none p-5 shadow-sm col-span-2 sm:col-span-1">
                            <p className="text-xs font-medium text-neutral-500 mb-1">แบบฟอร์ม</p>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{report.form_title}</p>
                            <p className="text-xs text-neutral-400 mt-0.5">{from} – {to}</p>
                        </div>
                    </div>

                    {/* Type filter tabs */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none shadow-sm p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5 mr-1">
                                <Filter className="w-3.5 h-3.5" /> ดูเฉพาะ:
                            </span>
                            {[
                                { key: 'all', label: 'ทั้งหมด', icon: List, color: 'primary' },
                                { key: 'suggestion', label: 'ข้อเสนอแนะ', icon: MessageSquarePlus, color: 'teal' },
                                { key: 'rating', label: 'คะแนน / Rating', icon: Star, color: 'amber' },
                                { key: 'text', label: 'ข้อความ', icon: AlignLeft, color: 'primary' },
                            ].map(({ key, label, icon: Icon, color }) => {
                                const active = typeFilter === key;
                                const countMap = {
                                    all: questions.length,
                                    suggestion: questions.filter(q => q.type === 'choice_suggestion').length,
                                    rating: questions.filter(q => ['rating', 'rating_grid'].includes(q.type)).length,
                                    text: questions.filter(q => ['short_text', 'long_text', 'organization'].includes(q.type)).length,
                                };
                                return (
                                    <button key={key} onClick={() => setTypeFilter(key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-semibold transition-colors border ${active ? `bg-${color === 'primary' ? 'primary' : color}-50 dark:bg-${color === 'primary' ? 'primary/10' : color + '-500/20'} text-${color === 'primary' ? 'primary' : color + '-700'} dark:text-${color === 'primary' ? 'primary-light' : color + '-300'} border-${color === 'primary' ? 'primary' : color + '-200'} dark:border-${color === 'primary' ? 'primary/20' : color + '-500/30'}` : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                        <span className={`px-1.5 py-0.5 rounded-none text-[10px] font-bold ${active ? `bg-${color === 'primary' ? 'primary' : color}-100 dark:bg-${color === 'primary' ? 'primary/20' : color + '-500/30'} text-${color === 'primary' ? 'primary' : color + '-800'} dark:text-${color === 'primary' ? 'primary-light' : color + '-200'}` : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                            {countMap[key]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-question breakdown */}
                    <div className="space-y-3">
                        {filteredQuestions.length === 0 ? (
                            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none p-8 text-center text-neutral-400 text-sm">
                                ไม่มีคำถามประเภทนี้ในแบบฟอร์ม
                            </div>
                        ) : filteredQuestions.map(q => {
                            const isOpen = expandedQ[q.id] !== false; // default open
                            return (
                                <div key={q.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => toggle(q.id)}
                                        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {q.type === 'choice_suggestion'
                                                ? <MessageSquarePlus className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                : q.type === 'rating' || q.type === 'rating_grid'
                                                    ? <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                    : <AlignLeft className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                            }
                                            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{q.text}</span>
                                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-none bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                                                {q.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 pb-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                                            {/* Rating single */}
                                            {q.type === 'rating' && q._avg != null && (
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-none h-3 overflow-hidden">
                                                        <div className="h-full bg-amber-400 rounded-none" style={{ width: `${(q._avg / 5) * 100}%` }} />
                                                    </div>
                                                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 w-20 text-right">{q._avg.toFixed(2)} / 5</span>
                                                </div>
                                            )}

                                            {/* Rating grid */}
                                            {q.type === 'rating_grid' && (
                                                <div className="space-y-2">
                                                    {q.options.map(opt => (
                                                        <div key={opt.id}>
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate flex-1">{opt.text}</span>
                                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-3 w-16 text-right flex-shrink-0">
                                                                    {opt.avg_score ? opt.avg_score.toFixed(2) : '-'} / 5
                                                                </span>
                                                            </div>
                                                            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-none h-2 overflow-hidden">
                                                                <div className="h-full bg-amber-400 rounded-none" style={{ width: opt.avg_score ? `${(opt.avg_score / 5) * 100}%` : '0%' }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Choice with suggestion */}
                                            {q.type === 'choice_suggestion' && (
                                                <div className="space-y-3">
                                                    {q.options.map(opt => {
                                                        const total = opt.positive_count + opt.suggestion_count;
                                                        const posPct = total > 0 ? Math.round((opt.positive_count / total) * 100) : 0;
                                                        const sugPct = total > 0 ? 100 - posPct : 0;
                                                        return (
                                                            <div key={opt.id} className="space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{opt.text}</span>
                                                                    <span className="text-xs text-neutral-400">{total} คำตอบ</span>
                                                                </div>
                                                                <div className="flex h-5 rounded-none overflow-hidden gap-0.5">
                                                                    {posPct > 0 && (
                                                                        <div className="bg-emerald-400 flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${posPct}%` }}>
                                                                            {posPct}%
                                                                        </div>
                                                                    )}
                                                                    {sugPct > 0 && (
                                                                        <div className="bg-amber-400 flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${sugPct}%` }}>
                                                                            {sugPct}%
                                                                        </div>
                                                                    )}
                                                                    {total === 0 && <div className="bg-neutral-200 dark:bg-neutral-700 w-full rounded-none" />}
                                                                </div>
                                                                <div className="flex gap-4 text-xs text-neutral-500">
                                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-none bg-emerald-400 inline-block" />พึงพอใจ {opt.positive_count}</span>
                                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-none bg-amber-400 inline-block" />ข้อเสนอแนะ {opt.suggestion_count}</span>
                                                                </div>
                                                                {opt.suggestion_texts.length > 0 && (
                                                                    <div className="mt-1.5 space-y-1">
                                                                        {opt.suggestion_texts.map((t, i) => (
                                                                            <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-none px-2.5 py-1.5">
                                                                                {t}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Short/long text answers */}
                                            {['short_text', 'long_text', 'organization'].includes(q.type) && q._texts?.length > 0 && (
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {q._texts.map((t, i) => (
                                                        <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-none px-2.5 py-1.5">{t}</p>
                                                    ))}
                                                </div>
                                            )}

                                            {report.total_responses > 0 && ['short_text', 'long_text', 'organization'].includes(q.type) && q._texts?.length === 0 && (
                                                <p className="text-xs text-neutral-400 italic">ไม่มีคำตอบในช่วงนี้</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {!report && !loading && (
                <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">เลือกแบบฟอร์มและช่วงวันที่ แล้วกด &ldquo;แสดงรายงาน&rdquo;</p>
                </div>
            )}
        </div>
    );
}
