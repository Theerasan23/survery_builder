import Link from 'next/link';
import { Bell, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession, signOut } from 'next-auth/react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export default function Navbar({ title }) {
    useIdleTimeout();
    const { data: session } = useSession();

    return (
        <header className="flex items-center justify-between px-8 py-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center">
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-gray-100">{title || 'แผงควบคุม'}</h2>
            </div>

            <div className="flex items-center gap-4">
                <ThemeToggle />
                <button className="relative p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-neutral-900"></span>
                </button>

                <Link href="/admin/profile" className="flex items-center gap-3 pl-4 border-l border-neutral-200 dark:border-neutral-800 hover:opacity-80 transition-opacity" title="แก้ไขโปรไฟล์">
                    <div className="w-9 h-9 rounded-full bg-[#21304A] flex items-center justify-center text-white shadow-lg">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            {session?.user?.name || 'Loading...'}
                        </p>
                        <p className="text-xs text-neutral-500">
                            {session?.user?.position || (session?.user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่')}
                        </p>
                    </div>
                </Link>

                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="ml-2 p-2 text-neutral-400 hover:text-red-500 bg-neutral-50 hover:bg-red-50 dark:bg-neutral-800/50 dark:hover:bg-red-500/10 transition-all border border-neutral-200 dark:border-neutral-800 hover:border-red-200 dark:hover:border-red-500/30"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
