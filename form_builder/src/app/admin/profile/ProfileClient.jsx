'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/actions';
import { User, Save, Loader2, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileClient() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [formData, setFormData] = useState({ first_name: '', last_name: '', position: '', username: '' });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [showNewPw, setShowNewPw] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    useEffect(() => {
        if (status === 'loading') return;
        if (!session?.user) { router.replace('/login'); return; }

        // Fetch current user data from API
        (async () => {
            try {
                // Fetch specifically the current user
                const res = await axios.get(`${API}/users/${session.user.id}`);
                const me = res.data;
                if (me) {
                    setFormData({
                        first_name: me.first_name || '',
                        last_name: me.last_name || '',
                        position: me.position || '',
                        username: me.username || '',
                    });
                }
            } catch (err) {
                console.error('Fetch profile error:', err);
                // Fallback to session data
                const [firstName, ...rest] = (session.user.name || '').split(' ');
                setFormData({
                    first_name: firstName || '',
                    last_name: rest.join(' ') || '',
                    position: session.user.position || '',
                    username: session.user.username || '',
                });
            } finally {
                setLoading(false);
            }
        })();

    }, [session, status, router]);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.username.trim()) {
            showToast('error', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?' });
        if (!ok) return;

        setSaving(true);
        try {
            const result = await updateUser(session.user.id, {
                username: formData.username.trim(),
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                position: formData.position.trim() || null,
            });
            if (!result.ok) throw new Error(result.data?.error || 'บันทึกไม่สำเร็จ');

            // Update session so navbar reflects changes
            await updateSession({
                ...session,
                user: {
                    ...session.user,
                    name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
                    position: formData.position.trim() || null,
                    username: formData.username.trim(),
                },
            });

            showToast('success', 'บันทึกข้อมูลสำเร็จ');
        } catch (err) {
            showToast('error', err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordData.new_password) {
            showToast('error', 'กรุณากรอกรหัสผ่านใหม่');
            return;
        }
        if (passwordData.new_password.length < 4) {
            showToast('error', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            showToast('error', 'รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        const ok = await confirm({ variant: 'save', title: 'ยืนยันการเปลี่ยนรหัสผ่าน', message: 'ต้องการเปลี่ยนรหัสผ่านใช่หรือไม่?' });
        if (!ok) return;

        setChangingPassword(true);
        try {
            const result = await updateUser(session.user.id, {
                password: passwordData.new_password,
            });
            if (!result.ok) throw new Error(result.data?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');

            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            showToast('success', 'เปลี่ยนรหัสผ่านสำเร็จ');
        } catch (err) {
            showToast('error', err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        } finally {
            setChangingPassword(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-[#21304A]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl text-sm font-medium transition-all
                    ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-4 bg-neutral-50/50 dark:bg-neutral-800/20">
                    <button onClick={() => router.back()} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 rounded-full bg-[#21304A] flex items-center justify-center text-white shadow-lg ring-4 ring-[#21304A]/10">
                        <User className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">โปรไฟล์ของฉัน</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row min-h-[500px]">
                    {/* Left side: Information (2/3) */}
                    <div className="flex-1 p-8 border-r border-neutral-100 dark:border-neutral-800">
                        <h3 className="text-sm font-bold text-[#21304A] dark:text-neutral-400 uppercase tracking-wider mb-6">ข้อมูลส่วนตัว</h3>
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อ *</label>
                                    <input
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData(d => ({ ...d, first_name: e.target.value }))}
                                        placeholder="ชื่อ"
                                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#21304A] focus:border-[#21304A] transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">นามสกุล *</label>
                                    <input
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData(d => ({ ...d, last_name: e.target.value }))}
                                        placeholder="นามสกุล"
                                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#21304A] focus:border-[#21304A] transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อผู้ใช้งาน (Username) *</label>
                                <input
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData(d => ({ ...d, username: e.target.value }))}
                                    placeholder="Username สำหรับล็อกอิน"
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#21304A] focus:border-[#21304A] transition font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">ตำแหน่ง</label>
                                <input
                                    value={formData.position}
                                    onChange={e => setFormData(d => ({ ...d, position: e.target.value }))}
                                    placeholder="เช่น นักวิชาการคอมพิวเตอร์"
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#21304A] focus:border-[#21304A] transition"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-8 py-3 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-bold shadow-md transition-all active:scale-95"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right side: Security (1/3) */}
                    <div className="w-full md:w-80 p-8 bg-neutral-50/50 dark:bg-neutral-800/40 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2 mb-6">
                            <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">รหัสผ่าน</h3>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">รหัสผ่านใหม่</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        required
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData(d => ({ ...d, new_password: e.target.value }))}
                                        placeholder="รหัสผ่านใหม่"
                                        className="w-full px-4 py-3 pr-12 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                    >
                                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">ยืนยันรหัสผ่าน</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirm_password}
                                    onChange={e => setPasswordData(d => ({ ...d, confirm_password: e.target.value }))}
                                    placeholder="ยืนยันรหัสผ่าน"
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold shadow-md transition-all active:scale-95"
                                >
                                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                    {changingPassword ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
                                </button>
                                <p className="text-[10px] text-neutral-400 mt-3 text-center uppercase tracking-tighter">
                                    รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <ConfirmModal {...confirmModalProps} />
        </div>
    );
}
