'use client';

import { useState } from 'react';
import { ArrowLeft, Users, ChevronDown, ChevronUp, Calendar, Star, Grid3x3, AlignLeft, CheckSquare, Circle, BookOpen, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

const TYPE_ICONS = {
    rating: Star, rating_grid: Grid3x3, short_text: AlignLeft,
    long_text: AlignLeft, single_choice: Circle, multiple_choice: CheckSquare,
    dropdown: ChevronDown, gender: Users, quiz: BookOpen,
    choice_suggestion: MessageSquarePlus,
};
const TYPE_COLORS = {
    rating: 'text-amber-500', rating_grid: 'text-primary', short_text: 'text-sky-500',
    long_text: 'text-teal-500', single_choice: 'text-emerald-500', multiple_choice: 'text-primary',
    dropdown: 'text-rose-500', gender: 'text-pink-500', quiz: 'text-orange-500',
    choice_suggestion: 'text-teal-500',
};
const ratingColors = { 5: 'bg-emerald-500', 4: 'bg-blue-500', 3: 'bg-amber-400', 2: 'bg-orange-500', 1: 'bg-red-500' };

export default function ResponsesClient({ id, data, formTitle }) {
    const [expandedId, setExpandedId] = useState(null);

    if (!data) return null;

    const { total, sections, questions, responses } = data;

    const getQuestion = (qid) => questions.find(q => q.id === qid);

    const getRespondentName = (response) => {
        const shortQ = questions.find(q => q.type === 'short_text');
        if (!shortQ) return `Response #${response.id}`;
        const ans = response.answers.find(a => a.question_id === shortQ.id);
        return ans?.answer_text || `Response #${response.id}`;
    };

    const getOverallRating = (response) => {
        const ratingQs = questions.filter(q => q.type === 'rating');
        if (ratingQs.length === 0) return null;
        const lastRatingQ = ratingQs[ratingQs.length - 1];
        const ans = response.answers.find(a => a.question_id === lastRatingQ.id);
        return ans?.answer_numeric ?? null;
    };

    const renderAnswerValue = (question, responseAnswers) => {
        const answers = responseAnswers.filter(a => a.question_id === question.id);
        if (answers.length === 0) return <span className="text-neutral-400 italic text-sm">ไม่ได้ตอบ</span>;

        if (question.type === 'rating') {
            const val = answers[0].answer_numeric;
            return (
                <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                        <div key={s} className={`w-7 h-7 rounded-none flex items-center justify-center text-xs font-bold
                            ${s <= val ? 'bg-amber-400 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}>
                            {s}
                        </div>
                    ))}
                    <span className="ml-1 text-sm font-semibold text-amber-600 dark:text-amber-400">{val}/5</span>
                </div>
            );
        }

        if (question.type === 'rating_grid') {
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse mt-1">
                        <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-800">
                                <th className="text-left px-2 py-1.5 text-neutral-500 font-medium border border-neutral-200 dark:border-neutral-700 w-2/3">หัวข้อ</th>
                                {[5,4,3,2,1].map(s => (
                                    <th key={s} className="px-2 py-1.5 text-center font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 w-10">{s}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {question.options.map(opt => {
                                const ans = answers.find(a => a.option_id === opt.id);
                                const score = ans?.answer_numeric;
                                return (
                                    <tr key={opt.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                        <td className="px-2 py-1.5 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">{opt.text}</td>
                                        {[5,4,3,2,1].map(s => (
                                            <td key={s} className="px-2 py-1.5 text-center border border-neutral-200 dark:border-neutral-700">
                                                {score === s
                                                    ? <span className="inline-flex w-5 h-5 items-center justify-center bg-primary text-white rounded-none text-[10px] font-bold mx-auto">{s}</span>
                                                    : <span className="inline-flex w-5 h-5 items-center justify-center rounded-none border border-neutral-200 dark:border-neutral-600 text-neutral-300 dark:text-neutral-600 mx-auto text-[10px]">{s}</span>
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (question.type === 'multiple_choice') {
            return (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {question.options.map(opt => {
                        const chosenAns = answers.find(a => a.option_id === opt.id);
                        const chosen = !!chosenAns;
                        return (
                            <div key={opt.id} className="flex flex-col gap-1">
                                <span className={`px-2.5 py-1 rounded-none text-xs font-medium border transition-colors
                                    ${chosen
                                        ? 'bg-primary-50 dark:bg-primary/20 border-primary-100 dark:border-primary/40 text-primary dark:text-primary-light'
                                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                    }`}>
                                    {chosen ? '✓ ' : ''}{opt.text}
                                </span>
                                {chosen && chosenAns.answer_text && (
                                    <span className="ml-1 text-xs text-primary dark:text-primary-light bg-primary-50 dark:bg-primary/10 px-2 py-0.5 rounded-none border border-primary-100 dark:border-primary/30">
                                        ✎ {chosenAns.answer_text}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (question.type === 'single_choice') {
            const ans = answers[0];
            return (
                <div className="space-y-1.5 mt-1">
                    <div className="flex flex-wrap gap-1.5">
                        {question.options.map(opt => {
                            const chosen = ans?.option_id === opt.id;
                            return (
                                <span key={opt.id} className={`px-2.5 py-1 rounded-none text-xs font-medium border
                                    ${chosen
                                        ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                    }`}>
                                    {chosen ? '● ' : '○ '}{opt.text}
                                </span>
                            );
                        })}
                    </div>
                    {ans?.answer_text && (
                        <div className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-none border border-emerald-200 dark:border-emerald-700/40 w-fit max-w-full">
                            <span className="flex-shrink-0">✎</span>
                            <span className="break-words">{ans.answer_text}</span>
                        </div>
                    )}
                </div>
            );
        }

        if (question.type === 'dropdown') {
            const ans = answers[0];
            return <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{ans?.option_text || ans?.answer_text || '-'}</span>;
        }

        if (question.type === 'gender') {
            const val = answers[0]?.answer_text;
            return (
                <span className={`px-3 py-1 rounded-none text-sm font-semibold ${
                    val === 'ชาย' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : val === 'หญิง' ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                    : 'bg-neutral-100 text-neutral-500'
                }`}>
                    {val === 'ชาย' ? '♂ ชาย' : val === 'หญิง' ? '♀ หญิง' : val || '-'}
                </span>
            );
        }

        if (question.type === 'quiz') {
            const ans = answers[0];
            const labels = ['A', 'B', 'C', 'D'];
            return (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {question.options.map((opt, idx) => {
                        const chosen = ans?.option_id === opt.id;
                        return (
                            <span key={opt.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-medium border
                                ${chosen
                                    ? 'bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 font-semibold'
                                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                }`}>
                                <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-black
                                    ${chosen ? 'bg-orange-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}>
                                    {labels[idx]}
                                </span>
                                {opt.text}
                            </span>
                        );
                    })}
                </div>
            );
        }

        if (question.type === 'long_text' || question.type === 'short_text') {
            const val = answers[0]?.answer_text;
            if (!val) return <span className="text-neutral-400 italic text-sm">-</span>;
            return <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">{val}</p>;
        }

        if (question.type === 'choice_suggestion') {
            // suggestion label stored in image_url field of the question
            const suggLabel = question.image_url || 'ข้อเสนอเพื่อปรับปรุง';
            return (
                <div className="mt-1 space-y-2.5">
                    {(question.options || []).map(opt => {
                        const ans = answers.find(a => a.option_id === opt.id);
                        // answer_numeric > 0 → positive (เพียงพอ) with score; 0 → only suggestion checked
                        const isPositive = ans != null && ans.answer_numeric > 0;
                        // suggestion checked: either numeric=0 (checked without positive) or answer_text present (both)
                        const hasSugg = ans != null && (ans.answer_numeric === 0 || !!ans.answer_text);
                        return (
                            <div key={opt.id} className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium flex-1 min-w-0">{opt.text}</span>
                                    {isPositive && (
                                        <span className="flex-shrink-0 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                            ✓ เพียงพอ
                                        </span>
                                    )}
                                    {hasSugg && (
                                        <span className="flex-shrink-0 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                                            ☑ {suggLabel}
                                        </span>
                                    )}
                                    {!ans && (
                                        <span className="flex-shrink-0 text-xs text-neutral-300 dark:text-neutral-600 italic">ไม่ได้ตอบ</span>
                                    )}
                                </div>
                                {ans?.answer_text && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-none border border-amber-200 dark:border-amber-700/40 ml-2 break-words">
                                        ✎ {ans.answer_text}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <span className="text-sm text-neutral-600 dark:text-neutral-300">{answers[0]?.answer_text || answers[0]?.answer_numeric || '-'}</span>;
    };

    const sectionMap = {};
    sections.forEach(s => { sectionMap[s.id] = { ...s, questions: [] }; });
    const unsectioned = [];
    questions.forEach(q => {
        if (q.section_id && sectionMap[q.section_id]) {
            sectionMap[q.section_id].questions.push(q);
        } else {
            unsectioned.push(q);
        }
    });
    const orderedSections = Object.values(sectionMap);

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-sm px-5 py-4 flex items-center gap-4">
                <Link href={`/admin/dashboard/forms/${id}/analytics`}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none transition-colors flex-shrink-0">
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2 truncate">
                        <Users className="w-5 h-5 text-primary flex-shrink-0" />
                        ผลการตอบแบบสอบถามรายบุคคล
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{formTitle}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary/10 border border-primary-100 dark:border-primary/20 rounded-none">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary dark:text-primary-light">{total}</span>
                    <span className="text-xs text-primary dark:text-primary-light">ผู้ตอบ</span>
                </div>
            </div>

            {responses.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">ยังไม่มีผู้ตอบแบบสอบถาม</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {responses.map((response, idx) => {
                        const name = getRespondentName(response);
                        const overallRating = getOverallRating(response);
                        const isExpanded = expandedId === response.id;
                        const submittedDate = new Date(response.submitted_at);

                        return (
                            <div key={response.id}
                                className="bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : response.id)}
                                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-none bg-primary-50 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-light font-bold text-sm">
                                        {total - idx}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                            <Calendar className="w-3 h-3" />
                                            {submittedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            <span>•</span>
                                            {submittedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    {overallRating !== null && (
                                        <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-none text-white text-sm font-bold ${ratingColors[overallRating] || 'bg-neutral-400'}`}>
                                            <Star className="w-3.5 h-3.5" />
                                            {overallRating}/5
                                        </div>
                                    )}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-none flex items-center justify-center text-neutral-400 hover:text-primary transition-colors">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-neutral-100 dark:border-neutral-800">
                                        {orderedSections.map(section => (
                                            <div key={section.id}>
                                                <div className="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                                                    <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{section.title}</h3>
                                                </div>
                                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                    {section.questions.filter(q => q.type !== 'heading').map(q => {
                                                        const Icon = TYPE_ICONS[q.type] || AlignLeft;
                                                        const iconColor = TYPE_COLORS[q.type] || 'text-neutral-400';
                                                        return (
                                                            <div key={q.id} className="px-5 py-4 flex gap-4">
                                                                <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}><Icon className="w-4 h-4" /></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{q.text}</p>
                                                                    {renderAnswerValue(q, response.answers)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {unsectioned.length > 0 && (
                                            <div>
                                                <div className="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-t border-neutral-100 dark:border-neutral-800">
                                                    <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">คำถามทั่วไป</h3>
                                                </div>
                                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                    {unsectioned.map(q => {
                                                        const Icon = TYPE_ICONS[q.type] || AlignLeft;
                                                        const iconColor = TYPE_COLORS[q.type] || 'text-neutral-400';
                                                        return (
                                                            <div key={q.id} className="px-5 py-4 flex gap-4">
                                                                <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}><Icon className="w-4 h-4" /></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{q.text}</p>
                                                                    {renderAnswerValue(q, response.answers)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
