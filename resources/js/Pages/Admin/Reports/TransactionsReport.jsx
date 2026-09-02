import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

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
    address: '278/3/A, Sardar Villa, Kataban, Dhaka-1205',
};

// 🟢 Custom Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function TransactionsReport({ transactions = { data: [], links: [] }, accounts = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const hasPermission = (permission) => isSuperAdmin || auth?.permissions?.includes(permission);

    // --- Filter States ---
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [sourceType, setSourceType] = useState(filters.source_type || '');
    const [fromDate, setFromDate] = useState(filters.from || '');
    const [toDate, setToDate] = useState(filters.to || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);

    const isFirstRender = useRef(true);

    // --- View Modal States ---
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    // --- Source Type Styling ---
    const sourceMeta = {
        vendor_payment:      { label: 'Vendor Payment',      className: 'bg-orange-50 text-orange-600 border-orange-200' },
        vendor_payment_void: { label: 'Payment Voided',      className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        vendor_advance:      { label: 'Advance Given',       className: 'bg-blue-50 text-blue-600 border-blue-200' },
        vendor_refund:       { label: 'Refund Received',     className: 'bg-rose-50 text-rose-600 border-rose-200' },
        manual_adjustment:   { label: 'Manual Adjustment',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
        salary_payment:      { label: 'Salary Payment',      className: 'bg-purple-50 text-purple-600 border-purple-200' },
        invoice_payment:     { label: 'Invoice Received',    className: 'bg-teal-50 text-teal-600 border-teal-200' },
        expense:             { label: 'Office Expense',      className: 'bg-red-50 text-red-600 border-red-200' },
    };

    const getSourceMeta = (type) => sourceMeta[type] || { label: type ? type.replace(/_/g, ' ') : 'System', className: 'bg-gray-100 text-gray-600 border-gray-200' };

    // --- Fetch Data on Filter Change ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (accountId) params.account_id = accountId;
            if (sourceType) params.source_type = sourceType;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;
            if (perPage !== 25) params.per_page = perPage;

            router.get(route('admin.account.transactions'), params, { preserveState: true, replace: true });
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, accountId, sourceType, fromDate, toDate, perPage]);

    const clearFilters = () => {
        setSearchTerm(''); setAccountId(''); setSourceType(''); setFromDate(''); setToDate(''); setPerPage(25);
        router.get(route('admin.account.transactions'), {}, { replace: true });
    };

    const openViewModal = (trx) => { setSelectedTrx(trx); setShowViewModal(true); };

    const recordList = transactions.data || [];
    const hasActiveFilters = accountId || sourceType || fromDate || toDate || searchTerm;

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList.map(tx => `${new Date(tx.created_at).toLocaleDateString()}\t${tx.account?.name}\t${tx.type.toUpperCase()}\t${tx.amount}`).join("\n");
        navigator.clipboard.writeText("Date\tAccount\tType\tAmount\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Source,Description,Type,Amount\n"];
        const rows = recordList.map(tx => `"${new Date(tx.created_at).toLocaleDateString()}","${tx.account?.name || ''}","${tx.source_type || ''}","${tx.description || ''}","${tx.type}","${tx.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Transactions_Report_${new Date().toISOString().slice(0, 10)}.csv`); link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Account Transactions Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Account Transactions Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    return (
        <AdminLayout>
            <Head title="Account Transactions Report" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @media print { body * { visibility: hidden; } #printable-table, #printable-table * { visibility: visible; } #printable-table { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Audit Trail
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Account Transactions</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg">Track all inflows and outflows across company bank & cash accounts.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar / Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/40 border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
                                </div>
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        {/* Search Box */}
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input type="text" placeholder="Search ref or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
                        </div>

                        {/* Account Select */}
                        <div className="relative">
                            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full appearance-none bg-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                <option value="">All Accounts</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none"></i>
                        </div>

                        {/* Source Type Select */}
                        <div className="relative">
                            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full appearance-none bg-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                <option value="">All Transaction Types</option>
                                {Object.keys(sourceMeta).map(key => (
                                    <option key={key} value={key}>{sourceMeta[key].label}</option>
                                ))}
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] pointer-events-none"></i>
                        </div>

                        {/* Date Filters */}
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm lg:col-span-1">
                            <i className="fa-regular fa-calendar-days text-indigo-500 text-[13px]"></i>
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent border-none text-[12.5px] font-medium p-0 outline-none cursor-pointer w-full text-gray-600" />
                            <span className="text-gray-400">–</span>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent border-none text-[12.5px] font-medium p-0 outline-none cursor-pointer w-full text-gray-600" />
                        </div>

                        {/* Clear Filter */}
                        {hasActiveFilters && (
                            <div className="flex justify-end lg:col-span-1">
                                <button onClick={clearFilters} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 transition-colors shadow-sm">
                                    <i className="fa-solid fa-xmark"></i> Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Date & Time</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Account</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Source Type</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[30%]">Reference / Note</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Amount (In/Out)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Balance After</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {recordList.length > 0 ? recordList.map((tx) => {
                                    const meta = getSourceMeta(tx.source_type);
                                    const dateObj = new Date(tx.created_at);

                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13.5px] font-bold text-gray-800 flex items-center gap-1.5">
                                                        <i className="fa-regular fa-calendar text-indigo-400"></i>
                                                        {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[11.5px] text-gray-500 mt-0.5 ml-5 font-semibold">
                                                        {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-gray-700 shadow-sm">
                                                    <i className="fa-solid fa-building-columns text-indigo-500"></i> {tx.account?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider border shadow-sm ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 font-semibold whitespace-normal max-w-[300px] leading-relaxed">
                                                    {tx.description || '-'}
                                                </div>
                                                {tx.reference_number && (
                                                    <div className="text-[11.5px] font-bold text-gray-500 mt-1.5 flex items-center gap-1 bg-gray-100 w-max px-2.5 py-0.5 rounded-md border border-gray-200">
                                                        <i className="fa-solid fa-hashtag text-[10px]"></i> Ref: {tx.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[15px] whitespace-nowrap tabular-nums ${tx.type === 'debit' ? "text-rose-600 bg-rose-50/20" : "text-emerald-600 bg-emerald-50/20"}`}>
                                                {tx.type === 'debit' ? '-' : '+'} <Taka />{Number(tx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-extrabold text-gray-800 tabular-nums">
                                                <Taka />{Number(tx.balance_after).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center">
                                                    <button onClick={() => openViewModal(tx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                        <i className="fa-regular fa-eye text-[13px]"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No transactions found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or date range.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-[#f6f6f7] px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing <strong className="text-gray-700">{transactions.from || 0}</strong> to <strong className="text-gray-700">{transactions.to || 0}</strong> of <strong className="text-gray-700">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-transparent text-gray-400 pointer-events-none'}
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

            {/* --- VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-6 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[18px] font-extrabold text-white flex items-center gap-2">
                                    <i className="fa-solid fa-receipt text-indigo-200"></i> Transaction Details
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-table-scroll">
                            <div className="text-center py-7 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${selectedTrx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <span className={`inline-flex mb-3 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedTrx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                </span>
                                <div className={`text-[36px] font-black tabular-nums tracking-tight ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<Taka className="text-[26px]" />{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Account</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-2"><i className="fa-solid fa-building-columns text-indigo-400"></i> {selectedTrx.account?.name || "N/A"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Date & Time</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-2"><i className="fa-regular fa-calendar-days text-indigo-400"></i> {new Date(selectedTrx.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm col-span-2">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Description</span>
                                    <div className="text-gray-800 font-semibold leading-relaxed whitespace-pre-line">{selectedTrx.description}</div>
                                </div>

                                {selectedTrx.reference_number && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 col-span-2 flex justify-between items-center">
                                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Reference No</span>
                                        <div className="font-bold text-gray-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"><i className="fa-solid fa-hashtag text-gray-400"></i> {selectedTrx.reference_number}</div>
                                    </div>
                                )}

                                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 col-span-2 flex items-center justify-between shadow-sm">
                                    <span className="block text-[12.5px] font-bold uppercase tracking-wider text-blue-600">Balance After Transaction</span>
                                    <div className="font-black text-blue-800 text-[18px] tabular-nums"><Taka />{Number(selectedTrx.balance_after).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white hover:bg-gray-800 shadow-md transition-colors">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
