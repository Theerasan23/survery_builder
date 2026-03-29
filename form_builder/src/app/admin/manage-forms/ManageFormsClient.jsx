'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { toggleFormActive, deleteForm, duplicateForm } from '@/lib/actions';
import {
    FileText, Settings, Trash2, Edit, Plus, Eye, Loader2,
    ToggleLeft, ToggleRight, QrCode, Download, X, ChevronDown,
    Tag, Copy, BarChart2, Search, Users, CheckCircle, XCircle
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';

function StatusBadge({ isActive }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
            {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {isActive ? 'เปิดรับ' : 'ปิด'}
        </span>
    );
}

function FormCard({ form, togglingId, deletingId, copyingId, onToggle, onDelete, onQr, onCopy }) {
    return (
        <div className="group relative flex flex-col bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-primary-200 dark:hover:border-primary/30 transition-all duration-200 overflow-hidden">
            {/* Top accent bar */}
            <div className={`h-1 w-full ${form.is_active ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-neutral-200 dark:bg-neutral-700'}`} />

            <div className="p-5 flex flex-col flex-1">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 leading-snug line-clamp-2 flex-1" title={form.title}>
                        {form.title || '(ไม่มีชื่อ)'}
                    </h3>
                    <StatusBadge isActive={form.is_active} />
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                    {form.description || 'ไม่มีคำอธิบาย'}
                </p>

                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-4 mt-auto">
                    <span>{new Date(form.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>

                {/* Action row */}
                <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <Link href={`/form/${form.uuid}`} target="_blank"
                        className="flex flex-col items-center gap-1 py-2 rounded-none bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors text-[10px] font-medium">
                        <Eye className="w-4 h-4" />ดู
                    </Link>
                    <Link href={`/admin/builder/${form.id}`}
                        className="flex flex-col items-center gap-1 py-2 rounded-none bg-primary-50 hover:bg-primary-100 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary-light transition-colors text-[10px] font-medium">
                        <Edit className="w-4 h-4" />แก้ไข
                    </Link>
                    <Link href={`/admin/dashboard/forms/${form.id}/analytics`}
                        className="flex flex-col items-center gap-1 py-2 rounded-none bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 transition-colors text-[10px] font-medium">
                        <BarChart2 className="w-4 h-4" />วิเคราะห์
                    </Link>
                    <button onClick={() => onCopy(form.id)} disabled={copyingId === form.id}
                        className="flex flex-col items-center gap-1 py-2 rounded-none bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 transition-colors text-[10px] font-medium disabled:opacity-50">
                        {copyingId === form.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                        คัดลอก
                    </button>
                </div>

                {/* Secondary row */}
                <div className="flex items-center justify-between mt-2 gap-1.5">
                    <button
                        onClick={() => onToggle(form.id)}
                        disabled={togglingId === form.id}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-none text-xs font-semibold transition-colors disabled:opacity-50 ${form.is_active ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-400'}`}
                    >
                        {togglingId === form.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : form.is_active
                                ? <><ToggleRight className="w-3.5 h-3.5" /> ปิดรับ</>
                                : <><ToggleLeft className="w-3.5 h-3.5" /> เปิดรับ</>
                        }
                    </button>
                    <button onClick={() => onQr(form)}
                        className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none transition-colors">
                        <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(form.id, form.title)} disabled={deletingId === form.id}
                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors disabled:opacity-50">
                        {deletingId === form.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TopicGroup({ topicName, forms, togglingId, deletingId, copyingId, onToggle, onDelete, onQr, onCopy }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="rounded-none overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <Tag className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{topicName}</span>
                    <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-none bg-primary-100 dark:bg-primary/20 text-primary dark:text-primary-light">
                        {forms.length} แบบฟอร์ม
                    </span>
                    <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        เปิดอยู่ {forms.filter(f => f.is_active).length}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="p-4 bg-white dark:bg-neutral-900">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {forms.map(form => (
                            <FormCard
                                key={form.id}
                                form={form}
                                togglingId={togglingId}
                                deletingId={deletingId}
                                copyingId={copyingId}
                                onToggle={onToggle}
                                onDelete={onDelete}
                                onQr={onQr}
                                onCopy={onCopy}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ManageFormsClient({ initialForms = [] }) {
    const [forms, setForms] = useState(initialForms);
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [copyingId, setCopyingId] = useState(null);
    const [qrModal, setQrModal] = useState(null);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const qrCanvasRef = useRef(null);

    useEffect(() => {
        if (qrModal && qrCanvasRef.current) {
            const url = `${window.location.origin}/form/${qrModal.uuid}`;
            QRCode.toCanvas(qrCanvasRef.current, url, {
                width: 280, margin: 2,
                color: { dark: '#1e293b', light: '#ffffff' }
            });
        }
    }, [qrModal]);

    const handleToggleActive = async (id) => {
        setTogglingId(id);
        try {
            const result = await toggleFormActive(id);
            if (result.ok) {
                setForms(forms.map(f => f.id === id ? { ...f, is_active: result.data.is_active } : f));
            }
        } catch {
            alert('ไม่สามารถเปลี่ยนสถานะแบบฟอร์มได้');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id, title) => {
        const ok = await confirm({ variant: 'delete', message: `ต้องการลบแบบฟอร์ม "${title}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้` });
        if (!ok) return;
        setDeletingId(id);
        try {
            await deleteForm(id);
            setForms(forms.filter(f => f.id !== id));
        } catch {
            alert('ไม่สามารถลบแบบฟอร์มได้');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCopy = async (id) => {
        const ok = await confirm({ variant: 'save', title: 'ยืนยันการคัดลอก', message: 'ต้องการคัดลอกแบบฟอร์มนี้ใช่หรือไม่?' });
        if (!ok) return;
        setCopyingId(id);
        try {
            const result = await duplicateForm(id);
            if (!result.ok) throw new Error('ไม่สามารถคัดลอกแบบฟอร์มได้');
            window.location.reload();
        } catch {
            alert('ไม่สามารถคัดลอกแบบฟอร์มได้');
            setCopyingId(null);
        }
    };

    const handleDownloadQR = () => {
        if (!qrCanvasRef.current) return;
        const link = document.createElement('a');
        link.download = `qrcode-${qrModal.uuid}.png`;
        link.href = qrCanvasRef.current.toDataURL('image/png');
        link.click();
    };

    // Filter by search + status
    const filteredForms = useMemo(() => {
        return forms.filter(f => {
            const matchSearch = !search || (f.title || '').toLowerCase().includes(search.toLowerCase()) || (f.description || '').toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? f.is_active : !f.is_active);
            return matchSearch && matchStatus;
        });
    }, [forms, search, statusFilter]);

    // Group filtered forms by topic
    const grouped = filteredForms.reduce((acc, form) => {
        const key = form.topic_name || 'อื่นๆ';
        if (!acc[key]) acc[key] = [];
        acc[key].push(form);
        return acc;
    }, {});

    const groupEntries = Object.entries(grouped).sort(([a], [b]) => {
        if (a === 'อื่นๆ') return 1;
        if (b === 'อื่นๆ') return -1;
        return a.localeCompare(b, 'th');
    });

    const activeCount = forms.filter(f => f.is_active).length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row shadow-sm sm:items-center justify-between p-6 bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-light flex items-center gap-2">
                        <Settings className="w-6 h-6 text-primary" />
                        จัดการแบบฟอร์ม
                    </h1>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-neutral-500">
                        <span>ทั้งหมด <strong className="text-neutral-700 dark:text-neutral-200">{forms.length}</strong> แบบฟอร์ม</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            เปิดรับอยู่ <strong>{activeCount}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-neutral-400">
                            <XCircle className="w-3.5 h-3.5" />
                            ปิด <strong>{forms.length - activeCount}</strong>
                        </span>
                    </div>
                </div>
                <Link
                    href="/admin/builder"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-none transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5 whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    สร้างแบบฟอร์มใหม่
                </Link>
            </div>

            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาแบบฟอร์ม..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'ทั้งหมด' },
                        { key: 'active', label: 'เปิดรับ' },
                        { key: 'inactive', label: 'ปิด' },
                    ].map(({ key, label }) => (
                        <button key={key} onClick={() => setStatusFilter(key)}
                            className={`px-4 py-2.5 rounded-none text-sm font-medium border transition-colors ${statusFilter === key ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {forms.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-none text-neutral-500 dark:text-neutral-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    ยังไม่มีแบบฟอร์ม กดสร้างแบบฟอร์มใหม่เพื่อเริ่มต้น
                </div>
            ) : filteredForms.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-none text-neutral-400 text-sm">
                    ไม่พบแบบฟอร์มที่ตรงกับการค้นหา
                </div>
            ) : (
                <div className="space-y-4">
                    {groupEntries.map(([topicName, groupForms]) => (
                        <TopicGroup
                            key={topicName}
                            topicName={topicName}
                            forms={groupForms}
                            togglingId={togglingId}
                            deletingId={deletingId}
                            copyingId={copyingId}
                            onToggle={handleToggleActive}
                            onDelete={handleDelete}
                            onQr={setQrModal}
                            onCopy={handleCopy}
                        />
                    ))}
                </div>
            )}

            <ConfirmModal {...confirmModalProps} />

            {/* QR Code Modal */}
            {qrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setQrModal(null)}>
                    <div className="bg-white dark:bg-neutral-900 rounded-none shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-sm flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between w-full">
                            <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-neutral-500" /> QR Code
                            </h2>
                            <button onClick={() => setQrModal(null)} className="p-1.5 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center w-full truncate">{qrModal.title || '(ไม่มีชื่อ)'}</p>
                        <div className="bg-white p-3 rounded-none border border-neutral-200">
                            <canvas ref={qrCanvasRef} />
                        </div>
                        <p className="text-xs text-neutral-400 text-center break-all">
                            {typeof window !== 'undefined' ? `${window.location.origin}/form/${qrModal.uuid}` : ''}
                        </p>
                        <button onClick={handleDownloadQR}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-none transition-colors text-sm">
                            <Download className="w-4 h-4" /> ดาวน์โหลด QR Code
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
