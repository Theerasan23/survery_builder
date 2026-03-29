'use client';

import { useState } from 'react';
import { getOptionSets, createOptionSet, updateOptionSet, deleteOptionSet } from '@/lib/actions';
import { PlusCircle, Search, Trash2, Save, X, Edit2, Loader2, GripVertical, Database } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableOptionItem({ option, index, updateOptionText, removeOption }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.5 : 1 }}
            className={`flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border ${isDragging ? 'border-primary shadow-lg' : 'border-neutral-200 dark:border-neutral-700'} rounded-none`}>
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-primary">
                <GripVertical className="w-5 h-5" />
            </div>
            <input type="text" value={option.text} onChange={(e) => updateOptionText(option.id, e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 px-2 outline-none font-medium dark:text-neutral-200"
                placeholder={`ตัวเลือก ${index + 1}`} />
            <button onClick={() => removeOption(option.id)} className="p-2 text-neutral-400 hover:text-red-500 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function OptionsClient({ initialOptionSets = [] }) {
    const [optionSets, setOptionSets] = useState(initialOptionSets);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSet, setEditingSet] = useState(null);
    const [formData, setFormData] = useState({ name: '', options: [] });
    const [saving, setSaving] = useState(false);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchOptionSets = async () => {
        setLoading(true);
        try {
            const data = await getOptionSets();
            setOptionSets(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openModal = (set = null) => {
        if (set) {
            setEditingSet(set);
            setFormData({ name: set.name, options: set.options.map((opt, i) => ({ id: `opt-${Date.now()}-${i}`, text: typeof opt === 'string' ? opt : opt.text })) });
        } else {
            setEditingSet(null);
            setFormData({ name: '', options: [{ id: `opt-${Date.now()}-0`, text: 'ตัวเลือก 1' }] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingSet(null); };

    const handleSave = async () => {
        if (!formData.name.trim()) return alert('กรุณากรอกชื่อชุดตัวเลือก');
        if (formData.options.length === 0) return alert('กรุณาเพิ่มตัวเลือกอย่างน้อย 1 รายการ');
        if (formData.options.some(o => !o.text.trim())) return alert('ตัวเลือกต้องไม่ว่างเปล่า');
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกชุดตัวเลือกนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            const payload = { name: formData.name, options: formData.options.map(o => o.text.trim()) };
            if (editingSet) {
                await updateOptionSet(editingSet.id, payload);
            } else {
                await createOptionSet(payload);
            }
            await fetchOptionSets();
            closeModal();
        } catch (e) { console.error(e); alert('บันทึกไม่สำเร็จ'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ variant: 'delete', message: 'ต้องการลบชุดตัวเลือกนี้ใช่หรือไม่?' });
        if (!ok) return;
        try {
            await deleteOptionSet(id);
            fetchOptionSets();
        } catch (e) { console.error(e); }
    };

    const addOption = () => setFormData(p => ({ ...p, options: [...p.options, { id: `opt-${Date.now()}`, text: `ตัวเลือก ${p.options.length + 1}` }] }));
    const removeOption = (id) => setFormData(p => ({ ...p, options: p.options.filter(o => o.id !== id) }));
    const updateOptionText = (id, text) => setFormData(p => ({ ...p, options: p.options.map(o => o.id === id ? { ...o, text } : o) }));
    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            setFormData(p => {
                const oi = p.options.findIndex(o => o.id === active.id);
                const ni = p.options.findIndex(o => o.id === over.id);
                return { ...p, options: arrayMove(p.options, oi, ni) };
            });
        }
    };

    const filteredSets = optionSets.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#21304A]" />
                        ชุดตัวเลือกมาตรฐาน
                        <span className="text-xs font-normal text-neutral-400">({filteredSets.length} ชุด)</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input type="text" placeholder="ค้นหาชุดตัวเลือก..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1.5 w-52 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#21304A]" />
                        </div>
                        <button onClick={() => openModal()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#21304A] hover:bg-[#2d4060] text-white text-xs font-semibold transition-colors">
                            <PlusCircle className="w-3.5 h-3.5" /> สร้างชุดตัวเลือก
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
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">ชื่อชุดตัวเลือก</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">จำนวนรายการ</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400">ตัวอย่าง</th>
                                    <th className="p-4 font-medium text-neutral-600 dark:text-neutral-400 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {filteredSets.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-neutral-500">ไม่พบชุดตัวเลือก</td></tr>
                                ) : filteredSets.map(set => (
                                    <tr key={set.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="p-4 font-medium text-neutral-900 dark:text-white">{set.name}</td>
                                        <td className="p-4 text-neutral-500"><span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-none text-sm">{set.options?.length || 0} รายการ</span></td>
                                        <td className="p-4 text-neutral-500 text-sm truncate max-w-xs">{set.options?.slice(0, 3).join(', ')}{set.options?.length > 3 && ' ...'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openModal(set)} className="p-2 text-neutral-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary/10 rounded-none transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(set.id)} className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingSet ? 'แก้ไขชุดตัวเลือก' : 'สร้างชุดตัวเลือก'}</h2>
                            <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">ชื่อชุดตัวเลือก</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-none focus:ring-2 focus:ring-primary text-neutral-900 dark:text-white"
                                    placeholder="เช่น แผนกงาน, ภูมิภาค" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">ตัวเลือก</label>
                                    <span className="text-xs text-neutral-500">{formData.options.length} รายการ</span>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={formData.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-3">
                                            {formData.options.map((opt, i) => (
                                                <SortableOptionItem key={opt.id} option={opt} index={i} updateOptionText={updateOptionText} removeOption={removeOption} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <button onClick={addOption} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-none text-neutral-500 hover:text-primary hover:border-primary hover:bg-primary-50 dark:hover:bg-primary/10 transition-all font-medium">
                                    <PlusCircle className="w-5 h-5" /> เพิ่มตัวเลือก
                                </button>
                            </div>
                        </div>
                        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2.5 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-none transition-colors">ยกเลิก</button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-70 text-white font-medium rounded-none shadow-lg shadow-primary/30 transition-all">
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
