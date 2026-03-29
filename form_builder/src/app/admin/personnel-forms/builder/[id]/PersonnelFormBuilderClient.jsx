'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, ChevronDown, ChevronUp, GripVertical, X, ArrowLeft } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const QUESTION_TYPES = [
    { value: 'rating', label: 'คะแนน (1-5 ดาว)' },
    { value: 'single_choice', label: 'เลือกตอบเดียว' },
    { value: 'multiple_choice', label: 'เลือกตอบหลายข้อ' },
    { value: 'text', label: 'ข้อความอิสระ' },
    { value: 'short_text', label: 'ข้อความสั้น' },
];

export default function PersonnelFormBuilderClient({ formId }) {
    const router = useRouter();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    // Flat list of sections and questions (loaded from API)
    const [sections, setSections] = useState([]);

    // Modal state for adding question
    const [addQModal, setAddQModal] = useState(null); // { sectionId }
    const [qText, setQText] = useState('');
    const [qType, setQType] = useState('rating');
    const [qRequired, setQRequired] = useState(true);
    const [qOptions, setQOptions] = useState(['']);

    // Edit question modal
    const [editQModal, setEditQModal] = useState(null);
    const [editQText, setEditQText] = useState('');
    const [editQType, setEditQType] = useState('rating');
    const [editQRequired, setEditQRequired] = useState(true);
    const [editQOptions, setEditQOptions] = useState([]);

    const fetchForm = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/personnel-forms/${formId}`);
            setForm(res.data);
            setSections(res.data.sections || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [formId]);

    useEffect(() => { fetchForm(); }, [fetchForm]);

    // ── Add Section Modal ──────────────────────────────────────────────────────
    const [addSectionModal, setAddSectionModal] = useState(false);
    const [sectionTitle, setSectionTitle] = useState('');
    const [sectionQText, setSectionQText] = useState('');
    const [sectionQType, setSectionQType] = useState('rating');
    const [sectionQRequired, setSectionQRequired] = useState(true);
    const [sectionQOptions, setSectionQOptions] = useState(['']);

    const openAddSection = () => {
        setAddSectionModal(true);
        setSectionTitle(`หัวข้อที่ ${sections.length + 1}`);
        setSectionQText('');
        setSectionQType('rating');
        setSectionQRequired(true);
        setSectionQOptions(['']);
    };

    const handleAddSection = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const secRes = await axios.post(`${API}/personnel-forms/${formId}/sections`, {
                title: sectionTitle,
                order_index: sections.length
            });
            const sectionId = secRes.data.id;
            const newSection = { id: sectionId, title: sectionTitle, questions: [] };

            if (sectionQText.trim()) {
                const payload = {
                    section_id: sectionId,
                    text: sectionQText,
                    type: sectionQType,
                    is_required: sectionQRequired,
                    order_index: 0,
                    options: needsOptions(sectionQType) ? sectionQOptions.filter(o => o.trim()) : []
                };
                const qRes = await axios.post(`${API}/personnel-forms/${formId}/questions`, payload);
                newSection.questions = [{
                    id: qRes.data.id,
                    text: sectionQText,
                    type: sectionQType,
                    is_required: sectionQRequired,
                    options: needsOptions(sectionQType) ? sectionQOptions.filter(o => o.trim()).map((t, i) => ({ id: null, text: t, order_index: i })) : []
                }];
            }

            setSections(prev => [...prev, newSection]);
            setAddSectionModal(false);
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const updateSectionTitle = async (sectionId, title) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
        try {
            await axios.put(`${API}/personnel-forms/${formId}/sections/${sectionId}`, { title });
        } catch (e) { console.error(e); }
    };

    const deleteSection = async (sectionId) => {
        try {
            await axios.delete(`${API}/personnel-forms/${formId}/sections/${sectionId}`);
            setSections(prev => prev.filter(s => s.id !== sectionId));
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    // ── Add Question ─────────────────────────────────────────────────────────
    const openAddQ = (sectionId) => {
        setAddQModal({ sectionId });
        setQText('');
        setQType('rating');
        setQRequired(true);
        setQOptions(['']);
    };

    const handleAddQ = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const sectionIdx = sections.findIndex(s => s.id === addQModal.sectionId);
            const orderIdx = sectionIdx >= 0 ? sections[sectionIdx].questions?.length || 0 : 0;
            const payload = {
                section_id: addQModal.sectionId,
                text: qText,
                type: qType,
                is_required: qRequired,
                order_index: orderIdx,
                options: needsOptions(qType) ? qOptions.filter(o => o.trim()) : []
            };
            const res = await axios.post(`${API}/personnel-forms/${formId}/questions`, payload);
            const newQ = { id: res.data.id, text: qText, type: qType, is_required: qRequired, options: needsOptions(qType) ? qOptions.filter(o => o.trim()).map((t, i) => ({ id: null, text: t, order_index: i })) : [] };
            setSections(prev => prev.map(s =>
                s.id === addQModal.sectionId ? { ...s, questions: [...(s.questions || []), newQ] } : s
            ));
            setAddQModal(null);
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    // ── Edit Question ─────────────────────────────────────────────────────────
    const openEditQ = (q) => {
        setEditQModal(q);
        setEditQText(q.text);
        setEditQType(q.type);
        setEditQRequired(q.is_required);
        setEditQOptions(q.options?.map(o => o.text) || ['']);
    };

    const handleEditQ = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                text: editQText,
                type: editQType,
                is_required: editQRequired,
                section_id: editQModal.section_id,
                options: needsOptions(editQType) ? editQOptions.filter(o => o.trim()) : []
            };
            await axios.put(`${API}/personnel-forms/${formId}/questions/${editQModal.id}`, payload);
            setSections(prev => prev.map(s => ({
                ...s,
                questions: (s.questions || []).map(q =>
                    q.id === editQModal.id
                        ? { ...q, text: editQText, type: editQType, is_required: editQRequired, options: needsOptions(editQType) ? editQOptions.filter(o => o.trim()).map((t, i) => ({ id: null, text: t, order_index: i })) : [] }
                        : q
                )
            })));
            setEditQModal(null);
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const deleteQuestion = async (sectionId, questionId) => {
        try {
            await axios.delete(`${API}/personnel-forms/${formId}/questions/${questionId}`);
            setSections(prev => prev.map(s =>
                s.id === sectionId ? { ...s, questions: (s.questions || []).filter(q => q.id !== questionId) } : s
            ));
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    const saveFormInfo = async () => {
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกข้อมูลแบบประเมินนี้ใช่หรือไม่?' });
        if (!ok) return;
        setSaving(true);
        try {
            await axios.put(`${API}/personnel-forms/${formId}`, { title: form.title, description: form.description });
            setSaveMsg('บันทึกแล้ว');
            setTimeout(() => setSaveMsg(''), 2000);
        } catch (e) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const needsOptions = (type) => ['single_choice', 'multiple_choice'].includes(type);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-[#21304A] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!form) return (
        <div className="text-center py-20 text-neutral-400">ไม่พบแบบประเมิน</div>
    );

    return (
        <div className="space-y-6">
            <ConfirmModal {...confirmModalProps} />

            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/personnel-forms')}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                            <input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="text-lg font-semibold text-neutral-900 dark:text-white bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#21304A] outline-none transition w-full"
                            />
                            <input
                                value={form.description || ''}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="คำอธิบายแบบประเมิน (ไม่บังคับ)"
                                className="text-sm text-neutral-500 dark:text-neutral-400 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#21304A] outline-none transition w-full mt-0.5"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {saveMsg && <span className="text-sm text-emerald-500 font-medium">{saveMsg}</span>}
                        <button
                            onClick={saveFormInfo}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            บันทึก
                        </button>
                    </div>
                </div>
            </div>

            {/* Sections */}
            {sections.map((section, sIdx) => (
                <div key={section.id} className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 px-6 py-4 bg-[#eef1f5] dark:bg-[#21304A]/10 border-b border-neutral-100 dark:border-neutral-800">
                        <GripVertical className="w-4 h-4 text-neutral-400" />
                        <input
                            value={section.title}
                            onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                            onBlur={e => updateSectionTitle(section.id, e.target.value)}
                            className="flex-1 font-semibold text-[#21304A] dark:text-[#a1afc5] bg-transparent outline-none text-sm"
                        />
                        <span className="text-xs text-neutral-400">{(section.questions || []).length} คำถาม</span>
                        <button onClick={() => deleteSection(section.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Questions */}
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {(section.questions || []).map((q, qIdx) => (
                            <div key={q.id} className="px-6 py-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                                <span className="mt-0.5 text-xs text-neutral-400 w-5 shrink-0">{qIdx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{q.text}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5">
                                            {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                                        </span>
                                        {q.is_required && (
                                            <span className="text-xs text-red-500 font-medium">*จำเป็น</span>
                                        )}
                                        {q.options && q.options.length > 0 && (
                                            <span className="text-xs text-neutral-400">{q.options.length} ตัวเลือก</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditQ({ ...q, section_id: section.id })} className="p-1.5 hover:bg-[#eef1f5] dark:hover:bg-[#21304A]/10 text-neutral-400 hover:text-[#21304A] transition-colors">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteQuestion(section.id, q.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add question button */}
                    <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            onClick={() => openAddQ(section.id)}
                            className="flex items-center gap-2 text-sm text-[#21304A] dark:text-[#a1afc5] hover:text-[#21304A] font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มคำถาม
                        </button>
                    </div>
                </div>
            ))}

            {/* Add Section */}
            <button
                onClick={openAddSection}
                disabled={saving}
                className="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-[#21304A] hover:text-[#21304A] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                เพิ่มหัวข้อ
            </button>

            {/* Add Section Modal */}
            {addSectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">เพิ่มหัวข้อใหม่</h3>
                            <button onClick={() => setAddSectionModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleAddSection} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ชื่อหัวข้อ *</label>
                                <input required value={sectionTitle} onChange={e => setSectionTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition" />
                            </div>
                            <hr className="border-neutral-100 dark:border-neutral-800" />
                            <p className="text-xs text-neutral-400">คำถามแรก (ไม่บังคับ — สามารถเพิ่มทีหลังได้)</p>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">คำถาม</label>
                                <textarea value={sectionQText} onChange={e => setSectionQText(e.target.value)} rows={2}
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ประเภทคำถาม</label>
                                    <select value={sectionQType} onChange={e => setSectionQType(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none appearance-none transition">
                                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={sectionQRequired} onChange={e => setSectionQRequired(e.target.checked)} className="accent-[#21304A] w-4 h-4" />
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300">จำเป็นต้องตอบ</span>
                                    </label>
                                </div>
                            </div>
                            {needsOptions(sectionQType) && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ตัวเลือก</label>
                                    <div className="space-y-2">
                                        {sectionQOptions.map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={opt} onChange={e => setSectionQOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                                    placeholder={`ตัวเลือกที่ ${i + 1}`}
                                                    className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition" />
                                                {sectionQOptions.length > 1 && (
                                                    <button type="button" onClick={() => setSectionQOptions(prev => prev.filter((_, j) => j !== i))} className="p-2 text-neutral-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setSectionQOptions(prev => [...prev, ''])}
                                            className="text-xs text-[#21304A] hover:text-[#21304A] font-medium flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> เพิ่มตัวเลือก
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setAddSectionModal(false)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors">{saving ? 'กำลังบันทึก...' : 'สร้างหัวข้อ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {addQModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">เพิ่มคำถาม</h3>
                            <button onClick={() => setAddQModal(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleAddQ} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">คำถาม *</label>
                                <textarea required value={qText} onChange={e => setQText(e.target.value)} rows={2}
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ประเภทคำถาม</label>
                                    <select value={qType} onChange={e => setQType(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none appearance-none transition">
                                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={qRequired} onChange={e => setQRequired(e.target.checked)} className="accent-[#21304A] w-4 h-4" />
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300">จำเป็นต้องตอบ</span>
                                    </label>
                                </div>
                            </div>
                            {needsOptions(qType) && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ตัวเลือก</label>
                                    <div className="space-y-2">
                                        {qOptions.map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={opt} onChange={e => setQOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                                    placeholder={`ตัวเลือกที่ ${i + 1}`}
                                                    className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition" />
                                                {qOptions.length > 1 && (
                                                    <button type="button" onClick={() => setQOptions(prev => prev.filter((_, j) => j !== i))} className="p-2 text-neutral-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setQOptions(prev => [...prev, ''])}
                                            className="text-xs text-[#21304A] hover:text-[#21304A] font-medium flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> เพิ่มตัวเลือก
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setAddQModal(null)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors">{saving ? 'กำลังบันทึก...' : 'เพิ่มคำถาม'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Question Modal */}
            {editQModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">แก้ไขคำถาม</h3>
                            <button onClick={() => setEditQModal(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleEditQ} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">คำถาม *</label>
                                <textarea required value={editQText} onChange={e => setEditQText(e.target.value)} rows={2}
                                    className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ประเภทคำถาม</label>
                                    <select value={editQType} onChange={e => setEditQType(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#21304A] outline-none appearance-none transition">
                                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editQRequired} onChange={e => setEditQRequired(e.target.checked)} className="accent-[#21304A] w-4 h-4" />
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300">จำเป็นต้องตอบ</span>
                                    </label>
                                </div>
                            </div>
                            {needsOptions(editQType) && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">ตัวเลือก</label>
                                    <div className="space-y-2">
                                        {editQOptions.map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={opt} onChange={e => setEditQOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                                                    className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-[#21304A] outline-none transition" />
                                                {editQOptions.length > 1 && (
                                                    <button type="button" onClick={() => setEditQOptions(prev => prev.filter((_, j) => j !== i))} className="p-2 text-neutral-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setEditQOptions(prev => [...prev, ''])} className="text-xs text-[#21304A] hover:text-[#21304A] font-medium flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> เพิ่มตัวเลือก
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditQModal(null)} className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-[#21304A] hover:bg-[#2d4060] disabled:opacity-60 text-white text-sm font-medium transition-colors">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
