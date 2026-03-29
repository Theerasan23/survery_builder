'use client';

import { useState, useRef } from 'react';
import { saveOrgSettings, uploadImage } from '@/lib/actions';
import { Building2, Upload, Save, CheckCircle, AlertCircle, X, Image as ImageIcon } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';

function normalizeLogoUrl(url) {
    if (!url) return null;
    // Convert absolute API URLs to relative path through Next.js proxy
    const match = url.match(/\/uploads\/.+$/);
    return match ? `/api${match[0]}` : url;
}

export default function OrgSettingsClient({ initialSettings = { system_name: '', org_name: '', logo_url: null } }) {
    const [settings, setSettings] = useState({
        ...initialSettings,
        logo_url: normalizeLogoUrl(initialSettings.logo_url),
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const fileRef = useRef(null);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('error', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const result = await uploadImage(formData);
            if (!result.ok) throw new Error('Upload failed');
            setSettings(prev => ({ ...prev, logo_url: `/api${result.data.url}` }));
            showToast('success', 'อัปโหลด logo สำเร็จ');
        } catch {
            showToast('error', 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleSave = async () => {
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกการตั้งค่านี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            const result = await saveOrgSettings(settings);
            if (!result.ok) throw new Error('Save failed');
            showToast('success', 'บันทึกข้อมูลสำเร็จ');
        } catch {
            showToast('error', 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const removeLogo = () => {
        setSettings(prev => ({ ...prev, logo_url: null }));
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl text-sm font-medium transition-all animate-in slide-in-from-top-2 duration-300
                    ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.type === 'success'
                        ? <CheckCircle className="w-5 h-5 shrink-0" />
                        : <AlertCircle className="w-5 h-5 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* Card: Organization Info */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                    <div className="p-2 bg-[#eef1f5] dark:bg-[#21304A]/30">
                        <Building2 className="w-5 h-5 text-[#21304A] dark:text-[#a1afc5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">ข้อมูลหน่วยงาน</h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">ข้อมูลนี้จะแสดงในส่วน footer ของแบบฟอร์ม</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            โลโก้หน่วยงาน
                        </label>
                        <div className="flex items-start gap-4">
                            {/* Preview */}
                            <div className="w-24 h-24 border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                {settings.logo_url ? (
                                    <>
                                        <img
                                            src={settings.logo_url}
                                            alt="logo preview"
                                            className="w-full h-full object-contain p-1"
                                        />
                                        <button
                                            onClick={removeLogo}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="ลบ logo"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                )}
                            </div>

                            {/* Upload button */}
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    id="logo-upload"
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className={`inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors
                                        ${uploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="w-4 h-4 border-2 border-[#21304A] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปภาพ'}
                                </label>
                                <p className="text-xs text-neutral-400">PNG, JPG, SVG ขนาดไม่เกิน 5MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Org Name */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            ชื่อหน่วยงาน
                            <span className="ml-1 text-xs text-neutral-400 font-normal">(แสดงใน footer ของแบบฟอร์ม)</span>
                        </label>
                        <input
                            type="text"
                            value={settings.org_name}
                            onChange={e => setSettings(prev => ({ ...prev, org_name: e.target.value }))}
                            placeholder="เช่น ศูนย์บริการผลิตภัณฑ์สุขภาพเบ็ดเสร็จ"
                            className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#21304A]/50 focus:border-[#21304A] transition"
                        />
                    </div>
                </div>
            </div>

            {/* Card: System Info */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
                    <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">ข้อมูลระบบ</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">ชื่อระบบจะแสดงในแถบเมนูด้านซ้าย</p>
                </div>
                <div className="p-6">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            ชื่อระบบ
                            <span className="ml-1 text-xs text-neutral-400 font-normal">(แสดงใน Sidebar)</span>
                        </label>
                        <input
                            type="text"
                            value={settings.system_name}
                            onChange={e => setSettings(prev => ({ ...prev, system_name: e.target.value }))}
                            placeholder="เช่น ssj formbuilder"
                            className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#21304A]/50 focus:border-[#21304A] transition"
                        />
                    </div>
                </div>
            </div>

            <ConfirmModal {...confirmModalProps} />

            {/* Save button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                    {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </div>
    );
}
