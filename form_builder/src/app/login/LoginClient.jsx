'use client';

import { useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, MotionConfig } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, ShieldCheck, Phone, MessageCircle } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1];

const inputClass =
    'block w-full h-12 pl-11 bg-white dark:bg-white/[0.03] border border-neutral-300 dark:border-white/10 ' +
    'text-[15px] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ' +
    'outline-none transition-[border-color,box-shadow] duration-200 hover:border-neutral-400 dark:hover:border-white/20 ' +
    'focus:border-[#21304A] focus:ring-4 focus:ring-[#21304A]/10 dark:focus:border-[#7d95c1] dark:focus:ring-[#7d95c1]/15 ' +
    'aria-[invalid=true]:border-red-400 dark:aria-[invalid=true]:border-red-500/60 disabled:opacity-60';

const iconClass =
    'absolute inset-y-0 left-0 w-11 flex items-center justify-center pointer-events-none text-neutral-400 ' +
    'transition-colors group-focus-within:text-[#21304A] dark:group-focus-within:text-[#9fb2d4]';

function BrandMark({ logoUrl, className = '' }) {
    const [failed, setFailed] = useState(false);

    // A server-rendered <img> can fail before React attaches onError, so also check on attach
    const checkLoaded = (img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
    };

    return (
        <div className={`flex items-center justify-center bg-white shrink-0 ${className}`}>
            {logoUrl && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img ref={checkLoaded} src={logoUrl} alt="" className="w-full h-full object-contain p-1.5" onError={() => setFailed(true)} />
            ) : (
                <ShieldCheck className="w-1/2 h-1/2 text-[#21304A]" />
            )}
        </div>
    );
}

