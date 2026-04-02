'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, Phone, Star, ChevronRight } from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

const SATISFACTION_LEVELS = [
    { value: 5, label: 'ดีเยี่ยม', emoji: '😄', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-300 dark:border-emerald-600', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { value: 4, label: 'ดี',        emoji: '🙂', color: 'blue',    bg: 'bg-blue-50 dark:bg-blue-500/10',       border: 'border-blue-300 dark:border-blue-600',       text: 'text-blue-700 dark:text-blue-400',       ring: 'ring-blue-400' },
    { value: 3, label: 'ปานกลาง',  emoji: '😐', color: 'amber',   bg: 'bg-amber-50 dark:bg-amber-500/10',     border: 'border-amber-300 dark:border-amber-600',     text: 'text-amber-700 dark:text-amber-400',     ring: 'ring-amber-400' },
    { value: 2, label: 'น้อย',     emoji: '😕', color: 'orange',  bg: 'bg-orange-50 dark:bg-orange-500/10',   border: 'border-orange-300 dark:border-orange-600',   text: 'text-orange-700 dark:text-orange-400',   ring: 'ring-orange-400' },
    { value: 1, label: 'น้อยมาก', emoji: '😞', color: 'red',     bg: 'bg-red-50 dark:bg-red-500/10',         border: 'border-red-300 dark:border-red-600',         text: 'text-red-700 dark:text-red-400',         ring: 'ring-red-400' },
];

function imgUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) {
        return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/');
    }
    return url.replace(/^\/uploads\//, '/api/uploads/');
}

