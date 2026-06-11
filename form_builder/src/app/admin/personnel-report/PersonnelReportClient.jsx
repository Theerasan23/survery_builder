'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, Monitor, Star, Calendar, RefreshCw, ChevronRight, Briefcase, FileSpreadsheet, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function ScoreBadge({ score }) {
    if (score === null || score === undefined) {
        return <span className="text-neutral-400 text-xs">ยังไม่มีข้อมูล</span>;
    }
    const num = parseFloat(score);
    let cls = 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
    if (num >= 4.0) cls = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    else if (num >= 3.0) cls = 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400';

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-semibold ${cls}`}>
            <Star className="w-3.5 h-3.5" />
            {num.toFixed(2)}
        </span>
    );
}

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
};
const startOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const PRESETS = [
    { label: 'วันนี้', from: () => today(), to: () => today() },
    { label: '7 วันที่ผ่านมา', from: () => daysAgo(6), to: () => today() },
    { label: 'เดือนนี้', from: () => startOfMonth(), to: () => today() },
    { label: 'ทั้งหมด', from: () => '', to: () => '' },
];

const periodLabel = (from, to) =>
    from && to ? `${from} ถึง ${to}`
    : from ? `ตั้งแต่ ${from}`
    : to ? `ถึงวันที่ ${to}`
    : 'ทั้งหมด';

export default function PersonnelReportClient() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [activePreset, setActivePreset] = useState('ทั้งหมด');
    const [exporting, setExporting] = useState(false);

    const fetchReport = useCallback(async (f, t) => {
        setLoading(true);
        try {
            const params = {};
            if (f) params.from = f;
            if (t) params.to = t;
            const res = await axios.get(`${API}/personnel/report`, { params });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReport('', ''); }, [fetchReport]);

    const applyPreset = (preset) => {
        const f = preset.from();
        const t = preset.to();
        setFrom(f);
        setTo(t);
        setActivePreset(preset.label);
        fetchReport(f, t);
    };

    const handleSearch = () => {
        setActivePreset('');
        fetchReport(from, to);
    };

    const handleExport = async () => {
        if (data.length === 0) {
            alert('ยังไม่มีข้อมูลสำหรับ export');
            return;
        }
        setExporting(true);
        try {
            const params = {};
            if (from) params.from = from;
            if (to) params.to = to;
            const period = periodLabel(from, to);

            const responsesList = await Promise.all(
                data.map(p =>
                    p.response_count > 0
                        ? axios.get(`${API}/personnel/${p.id}/responses`, { params }).then(r => r.data).catch(() => [])
                        : Promise.resolve([])
                )
            );

            const rows = [];
            data.forEach((p, i) => {
                const name = `${p.first_name} ${p.last_name}`;
                const stats = new Map();
                responsesList[i].forEach(resp => resp.answers.forEach(a => {
                    if (a.question_type === 'rating' && a.answer_numeric != null) {
                        const cur = stats.get(a.question_text) || { count: 0, sum: 0 };
                        cur.count += 1;
                        cur.sum += a.answer_numeric;
                        stats.set(a.question_text, cur);
                    }
                }));
                if (stats.size === 0) {
                    rows.push({
                        'ชื่อ-นามสกุล': name,
                        'ช่วงเวลา': period,
                        'รายการประเมิน': '—',
                        'จำนวนครั้งที่ประเมิน': p.response_count || 0,
                        'คะแนนเฉลี่ย': p.avg_score != null ? parseFloat(p.avg_score) : '—',
                    });
                } else {
                    stats.forEach((s, q) => {
                        rows.push({
                            'ชื่อ-นามสกุล': name,
                            'ช่วงเวลา': period,
                            'รายการประเมิน': q,
                            'จำนวนครั้งที่ประเมิน': s.count,
                            'คะแนนเฉลี่ย': +(s.sum / s.count).toFixed(2),
                        });
                    });
                }
            });

            rows.push({});
            rows.push({
                'ชื่อ-นามสกุล': 'รวมทั้งหมด',
                'ช่วงเวลา': period,
                'รายการประเมิน': 'จำนวนผู้ประเมินทั้งหมด / คะแนนเฉลี่ยรวม',
                'จำนวนครั้งที่ประเมิน': totalResponses,
                'คะแนนเฉลี่ย': overallAvg != null ? parseFloat(overallAvg) : '—',
            });

            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{ wch: 25 }, { wch: 24 }, { wch: 45 }, { wch: 18 }, { wch: 12 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'รายงานบุคลากร');
            const suffix = from || to ? `_${from || 'start'}_${to || 'now'}` : '';
            XLSX.writeFile(wb, `personnel_report${suffix}.xlsx`);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Export ไม่สำเร็จ');
        } finally {
            setExporting(false);
        }
    };

    const totalResponses = data.reduce((s, p) => s + (p.response_count || 0), 0);
    const withScore = data.filter(p => p.avg_score !== null);
    const overallAvg = withScore.length
        ? (withScore.reduce((s, p) => s + parseFloat(p.avg_score), 0) / withScore.length).toFixed(2)
        : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10">
                            <BarChart2 className="w-5 h-5 text-[#21304A]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">รายงานคะแนนประเมินบุคลากร</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">สรุปคะแนนความพึงพอใจของแต่ละบุคลากรตามช่วงเวลา</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={exporting || loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-sm shadow-emerald-500/20"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            Export Excel
                        </button>
                        <button
                            onClick={() => router.push('/admin/personnel-report/by-job')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors shadow-sm shadow-orange-500/20"
                        >
                            <Briefcase className="w-4 h-4" />
                            ดูรายงานตามงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Presets */}
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
                                <input
                                    type="date"
                                    value={from}
                                    onChange={e => { setFrom(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">ถึงวันที่</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={to}
                                    onChange={e => { setTo(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-sm font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            ดูรายงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10">
                            <Users className="w-5 h-5 text-[#21304A]" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">จำนวนบุคลากร</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10">
                            <Monitor className="w-5 h-5 text-[#21304A]" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">จำนวนผู้ประเมินทั้งหมด</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalResponses}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10">
                            <Star className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">คะแนนเฉลี่ยรวม</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                {overallAvg ?? '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <Users className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ไม่พบข้อมูลบุคลากร</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ชื่อ-นามสกุล</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ตำแหน่ง</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">Device</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จำนวนผู้ประเมิน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คะแนนเฉลี่ย</th>
                                    <th className="px-4 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {data.map((p, idx) => {
                                    const params = new URLSearchParams();
                                    if (from) params.set('from', from);
                                    if (to) params.set('to', to);
                                    const href = `/admin/personnel-report/${p.id}${params.toString() ? '?' + params.toString() : ''}`;
                                    return (
                                    <tr
                                        key={p.id}
                                        onClick={() => router.push(href)}
                                        className="hover:bg-[#eef1f5]/50 dark:hover:bg-[#21304A]/5 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4 text-neutral-400">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#21304A] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                                    {p.first_name?.[0]}{p.last_name?.[0]}
                                                </div>
                                                <span className="font-medium text-[#21304A] dark:text-[#a1afc5] group-hover:underline underline-offset-2">
                                                    {p.first_name} {p.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">{p.position || '—'}</td>
                                        <td className="px-6 py-4">
                                            {p.all_devices ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                                    <Monitor className="w-3 h-3" />
                                                    ทุกเครื่อง
                                                </span>
                                            ) : p.device_name ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] text-xs font-medium">
                                                    <Monitor className="w-3 h-3" />
                                                    {p.device_name}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-400 text-xs">ไม่มี Device</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                {p.response_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <ScoreBadge score={p.avg_score} />
                                        </td>
                                        <td className="px-4 py-4 text-neutral-300 group-hover:text-[#a1afc5] transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Legend */}
                        <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-4 text-xs text-neutral-500">
                            <span className="font-medium">ระดับคะแนน:</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> ≥ 4.0 ดีมาก</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 3.0–3.9 ปานกลาง</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> &lt; 3.0 ต้องปรับปรุง</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
