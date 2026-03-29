'use client';

import { useState, useEffect, useCallback } from 'react';
import { Monitor, Plus, Trash2, X, ChevronDown, Copy, Check, Power, Pencil } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DevicesClient() {
    const [devices, setDevices] = useState([]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', personnel_form_id: '' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Edit modal state
    const [editModal, setEditModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [editData, setEditData] = useState({ name: '', personnel_form_id: '' });

    const fetchAll = useCallback(async () => {
        try {
            const [dRes, fRes] = await Promise.all([
                axios.get(`${API}/devices`),
                axios.get(`${API}/personnel-forms`)
            ]);
            setDevices(dRes.data);
            setForms(fRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post(`${API}/devices`, {
                name: formData.name,
                personnel_form_id: formData.personnel_form_id || null
            });
            setModal(false);
            setFormData({ name: '', personnel_form_id: '' });
            fetchAll();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (d) => {
        setEditingDevice(d);
        setEditData({ name: d.name, personnel_form_id: d.personnel_form_id || '' });
        setEditModal(true);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${API}/devices/${editingDevice.id}`, {
                name: editData.name,
                personnel_form_id: editData.personnel_form_id || null,
                personnel_id: editingDevice.personnel_id || null
            });
            setEditModal(false);
            setEditingDevice(null);
            fetchAll();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/devices/${id}`);
            setDeleteConfirm(null);
            fetchAll();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    const copyToClipboard = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // fallback
        }
    };

    const statusBadge = (status) => status === 'open'
        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />เปิด</span>
        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />ปิด</span>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-none">
                            <Monitor className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">รายการ Device</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">ทั้งหมด {devices.length} เครื่อง</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setFormData({ name: '', form_id: '' }); setModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-none transition-colors shadow-sm shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่ม Device
                    </button>
                </div>
            </div>

            {/* Device Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : devices.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center py-20 text-neutral-400">
                    <Monitor className="w-14 h-14 mb-3 opacity-30" />
                    <p className="font-medium">ยังไม่มี Device</p>
                    <p className="text-sm mt-1">คลิก "เพิ่ม Device" เพื่อเริ่มต้น</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map(d => (
                        <div key={d.id} className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-none flex items-center justify-center ${d.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                                        <Power className={`w-5 h-5 ${d.status === 'open' ? 'text-emerald-500' : 'text-neutral-400'}`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white text-sm">{d.name}</p>
                                        {statusBadge(d.status)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEdit(d)}
                                        className="p-1.5 rounded-none hover:bg-primary/10 text-neutral-400 hover:text-primary transition-colors"
                                        title="แก้ไข"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(d)}
                                        className="p-1.5 rounded-none hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
                                        title="ลบ"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* UUID */}
                            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-none p-3">
                                <p className="text-xs text-neutral-400 mb-1">Device ID (UUID)</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono text-neutral-600 dark:text-neutral-300 flex-1 truncate">{d.id}</code>
                                    <button
                                        onClick={() => copyToClipboard(d.id, `uuid-${d.id}`)}
                                        className="p-1.5 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
                                        title="คัดลอก UUID"
                                    >
                                        {copiedId === `uuid-${d.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Form binding */}
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-neutral-400 text-xs">แบบประเมิน:</span>
                                {d.personnel_form_title ? (
                                    <span className="px-2 py-0.5 rounded-none bg-primary/10 text-primary dark:text-primary-light text-xs font-medium truncate">
                                        {d.personnel_form_title}
                                    </span>
                                ) : (
                                    <span className="text-neutral-400 text-xs">—</span>
                                )}
                            </div>

                            {/* Personnel */}
                            {d.personnel_name && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-neutral-400 text-xs">บุคลากร:</span>
                                    <span className="text-neutral-700 dark:text-neutral-300 text-xs font-medium">{d.personnel_name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-none shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">เพิ่ม Device ใหม่</h3>
                            <button onClick={() => setModal(false)} className="p-2 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อ Device *</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                                    placeholder="เช่น ห้องรับบริการ A"
                                    className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">แบบประเมินบุคลากรที่ผูกติด</label>
                                <div className="relative">
                                    <select
                                        value={formData.personnel_form_id}
                                        onChange={e => setFormData(d => ({ ...d, personnel_form_id: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none transition"
                                    >
                                        <option value="">— ไม่ผูกแบบประเมิน —</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-none p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                                <span className="mt-0.5">ℹ️</span>
                                <span>Device ID (UUID) จะถูกสร้างอัตโนมัติ และสถานะเริ่มต้นจะเป็น <strong>ปิด</strong></span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-none bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                                    {saving ? 'กำลังสร้าง...' : 'สร้าง Device'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && editingDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-none shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">แก้ไข Device</h3>
                            <button onClick={() => { setEditModal(false); setEditingDevice(null); }} className="p-2 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อ Device *</label>
                                <input
                                    required
                                    value={editData.name}
                                    onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                                    placeholder="เช่น ห้องรับบริการ A"
                                    className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">เปลี่ยนแบบประเมินบุคลากร</label>
                                <div className="relative">
                                    <select
                                        value={editData.personnel_form_id}
                                        onChange={e => setEditData(d => ({ ...d, personnel_form_id: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none transition"
                                    >
                                        <option value="">— ไม่ผูกแบบประเมิน —</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setEditModal(false); setEditingDevice(null); }} className="flex-1 px-4 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-none bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-none shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">ยืนยันการลบ</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                ต้องการลบ <span className="font-medium text-neutral-800 dark:text-neutral-200">{deleteConfirm.name}</span>?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-none border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 px-4 py-2.5 rounded-none bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                                ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
