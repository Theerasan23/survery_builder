'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportFormResponses } from '@/lib/api';

export default function ExportButton({ formId }) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await exportFormResponses(formId);
            if (!data || data.length === 0) {
                alert('ยังไม่มีข้อมูลสำหรับ export');
                return;
            }

            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Responses');
            XLSX.writeFile(wb, `form_${formId}_responses.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export ไม่สำเร็จ');
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef1f5] hover:bg-[#eef1f5] text-[#21304A] dark:bg-[#21304A]/10 dark:hover:bg-[#21304A]/20 dark:text-[#a1afc5] text-sm font-medium transition-colors"
        >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Excel</span>
        </button>
    );
}
