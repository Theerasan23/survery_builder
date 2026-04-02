'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Pencil, Trash2, X, UserCircle, Monitor, Camera, Loader2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

// แปลง /uploads/... หรือ http://localhost:3001/uploads/... → /api/uploads/... (proxy ผ่าน Next.js)
function toProxyUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url.replace(/^https?:\/\/[^/]+\/uploads\//, '/api/uploads/');
    return url.replace(/^\/uploads\//, '/api/uploads/');
}

const EMPTY_FORM = { first_name: '', last_name: '', position: '', department: '', photo_url: '', device_ids: [], all_devices: false };

function PersonnelAvatar({ photo_url, first_name, last_name, size = 'md' }) {
    const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
    const src = toProxyUrl(photo_url);
    if (src) {
        return <img src={src} alt={`${first_name} ${last_name}`} className={`${sizeClass} rounded-full object-cover shrink-0 border-2 border-white dark:border-neutral-800 shadow-sm`} />;
    }
    return (
        <div className={`${sizeClass} rounded-full bg-[#21304A] flex items-center justify-center text-white font-semibold shrink-0`}>
            {first_name?.[0]}{last_name?.[0]}
        </div>
    );
}

export default function PersonnelClient() {
    const [personnel, setPersonnel] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { confirm: confirmSave, modalProps: saveModalProps } = useConfirmModal();
    const fileInputRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            const [pRes, dRes] = await Promise.all([
                axios.get(`${API}/personnel`),
                axios.get(`${API}/devices`)
            ]);
            setPersonnel(pRes.data);
            setDevices(dRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditing(null);
        setFormData(EMPTY_FORM);
        setModal(true);
    };

    const openEdit = (p) => {
        setEditing(p.id);
        setFormData({
            first_name:  p.first_name,
            last_name:   p.last_name,
            position:    p.position   || '',
            department:  p.department || '',
            photo_url:   p.photo_url  || '',
            device_ids:  p.device_ids || [],
            all_devices: p.all_devices || false,
        });
        setModal(true);
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await axios.post('/api/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(d => ({ ...d, photo_url: res.data.url }));
        } catch (err) {
            alert('อัปโหลดรูปไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDeviceSelect = (value) => {
        if (value === 'all') {
            setFormData(prev => ({ ...prev, all_devices: true, device_ids: [] }));
        } else if (value === '') {
            setFormData(prev => ({ ...prev, all_devices: false, device_ids: [] }));
        } else {
            setFormData(prev => ({ ...prev, all_devices: false, device_ids: [value] }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const ok = await confirmSave({ variant: 'save', message: 'ต้องการบันทึกข้อมูลบุคลากรนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            const payload = {
                first_name:   formData.first_name,
                last_name:    formData.last_name,
                position:     formData.position   || null,
                department:   formData.department || null,
                photo_url:    formData.photo_url  || null,
                device_ids:   formData.device_ids,
                all_devices:  formData.all_devices,
            };
            if (editing) {
                await axios.put(`${API}/personnel/${editing}`, payload);
            } else {
                await axios.post(`${API}/personnel`, payload);
            }
            setModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/personnel/${id}`);
            setDeleteConfirm(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#eef1f5] dark:bg-[#21304A]/10">
                            <Users className="w-5 h-5 text-[#21304A]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">รายชื่อบุคลากร</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">ทั้งหมด {personnel.length} คน</p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-sm font-medium transition-colors shadow-sm shadow-[#21304A]/20"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มบุคลากร
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : personnel.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                        <UserCircle className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-medium">ยังไม่มีบุคลากร</p>
                        <p className="text-sm mt-1">คลิก "เพิ่มบุคลากร" เพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">#</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ชื่อ-นามสกุล</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">ตำแหน่ง</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">บทบาทหน้าที่</th>
                                    <th className="text-left px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">Device ที่ประจำ</th>
                                    <th className="text-right px-6 py-3.5 font-semibold text-neutral-500 dark:text-neutral-400">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {personnel.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                        <td className="px-6 py-4 text-neutral-400">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <PersonnelAvatar photo_url={p.photo_url} first_name={p.first_name} last_name={p.last_name} />
                                                <span className="font-medium text-neutral-900 dark:text-white">
                                                    {p.first_name} {p.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">{p.position || '—'}</td>
                                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">{p.department || '—'}</td>
                                        <td className="px-6 py-4">
                                            {p.all_devices ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                                    <Monitor className="w-3 h-3" />
                                                    ทุกเครื่อง
                                                </span>
                                            ) : p.device_names && p.device_names.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.device_names.map((dn, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eef1f5] dark:bg-[#21304A]/10 text-[#21304A] dark:text-[#a1afc5] text-xs font-medium">
                                                            <Monitor className="w-3 h-3" />
                                                            {dn}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-neutral-400 text-xs">ไม่ได้ผูก Device</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    className="p-2 hover:bg-[#eef1f5] dark:hover:bg-[#21304A]/10 text-neutral-400 hover:text-[#21304A] transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(p)}
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

            {/* Create / Edit Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {editing ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
                            </h3>
                            <button onClick={() => setModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Photo upload */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group">
                                    {formData.photo_url ? (
                                        <img
                                            src={toProxyUrl(formData.photo_url)}
                                            alt="preview"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-neutral-700 shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-[#eef1f5] dark:bg-[#21304A]/10 border-4 border-white dark:border-neutral-700 shadow-lg flex items-center justify-center">
                                            {formData.first_name || formData.last_name ? (
                                                <span className="text-2xl font-bold text-[#a1afc5]">
                                                    {formData.first_name?.[0]}{formData.last_name?.[0]}
                                                </span>
                                            ) : (
                                                <UserCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
                                            )}
                                        </div>
                                    )}
                                    {/* overlay button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                    >
                                        {uploading
                                            ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            : <Camera className="w-6 h-6 text-white" />
                                        }
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="text-xs text-[#21304A] dark:text-[#a1afc5] hover:underline disabled:opacity-50"
                                    >
                                        {uploading ? 'กำลังอัปโหลด...' : formData.photo_url ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
                                    </button>
                                    {formData.photo_url && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(d => ({ ...d, photo_url: '' }))}
                                            className="ml-3 text-xs text-red-500 hover:underline"
                                        >
                                            ลบรูป
                                        </button>
                                    )}
                                    <p className="text-xs text-neutral-400 mt-0.5">JPG, PNG, WEBP ขนาดไม่เกิน 5MB</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />
                            </div>

                            {/* ชื่อ - นามสกุล */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อ *</label>
                                    <input
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData(d => ({ ...d, first_name: e.target.value }))}
                                        placeholder="ชื่อ"
                                        className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">นามสกุล *</label>
                                    <input
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData(d => ({ ...d, last_name: e.target.value }))}
                                        placeholder="นามสกุล"
                                        className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ตำแหน่ง</label>
                                <input
                                    value={formData.position}
                                    onChange={e => setFormData(d => ({ ...d, position: e.target.value }))}
                                    placeholder="เช่น นักวิชาการคอมพิวเตอร์"
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">บทบาทหน้าที่</label>
                                <input
                                    value={formData.department}
                                    onChange={e => setFormData(d => ({ ...d, department: e.target.value }))}
                                    placeholder="เช่น ผู้ให้บริการ, เจ้าหน้าที่รับเรื่อง"
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition"
                                />
                            </div>

                            {/* Device select dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Device ที่ประจำ
                                </label>
                                {devices.length === 0 ? (
                                    <p className="text-sm text-neutral-400 py-2">ยังไม่มี Device ในระบบ</p>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={formData.all_devices ? 'all' : (formData.device_ids[0] || '')}
                                            onChange={e => handleDeviceSelect(e.target.value)}
                                            className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] focus:border-transparent outline-none transition appearance-none pr-10"
                                        >
                                            <option value="">— ไม่เลือก —</option>
                                            <option value="all">ทุกเครื่อง</option>
                                            {devices.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}{d.form_title ? ` (${d.form_title})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <Monitor className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                    </div>
                                )}
                                <p className="text-xs text-neutral-400 mt-1.5">เลือก "ทุกเครื่อง" เพื่อให้บุคลากรปรากฏใน dropdown ของทุก Device</p>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors"
                                >
                                    {saving ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มบุคลากร'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!deleteConfirm}
                variant="delete"
                message={deleteConfirm ? <>ต้องการลบ <span className="font-medium text-neutral-800 dark:text-neutral-200">{deleteConfirm.first_name} {deleteConfirm.last_name}</span> ออกจากระบบ?</> : ''}
                onConfirm={() => handleDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
            />
            <ConfirmModal {...saveModalProps} />
        </div>
    );
}
