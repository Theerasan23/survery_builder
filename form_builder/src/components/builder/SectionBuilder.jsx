import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import SortableQuestion from './SortableQuestion';

// Gradient accent colors per section index
const SECTION_COLORS = [
    'bg-[#21304A]',
    'bg-[#21304A]',
    'bg-[#21304A]',
    'bg-[#21304A]',
    'bg-[#21304A]',
    'bg-[#21304A]',
];

export default function SectionBuilder({ section, sectionIndex, updateSection, removeSection, availableAspects }) {
    const [collapsed, setCollapsed] = useState(false);

    const colorClass = SECTION_COLORS[sectionIndex % SECTION_COLORS.length];

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const addQuestion = () => {
        const newQuestion = {
            id: `q-${Date.now()}`,
            text: '',
            type: 'rating',
            is_required: true,
            options: ['Option 1']
        };
        updateSection(section.id, 'questions', [...section.questions, newQuestion]);
    };

    const updateQuestion = (questionId, field, value) => {
        const updatedQs = section.questions.map(q =>
            q.id === questionId ? { ...q, [field]: value } : q
        );
        updateSection(section.id, 'questions', updatedQs);
    };

    const removeQuestion = (questionId) => {
        updateSection(section.id, 'questions', section.questions.filter(q => q.id !== questionId));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = section.questions.findIndex(q => q.id === active.id);
            const newIndex = section.questions.findIndex(q => q.id === over.id);
            updateSection(section.id, 'questions', arrayMove(section.questions, oldIndex, newIndex));
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            {/* Gradient top bar */}
            <div className={`h-1 w-full ${colorClass}`} />

            {/* Section Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                {/* Index Badge */}
                <div className={`flex-shrink-0 w-9 h-9 ${colorClass} flex items-center justify-center shadow-sm`}>
                    <span className="text-white font-bold text-sm">{sectionIndex + 1}</span>
                </div>

                {/* Title & description inputs */}
                <div className="flex-1 min-w-0">
                    {availableAspects && availableAspects.length > 0 && (
                        <div className="mb-2">
                            <select
                                value={availableAspects.includes(section.title) ? section.title : ''}
                                onChange={(e) => {
                                    if (e.target.value) updateSection(section.id, 'title', e.target.value);
                                }}
                                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#21304A] focus:outline-none transition-colors"
                            >
                                <option value="">-- กำหนดชื่อหน้าเอง --</option>
                                {availableAspects.map((aspect, idx) => (
                                    <option key={idx} value={aspect}>{aspect}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        className="text-base font-bold bg-transparent border-b-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-[#21304A] outline-none w-full pb-0.5 text-neutral-800 dark:text-neutral-100 transition-colors"
                        placeholder="ชื่อหน้า (เช่น หน้าที่ 1: ด้านการให้บริการ)"
                    />
                    <input
                        type="text"
                        value={section.description || ''}
                        onChange={(e) => updateSection(section.id, 'description', e.target.value)}
                        className="text-xs text-neutral-400 dark:text-neutral-500 bg-transparent border-b-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-[#21304A] outline-none w-full pb-0.5 transition-colors mt-1"
                        placeholder="คำอธิบายหน้า (ไม่บังคับ)"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-xs text-neutral-400 font-medium mr-2 bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
                        {section.questions.length} ข้อ
                    </span>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? 'ขยาย' : 'ย่อ'}
                        className="p-2 text-neutral-400 hover:text-[#21304A] hover:bg-[#eef1f5] dark:hover:bg-[#21304A]/10 transition-all"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
                    </button>
                    <button
                        onClick={() => removeSection(section.id)}
                        title="ลบหน้านี้"
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Questions Body */}
            {!collapsed && (
                <div className="p-4 space-y-3">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={section.questions.map(q => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {section.questions.map((question, qIndex) => (
                                <SortableQuestion
                                    key={question.id}
                                    question={question}
                                    questionIndex={qIndex}
                                    updateQuestion={updateQuestion}
                                    removeQuestion={removeQuestion}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Add Question Button */}
                    <button
                        onClick={addQuestion}
                        className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 hover:text-[#21304A] dark:hover:text-[#a1afc5] hover:border-[#21304A] dark:hover:border-[#21304A] hover:bg-[#eef1f5]/50 dark:hover:bg-[#21304A]/10 font-semibold text-sm transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        เพิ่มคำถาม
                    </button>
                </div>
            )}

            {/* Collapsed preview */}
            {collapsed && section.questions.length > 0 && (
                <div className="px-5 py-2.5 text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50">
                    {section.questions.slice(0, 3).map((q, i) => (
                        <span key={q.id} className="inline-block mr-2 opacity-70">{i + 1}. {q.text || '(ไม่มีข้อความ)'}{i < Math.min(2, section.questions.length - 1) ? ' •' : ''}</span>
                    ))}
                    {section.questions.length > 3 && <span className="opacity-50">...และอีก {section.questions.length - 3} ข้อ</span>}
                </div>
            )}
        </div>
    );
}
