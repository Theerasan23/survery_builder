'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { getFormAnalytics } from '@/lib/actions';
import {
    BarChart, ArrowLeft, CheckSquare, Users, Sigma, TrendingUp, Star,
    Search, MessageSquarePlus, Calendar, ChevronDown, ChevronUp, Filter,
    Download, FileSpreadsheet, BookOpen
} from 'lucide-react';
import Link from 'next/link';

// Use Bangkok timezone (UTC+7) for date defaults
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const FIRST_OF_MONTH = TODAY.slice(0, 8) + '01';

function RatingDistribution({ dist, total }) {
    return (
        <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {[5, 4, 3, 2, 1].map(star => {
                    const count = dist[star] || 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                        <span key={star}>
                            <span className="text-amber-500 font-medium">★{star}</span>
                            {' '}{count} คน ({pct.toFixed(0)}%)
                        </span>
                    );
                })}
            </div>
            <p className="text-neutral-400 dark:text-neutral-500">รวม {total} คำตอบ</p>
        </div>
    );
}

function MatrixBreakdown({ q }) {
    const cols = Array.isArray(q.columns_config) ? q.columns_config : [];
    const rows = q.matrix_data?.rows || [];
    const counts = q.matrix_data?.counts || {};
    if (rows.length === 0 || cols.length === 0) {
        return <p className="text-xs text-neutral-400 italic">ยังไม่มีข้อมูลตาราง</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[480px]">
                <thead>
                    <tr className="bg-violet-100/50 dark:bg-violet-900/30">
                        <th className="px-3 py-2 text-violet-800 dark:text-violet-300 font-semibold border border-violet-200 dark:border-violet-700/50 w-2/5">หัวข้อย่อย</th>
                        {cols.map((c, i) => (
                            <th key={i} className="px-3 py-2 text-center text-violet-800 dark:text-violet-300 font-semibold border border-violet-200 dark:border-violet-700/50">
                                {c.label || `คอลัมน์ ${i + 1}`}
                            </th>
                        ))}
                        <th className="px-3 py-2 text-center text-violet-700 dark:text-violet-400 font-semibold border border-violet-200 dark:border-violet-700/50">รวม</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const rowCounts = counts[r.id] || {};
                        const rowTotal = Object.values(rowCounts).reduce((a, b) => a + b, 0);
                        return (
                            <tr key={r.id} className="bg-white dark:bg-neutral-900">
                                <td className="px-3 py-2 border border-violet-200/60 dark:border-violet-700/30 text-neutral-700 dark:text-neutral-300 font-medium">{r.text}</td>
                                {cols.map((_, ci) => {
                                    const cnt = rowCounts[ci] || 0;
                                    const pct = rowTotal > 0 ? (cnt / rowTotal) * 100 : 0;
                                    return (
                                        <td key={ci} className="px-3 py-2 text-center border border-violet-200/60 dark:border-violet-700/30">
                                            <span className="font-semibold text-violet-700 dark:text-violet-300">{cnt}</span>
                                            <span className="text-[10px] text-neutral-400 ml-1">({pct.toFixed(0)}%)</span>
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-2 text-center border border-violet-200/60 dark:border-violet-700/30 font-bold text-neutral-700 dark:text-neutral-300">{rowTotal}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function SuggestionCard({ s, idx }) {
    const hasText    = s.option_texts && s.option_texts.length > 0;
    const hasOptions = s.selected_options && s.selected_options.length > 0;
    return (
        <div className="flex gap-3 p-3 rounded-xl border text-sm bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700">
            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 text-white bg-teal-500">
                {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
                {/* Selected option chips — always show when options exist */}
                {hasOptions && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {s.selected_options.map((opt, i) => (
                            <span key={i} className="px-2 py-0.5 text-[11px] font-medium rounded-full border bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">
                                ✓ {opt}
                            </span>
                        ))}
                    </div>
                )}
                {/* Free text blocks (option + typed text, or plain text for short/long_text) */}
                {hasText && s.option_texts.map((ot, i) => (
                    <div key={i} className="mt-1 pl-2 border-l-2 border-amber-400">
                        {ot.option && (
                            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">[{ot.option}]</p>
                        )}
                        <p className="text-neutral-700 dark:text-neutral-300 break-words text-xs">{ot.text}</p>
                    </div>
                ))}
                <p className="text-[10px] text-neutral-400 mt-1.5">
                    {new Date(s.submitted_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

export default function AnalyticsClient({ formId }) {
    const [from, setFrom] = useState(FIRST_OF_MONTH);
    const [to, setTo] = useState(TODAY);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'suggestions'
    const [expandedSugg, setExpandedSugg] = useState({});
    const [exporting, setExporting] = useState('');


    const toggleSugg = (id) => setExpandedSugg(p => ({ ...p, [id]: !p[id] }));

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const json = await getFormAnalytics(formId, from, to);
            setData(json);
            setLoaded(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [formId, from, to]);

    // Load on mount
    useEffect(() => { load(); }, []);

    const questions = data?.questions || [];
    const isChoice = (type) => ['multiple_choice', 'single_choice', 'dropdown', 'rating', 'rating_grid', 'choice_suggestion', 'matrix'].includes(type);
    const totalQuestions = questions.length;
    const choiceQuestions = questions.filter(q => isChoice(q.question_type)).length;

    const ratingQs = questions.filter(q => q.question_type === 'rating' && q.total_score != null);
    const ratingTotalScore = ratingQs.reduce((sum, q) => sum + parseFloat(q.total_score), 0);
    const ratingTotalAnswers = ratingQs.reduce((sum, q) => sum + (q.total_answers || 0), 0);
    const ratingPct = ratingTotalAnswers > 0 ? (ratingTotalScore / (ratingTotalAnswers * 5)) * 100 : null;

    const scoredQs = questions.filter(q => q.total_score != null);
    const grandTotalScore = scoredQs.reduce((sum, q) => sum + parseFloat(q.total_score), 0);
    const grandTotalAnswers = scoredQs.reduce((sum, q) => sum + (q.total_answers || 0), 0);
    const grandAvgScore = grandTotalAnswers > 0 ? grandTotalScore / grandTotalAnswers : null;

    const quizQs = questions.filter(q => q.question_type === 'quiz' && q.total_score != null);
    const quizTotalScore = quizQs.reduce((sum, q) => sum + parseFloat(q.total_score), 0);
    const quizTotalAnswers = quizQs.reduce((sum, q) => sum + (q.total_answers || 0), 0);
    const quizAvg = quizTotalAnswers > 0 ? quizTotalScore / quizTotalAnswers : null;

    const suggQs = questions.filter(q => q.question_type === 'choice_suggestion' && q.total_score != null);
    const suggTotalScore = suggQs.reduce((sum, q) => sum + parseFloat(q.total_score ?? 0), 0);
    const suggTotalAnswers = suggQs.reduce((sum, q) => sum + (q.total_answers || 0), 0);
    const suggAvg = suggTotalAnswers > 0 ? suggTotalScore / suggTotalAnswers : null;

    // All questions marked is_suggestion=1 that have suggestion entries (or matrix with "ระบุ" texts)
    const allSuggQs = questions
        .filter(q => (q.is_suggestion || q.question_type === 'matrix') && q.suggestions?.length > 0);
    const totalSuggResponses = allSuggQs.reduce((n, q) => n + q.suggestions.length, 0);

    const exportPDF = async () => {
        if (!data) return;
        setExporting('pdf');
        try {
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const { SARABUN_FONT } = await import('@/lib/thaiFont');

            const doc = new jsPDF();
            doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_FONT);
            doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
            doc.setFont('Sarabun');

            doc.setFontSize(16);
            doc.text(`Form Question Analytics: ${data.form_title || ''}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Date Range: ${from} - ${to}`, 14, 28);

            autoTable(doc, {
                startY: 35,
                styles: { font: 'Sarabun' },
                head: [['Metric', 'Value']],
                body: [
                    ['Total Responses', String(data.total_responses ?? 0)],
                    ['Total Questions', String(totalQuestions)],
                    ['Total Score (Rating)', ratingTotalScore.toLocaleString()],
                    ['Average Score (Rating)', ratingPct != null ? `${ratingPct.toFixed(1)}%` : '-'],
                    ['Grand Total Score', grandTotalScore.toLocaleString()],
                    ['Grand Average Score', grandAvgScore != null ? grandAvgScore.toFixed(2) : '-'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
            });

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                styles: { font: 'Sarabun', fontSize: 8 },
                head: [['Question', 'Type', 'Answers', 'Total Score', 'Avg Score']],
                body: questions.map(q => [
                    q.question_text,
                    q.question_type.replace(/_/g, ' '),
                    String(q.total_answers || 0),
                    q.total_score != null ? String(q.total_score) : '-',
                    q.average_score != null ? Number(q.average_score).toFixed(2) : '-',
                ]),
                theme: 'grid',
                headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
            });

            if (totalSuggResponses > 0) {
                doc.addPage();
                doc.setFontSize(14);
                doc.text('Suggestions / Text Responses', 14, 20);
                
                const suggRows = [];
                allSuggQs.forEach(q => {
                    q.suggestions.forEach(s => {
                        const ansTexts = (s.option_texts || []).map(ot => (ot.option ? `[${ot.option}] ` : '') + ot.text).join('\n');
                        const chosenOpts = (s.selected_options || []).join(', ');
                        suggRows.push([
                            q.question_text,
                            chosenOpts || '-',
                            ansTexts || '-',
                            new Date(s.submitted_at).toLocaleDateString()
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: 28,
                    styles: { font: 'Sarabun', fontSize: 7 },
                    head: [['Question', 'Options', 'Text Content', 'Date']],
                    body: suggRows,
                    theme: 'grid',
                    headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
                    columnStyles: { 2: { cellWidth: 80 } },
                });
            }

            doc.save(`form_${formId}_analytics.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            alert('ไม่สามารถ export PDF ได้');
        } finally {
            setExporting('');
        }
    };

    const exportExcel = async () => {
        if (!data) return;
        setExporting('excel');
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            // Sheet 1: สรุปภาพรวม
            const summaryData = [
                ['รายการ', 'ค่า'],
                ['แบบฟอร์ม', data.form_title || ''],
                ['ช่วงเวลา', `${from} ถึง ${to}`],
                ['จำนวนผู้ตอบ', data.total_responses ?? 0],
                ['จำนวนคำถามทั้งหมด', totalQuestions],
                ['คะแนนรวมทั้งหมด', +grandTotalScore.toFixed(2)],
                ['คะแนนเฉลี่ยรวม', grandAvgScore != null ? +grandAvgScore.toFixed(2) : '-'],
                ['% รวม Rating', ratingPct != null ? `${ratingPct.toFixed(1)}%` : '-'],
                ['คะแนนเฉลี่ย Quiz', quizAvg != null ? +quizAvg.toFixed(2) : '-'],
                ['คะแนนเฉลี่ยตัวเลือก + ข้อเสนอแนะ', suggAvg != null ? +suggAvg.toFixed(2) : '-'],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 30 }, { wch: 45 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม');

            // Sheet 2: รายข้อคำถาม
            const qRows = [['ลำดับ', 'คำถาม', 'ประเภท', 'จำนวนคำตอบ', 'คะแนนรวม', 'คะแนนเฉลี่ย']];
            let qNo = 0;
            questions.forEach(q => {
                const isHeading = q.question_type === 'heading';
                qRows.push([
                    isHeading ? '' : ++qNo,
                    q.question_text,
                    q.question_type.replace(/_/g, ' '),
                    isHeading ? '' : (q.total_answers || 0),
                    q.total_score != null ? +parseFloat(q.total_score).toFixed(2) : '',
                    q.average_score != null ? +Number(q.average_score).toFixed(2) : '',
                ]);
            });
            const wsQ = XLSX.utils.aoa_to_sheet(qRows);
            wsQ['!cols'] = [{ wch: 6 }, { wch: 60 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsQ, 'รายข้อคำถาม');

            // Sheet 3: การกระจายคะแนน Rating
            const ratingDistQs = questions.filter(q => q.question_type === 'rating' && q.rating_distribution);
            if (ratingDistQs.length > 0) {
                const rows = [['คำถาม', 'ดีเยี่ยม (5)', 'ดี (4)', 'ปานกลาง (3)', 'น้อย (2)', 'น้อยมาก (1)', 'รวมคำตอบ', 'คะแนนเฉลี่ย']];
                ratingDistQs.forEach(q => {
                    const dist = q.rating_distribution || {};
                    rows.push([
                        q.question_text,
                        dist[5] || 0,
                        dist[4] || 0,
                        dist[3] || 0,
                        dist[2] || 0,
                        dist[1] || 0,
                        q.total_answers || 0,
                        q.average_score != null ? +Number(q.average_score).toFixed(2) : '',
                    ]);
                });
                const ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 60 }, { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
                XLSX.utils.book_append_sheet(wb, ws, 'การกระจายคะแนน');
            }

            // Sheet 4: ตาราง Matrix
            const matrixQs = questions.filter(q => q.question_type === 'matrix' && q.matrix_data && Array.isArray(q.columns_config));
            if (matrixQs.length > 0) {
                const rows = [['คำถาม', 'หัวข้อย่อย', 'ตัวเลือก', 'จำนวน']];
                matrixQs.forEach(q => {
                    (q.matrix_data.rows || []).forEach(r => {
                        const rowCounts = q.matrix_data.counts?.[r.id] || {};
                        q.columns_config.forEach((c, ci) => {
                            rows.push([q.question_text, r.text, c.label || `คอลัมน์ ${ci + 1}`, rowCounts[ci] || 0]);
                        });
                    });
                });
                const ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 45 }, { wch: 40 }, { wch: 20 }, { wch: 10 }];
                XLSX.utils.book_append_sheet(wb, ws, 'ตาราง Matrix');
            }

            // Sheet 5: ข้อเสนอแนะ
            if (totalSuggResponses > 0) {
                const suggRows = [['คำถาม', 'ตัวเลือกที่เลือก', 'ข้อความ', 'วันที่']];
                allSuggQs.forEach(q => {
                    q.suggestions.forEach(s => {
                        const ansTexts = (s.option_texts || []).map(ot => (ot.option ? `[${ot.option}] ` : '') + ot.text).join(' | ');
                        const chosenOpts = (s.selected_options || []).join(', ');
                        suggRows.push([
                            q.question_text,
                            chosenOpts || '-',
                            ansTexts || '-',
                            new Date(s.submitted_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        ]);
                    });
                });
                const ws = XLSX.utils.aoa_to_sheet(suggRows);
                ws['!cols'] = [{ wch: 50 }, { wch: 25 }, { wch: 60 }, { wch: 20 }];
                XLSX.utils.book_append_sheet(wb, ws, 'ข้อเสนอแนะ');
            }

            XLSX.writeFile(wb, `form_${formId}_analytics_${from}_${to}.xlsx`);
        } catch (e) {
            console.error('Excel export error:', e);
            alert('ไม่สามารถ export Excel ได้');
        } finally {
            setExporting('');
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/admin/dashboard" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </Link>
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2 truncate">
                        <BarChart className="w-5 h-5 text-[#21304A] flex-shrink-0" />
                        Question Analytics
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {data && (
                        <>
                            <button onClick={() => exportPDF()} disabled={!!exporting}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-50">
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                            </button>
                            <button onClick={() => exportExcel()} disabled={!!exporting}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-700/30 text-xs font-semibold transition-colors disabled:opacity-50">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                            </button>
                        </>
                    )}
                    <Link href={`/admin/dashboard/forms/${formId}/responses`}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#21304A] hover:bg-[#2d4060] text-white font-medium shadow text-sm transition-all">
                        <Users className="w-4 h-4" />
                        ดูคำตอบตามรายการ
                    </Link>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> ตั้งแต่วันที่
                        </label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1">ถึงวันที่</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                    </div>
                    <button onClick={load} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-[#21304A] hover:bg-[#2d4060] disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-semibold text-sm transition-all">
                        <Search className="w-4 h-4" />
                        {loading ? 'กำลังโหลด...' : 'แสดงข้อมูล'}
                    </button>
                    {from && to && (
                        <span className="text-xs text-neutral-400 pb-2">
                            {from} – {to}
                        </span>
                    )}
                </div>
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>

            {data && (
                <>
                    {/* Row 1: General stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">Total Responses</h3>
                            <p className="text-4xl font-bold text-neutral-800 dark:text-white">{data.total_responses ?? 0}</p>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">Total Questions</h3>
                            <p className="text-4xl font-bold text-neutral-800 dark:text-white">{totalQuestions}</p>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Star className="w-24 h-24 text-emerald-500" />
                            </div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2">
                                <Star className="w-4 h-4 text-emerald-500" />
                                % รวม Rating
                            </h3>
                            <p className="text-[11px] text-neutral-400 mb-2">
                                {ratingQs.length > 0 ? `จาก ${ratingQs.length} ข้อ / ${ratingTotalAnswers} คำตอบ` : 'ไม่มีคำถาม Rating'}
                            </p>
                            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                                {ratingPct != null ? `${ratingPct.toFixed(1)}%` : '-'}
                            </p>
                            {ratingPct != null && (
                                <div className="mt-3 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${ratingPct}%` }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Score summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Sigma className="w-24 h-24 text-[#21304A]" />
                            </div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2">
                                <Sigma className="w-4 h-4 text-[#21304A]" /> คะแนนรวมทั้งหมด
                            </h3>
                            <p className="text-[11px] text-neutral-400 mb-1">จากคำถามที่มีคะแนน ({scoredQs.length} ข้อ)</p>
                            <p className="text-[11px] font-mono text-[#a1afc5]/70 mb-2">= Σ คะแนนทุกคำตอบ</p>
                            <p className="text-4xl font-bold text-[#21304A] dark:text-[#a1afc5]">
                                {scoredQs.length > 0 ? grandTotalScore.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp className="w-24 h-24 text-amber-500" />
                            </div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-500" /> คะแนนเฉลี่ยรวม
                            </h3>
                            <p className="text-[11px] text-neutral-400 mb-1">เฉลี่ยต่อคำตอบ ({grandTotalAnswers.toLocaleString()} คำตอบ)</p>
                            <p className="text-[11px] font-mono text-amber-400/70 mb-2">
                                = {scoredQs.length > 0 ? `${grandTotalScore.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${grandTotalAnswers}` : 'Σ คะแนน ÷ Σ คำตอบ'}
                            </p>
                            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                                {grandAvgScore != null ? grandAvgScore.toFixed(2) : '-'}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BookOpen className="w-24 h-24 text-orange-500" />
                            </div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-orange-500" /> คะแนนรวม Quiz
                            </h3>
                            <p className="text-[11px] text-neutral-400 mb-1">
                                {quizQs.length > 0 ? `${quizQs.length} ข้อ / ${quizTotalAnswers} คำตอบ` : 'ไม่มีคำถาม Quiz'}
                            </p>
                            <p className="text-[11px] font-mono text-orange-400/70 mb-2">
                                = {quizTotalAnswers > 0 ? `${quizTotalScore.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${quizTotalAnswers}` : 'Σ คะแนน ÷ Σ คำตอบ'}
                            </p>
                            <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                {quizAvg != null ? quizAvg.toFixed(2) : '-'}
                            </p>
                            {quizQs.length > 0 && (
                                <p className="text-[11px] text-neutral-400 mt-1">
                                    รวม {quizTotalScore.toLocaleString(undefined, { maximumFractionDigits: 2 })} คะแนน
                                </p>
                            )}
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Star className="w-24 h-24 text-teal-500" />
                            </div>
                            <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2">
                                <Star className="w-4 h-4 text-teal-500" /> ตัวเลือก + ข้อเสนอแนะ
                            </h3>
                            <p className="text-[11px] text-neutral-400 mb-1">
                                {suggQs.length > 0 ? `${suggQs.length} ข้อ / ${suggTotalAnswers} คำตอบ` : 'ไม่มีคำถามประเภทนี้'}
                            </p>
                            <p className="text-[11px] font-mono text-teal-400/70 mb-2">
                                = {suggTotalAnswers > 0 ? `${suggTotalScore.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${suggTotalAnswers}` : 'Σ คะแนน ÷ Σ คำตอบ'}
                            </p>
                            <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">
                                {suggAvg != null ? suggAvg.toFixed(2) : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-5 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${activeTab === 'overview' ? 'bg-white dark:bg-neutral-900 border border-b-white dark:border-b-neutral-900 border-neutral-200 dark:border-neutral-800 text-[#21304A] dark:text-[#a1afc5]' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                        >
                            ภาพรวมคะแนน
                        </button>
                        <button
                            onClick={() => setActiveTab('suggestions')}
                            className={`px-5 py-2.5 text-sm font-medium rounded-t-xl transition-colors flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-white dark:bg-neutral-900 border border-b-white dark:border-b-neutral-900 border-neutral-200 dark:border-neutral-800 text-teal-600 dark:text-teal-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                        >
                            <MessageSquarePlus className="w-4 h-4" />
                            ข้อเสนอแนะ
                            {totalSuggResponses > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full">
                                    {totalSuggResponses}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab: Overview (question breakdown table) */}
                    {activeTab === 'overview' && (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">Questions Breakdown</h2>
                                <p className="text-sm text-neutral-500 mt-1">Detailed view of answer counts, total scores, and averages.</p>
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr>
                                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Question Text</th>
                                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-40 text-center">Type</th>
                                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32 text-center">Total Answers</th>
                                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32 text-center">
                                                <span className="block">Sum Score</span>
                                                <span className="block text-[10px] font-mono font-normal text-neutral-400 mt-0.5">Σ คะแนน</span>
                                            </th>
                                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-40 text-center">
                                                <span className="block">Avg Score</span>
                                                <span className="block text-[10px] font-mono font-normal text-neutral-400 mt-0.5">Σ คะแนน ÷ n</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questions.length > 0 ? (
                                            questions.map((q, idx) => {
                                                const isHeadingRow = q.question_type === 'heading';
                                                const rowBg = isHeadingRow
                                                    ? 'bg-slate-700 dark:bg-slate-700'
                                                    : idx % 2 === 0
                                                        ? 'bg-white dark:bg-neutral-900'
                                                        : 'bg-neutral-50/60 dark:bg-neutral-800/30';
                                                const isMatrixRow = q.question_type === 'matrix';
                                                return (
                                                    <React.Fragment key={q.question_id || idx}>
                                                    <tr className={`${rowBg} ${!isHeadingRow ? 'hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5' : ''} transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0`}>
                                                        <td className={`p-4 text-sm font-medium ${isHeadingRow ? 'text-white font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                                            {q.question_text}
                                                            {q.question_type === 'rating' && q.rating_distribution && (
                                                                <RatingDistribution dist={q.rating_distribution} total={q.total_answers} />
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize whitespace-nowrap ${isHeadingRow ? 'bg-slate-600 text-slate-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                                                                {q.question_type.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className={`p-4 text-center text-sm font-semibold ${isHeadingRow ? 'text-slate-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                            {isHeadingRow ? '-' : (q.total_answers || 0)}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {isHeadingRow ? (
                                                                <span className="text-slate-500 text-sm">-</span>
                                                            ) : (
                                                                <span className="text-sm font-semibold text-[#21304A] dark:text-[#a1afc5]">
                                                                    {q.total_score != null ? parseFloat(q.total_score).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {isHeadingRow ? (
                                                                <span className="text-slate-500 text-sm">-</span>
                                                            ) : q.average_score != null ? (
                                                                <div>
                                                                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                                        {Number(q.average_score).toFixed(2)}
                                                                    </span>
                                                                    {q.total_score != null && q.total_answers > 0 && (
                                                                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                                                            {parseFloat(q.total_score).toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ {q.total_answers}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-neutral-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isMatrixRow && q.matrix_data && q.columns_config && (
                                                        <tr className="bg-violet-50/30 dark:bg-violet-900/10 border-b border-neutral-100 dark:border-neutral-800">
                                                            <td colSpan={5} className="p-4">
                                                                <MatrixBreakdown q={q} />
                                                            </td>
                                                        </tr>
                                                    )}
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-neutral-500 text-sm">ไม่มีข้อมูลในช่วงวันที่เลือก</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab: Suggestions */}
                    {activeTab === 'suggestions' && (
                        <div className="space-y-4">
                            {allSuggQs.length === 0 ? (
                                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
                                    <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
                                    <p className="text-neutral-500 text-sm">ไม่มีข้อเสนอแนะในช่วงเวลานี้</p>
                                </div>
                            ) : (
                                allSuggQs.map(q => {
                                    const isOpen = expandedSugg[q.question_id] !== false;
                                    return (
                                        <div key={q.question_id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => toggleSugg(q.question_id)}
                                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <MessageSquarePlus className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{q.question_text}</span>
                                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full">
                                                        {q.suggestions.length} รายการ
                                                    </span>
                                                </div>
                                                {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                                            </button>

                                            {isOpen && (
                                                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-2">
                                                    <div className="flex items-center gap-4 text-xs text-neutral-400 mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 text-[10px]">✓ ตัวเลือกที่เลือก</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-2 h-2 border-l-2 border-amber-400 inline-block" /> ข้อความที่กรอก
                                                        </span>
                                                    </div>
                                                    {q.suggestions.map((s, i) => (
                                                        <SuggestionCard key={i} s={s} idx={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </>
            )}

            {!data && !loading && (
                <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
                    <BarChart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">กดปุ่ม &quot;แสดงข้อมูล&quot; เพื่อโหลดรายงาน</p>
                </div>
            )}
        </div>
    );
}
