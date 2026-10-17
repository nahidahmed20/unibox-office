import React from 'react';
import { copyTableData, exportToExcel, exportToCSV, exportToPDF, exportToPrint } from '@/Utils/exportUtils';

export default function TableExportButtons({
    data = [],
    headers = [],
    rows = [],
    filename = 'Export',
    title = 'Report',
    tableId = 'printable-table',
    pdfOrientation = 'portrait',
    onCopy,
    onExcel,
    onCSV,
    onPDF,
    onPrint,
    showCopy = true,
    showExcel = true,
    showCSV = true,
    showPDF = true,
    showPrint = true,
    className = ''
}) {
    const handleCopy = () => {
        if (onCopy) return onCopy();
        copyTableData({ headers, rows });
    };

    const handleExcel = () => {
        if (onExcel) return onExcel();
        exportToExcel({ data, filename, sheetName: title });
    };

    const handleCSV = () => {
        if (onCSV) return onCSV();
        exportToCSV({ data, filename, headers, rows });
    };

    const handlePDF = () => {
        if (onPDF) return onPDF();
        exportToPDF({ title, headers, rows, filename, orientation: pdfOrientation });
    };

    const handlePrint = () => {
        if (onPrint) return onPrint();
        exportToPrint({ tableId, title });
    };

    return (
        <div className={`flex flex-wrap items-center gap-1.5 shrink-0 ${className}`}>
            {showCopy && (
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 shadow-xs active:scale-95 cursor-pointer"
                    title="Copy to Clipboard"
                >
                    <i className="fa-solid fa-copy text-blue-500 text-[12px]"></i>
                    <span className="hidden sm:inline">Copy</span>
                </button>
            )}

            {showExcel && (
                <button
                    type="button"
                    onClick={handleExcel}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-[12.5px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 shadow-xs active:scale-95 cursor-pointer"
                    title="Download Excel (.xlsx)"
                >
                    <i className="fa-solid fa-file-excel text-emerald-600 text-[12px]"></i>
                    <span>Excel</span>
                </button>
            )}

            {showCSV && (
                <button
                    type="button"
                    onClick={handleCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200/80 bg-teal-50/80 px-3 py-2 text-[12.5px] font-bold text-teal-700 transition-all hover:bg-teal-100 hover:border-teal-300 shadow-xs active:scale-95 cursor-pointer"
                    title="Download CSV (.csv)"
                >
                    <i className="fa-solid fa-file-csv text-teal-600 text-[12px]"></i>
                    <span>CSV</span>
                </button>
            )}

            {showPDF && (
                <button
                    type="button"
                    onClick={handlePDF}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-[12.5px] font-bold text-rose-700 transition-all hover:bg-rose-100 hover:border-rose-300 shadow-xs active:scale-95 cursor-pointer"
                    title="Download PDF Document"
                >
                    <i className="fa-solid fa-file-pdf text-rose-600 text-[12px]"></i>
                    <span>PDF</span>
                </button>
            )}

            {showPrint && (
                <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 shadow-xs active:scale-95 cursor-pointer"
                    title="Print Table"
                >
                    <i className="fa-solid fa-print text-slate-500 text-[12px]"></i>
                    <span className="hidden sm:inline">Print</span>
                </button>
            )}
        </div>
    );
}

