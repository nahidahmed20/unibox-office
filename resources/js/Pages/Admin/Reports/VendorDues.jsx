import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function VendorDues({ vendorDues = { data: [], links: [] }, grandTotal = 0, grandTotalAdvance = 0 }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || ""
    );
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 25);
    });
    
    const isFirstRender = useRef(true);
    const vendorsList = vendorDues?.data || [];

    // --- Live Search & Pagination Sync ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            router.get(
                route("admin.vendor-dues"),
                { search: searchTerm, per_page: perPage },
                { preserveState: true, replace: true }
            );
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    /* =========================================
       EXPORT FUNCTIONS (Copy, CSV, Excel, PDF, Print)
    ========================================= */
    const handleCopy = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = vendorsList
            .map((v, idx) => `${(vendorDues.from || 1) + idx}\t${v.vendor_name}\t${v.total_due > 0 ? 'Payable' : (v.wallet_balance > 0 ? 'Advance Given' : 'Clear')}\t${v.total_due || 0}\t${v.wallet_balance || 0}`)
            .join("\n");
        navigator.clipboard.writeText("SL\tVendor Name\tStatus\tTotal Due (Payable)\tAdvance (Wallet Balance)\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Vendor Name,Status,Total Due (Payable),Advance (Wallet Balance)\n"];
        const rows = vendorsList.map((v, idx) =>
            `"${(vendorDues.from || 1) + idx}","${v.vendor_name}","${v.total_due > 0 ? 'Payable' : (v.wallet_balance > 0 ? 'Advance' : 'Clear')}","${v.total_due || 0}","${v.wallet_balance || 0}"`
        );
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Accounts_Payable_${new Date().toISOString().slice(0,10)}.csv`); link.click();
    };

    const handleExcel = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            vendorsList.map((v, idx) => ({
                "SL": (vendorDues.from || 1) + idx,
                "Vendor Name": v.vendor_name,
                "Status": v.total_due > 0 ? 'Payable' : (v.wallet_balance > 0 ? 'Advance Given' : 'Settled'),
                "Total Due": parseFloat(v.total_due || 0),
                "Advance Wallet": parseFloat(v.wallet_balance || 0)
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payables");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Accounts_Payable_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePDF = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['SL', 'Vendor Name', 'Status', 'Total Due', 'Advance']],
            body: vendorsList.map((v, idx) => [
                (vendorDues.from || 1) + idx,
                v.vendor_name,
                v.total_due > 0 ? 'Payable' : (v.wallet_balance > 0 ? 'Advance Given' : 'Clear'),
                `BDT ${parseFloat(v.total_due || 0).toLocaleString()}`,
                `BDT ${parseFloat(v.wallet_balance || 0).toLocaleString()}`
            ])
        });
        doc.save(`Accounts_Payable_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-vendor-dues-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Accounts Payable & Vendor Advances Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;}
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        .summary { display: flex; justify-content: space-around; margin-bottom: 20px; font-weight: bold; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; font-size: 13px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }
                        
                        /* Add a Serial Number column visually only for print */
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; color: #64748b; }
                        
                        th:nth-last-child(2), td:nth-last-child(2) { text-align: right !important; color: #e11d48; font-weight: bold; }
                        th:last-child, td:last-child { text-align: right !important; color: #059669; font-weight: bold; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Accounts Payable & Vendor Advances</h2>
                    <p>Generated Report Date: ${new Date().toLocaleString()}</p>
                    <div class="summary">
                        <span style="color: #e11d48;">Total Payable (দেনা): TK. ${Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span style="color: #059669;">Total Advance (জমা): TK. ${Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    return (
        <AdminLayout>
            <Head title="Accounts Payable & Advances" />

            {/* Custom Table Scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-vendor-dues-table, #printable-vendor-dues-table * { visibility: visible; }
                    #printable-vendor-dues-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Financial Reporting
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Accounts Payable</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Track and manage vendor dues, outstanding payables, and wallet advances.</p>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 no-print">
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                            <i className="fa-solid fa-store text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Vendors</p>
                            <h3 className="text-[24px] font-black text-gray-900 tabular-nums tracking-tight m-0">{vendorDues?.total || 0}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                            <i className="fa-solid fa-file-invoice-dollar text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-rose-600/90">Total Payable Amount (দেনা)</p>
                            <h3 className="text-[24px] font-black text-rose-700 tabular-nums tracking-tight m-0">
                                <Taka className="text-[20px]" />{Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                            <i className="fa-solid fa-wallet text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600/90">Total Advance in Wallets (জমা)</p>
                            <h3 className="text-[24px] font-black text-emerald-700 tabular-nums tracking-tight m-0">
                                <Taka className="text-[20px]" />{Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-[#202223] flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                                <i className="fa-solid fa-hand-holding-dollar text-[14px]"></i>
                            </div>
                            Vendor Dues & Advance Directory
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            
                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select 
                                        value={perPage} 
                                        onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden md:block mx-1"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExcel} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors"><i className="fas fa-file-excel text-emerald-500"></i> Excel</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-[13px] font-bold text-teal-700 hover:bg-teal-100 shadow-sm transition-colors"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePDF} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-700 hover:bg-rose-100 shadow-sm transition-colors"><i className="fas fa-file-pdf"></i> PDF</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search vendor name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white font-medium"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-vendor-dues-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12 no-print">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[40%]">Vendor Details</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Status</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Total Due (Payable)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Advance (Wallet)</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {vendorsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-gray-500 no-print">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-check-double text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No due or advance records found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your search criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    vendorsList.map((vendor, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center no-print">
                                                {vendorDues.from ? vendorDues.from + idx : idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[12px] font-black uppercase shadow-sm">
                                                        {(vendor.vendor_name || 'V').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 text-[14.5px]">{vendor.vendor_name}</div>
                                                        {vendor.company_name && (
                                                            <div className="text-[11.5px] text-gray-500 font-semibold mt-0.5">{vendor.company_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {vendor.total_due > 0 ? (
                                                    <span className="inline-flex px-3 py-1 rounded-md bg-rose-50 text-[10px] font-black uppercase tracking-wider text-rose-600 border border-rose-200 shadow-sm">
                                                        Payable
                                                    </span>
                                                ) : vendor.wallet_balance > 0 ? (
                                                    <span className="inline-flex px-3 py-1 rounded-md bg-emerald-50 text-[10px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-200 shadow-sm">
                                                        Advance Given
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-3 py-1 rounded-md bg-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500 border border-gray-200 shadow-sm">
                                                        Settled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 text-[15px] tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors">
                                                {vendor.total_due > 0 ? <><Taka />{parseFloat(vendor.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</> : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15px] tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors border-r border-gray-100">
                                                {vendor.wallet_balance > 0 ? <><Taka />{parseFloat(vendor.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</> : <span className="text-gray-300">-</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {vendorDues?.links && vendorDues.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {vendorDues.total > 0 && `Showing ${vendorDues.from || 0} to ${vendorDues.to || 0} of ${vendorDues.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {vendorDues.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}