export default function PersonalFormClient({ deviceId }) {
    const [device, setDevice]       = useState(null);
    const [org, setOrg]             = useState(null);
    const [form, setForm]           = useState(null);
    const [isPersonnelForm, setIsPersonnelForm] = useState(false);
    const [loading, setLoading]     = useState(true);
    const [stage, setStage]     = useState('landing'); // 'landing' | 'form' | 'submitted'
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]     = useState(null);
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
                axios.patch(`/api/devices/${deviceId}/ping`).catch(() => {});
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
                    axios.patch(`/api/devices/${deviceId}/ping`).catch(() => {});
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
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-white text-lg">{error}</p>
            </div>
        </div>
    );

    // ── Closed ──
    if (!device || device.status === 'closed') return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
            <div className="text-center px-8">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-white/10 flex items-center justify-center text-4xl">🔒</div>
                <h1 className="text-2xl font-bold text-white mb-2">ยังไม่เปิดรับการประเมิน</h1>
                <p className="text-teal-300 text-sm">กรุณารอสักครู่...</p>
                <div className="mt-5 flex justify-center gap-1.5">
                    {[0,150,300].map(d => (
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
        const logoSrc  = imgUrl(org?.logo_url);
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
                    <div className="relative z-10 flex items-center gap-3 md:gap-5 px-5 md:px-10 pt-5 md:pt-8 pb-4 md:pb-6 bg-white/70 backdrop-blur-sm border-b border-neutral-200">
                        {logoSrc ? (
                            <img src={logoSrc} alt="logo" className="w-20 h-20 md:w-36 md:h-36 rounded-full object-cover border-2 border-neutral-200 shrink-0" />
                        ) : (
                            <div className="w-20 h-20 md:w-36 md:h-36 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                                <span className="text-sky-600 text-2xl md:text-3xl font-bold">{org?.org_name?.[0] || 'O'}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            {(org?.org_name || '').split('\n').map((line, i) => (
                                <p key={i} className="text-neutral-800 text-xl md:text-3xl font-semibold leading-snug">{line}</p>
                            ))}
                        </div>
                    </div>

                    {/* ── Row 2: 2 columns ── */}
                    <div className="relative z-10 flex flex-1 min-h-0 px-5 md:px-12 pb-4 md:pb-8 gap-4 md:gap-10 items-start pt-5 md:pt-10 justify-center max-w-2xl mx-auto w-full">

                        {/* Col 1: Name / Position / Contact */}
                        <div className="flex flex-col flex-1 min-w-0 gap-3 md:gap-5">
                            <h1 className="text-neutral-900 font-bold text-2xl md:text-4xl leading-tight">
                                {device.personnel_name || 'เจ้าหน้าที่'}
                            </h1>
                            {device.personnel_position && (
                                <span className="inline-block self-start bg-teal-600 text-white text-sm md:text-lg font-medium px-4 md:px-5 py-1.5 md:py-2 rounded-full">
                                    {device.personnel_position}
                                </span>
                            )}
                            {org?.phone && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                                        <Phone className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-neutral-400 text-xs md:text-sm leading-none">Call to find out more</p>
                                        <p className="text-neutral-800 text-base md:text-xl font-semibold mt-1">โทร. {org.phone}</p>
                                    </div>
                                </div>
                            )}
                            {org?.line_id && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 fill-[#06C755]">
                                            <path d="M19.952 12.404c0-3.875-3.885-7.031-8.664-7.031S2.624 8.529 2.624 12.404c0 3.475 3.082 6.389 7.241 6.943.282.06.665.186.762.427.087.22.057.566.028.788l-.123.743c-.038.22-.174.859.752.468.926-.391 4.994-2.942 6.815-5.037 1.258-1.38 1.853-2.78 1.853-4.332z"/>
                                        </svg>
                                    </div>
                                    <span className="inline-block px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-[#06C755] text-white text-base md:text-xl font-semibold">
                                        {org.line_id}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Col 2: Title text + Photo */}
                        <div className="flex flex-col items-center shrink-0 w-[44%] md:w-[38%] max-w-[200px] md:max-w-[300px] gap-2">
                            <div className="flex flex-col items-center gap-0.5">
                                <p className="font-black text-center text-lg md:text-2xl leading-snug whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #0d9e8a, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    แบบประเมิน
                                </p>
                                <p className="font-black text-center text-lg md:text-2xl leading-snug whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #0d9e8a, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    ความพึงพอใจ
                                </p>
                            </div>
                            <div className="w-full rounded-2xl bg-white p-2 border border-neutral-100">
                                {photoSrc ? (
                                    <img
                                        src={photoSrc}
                                        alt={device.personnel_name}
                                        className="w-full rounded-xl object-cover object-top"
                                        style={{ aspectRatio: '3/4', maxHeight: '374px' }}
                                    />
                                ) : (
                                    <div
                                        className="w-full rounded-xl bg-teal-50 flex items-center justify-center"
                                        style={{ aspectRatio: '3/4', maxHeight: '374px' }}
                                    >
                                        <span className="text-teal-200 text-7xl font-bold select-none">
                                            {device.personnel_name?.[0] || '?'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CTA ── */}
                <div className="bg-neutral-800 px-6 py-12 md:py-20 flex flex-col items-center gap-3">
                    {!form ? (
                        <p className="text-amber-400 text-center">ยังไม่ได้กำหนดแบบฟอร์มประเมิน</p>
                    ) : (
                        <button
                            onClick={() => setStage('form')}
                            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-cyan-400 text-cyan-300 font-bold text-xl hover:bg-cyan-400/10 active:scale-[0.98] transition-all"
                        >
                            <Star className="w-6 h-6 fill-cyan-300" />
                            ให้คะแนน
                            <ChevronRight className="w-6 h-6" />
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
            <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
                <div className="text-center px-8">
                    <p className="text-white text-lg">ยังไม่มีคำถามในแบบประเมินนี้</p>
                    <button onClick={() => setStage('landing')} className="mt-4 text-teal-400 underline">กลับหน้าหลัก</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-[#0d2d2a]">
            {/* Sticky mini header */}
            <div className="sticky top-0 z-20 bg-gradient-to-r from-[#1a5c55] to-[#0d9e8a] px-5 py-3 flex items-center gap-4 shadow-lg">
                {photoSrc ? (
                    <img src={photoSrc} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shrink-0" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {device.personnel_name?.[0]}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{device.personnel_name}</p>
                    {device.personnel_position && (
                        <p className="text-teal-200 text-xs">{device.personnel_position}</p>
                    )}
                </div>
                <div className="flex shrink-0">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-300 fill-yellow-300" />)}
                </div>
            </div>

            {/* Form description */}
            {form.description && (
                <div className="px-5 py-3">
                    <p className="text-white/50 text-sm">{form.description}</p>
                </div>
            )}

            {/* Questions */}
            <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-3">
                {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    return (
                        <div key={q.id} className={`rounded-2xl p-5 ${idx === 0 ? 'mt-[10%]' : ''}`} style={{ backgroundColor: '#0d2d2a' }}>
                            <div className="mb-8">
                                <p className="text-white font-bold text-2xl md:text-3xl leading-relaxed">
                                    {q.text}{q.is_required && <span className="text-red-400 ml-1">*</span>}
                                </p>
                            </div>

                            {q.type === 'rating' && (
                                <div className="flex flex-row gap-3">
                                    {SATISFACTION_LEVELS.map(level => {
                                        const sel = ans?.value === level.value;
                                        return (
                                            <button key={level.value} type="button"
                                                onClick={() => handleAnswer(q.id, level.value, 'rating')}
                                                className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-xl border-2 transition-all font-medium ${sel ? `${level.bg} ${level.border} ${level.text} ring-2 ${level.ring} ring-offset-1 scale-105` : 'border-white/10 hover:border-white/20 bg-white/5 text-white'}`}
                                            >
                                                <span className="text-5xl md:text-6xl">{level.emoji}</span>
                                                <span className="text-base md:text-lg font-bold">{level.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                <div className="space-y-2 pl-10">
                                    {q.options?.map(opt => (
                                        <label key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all">
                                            <input
                                                type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                                name={`q-${q.id}`}
                                                value={opt.id}
                                                checked={q.type === 'multiple_choice' ? (ans?.value || []).includes(opt.id) : ans?.value === opt.id}
                                                onChange={() => {
                                                    if (q.type === 'multiple_choice') {
                                                        const prev = ans?.value || [];
                                                        handleAnswer(q.id, prev.includes(opt.id) ? prev.filter(v => v !== opt.id) : [...prev, opt.id], 'multiple');
                                                    } else {
                                                        handleAnswer(q.id, opt.id, 'option');
                                                    }
                                                }}
                                                className="accent-teal-500 w-4 h-4"
                                            />
                                            <span className="text-sm text-neutral-700">{opt.text}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {(q.type === 'text' || q.type === 'short_text') && (
                                <div className="pl-10">
                                    <textarea rows={3} value={ans?.value || ''}
                                        onChange={e => handleAnswer(q.id, e.target.value, 'text')}
                                        placeholder="พิมพ์คำตอบของคุณ..."
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none transition"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                <button type="submit" disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl border-2 border-cyan-400 text-cyan-300 font-bold text-xl hover:bg-cyan-400/10 disabled:opacity-60 active:scale-[0.98] transition-all mt-8"
                >
                    {submitting
                        ? <><Loader2 className="w-6 h-6 animate-spin" /> กำลังส่ง...</>
                        : <><CheckCircle className="w-6 h-6" /> ส่งแบบประเมิน</>
                    }
                </button>

            </form>
        </div>
    );
}

function SubmittedScreen({ onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d2d2a]">
            <div className="text-center px-8">
                <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-teal-500/20 flex items-center justify-center animate-bounce">
                    <CheckCircle className="w-16 h-16 text-teal-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">ขอบคุณสำหรับการประเมิน!</h1>
                <p className="text-teal-300">ข้อมูลของคุณถูกบันทึกแล้ว<br />ขอบคุณที่ช่วยพัฒนาการบริการของเรา</p>
            </div>
        </div>
    );
}
