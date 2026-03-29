'use client';

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Users, Star, BarChart2, ChevronRight, ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

const PRESETS = [
    { label: 'วันนี้', from: () => today(), to: () => today() },
    { label: '7 วันที่ผ่านมา', from: () => daysAgo(6), to: () => today() },
    { label: 'เดือนนี้', from: () => startOfMonth(), to: () => today() },
    { label: 'ทั้งหมด', from: () => '', to: () => '' },
];

function ScoreBadge({ score }) {
    if (score === null || score === undefined) return <span className="text-neutral-400 text-xs">ยังไม่มีข้อมูล</span>;
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

export default function ByJobClient() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [activePreset, setActivePreset] = useState('ทั้งหมด');

    const fetchReport = useCallback(async (f, t) => {
        setLoading(true);
        try {
            const params = {};
            if (f) params.from = f;
            if (t) params.to = t;
            const res = await axios.get(`${API}/personnel/report/by-job`, { params });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReport('', ''); }, [fetchReport]);

    const applyPreset = (preset) => {
        const f = preset.from(); const t = preset.to();
        setFrom(f); setTo(t); setActivePreset(preset.label);
        fetchReport(f, t);
    };

    const totalPersonnel = data.reduce((s, j) => s + (j.personnel_count || 0), 0);
    const totalResponses = data.reduce((s, j) => s + (j.response_count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/admin/personnel-report')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10">
                        <Briefcase className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">รายงานตามรูปแบบงาน</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">สรุปการประเมินบุคลากรแยกตามประเภทงาน</p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map(p => (
                            <button key={p.label} onClick={() => applyPreset(p)}
                                className={`px-3.5 py-2 text-sm font-medium transition-colors ${activePreset === p.label ? 'bg-[#21304A] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-end gap-3 ml-auto">
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">ตั้งแต่วันที่</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                <input type="date" value={from} onChange={e => { setFrom(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">ถึงวันที่</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                <input type="date" value={to} onChange={e => { setTo(e.target.value); setActivePreset(''); }}
                                    className="pl-9 pr-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition" />
                            </div>
                        </div>
                        <button onClick={() => { setActivePreset(''); fetchReport(from, to); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-sm font-medium transition-colors">
                            <RefreshCw className="w-4 h-4" />ดูรายงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10"><Briefcase className="w-5 h-5 text-orange-500" /></div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">จำนวนรูปแบบงาน</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10"><Users className="w-5 h-5 text-[#21304A]" /></div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">บุคลากรที่ถูกประเมิน</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalPersonnel}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10"><BarChart2 className="w-5 h-5 text-[#21304A]" /></div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">จำนวนการประเมิน</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalResponses}</p>
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
                        <Briefcase className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ไม่พบข้อมูลรูปแบบงาน</p>
                        <p className="text-sm mt-1">เพิ่มรูปแบบงานที่หน้า "รูปแบบงาน" ก่อน</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">รูปแบบงาน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">บุคลากรที่ถูกประเมิน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จำนวนการประเมิน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คะแนนเฉลี่ย</th>
                                    <th className="px-4 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {data.map((job, idx) => {
                                    const params = new URLSearchParams();
                                    if (from) params.set('from', from);
                                    if (to) params.set('to', to);
                                    const href = `/admin/personnel-report/by-job/${job.id}${params.toString() ? '?' + params.toString() : ''}`;
                                    return (
                                        <tr key={job.id} onClick={() => router.push(href)}
                                            className="hover:bg-orange-50/50 dark:hover:bg-orange-500/5 cursor-pointer transition-colors group">
                                            <td className="px-6 py-4 text-neutral-400">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 shrink-0">
                                                        <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-orange-600 dark:text-orange-400 group-hover:underline underline-offset-2">{job.name}</p>
                                                        {job.description && <p className="text-xs text-neutral-400 mt-0.5">{job.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                                                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                                                    {job.personnel_count || 0} คน
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                                                {job.response_count || 0} ครั้ง
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ScoreBadge score={job.avg_score} />
                                            </td>
                                            <td className="px-4 py-4 text-neutral-300 group-hover:text-orange-400 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
