'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, X, Star, Users } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PersonnelFormsClient() {
    const router = useRouter();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { confirm: confirmSave, modalProps: saveModalProps } = useConfirmModal();

    const fetchForms = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/personnel-forms`);
            setForms(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchForms(); }, [fetchForms]);

    const handleCreate = async (e) => {
        e.preventDefault();
        const ok = await confirmSave({ variant: 'save', message: 'ต้องการสร้างแบบประเมินนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            const res = await axios.post(`${API}/personnel-forms`, { title: formTitle, description: formDesc });
            setCreateModal(false);
            setFormTitle('');
            setFormDesc('');
            router.push(`/admin/personnel-forms/builder/${res.data.id}`);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/personnel-forms/${id}`);
            setDeleteConfirm(null);
            fetchForms();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10">
                            <ClipboardList className="w-5 h-5 text-[#21304A]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">แบบประเมินบุคลากร</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">ทั้งหมด {forms.length} แบบประเมิน</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-sm font-medium transition-colors shadow-sm shadow-[#21304A]/20"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างแบบประเมิน
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : forms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <ClipboardList className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ยังไม่มีแบบประเมินบุคลากร</p>
                        <p className="text-sm mt-1">คลิก "สร้างแบบประเมิน" เพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ชื่อแบบประเมิน</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คำอธิบาย</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ผู้ประเมิน</th>
                                    <th className="text-center px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คะแนนเฉลี่ย</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">สถานะ</th>
                                    <th className="text-right px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {forms.map((f, idx) => (
                                    <tr key={f.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-6 py-4 text-neutral-400">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-neutral-900 dark:text-white">{f.title}</span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400 max-w-xs truncate">
                                            {f.description || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300 font-medium">
                                                <Users className="w-3.5 h-3.5 text-neutral-400" />
                                                {f.response_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {f.average_score ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                                                    <Star className="w-3.5 h-3.5" />
                                                    {parseFloat(f.average_score).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-400 text-xs">ยังไม่มีข้อมูล</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${f.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${f.is_active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                                                {f.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/personnel-forms/builder/${f.id}`)}
                                                    className="p-2 hover:bg-[#eef1f5] dark:hover:bg-[#21304A]/10 text-neutral-400 hover:text-[#21304A] transition-colors"
                                                    title="แก้ไขแบบประเมิน"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(f)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">สร้างแบบประเมินบุคลากรใหม่</h3>
                            <button onClick={() => setCreateModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อแบบประเมิน *</label>
                                <input
                                    required
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    placeholder="เช่น แบบประเมินความพึงพอใจบุคลากร"
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">คำอธิบาย</label>
                                <textarea
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    placeholder="รายละเอียดของแบบประเมิน (ไม่บังคับ)"
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors">
                                    {saving ? 'กำลังสร้าง...' : 'สร้างและไปยัง Builder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!deleteConfirm}
                variant="delete"
                message={deleteConfirm ? <>ต้องการลบแบบประเมิน <span className="font-medium text-neutral-800 dark:text-neutral-200">"{deleteConfirm.title}"</span>?</> : ''}
                onConfirm={() => handleDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
            />
            <ConfirmModal {...saveModalProps} />
        </div>
    );
}
