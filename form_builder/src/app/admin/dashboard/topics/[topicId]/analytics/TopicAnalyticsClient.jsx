'use client';

import { useState, useCallback, useEffect } from 'react';
import { getTopicAnalytics } from '@/lib/actions';
import {
    ArrowLeft, BarChart2, Users, Sigma, TrendingUp, Star,
    Search, Calendar, CheckSquare, RefreshCw, ChevronDown,
    ChevronUp, ChevronRight, MessageSquarePlus, FileText,
    Download, FileSpreadsheet, X, Check, Filter,
} from 'lucide-react';
import Link from 'next/link';

const toBKK = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const TODAY = toBKK(new Date());
const FIRST_OF_MONTH = TODAY.slice(0, 8) + '01';

const PRESETS = [
    { label: 'วันนี้',    from: TODAY, to: TODAY },
    { label: '7 วัน',    from: toBKK(new Date(Date.now() - 6 * 86400000)), to: TODAY },
    { label: 'เดือนนี้', from: FIRST_OF_MONTH, to: TODAY },
    { label: '3 เดือน',  from: toBKK(new Date(Date.now() - 89 * 86400000)), to: TODAY },
    { label: 'ทั้งหมด',  from: '2020-01-01', to: TODAY },
];

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo:  'text-[#21304A] bg-[#eef1f5] dark:bg-[#21304A]/10',
        emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
        amber:   'text-amber-500  bg-amber-50  dark:bg-amber-500/10',
        teal:    'text-teal-500   bg-teal-50   dark:bg-teal-500/10',
        violet:  'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    };
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm flex items-start gap-4 relative overflow-hidden">
            <div className={`p-2.5 flex-shrink-0 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
                <p className="text-3xl font-bold text-neutral-800 dark:text-white">{value ?? '-'}</p>
                {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function ScoreBar({ value, max = 5 }) {
    const pct = value ? Math.min((value / max) * 100, 100) : 0;
    const color = pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-bold w-10 text-right ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                {value ? value.toFixed(2) : '-'}
            </span>
        </div>
    );
}

export default function TopicAnalyticsClient({ topicId }) {
    const [from, setFrom] = useState(FIRST_OF_MONTH);
    const [to, setTo] = useState(TODAY);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFormIds, setSelectedFormIds] = useState([]);
    const [showFormSelector, setShowFormSelector] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedSugg, setExpandedSugg] = useState({});
    const [suggFilter, setSuggFilter] = useState('');
    const [exporting, setExporting] = useState('');
    const activePreset = PRESETS.find(p => p.from === from && p.to === to);

    const load = useCallback(async (f = from, t = to, ids = selectedFormIds) => {
        setLoading(true);
        setError('');
        try {
            const json = await getTopicAnalytics(topicId, f, t, ids);
            setData(json);
            // Auto-select all forms on first load
            if (ids.length === 0 && json.available_forms?.length > 0) {
                setSelectedFormIds(json.available_forms.map(f => f.id));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [topicId, from, to, selectedFormIds]);

    const applyPreset = (p) => {
        setFrom(p.from);
        setTo(p.to);
        load(p.from, p.to);
    };

    const toggleForm = (id) => {
        setSelectedFormIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllForms = () => {
        if (data?.available_forms) {
            setSelectedFormIds(data.available_forms.map(f => f.id));
        }
    };
    const deselectAllForms = () => setSelectedFormIds([]);

    const toggleSugg = (id) => setExpandedSugg(p => ({ ...p, [id]: !p[id] }));

    // Group suggestions by question
    const groupedSuggestions = (data?.suggestions || []).reduce((acc, s) => {
        const key = `${s.form_id}-${s.question_id}`;
        if (!acc[key]) {
            acc[key] = {
                form_id: s.form_id, form_title: s.form_title,
                question_id: s.question_id, question_text: s.question_text,
                items: [],
            };
        }
        acc[key].items.push(s);
        return acc;
    }, {});
    const suggGroups = Object.values(groupedSuggestions);
    const filteredSuggGroups = suggFilter
        ? suggGroups.filter(g =>
            g.question_text?.toLowerCase().includes(suggFilter.toLowerCase()) ||
            g.form_title?.toLowerCase().includes(suggFilter.toLowerCase())
        )
        : suggGroups;

    // Export PDF
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
            doc.text(`Topic Analytics: ${data.topic.title}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Date: ${from} - ${to}`, 14, 28);

            autoTable(doc, {
                startY: 35,
                styles: { font: 'Sarabun' },
                head: [['Metric', 'Value']],
                body: [
                    ['Total Responses', String(data.summary.total_responses)],
                    ['Total Questions', String(data.summary.total_questions)],
                    ['Total Score', String(data.summary.total_score)],
                    ['Avg Score', data.summary.avg_score ? data.summary.avg_score.toFixed(2) : '-'],
                    ['Rating %', data.summary.overall_rating_pct ? data.summary.overall_rating_pct + '%' : '-'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
            });

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                styles: { font: 'Sarabun' },
                head: [['Form', 'Responses', 'Total Score', 'Avg Score', 'Rating %']],
                body: data.forms.map(f => [
                    f.form_title,
                    String(f.response_count),
                    String(f.total_score),
                    f.avg_score ? f.avg_score.toFixed(2) : '-',
                    f.rating_pct ? f.rating_pct + '%' : '-',
                ]),
                theme: 'grid',
                headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
            });

            if (data.suggestions?.length > 0) {
                doc.addPage();
                doc.setFontSize(14);
                doc.text('Suggestions', 14, 20);
                autoTable(doc, {
                    startY: 28,
                    styles: { font: 'Sarabun' },
                    head: [['Form', 'Question', 'Answer', 'Date']],
                    body: data.suggestions.map(s => [
                        s.form_title, s.question_text,
                        s.answer_text || '', s.submitted_at || '',
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [33, 48, 74], font: 'Sarabun' },
                    styles: { fontSize: 8, font: 'Sarabun' },
                    columnStyles: { 2: { cellWidth: 60 } },
                });
            }

            doc.save(`topic_${topicId}_analytics.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            alert('ไม่สามารถ export PDF ได้');
        } finally {
            setExporting('');
        }
    };

    // Export Excel
    const exportExcel = async () => {
        if (!data) return;
        setExporting('excel');
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            const summaryData = [
                ['Metric', 'Value'],
                ['Topic', data.topic.title],
                ['Date Range', `${from} - ${to}`],
                ['Total Responses', data.summary.total_responses],
                ['Total Questions', data.summary.total_questions],
                ['Total Score', data.summary.total_score],
                ['Avg Score', data.summary.avg_score],
                ['Rating %', data.summary.overall_rating_pct],
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

            const formData = [
                ['Form', 'Responses', 'Questions', 'Total Score', 'Avg Score', 'Rating %'],
                ...data.forms.map(f => [f.form_title, f.response_count, f.total_questions, f.total_score, f.avg_score, f.rating_pct])
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(formData), 'Forms');

            if (data.suggestions?.length > 0) {
                const suggData = [
                    ['Form', 'Question', 'Options', 'Answer', 'Date'],
                    ...data.suggestions.map(s => [s.form_title, s.question_text, s.option_text || '', s.answer_text || '', s.submitted_at || ''])
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(suggData), 'Suggestions');
            }

            XLSX.writeFile(wb, `topic_${topicId}_analytics.xlsx`);
        } catch (e) {
            console.error('Excel export error:', e);
            alert('ไม่สามารถ export Excel ได้');
        } finally {
            setExporting('');
        }
    };

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/admin/dashboard" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0">
                        <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2 truncate">
                            <BarChart2 className="w-5 h-5 text-[#21304A] flex-shrink-0" />
                            {data?.topic?.title || 'วิเคราะห์ตามหัวข้อ'}
                        </h1>
                        {data?.topic?.description && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">{data.topic.description}</p>
                        )}
                    </div>
                </div>
                {data && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={exportPDF} disabled={!!exporting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-50">
                            <Download className="w-3.5 h-3.5" />
                            {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                        </button>
                        <button onClick={exportExcel} disabled={!!exporting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                        </button>
                    </div>
                )}
            </div>

            {/* Multi-Form Selector */}
            {data?.available_forms?.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#21304A]" />
                            เลือกแบบฟอร์ม
                            <span className="text-xs font-normal text-neutral-400">
                                ({selectedFormIds.length}/{data.available_forms.length} เลือก)
                            </span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={selectAllForms}
                                className="px-2.5 py-1 text-xs font-medium text-[#21304A] dark:text-[#a1afc5] bg-[#eef1f5] dark:bg-[#21304A]/10 hover:bg-[#d0d7e2] dark:hover:bg-[#21304A]/20 border border-[#21304A]/20 transition-colors">
                                เลือกทั้งหมด
                            </button>
                            <button onClick={deselectAllForms}
                                className="px-2.5 py-1 text-xs font-medium text-neutral-500 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors">
                                ยกเลิกทั้งหมด
                            </button>
                            <button onClick={() => setShowFormSelector(p => !p)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                                {showFormSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Selected forms chips */}
                    {!showFormSelector && selectedFormIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {data.available_forms.filter(f => selectedFormIds.includes(f.id)).map(f => (
                                <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] border border-[#21304A]/20">
                                    <Check className="w-3 h-3" />
                                    {f.title}
                                    <button onClick={() => toggleForm(f.id)} className="ml-0.5 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Full selector */}
                    {showFormSelector && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto border border-neutral-100 dark:border-neutral-800 p-2">
                            {data.available_forms.map(f => {
                                const checked = selectedFormIds.includes(f.id);
                                return (
                                    <label key={f.id}
                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-[#eef1f5] dark:bg-[#21304A]/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}>
                                        <input type="checkbox" checked={checked}
                                            onChange={() => toggleForm(f.id)}
                                            className="w-4 h-4 accent-[#21304A]" />
                                        <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1">{f.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                                            {f.is_active ? 'เปิดรับ' : 'ปิด'}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Date Filter */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESETS.map(p => (
                            <button key={p.label} onClick={() => applyPreset(p)}
                                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${activePreset?.label === p.label ? 'bg-[#21304A] text-white border-[#21304A]' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 border-l border-neutral-200 dark:border-neutral-700 hidden sm:block" />
                    <div className="flex items-end gap-2">
                        <div>
                            <label className="block text-[10px] font-semibold text-neutral-400 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> ตั้งแต่
                            </label>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-neutral-400 mb-1">ถึง</label>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                        </div>
                        <button onClick={() => load()} disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#21304A] hover:bg-[#2d4060] disabled:bg-[#21304A] text-white font-semibold text-sm transition-all">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            {loading ? 'กำลังโหลด' : 'แสดง'}
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Users} label="จำนวนผู้ตอบ" value={data.summary.total_responses} sub={`ช่วง ${from} – ${to}`} color="indigo" />
                        <StatCard icon={Sigma} label="ยอดรวมคะแนน" value={data.summary.total_score?.toLocaleString(undefined, { maximumFractionDigits: 2 })} sub="Total Score" color="amber" />
                        <StatCard icon={TrendingUp} label="คะแนนเฉลี่ย" value={data.summary.avg_score ? data.summary.avg_score.toFixed(2) : '-'} sub="Avg Score" color="teal" />
                        <StatCard icon={Star} label="% รวม Rating" value={data.summary.overall_rating_pct != null ? `${data.summary.overall_rating_pct}%` : '-'} sub="Overall Rating %" color="emerald" />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
                        <button onClick={() => setActiveTab('overview')}
                            className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-white dark:bg-neutral-900 border border-b-white dark:border-b-neutral-900 border-neutral-200 dark:border-neutral-800 text-[#21304A] dark:text-[#a1afc5]' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
                            รายการวิเคราะห์
                        </button>
                        <button onClick={() => setActiveTab('suggestions')}
                            className={`px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'suggestions' ? 'bg-white dark:bg-neutral-900 border border-b-white dark:border-b-neutral-900 border-neutral-200 dark:border-neutral-800 text-teal-600 dark:text-teal-400' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
                            <MessageSquarePlus className="w-4 h-4" />
                            ข้อเสนอแนะ
                            {data.suggestions?.length > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full">
                                    {data.suggestions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab: Overview — Per-form breakdown */}
                    {activeTab === 'overview' && (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                                <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                                    ข้อมูลย่อยของแบบฟอร์ม
                                </h2>
                                <p className="text-xs text-neutral-400 mt-1">สรุปยอดรวม ค่าคะแนน ค่า avg ค่า % ของแต่ละแบบฟอร์ม</p>
                            </div>
                            {data.forms.length === 0 ? (
                                <div className="p-12 text-center text-neutral-400 text-sm">ไม่มีข้อมูล</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400">ชื่อแบบฟอร์ม</th>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">ผู้ตอบ</th>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">คำถาม</th>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-28 text-center">คะแนนรวม</th>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-44">คะแนนเฉลี่ย</th>
                                                <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">Rating %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.forms.map((form, i) => (
                                                <tr key={form.form_id} className={`border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 transition-colors hover:bg-[#eef1f5]/30 dark:hover:bg-[#21304A]/5 ${i % 2 === 0 ? '' : 'bg-neutral-50/40 dark:bg-neutral-800/10'}`}>
                                                    <td className="px-5 py-3.5">
                                                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{form.form_title}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`text-sm font-bold ${form.response_count > 0 ? 'text-[#21304A] dark:text-[#a1afc5]' : 'text-neutral-400'}`}>
                                                            {form.response_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center text-sm text-neutral-600 dark:text-neutral-400">
                                                        {form.total_questions}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className="text-sm font-semibold text-[#21304A] dark:text-[#a1afc5]">
                                                            {form.total_score?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <ScoreBar value={form.avg_score} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`text-sm font-bold ${form.rating_pct && form.rating_pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : form.rating_pct && form.rating_pct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                                                            {form.rating_pct != null ? `${form.rating_pct}%` : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Summary row */}
                                            <tr className="bg-[#21304A]/5 dark:bg-[#21304A]/10 border-t-2 border-[#21304A]/20">
                                                <td className="px-5 py-3.5 text-sm font-bold text-[#21304A] dark:text-[#a1afc5]">รวมทั้งหมด</td>
                                                <td className="px-5 py-3.5 text-center text-sm font-bold text-[#21304A] dark:text-[#a1afc5]">{data.summary.total_responses}</td>
                                                <td className="px-5 py-3.5 text-center text-sm font-bold text-[#21304A] dark:text-[#a1afc5]">{data.summary.total_questions}</td>
                                                <td className="px-5 py-3.5 text-center text-sm font-bold text-[#21304A] dark:text-[#a1afc5]">{data.summary.total_score?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                <td className="px-5 py-3.5">
                                                    <ScoreBar value={data.summary.avg_score} />
                                                </td>
                                                <td className="px-5 py-3.5 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    {data.summary.overall_rating_pct != null ? `${data.summary.overall_rating_pct}%` : '-'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Suggestions */}
                    {activeTab === 'suggestions' && (
                        <div className="space-y-4">
                            {/* Search/filter */}
                            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input type="text" placeholder="ค้นหาคำถาม หรือชื่อแบบฟอร์ม..."
                                        value={suggFilter} onChange={e => setSuggFilter(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                            </div>

                            {filteredSuggGroups.length === 0 ? (
                                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-12 text-center">
                                    <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
                                    <p className="text-neutral-500 text-sm">ไม่มีข้อเสนอแนะในช่วงเวลานี้</p>
                                </div>
                            ) : (
                                filteredSuggGroups.map(g => {
                                    const key = `${g.form_id}-${g.question_id}`;
                                    const isOpen = expandedSugg[key] !== false;
                                    return (
                                        <div key={key} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                            <button onClick={() => toggleSugg(key)}
                                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <MessageSquarePlus className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 block truncate">{g.question_text}</span>
                                                        <span className="text-xs text-neutral-400">{g.form_title}</span>
                                                    </div>
                                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full">
                                                        {g.items.length} รายการ
                                                    </span>
                                                </div>
                                                {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                                            </button>

                                            {isOpen && (
                                                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-2">
                                                    {g.items.map((s, i) => (
                                                        <div key={i} className="flex gap-3 p-3 border text-sm bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 text-white bg-teal-500">
                                                                {i + 1}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                {s.option_text && (
                                                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                                                        {s.option_text.split(' / ').map((opt, j) => (
                                                                            <span key={j} className="px-2 py-0.5 text-[11px] font-medium rounded-full border bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] border-[#21304A]/20">
                                                                                {opt}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {s.answer_text && (
                                                                    <div className="pl-2 border-l-2 border-amber-400">
                                                                        <p className="text-neutral-700 dark:text-neutral-300 break-words text-xs">{s.answer_text}</p>
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] text-neutral-400 mt-1.5">{s.submitted_at}</p>
                                                            </div>
                                                        </div>
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
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">กดปุ่ม "แสดง" เพื่อโหลดรายงาน</p>
                </div>
            )}

            {loading && !data && (
                <div className="text-center py-16 text-neutral-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
                    <p className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            )}
        </div>
    );
}
