import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Image as ImageIcon, Database, Star, AlignLeft, AlignJustify, CheckSquare, Circle, ChevronDown, Grid3x3, Plus, Users, BookOpen, Building2, Heading, MessageSquarePlus, Lightbulb, X, Upload } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptionSets, uploadImage } from '@/lib/actions';


const TYPE_CONFIG = {
    rating:          { label: 'Rating 1–5',      icon: Star,       color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    rating_grid:     { label: 'Rating Grid',      icon: Grid3x3,    color: 'bg-[#eef1f5] text-[#21304A] dark:bg-[#21304A]/15 dark:text-[#a1afc5]' },
    short_text:      { label: 'Short Text',       icon: AlignLeft,  color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
    long_text:       { label: 'Long Text',        icon: AlignJustify, color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400' },
    single_choice:   { label: 'Single Choice',    icon: Circle,     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
    multiple_choice: { label: 'Multiple Choice',  icon: CheckSquare, color: 'bg-[#eef1f5] text-[#21304A] dark:bg-[#21304A]/15 dark:text-[#a1afc5]' },
    dropdown:        { label: 'Dropdown',         icon: ChevronDown, color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
    gender:          { label: 'เพศ (Gender)',     icon: Users,      color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400' },
    quiz:            { label: 'Quiz (ข้อสอบ)',    icon: BookOpen,   color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
    organization:    { label: 'หน่วยงาน',         icon: Building2,  color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400' },
    heading:         { label: 'หัวข้อ / ส่วน',    icon: Heading,    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
    choice_suggestion: { label: 'ตัวเลือก + ข้อเสนอแนะ', icon: MessageSquarePlus, color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400' },
};

const RATING_LABELS = ['น้อยที่สุด', 'น้อย', 'ปานกลาง', 'มาก', 'มากที่สุด'];
const QUIZ_LABELS = ['A', 'B', 'C', 'D'];

// Single source of truth for type options — used by both desktop and mobile selectors
const QUESTION_TYPE_OPTIONS = [
    { value: 'heading',          label: 'หัวข้อ / ส่วน (Heading)' },
    { value: 'gender',           label: 'เพศ (Gender)' },
    { value: 'organization',     label: 'หน่วยงาน (Organization)' },
    { value: 'rating',           label: 'Rating (1-5)' },
    { value: 'rating_grid',      label: 'Rating Grid (ตาราง)' },
    { value: 'quiz',             label: 'Quiz (ข้อสอบ 4 ตัวเลือก)' },
    { value: 'short_text',       label: 'Short Text' },
    { value: 'long_text',        label: 'Long Text' },
    { value: 'single_choice',    label: 'Single Choice' },
    { value: 'multiple_choice',  label: 'Multiple Choice' },
    { value: 'dropdown',         label: 'Dropdown' },
    { value: 'choice_suggestion',label: 'ตัวเลือก + ข้อเสนอแนะ' },
];

export default function SortableQuestion({ question, questionIndex, updateQuestion, removeQuestion }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

    const [optionSets, setOptionSets] = useState([]);
    const [loadingSets, setLoadingSets] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setUploadingImage(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const result = await uploadImage(fd);
            if (!result?.ok) throw new Error('Upload failed');
            updateQuestion(question.id, 'image_url', `/api${result.data.url}`);
        } catch (err) {
            alert('อัปโหลดรูปไม่สำเร็จ: ' + (err?.message || 'unknown error'));
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = () => updateQuestion(question.id, 'image_url', null);

    const fetchOptionSets = useCallback(async () => {
        try {
            setLoadingSets(true);
            const data = await getOptionSets();
            setOptionSets(data);
        } catch (error) {
            console.error('Failed to fetch option sets', error);
        } finally {
            setLoadingSets(false);
        }
    }, []);

    useEffect(() => {
        const needsSets = ['single_choice', 'multiple_choice', 'dropdown', 'rating_grid', 'choice_suggestion'].includes(question.type);
        // Cache guard: only fetch if not already loaded
        if (needsSets && optionSets.length === 0) {
            fetchOptionSets();
        }
        // Auto-initialize quiz options to 4 empty choices
        if (question.type === 'quiz' && (!question.options || question.options.length === 0)) {
            updateQuestion(question.id, 'options', ['', '', '', '']);
        }
    }, [question.type]); // eslint-disable-line react-hooks/exhaustive-deps

    // Shared option mutation helpers
    // updateOptionAt — for plain-string types (rating_grid)
    const updateOptionAt = (idx, value) => {
        const newOpts = [...(question.options || [])];
        newOpts[idx] = value;
        updateQuestion(question.id, 'options', newOpts);
    };
    // updateOptionTextAt — for scored choice types: preserves existing score
    const updateOptionTextAt = (idx, text) => {
        const newOpts = [...(question.options || [])];
        const existing = newOpts[idx];
        const existingScore = (typeof existing === 'object' && existing !== null) ? existing.score : null;
        newOpts[idx] = { text, score: existingScore };
        updateQuestion(question.id, 'options', newOpts);
    };
    // updateOptionScoreAt — updates score, preserves text
    const updateOptionScoreAt = (idx, rawVal) => {
        const newOpts = [...(question.options || [])];
        const existing = newOpts[idx];
        const text = (typeof existing === 'object' && existing !== null) ? (existing.text ?? '') : (existing ?? '');
        const parsed = rawVal === '' ? null : parseFloat(rawVal);
        newOpts[idx] = { text, score: (parsed != null && !isNaN(parsed)) ? parsed : null };
        updateQuestion(question.id, 'options', newOpts);
    };
    const removeOptionAt = (idx) => {
        updateQuestion(question.id, 'options', (question.options || []).filter((_, i) => i !== idx));
    };

    const handleApplyOptionSet = (e) => {
        const setId = e.target.value;
        if (!setId) return;
        const selectedSet = optionSets.find(s => s.id === parseInt(setId));
        if (selectedSet && selectedSet.options) {
            updateQuestion(question.id, 'options', selectedSet.options.map(opt => typeof opt === 'string' ? opt : opt.text));
        }
        e.target.value = '';
    };

    const typeConf = TYPE_CONFIG[question.type] || TYPE_CONFIG.rating;
    const TypeIcon = typeConf.icon;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.6 : 1,
    };

    const isRatingGrid    = question.type === 'rating_grid';
    const isGender        = question.type === 'gender';
    const isQuiz          = question.type === 'quiz';
    const isOrganization  = question.type === 'organization';
    const isHeading       = question.type === 'heading';
    const hasChoiceOpts   = ['single_choice', 'multiple_choice', 'dropdown', 'choice_suggestion'].includes(question.type);
    // Types where each option can carry an optional point score
    const hasScoreOpts    = ['single_choice', 'multiple_choice', 'dropdown', 'choice_suggestion'].includes(question.type);
    // Types where a single question-level score can be assigned
    const hasQScore       = ['short_text', 'long_text'].includes(question.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-neutral-50 dark:bg-neutral-800/50 border ${isDragging
                ? 'border-[#21304A] shadow-lg shadow-[#21304A]/20 bg-white dark:bg-neutral-800'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                } overflow-hidden transition-all group`}
        >
            {/* ── Header Row ── */}
            <div className="border-b border-neutral-100 dark:border-neutral-700/60 bg-white dark:bg-neutral-800">
                {/* Top: drag + number + type selector */}
                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <div {...attributes} {...listeners} title="ลากเพื่อเรียง"
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 text-neutral-300 hover:text-[#21304A] dark:text-neutral-600 dark:hover:text-[#a1afc5] hover:bg-[#eef1f5] dark:hover:bg-[#21304A]/10 transition-all">
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold">
                        {questionIndex + 1}
                    </span>

                    <div className="flex-1" />

                    {/* Type Badge Selector */}
                    <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 text-xs font-semibold flex-shrink-0 ${typeConf.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        <select
                            value={question.type}
                            onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold cursor-pointer appearance-none"
                            style={{ color: 'inherit' }}
                        >
                            {QUESTION_TYPE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => removeQuestion(question.id)} title="ลบคำถามนี้"
                        className="flex-shrink-0 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:text-neutral-600 dark:hover:text-red-400 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Question text — single input */}
                <div className="px-3 pb-2 pt-1">
                    <input
                        type="text"
                        value={question.text || ''}
                        onChange={e => updateQuestion(question.id, 'text', e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-semibold text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                        placeholder={
                            isHeading    ? 'พิมพ์หัวข้อส่วน...' :
                            isGender     ? 'ป้ายคำถามเพศ (เช่น เพศ)' :
                            isQuiz       ? 'พิมพ์โจทย์คำถาม...' :
                            isRatingGrid ? 'ชื่อหัวข้อกลุ่มคำถาม...' :
                            'พิมพ์คำถาม...'
                        }
                    />
                </div>
            </div>

            {/* Mobile type selector */}
            <div className="sm:hidden px-3 pt-2">
                <select
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-xs focus:outline-none focus:ring-2 focus:ring-[#21304A]/50"
                >
                    {QUESTION_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* ── GENDER: Inline preview ── */}
            {isGender && (
                <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Preview การแสดงผล</span>
                    </div>
                    <div className="flex items-center gap-6 px-4 py-3 bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20">
                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                            {question.text || 'เพศ'}
                        </span>
                        {[{ label: 'หญิง', icon: '♀' }, { label: 'ชาย', icon: '♂' }].map(opt => (
                            <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                                <div className="w-4 h-4 rounded-none border-2 border-pink-400 dark:border-pink-500 flex-shrink-0" />
                                <span className="text-sm text-neutral-700 dark:text-neutral-200 font-medium">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 pl-1">
                        ตัวเลือก หญิง / ชาย จะถูกแสดงในบรรทัดเดียวกันบนฟอร์ม
                    </p>
                </div>
            )}

            {/* ── ORGANIZATION: Preview ── */}
            {isOrganization && (
                <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Preview การแสดงผล</span>
                    </div>
                    <div className="space-y-2 px-4 py-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20">
                        <div>
                            <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">หน่วยงาน</p>
                            <div className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-none text-xs text-neutral-400 italic">
                                ระบุชื่อหน่วยงานของท่าน...
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">กลุ่มงาน / ฝ่าย / รายละเอียดเพิ่มเติม</p>
                            <div className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-none text-xs text-neutral-400 italic">
                                ระบุกลุ่มงานหรือฝ่ายของท่าน...
                            </div>
                        </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 pl-1">
                        ผู้ตอบกรอกชื่อหน่วยงานและกลุ่มงาน/ฝ่ายเอง (มีค่าเริ่มต้นจาก System Settings ให้แก้ไขได้)
                    </p>
                </div>
            )}

            {/* ── QUIZ: 4 labeled options ── */}
            {isQuiz && (
                <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ตัวเลือก A–D</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {QUIZ_LABELS.map((label, idx) => {
                            const opts = question.options || ['', '', '', ''];
                            const val = opts[idx];
                            return (
                                <div key={label} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                                    <span className="flex-shrink-0 w-7 h-7 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-black flex items-center justify-center">
                                        {label}
                                    </span>
                                    <input
                                        type="text"
                                        value={typeof val === 'object' ? (val?.text || '') : (val || '')}
                                        onChange={(e) => {
                                            const newOpts = [...(question.options || ['', '', '', ''])];
                                            newOpts[idx] = e.target.value;
                                            updateQuestion(question.id, 'options', newOpts);
                                        }}
                                        className="flex-1 bg-transparent border-none outline-none text-xs text-neutral-700 dark:text-neutral-300 font-medium placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                                        placeholder={`ตัวเลือก ${label}...`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-neutral-400 pl-1 pt-1">
                        บนฟอร์มจะแสดงเหมือนข้อสอบ — ผู้ตอบเลือกได้ 1 ข้อ
                    </p>
                </div>
            )}

            {/* ── RATING GRID ── */}
            {isRatingGrid && (
                <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#eef1f5] dark:bg-[#21304A]/10 border border-[#21304A]/20 dark:border-[#21304A]/20">
                        <Database className="w-3.5 h-3.5 text-[#21304A] flex-shrink-0" />
                        <select onChange={handleApplyOptionSet} defaultValue="" className="flex-1 text-xs bg-transparent border-none focus:ring-0 outline-none text-[#21304A] dark:text-[#a1afc5] font-medium cursor-pointer">
                            <option value="" disabled>{loadingSets ? 'กำลังโหลด...' : 'โหลดรายการจาก Master Options...'}</option>
                            {optionSets.map(set => (
                                <option key={set.id} value={set.id}>{set.name} ({set.options?.length || 0} รายการ)</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-neutral-100 dark:bg-neutral-800">
                                    <th className="px-3 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 border-b border-r border-neutral-200 dark:border-neutral-700 w-1/2">หัวข้อย่อย / คำถาม</th>
                                    {[5, 4, 3, 2, 1].map((score, i) => (
                                        <th key={score} className="px-2 py-2 text-center text-xs font-bold text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 min-w-[70px]">
                                            <span className="block text-sm font-bold">{score}</span>
                                            <span className="block text-[10px] font-normal text-neutral-400 whitespace-nowrap">{RATING_LABELS[4 - i]}</span>
                                        </th>
                                    ))}
                                    <th className="w-7 border-b border-neutral-200 dark:border-neutral-700" />
                                </tr>
                            </thead>
                            <tbody>
                                {(question.options || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600 italic">
                                            ยังไม่มีหัวข้อย่อย — กดปุ่ม &ldquo;เพิ่มหัวข้อย่อย&rdquo; ด้านล่าง
                                        </td>
                                    </tr>
                                ) : (question.options || []).map((opt, idx) => (
                                    <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group/row">
                                        <td className="px-3 py-2 border-r border-neutral-100 dark:border-neutral-800">
                                            <input
                                                type="text"
                                                value={opt.text || opt}
                                                onChange={(e) => updateOptionAt(idx, e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-[#21304A]/40 dark:hover:border-[#21304A]/60 focus:border-[#21304A] outline-none text-xs text-neutral-700 dark:text-neutral-300 pb-0.5 transition-colors"
                                                placeholder={`${idx + 1}. หัวข้อย่อย...`}
                                            />
                                        </td>
                                        {[5, 4, 3, 2, 1].map(score => (
                                            <td key={score} className="px-2 py-2 text-center">
                                                <div className="w-5 h-5 rounded-none border-2 border-neutral-300 dark:border-neutral-600 mx-auto opacity-40" />
                                            </td>
                                        ))}
                                        <td className="px-1 py-2">
                                            <button onClick={() => removeOptionAt(idx)}
                                                className="opacity-0 group-hover/row:opacity-100 p-1 text-neutral-300 hover:text-red-400 transition-all rounded-none">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={() => {
                            const newOpts = [...(question.options || []), `หัวข้อย่อยที่ ${(question.options?.length || 0) + 1}`];
                            updateQuestion(question.id, 'options', newOpts);
                        }}
                        className="flex items-center gap-1.5 text-xs text-[#21304A] dark:text-[#a1afc5] hover:text-[#2d4060] dark:hover:text-white font-semibold transition-colors pl-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มหัวข้อย่อย
                    </button>
                </div>
            )}

            {/* ── CHOICE OPTIONS (single / multiple / dropdown / choice_suggestion) ── */}
            {hasChoiceOpts && (
                <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#eef1f5] dark:bg-[#21304A]/10 border border-[#21304A]/20 dark:border-[#21304A]/20">
                        <Database className="w-3.5 h-3.5 text-[#21304A] flex-shrink-0" />
                        <select onChange={handleApplyOptionSet} defaultValue="" className="flex-1 text-xs bg-transparent border-none focus:ring-0 outline-none text-[#21304A] dark:text-[#a1afc5] font-medium cursor-pointer">
                            <option value="" disabled>{loadingSets ? 'กำลังโหลด...' : 'โหลดจาก Master Options...'}</option>
                            {optionSets.map(set => (
                                <option key={set.id} value={set.id}>{set.name} ({set.options?.length || 0} รายการ)</option>
                            ))}
                        </select>
                    </div>

                    {/* Column header — only shown for scored types */}
                    {hasScoreOpts && (question.options || []).length > 0 && (
                        <div className="flex items-center gap-2 px-1 pb-0.5">
                            <div className="w-3.5 flex-shrink-0" />
                            <span className="flex-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">ตัวเลือก</span>
                            <span className="w-20 text-center text-[10px] font-semibold text-amber-500 uppercase tracking-wider">คะแนน</span>
                            <div className="w-4 flex-shrink-0" />
                        </div>
                    )}

                    <div className="space-y-1">
                        {(question.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/opt">
                                <div className="w-3.5 h-3.5 rounded-none border-2 border-neutral-300 dark:border-neutral-600 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={opt.text ?? opt}
                                    onChange={(e) => hasScoreOpts ? updateOptionTextAt(idx, e.target.value) : updateOptionAt(idx, e.target.value)}
                                    className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-[#21304A] outline-none text-xs text-neutral-600 dark:text-neutral-400 pb-0.5 transition-colors"
                                    placeholder={`ตัวเลือก ${idx + 1}`}
                                />
                                {hasScoreOpts && (
                                    <input
                                        type="number"
                                        value={opt?.score ?? ''}
                                        onChange={(e) => updateOptionScoreAt(idx, e.target.value)}
                                        className="w-20 px-2 py-0.5 text-xs text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-none outline-none focus:border-amber-400 dark:focus:border-amber-400 placeholder:text-amber-300 dark:placeholder:text-amber-700 transition-colors"
                                        placeholder="คะแนน"
                                        step="0.5"
                                    />
                                )}
                                <button onClick={() => removeOptionAt(idx)}
                                    className="opacity-0 group-hover/opt:opacity-100 text-neutral-300 hover:text-red-400 transition-all flex-shrink-0">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            const defaultOpt = hasScoreOpts
                                ? { text: `ตัวเลือก ${(question.options?.length || 0) + 1}`, score: null }
                                : `ตัวเลือก ${(question.options?.length || 0) + 1}`;
                            updateQuestion(question.id, 'options', [...(question.options || []), defaultOpt]);
                        }}
                        className="text-xs text-[#21304A] hover:text-[#2d4060] dark:hover:text-[#a1afc5] font-semibold pl-5 transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> เพิ่มตัวเลือก
                    </button>

                    {question.type === 'choice_suggestion' && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 px-3 py-2">
                            แต่ละตัวเลือกจะมีปุ่ม &ldquo;ข้อเสนอเพื่อปรับปรุง (โปรดระบุ)&rdquo; คู่กันบนฟอร์มโดยอัตโนมัติ
                        </p>
                    )}
                    {hasScoreOpts && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 pl-1">
                            ช่อง &ldquo;คะแนน&rdquo; ไม่บังคับ — ถ้าไม่ใส่ จะไม่นำมาคิดคะแนน
                        </p>
                    )}
                </div>
            )}

            {/* ── Footer: Required + Suggestion + Score + Image ── */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 dark:border-neutral-700/60 bg-white dark:bg-neutral-800">
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-[#21304A] transition-colors select-none">
                        <input
                            type="checkbox"
                            checked={question.is_required !== false}
                            onChange={(e) => updateQuestion(question.id, 'is_required', e.target.checked)}
                            className="rounded-none border-neutral-300 text-[#21304A] focus:ring-[#21304A] w-3 h-3"
                        />
                        จำเป็น
                    </label>

                    {!isHeading && (
                        <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors select-none ${question.is_suggestion ? 'text-teal-600 dark:text-teal-400' : 'text-neutral-400 hover:text-teal-500'}`}>
                            <input
                                type="checkbox"
                                checked={!!question.is_suggestion}
                                onChange={(e) => updateQuestion(question.id, 'is_suggestion', e.target.checked)}
                                className="rounded-none border-neutral-300 text-teal-600 focus:ring-teal-500 w-3 h-3"
                            />
                            <Lightbulb className="w-3 h-3" />
                            ข้อเสนอแนะ
                        </label>
                    )}

                    {hasQScore && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">คะแนน</span>
                            <input
                                type="number"
                                value={question.score ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    updateQuestion(question.id, 'score', v === '' ? null : parseFloat(v));
                                }}
                                className="w-20 px-2 py-0.5 text-xs text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-none outline-none focus:border-amber-400 placeholder:text-amber-300 dark:placeholder:text-amber-700 transition-colors"
                                placeholder="ไม่บังคับ"
                                step="0.5"
                                min="0"
                            />
                        </div>
                    )}

                    {!isRatingGrid && !isGender && !isOrganization && question.type !== 'choice_suggestion' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                disabled={uploadingImage}
                                className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${question.image_url ? 'text-[#21304A] hover:text-[#2d4060]' : 'text-neutral-400 hover:text-[#21304A]'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploadingImage
                                    ? <Upload className="w-3 h-3 animate-pulse" />
                                    : <ImageIcon className="w-3 h-3" />}
                                {uploadingImage
                                    ? 'กำลังอัปโหลด...'
                                    : (question.image_url ? 'เปลี่ยนรูป' : 'เพิ่มรูป')}
                            </button>
                            {question.image_url && !uploadingImage && (
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="flex items-center text-xs text-neutral-400 hover:text-red-500 transition-colors"
                                    title="ลบรูป"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                    {question.type === 'choice_suggestion' && (
                        <input
                            type="text"
                            value={question.image_url || ''}
                            onChange={e => updateQuestion(question.id, 'image_url', e.target.value)}
                            className="flex-1 text-xs px-2 py-1 bg-transparent border-b border-transparent hover:border-teal-300 focus:border-teal-500 outline-none text-teal-600 dark:text-teal-400"
                            placeholder="ป้ายข้อเสนอแนะ (เช่น ข้อเสนอเพื่อปรับปรุง / ควรเพิ่มเติม)"
                        />
                    )}
                </div>

                {question.image_url && !isRatingGrid && !isGender && !isOrganization && question.type !== 'choice_suggestion' && (
                    <div className="w-8 h-8 rounded-none overflow-hidden border border-neutral-200 dark:border-neutral-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={question.image_url} alt="question" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
        </div>
    );
}
