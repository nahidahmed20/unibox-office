import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], totals = null }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Toolbar Filters
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const queryVal = new URLSearchParams(window.location.search).get("per_page");
        return queryVal === "all" ? "all" : (Number(queryVal) || 25);
    });
    const [projectFilter, setProjectFilter] = useState(() => new URLSearchParams(window.location.search).get('project_id') || '');
    const [projectFilterSearch, setProjectFilterSearch] = useState("");
    const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);

    const isFirstRender = useRef(true);
    const filterRef = useRef(null);

    const [yearFilter, setYearFilter] = useState(() => new URLSearchParams(window.location.search).get('year') || '');
    const [dateFrom, setDateFrom] = useState(() => new URLSearchParams(window.location.search).get('date_from') || '');
    const [dateTo, setDateTo] = useState(() => new URLSearchParams(window.location.search).get('date_to') || '');
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) setShowProjectFilterDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;
            if (projectFilter) params.project_id = projectFilter;
            if (yearFilter) params.year = yearFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(route('admin.project-expenses.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage, projectFilter, yearFilter, dateFrom, dateTo]);

    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList.map((e) => `${e.date}\t${e.title}\t${e.vendor?.name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`).join("\n");
        navigator.clipboard.writeText("Date\tTitle\tVendor\tTotal Bill\tPaid\tStatus\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Project,Expense Title,Vendor,Account/Source,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.title || ''}","${e.title}","${e.vendor?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'Wallet')}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
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
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed successfully.", timer: 1500, showConfirmButton: false })
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
                    onError: (errors) => Swal.fire("Error", errors.error || "Something went wrong.", "error")
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
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12">
                
                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Supply Chain & Billing
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Accounts Payable</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            {filteredProjectTitle ? <>Showing totals for <strong className="text-indigo-600 font-bold">{filteredProjectTitle}</strong></> : "Manage vendor bills, log project expenses, and track your payables."}
                        </p>
                    </div>
                </div>

                {/* 🟢 Redesigned Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
                                <i className="fa-solid fa-file-invoice text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Billed</p>
                                <h3 className="text-[26px] font-black text-gray-900 m-0 tracking-tight tabular-nums">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
                                <i className="fa-solid fa-check-double text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-emerald-600/90">Total Paid</p>
                                <h3 className="text-[26px] font-black text-emerald-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/50 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-200">
                                <i className="fa-solid fa-clock-rotate-left text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-rose-600/90">Total Due (Payables)</p>
                                <h3 className="text-[26px] font-black text-rose-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1.5 opacity-80"></i>
                                    {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-wallet text-[14px]"></i>
                            </div>
                            Vendor Bills & Expenses
                        </div>
                        {hasPermission('create_project_expenses') && (
                            <Link href={route('admin.project-expenses.create')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Log New Bill
                            </Link>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Rows per page */}
                            <div className="flex items-center gap-2.5">
                                <span className="font-medium text-gray-500">Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="appearance-none text-center bg-white rounded-xl border border-gray-300 px-4 py-2.5 text-[13.5px] font-bold outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                                >
                                    <option value={10}>10 Rows</option>
                                    <option value={25}>25 Rows</option>
                                    <option value={50}>50 Rows</option>
                                    <option value={100}>100 Rows</option>
                                    <option value="all">All Data</option>
                                </select>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                            </div>
                        </div>

                        {/* Filters & Search */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            
                            {/* Date / Year Filter */}
                            <div className="flex items-center gap-2">
                                <div className="relative w-full sm:w-[120px]">
                                    <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); if (e.target.value) { setDateFrom(""); setDateTo(""); } }} className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[13.5px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                        <option value="">All Years</option>
                                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <span className="text-gray-300 hidden sm:block">|</span>
                                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setYearFilter(''); }} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer" />
                                <span className="text-gray-400 font-bold">–</span>
                                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setYearFilter(''); }} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer" />
                                
                                {(dateFrom || dateTo || yearFilter) && (
                                    <button onClick={() => { setDateFrom(""); setDateTo(""); setYearFilter(""); }} className="h-9 w-9 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                                        <i className="fa-solid fa-xmark text-sm"></i>
                                    </button>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search bills, vendors..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Date</th>
                                    <th className="px-6 py-4.5">Expense Details</th>
                                    <th className="px-6 py-4.5">Vendor / Payee</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/40">Total Bill</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/40">Paid Amount</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/40 border-r border-gray-100">Due Amount</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center no-print w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400">
                                                {project_expenses.from ? project_expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-[12px] font-bold">
                                                    {exp.date}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 text-[14px]">{exp.project?.title || <span className="text-gray-400 italic">No Project</span>}</div>
                                                <div className="text-[12px] font-medium text-gray-500 mt-0.5 truncate max-w-[250px]" title={exp.title}>{exp.title}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    <i className="fa-solid fa-user-tie text-[12px] text-gray-400"></i> {exp.vendor?.name || <span className="italic text-gray-400">Unknown Vendor</span>}
                                                </div>
                                                <div className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                                                    {exp.account_id ? <><i className="fa-solid fa-building-columns text-blue-500"></i> {exp.account?.name}</> 
                                                    : exp.advance_user_id ? <><i className="fa-solid fa-hand-holding-dollar text-emerald-500"></i> Advance</> 
                                                    : exp.paid_amount > 0 ? <><i className="fa-solid fa-wallet text-purple-500"></i> Vendor Wallet</> 
                                                    : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors">
                                                <span className="font-bold text-blue-700 tabular-nums">
                                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[11.5px] mr-1 opacity-60"></i>
                                                    {parseFloat(exp.total_bill).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                                {parseFloat(exp.paid_amount) > 0 ? (
                                                    <span className="font-bold text-emerald-600 tabular-nums">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[11.5px] mr-1 opacity-60"></i>
                                                        {parseFloat(exp.paid_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors border-r border-gray-100">
                                                {parseFloat(exp.due_amount) > 0 ? (
                                                    <span className="font-black text-rose-600 text-[14.5px] tabular-nums">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[13px] mr-1 opacity-80"></i>
                                                        {parseFloat(exp.due_amount).toLocaleString('en-IN')}
                                                    </span>
                                                ) : <span className="text-gray-300 font-medium">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                                                    ${exp.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : exp.payment_status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'}
                                                `}>
                                                    {exp.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                        <button onClick={() => handleMoveToWallet(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-500 hover:text-white border border-purple-200 hover:border-purple-500 transition-all shadow-sm" title="Move to Vendor Wallet">
                                                            <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('view_project_expense') && (
                                                        <button onClick={() => openViewModal(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_project_expense') && (
                                                        <Link href={route('admin.project-expenses.edit', exp.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shadow-sm" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_project_expense') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-receipt text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No project expenses found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or log a new bill.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {project_expenses.total > 0 && `Showing ${project_expenses.from || 0} to ${project_expenses.to || 0} of ${project_expenses.total || 0} records`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {project_expenses.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active 
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                                                : link.url 
                                                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' 
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'
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

            {/* --- 🟢 STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col relative my-auto animate-[fadeIn_0.2s_ease-out] overflow-hidden">
                        
                        {/* Status Ribbon Ribbon */}
                        <div className={`absolute top-6 left-0 px-4 py-1.5 text-white text-[11.5px] font-black tracking-widest uppercase rounded-r-lg shadow-md z-20 
                            ${selectedExpense.payment_status === 'paid' ? 'bg-emerald-500' : selectedExpense.payment_status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                            {selectedExpense.payment_status}
                        </div>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white pl-28 shrink-0">
                            <div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Expense Receipt</h3>
                                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Reference ID: #{String(selectedExpense.id).padStart(6, '0')}</p>
                            </div>
                            <div className="flex items-center gap-3 relative z-20">
                                <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                    <i className="fa-solid fa-print text-gray-500"></i> Print
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll bg-white">
                            
                            {/* Top Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Project</span>
                                    <div className="text-[15px] font-bold text-gray-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-folder text-indigo-500 mt-0.5"></i> 
                                        <span className="leading-tight">{selectedExpense.project?.title || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Vendor / Payee</span>
                                    <div className="text-[15px] font-bold text-gray-900 flex items-start gap-2.5">
                                        <i className="fa-solid fa-user-tie text-blue-500 mt-0.5"></i> 
                                        <span className="leading-tight">{selectedExpense.vendor?.name || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 flex flex-col justify-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Expense Date</span>
                                    <div className="text-[15px] font-bold text-gray-800 flex items-start gap-2.5">
                                        <i className="fa-regular fa-calendar-days text-rose-500 mt-0.5"></i>
                                        {selectedExpense.date}
                                    </div>
                                </div>
                            </div>

                            {/* Two Column Layout: Details & Financials */}
                            <div className="flex flex-col md:flex-row gap-8">
                                
                                {/* Left: Info & Description */}
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Expense Title</h4>
                                        <div className="text-[15px] font-bold text-indigo-700 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                            {selectedExpense.title}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Payment Source</h4>
                                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                            {selectedExpense.account_id ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><i className="fa-solid fa-building-columns text-[18px]"></i></div><div><p className="text-[14.5px] font-bold text-gray-900">{selectedExpense.account?.name}</p><p className="text-[12px] text-gray-500 mt-0.5">Paid from Bank / Cash</p></div></>
                                            ) : selectedExpense.advance_user_id ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-hand-holding-dollar text-[18px]"></i></div><div><p className="text-[14.5px] font-bold text-gray-900">{selectedExpense.advance_user?.name}</p><p className="text-[12px] text-gray-500 mt-0.5">Paid from Employee Advance</p></div></>
                                            ) : selectedExpense.paid_amount > 0 ? (
                                                <><div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600"><i className="fa-solid fa-wallet text-[18px]"></i></div><div><p className="text-[14.5px] font-bold text-gray-900">Vendor Wallet</p><p className="text-[12px] text-gray-500 mt-0.5">Deducted from vendor balance</p></div></>
                                            ) : (
                                                <><div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400"><i className="fa-solid fa-ban text-[18px]"></i></div><div><p className="text-[14.5px] font-bold text-gray-900">Unpaid / N/A</p></div></>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Remarks / Description</h4>
                                        <div className="bg-gray-50/80 p-5 rounded-xl text-[14px] text-gray-700 leading-relaxed min-h-[100px] border border-gray-100">
                                            {selectedExpense.description || <span className="text-gray-400 italic font-medium">No remarks provided for this transaction.</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Financial Summary Box (Dark Mode) */}
                                <div className="w-full md:w-[340px] shrink-0 bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
                                    
                                    <div>
                                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-800 pb-3">Amount Summary</h4>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] text-gray-300">Total Billed</span>
                                                <span className="text-[18px] font-bold text-white tabular-nums">৳ {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[14px] text-emerald-400">Total Paid</span>
                                                <span className="text-[18px] font-bold text-emerald-400 tabular-nums">৳ {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-800 mt-8">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[13.5px] text-rose-300 font-bold uppercase tracking-wider">Due Balance</span>
                                            <span className="text-[28px] font-black text-rose-400 tabular-nums tracking-tight">৳ {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</span>
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