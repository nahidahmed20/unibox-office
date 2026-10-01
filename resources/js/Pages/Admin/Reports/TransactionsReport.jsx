import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';

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
        project_expense: { label: 'Project Expense', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        asset_purchase: { label: 'Asset Purchase', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        investment_received: { label: 'Investment Received', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        investment_return: { label: 'Investment Return', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        staff_advance: { label: 'Staff Advance', className: 'bg-violet-50 text-violet-700 border-violet-200' },
        client_advance: { label: 'Client Advance', className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
        vendor_payment:      { label: 'Vendor Payment',      className: 'bg-orange-50 text-orange-700 border-orange-200' },
        vendor_payment_void: { label: 'Payment Voided',      className: 'bg-gray-100 text-gray-700 border-gray-300' },
        vendor_advance:      { label: 'Advance Given',       className: 'bg-blue-50 text-blue-700 border-blue-200' },
        vendor_refund:       { label: 'Refund Received',     className: 'bg-rose-50 text-rose-700 border-rose-200' },
        manual_adjustment:   { label: 'Manual Adjustment',   className: 'bg-slate-100 text-slate-700 border-slate-300' },
        salary_payment:      { label: 'Salary Payment',      className: 'bg-purple-50 text-purple-700 border-purple-200' },
        invoice_payment:     { label: 'Invoice Received',    className: 'bg-teal-50 text-teal-700 border-teal-200' },
        expense:             { label: 'Office Expense',      className: 'bg-red-50 text-red-700 border-red-200' },
    };

    const getSourceMeta = (type) => sourceMeta[type] || { label: type ? type.replace(/_/g, ' ') : 'System', className: 'bg-slate-100 text-slate-600 border-slate-200' };

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
        const text = recordList.map(tx => `${new Date(tx.transaction_date).toLocaleDateString()}\t${tx.account?.name}\t${tx.type.toUpperCase()}\t${tx.amount}`).join("\n");
        navigator.clipboard.writeText("Date\tAccount\tType\tAmount\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Source,Description,Type,Amount\n"];
        const rows = recordList.map(tx => `"${new Date(tx.transaction_date).toLocaleDateString()}","${tx.account?.name || ''}","${tx.source_type || ''}","${(tx.description || '').replace(/"/g, '""')}","${tx.type}","${tx.amount}"`);
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
                        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
                        th, td { padding: 8px 10px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 700; color: #334155; text-transform: uppercase; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Account Transactions</h2>
                    <p>Report generated on: ${new Date().toLocaleString()}</p>
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
                .custom-table-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print { body * { visibility: hidden; } #printable-table, #printable-table * { visibility: visible; } #printable-table { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
            `}} />

            <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-6 pb-12 pt-2 px-4 sm:px-6 lg:px-8">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span> Audit Trail
                        </div>
                        <h1 className="text-[24px] sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Account Transactions</h1>
                        <p className="text-[14px] text-slate-500 mt-1 max-w-xl">Track all financial inflows and outflows across company bank & cash accounts.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar / Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-slate-50/50 border-b border-slate-200 no-print">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <span className="bg-slate-50 px-3.5 py-2 text-[12.5px] font-bold text-slate-600 border-r border-slate-200">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-transparent pl-3 pr-8 py-2 text-[13px] font-bold text-slate-800 outline-none cursor-pointer border-none focus:ring-0 w-[100px]">
                                        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value="all">All</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all active:scale-95"><i className="fas fa-copy text-slate-400"></i> Copy</button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm transition-all active:scale-95"><i className="fas fa-file-csv text-emerald-500"></i> CSV</button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"><i className="fas fa-print text-slate-400"></i> Print</button>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 px-5 py-5 bg-white border-b border-slate-100 no-print">
                        {/* Search Box */}
                        <div className="relative xl:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input type="text" placeholder="Ref or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm bg-slate-50/50 hover:bg-white" />
                            </div>
                        </div>

                        {/* Account Select */}
                        <div className="relative xl:col-span-1 z-30">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account</label>
                            <Select
                                options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                                value={accountId ? { value: accountId, label: accounts.find(a => a.id == accountId)?.name } : null}
                                onChange={(opt) => setAccountId(opt ? opt.value : '')}
                                placeholder="All Accounts"
                                isClearable
                                styles={selectStyles}
                            />
                        </div>

                        {/* Source Type Select */}
                        <div className="relative xl:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                            <div className="relative">
                                <CustomSelect value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm">
                                    <option value="">All Types</option>
                                    {Object.keys(sourceMeta).map(key => (
                                        <option key={key} value={key}>{sourceMeta[key].label}</option>
                                    ))}
                                </CustomSelect>
                            </div>
                        </div>

                        {/* Date Filters */}
                        <div className="xl:col-span-2 flex flex-col sm:flex-row items-end gap-3">
                            <div className="w-full flex-1">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
                                <div className="flex items-center bg-slate-50/50 hover:bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <i className="fa-regular fa-calendar-days text-slate-400 text-[13px] mr-2"></i>
                                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent border-none text-[12.5px] font-medium p-0 outline-none cursor-pointer w-full text-slate-700" />
                                    <span className="text-slate-300 mx-2">–</span>
                                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent border-none text-[12.5px] font-medium p-0 outline-none cursor-pointer w-full text-slate-700" />
                                </div>
                            </div>

                            {/* Clear Filter Button */}
                            {hasActiveFilters && (
                                <button onClick={clearFilters} className="w-full sm:w-auto flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 transition-colors shadow-sm h-[42px]">
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Account</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Source Type</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[35%]">Reference & Details</th>
                                    <th className="px-5 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-5 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-5 py-4 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider no-print w-[80px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px] text-slate-700 divide-y divide-slate-100">
                                {recordList.length > 0 ? recordList.map((tx) => {
                                    const meta = getSourceMeta(tx.source_type);
                                    const dateObj = new Date(tx.transaction_date);
                                    const isCredit = tx.type === 'credit';

                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                        {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                        {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                                                    <i className="fa-solid fa-building-columns text-slate-400 text-[11px]"></i> {tx.account?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wide border ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1 w-full max-w-[350px] whitespace-normal">
                                                    {tx.reference_number && (
                                                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                                            <i className="fa-solid fa-hashtag text-[10px] text-slate-400"></i> {tx.reference_number}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-800 font-medium leading-snug line-clamp-2" title={tx.description}>
                                                        {tx.description || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className={`inline-flex items-center justify-end font-bold text-[14px] tabular-nums px-2.5 py-1 rounded-md ${isCredit ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
                                                    {isCredit ? '+' : '-'} <Taka className="ml-0.5" />{Number(tx.amount).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right font-extrabold text-slate-800 text-[14px] tabular-nums">
                                                {tx.balance_after == null ? <span className="text-slate-300">—</span> : <><Taka />{Number(tx.balance_after).toLocaleString('en-IN')}</>}
                                            </td>
                                            <td className="px-5 py-4 text-center no-print">
                                                <button onClick={() => openViewModal(tx)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm" title="View Details">
                                                    <i className="fa-regular fa-eye text-[13px]"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                                    <i className="fa-solid fa-receipt text-2xl text-slate-300"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-slate-700">No transactions found</p>
                                                <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">Adjust your filters or date range to find what you're looking for.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 no-print">
                            <div className="text-[13px] font-medium text-slate-500">
                                Showing <strong className="text-slate-800">{transactions.from || 0}</strong> to <strong className="text-slate-800">{transactions.to || 0}</strong> of <strong className="text-slate-800">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all shadow-sm
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'border-slate-100 bg-transparent text-slate-300 pointer-events-none'}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-50 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className={`relative px-6 sm:px-8 py-6 shrink-0 overflow-hidden ${selectedTrx.type === 'credit' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[18px] font-bold text-white flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <i className={`fa-solid ${selectedTrx.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[14px]`}></i>
                                    </div>
                                    Transaction Receipt
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-table-scroll">
                            {/* Amount Display */}
                            <div className="text-center py-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <span className={`inline-flex mb-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${selectedTrx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {selectedTrx.type === 'credit' ? 'Money In (Deposit)' : 'Money Out (Withdrawal)'}
                                </span>
                                <div className={`text-[36px] font-black tabular-nums tracking-tight ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<Taka className="text-[26px]" />{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[13px] text-slate-500 font-medium mt-1">
                                    {new Date(selectedTrx.transaction_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Account</span>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <i className="fa-solid fa-building-columns text-slate-400"></i> {selectedTrx.account?.name || "N/A"}
                                    </div>
                                </div>
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Source Type</span>
                                    <div className="font-bold text-slate-800 capitalize truncate">
                                        {getSourceMeta(selectedTrx.source_type).label}
                                    </div>
                                </div>

                                {selectedTrx.reference_number && (
                                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 sm:col-span-2 flex justify-between items-center">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reference No.</span>
                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                            {selectedTrx.reference_number}
                                        </span>
                                    </div>
                                )}

                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Description / Notes</span>
                                    <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-[13.5px]">
                                        {selectedTrx.description || <span className="italic text-slate-400">No description provided.</span>}
                                    </div>
                                </div>

                                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 col-span-1 sm:col-span-2 flex items-center justify-between shadow-sm mt-1">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-slate-300">Balance After</span>
                                    <div className="font-black text-white text-[18px] tabular-nums">
                                        <Taka className="text-slate-400" />{selectedTrx.balance_after == null ? '—' : Number(selectedTrx.balance_after).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 sm:px-8 py-5 border-t border-slate-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="w-full sm:w-auto rounded-xl bg-slate-900 px-8 py-3 text-[14px] font-bold text-white hover:bg-slate-800 shadow-md transition-all active:scale-95">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
