'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, Star, Briefcase, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

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

export default function JobPersonnelClient({ jobId, from, to }) {
    const router = useRouter();
    const [personnel, setPersonnel] = useState([]);
    const [jobName, setJobName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const params = {};
            if (from) params.from = from;
            if (to) params.to = to;

            const [personnelRes, jobsRes] = await Promise.all([
                axios.get(`${API}/personnel/report/by-job/${jobId}`, { params }),
                axios.get(`${API}/job-types`)
            ]);
            setPersonnel(personnelRes.data);
            const job = jobsRes.data.find(j => String(j.id) === String(jobId));
            if (job) setJobName(job.name);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [jobId, from, to]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const buildBackHref = () => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return `/admin/personnel-report/by-job${params.toString() ? '?' + params.toString() : ''}`;
    };

    const totalResponses = personnel.reduce((s, p) => s + (p.response_count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push(buildBackHref())} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10">
                        <Briefcase className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {jobName ? `บุคลากรงาน: ${jobName}` : 'บุคลากรตามงาน'}
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {personnel.length} คน · {totalResponses} การประเมิน
                            {from && to ? ` · ${from} ถึง ${to}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : personnel.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <Users className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ไม่พบบุคลากรในงานนี้</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ชื่อ-นามสกุล</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ตำแหน่ง</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จำนวนการประเมิน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คะแนนเฉลี่ย</th>
                                    <th className="px-4 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {personnel.map((p, idx) => {
                                    const params = new URLSearchParams();
                                    if (from) params.set('from', from);
                                    if (to) params.set('to', to);
                                    const href = `/admin/personnel-report/${p.id}${params.toString() ? '?' + params.toString() : ''}`;
                                    return (
                                        <tr key={p.id} onClick={() => router.push(href)}
                                            className="hover:bg-[#eef1f5]/50 dark:hover:bg-[#21304A]/5 cursor-pointer transition-colors group">
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
                                            <td className="px-6 py-4 text-center font-semibold text-neutral-800 dark:text-neutral-200">{p.response_count || 0}</td>
                                            <td className="px-6 py-4 text-center"><ScoreBadge score={p.avg_score} /></td>
                                            <td className="px-4 py-4 text-neutral-300 group-hover:text-[#a1afc5] transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

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
