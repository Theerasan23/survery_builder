'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
                {/* Icon Circle */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white dark:bg-neutral-900 shadow-xl border border-neutral-100 dark:border-neutral-800 mb-8 relative">
                    <Search className="w-10 h-10 text-[#21304A] dark:text-neutral-400" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-4 ring-neutral-50 dark:ring-neutral-950">
                        404
                    </div>
                </div>

                <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4">
                    ไม่พบหน้านี้
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-10 leading-relaxed">
                    ขออภัย เราไม่พบหน้าที่คุณกำลังตามหา กรุณาตรวจสอบลิงก์อีกครั้งหรือกลับไปยังหน้าหลัก
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-[#21304A] hover:bg-[#2d4060] text-white font-bold rounded-none shadow-lg shadow-[#21304A]/20 transition-all active:scale-95"
                    >
                        <Home className="w-4 h-4" />
                        กลับหน้าหลัก
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-none transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ย้อนกลับ
                    </button>
                </div>

                <div className="mt-16 text-neutral-400 dark:text-neutral-600 text-xs uppercase tracking-[0.2em]">
                    System Administration &middot; Survey Form
                </div>
            </div>
        </div>
    );
}
