import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Custom Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

// 🟢 Custom Premium Dropdown (Fully Replaces react-select & fixes z-index/toLowerCase issues)
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, error, disabled, isClearable = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setOpen(false); setSearch(""); } }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));

    // 🟢 FIXED: Converted getLabel to String to prevent .toLowerCase() error on numbers (like Year)
    const filtered = options.filter((opt) => String(getLabel(opt)).toLowerCase().includes(search.toLowerCase()));

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
        setSearch("");
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-[60]">
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-[0.875rem] min-h-[44px] border bg-white px-4 py-2.5 outline-none transition-all duration-200 ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-70 border-slate-200 text-slate-400' : 'hover:border-indigo-600'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]'} ${selected && !disabled ? 'text-slate-900 font-[800] text-[13.5px]' : 'text-[#94A3B8] font-[700] text-[13px]'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {isClearable && selected && !disabled && (
                        <i onClick={handleClear} className="fa-solid fa-xmark text-[13px] text-slate-400 hover:text-rose-500 transition-colors h-6 w-6 flex items-center justify-center rounded-full hover:bg-rose-50"></i>
                    )}
                    <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
                </div>
            </div>
            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] left-0 flex max-h-[300px] w-full flex-col overflow-hidden rounded-[0.875rem] border border-slate-300 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)] z-[99999] animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-slate-200 bg-slate-50 p-3 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here..." className="w-full rounded-[0.5rem] border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                    <div className="overflow-y-auto py-1.5 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-slate-400 font-bold">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-4 py-2.5 text-[13.5px] font-[700] transition-colors border-b border-slate-50 last:border-0 ${isActive ? 'bg-[#4F46E5] text-white' : 'text-[#0F172A] hover:bg-[#EEF2FF]'}`}>
                                        {getLabel(opt)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], vendors = [], totals = null, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [clientFilter, setClientFilter] = useState(filters.client_id || '');
    const [projectFilter, setProjectFilter] = useState(filters.project_id || '');
    const [vendorFilter, setVendorFilter] = useState(filters.vendor_id || '');
    const [perPage, setPerPage] = useState(filters.per_page === "all" ? "all" : (Number(filters.per_page) || 25));

    const isFirstRender = useRef(true);

    const [yearFilter, setYearFilter] = useState(filters.year || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    const uniqueClients = useMemo(() => {
        const clientsMap = new Map();
        projects.forEach(p => {
            if (p.client) clientsMap.set(p.client.id, p.client);
        });
        return Array.from(clientsMap.values());
    }, [projects]);

    const filteredProjectsList = useMemo(() => {
        if (!clientFilter) return projects;
        return projects.filter(p => p.client_id == clientFilter);
    }, [projects, clientFilter]);

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (clientFilter) params.client_id = clientFilter;
            if (projectFilter) params.project_id = projectFilter;
            if (vendorFilter) params.vendor_id = vendorFilter;
            params.per_page = perPage;
            if (yearFilter) params.year = yearFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(route('admin.project-expenses.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, clientFilter, projectFilter, vendorFilter, perPage, yearFilter, dateFrom, dateTo]);

    const handleClientChange = (val) => {
        setClientFilter(val);
        setProjectFilter('');
    };

    const clearAllFilters = () => {
        setSearchTerm("");
        setClientFilter("");
        setProjectFilter("");
        setVendorFilter("");
        setYearFilter("");
        setDateFrom("");
        setDateTo("");
        setPerPage(25);
    };

    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList.map((e) => `${e.date}\t${e.project?.client?.name || 'N/A'}\t${e.title}\t${e.payee_name || e.vendor?.name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`).join("\n");
        navigator.clipboard.writeText("Date\tClient\tTitle\tVendor\tTotal Bill\tPaid\tStatus\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Client,Project,Expense Title,Vendor,Account/Source,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.client?.name || ''}","${e.project?.title || ''}","${e.title}","${e.payee_name || e.vendor?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'Wallet')}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Project Expenses</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{padding:8px;border:1px solid #ddd} .no-print{display:none !important}</style></head><body><h2>Project Expenses</h2>${tableContent.outerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const openViewModal = (expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this record?',
            text: "Paid amount will be automatically refunded to your account.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.project-expenses.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed successfully.", timer: 1500, showConfirmButton: false }),
                    onError: (err) => {
                        const errorMessage = err.error || Object.values(err)[0] || "Something went wrong! Cannot delete this record.";
                        Swal.fire({ icon: "error", title: "Action Failed", text: errorMessage, confirmButtonColor: "#ef4444" });
                    }
                });
            }
        });
    };

    const handleMoveToWallet = (exp) => {
        Swal.fire({
            title: 'Move to Vendor Wallet?',
            text: `This will remove the expense from the project and move ৳${exp.paid_amount} to ${exp.vendor.name}'s Wallet.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Move'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.project-expenses.move-to-wallet', exp.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Moved!", text: "Amount added to Vendor Wallet.", timer: 1500, showConfirmButton: false }),
                    onError: (err) => {
                        const errorMessage = err.error || Object.values(err)[0] || "Something went wrong while moving to wallet.";
                        Swal.fire({ icon: "error", title: "Action Failed", text: errorMessage, confirmButtonColor: "#ef4444" });
                    }
                });
            }
        });
    };

    const totalBilled = totals ? totals.total_bill : expList.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalPaid = totals ? totals.paid_amount : expList.reduce((sum, item) => sum + parseFloat(item.paid_amount || 0), 0);
    const totalDue = totals ? totals.due_amount : expList.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);

    const filteredProject = projectFilter ? projects.find(p => p.id == projectFilter) : null;
    const filteredProjectTitle = filteredProject ? `${filteredProject.title} (${filteredProject.client?.name || 'No Client'})` : null;

    return (
        <AdminLayout>
            <Head title="Project Accounts Payable" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                @media print { body * { visibility: hidden; } #printable-table, #printable-table * { visibility: visible; } #printable-table { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-4 px-4 sm:px-6 lg:px-8">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Supply Chain & Billing
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Accounts Payable</h1>
                        <p className="text-[14.5px] font-bold text-slate-500 mt-2 max-w-lg leading-relaxed">
                            {filteredProjectTitle ? <>Showing totals for <strong className="text-indigo-600 font-bold">{filteredProjectTitle}</strong></> : "Manage vendor bills, log project expenses, and track your payables."}
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-md border border-indigo-500 text-white min-w-[220px]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100"><i className="fa-solid fa-file-invoice text-[20px]"></i></div>
                            <p className="text-[11.5px] font-bold uppercase tracking-widest text-indigo-200">Total Billed</p>
                        </div>
                        <h3 className="text-[26px] font-black tracking-tight tabular-nums flex items-center mt-1"><Taka className="text-[18px] text-indigo-200 mr-1.5" />{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-md border border-emerald-500 text-white min-w-[220px]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-100"><i className="fa-solid fa-check-double text-[20px]"></i></div>
                            <p className="text-[11.5px] font-bold uppercase tracking-widest text-emerald-200">Total Paid</p>
                        </div>
                        <h3 className="text-[26px] font-black tracking-tight tabular-nums flex items-center mt-1"><Taka className="text-[18px] text-emerald-200 mr-1.5" />{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-6 shadow-md border border-rose-400 text-white min-w-[220px]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-rose-100"><i className="fa-solid fa-clock-rotate-left text-[20px]"></i></div>
                            <p className="text-[11.5px] font-bold uppercase tracking-widest text-rose-200">Total Due (Payables)</p>
                        </div>
                        <h3 className="text-[26px] font-black tracking-tight tabular-nums flex items-center mt-1"><Taka className="text-[18px] text-rose-200 mr-1.5" />{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50/80 no-print">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200">
                                <i className="fa-solid fa-wallet text-[15px]"></i>
                            </div>
                            Vendor Bills & Expenses
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCopy} className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 transition-all hover:bg-blue-500 hover:text-white hover:shadow-md hover:-translate-y-0.5" title="Copy"><i className="fas fa-copy text-[15px]"></i></button>
                            <button onClick={handleExportCSV} className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 transition-all hover:bg-emerald-500 hover:text-white hover:shadow-md hover:-translate-y-0.5" title="Export CSV"><i className="fas fa-file-csv text-[15px]"></i></button>
                            <button onClick={handlePrint} className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 transition-all hover:bg-slate-600 hover:text-white hover:shadow-md hover:-translate-y-0.5" title="Print"><i className="fas fa-print text-[14px]"></i></button>

                            {hasPermission('create_project_expenses') && (
                                <Link href={route('admin.project-expenses.create')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-[10px] text-[13.5px] font-black text-white transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 active:scale-[0.98] border border-indigo-700/50 ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Log New Bill
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ADVANCED FILTER BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5 bg-white border-b border-slate-100">
                        <div className="relative z-[50]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter Client</label>
                            <SearchableSelect
                                options={uniqueClients}
                                value={clientFilter}
                                onChange={handleClientChange}
                                getLabel={(c) => `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`}
                                getValue={(c) => c.id}
                                placeholder="All Clients..."
                                isClearable
                            />
                        </div>

                        <div className="relative z-[45]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter Project</label>
                            <SearchableSelect
                                options={filteredProjectsList}
                                value={projectFilter}
                                onChange={(val) => setProjectFilter(val)}
                                getLabel={(p) => p.title}
                                getValue={(p) => p.id}
                                placeholder="All Projects..."
                                disabled={!clientFilter && filteredProjectsList.length === 0}
                                isClearable
                            />
                        </div>

                        <div className="relative z-[40]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter Vendor</label>
                            <SearchableSelect
                                options={vendors}
                                value={vendorFilter}
                                onChange={(val) => setVendorFilter(val)}
                                getLabel={(v) => `${v.name} ${v.company_name ? `(${v.company_name})` : ''}`}
                                getValue={(v) => v.id}
                                placeholder="All Vendors..."
                                isClearable
                            />
                        </div>

                        <div className="relative w-full z-[30]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Search Term</label>
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-[38px] text-slate-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search bills or payee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-[0.875rem] border border-slate-300 py-[11px] pl-10 pr-4 text-[13.5px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Secondary Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <div className="relative w-full sm:w-[130px]">
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                className="w-full appearance-none bg-white border border-slate-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                            >
                                <option value={10}>10 Rows</option>
                                <option value={25}>25 Rows</option>
                                <option value={50}>50 Rows</option>
                                <option value={100}>100 Rows</option>
                                <option value="all">All Rows</option>
                            </select>
                            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none"></i>
                        </div>

                        <div className="relative w-full sm:w-[140px] z-[50]">
                            <SearchableSelect
                                options={yearOptions.map(y => ({ id: y, name: y }))}
                                value={yearFilter}
                                onChange={(val) => { setYearFilter(val); if (val) { setDateFrom(""); setDateTo(""); } }}
                                getLabel={(o) => o.name}
                                getValue={(o) => o.id}
                                placeholder="All Years"
                                isClearable
                            />
                        </div>

                        <span className="hidden lg:block text-slate-300 mx-1">|</span>

                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-auto h-[44px]">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setYearFilter(''); }}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setYearFilter(''); }}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                        </div>

                        {(dateFrom || dateTo || yearFilter || clientFilter || projectFilter || vendorFilter || searchTerm || perPage !== 25) && (
                            <button onClick={clearAllFilters} className="h-[44px] px-5 rounded-xl border border-rose-200 bg-rose-50 text-[12.5px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-300 shadow-sm flex items-center justify-center gap-2 sm:ml-auto whitespace-nowrap active:scale-[0.98]">
                                <i className="fa-solid fa-rotate-left"></i> Reset
                            </button>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-100 text-[10.5px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4.5 w-12 text-center">SL</th>
                                    <th className="px-6 py-4.5">Date</th>
                                    <th className="px-6 py-4.5 w-[25%]">Project & Expense</th>
                                    <th className="px-6 py-4.5">Account / Payee</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/50 border-l border-slate-100">Total Bill</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/50">Paid Amount</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/40 border-r border-slate-100">Due Amount</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center no-print w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-100">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-400 text-center">
                                                {project_expenses.from ? project_expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11.5px] font-black shadow-sm tracking-wider">
                                                    <i className="fa-regular fa-calendar-days text-[10px]"></i> {exp.date}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-900 text-[14.5px] mb-1">
                                                    {exp.project?.title || <span className="text-slate-400 italic">No Project Assigned</span>}
                                                </div>
                                                {exp.project?.client && (
                                                    <div className="text-[11.5px] font-bold text-indigo-600 mb-1" title="Client Name">
                                                        <i className="fa-regular fa-building mr-1.5 opacity-75"></i>
                                                        {exp.project.client.name} {exp.project.client.company_name ? `(${exp.project.client.company_name})` : ''}
                                                    </div>
                                                )}
                                                <div className="text-[12px] font-bold text-slate-500 truncate max-w-[250px]" title={exp.title}>• {exp.title}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                                                    <i className="fa-solid fa-user-tie text-[12px] text-slate-400"></i> {exp.payee_name || exp.vendor?.name || <span className="italic text-slate-400 font-medium">Payee not recorded</span>}
                                                </div>

                                                {/* 🟢 FIXED: Beautiful Source Logic with Proper JSON Key */}
                                                <div className="text-[11.5px] font-black tracking-widest uppercase flex items-center gap-1.5">
                                                    {exp.account_id ? (
                                                        <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shadow-sm"><i className="fa-solid fa-building-columns mr-1"></i> {exp.account?.name}</span>
                                                    ) : exp.advance_user_id ? (
                                                        <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm"><i className="fa-solid fa-user-tie mr-1"></i> {exp.advance_user?.name || exp.advanceUser?.name || 'Employee'} (Adv)</span>
                                                    ) : parseFloat(exp.paid_amount) > 0 ? (
                                                        <span className="text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded shadow-sm"><i className="fa-solid fa-wallet mr-1"></i> {exp.vendor?.name} (Wallet)</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Unpaid / N/A</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors border-l border-slate-50">
                                                <span className="font-black text-blue-700 text-[15px] tabular-nums">
                                                    <Taka className="text-[13px] mr-1 opacity-70"/>{parseFloat(exp.total_bill).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                                {parseFloat(exp.paid_amount) > 0 ? (
                                                    <span className="font-black text-emerald-600 text-[15px] tabular-nums">
                                                        <Taka className="text-[13px] mr-1 opacity-70"/>{parseFloat(exp.paid_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors border-r border-slate-50">
                                                {parseFloat(exp.due_amount) > 0 ? (
                                                    <span className="font-black text-rose-600 text-[15px] tabular-nums">
                                                        <Taka className="text-[13px] mr-1 opacity-80"/>{parseFloat(exp.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm
                                                    ${exp.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                    : exp.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-300'
                                                    : 'bg-rose-50 text-rose-700 border-rose-300'}
                                                `}>
                                                    {exp.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-end gap-1.5 transition-opacity">
                                                    {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                        <button onClick={() => handleMoveToWallet(exp)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-purple-500 hover:bg-purple-500 hover:text-white hover:border-purple-500 flex items-center justify-center transition-all shadow-sm active:scale-[0.95]" title="Move to Vendor Wallet">
                                                            <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('view_project_expense') && (
                                                        <button onClick={() => openViewModal(exp)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 flex items-center justify-center transition-all shadow-sm active:scale-[0.95]" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_project_expense') && (
                                                        <Link href={route('admin.project-expenses.edit', exp.id)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 flex items-center justify-center transition-all shadow-sm active:scale-[0.95]" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_project_expense') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 flex items-center justify-center transition-all shadow-sm active:scale-[0.95]" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-24 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                    <i className="fa-solid fa-file-invoice text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-extrabold text-slate-700">No matching expenses found</p>
                                                <p className="text-[13px] font-medium text-slate-400 mt-1">Try resetting your filters or log a new bill.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 no-print">
                            <div className="text-[13px] font-semibold text-slate-500">
                                {project_expenses.total > 0 && <>Showing <span className="font-bold text-slate-900">{project_expenses.from || 0}</span> to <span className="font-bold text-slate-900">{project_expenses.to || 0}</span> of <span className="font-bold text-slate-900">{project_expenses.total || 0}</span> records</>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {project_expenses.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition-all
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : link.url
                                                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                                    : 'border-slate-100 bg-transparent text-slate-300 pointer-events-none'
                                            }
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

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col relative my-auto animate-[scaleIn_0.2s_ease-out] overflow-hidden border border-slate-700/20">

                        <div className={`absolute top-6 left-0 px-5 py-2 text-white text-[11px] font-black tracking-widest uppercase rounded-r-xl shadow-lg z-20
                            ${selectedExpense.payment_status === 'paid' ? 'bg-emerald-500' : selectedExpense.payment_status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                            {selectedExpense.payment_status}
                        </div>

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 bg-white pl-32 shrink-0">
                            <div>
                                <h3 className="text-[20px] font-black text-slate-900 tracking-tight">Expense Receipt</h3>
                                <p className="text-[13px] text-slate-500 font-bold mt-1">Reference ID: #{String(selectedExpense.id).padStart(6, '0')}</p>
                            </div>
                            <div className="flex items-center gap-3 relative z-20">
                                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.95]">
                                    <i className="fa-solid fa-print text-slate-500"></i> Print
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-200 active:scale-[0.95]">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll bg-slate-50">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">Project & Client</span>
                                    <div className="text-[15px] font-extrabold text-slate-900 flex flex-col gap-1.5">
                                        <div className="flex items-start gap-2.5">
                                            <i className="fa-solid fa-folder text-indigo-500 mt-1"></i>
                                            <span className="leading-tight">{selectedExpense.project?.title || "N/A"}</span>
                                        </div>
                                        {selectedExpense.project?.client && (
                                            <div className="flex items-start gap-2.5 text-[12.5px] text-slate-500 font-bold">
                                                <i className="fa-regular fa-building mt-0.5 opacity-70"></i>
                                                <span>{selectedExpense.project.client.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vendor / Payee</span>
                                    <div className="text-[15px] font-extrabold text-slate-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-user-tie text-blue-500 mt-0.5"></i>
                                        <span className="leading-tight">{selectedExpense.payee_name || selectedExpense.vendor?.name || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[11.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">Expense Date</span>
                                    <div className="text-[15px] font-extrabold text-slate-800 flex items-start gap-2.5">
                                        <i className="fa-regular fa-calendar-days text-rose-500 mt-0.5"></i>
                                        {selectedExpense.date}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-slate-900 mb-3 border-b border-slate-100 pb-2">Expense Title</h4>
                                        <div className="text-[15px] font-black text-indigo-800 bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100">
                                            {selectedExpense.title}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-slate-900 mb-3 border-b border-slate-100 pb-2">Payment Source</h4>
                                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            {selectedExpense.account_id ? (
                                                <>
                                                    <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><i className="fa-solid fa-building-columns text-[18px]"></i></div>
                                                    <div><p className="text-[14.5px] font-black text-slate-900">{selectedExpense.account?.name}</p><p className="text-[12px] font-bold text-slate-500 mt-0.5">Paid from Bank / Cash</p></div>
                                                </>
                                            ) : selectedExpense.advance_user_id ? (
                                                <>
                                                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-hand-holding-dollar text-[18px]"></i></div>
                                                    <div><p className="text-[14.5px] font-black text-slate-900">{selectedExpense.advance_user?.name || selectedExpense.advanceUser?.name || 'Employee'}</p><p className="text-[12px] font-bold text-slate-500 mt-0.5">Paid from Employee Advance</p></div>
                                                </>
                                            ) : selectedExpense.paid_amount > 0 ? (
                                                <>
                                                    <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600"><i className="fa-solid fa-wallet text-[18px]"></i></div>
                                                    <div><p className="text-[14.5px] font-black text-slate-900">{selectedExpense.vendor?.name} (Wallet)</p><p className="text-[12px] font-bold text-slate-500 mt-0.5">Deducted from vendor balance</p></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500"><i className="fa-solid fa-ban text-[18px]"></i></div>
                                                    <div><p className="text-[14.5px] font-black text-slate-900">Unpaid / N/A</p></div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="text-[13px] font-extrabold text-slate-900 mb-3 border-b border-slate-100 pb-2">Remarks / Description</h4>
                                        <div className="bg-slate-50 p-5 rounded-xl text-[14px] font-medium text-slate-700 leading-relaxed min-h-[100px] border border-slate-200">
                                            {selectedExpense.description || <span className="text-slate-400 italic font-bold">No remarks provided for this transaction.</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-[340px] shrink-0 bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-700">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

                                    <div>
                                        <h4 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-3">Amount Summary</h4>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] font-bold text-slate-300">Total Billed</span>
                                                <span className="text-[18px] font-black text-white tabular-nums">৳ {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] font-bold text-emerald-400">Total Paid</span>
                                                <span className="text-[18px] font-black text-emerald-400 tabular-nums">৳ {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-800 mt-8">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[13.5px] text-rose-400 font-extrabold uppercase tracking-wider">Due Balance</span>
                                            <span className="text-[28px] font-black text-rose-500 tabular-nums tracking-tight">৳ {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
