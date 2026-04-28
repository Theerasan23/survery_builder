'use client';

import { useState, useEffect } from 'react';
import { getFormById, createForm, updateForm } from '@/lib/actions';
import { PlusCircle, Save, Loader2, Link as LinkIcon, FileEdit, AlignLeft, Layers, Sparkles, Building2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import SectionBuilder from '@/components/builder/SectionBuilder';

export default function FormBuilderClient({ editId = null, initialTopics = [] }) {
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formOrganization, setFormOrganization] = useState('สำนักงานสาธารณสุขจังหวัดนนทบุรี');
    const [topicId, setTopicId] = useState('');
    const [topics, setTopics] = useState(initialTopics);
    const [sections, setSections] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [savedFormUuid, setSavedFormUuid] = useState(null);
    const [isLoading, setIsLoading] = useState(!!editId);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const { confirm, modalProps: confirmModalProps } = useConfirmModal();

    useEffect(() => {
        if (!editId) return;

        (async () => {
            try {
                const data = await getFormById(editId);
                setFormTitle(data.title);
                setFormDescription(data.description || '');
                setFormOrganization(data.organization || 'สำนักงานสาธารณสุขจังหวัดนนทบุรี');
                setTopicId(data.topic_id || '');

                const mapQuestion = q => ({
                    id: `q-${q.id}`,
                    text: q.text,
                    type: q.type,
                    is_required: q.is_required,
                    is_suggestion: !!q.is_suggestion,
                    image_url: q.image_url,
                    score: q.score ?? null,
                    quiz_label_style: q.quiz_label_style || 'abc',
                    columns_config: q.columns_config || null,
                    options: (q.options || []).map(o => ({ id: `o-${o.id}`, text: o.text, score: o.score ?? null }))
                });

                const loadedSections = (data.sections || []).map(s => ({
                    id: `s-${s.id}`,
                    title: s.title,
                    description: s.description || '',
                    questions: (s.questions || []).map(mapQuestion)
                }));

                if (data.unsectioned_questions?.length > 0) {
                    loadedSections.unshift({
                        id: `s-unsectioned-${Date.now()}`,
                        title: 'Basic Information',
                        description: '',
                        questions: data.unsectioned_questions.map(mapQuestion)
                    });
                }

                setSections(loadedSections);
                setSavedFormUuid(data.uuid);
            } catch (err) {
                console.error('Error fetching form for edit', err);
                alert('Failed to load form data');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [editId]);

    const addSection = () => {
        setSections([...sections, {
            id: `s-${Date.now()}`,
            title: '',
            description: '',
            questions: []
        }]);
    };

    const updateSection = (sectionId, field, value) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s));
    };

    const removeSection = (sectionId) => {
        setSections(sections.filter(s => s.id !== sectionId));
    };

    const saveForm = async () => {
        const ok = await confirm({ variant: 'save', message: 'ต้องการบันทึกฟอร์มนี้ใช่หรือไม่?' });
        if (!ok) return;
        setIsSaving(true);
        try {
            const payload = {
                topic_id: topicId || null,
                title: formTitle,
                description: formDescription,
                organization: formOrganization || null,
                sections: sections.map(s => ({
                    title: s.title,
                    description: s.description,
                    questions: s.questions.map((q, idx) => ({
                        text: q.text,
                        type: q.type,
                        is_required: q.is_required,
                        is_suggestion: !!q.is_suggestion,
                        image_url: q.image_url,
                        score: q.score ?? null,
                        quiz_label_style: q.quiz_label_style || 'abc',
                        order_index: idx,
                        options: ['multiple_choice', 'single_choice', 'dropdown', 'rating_grid', 'choice_suggestion', 'quiz', 'matrix'].includes(q.type) ? q.options : undefined,
                        columns_config: q.type === 'matrix' ? (q.columns_config || []) : undefined,
                    }))
                }))
            };

            if (editId) {
                const result = await updateForm(editId, payload);
                if (!result.ok) {
                    throw new Error(result.data?.error || `บันทึกไม่สำเร็จ (${result.status})`);
                }
            } else {
                const result = await createForm(payload);
                if (!result.ok) {
                    throw new Error(result.data?.error || `บันทึกไม่สำเร็จ (${result.status})`);
                }
                setSavedFormUuid(result.data.uuid);
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving form', error);
            alert(error.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-none bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">กำลังโหลดแบบฟอร์ม...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-24">

            {/* ─── Sticky Form Info Card ─── */}
            <div className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200/80 dark:border-neutral-800 overflow-hidden sticky top-4 z-20">
                <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5 items-start">

                        {/* Left: Form metadata */}
                        <div className="flex-1 space-y-3 min-w-0">
                            {/* Organization */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-none bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                                    <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">หน่วยงาน</label>
                                    <input
                                        type="text"
                                        value={formOrganization}
                                        onChange={(e) => setFormOrganization(e.target.value)}
                                        className="text-sm text-neutral-700 dark:text-neutral-300 bg-transparent border-b-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-cyan-400 focus:outline-none w-full transition-colors pb-1"
                                        placeholder="ชื่อหน่วยงาน..."
                                    />
                                </div>
                            </div>

                            {/* Topic Selector */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-none bg-primary-50 dark:bg-primary/20 flex items-center justify-center">
                                    <Layers className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">หัวข้อหลัก / Topic</label>
                                    <select
                                        value={topicId}
                                        onChange={(e) => {
                                            const newTopicId = e.target.value;
                                            setTopicId(newTopicId);
                                            if (newTopicId) {
                                                const selectedTopic = topics.find(t => t.id === parseInt(newTopicId));
                                                if (selectedTopic) {
                                                    setFormTitle(selectedTopic.title);
                                                    if (selectedTopic.description) setFormDescription(selectedTopic.description);
                                                }
                                            }
                                        }}
                                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none focus:border-transparent transition-all"
                                    >
                                        <option value="">-- กำหนดชื่อเอง (Custom) --</option>
                                        {topics.map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Form Title */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-none bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                    <FileEdit className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">ชื่อแบบสอบถาม</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="text-lg font-bold bg-transparent border-b-2 border-neutral-200 dark:border-neutral-700 hover:border-violet-400 dark:hover:border-violet-600 focus:border-violet-500 focus:outline-none w-full transition-colors pb-1 text-neutral-800 dark:text-neutral-100"
                                        placeholder="พิมพ์ชื่อแบบสอบถาม..."
                                    />
                                </div>
                            </div>

                            {/* Form Description */}
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-7 h-7 flex-shrink-0 rounded-none bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                                    <AlignLeft className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">คำอธิบาย</label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="text-sm text-neutral-500 dark:text-neutral-400 bg-transparent border-b-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-sky-400 focus:outline-none w-full transition-colors pb-1"
                                        placeholder="คำอธิบายแบบสอบถาม..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right: Stats + Actions */}
                        <div className="flex flex-col gap-3 lg:items-end lg:min-w-[200px] w-full lg:w-auto">
                            <div className="flex gap-2 flex-wrap lg:justify-end">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-none bg-primary-50 dark:bg-primary/15 border border-primary-100 dark:border-primary/30 text-primary dark:text-primary-light text-xs font-semibold">
                                    <Layers className="w-3 h-3" />
                                    {sections.length} หน้า
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-none bg-primary-50 dark:bg-primary/15 border border-primary-100 dark:border-primary/30 text-primary dark:text-primary-light text-xs font-semibold">
                                    <FileEdit className="w-3 h-3" />
                                    {totalQuestions} คำถาม
                                </div>
                            </div>
                            <div className="flex gap-2 w-full lg:w-auto">
                                {savedFormUuid && (
                                    <a
                                        href={`/form/${savedFormUuid}`}
                                        target="_blank" rel="noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-none transition-all font-medium text-sm border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        <span>ดูฟอร์ม</span>
                                    </a>
                                )}
                                <button
                                    onClick={saveForm}
                                    disabled={isSaving}
                                    className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 font-semibold rounded-none shadow-md transition-all text-sm ${
                                        saveSuccess
                                            ? 'bg-emerald-500 shadow-emerald-500/30 text-white'
                                            : 'bg-primary hover:bg-primary-dark text-white shadow-primary/30 hover:-translate-y-0.5'
                                    } disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none`}
                                >
                                    {isSaving
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : saveSuccess
                                            ? <span>✓</span>
                                            : <Save className="w-4 h-4" />
                                    }
                                    <span>{isSaving ? 'กำลังบันทึก...' : saveSuccess ? 'บันทึกแล้ว!' : 'บันทึกฟอร์ม'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal {...confirmModalProps} />

            {/* ─── Builder Canvas ─── */}
            <div className="space-y-4 min-h-[500px]">
                {(() => {
                    let availableAspects = [];
                    if (topicId) {
                        const selectedTopic = topics.find(t => t.id === parseInt(topicId));
                        if (selectedTopic && selectedTopic.aspects) {
                            try {
                                availableAspects = typeof selectedTopic.aspects === 'string'
                                    ? JSON.parse(selectedTopic.aspects)
                                    : selectedTopic.aspects;
                            } catch (e) { }
                        }
                    }

                    return sections.length === 0 ? (
                        <div className="relative overflow-hidden flex flex-col items-center justify-center p-16 text-center rounded-none border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-gradient-to-br from-neutral-50 to-primary-50/30 dark:from-neutral-900/50 dark:to-primary/10 mt-6">
                            <div className="absolute top-8 right-12 w-32 h-32 bg-primary/10 rounded-none blur-3xl pointer-events-none" />
                            <div className="absolute bottom-8 left-12 w-24 h-24 bg-primary/10 rounded-none blur-2xl pointer-events-none" />
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-none bg-primary shadow-xl shadow-primary/30 flex items-center justify-center">
                                    <Sparkles className="w-9 h-9 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-light rounded-none border-2 border-white dark:border-neutral-900 flex items-center justify-center">
                                    <PlusCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">เริ่มสร้างแบบฟอร์ม</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
                                เริ่มต้นด้วยการเพิ่ม &ldquo;หน้า&rdquo; เพื่อจัดกลุ่มคำถามที่เกี่ยวข้องกัน แล้วเพิ่มคำถามในแต่ละหน้า
                            </p>
                            <button
                                onClick={addSection}
                                className="flex items-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-none shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0"
                            >
                                <PlusCircle className="w-5 h-5" />
                                เพิ่มหน้าแรก
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sections.map((section, sectionIndex) => (
                                <SectionBuilder
                                    key={section.id}
                                    section={section}
                                    sectionIndex={sectionIndex}
                                    updateSection={updateSection}
                                    removeSection={removeSection}
                                    availableAspects={availableAspects}
                                />
                            ))}
                            <button
                                onClick={addSection}
                                className="w-full flex items-center justify-center gap-3 p-5 rounded-none border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-primary bg-neutral-50 dark:bg-neutral-900/40 hover:bg-primary-50/50 dark:hover:bg-primary/20 text-neutral-500 dark:text-neutral-400 hover:text-primary font-semibold transition-all group mt-2"
                            >
                                <div className="w-8 h-8 rounded-none bg-neutral-200 dark:bg-neutral-800 group-hover:bg-primary-50 dark:group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                    <PlusCircle className="w-4 h-4" />
                                </div>
                                เพิ่มหน้าใหม่
                            </button>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