export default function LoginClient({
    systemName = 'Form Builder',
    orgName = '',
    logoUrl = null,
    phone = '',
    lineId = '',
    redirectTo = '/admin/dashboard',
}) {
    const router = useRouter();
    const passwordRef = useRef(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [error, setError] = useState('');
    const [errorKey, setErrorKey] = useState(0);
    const [loading, setLoading] = useState(false);

    // A new key replays the shake even when the same message repeats
    const showError = (message) => {
        setError(message);
        setErrorKey((k) => k + 1);
    };

    const checkCapsLock = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                redirect: false,
                username: trimmedUsername,
                password,
            });

            if (res?.error) {
                showError(res.error === 'CredentialsSignin' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : res.error);
                setPassword('');
                passwordRef.current?.focus();
                setLoading(false);
            } else {
                // Stay in the loading state until the dashboard replaces this page
                router.replace(redirectTo);
                router.refresh();
            }
        } catch {
            showError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            setLoading(false);
        }
    };

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-dvh w-full grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-white dark:bg-[#0b0e14]">

                {/* Brand panel */}
                <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#141e33] text-white p-12 xl:p-16">
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 0% 0%, rgba(77,110,165,0.45), transparent 55%),' +
                                    'radial-gradient(ellipse at 100% 100%, rgba(33,48,74,0.95), transparent 60%)',
                            }}
                        />
                        <div
                            className="absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage:
                                    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                                backgroundSize: '56px 56px',
                                maskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)',
                                WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%)',
                            }}
                        />
                        <div className="absolute -right-44 -bottom-44 w-[560px] h-[560px] rotate-45 border border-white/[0.06]" />
                        <div className="absolute -right-28 -bottom-28 w-[400px] h-[400px] rotate-45 border border-white/[0.08]" />
                        <div className="absolute -right-12 -bottom-12 w-[240px] h-[240px] rotate-45 border border-[#c8a96a]/25" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="relative flex items-center gap-4"
                    >
                        <BrandMark logoUrl={logoUrl} className="w-12 h-12 shadow-lg shadow-black/20" />
                        <span className="text-[11px] font-medium tracking-[0.28em] uppercase text-white/55">Admin Console</span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                        className="relative max-w-lg"
                    >
                        <div className="h-px w-12 bg-[#c8a96a] mb-8" />
                        <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.3] tracking-tight text-balance">
                            {systemName}
                        </h1>
                        {orgName && (
                            <p className="mt-6 text-base leading-relaxed text-white/60 text-pretty">{orgName}</p>
                        )}
                    </motion.div>

                    <div className="relative min-h-6 border-t border-white/10 pt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/55">
                        {phone && (
                            <span className="inline-flex items-center gap-2">
                                <Phone className="w-4 h-4 text-[#c8a96a]" />
                                {phone}
                            </span>
                        )}
                        {lineId && (
                            <span className="inline-flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-[#c8a96a]" />
                                LINE {lineId}
                            </span>
                        )}
                    </div>
                </aside>

                {/* Form panel */}
                <main className="relative flex flex-col min-h-dvh px-6 sm:px-10">
                    <div className="flex-1 flex items-center justify-center py-12">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="w-full max-w-[380px]"
                        >
                            {/* Brand header on small screens, where the brand panel is hidden */}
                            <div className="lg:hidden flex items-center gap-3 mb-10">
                                <BrandMark logoUrl={logoUrl} className="w-11 h-11 border border-neutral-200 dark:border-white/10" />
                                <span className="text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-100">{systemName}</span>
                            </div>

                            <p className="text-sm font-medium text-[#8a6d35] dark:text-[#c8a96a]">
                                ยินดีต้อนรับ
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                                เข้าสู่ระบบ
                            </h2>
                            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                สำหรับผู้ดูแลระบบและเจ้าหน้าที่
                            </p>

                            {error && (
                                <motion.div
                                    key={errorKey}
                                    id="login-error"
                                    role="alert"
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                    className="mt-6 flex items-start gap-3 border-l-2 border-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3"
                                >
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                                <div>
                                    <label htmlFor="username" className="block mb-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                                        ชื่อผู้ใช้
                                    </label>
                                    <div className="relative group">
                                        <span className={iconClass}><User className="w-[18px] h-[18px]" /></span>
                                        <input
                                            id="username"
                                            name="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={loading}
                                            required
                                            autoFocus
                                            maxLength={100}
                                            autoComplete="username"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            aria-invalid={!!error}
                                            aria-describedby={error ? 'login-error' : undefined}
                                            className={`${inputClass} pr-4`}
                                            placeholder="กรอกชื่อผู้ใช้"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block mb-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                                        รหัสผ่าน
                                    </label>
                                    <div className="relative group">
                                        <span className={iconClass}><Lock className="w-[18px] h-[18px]" /></span>
                                        <input
                                            ref={passwordRef}
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={checkCapsLock}
                                            onKeyUp={checkCapsLock}
                                            onBlur={() => setCapsLock(false)}
                                            disabled={loading}
                                            required
                                            maxLength={128}
                                            autoComplete="current-password"
                                            aria-invalid={!!error}
                                            aria-describedby={error ? 'login-error' : undefined}
                                            className={`${inputClass} pr-12`}
                                            placeholder="กรอกรหัสผ่าน"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                            aria-pressed={showPassword}
                                            className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:text-[#21304A] dark:focus-visible:text-[#9fb2d4] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                        </button>
                                    </div>
                                    {capsLock && (
                                        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">Caps Lock เปิดอยู่</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full h-12 mt-6 overflow-hidden bg-[#21304A] text-white text-[15px] font-medium tracking-wide shadow-[0_12px_32px_-14px_rgba(33,48,74,0.75)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#1a2740] hover:shadow-[0_16px_36px_-14px_rgba(33,48,74,0.85)] active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21304A]/25 disabled:cursor-not-allowed disabled:opacity-80 dark:bg-[#2c4068] dark:hover:bg-[#344b78] dark:focus-visible:ring-[#7d95c1]/30"
                                >
                                    <span
                                        aria-hidden
                                        className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[400%] group-disabled:hidden"
                                    />
                                    <span className="relative flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                                                กำลังเข้าสู่ระบบ…
                                            </>
                                        ) : (
                                            <>
                                                เข้าสู่ระบบ
                                                <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>

                            <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
                                ลืมรหัสผ่าน? กรุณาติดต่อผู้ดูแลระบบ
                            </p>
                        </motion.div>
                    </div>

                    <footer className="py-6 flex items-center justify-center lg:justify-start gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        เฉพาะผู้ได้รับอนุญาตเท่านั้น
                    </footer>
                </main>
            </div>
        </MotionConfig>
    );
}
