'use client';

import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default function AdminLayout({ children }) {
    return (
        <div className="flex h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 font-sans overflow-hidden">
            <Sidebar />

            <div className="flex flex-1 flex-col min-w-0 w-full">
                <Navbar />

                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-50 dark:bg-[#09090b]">
                    {children}
                </main>
            </div>
        </div>
    );
}
