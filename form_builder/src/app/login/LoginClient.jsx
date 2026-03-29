'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, User, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginClient({ systemName = 'Form Builder' }) {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
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
                setError(res.error);
            } else {
                router.push('/admin/dashboard');
                router.refresh();
            }
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-[#09090b] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#21304A]/20 blur-3xl opacity-50 dark:opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#21304A]/20 blur-3xl opacity-50 dark:opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-neutral-800/50 overflow-hidden">
                    <div className="p-8 sm:p-10 space-y-8">

                        {/* Header */}
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#21304A] shadow-lg shadow-[#21304A]/30 mb-4">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                                {systemName}
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                                Sign in to access the Admin Panel
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#21304A] transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            maxLength={100}
                                            autoComplete="username"
                                            className="block w-full pl-11 pr-4 py-3.5 bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#21304A] focus:border-transparent transition-all sm:text-sm"
                                            placeholder="Enter your username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#21304A] transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            maxLength={128}
                                            autoComplete="current-password"
                                            className="block w-full pl-11 pr-4 py-3.5 bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#21304A] focus:border-transparent transition-all sm:text-sm"
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent text-white font-semibold tracking-wide bg-[#21304A] hover:bg-[#2d4060] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#21304A] shadow-lg shadow-[#21304A]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <LogIn className="w-5 h-5 ml-1 opacity-70" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
