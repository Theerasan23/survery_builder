'use client';

import { useEffect } from 'react';
import { Save, Trash2, Send, Loader2 } from 'lucide-react';

const VARIANTS = {
    save: {
        icon: Save,
        iconBgClass: 'bg-blue-50 dark:bg-blue-500/10',
        iconColorClass: 'text-blue-600',
        confirmBgClass: 'bg-[#21304A] hover:bg-[#2d4060]',
        title: 'ยืนยันการบันทึก',
        confirmText: 'บันทึก',
    },
    delete: {
        icon: Trash2,
        iconBgClass: 'bg-red-50 dark:bg-red-500/10',
        iconColorClass: 'text-red-500',
        confirmBgClass: 'bg-red-600 hover:bg-red-700',
        title: 'ยืนยันการลบ',
        confirmText: 'ลบ',
    },
    submit: {
        icon: Send,
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        iconColorClass: 'text-emerald-600',
        confirmBgClass: 'bg-emerald-600 hover:bg-emerald-700',
        title: 'ยืนยันการส่ง',
        confirmText: 'ส่ง',
    },
};

export default function ConfirmModal({
    open,
    onConfirm,
    onCancel,
    title,
    message,
    icon: IconProp,
    iconBgClass,
    iconColorClass,
    confirmText,
    cancelText = 'ยกเลิก',
    confirmBgClass,
    loading = false,
    variant,
}) {
    const preset = variant ? VARIANTS[variant] : {};
    const Icon = IconProp || preset.icon || Save;
    const finalTitle = title || preset.title || 'ยืนยัน';
    const finalConfirmText = confirmText || preset.confirmText || 'ยืนยัน';
    const finalIconBg = iconBgClass || preset.iconBgClass || 'bg-blue-50 dark:bg-blue-500/10';
    const finalIconColor = iconColorClass || preset.iconColorClass || 'text-blue-600';
    const finalConfirmBg = confirmBgClass || preset.confirmBgClass || 'bg-[#21304A] hover:bg-[#2d4060]';

    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel?.();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
        >
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${finalIconBg}`}>
                        <Icon className={`w-7 h-7 ${finalIconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{finalTitle}</h3>
                    {message && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
                    )}
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-60"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 px-4 py-2.5 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${finalConfirmBg}`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
