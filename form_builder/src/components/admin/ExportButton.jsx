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
                alert('No responses yet to export.');
                return;
            }

            // Convert JSON to CSV
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
            ].join('\n');

            // Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `form_${formId}_responses.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export CSV');
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
            <span>CSV</span>
        </button>
    );
}
