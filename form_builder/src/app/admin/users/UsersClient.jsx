'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUsers, createUser, updateUser } from '@/lib/actions';
import { Users, PlusCircle, Search, Edit2, ShieldCheck, UserCog, Mail, Loader2, Save, X, Ban, CheckCircle2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';

export default function UsersClient({ initialUsers = [] }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const isAdmin = session?.user?.role === 'admin';

    useEffect(() => {
        if (status === 'loading') return;
        if (!isAdmin) router.replace('/admin/dashboard');
    }, [status, isAdmin, router]);

    const [users, setUsers] = useState(initialUsers);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ username: '', first_name: '', last_name: '', position: '', role: 'staff', password: '', is_active: 1 });
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({ username: user.username, first_name: user.first_name, last_name: user.last_name, position: user.position || '', role: user.role, is_active: user.is_active, password: '' });
        } else {
            setEditingUser(null);
            setFormData({ username: '', first_name: '', last_name: '', position: '', role: 'staff', is_active: 1, password: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingUser(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกข้อมูลผู้ใช้นี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            if (editingUser) {
                await updateUser(editingUser.id, { first_name: formData.first_name, last_name: formData.last_name, position: formData.position, role: formData.role, is_active: formData.is_active, password: formData.password });
            } else {
                const result = await createUser(formData);
                if (!result.ok) { alert(result.data?.error || 'บันทึกไม่สำเร็จ'); return; }
            }
            fetchUsers();
            closeModal();
        } catch (e) { console.error(e); alert('บันทึกไม่สำเร็จ'); }
        finally { setSaving(false); }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.last_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (status === 'loading' || !isAdmin) {
        return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#21304A]" />
                        รายชื่อผู้ใช้งาน
                        <span className="text-xs font-normal text-neutral-400">({filteredUsers.length} คน)</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input type="text" placeholder="ค้นหาผู้ใช้งาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1.5 w-52 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                        </div>
                        <button onClick={() => openModal()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-xs font-semibold transition-colors">
                            <PlusCircle className="w-3.5 h-3.5" /> เพิ่มผู้ใช้งาน
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-sm">
                                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-400">ชื่อ / ชื่อผู้ใช้</th>
                                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-400">ตำแหน่ง</th>
                                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-400">บทบาท</th>
                                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-400 text-center">สถานะ</th>
                                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-400 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-neutral-500">ไม่พบผู้ใช้งาน</td></tr>
                                ) : filteredUsers.map(user => (
                                    <tr key={user.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${!user.is_active && 'opacity-60 grayscale'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md ${user.role === 'admin' ? 'bg-gradient-to-tr from-rose-500 to-red-500' : 'bg-gradient-to-tr from-indigo-500 to-cyan-500'}`}>
                                                    {user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-neutral-900 dark:text-white">{user.first_name} {user.last_name}</p>
                                                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-neutral-600 dark:text-neutral-400 text-sm">{user.position || '-'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-medium border ${user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : 'bg-primary-50 text-primary border-primary-100 dark:bg-primary/10 dark:text-primary-light dark:border-primary/20'}`}>
                                                {user.role?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> ใช้งาน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                                                    <Ban className="w-3.5 h-3.5" /> ปิดใช้งาน
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => openModal(user)} className="p-2 text-neutral-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary/10 rounded-none transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ConfirmModal {...confirmModalProps} />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
                    <div className="relative bg-white dark:bg-neutral-900 rounded-none w-full max-w-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <UserCog className="w-6 h-6 text-primary" />
                                {editingUser ? 'แก้ไขบัญชีผู้ใช้' : 'เพิ่มผู้ใช้งานใหม่'}
                            </h2>
                            <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">ชื่อผู้ใช้ (สำหรับล็อกอิน)</label>
                                        <input type="text" required disabled={!!editingUser} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" />
                                        <p className="text-xs text-neutral-500 mt-1">ชื่อผู้ใช้ไม่สามารถเปลี่ยนแปลงได้หลังจากสร้างแล้ว</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">ชื่อ</label>
                                        <input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">นามสกุล</label>
                                        <input type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">ตำแหน่งงาน</label>
                                        <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">บทบาทในระบบ</label>
                                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white">
                                            <option value="staff">เจ้าหน้าที่</option>
                                            <option value="admin">ผู้ดูแลระบบ</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-none">
                                        <label className="block text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                                            {editingUser ? 'รีเซ็ตรหัสผ่าน (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'รหัสผ่าน'}
                                        </label>
                                        <input type="password" required={!editingUser} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-yellow-300 dark:border-yellow-700/50 rounded-none focus:ring-2 focus:ring-yellow-500 text-neutral-900 dark:text-white"
                                            placeholder="กรอกรหัสผ่าน" />
                                    </div>
                                    {editingUser && (
                                        <div className="md:col-span-2 flex items-center gap-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-none">
                                            <input type="checkbox" id="isActive" checked={!!formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                                className="w-5 h-5 text-primary rounded-none border-gray-300 focus:ring-primary" />
                                            <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">บัญชีใช้งานได้ (ปลดเครื่องหมายเพื่อปิดการใช้งาน)</label>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 sticky bottom-0">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-none transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-70 text-white font-medium rounded-none shadow-lg shadow-primary/20 transition-all">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
