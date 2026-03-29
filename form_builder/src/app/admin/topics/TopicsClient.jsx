'use client';

import { useState } from 'react';
import { getFormTopics, createFormTopic, updateFormTopic, deleteFormTopic } from '@/lib/actions';
import { PlusCircle, Search, Trash2, Edit2, Save, X, Loader2, List } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';

export default function TopicsClient({ initialTopics = [] }) {
    const [topics, setTopics] = useState(initialTopics);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', aspects: [] });
    const [saving, setSaving] = useState(false);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const data = await getFormTopics();
            setTopics(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openModal = (topic = null) => {
        if (topic) {
            setEditingTopic(topic);
            let parsedAspects = [];
            if (topic.aspects) {
                try { parsedAspects = typeof topic.aspects === 'string' ? JSON.parse(topic.aspects) : topic.aspects; } catch {}
            }
            setFormData({ title: topic.title, description: topic.description || '', aspects: parsedAspects });
        } else {
            setEditingTopic(null);
            setFormData({ title: '', description: '', aspects: [] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingTopic(null); };

    const handleSave = async () => {
        if (!formData.title.trim()) return alert('กรุณากรอกชื่อหัวข้อ');
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกหัวข้อนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            if (editingTopic) {
                await updateFormTopic(editingTopic.id, formData);
            } else {
                await createFormTopic(formData);
            }
            await fetchTopics();
            closeModal();
        } catch (e) { console.error(e); alert('บันทึกไม่สำเร็จ'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ variant: 'delete', message: 'ต้องการลบหัวข้อนี้ใช่หรือไม่?' });
        if (!ok) return;
        try {
            const result = await deleteFormTopic(id);
            if (!result.ok) { alert(result.data?.error || 'ลบไม่สำเร็จ'); return; }
            fetchTopics();
        } catch (e) { console.error(e); alert('ลบไม่สำเร็จ'); }
    };

    const filteredTopics = topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                        <List className="w-4 h-4 text-[#21304A]" />
                        หัวข้อแบบฟอร์ม
                        <span className="text-xs font-normal text-neutral-400">({filteredTopics.length} หัวข้อ)</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input type="text" placeholder="ค้นหาหัวข้อ..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1.5 w-52 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                        </div>
                        <button onClick={() => openModal()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-xs font-semibold transition-colors">
                            <PlusCircle className="w-3.5 h-3.5" /> สร้างหัวข้อ
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">ชื่อหัวข้อ</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">คำอธิบาย</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">ด้านต่างๆ</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">วันที่สร้าง</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {filteredTopics.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-neutral-500">ไม่พบหัวข้อ</td></tr>
                                ) : filteredTopics.map(topic => (
                                    <tr key={topic.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="p-4 font-medium text-neutral-900 dark:text-white">{topic.title}</td>
                                        <td className="p-4 text-neutral-500 text-sm max-w-sm truncate">{topic.description || '-'}</td>
                                        <td className="p-4 text-neutral-500 text-sm">
                                            {(() => {
                                                let a = [];
                                                if (topic.aspects) try { a = typeof topic.aspects === 'string' ? JSON.parse(topic.aspects) : topic.aspects; } catch {}
                                                return a.length > 0 ? `${a.length} ด้าน` : '-';
                                            })()}
                                        </td>
                                        <td className="p-4 text-neutral-500 text-sm">{new Date(topic.created_at).toLocaleDateString('th-TH')}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openModal(topic)} className="p-2 text-neutral-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary/10 rounded-none transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(topic.id)} className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
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
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal}></div>
                    <div className="relative bg-white dark:bg-neutral-900 rounded-none w-full max-w-lg shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingTopic ? 'แก้ไขหัวข้อ' : 'สร้างหัวข้อ'}</h2>
                            <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">ชื่อหัวข้อ</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white"
                                    placeholder="เช่น แบบสำรวจความพึงพอใจ" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">คำอธิบาย (ไม่บังคับ)</label>
                                <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white" />
                            </div>
                            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">ด้านต่างๆ</label>
                                    <button onClick={() => setFormData(p => ({ ...p, aspects: [...p.aspects, ''] }))}
                                        className="text-xs text-primary hover:text-primary-dark dark:text-primary-light font-medium px-2 py-1 rounded-none bg-primary-50 dark:bg-primary/10">
                                        + เพิ่มด้าน
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {formData.aspects.length === 0 ? (
                                        <p className="text-sm text-neutral-500 italic text-center py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-none">ไม่มีด้านที่กำหนด</p>
                                    ) : formData.aspects.map((aspect, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input type="text" value={aspect}
                                                onChange={(e) => { const a = [...formData.aspects]; a[index] = e.target.value; setFormData(p => ({ ...p, aspects: a })); }}
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white"
                                                placeholder={`ชื่อด้านที่ ${index + 1}`} />
                                            <button onClick={() => setFormData(p => ({ ...p, aspects: p.aspects.filter((_, i) => i !== index) }))}
                                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2.5 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-none transition-colors">ยกเลิก</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-70 text-white font-medium rounded-none shadow-lg shadow-primary/30 transition-all">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
