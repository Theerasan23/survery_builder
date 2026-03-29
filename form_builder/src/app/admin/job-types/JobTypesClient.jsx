'use client';

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const EMPTY = { name: '', description: '' };

export default function JobTypesClient() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { confirm: confirmSave, modalProps: saveModalProps } = useConfirmModal();

    const fetchJobs = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/job-types`);
            setJobs(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const openCreate = () => {
        setEditing(null);
        setFormData(EMPTY);
        setModal(true);
    };

    const openEdit = (j) => {
        setEditing(j.id);
        setFormData({ name: j.name, description: j.description || '' });
        setModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const ok = await confirmSave({ variant: 'save', message: 'ต้องการบันทึกรูปแบบงานนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`${API}/job-types/${editing}`, formData);
            } else {
                await axios.post(`${API}/job-types`, formData);
            }
            setModal(false);
            fetchJobs();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/job-types/${id}`);
            setDeleteConfirm(null);
            fetchJobs();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-none">
                            <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">รูปแบบงาน</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">ทั้งหมด {jobs.length} รูปแบบ</p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-none transition-colors shadow-sm shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มรูปแบบงาน
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <Briefcase className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ยังไม่มีรูปแบบงาน</p>
                        <p className="text-sm mt-1">คลิก "เพิ่มรูปแบบงาน" เพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ชื่องาน</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">คำอธิบาย</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">วันที่สร้าง</th>
                                    <th className="text-right px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {jobs.map((j, idx) => (
                                    <tr key={j.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-6 py-4 text-neutral-400">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-primary/10 rounded-none">
                                                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="font-medium text-neutral-900 dark:text-white">{j.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{j.description || '—'}</td>
                                        <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400 text-xs">
                                            {new Date(j.created_at).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(j)}
                                                    className="p-2 rounded-none hover:bg-primary/10 text-neutral-400 hover:text-primary transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(j)}
                                                    className="p-2 rounded-none hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
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

            {/* Create / Edit Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-none shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {editing ? 'แก้ไขรูปแบบงาน' : 'เพิ่มรูปแบบงานใหม่'}
                            </h3>
                            <button onClick={() => setModal(false)} className="p-2 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่องาน *</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                                    placeholder="เช่น งานธุรการ, งานบริการ"
                                    className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">คำอธิบาย</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                                    placeholder="รายละเอียดของรูปแบบงาน (ไม่บังคับ)"
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-none bg-primary hover:bg-primary/90 disabled:opacity-70 text-white text-sm font-medium transition-colors">
                                    {saving ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มรูปแบบงาน'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!deleteConfirm}
                variant="delete"
                message={deleteConfirm ? <>ต้องการลบรูปแบบงาน <span className="font-medium text-neutral-800 dark:text-neutral-200">"{deleteConfirm.name}"</span>?</> : ''}
                onConfirm={() => handleDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
            />
            <ConfirmModal {...saveModalProps} />
        </div>
    );
}
