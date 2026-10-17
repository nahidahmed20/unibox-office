import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";

const todayDateStr = () => new Date().toISOString().slice(0, 10);

/**
 * Copy data to clipboard in TSV format
 */
export function copyTableData({ headers = [], rows = [] }) {
    if (!rows.length) {
        return Swal.fire("Empty!", "No data available to copy.", "warning");
    }

    const headerLine = headers.join("\t") + "\n";
    const bodyLines = rows.map(row => (Array.isArray(row) ? row.join("\t") : Object.values(row).join("\t"))).join("\n");
    const fullText = headerLine + bodyLines;

    navigator.clipboard.writeText(fullText);
    Swal.fire({
        icon: "success",
        title: "Copied to Clipboard!",
        text: `${rows.length} rows copied.`,
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
}

/**
 * Export structured JSON data to Excel (.xlsx)
 */
export function exportToExcel({ data = [], filename = "Export", sheetName = "Data" }) {
    if (!data.length) {
        return Swal.fire("Empty!", "No data available to export to Excel.", "warning");
    }

    try {
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-fit column widths
        const colWidths = Object.keys(data[0] || {}).map(key => {
            const maxLen = Math.max(
                key.length,
                ...data.map(row => String(row[key] ?? "").length)
            );
            return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
        });
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(file, `${filename}_${todayDateStr()}.xlsx`);

        Swal.fire({
            icon: "success",
            title: "Excel Downloaded!",
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Could not generate Excel file.", "error");
    }
}

/**
 * Export data to CSV (.csv)
 */
export function exportToCSV({ data = [], filename = "Export", headers = null, rows = null }) {
    try {
        let csvContent = "";

        if (headers && rows) {
            if (!rows.length) return Swal.fire("Empty!", "No data available to export.", "warning");
            const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";
            const rowLines = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
            csvContent = headerLine + rowLines;
        } else if (data.length) {
            const ws = XLSX.utils.json_to_sheet(data);
            csvContent = XLSX.utils.sheet_to_csv(ws);
        } else {
            return Swal.fire("Empty!", "No data available to export to CSV.", "warning");
        }

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, `${filename}_${todayDateStr()}.csv`);

        Swal.fire({
            icon: "success",
            title: "CSV Downloaded!",
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Could not generate CSV file.", "error");
    }
}

/**
 * Export table data to PDF (.pdf) using jsPDF & autoTable
 */
export function exportToPDF({ title = "Report", headers = [], rows = [], filename = "Report", orientation = "portrait" }) {
    if (!rows.length) {
        return Swal.fire("Empty!", "No data available to export to PDF.", "warning");
    }

    try {
        const doc = new jsPDF({
            orientation: orientation,
            unit: "pt",
            format: "a4"
        });

        // Header Title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(title, 40, 40);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 40, 56);

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 70,
            theme: "grid",
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8.5,
                halign: "left"
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 40, right: 40 },
            styles: {
                overflow: 'linebreak',
                cellPadding: 4
            }
        });

        doc.save(`${filename}_${todayDateStr()}.pdf`);

        Swal.fire({
            icon: "success",
            title: "PDF Downloaded!",
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Could not generate PDF file.", "error");
    }
}

/**
 * Clean Print handler for table by ID
 */
export function exportToPrint({ tableId = "printable-table", title = "Report" }) {
    const tableElem = document.getElementById(tableId);
    if (!tableElem) {
        window.print();
        return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        window.print();
        return;
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
                    h2 { margin: 0 0 6px 0; font-size: 20px; color: #0f172a; text-transform: uppercase; }
                    .date-info { font-size: 12px; color: #64748b; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
                    th, td { padding: 9px 12px; border: 1px solid #cbd5e1; }
                    th { background-color: #f1f5f9; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 11px; }
                    .no-print, [class*="no-print"] { display: none !important; }
                    .text-right { text-align: right !important; }
                    .text-center { text-align: center !important; }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <div class="date-info">Printed on: ${new Date().toLocaleString('en-GB')}</div>
                ${tableElem.outerHTML}
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 300);
}

