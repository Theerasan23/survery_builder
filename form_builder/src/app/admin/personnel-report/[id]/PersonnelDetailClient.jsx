'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    ArrowLeft, Star, Clock, ClipboardList, Calendar,
    RefreshCw, Monitor, User, Building2, ChevronDown,
    FileSpreadsheet, Loader2
} from 'lucide-react';

// Use relative /api/ path so it works via ngrok too
const API_PERSONNEL = '/api/personnel';

const SATISFACTION = {
    5: { label: 'ดีเยี่ยม', emoji: '😄', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    4: { label: 'ดี',        emoji: '🙂', bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400' },
    3: { label: 'ปานกลาง',  emoji: '😐', bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400' },
    2: { label: 'น้อย',     emoji: '😕', bg: 'bg-orange-50 dark:bg-orange-500/10',   text: 'text-orange-600 dark:text-orange-400' },
    1: { label: 'น้อยมาก', emoji: '😞', bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400' },
};

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

const PRESETS = [
    { label: 'วันนี้',           from: () => today(),         to: () => today() },
    { label: '7 วันที่ผ่านมา',  from: () => daysAgo(6),      to: () => today() },
    { label: 'เดือนนี้',         from: () => startOfMonth(),  to: () => today() },
    { label: 'ทั้งหมด',          from: () => '',              to: () => '' },
];

const periodLabel = (from, to) =>
    from && to ? `${from} ถึง ${to}`
    : from ? `ตั้งแต่ ${from}`
    : to ? `ถึงวันที่ ${to}`
    : 'ทั้งหมด';

function formatDateTime(str) {
    if (!str) return '—';
    return new Date(str).toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function ScoreBadge({ score }) {
    if (score === null || score === undefined) return null;
    const num = parseFloat(score);
    const s = SATISFACTION[Math.round(num)];
    const cls = num >= 4 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : num >= 3 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold ${cls}`}>
            <Star className="w-3.5 h-3.5" />
            {num.toFixed(2)}
            {s && <span className="font-normal text-xs">({s.label})</span>}
        </span>
    );
}

export default function PersonnelDetailClient({ personnelId, initialFrom, initialTo }) {
    const router = useRouter();
    const [personnel, setPersonnel] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [activePreset, setActivePreset] = useState(initialFrom || initialTo ? '' : 'ทั้งหมด');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [exporting, setExporting] = useState(false);

    const fetchData = useCallback(async (f, t) => {
        setLoading(true);
        try {
            const params = {};
            if (f) params.from = f;
            if (t) params.to = t;
            const [pRes, rRes] = await Promise.all([
                axios.get(`${API_PERSONNEL}/${personnelId}`),
                axios.get(`${API_PERSONNEL}/${personnelId}/responses`, { params })
            ]);
            setPersonnel(pRes.data);
            setResponses(rRes.data);
            // Auto-expand all on load
            setExpandedIds(new Set(rRes.data.map(r => r.id)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [personnelId]);

    useEffect(() => { fetchData(from, to); }, [fetchData]);

    const applyPreset = (preset) => {
        const f = preset.from();
        const t = preset.to();
        setFrom(f); setTo(t);
        setActivePreset(preset.label);
        fetchData(f, t);
    };

    const handleSearch = () => {
        setActivePreset('');
        fetchData(from, to);
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleExport = async () => {
        if (!personnel || responses.length === 0) {
            alert('ยังไม่มีข้อมูลสำหรับ export');
            return;
        }
        setExporting(true);
        try {
            const name = `${personnel.first_name} ${personnel.last_name}`;
            const period = periodLabel(from, to);

            const stats = new Map();
            responses.forEach(resp => resp.answers.forEach(a => {
                if (a.question_type === 'rating' && a.answer_numeric != null) {
                    const cur = stats.get(a.question_text) || { count: 0, sum: 0 };
                    cur.count += 1;
                    cur.sum += a.answer_numeric;
                    stats.set(a.question_text, cur);
                }
            }));

            if (stats.size === 0) {
                alert('ยังไม่มีคะแนนประเมินสำหรับ export');
                return;
            }

            const rows = [...stats.entries()].map(([q, s]) => ({
                'ชื่อ-นามสกุล': name,
                'ช่วงเวลา': period,
                'รายการประเมิน': q,
                'จำนวนครั้งที่ประเมิน': s.count,
                'คะแนนเฉลี่ย': +(s.sum / s.count).toFixed(2),
            }));

            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{ wch: 25 }, { wch: 24 }, { wch: 45 }, { wch: 18 }, { wch: 12 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'รายงานบุคลากร');
            const suffix = from || to ? `_${from || 'start'}_${to || 'now'}` : '';
            XLSX.writeFile(wb, `personnel_${personnel.first_name}_${personnel.last_name}${suffix}.xlsx`);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Export ไม่สำเร็จ');
        } finally {
            setExporting(false);
        }
    };

    // Summary stats
    const ratingResponses = responses.filter(r => r.answers.some(a => a.question_type === 'rating'));
    const allScores = responses.flatMap(r => r.answers.filter(a => a.question_type === 'rating').map(a => a.answer_numeric)).filter(v => v != null);
    const overallAvg = allScores.length ? (allScores.reduce((s, v) => s + v, 0) / allScores.length) : null;

    return (
        <div className="space-y-6">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                กลับรายงานบุคลากร
            </button>

            {/* Personnel header card */}
            {personnel && (
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <div className="h-2 bg-[#21304A]" />
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="w-16 h-16 bg-[#21304A] flex items-center justify-center text-white font-bold text-xl shrink-0">
                            {personnel.first_name?.[0]}{personnel.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                                {personnel.first_name} {personnel.last_name}
                            </h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                {personnel.position && (
                                    <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                                        <User className="w-3.5 h-3.5" /> {personnel.position}
                                    </span>
                                )}
                                {personnel.department && (
                                    <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                                        <Building2 className="w-3.5 h-3.5" /> {personnel.department}
                                    </span>
                                )}
                                {personnel.device_name && (
                                    <span className="flex items-center gap-1.5 text-sm text-[#21304A] dark:text-[#a1afc5]">
                                        <Monitor className="w-3.5 h-3.5" /> {personnel.device_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="flex gap-4 shrink-0">
                            <div className="text-center px-4 py-2 bg-[#eef1f5] dark:bg-[#21304A]/10">
                                <p className="text-2xl font-bold text-[#21304A] dark:text-[#a1afc5]">{responses.length}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">ครั้งที่ประเมิน</p>
                            </div>
                            <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {overallAvg !== null ? overallAvg.toFixed(2) : '—'}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">คะแนนเฉลี่ย</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Date filter */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(p)}
                                className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                                    activePreset === p.label
                                        ? 'bg-[#21304A] text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end gap-3 ml-auto">
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">ตั้งแต่วันที่</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                <input type="date" value={from}
                                    onChange={e => { setFrom(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">ถึงวันที่</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                <input type="date" value={to}
                                    onChange={e => { setTo(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>
                        <button onClick={handleSearch}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-sm font-medium transition-colors">
                            <RefreshCw className="w-4 h-4" />
                            ดูรายงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* Response list */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-[#21304A]" />
                    <h2 className="font-semibold text-neutral-900 dark:text-white text-sm">
                        รายการประเมิน
                    </h2>
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] text-xs font-semibold">
                        {responses.length} ครั้ง
                    </span>
                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium transition-colors"
                    >
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                        Export Excel
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-8 h-8 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : responses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                        <ClipboardList className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ยังไม่มีการประเมินในช่วงเวลานี้</p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {responses.map((resp, ri) => {
                            const ratingAnss = resp.answers.filter(a => a.question_type === 'rating');
                            const avgScore = ratingAnss.length
                                ? ratingAnss.reduce((s, a) => s + (a.answer_numeric || 0), 0) / ratingAnss.length
                                : null;
                            const isExpanded = expandedIds.has(resp.id);

                            return (
                                <div key={resp.id}>
                                    {/* Row header — click to expand */}
                                    <button
                                        onClick={() => toggleExpand(resp.id)}
                                        className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[#eef1f5] dark:bg-[#21304A]/10 flex items-center justify-center text-[#21304A] dark:text-[#a1afc5] text-xs font-bold shrink-0">
                                                {responses.length - ri}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                                    📋 {resp.form_title}
                                                </p>
                                                <p className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(resp.submitted_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {avgScore !== null && <ScoreBadge score={avgScore} />}
                                            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Answers detail */}
                                    {isExpanded && (
                                        <div className="px-6 pb-5 bg-neutral-50 dark:bg-neutral-800/20">
                                            <div className="ml-12 space-y-2 pt-1">
                                                {resp.answers.map((ans, ai) => (
                                                    <div key={ai} className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                                                        <span className="text-sm text-neutral-600 dark:text-neutral-400 flex-1 leading-relaxed">
                                                            {ans.question_text}
                                                        </span>
                                                        <div className="shrink-0">
                                                            {ans.question_type === 'rating' && ans.answer_numeric != null && (() => {
                                                                const s = SATISFACTION[ans.answer_numeric];
                                                                return (
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${s?.bg} ${s?.text}`}>
                                                                        {s?.emoji} {s?.label}
                                                                        <span className="text-neutral-400 font-normal">({ans.answer_numeric})</span>
                                                                    </span>
                                                                );
                                                            })()}
                                                            {(ans.question_type === 'text' || ans.question_type === 'short_text') && (
                                                                <span className="text-sm text-neutral-700 dark:text-neutral-300 italic max-w-[240px] block text-right">
                                                                    {ans.answer_text || <span className="text-neutral-400 not-italic">ไม่มีความเห็น</span>}
                                                                </span>
                                                            )}
                                                            {(ans.question_type === 'single_choice' || ans.question_type === 'multiple_choice') && (
                                                                <span className="px-2.5 py-1 bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] text-xs font-medium">
                                                                    {ans.option_text || '—'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
