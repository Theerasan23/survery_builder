'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboardStats } from '@/app/admin/dashboard/actions';
import {
    FileText, Users, BarChart2, MessageSquarePlus, TrendingUp,
    Search, RefreshCw, Calendar, CheckCircle2, Eye, ExternalLink,
    Activity, Zap, X, ChevronDown, ChevronRight, MessageSquare,
    Sigma, CheckSquare, Star, FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

// Bangkok timezone helpers
const toBKK = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const TODAY = toBKK(new Date());
const FIRST_OF_MONTH = TODAY.slice(0, 8) + '01';

// Preset date ranges
const PRESETS = [
    { label: 'วันนี้',       from: TODAY,              to: TODAY },
    { label: '7 วัน',       from: toBKK(new Date(Date.now() - 6 * 86400000)),  to: TODAY },
    { label: 'เดือนนี้',    from: FIRST_OF_MONTH,     to: TODAY },
    { label: '3 เดือน',     from: toBKK(new Date(Date.now() - 89 * 86400000)), to: TODAY },
    { label: 'ทั้งหมด',     from: '2020-01-01',       to: TODAY },
];

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', pulse = false }) {
    const colors = {
        indigo: 'text-[#21304A] bg-[#eef1f5] dark:bg-[#21304A]/10',
        emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
        amber:  'text-amber-500  bg-amber-50  dark:bg-amber-500/10',
        teal:   'text-teal-500   bg-teal-50   dark:bg-teal-500/10',
        violet: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    };
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm flex items-start gap-4 relative overflow-hidden">
            <div className={`p-2.5 flex-shrink-0 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
                <p className={`text-3xl font-bold text-neutral-800 dark:text-white flex items-center gap-2 ${pulse ? 'text-emerald-500 dark:text-emerald-400' : ''}`}>
                    {value ?? '-'}
                    {pulse && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                </p>
                {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function SuggestionsModal({ suggestions = [], onClose }) {
    const [openForms, setOpenForms] = useState({});
    const [search, setSearch] = useState('');

    // Group by form
    const grouped = suggestions.reduce((acc, s) => {
        const key = s.form_id;
        if (!acc[key]) acc[key] = { form_id: s.form_id, form_title: s.form_title, items: [] };
        acc[key].items.push(s);
        return acc;
    }, {});
    const groups = Object.values(grouped);

    const filtered = search.trim()
        ? groups.map(g => ({
            ...g,
            items: g.items.filter(i =>
                i.question_text?.toLowerCase().includes(search.toLowerCase()) ||
                i.answer_text?.toLowerCase().includes(search.toLowerCase()) ||
                i.option_text?.toLowerCase().includes(search.toLowerCase())
            ),
        })).filter(g => g.items.length > 0 || g.form_title.toLowerCase().includes(search.toLowerCase()))
        : groups;

    const toggle = (id) => setOpenForms(p => ({ ...p, [id]: !p[id] }));

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white dark:bg-neutral-900 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-700">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-teal-50 dark:bg-teal-500/10">
                            <MessageSquare className="w-4 h-4 text-teal-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-800 dark:text-white">ข้อเสนอแนะทั้งหมด</h2>
                            <p className="text-xs text-neutral-400">{suggestions.length} รายการ จาก {groups.length} แบบฟอร์ม</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาคำถาม หรือข้อความที่กรอก..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-neutral-400 py-8">ไม่พบรายการ</p>
                    )}
                    {filtered.map(g => {
                        const isOpen = openForms[g.form_id] !== false; // default open
                        return (
                            <div key={g.form_id} className="border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                                {/* Form header row */}
                                <button
                                    onClick={() => toggle(g.form_id)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-[#a1afc5] flex-shrink-0" />
                                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{g.form_title}</span>
                                        <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full font-medium">
                                            {g.items.length} รายการ
                                        </span>
                                    </div>
                                    {isOpen ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                                </button>

                                {/* Items */}
                                {isOpen && (
                                    <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
                                        {g.items.map((item, idx) => (
                                            <div key={idx} className="px-4 py-3">
                                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 leading-snug">
                                                    {item.question_text}
                                                </p>
                                                {item.option_text && (
                                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                                        {item.option_text.split(' / ').map((opt, i) => (
                                                            <span key={i} className="inline-block px-2 py-0.5 rounded-full bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] text-xs border border-[#21304A] dark:border-[#21304A]/20">
                                                                {opt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="pl-3 border-l-2 border-amber-300 dark:border-amber-500">
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{item.answer_text}</p>
                                                </div>
                                                <p className="text-[10px] text-neutral-400 mt-1.5">{item.submitted_at}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
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

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 shadow-lg text-xs">
                <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">{label}</p>
                <p className="text-[#21304A]">{payload[0].value} responses</p>
            </div>
        );
    }
    return null;
};

const POLL_INTERVAL = 30000; // 30 seconds

export default function DashboardClient({ initialData = null }) {
    const [from, setFrom] = useState(FIRST_OF_MONTH);
    const [to, setTo]     = useState(TODAY);
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [realtimeCount, setRealtimeCount] = useState(0);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [justUpdated, setJustUpdated] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const activePreset = PRESETS.find(p => p.from === from && p.to === to);
    const prevResponseCount = useRef(initialData?.total_responses ?? null);

    // Set initial lastUpdate after mount to avoid SSR/CSR hydration mismatch on time
    useEffect(() => {
        if (initialData) setLastUpdate(new Date());
    }, [initialData]);

    const load = useCallback(async (f = from, t = to) => {
        setLoading(true);
        try {
            const json = await fetchDashboardStats(f, t);
            if (json) {
                setData(json);
                setLastUpdate(new Date());
            }
        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    // Polling for real-time updates (WAF-safe, uses Server Action)
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const json = await fetchDashboardStats(from, to);
                if (json) {
                    const newCount = json.total_responses ?? 0;
                    if (prevResponseCount.current !== null && newCount > prevResponseCount.current) {
                        const diff = newCount - prevResponseCount.current;
                        setRealtimeCount(c => c + diff);
                        setJustUpdated(true);
                        setTimeout(() => setJustUpdated(false), 3000);
                    }
                    prevResponseCount.current = newCount;
                    setData(json);
                    setLastUpdate(new Date());
                }
            } catch {}
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [from, to]);

    const applyPreset = (p) => {
        setFrom(p.from);
        setTo(p.to);
        load(p.from, p.to);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        load();
    };

    const forms = data?.forms || [];
    const filteredForms = forms.filter(f =>
        !searchTerm || f.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const trendData = (data?.trend || []).map(d => ({
        day: d.day?.slice(5), // MM-DD
        count: Number(d.count),
        full: d.day,
    }));

    return (
        <div className="space-y-6 pb-12">
            {/* Date Filter */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Realtime indicators */}
                    {justUpdated && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-pulse self-end mb-0.5">
                            <Zap className="w-3.5 h-3.5" />
                            มีการตอบกลับใหม่!
                        </div>
                    )}
                    {realtimeCount > 0 && !justUpdated && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef1f5] dark:bg-[#21304A]/10 border border-[#21304A] dark:border-[#21304A]/30 rounded-full text-xs font-medium text-[#21304A] dark:text-[#a1afc5] self-end mb-0.5">
                            <Activity className="w-3.5 h-3.5" />
                            +{realtimeCount} ใหม่
                        </div>
                    )}
                    {/* Presets */}
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => applyPreset(p)}
                                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${activePreset?.label === p.label ? 'bg-[#21304A] text-white border-[#21304A]' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 border-l border-neutral-200 dark:border-neutral-700 hidden sm:block" />
                    {/* Custom range */}
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
                    <div className="flex items-center gap-3 self-end pb-2 ml-auto">
                        {lastUpdate && (
                            <span className="text-[10px] text-neutral-400">
                                อัปเดต {lastUpdate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            Realtime
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users}            label="จำนวนผู้ตอบ"       value={data?.total_responses ?? '-'}  sub={`ช่วง ${from} – ${to}`}   color="indigo" pulse={justUpdated} />
                <StatCard icon={FileText}          label="แบบฟอร์มที่เปิดรับ" value={data ? `${data.active_forms}/${data.total_forms}` : '-'} sub="เปิดรับ / ทั้งหมด" color="emerald" />
                <StatCard icon={TrendingUp}        label="คะแนนเฉลี่ยรวม"    value={data?.avg_score ? `${data.avg_score.toFixed(2)}` : '-'}   sub="จาก Rating / Grid"  color="amber" />
                <div onClick={() => data?.suggestions?.length && setShowSuggestions(true)}
                    className={data?.suggestions?.length ? 'cursor-pointer' : ''}>
                    <StatCard icon={MessageSquarePlus} label="ข้อเสนอแนะ" value={data?.total_suggestions ?? '-'}
                        sub={data?.suggestions?.length ? 'กดเพื่อดูรายละเอียด' : 'คำตอบที่กรอกข้อความ'} color="teal" />
                </div>
            </div>

            {/* Score Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Sigma} label="ยอดรวมคะแนน" value={data?.total_score != null ? data.total_score.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'} sub="Total Score (Rating)" color="indigo" />
                <StatCard icon={CheckSquare} label="จำนวนคำถามทั้งหมด" value={data?.total_questions ?? '-'} sub="Total Questions" color="violet" />
                <StatCard icon={Star} label="% รวม Rating" value={data?.overall_rating_pct != null ? `${data.overall_rating_pct}%` : '-'} sub="Overall Rating %" color="emerald" />
            </div>

            {/* Suggestions Modal */}
            {showSuggestions && (
                <SuggestionsModal
                    suggestions={data?.suggestions || []}
                    onClose={() => setShowSuggestions(false)}
                />
            )}

            {/* Trend Chart */}
            {trendData.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#21304A]" />
                            แนวโน้มการตอบกลับ
                        </h2>
                        <span className="text-xs text-neutral-400">{from} – {to}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-700" />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#gradIndigo)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Topic Summary Table */}
            {data?.topics?.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-[#21304A]" />
                            สรุปตามหัวข้อ
                            <span className="text-xs font-normal text-neutral-400">({data.topics.length} หัวข้อ)</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400">หัวข้อ</th>
                                    <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">แบบฟอร์ม</th>
                                    <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">ผู้ตอบ</th>
                                    <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-36 text-right">การดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topics.map((topic, i) => (
                                    <tr key={topic.topic_id} className={`border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 transition-colors hover:bg-[#eef1f5]/30 dark:hover:bg-[#21304A]/5 ${i % 2 === 0 ? '' : 'bg-neutral-50/40 dark:bg-neutral-800/10'}`}>
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{topic.topic_name}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{topic.form_count}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={`text-sm font-bold ${topic.total_responses > 0 ? 'text-[#21304A] dark:text-[#a1afc5]' : 'text-neutral-400'}`}>
                                                {topic.total_responses}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Link href={`/admin/dashboard/topics/${topic.topic_id}/analytics`}
                                                title="ดู Analytics"
                                                className="p-1.5 inline-flex bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#eef1f5] hover:text-[#21304A] dark:hover:bg-[#21304A]/20 dark:hover:text-[#a1afc5] transition-colors">
                                                <BarChart2 className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Per-Form Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#21304A]" />
                            สรุปผลแต่ละแบบฟอร์ม
                            {data && <span className="text-xs font-normal text-neutral-400">({forms.length} แบบฟอร์ม)</span>}
                        </h2>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อแบบฟอร์ม..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8 pr-4 py-1.5 w-52 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]"
                            />
                        </div>
                    </div>

                    {loading && !data ? (
                        <div className="p-12 text-center text-neutral-400 text-sm">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : filteredForms.length === 0 ? (
                        <div className="p-12 text-center text-neutral-400 text-sm">ไม่พบแบบฟอร์ม</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400">ชื่อแบบฟอร์ม</th>
                                        <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">สถานะ</th>
                                        <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-24 text-center">ผู้ตอบ</th>
                                        <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-48">คะแนนเฉลี่ย</th>
                                        <th className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-36 text-right">การดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredForms.map((form, i) => (
                                        <tr key={form.id} className={`border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 transition-colors hover:bg-[#eef1f5]/30 dark:hover:bg-[#21304A]/5 ${i % 2 === 0 ? '' : 'bg-neutral-50/40 dark:bg-neutral-800/10'}`}>
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{form.title}</p>
                                                {form.topic_name && (
                                                    <p className="text-xs text-neutral-400 mt-0.5">{form.topic_name}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${form.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                                                    {form.is_active ? <><CheckCircle2 className="w-3 h-3" />เปิดรับ</> : 'ปิด'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`text-sm font-bold ${Number(form.response_count) > 0 ? 'text-[#21304A] dark:text-[#a1afc5]' : 'text-neutral-400'}`}>
                                                    {Number(form.response_count) || 0}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <ScoreBar value={form.avg_score ? Number(form.avg_score) : null} />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/admin/dashboard/forms/${form.id}/analytics`}
                                                        title="Analytics"
                                                        className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-[#eef1f5] hover:text-[#21304A] dark:hover:bg-[#21304A]/20 dark:hover:text-[#a1afc5] transition-colors">
                                                        <BarChart2 className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <Link href={`/admin/dashboard/forms/${form.id}/responses`}
                                                        title="Responses"
                                                        className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400 transition-colors">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <Link href={`/form/${form.uuid}`} target="_blank"
                                                        title="เปิดแบบฟอร์ม"
                                                        className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-teal-100 hover:text-teal-600 dark:hover:bg-teal-500/20 dark:hover:text-teal-400 transition-colors">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            {/* Bar chart: responses per form */}
            {filteredForms.filter(f => Number(f.response_count) > 0).length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-[#21304A]" />
                        จำนวนผู้ตอบแต่ละแบบฟอร์ม
                    </h2>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={filteredForms.map(f => ({ name: f.title?.slice(0, 20), count: Number(f.response_count) || 0, active: f.is_active }))} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-700" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {filteredForms.map((f, i) => (
                                    <Cell key={i} fill={f.is_active ? '#6366f1' : '#d1d5db'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3 justify-end text-xs text-neutral-400">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#21304A] inline-block" />เปิดรับ</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-neutral-300 dark:bg-neutral-600 inline-block" />ปิด</span>
                    </div>
                </div>
            )}
        </div>
    );
}
