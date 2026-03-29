'use client';

import { useState, useEffect } from 'react';
import { fetchForms as fetchFormsAction } from '@/app/admin/dashboard/actions';
import { BarChart, Search, Eye } from 'lucide-react';
import ExportButton from '@/components/admin/ExportButton';
import Link from 'next/link';

const POLL_INTERVAL = 30000;

export default function DashboardFormsTable({ initialForms }) {
    const [forms, setForms] = useState(initialForms);
    const [searchTerm, setSearchTerm] = useState('');

    // Polling for updates (WAF-safe, uses Server Action)
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await fetchFormsAction();
                if (data) setForms(data);
            } catch {}
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const filteredForms = forms.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                    <BarChart className="w-5 h-5 text-[#21304A]" />
                    Forms Performance Overview
                </h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                        type="text" 
                        placeholder="Search forms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full sm:w-64 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition-all dark:text-white"
                    />
                </div>
            </div>
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr>
                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                                Form Title
                            </th>
                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32 text-center">
                                Status
                            </th>
                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32 text-center">
                                Responses
                            </th>
                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32 text-center">
                                Avg. Score
                            </th>
                            <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-48 text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredForms.length > 0 ? (
                            filteredForms.map(form => (
                                <tr key={form.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0 group">
                                    <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                        {form.title}
                                        {form.description && (
                                            <p className="text-xs text-neutral-500 truncate mt-1 max-w-[300px]">{form.description}</p>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${form.is_active
                                            ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
                                            }`}>
                                            {form.is_active ? 'Active' : 'Draft/Closed'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-[#eef1f5] text-[#21304A] dark:bg-[#21304A]/10 dark:text-[#a1afc5] transition-transform group-hover:scale-110">
                                            {form.response_count || 0}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 block mt-1">
                                            {form.average_score ? Number(form.average_score).toFixed(2) + ' / 5' : '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/dashboard/forms/${form.id}/analytics`}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                                title="View Detailed Analytics"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <ExportButton formId={form.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-neutral-500 text-sm">
                                    No forms match your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
