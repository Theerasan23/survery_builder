'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, Phone, Star, ChevronRight } from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

const SATISFACTION_LEVELS = [
    { value: 5, label: 'ดีเยี่ยม', emoji: '😄', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-300 dark:border-emerald-600', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { value: 4, label: 'ดี', emoji: '🙂', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-300 dark:border-blue-600', text: 'text-blue-700 dark:text-blue-400', ring: 'ring-blue-400' },
    { value: 3, label: 'ปานกลาง', emoji: '😐', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-300 dark:border-amber-600', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-400' },
    { value: 2, label: 'น้อย', emoji: '😕', color: 'orange', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-300 dark:border-orange-600', text: 'text-orange-700 dark:text-orange-400', ring: 'ring-orange-400' },
    { value: 1, label: 'น้อยมาก', emoji: '😞', color: 'red', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-300 dark:border-red-600', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-400' },
];

function imgUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) {
        return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/');
    }
    return url.replace(/^\/uploads\//, '/api/uploads/');
}

export default function PersonalFormClient({ deviceId }) {
    const [device, setDevice] = useState(null);
    const [org, setOrg] = useState(null);
    const [form, setForm] = useState(null);
    const [isPersonnelForm, setIsPersonnelForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stage, setStage] = useState('landing'); // 'landing' | 'form' | 'submitted'
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const submittedRef = useRef(false);

    const fetchDevice = useCallback(async () => {
        try {
            const [dRes, oRes] = await Promise.all([
                axios.get(`/api/devices/${deviceId}`),
                axios.get('/api/settings/organization'),
            ]);
            const d = dRes.data;
            setDevice(d);
            setOrg(oRes.data);

            if (d.status === 'open') {
                axios.patch(`/api/devices/${deviceId}/ping`).catch(() => { });
                if (d.personnel_form_id) {
                    const fRes = await axios.get(`/api/personnel-forms/${d.personnel_form_uuid || d.personnel_form_id}`);
                    setForm(fRes.data);
                    setIsPersonnelForm(true);
                } else if (d.form_id) {
                    const fRes = await axios.get(`/api/forms/${d.form_id}`);
                    setForm(fRes.data);
                    setIsPersonnelForm(false);
                }
            }
        } catch {
            setError('ไม่พบ Device นี้ในระบบ');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => { fetchDevice(); }, [fetchDevice]);

    // Realtime + polling
    useEffect(() => {
        let pollInterval = null;
        let socket = null;
        let socketConnected = false;
        let prevSnapshot = null; // track status + personnel_id

        const reloadDevice = async () => {
            try {
                const res = await axios.get(`/api/devices/${deviceId}`);
                const d = res.data;

                if (d.status === 'open') {
                    setDevice(d);
                    setStage('landing');
                    setAnswers({});
                    submittedRef.current = false;
                    axios.patch(`/api/devices/${deviceId}/ping`).catch(() => { });
                    if (d.personnel_form_id) {
                        const fRes = await axios.get(`/api/personnel-forms/${d.personnel_form_uuid || d.personnel_form_id}`);
                        setForm(fRes.data);
                        setIsPersonnelForm(true);
                    } else if (d.form_id) {
                        const fRes = await axios.get(`/api/forms/${d.form_id}`);
                        setForm(fRes.data);
                        setIsPersonnelForm(false);
                    } else {
                        setForm(null);
                        setIsPersonnelForm(false);
                    }
                } else {
                    setDevice(prev => prev ? { ...prev, status: 'closed' } : prev);
                    setForm(null);
                }
            } catch { /* ignore */ }
        };

        if (SOCKET_URL) {
            try {
                socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], timeout: 5000, reconnectionAttempts: 3 });
                socket.on('connect', () => { socketConnected = true; });
                socket.on('disconnect', () => { socketConnected = false; });
                socket.on('device_status_changed', (data) => {
                    if (data.device_id !== deviceId) return;
                    reloadDevice();
                });
            } catch { /* ignore */ }
        }

        // Polling fallback — detects status AND personnel changes
        pollInterval = setInterval(async () => {
            if (socketConnected) return;
            try {
                const res = await axios.get(`/api/devices/${deviceId}`);
                const d = res.data;
                const snapshot = `${d.status}|${d.personnel_id || ''}|${d.job_id || ''}`;
                if (prevSnapshot !== null && prevSnapshot !== snapshot) {
                    reloadDevice();
                }
                prevSnapshot = snapshot;
            } catch { /* ignore */ }
        }, 3000);

        return () => { socket?.disconnect(); clearInterval(pollInterval); };
    }, [deviceId]);

    const getAllQuestions = useCallback(() => {
        if (!form) return [];
        const qs = [];
        form.sections?.forEach(s => s.questions?.forEach(q => qs.push(q)));
        form.unsectioned_questions?.forEach(q => qs.push(q));
        return qs.sort((a, b) => a.order_index - b.order_index);
    }, [form]);

    // Check if all required questions are answered
    const allRequiredAnswered = useCallback((currentAnswers) => {
        const questions = getAllQuestions();
        return questions.every(q => {
            if (!q.is_required) return true;
            const ans = currentAnswers[q.id];
            if (ans === undefined) return false;
            if (q.type === 'multiple_choice' && Array.isArray(ans.value) && ans.value.length === 0) return false;
            if ((q.type === 'text' || q.type === 'short_text') && typeof ans.value === 'string' && !ans.value.trim()) return false;
            return true;
        });
    }, [getAllQuestions]);

    // Auto-submit without confirmation
    const doSubmit = useCallback(async (currentAnswers) => {
        if (submittedRef.current || submitting) return;
        setSubmitting(true);
        submittedRef.current = true;
        try {
            const answersPayload = Object.entries(currentAnswers).flatMap(([qId, ans]) => {
                const base = { question_id: parseInt(qId) };
                if (ans.type === 'rating') return [{ ...base, answer_numeric: ans.value }];
                if (ans.type === 'text') return [{ ...base, answer_text: ans.value }];
                if (ans.type === 'multiple' && Array.isArray(ans.value)) {
                    return ans.value.map(optId => ({ ...base, option_id: optId }));
                }
                return [{ ...base, option_id: ans.value }];
            });
            const endpoint = isPersonnelForm
                ? `/api/personnel-forms/${form.uuid || form.id}/responses`
                : `/api/forms/${form.uuid || form.id}/responses`;
            await axios.post(endpoint, {
                respondent_id: deviceId,
                answers: answersPayload
            });
            setStage('submitted');
        } catch (err) {
            submittedRef.current = false;
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    }, [submitting, isPersonnelForm, form, deviceId]);

    const handleAnswer = (questionId, value, type) => {
        setAnswers(prev => {
            const updated = { ...prev, [questionId]: { value, type } };
            // Auto-submit when all required questions are answered
            if (allRequiredAnswered(updated)) {
                // Use setTimeout to let state update render first
                setTimeout(() => doSubmit(updated), 300);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submittedRef.current || submitting) return;

        const questions = getAllQuestions();
        const required = questions.filter(q => {
            if (!q.is_required) return false;
            const ans = answers[q.id];
            if (ans === undefined) return true;
            if (q.type === 'multiple_choice' && Array.isArray(ans.value) && ans.value.length === 0) return true;
            if ((q.type === 'text' || q.type === 'short_text') && typeof ans.value === 'string' && !ans.value.trim()) return true;
            return false;
        });
        if (required.length > 0) { alert(`กรุณาตอบคำถามที่จำเป็น (${required.length} ข้อ)`); return; }

        await doSubmit(answers);
    };

    // ── Loading ──
    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
            <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        </div>
    );

    // ── Error ──
    if (error) return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
            <div className="text-center px-8">
                <XCircle className="w-16 h-16 lg:w-24 lg:h-24 text-red-400 mx-auto mb-4" />
                <p className="text-white text-lg lg:text-2xl xl:text-3xl">{error}</p>
            </div>
        </div>
    );

    // ── Closed ──
    if (!device || device.status === 'closed') return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
            <div className="text-center px-8">
                <div className="w-20 h-20 lg:w-28 lg:h-28 mx-auto mb-5 rounded-full bg-white/10 flex items-center justify-center text-4xl lg:text-6xl">🔒</div>
                <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">ยังไม่เปิดรับการประเมิน</h1>
                <p className="text-teal-300 text-sm lg:text-lg xl:text-xl">กรุณารอสักครู่...</p>
                <div className="mt-5 flex justify-center gap-1.5">
                    {[0, 150, 300].map(d => (
                        <span key={d} className="w-2.5 h-2.5 rounded-full bg-teal-400/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Submitted ──
    if (stage === 'submitted') return <SubmittedScreen onDone={() => { setAnswers({}); submittedRef.current = false; setStage('landing'); }} />;

    // ── Landing Card (full screen) ──
    if (stage === 'landing') {
        const photoSrc = imgUrl(device.personnel_photo_url || device.photo_url);
        const logoSrc = imgUrl(org?.logo_url);
        return (
            <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#f0f8ff' }}>

                {/* ── Vector decoration: concentric arcs from top-right corner ── */}
                <div className="absolute top-0 right-0 overflow-hidden pointer-events-none" style={{ width: '65%', height: '65%', zIndex: 1 }}>
                    <svg width="100%" height="100%" viewBox="0 0 260 400" fill="none" preserveAspectRatio="xMaxYMin slice" style={{ position: 'absolute', top: 0, right: 0 }}>
                        {[50, 100, 150, 200, 250, 300, 350, 400, 450].map((r, i) => (
                            <circle key={i} cx="260" cy="0" r={r} stroke={`rgba(125,190,230,${(0.22 - i * 0.02).toFixed(2)})`} strokeWidth="1.2" fill="none" />
                        ))}
                    </svg>
                </div>

                {/* ── Main section (flex-1) ── */}
                <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">

                    {/* ── Row 1: Logo + Org name (full width) ── */}
                    <div className="relative z-10 flex items-center gap-4 md:gap-6 px-5 md:px-10 pt-5 md:pt-8 pb-4 md:pb-6 bg-white/70 backdrop-blur-sm border-b border-neutral-200">
                        {logoSrc ? (
                            <img src={logoSrc} alt="logo" className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-2 border-neutral-200 shrink-0" />
                        ) : (
                            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                                <span className="text-sky-600 text-2xl md:text-4xl font-bold">{org?.org_name?.[0] || 'O'}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            {(org?.org_name || '').split('\n').map((line, i) => (
                                <p key={i} className="text-neutral-800 text-lg md:text-2xl font-semibold leading-snug">{line}</p>
                            ))}
                        </div>
                    </div>

                    {/* ── Row 2: 2 columns ── */}
                    <div className="relative z-10 flex flex-1 min-h-0 px-5 md:px-6 pb-4 md:pb-8 gap-4 md:gap-8 items-start pt-5 md:pt-8 justify-center max-w-2xl md:max-w-[98%] mx-auto w-full">

                        {/* Col 1: Name / Position / Contact */}
                        <div className="flex flex-col flex-1 min-w-0 gap-3 md:gap-6 pt-4 md:pt-16">
                            <div>
                                <h1 className="text-neutral-900 font-bold text-2xl md:text-5xl leading-tight">
                                    {(() => {
                                        const full = device.personnel_name || 'เจ้าหน้าที่';
                                        const parts = full.trim().split(/\s+/);
                                        if (parts.length >= 2) {
                                            return (
                                                <>
                                                    <span className="block">{parts[0]}</span>
                                                    <span className="block">{parts.slice(1).join(' ')}</span>
                                                </>
                                            );
                                        }
                                        return full;
                                    })()}
                                </h1>
                                <div className="mt-2 md:mt-4 h-1 md:h-1.5 w-16 md:w-24 rounded-full" style={{ background: 'linear-gradient(135deg, #0d9e8a, #38bdf8)' }} />
                            </div>
                            {device.personnel_position && (
                                <p className="text-sky-600 text-base md:text-3xl font-medium">
                                    {device.personnel_position}
                                </p>
                            )}
                            {org?.phone && (
                                <div className="flex items-center gap-3 md:gap-5 mt-2 md:mt-6">
                                    <div className="w-11 h-11 md:w-16 md:h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                                        <Phone className="w-5 h-5 md:w-8 md:h-8 text-teal-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-neutral-400 text-xs md:text-lg leading-none whitespace-nowrap">Call to find out more</p>
                                        <p className="text-neutral-800 text-lg md:text-3xl font-bold mt-1 whitespace-nowrap">โทร. {org.phone}</p>
                                    </div>
                                </div>
                            )}
                            {org?.line_id && (
                                <div className="mt-2 md:mt-4">
                                    <span className="inline-flex items-center gap-2 md:gap-4 px-5 md:px-8 py-2.5 md:py-4 rounded-full bg-neutral-900 text-white text-base md:text-3xl font-semibold">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-8 md:h-8 fill-[#06C755]">
                                            <path d="M19.952 12.404c0-3.875-3.885-7.031-8.664-7.031S2.624 8.529 2.624 12.404c0 3.475 3.082 6.389 7.241 6.943.282.06.665.186.762.427.087.22.057.566.028.788l-.123.743c-.038.22-.174.859.752.468.926-.391 4.994-2.942 6.815-5.037 1.258-1.38 1.853-2.78 1.853-4.332z" />
                                        </svg>
                                        Line : {org.line_id}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Col 2: Title text + Photo */}
                        <div className="flex flex-col items-center shrink-0 w-[55%] md:w-[58%] gap-3 md:gap-5">
                            <p className="font-black text-center text-xl md:text-4xl leading-snug" style={{ background: 'linear-gradient(135deg, #0d9e8a, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                แบบประเมิน ความพึงพอใจ
                            </p>
                            <div className="w-full rounded-2xl p-2 md:p-3 border border-neutral-100 shadow-xl md:shadow-2xl shadow-sky-200/40 md:shadow-sky-300/40" style={{ background: 'linear-gradient(135deg, #e0f7fa 0%, #e3f2fd 100%)' }}>
                                {photoSrc ? (
                                    <img
                                        src={photoSrc}
                                        alt={device.personnel_name}
                                        className="w-full rounded-xl object-cover object-top"
                                        style={{ aspectRatio: '3/4' }}
                                    />
                                ) : (
                                    <div
                                        className="w-full rounded-xl bg-teal-50 flex items-center justify-center"
                                        style={{ aspectRatio: '3/4' }}
                                    >
                                        <span className="text-teal-200 text-7xl md:text-9xl font-bold select-none">
                                            {device.personnel_name?.[0] || '?'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CTA ── */}
                <div
                    className="relative px-6 md:px-12 py-10 md:py-28 flex flex-col items-center gap-3 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0b1e3b 0%, #0f2a4a 45%, #164e63 100%)' }}
                >
                    {/* subtle top highlight */}
                    <span
                        className="pointer-events-none absolute inset-x-0 top-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.6), transparent)' }}
                    />
                    {/* floating glows */}
                    <span
                        className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full opacity-40"
                        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), transparent 65%)' }}
                    />
                    <span
                        className="pointer-events-none absolute -bottom-24 -right-16 w-96 h-96 rounded-full opacity-40"
                        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3), transparent 65%)' }}
                    />

                    {!form ? (
                        <p className="text-amber-200 text-center relative">ยังไม่ได้กำหนดแบบฟอร์มประเมิน</p>
                    ) : (
                        <button
                            onClick={() => setStage('form')}
                            className="group relative w-full rounded-2xl md:rounded-3xl p-[3px] md:p-[5px] active:scale-[0.98] transition-all shadow-xl md:shadow-2xl shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50"
                            style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 50%, #d946ef 100%)' }}
                        >
                            <div
                                className="relative w-full flex items-center justify-center gap-3 md:gap-6 py-5 md:py-10 rounded-[14px] md:rounded-[20px] text-white font-bold text-xl md:text-5xl overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #0b1120 0%, #111827 55%, #1e1b4b 100%)' }}
                            >
                                {/* sheen sweep */}
                                <span
                                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-700"
                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
                                />
                                <Star className="w-6 h-6 md:w-12 md:h-12 fill-amber-300 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
                                <span className="relative">ให้คะแนน</span>
                                <ChevronRight className="w-6 h-6 md:w-12 md:h-12 text-fuchsia-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── Survey Form (full screen scroll) ──
    const questions = getAllQuestions();
    const photoSrc = imgUrl(device.personnel_photo_url || device.photo_url);

    if (questions.length === 0) {
        return (
            <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0b1e3b 0%, #0f2a4a 50%, #1e1b4b 100%)' }}>
                <div className="text-center px-8">
                    <p className="text-white text-lg">ยังไม่มีคำถามในแบบประเมินนี้</p>
                    <button onClick={() => setStage('landing')} className="mt-4 text-cyan-300 underline">กลับหน้าหลัก</button>
                </div>
            </div>
        );
    }

    const answeredCount = questions.filter(q => {
        const v = answers[q.id]?.value;
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return v.trim().length > 0;
        return true;
    }).length;
    const progressPct = questions.length ? (answeredCount / questions.length) * 100 : 0;

    return (
        <div
            className="min-h-screen w-screen relative"
            style={{ background: 'linear-gradient(180deg, #0b1e3b 0%, #0f2a4a 50%, #1e1b4b 100%)' }}
        >
            {/* decorative glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)' }} />
                <div className="absolute top-1/3 -left-48 w-[520px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)' }} />
                <div className="absolute -bottom-40 -right-20 w-[460px] h-[460px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.15), transparent 70%)' }} />
            </div>

            {/* Sticky mini header */}
            <div className="sticky top-0 z-20 shadow-2xl shadow-indigo-950/50">
                <div
                    className="px-5 md:px-10 py-3 md:py-5 flex items-center gap-4 md:gap-6 border-b border-white/10"
                    style={{ background: 'linear-gradient(135deg, #0b1e3b 0%, #1e1b4b 100%)' }}
                >
                    {photoSrc ? (
                        <img src={photoSrc} alt="" className="w-12 h-12 md:w-20 md:h-20 rounded-full object-cover border-2 border-white/30 shrink-0 ring-2 ring-cyan-400/40" />
                    ) : (
                        <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg md:text-3xl shrink-0 ring-2 ring-cyan-400/40">
                            {device.personnel_name?.[0]}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate text-base md:text-2xl">{device.personnel_name}</p>
                        {device.personnel_position && (
                            <p className="text-cyan-200/80 text-xs md:text-lg">{device.personnel_position}</p>
                        )}
                    </div>
                    <div className="hidden md:flex shrink-0 gap-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 md:w-7 md:h-7 text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]" />)}
                    </div>
                </div>
                {/* Progress bar */}
                <div className="bg-black/40 h-1.5 md:h-2 relative overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progressPct}%`,
                            background: 'linear-gradient(90deg, #22d3ee 0%, #6366f1 50%, #d946ef 100%)',
                            boxShadow: '0 0 16px rgba(99,102,241,0.7)',
                        }}
                    />
                </div>
                <div className="bg-black/50 backdrop-blur-sm px-5 md:px-10 py-1.5 md:py-2 flex items-center justify-between text-[11px] md:text-sm border-b border-white/5">
                    <span className="text-cyan-200/70">ความคืบหน้า</span>
                    <span className="text-white font-semibold">{answeredCount} / {questions.length}</span>
                </div>
            </div>

            {/* Form description */}
            {form.description && (
                <div className="relative z-10 px-5 md:px-10 py-3 md:py-5 max-w-[98%] mx-auto">
                    <p className="text-white/60 text-sm md:text-xl italic">{form.description}</p>
                </div>
            )}

            {/* Questions */}
            <form onSubmit={handleSubmit} className="relative z-10 max-w-[98%] mx-auto px-5 md:px-6 pb-8 md:pb-12 space-y-3 md:space-y-6">
                {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    return (
                        <div
                            key={q.id}
                            className={`relative rounded-2xl md:rounded-3xl p-5 md:p-8 transition-colors shadow-xl shadow-indigo-950/30 ${idx === 0 ? 'mt-[6%] md:mt-[4%]' : ''}`}
                            style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.55) 0%, rgba(15,42,74,0.55) 100%)', backdropFilter: 'blur(8px)' }}
                        >
                            <div className="mb-6 md:mb-10 text-center">
                                <p className="text-white font-bold text-2xl md:text-4xl leading-snug">
                                    {q.text}{q.is_required && <span className="text-rose-300 ml-1">*</span>}
                                </p>
                            </div>

                            {q.type === 'rating' && (
                                <div className="flex flex-row gap-3 md:gap-6 justify-center items-stretch">
                                    {SATISFACTION_LEVELS.map(level => {
                                        const sel = ans?.value === level.value;
                                        return (
                                            <button key={level.value} type="button"
                                                onClick={() => handleAnswer(q.id, level.value, 'rating')}
                                                className={`relative flex-1 max-w-[220px] flex flex-col items-center gap-3 md:gap-5 py-8 md:py-14 px-2 md:px-4 rounded-2xl md:rounded-3xl border-2 transition-all font-medium ${sel ? `${level.bg} ${level.border} ${level.text} ring-4 ${level.ring}/60 scale-110 shadow-2xl z-10` : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white'}`}
                                            >
                                                {sel && (
                                                    <span
                                                        className="absolute -top-2 md:-top-3 -right-2 md:-right-3 w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/40"
                                                        style={{ background: 'linear-gradient(135deg, #22d3ee, #6366f1, #d946ef)' }}
                                                    >
                                                        <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-white" />
                                                    </span>
                                                )}
                                                <span className={`text-6xl md:text-[7rem] leading-none transition-transform ${sel ? 'scale-110' : ''}`}>{level.emoji}</span>
                                                <span className="text-lg md:text-3xl font-bold">{level.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                <div className="space-y-2 md:space-y-3 pl-10 md:pl-16">
                                    {q.options?.map(opt => {
                                        const checked = q.type === 'multiple_choice' ? (ans?.value || []).includes(opt.id) : ans?.value === opt.id;
                                        return (
                                            <label key={opt.id} className={`flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-white/5 border-white/10 hover:border-cyan-300/50 hover:bg-white/10'}`}>
                                                <input
                                                    type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                                    name={`q-${q.id}`}
                                                    value={opt.id}
                                                    checked={checked}
                                                    onChange={() => {
                                                        if (q.type === 'multiple_choice') {
                                                            const prev = ans?.value || [];
                                                            handleAnswer(q.id, prev.includes(opt.id) ? prev.filter(v => v !== opt.id) : [...prev, opt.id], 'multiple');
                                                        } else {
                                                            handleAnswer(q.id, opt.id, 'option');
                                                        }
                                                    }}
                                                    className="accent-cyan-400 w-4 h-4 md:w-6 md:h-6"
                                                />
                                                <span className={`text-sm md:text-xl ${checked ? 'text-white font-semibold' : 'text-white/80'}`}>{opt.text}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {(q.type === 'text' || q.type === 'short_text') && (
                                <div className="pl-10 md:pl-16">
                                    <textarea rows={3} value={ans?.value || ''}
                                        onChange={e => handleAnswer(q.id, e.target.value, 'text')}
                                        placeholder="พิมพ์คำตอบของคุณ..."
                                        className="w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm md:text-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none resize-none transition"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

            </form>
        </div>
    );
}

function SubmittedScreen({ onDone }) {
    const TOTAL = 5;
    const [remaining, setRemaining] = useState(TOTAL);
    useEffect(() => {
        const tick = setInterval(() => {
            setRemaining(r => (r > 1 ? r - 1 : r));
        }, 1000);
        const t = setTimeout(onDone, TOTAL * 1000);
        return () => { clearTimeout(t); clearInterval(tick); };
    }, [onDone]);

    return (
        <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f2a4a 50%, #0b1e3b 100%)' }}>
            {/* Floating decorative orbs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/4 -left-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }} />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
                <div className="absolute bottom-1/4 -right-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, #d946ef, transparent 70%)' }} />
            </div>

            <div className="relative text-center px-8 max-w-xl">
                {/* Check icon with pulse rings */}
                <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-8">
                    <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
                    <span className="absolute inset-2 rounded-full bg-fuchsia-400/20 animate-pulse" />
                    <div
                        className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl shadow-fuchsia-500/40"
                        style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 50%, #d946ef 100%)' }}
                    >
                        <CheckCircle className="w-16 h-16 md:w-24 md:h-24 text-white drop-shadow-lg" strokeWidth={2.5} />
                    </div>
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold mb-4 md:mb-6"
                    style={{ background: 'linear-gradient(135deg, #67e8f9 0%, #a5b4fc 50%, #f0abfc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    ขอบคุณสำหรับการประเมิน!
                </h1>
                <p className="text-white/80 text-lg md:text-2xl leading-relaxed mb-8 md:mb-10">
                    ข้อมูลของคุณถูกบันทึกแล้ว<br />
                    <span className="text-cyan-200">ขอบคุณที่ช่วยพัฒนาการบริการของเรา</span>
                </p>

                {/* Countdown */}
                <div className="inline-flex items-center gap-3 md:gap-4 px-5 md:px-7 py-3 md:py-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="relative flex w-3 h-3 md:w-4 md:h-4">
                        <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75" />
                        <span className="relative rounded-full bg-cyan-400 w-full h-full" />
                    </span>
                    <span className="text-white/70 text-sm md:text-lg">
                        กลับสู่หน้าหลักใน <span className="text-white font-bold text-base md:text-xl">{remaining}</span> วินาที
                    </span>
                </div>
            </div>
        </div>
    );
}
