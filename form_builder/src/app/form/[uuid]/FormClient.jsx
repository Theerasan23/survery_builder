'use client';

import { useState, useMemo } from 'react';
import { submitFormResponse } from '@/lib/actions';
import { ChevronRight, ChevronLeft, Send, CheckCircle2, FileText, Star } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';

// Module-level constants — compiled once, not per render/call
const OTHER_OPTION_RE = /อื่นๆ|โปรดระบุ|ข้อเสนอเพื่อปรับปรุง|ควรเพิ่มเติม|ไม่เหมาะสม/i;
const isOtherOption = (text) => OTHER_OPTION_RE.test(text || '');

export default function FormClient({ uuid, initialForm, initialError, initialOrgSettings }) {
    // form is server-fetched and never mutated client-side
    const form = initialForm;
    const error = initialError;

    const [submitting, setSubmitting] = useState(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [otherTexts, setOtherTexts] = useState({});
    const [suggChecks, setSuggChecks] = useState({});
    const [orgSettings, setOrgSettings] = useState(initialOrgSettings || { org_name: '', logo_url: null });
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    const handleAnswerChange = (questionId, value, isMulti = false) => {
        setAnswers(prev => {
            if (isMulti) {
                const currentVal = prev[questionId] || [];
                if (currentVal.includes(value)) {
                    return { ...prev, [questionId]: currentVal.filter(v => v !== value) };
                } else {
                    return { ...prev, [questionId]: [...currentVal, value] };
                }
            } else {
                return { ...prev, [questionId]: value };
            }
        });
    };

    const validateCurrentSection = (questions) => {
        const errors = {};
        (questions || []).forEach(q => {
            if (q.type === 'heading') return;
            if (!q.is_required) return;

            // rating_grid: every row (option) must have an answer
            if (q.type === 'rating_grid') {
                const allAnswered = (q.options || []).every(opt => {
                    const v = answers[`${q.id}-${opt.id}`];
                    return v !== undefined && v !== null && v !== '';
                });
                if (!allAnswered) errors[q.id] = true;
                return;
            }

            // choice_suggestion: every row must be either marked positive or have a suggestion checked
            if (q.type === 'choice_suggestion') {
                const allAnswered = (q.options || []).every(opt => {
                    const rk = `${q.id}-${opt.id}`;
                    return answers[rk] === 'positive' || suggChecks[rk];
                });
                if (!allAnswered) errors[q.id] = true;
                return;
            }

            const val = answers[q.id];
            const isEmpty =
                val === undefined || val === null || val === '' ||
                (Array.isArray(val) && val.length === 0);
            if (isEmpty) errors[q.id] = true;
        });
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitForm = async () => {
        if (!validateCurrentSection(currentStep?.questions)) return;
        const ok = await confirm({ variant: 'submit', message: 'ต้องการส่งแบบฟอร์มนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSubmitting(true);
        try {
            // Build O(1) lookup map once — avoids O(answers × questions) linear scan
            const questionMap = {};
            form.unsectioned_questions?.forEach(q => { questionMap[q.id] = q; });
            form.sections?.forEach(sec => sec.questions?.forEach(q => { questionMap[q.id] = q; }));

            const formattedAnswers = [];
            Object.entries(answers).forEach(([qIdStr, value]) => {
                const isGridStr = qIdStr.includes('-');
                const qId = parseInt(isGridStr ? qIdStr.split('-')[0] : qIdStr);
                const suffix = isGridStr ? qIdStr.split('-')[1] : null;
                const optId = isGridStr ? parseInt(suffix) : null;

                const foundQ = questionMap[qId] ?? null;
                const qType = foundQ?.type ?? 'text';

                // organization stores its detail under `${qId}-detail`; combined into the main answer below
                if (qType === 'organization' && suffix === 'detail') return;

                if (qType === 'choice_suggestion' && isGridStr) {
                    const isPositive = value === 'positive';
                    const hasSugg = !!suggChecks[qIdStr];
                    const suggTxt = hasSugg ? (otherTexts[qIdStr] || null) : null;
                    const optObj = (foundQ?.options || []).find(o => String(o.id) === String(optId));
                    const positiveScore = (isPositive && optObj?.score != null) ? parseFloat(optObj.score) : (isPositive ? 1 : 0);
                    formattedAnswers.push({
                        question_id: qId,
                        option_id: optId,
                        answer_numeric: positiveScore,
                        answer_text: suggTxt
                    });
                } else if (qType === 'rating_grid' && isGridStr) {
                    formattedAnswers.push({ question_id: qId, option_id: optId, answer_numeric: parseInt(value) });
                } else if (qType === 'rating') {
                    formattedAnswers.push({ question_id: qId, answer_numeric: parseInt(value) });
                } else if (qType === 'multiple_choice') {
                    const optsList = foundQ?.options || [];
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            const optObj = optsList.find(o => String(o.id) === String(v));
                            const otherTxt = isOtherOption(optObj?.text) ? (otherTexts[qId] || null) : null;
                            const score = optObj?.score != null ? parseFloat(optObj.score) : undefined;
                            formattedAnswers.push({
                                question_id: qId,
                                option_id: parseInt(v),
                                ...(otherTxt ? { answer_text: otherTxt } : {}),
                                ...(score != null ? { answer_numeric: score } : {}),
                            });
                        });
                    } else if (value) {
                        formattedAnswers.push({ question_id: qId, option_id: parseInt(value) });
                    }
                } else if (qType === 'single_choice' || qType === 'dropdown' || qType === 'quiz') {
                    const optsList = foundQ?.options || [];
                    const optObj = optsList.find(o => String(o.id) === String(value));
                    const otherTxt = isOtherOption(optObj?.text) ? (otherTexts[qId] || null) : null;
                    const score = (qType !== 'quiz' && optObj?.score != null) ? parseFloat(optObj.score) : undefined;
                    formattedAnswers.push({
                        question_id: qId,
                        option_id: parseInt(value),
                        ...(otherTxt ? { answer_text: otherTxt } : {}),
                        ...(score != null ? { answer_numeric: score } : {}),
                    });
                } else if (qType === 'gender') {
                    formattedAnswers.push({ question_id: qId, answer_text: value });
                } else if (qType === 'organization') {
                    const orgName = (value || '').trim();
                    const detail = (answers[`${qId}-detail`] || '').trim();
                    const detailPart = detail ? ` | ${detail}` : '';
                    formattedAnswers.push({ question_id: qId, answer_text: `${orgName}${detailPart}` });
                } else {
                    // short_text / long_text — if question has a score assigned, include it
                    const qScore = foundQ?.score != null ? parseFloat(foundQ.score) : undefined;
                    formattedAnswers.push({
                        question_id: qId,
                        answer_text: value,
                        ...(qScore != null && value ? { answer_numeric: qScore } : {}),
                    });
                }
            });

            const result = await submitFormResponse(uuid, formattedAnswers);
            if (!result.ok) throw new Error('Submit failed');
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit form: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Hooks must be called before any early returns (Rules of Hooks) ──
    const steps = useMemo(() => {
        const s = [];
        if (form?.unsectioned_questions?.length > 0)
            s.push({ title: 'Basic Info', questions: form.unsectioned_questions });
        form?.sections?.forEach(sec =>
            s.push({ id: sec.id, title: sec.title, description: sec.description, questions: sec.questions || [] })
        );
        return s;
    }, [form]);

    const currentStep = steps[currentSectionIndex] ?? null;
    const isFirstStep = currentSectionIndex === 0;
    const isLastStep = steps.length === 0 || currentSectionIndex === steps.length - 1;
    const progress = steps.length <= 1 ? 100 : Math.round((currentSectionIndex / (steps.length - 1)) * 100);

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 dark:from-[#09090b] p-6">
            <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-xl text-center border border-red-100 dark:border-red-900/30">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">ไม่พบแบบฟอร์ม</h2>
                <p className="text-neutral-500 dark:text-neutral-400">{error}</p>
            </div>
        </div>
    );

    if (!form) return null;

    // ─── Form Closed Screen ────────────────────────────────────────────────────
    if (!form.is_active) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-6">
                <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 shadow-sm p-10 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">แบบฟอร์มปิดรับคำตอบแล้ว</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">ขณะนี้แบบฟอร์มนี้ไม่เปิดรับการตอบกลับ<br />กรุณาติดต่อผู้ดูแลระบบเพื่อขอข้อมูลเพิ่มเติม</p>
                    </div>
                    <div className="w-full pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs text-neutral-400 font-medium">{form.title}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Success Screen ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-[#09090b] dark:via-emerald-950/20 dark:to-[#09090b] p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white dark:bg-neutral-900 border border-emerald-100 dark:border-emerald-900/30 p-10 rounded-3xl shadow-2xl shadow-emerald-500/10 flex flex-col items-center text-center space-y-5">
                        <div className="relative">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={1.5} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm animate-bounce shadow-md">
                                ✨
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-100 mb-2">ส่งแบบฟอร์มสำเร็จ!</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">ขอบคุณที่ตอบแบบฟอร์ม<br />คำตอบของคุณถูกบันทึกเรียบร้อยแล้ว</p>
                        </div>
                        <div className="w-full pt-2">
                            <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full"></div>
                        </div>
                        <p className="text-xs text-neutral-400">{form.title}</p>
                    </div>
                </div>
            </div>
        );
    }

    const nextStep = () => {
        if (!isLastStep && validateCurrentSection(currentStep?.questions)) {
            setValidationErrors({});
            setCurrentSectionIndex(prev => prev + 1);
        }
    };
    const prevStep = () => { if (!isFirstStep) setCurrentSectionIndex(prev => prev - 1); };

    // ─── Question Renderer ─────────────────────────────────────────────────────
    const renderQuestion = (q, qIndex) => {
        const val = answers[q.id] || '';
        const hasError = validationErrors[q.id];

        // ── Heading type — section divider, no answer ──
        if (q.type === 'heading') {
            return (
                <div key={q.id} className="pt-2 pb-1">
                    <div className="rounded bg-slate-700 px-6 py-4 shadow-sm">
                        <p className="text-white font-bold text-base leading-snug whitespace-pre-line">{q.text}</p>
                    </div>
                </div>
            );
        }

        return (
            <div key={q.id} className={`group relative bg-white dark:bg-neutral-900 rounded-md border shadow-sm transition-all duration-200 overflow-hidden ${hasError ? 'border-rose-400 dark:border-rose-500' : 'border-neutral-200 dark:border-neutral-800'}`}>
                {/* Left accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 transition-opacity duration-300 ${hasError ? 'bg-rose-400 opacity-100' : 'bg-slate-400 opacity-0 group-hover:opacity-100'}`}></div>

                <div className="p-5 sm:p-6 space-y-4">
                    {/* Question header */}
                    <div>
                        <label className="text-base font-semibold text-neutral-800 dark:text-neutral-100 leading-snug whitespace-pre-line">
                            {q.text}
                            {!!q.is_required && <span className="text-rose-500 ml-1.5 font-bold">*</span>}
                        </label>
                        {hasError && (
                            <p className="text-xs text-rose-500 font-medium mt-1">กรุณาตอบคำถามนี้ก่อนดำเนินการต่อ</p>
                        )}
                    </div>

                    {q.image_url && q.type !== 'choice_suggestion' && (
                        <div className="flex justify-center rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                            <img
                                src={q.image_url.startsWith('http') || q.image_url.startsWith('/api/') ? q.image_url : `${process.env.NEXT_PUBLIC_SOCKET_URL}${q.image_url}`}
                                alt="question media"
                                className="max-w-full max-h-80 w-auto h-auto object-contain"
                            />
                        </div>
                    )}

                    <div>
                        {/* ── Short Text ── */}
                        {q.type === 'short_text' && (
                            <input
                                type="text"
                                value={val}
                                onChange={e => handleAnswerChange(q.id, e.target.value)}
                                className="w-full px-3 py-2.5 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white placeholder-neutral-400 transition-all text-sm"
                                placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                required={q.is_required}
                            />
                        )}

                        {/* ── Long Text ── */}
                        {(q.type === 'long_text' || q.type === 'text') && (
                            <textarea
                                value={val}
                                onChange={e => handleAnswerChange(q.id, e.target.value)}
                                className="w-full px-3 py-2.5 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white placeholder-neutral-400 transition-all text-sm resize-none min-h-[100px]"
                                placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                required={q.is_required}
                            />
                        )}

                        {/* ── Rating ── */}
                        {q.type === 'rating' && (
                            <div className="py-2">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    {[1, 2, 3, 4, 5].map(score => (
                                        <label key={score} className="flex-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`q-${q.id}`}
                                                value={score}
                                                checked={parseInt(val) === score}
                                                onChange={() => handleAnswerChange(q.id, score)}
                                                className="sr-only"
                                            />
                                            <div className={`w-full aspect-square rounded flex flex-col items-center justify-center gap-1 transition-all duration-200 border-2 font-bold text-lg cursor-pointer select-none
                                                ${parseInt(val) === score
                                                    ? 'border-slate-700 bg-slate-700 text-white shadow scale-105'
                                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                }`}>
                                                {score}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-xs text-neutral-400">น้อยที่สุด</span>
                                    <span className="text-xs text-neutral-400">มากที่สุด</span>
                                </div>
                            </div>
                        )}

                        {/* ── Rating Grid ── */}
                        {q.type === 'rating_grid' && (
                            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700/50 rounded">
                                <table className="w-full text-left min-w-[520px]">
                                    <thead>
                                        <tr className="bg-neutral-100 dark:bg-neutral-800">
                                            <th className="px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-2/5">หัวข้อ</th>
                                            {[5, 4, 3, 2, 1].map(score => (
                                                <th key={score} className="px-3 py-3 text-center text-xs font-bold text-neutral-600 dark:text-neutral-300 w-12">{score}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {q.options?.map((opt) => {
                                            const rowVal = answers[`${q.id}-${opt.id}`] || '';
                                            return (
                                                <tr key={opt.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{opt.text}</td>
                                                    {[5, 4, 3, 2, 1].map(score => (
                                                        <td key={score} className="px-3 py-3 text-center">
                                                            <label className="inline-flex cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${q.id}-${opt.id}`}
                                                                    value={score}
                                                                    checked={parseInt(rowVal) === score}
                                                                    onChange={() => handleAnswerChange(`${q.id}-${opt.id}`, score)}
                                                                    className="sr-only"
                                                                />
                                                                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold
                                                                    ${parseInt(rowVal) === score
                                                                        ? 'border-slate-700 bg-slate-700 text-white'
                                                                        : 'border-neutral-300 dark:border-neutral-600 hover:border-slate-400'
                                                                    }`}>
                                                                    {parseInt(rowVal) === score ? '✓' : ''}
                                                                </span>
                                                            </label>
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── Gender ── */}
                        {q.type === 'gender' && (
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'หญิง', emoji: '♀', color: 'pink' },
                                    { value: 'ชาย', emoji: '♂', color: 'blue' },
                                ].map(({ value: opt, emoji, color }) => (
                                    <label key={opt} className="cursor-pointer flex-1 min-w-[120px]">
                                        <input type="radio" name={`q-gender-${q.id}`} value={opt}
                                            checked={val === opt} onChange={() => handleAnswerChange(q.id, opt)} className="sr-only" />
                                        <div className={`flex items-center justify-center gap-2.5 py-2.5 px-5 rounded border-2 font-semibold text-sm transition-all
                                            ${val === opt
                                                ? color === 'pink'
                                                    ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                                                    : 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600'
                                            }`}>
                                            <span className="text-lg">{emoji}</span>
                                            {opt}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* ── Quiz ── */}
                        {q.type === 'quiz' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || []).map((opt, idx) => {
                                    const optLabel = ['A', 'B', 'C', 'D'][idx] || String(idx + 1);
                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                    const optId = typeof opt === 'object' ? opt.id : idx;
                                    const isSelected = String(val) === String(optId);
                                    return (
                                        <label key={idx} className="cursor-pointer">
                                            <input type="radio" name={`q-quiz-${q.id}`} value={optId}
                                                checked={isSelected} onChange={() => handleAnswerChange(q.id, optId)} className="sr-only" />
                                            <div className={`flex items-center gap-3 p-3 rounded border-2 transition-all
                                                ${isSelected
                                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                                }`}>
                                                <span className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-black transition-all
                                                    ${isSelected ? 'bg-amber-400 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                                                    {optLabel}
                                                </span>
                                                <span className={`text-sm font-medium ${isSelected ? 'text-amber-800 dark:text-amber-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                    {optText || `ตัวเลือก ${optLabel}`}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Dropdown ── */}
                        {q.type === 'dropdown' && (
                            <div className="relative">
                                <select
                                    value={val || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                                    className="w-full px-3 py-2.5 pr-10 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white transition-all appearance-none text-sm cursor-pointer"
                                    required={q.is_required}
                                >
                                    <option value="" disabled className="text-neutral-400">เลือกตัวเลือก...</option>
                                    {q.options?.map(opt => (
                                        <option key={opt.id} value={opt.id} className="dark:bg-neutral-800">{opt.text}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        )}

                        {/* ── Single Choice ── */}
                        {q.type === 'single_choice' && (
                            <div className="space-y-1.5">
                                {q.options?.map(opt => {
                                    const isSelected = parseInt(val) === opt.id;
                                    const showOther = isSelected && isOtherOption(opt.text);
                                    return (
                                        <div key={opt.id}>
                                            <label className="cursor-pointer block">
                                                <input type="radio" name={`q-${q.id}`} value={opt.id}
                                                    checked={isSelected} onChange={() => handleAnswerChange(q.id, opt.id)} className="sr-only" />
                                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded border-2 transition-all
                                                    ${isSelected
                                                        ? 'border-slate-600 bg-slate-50 dark:bg-slate-800/30'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                                    }`}>
                                                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                                                        ${isSelected ? 'border-slate-600 bg-slate-600' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                        {opt.text}
                                                    </span>
                                                </div>
                                            </label>
                                            {showOther && (
                                                <input
                                                    type="text"
                                                    value={otherTexts[q.id] || ''}
                                                    onChange={e => setOtherTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                    className="mt-1.5 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-neutral-800 dark:text-white placeholder-neutral-400 text-sm"
                                                    placeholder="โปรดระบุ..."
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Choice with Suggestion ── */}
                        {q.type === 'choice_suggestion' && (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden">
                                {q.options?.map(opt => {
                                    const rowKey = `${q.id}-${opt.id}`;
                                    const selected = answers[rowKey];
                                    const suggText = otherTexts[rowKey] || '';
                                    return (
                                        <div key={opt.id} className="px-4 py-3 space-y-2 bg-white dark:bg-neutral-900">
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-[120px]">
                                                    <input type="radio" name={`cs_${q.id}_${opt.id}`} checked={selected === 'positive'}
                                                        onChange={() => handleAnswerChange(rowKey, 'positive')} className="sr-only" />
                                                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected === 'positive' ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                                        {selected === 'positive' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <span className={`text-sm font-medium transition-colors ${selected === 'positive' ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                        {opt.text}
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-[220px]">
                                                    <input type="checkbox" checked={!!suggChecks[rowKey]}
                                                        onChange={e => setSuggChecks(prev => ({ ...prev, [rowKey]: e.target.checked }))} className="sr-only" />
                                                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${suggChecks[rowKey] ? 'border-amber-500 bg-amber-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                                        {suggChecks[rowKey] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <span className={`text-sm font-medium transition-colors ${suggChecks[rowKey] ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                                        {q.image_url || 'ข้อเสนอเพื่อปรับปรุง (โปรดระบุ)'}
                                                    </span>
                                                </label>
                                            </div>
                                            {suggChecks[rowKey] && (
                                                <input type="text" value={suggText}
                                                    onChange={e => setOtherTexts(prev => ({ ...prev, [rowKey]: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded border border-amber-200 dark:border-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:text-white placeholder-neutral-400 text-sm"
                                                    placeholder="โปรดระบุข้อเสนอแนะ..." autoFocus />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Organization ── */}
                        {q.type === 'organization' && (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1.5">หน่วยงาน</p>
                                    <input
                                        type="text"
                                        value={answers[q.id] ?? ''}
                                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                                        className="w-full px-3 py-2.5 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white placeholder-neutral-400 transition-all text-sm"
                                        placeholder="ระบุชื่อหน่วยงานของท่าน..."
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1.5">กลุ่มงาน / ฝ่าย / รายละเอียดเพิ่มเติม</p>
                                    <input
                                        type="text"
                                        value={answers[`${q.id}-detail`] ?? ''}
                                        onChange={e => handleAnswerChange(`${q.id}-detail`, e.target.value)}
                                        className="w-full px-3 py-2.5 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white placeholder-neutral-400 transition-all text-sm"
                                        placeholder="ระบุกลุ่มงาน หรือฝ่ายของท่าน..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Multiple Choice ── */}
                        {q.type === 'multiple_choice' && (
                            <div className="space-y-1.5">
                                {q.options?.map(opt => {
                                    const isChecked = Array.isArray(val) && val.includes(opt.id);
                                    const showOther = isChecked && isOtherOption(opt.text);
                                    return (
                                        <div key={opt.id}>
                                            <label className="cursor-pointer block">
                                                <input type="checkbox" name={`q-${q.id}-${opt.id}`} value={opt.id}
                                                    checked={isChecked} onChange={() => handleAnswerChange(q.id, opt.id, true)} className="sr-only" />
                                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded border-2 transition-all
                                                    ${isChecked
                                                        ? 'border-slate-600 bg-slate-50 dark:bg-slate-800/30'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                                    }`}>
                                                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all
                                                        ${isChecked ? 'border-slate-600 bg-slate-600' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                                        {isChecked && (
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm ${isChecked ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                        {opt.text}
                                                    </span>
                                                </div>
                                            </label>
                                            {showOther && (
                                                <input
                                                    type="text"
                                                    value={otherTexts[q.id] || ''}
                                                    onChange={e => setOtherTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                    className="mt-1.5 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-neutral-800 dark:text-white placeholder-neutral-400 text-sm"
                                                    placeholder="โปรดระบุ..."
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ─── Main Layout ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-neutral-100 dark:from-[#09090b] dark:bg-neutral-950 font-sans">

            {/* Fixed top progress bar */}
            <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-neutral-200 dark:bg-neutral-800">
                <div
                    className="h-full bg-slate-600 transition-all duration-700 ease-out"
                    style={{ width: `${isLastStep ? 100 : progress}%` }}
                />
            </div>

            {/* Theme toggle - fixed top right */}
            <div className="fixed top-2 right-2 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-md">
                <ThemeToggle />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 pb-8 sm:pt-10">

                {/* ── Header Card ── */}
                <div className="bg-slate-800 text-white shadow-lg mb-6 rounded-md">
                    <div className="p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                                {form.organization && (
                                    <div className="flex items-center gap-2.5 text-white font-bold text-xl mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                                        {form.organization}
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0">
                                <div className="inline-flex items-center gap-2 bg-white/15 text-white/90 text-xs font-semibold px-3 py-1 rounded border border-white/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                    {form.is_active ? 'เปิดรับคำตอบ' : 'ปิดรับคำตอบ'}
                                </div>
                            </div>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-snug mb-2">{form.title}</h1>
                        {form.description && (
                            <p className="text-slate-300 text-sm leading-relaxed">{form.description}</p>
                        )}

                        {/* Step progress bar */}
                        {steps.length > 1 && (
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-1">
                                    {steps.map((_, i) => (
                                        <div key={i} className={`h-1 transition-all duration-500 ${i === currentSectionIndex
                                            ? 'bg-white flex-[3]'
                                            : i < currentSectionIndex
                                                ? 'bg-white/60 flex-1'
                                                : 'bg-white/25 flex-1'
                                            }`} />
                                    ))}
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 font-medium">
                                    <span>ส่วนที่ {currentSectionIndex + 1} จาก {steps.length}</span>
                                    <span>{isLastStep ? 100 : progress}% เสร็จสิ้น</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Section title ── */}
                {steps.length > 0 && currentStep?.title && (
                    <div className="mb-4 px-1">
                        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{currentStep.title}</h2>
                        {currentStep.description && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{currentStep.description}</p>
                        )}
                    </div>
                )}

                {/* ── Questions ── */}
                {steps.length > 0 ? (
                    <div className="space-y-3">
                        {(() => {
                            let qNum = 0;
                            return currentStep?.questions?.map((q) => {
                                if (q.type !== 'heading') qNum++;
                                return renderQuestion(q, qNum - 1);
                            });
                        })()}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <div className="w-16 h-16 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">ยังไม่มีคำถาม</h3>
                        <p className="text-sm text-neutral-400 mt-1">ผู้ดูแลระบบยังไม่ได้เพิ่มคำถามในแบบฟอร์มนี้</p>
                    </div>
                )}

            </div>

            {/* ── Footer ── */}
            <footer className="w-full bg-slate-800 dark:bg-neutral-950 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/10">

                    {/* ── LEFT: Logo + หน่วยงาน + G Survey ── */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0 pb-4 sm:pb-0 sm:pr-5">
                        {/* หน่วยงาน */}
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {orgSettings.logo_url ? (
                                    <img
                                        src={orgSettings.logo_url}
                                        alt="logo"
                                        className="w-full h-full object-contain p-1"
                                    />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                                        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                                        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                                        <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
                                    </svg>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-bold text-sm leading-snug">
                                    {orgSettings.org_name || form.organization || 'หน่วยงาน'}
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        {/* G Survey */}
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-extrabold text-white">G Survey</span>
                                <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded leading-tight">GECC</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                                แบบประเมินความพึงพอใจของผู้รับบริการจากหน่วยงานของรัฐที่ได้รับการรับรองมาตรฐานการให้บริการของศูนย์ราชการสะดวก (GECC)
                            </p>
                            <a
                                href="http://203.113.14.37/gsurvey/index.aspx"
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded text-xs font-semibold text-emerald-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                เปิด G Survey
                            </a>
                        </div>
                    </div>

                    {/* ── RIGHT: Map only ── */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0 pt-4 sm:pt-0 sm:pl-5">
                        <div className="w-full rounded-md overflow-hidden border border-white/10" style={{ height: '180px' }}>
                            <iframe
                                src="https://maps.google.com/maps?q=13.8633581,100.5136642&hl=th&z=17&output=embed"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="แผนที่หน่วยงาน"
                            />
                        </div>
                        <a
                            href="https://maps.app.goo.gl/BaNVkSaa7xsntotc6"
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-xs font-semibold text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            ดูบนแผนที่ Google Maps
                        </a>
                    </div>

                </div>
            </footer>

            {/* ── Floating Bottom Navigation ── */}
            {steps.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-lg">
                        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                            <button
                                onClick={prevStep}
                                disabled={isFirstStep}
                                className={`flex items-center gap-2 px-5 py-2 rounded font-medium text-sm transition-all border ${isFirstStep
                                    ? 'opacity-0 pointer-events-none border-transparent'
                                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
                                    }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                ย้อนกลับ
                            </button>

                            {/* Center step indicator */}
                            {steps.length > 1 && (
                                <div className="flex items-center gap-1.5">
                                    {steps.map((_, i) => (
                                        <div key={i} className={`transition-all duration-300 ${i === currentSectionIndex
                                            ? 'w-6 h-2 bg-slate-600 rounded-sm'
                                            : i < currentSectionIndex
                                                ? 'w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-sm'
                                                : 'w-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-sm'
                                            }`} />
                                    ))}
                                </div>
                            )}

                            {!isLastStep ? (
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm rounded shadow transition-all"
                                >
                                    ถัดไป
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={submitForm}
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded shadow transition-all disabled:opacity-70"
                                >
                                    {submitting
                                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        : <Send className="w-4 h-4" />
                                    }
                                    {submitting ? 'กำลังส่ง...' : 'ส่งแบบฟอร์ม'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal {...confirmModalProps} />
        </div>
    );
}
