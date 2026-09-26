import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Index({ expenses = { data: [], links: [] }, totalAmount = 0, thisMonthTotal = 0, categories = [], accounts = [], advances = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || "25");

    // Date Filter States
    const [dateFilter, setDateFilter] = useState(() => new URLSearchParams(window.location.search).get("date_filter") || "all");
    const [startDate, setStartDate] = useState(() => new URLSearchParams(window.location.search).get("start_date") || "");
    const [endDate, setEndDate] = useState(() => new URLSearchParams(window.location.search).get("end_date") || "");

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "", title: "", expense_category_id: "", account_id: "", advance_user_id: "",
        amount: "", bank_charge: "", date: new Date().toISOString().slice(0, 10),
        description: "", pay_type: "account", attachment: null, _method: "post",
    });

    // --- Live Search, Filters & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== "10") params.per_page = perPage;

            if (dateFilter !== "all") {
                params.date_filter = dateFilter;
                if (dateFilter === "custom") {
                    if (startDate) params.start_date = startDate;
                    if (endDate) params.end_date = endDate;
                }
            }

            router.get(route("admin.expenses.index"), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage, dateFilter, startDate, endDate]);

    // --- Clear All Filters ---
    const clearFilters = () => {
        setSearchTerm("");
        setPerPage("25");
        setDateFilter("all");
        setStartDate("");
        setEndDate("");
        router.get(route("admin.expenses.index"), { per_page: 25 }, { replace: true, preserveState: true });
    };

    const expList = expenses.data || [];

    // --- Export Tools ---
    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Title,Category,Payment Source,Amount,Bank Charge,Description\n"];
        const rows = expList.map(e => {
            const safeDescription = (e.description || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
            return `"${e.date}","${e.title}","${e.category?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : '')}","${e.amount}","${e.bank_charge || 0}","${safeDescription}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Office_Expenses_${new Date().toISOString().slice(0, 10)}.csv`); link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        let reportTime = "All Time";
        if (dateFilter === 'today') reportTime = "Today's";
        else if (dateFilter === 'this_week') reportTime = "This Week's";
        else if (dateFilter === 'this_month') reportTime = "This Month's";
        else if (dateFilter === 'this_year') reportTime = "This Year's";
        else if (dateFilter === 'custom') reportTime = `From ${startDate || '?'} to ${endDate || '?'}`;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Office Expenses Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Office Expenses Report</h2>
                    <p>Report Period: <b>${reportTime}</b></p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close(); printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '', title: '', description: '', expense_category_id: '', advance_user_id: '', account_id: '',
            amount: '', bank_charge: '', date: new Date().toISOString().slice(0, 10), pay_type: 'account', attachment: null, _method: "post"
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id, title: expense.title || "", expense_category_id: expense.expense_category_id || "",
            account_id: expense.account_id || "", advance_user_id: expense.advance_user_id || "",
            amount: expense.amount || "", bank_charge: expense.bank_charge || "", date: expense.date || "",
            description: expense.description || "", pay_type: expense.advance_user_id ? 'advance' : 'account',
            attachment: null, _method: "put",
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (expense) => { setSelectedExpense(expense); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.pay_type === 'account' && !data.account_id) return Swal.fire("Required", "Please select a Bank/Cash Account.", "warning");
        if (data.pay_type === 'advance' && !data.advance_user_id) return Swal.fire("Required", "Please select an Advance User.", "warning");

        post(editMode ? route("admin.expenses.update", data.id) : route("admin.expenses.store"), {
            onSuccess: () => {
                reset(); setShowModal(false);
                Swal.fire({ icon: "success", title: editMode ? "Updated Successfully!" : "Logged Successfully!", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
            },
            forceFormData: true,
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Expense?", text: "This will restore the amount to your account or advance balance.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, Delete It",
        }).then((res) => {
            if (res.isConfirmed) destroy(route("admin.expenses.destroy", id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }) });
        });
    };

    // 🟢 Deeper Contrast Select Styles
    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '48px', borderRadius: '0.75rem',
            borderColor: state.isFocused ? '#4F46E5' : '#94A3B8',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            backgroundColor: '#FFFFFF', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
            '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }
        }),
        option: (base, state) => ({
            ...base, backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
            color: state.isSelected ? '#FFFFFF' : '#0F172A', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
        }),
        placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
        singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
        menuPortal: (base) => ({ ...base, zIndex: 99999 }),
        menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
    };

    const advanceOptions = advances.map((a) => {
        return { value: a.user_id, label: `${a.user?.name || 'Unknown'} (Rem: ৳${Number(a.balance).toLocaleString('en-IN')})` };
    });

    const inputClass = "w-full rounded-xl border border-slate-400 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-[14px] font-extrabold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all";

    return (
        <AdminLayout>
            <Head title="Office Expenses" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 mt-4 px-4 sm:px-6 lg:px-8">

                {/* --- PREMIUM DASHBOARD HEADER --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-receipt"></i> Financial Operations
                        </div>
                        <h1 className="text-[26px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none mt-2">Office Expenses</h1>
                        <p className="text-[13px] sm:text-[14.5px] font-bold text-slate-600 mt-2">Track, manage, and analyze your company's operational spending.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-5 sm:px-6 py-5 shadow-lg border border-slate-700 text-white min-w-0 sm:min-w-[240px]">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300">
                                    <i className="fa-solid fa-chart-pie text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">This Month</p>
                                    <h3 className="text-[20px] sm:text-[24px] font-black tracking-tight mt-0.5 tabular-nums truncate">
                                        <Taka className="text-indigo-400" />{parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-white px-5 sm:px-6 py-5 shadow-md border border-slate-300 min-w-0 sm:min-w-[240px]">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-500">
                                    <i className="fa-solid fa-filter-circle-dollar text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Filtered Total</p>
                                    <h3 className="text-[20px] sm:text-[24px] font-black text-slate-900 tracking-tight mt-0.5 tabular-nums truncate">
                                        <Taka className="text-slate-400" />{parseFloat(totalAmount || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT CARD --- */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden flex flex-col">

                    {/* UNIFIED TOOLBAR */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">

                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-auto">
                                <span className="text-[12px] font-black text-slate-500 mr-2 uppercase tracking-wide">Show</span>
                                <select value={perPage} onChange={(e) => setPerPage(e.target.value)} className="w-full sm:w-auto border-none bg-transparent text-[13px] font-bold text-slate-900 outline-none cursor-pointer p-0 focus:ring-0">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="relative w-full sm:w-auto">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input
                                    type="text" placeholder="Search anything..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-[240px] rounded-xl border border-slate-300 py-2.5 pl-9 pr-4 text-[13.5px] outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 bg-white font-bold shadow-sm"
                                />
                            </div>

                            <div className="relative w-full sm:w-auto">
                                <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); if(e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }} className="appearance-none w-full sm:w-[150px] rounded-xl border border-slate-300 bg-white pl-4 pr-9 py-2.5 text-[13.5px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer">
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="this_year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                            </div>

                            {dateFilter === "custom" && (
                                <div className="flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] bg-white border border-slate-300 rounded-xl px-2 shadow-sm w-full sm:w-auto overflow-hidden">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 w-full border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold outline-none focus:ring-0 cursor-pointer" />
                                    <span className="text-slate-400 text-[12px] font-bold">-</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 w-full border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold outline-none focus:ring-0 cursor-pointer" />
                                </div>
                            )}

                            {(searchTerm || dateFilter !== 'all' || perPage !== '25') && (
                                <button onClick={clearFilters} className="h-10 px-4 rounded-xl border border-rose-300 bg-rose-50 text-[12.5px] font-black text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-400 shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto">
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                            <div className="flex flex-1 sm:flex-none bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
                                <button onClick={handleExportCSV} className="flex-1 sm:flex-none px-4 py-2.5 border-r border-slate-300 hover:bg-slate-50 transition-colors text-[13px] font-bold text-emerald-700 flex items-center justify-center gap-1.5" title="Download CSV"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex-1 sm:flex-none px-4 py-2.5 hover:bg-slate-50 transition-colors text-[13px] font-bold text-slate-700 flex items-center justify-center gap-1.5" title="Print Data"><i className="fas fa-print text-slate-500"></i> Print</button>
                            </div>

                            {hasPermission('create_expense') && (
                                <button onClick={openCreateModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[13.5px] font-black text-white transition-all hover:bg-indigo-700 hover:shadow-lg shadow-md hover:-translate-y-0.5">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add Expense
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- MODERN DATA TABLE --- */}
                    <div className="overflow-x-auto custom-table-scroll min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[750px]">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 sm:px-6 py-4.5 text-center text-[11.5px] font-black text-slate-600 uppercase tracking-widest w-12 sm:w-16">SL</th>
                                    <th className="px-4 sm:px-6 py-4.5 text-left text-[11.5px] font-black text-slate-600 uppercase tracking-widest w-24 sm:w-32">Date</th>
                                    <th className="px-4 sm:px-6 py-4.5 text-left text-[11.5px] font-black text-slate-600 uppercase tracking-widest w-[35%]">Expense Details</th>
                                    <th className="px-4 sm:px-6 py-4.5 text-left text-[11.5px] font-black text-slate-600 uppercase tracking-widest">Payment Source</th>
                                    <th className="px-4 sm:px-6 py-4.5 text-right text-[11.5px] font-black text-slate-600 uppercase tracking-widest">Amount</th>
                                    <th className="px-4 sm:px-6 py-4.5 text-center text-[11.5px] font-black text-slate-600 uppercase tracking-widest no-print w-28 sm:w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-4 sm:px-6 py-4 font-bold text-slate-500 text-center text-[13.5px] tabular-nums">
                                                {expenses.from ? expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-black text-[11px] sm:text-[12.5px] shadow-sm">
                                                    <i className="fa-regular fa-calendar text-[10px] sm:text-[11px] text-slate-400"></i> {exp.date}
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="font-extrabold text-[14px] sm:text-[15px] text-slate-900 mb-1.5 whitespace-normal break-words line-clamp-2">{exp.title}</div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700 border border-slate-300 shadow-sm">
                                                        {exp.category?.name || "Uncategorized"}
                                                    </span>
                                                    {exp.description && (
                                                        <span className="text-[11px] sm:text-[12.5px] text-slate-500 font-bold truncate max-w-[120px] sm:max-w-[200px]" title={exp.description}>
                                                            • {exp.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                {exp.account_id ? (
                                                    <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] sm:text-[13px] font-black shadow-sm">
                                                        <div className="hidden sm:flex h-6 w-6 rounded-md bg-blue-100 items-center justify-center"><i className="fa-solid fa-building-columns text-[11px] text-blue-600"></i></div>
                                                        {exp.account?.name || 'Bank Account'}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-[13px] font-black shadow-sm">
                                                        <div className="hidden sm:flex h-6 w-6 rounded-md bg-emerald-100 items-center justify-center"><i className="fa-solid fa-hand-holding-dollar text-[11px] text-emerald-600"></i></div>
                                                        Adv: {exp.advance_user?.name?.split(' ')[0] || 'User'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-right">
                                                <div className="font-black text-rose-600 text-[15px] sm:text-[16px] tabular-nums tracking-tight">
                                                    <Taka className="text-rose-500" />{parseFloat(exp.amount).toLocaleString('en-IN')}
                                                </div>
                                                {parseFloat(exp.bank_charge) > 0 && <div className="text-[9.5px] sm:text-[10.5px] font-black text-slate-400 mt-1 uppercase tracking-wider">+ ৳{parseFloat(exp.bank_charge).toLocaleString('en-IN')}</div>}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-center no-print">
                                                {/* 🟢 Action buttons are always visible (removed hover opacity class) */}
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                    {hasPermission('view_expence') && (
                                                        <button onClick={() => openViewModal(exp)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-all shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12px] sm:text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_expence') && (
                                                        <button onClick={() => openEditModal(exp)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 flex items-center justify-center transition-all shadow-sm" title="Edit Expense">
                                                            <i className="fa-regular fa-pen-to-square text-[12px] sm:text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_expence') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-all shadow-sm" title="Delete Expense">
                                                            <i className="fa-regular fa-trash-can text-[12px] sm:text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 sm:py-24 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-slate-50 rounded-full border border-slate-200 shadow-sm flex items-center justify-center mb-4 text-slate-400">
                                                    <i className="fa-solid fa-receipt text-xl sm:text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] sm:text-[16px] font-black text-slate-800">No records found</p>
                                                <p className="text-[12.5px] sm:text-[13.5px] font-bold text-slate-500 mt-1">Adjust your filters or add a new expense.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 no-print">
                            <div className="text-[12.5px] sm:text-[13.5px] font-bold text-slate-600 text-center sm:text-left w-full sm:w-auto">
                                Showing <span className="font-black text-slate-900">{expenses.from || 0}</span> to <span className="font-black text-slate-900">{expenses.to || 0}</span> of <span className="font-black text-slate-900">{expenses.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-1.5 w-full sm:w-auto">
                                {expenses.links.map((link, index) => (
                                    <Link
                                        key={index} href={link.url || "#"} preserveState
                                        className={`flex min-w-[32px] sm:min-w-[34px] items-center justify-center rounded-lg border px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[13px] font-black transition-all shadow-sm
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400' : 'border-slate-200 bg-slate-50 text-slate-400 pointer-events-none'}
                                        `}
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-arrow-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-arrow-right text-[10px]"></i>' : link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 CREATE / EDIT FORM MODAL (100% Native Tailwind Responsive) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 md:p-8">
                    {/* MODAL WRAPPER */}
                    <div className="w-full max-w-5xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[95vh] overflow-hidden border border-slate-700/30 animate-[scaleIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="shrink-0 flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-700 bg-slate-900 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-sm">
                                    <i className="fa-solid fa-receipt"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[18px] sm:text-[22px] font-black text-white tracking-tight leading-none relative z-10">
                                    {editMode ? "Edit Office Expense" : "Log Office Expense"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-red-500 border border-white/10 h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white/5 relative z-10 shrink-0">
                                <i className="fa-solid fa-xmark sm:text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body Container (Scrollable) */}
                        <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-6 sm:gap-8 items-start relative">

                                {/* Left Column (Form Inputs) */}
                                <div className="flex-1 w-full space-y-5 sm:space-y-6">
                                    {errors.error && (
                                        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3 sm:p-4 text-[12.5px] sm:text-[13.5px] font-bold text-red-700 shadow-sm">
                                            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-base sm:text-lg"></i>
                                            {errors.error}
                                        </div>
                                    )}

                                    {/* Card 1: Basic Info */}
                                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-300">
                                        <h4 className="text-[12px] sm:text-[13px] font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fa-solid fa-circle-info mr-1.5 text-indigo-500"></i> Basic Information</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-[11.5px] sm:text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-2 sm:mb-2.5">Transaction Date <span className="text-red-600">*</span></label>
                                                <input
                                                    type="date"
                                                    value={data.date}
                                                    onChange={e => setData('date', e.target.value)}
                                                    className={`${inputClass} cursor-pointer`}
                                                    required
                                                />
                                                {errors.date && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.date}</p>}
                                            </div>

                                            <div className="relative z-[60]">
                                                <label className="block text-[11.5px] sm:text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-2 sm:mb-2.5">Expense Category <span className="text-red-600">*</span></label>
                                                <Select
                                                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                                    value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null}
                                                    onChange={(selected) => setData("expense_category_id", selected ? selected.value : "")}
                                                    placeholder="Search Category..."
                                                    isSearchable isClearable
                                                    styles={selectStyles}
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                    menuPosition="fixed"
                                                />
                                                {errors.expense_category_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.expense_category_id}</p>}
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11.5px] sm:text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-2 sm:mb-2.5">Expense Title / Subject <span className="text-red-600">*</span></label>
                                                <input
                                                    type="text"
                                                    value={data.title}
                                                    onChange={e => setData('title', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="e.g. Monthly Electricity Bill"
                                                    required
                                                />
                                                {errors.title && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.title}</p>}
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[11.5px] sm:text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-2 sm:mb-2.5">Description / Notes <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                                <textarea
                                                    value={data.description}
                                                    onChange={e => setData('description', e.target.value)}
                                                    rows="2"
                                                    className="w-full rounded-xl border border-slate-400 bg-white p-3 sm:p-4 text-[13px] sm:text-[14px] font-bold text-slate-900 outline-none transition-shadow focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 resize-none min-h-[80px] shadow-sm"
                                                    placeholder="Add any extra context or breakdown..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2: Payment Source */}
                                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 relative z-50">
                                        <h4 className="text-[12px] sm:text-[13px] font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fa-solid fa-wallet mr-1.5 text-emerald-500"></i> Payment Source</h4>

                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5">
                                            <label className={`flex-1 cursor-pointer rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-center transition-all flex items-center justify-center gap-3 shadow-sm ${data.pay_type === 'account' ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white hover:border-indigo-400 text-slate-600'}`}>
                                                <input type="radio" className="sr-only" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${data.pay_type === 'account' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}><i className="fa-solid fa-building-columns text-sm sm:text-base"></i></div>
                                                <div className="text-left">
                                                    <span className="block text-[13px] sm:text-[14px] font-black leading-tight">Bank / Cash</span>
                                                    <span className="block text-[10px] sm:text-[11px] font-bold opacity-70">Pay from office fund</span>
                                                </div>
                                            </label>

                                            <label className={`flex-1 cursor-pointer rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-center transition-all flex items-center justify-center gap-3 shadow-sm ${data.pay_type === 'advance' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' : 'border-slate-300 bg-white hover:border-emerald-400 text-slate-600'}`}>
                                                <input type="radio" className="sr-only" checked={data.pay_type === 'advance'} onChange={() => { setData(prev => ({...prev, pay_type: 'advance', bank_charge: 0})); setData('account_id', ''); }} />
                                                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${data.pay_type === 'advance' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}><i className="fa-solid fa-hand-holding-dollar text-sm sm:text-base"></i></div>
                                                <div className="text-left">
                                                    <span className="block text-[13px] sm:text-[14px] font-black leading-tight">Advance</span>
                                                    <span className="block text-[10px] sm:text-[11px] font-bold opacity-70">Settle advance</span>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="relative z-40">
                                            <label className="block text-[11.5px] sm:text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-2 sm:mb-2.5">{data.pay_type === 'account' ? 'Select Bank/Cash Account' : 'Select Employee'} <span className="text-red-600">*</span></label>
                                            {data.pay_type === 'account' ? (
                                                <Select
                                                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                    value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                    onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                    placeholder="Type to search account..."
                                                    isSearchable isClearable styles={selectStyles} menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed"
                                                />
                                            ) : (
                                                <Select
                                                    options={advanceOptions}
                                                    value={advanceOptions.find((opt) => Number(opt.value) === Number(data.advance_user_id)) || null}
                                                    onChange={(selected) => setData("advance_user_id", selected ? selected.value : "")}
                                                    placeholder="Type to search employee..."
                                                    isSearchable isClearable styles={selectStyles} menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed"
                                                />
                                            )}
                                            {errors.account_id && data.pay_type === 'account' && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                            {errors.advance_user_id && data.pay_type === 'advance' && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.advance_user_id}</p>}
                                        </div>
                                    </div>

                                    {/* Card 3: Attachment */}
                                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-300">
                                        <h4 className="text-[12px] sm:text-[13px] font-black text-slate-800 uppercase tracking-widest mb-3 sm:mb-4 border-b border-slate-200 pb-2"><i className="fa-solid fa-paperclip mr-1.5 text-slate-500"></i> Attachment <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></h4>
                                        <input type="file" onChange={e => setData('attachment', e.target.files[0])} className="w-full rounded-xl border border-dashed border-slate-400 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 text-[12px] sm:text-[13px] font-bold text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 sm:file:px-4 file:py-1.5 file:text-[11px] sm:file:text-[12px] file:font-black file:text-indigo-700 hover:file:bg-indigo-200 transition-all cursor-pointer shadow-sm" accept="image/*,application/pdf" />
                                    </div>
                                </div>

                                {/* Right Column (Summary & Action Buttons) - STICKY NATIVELY ON DESKTOP */}
                                <div className="w-full xl:w-[380px] shrink-0 xl:sticky xl:top-0">
                                    <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-700 relative overflow-hidden text-white">
                                        <span className="absolute -right-4 -top-10 text-[120px] sm:text-[160px] leading-none font-mono text-white/[0.04] select-none pointer-events-none">৳</span>

                                        <div className="relative z-10">
                                            <h3 className="text-[12px] sm:text-[13px] font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-6 border-b border-slate-700 pb-2 sm:pb-3">Financial Summary</h3>

                                            <div className="space-y-4 sm:space-y-6">
                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-bold text-slate-300 mb-2 sm:mb-2.5">Expense Amount <span className="text-rose-500">*</span></label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-rose-500 text-[16px] sm:text-[18px]" />
                                                        <input type="number" step="0.01" min="1" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-rose-400/50 bg-rose-950/30 pl-9 sm:pl-10 pr-4 py-3 sm:py-3.5 text-[16px] sm:text-[18px] font-black tabular-nums text-rose-400 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all shadow-inner" placeholder="0.00" required />
                                                    </div>
                                                    {errors.amount && <p className="text-rose-400 text-xs mt-1.5 font-bold">{errors.amount}</p>}
                                                </div>

                                                {data.pay_type === 'account' && (
                                                    <div>
                                                        <label className="block text-[12px] sm:text-[13px] font-bold text-slate-300 mb-2 sm:mb-2.5">Bank charge <span className="text-slate-500 font-medium">(extra)</span></label>
                                                        <div className="relative">
                                                            <Taka className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[13px] sm:text-[15px]" />
                                                            <input type="number" step="0.01" min="0" value={data.bank_charge} onChange={e => setData('bank_charge', e.target.value)} className="w-full rounded-xl border border-slate-600 bg-slate-800 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-[14px] sm:text-[15px] font-black tabular-nums text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" placeholder="0.00" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-4 sm:pt-6 border-t border-slate-700 mt-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[12px] sm:text-[14px] font-bold text-slate-400 uppercase tracking-widest">Total Deduction</span>
                                                    </div>
                                                    <div className="text-[26px] sm:text-[32px] font-black text-indigo-400 tabular-nums tracking-tight">
                                                        <Taka className="text-[16px] sm:text-[20px] mr-1" />{Number((parseFloat(data.amount||0) + parseFloat(data.pay_type === 'account' ? (data.bank_charge||0) : 0))).toLocaleString('en-IN', {minimumFractionDigits:2})}
                                                    </div>
                                                </div>

                                                <div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:gap-3">
                                                    <button type="submit" disabled={processing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 sm:py-4 rounded-xl text-[14px] sm:text-[15px] font-black transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                                        {processing ? <><i className="fa-solid fa-spinner fa-spin text-base sm:text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-base sm:text-lg"></i> {editMode ? "Update Record" : "Save Record"}</>}
                                                    </button>
                                                    <button type="button" onClick={() => setShowModal(false)} className="w-full text-slate-300 py-3 sm:py-3.5 rounded-xl text-[13px] sm:text-[14px] font-bold hover:text-white transition-colors border border-slate-600 hover:bg-slate-800 flex items-center justify-center">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 VIEW DETAILS MODAL (Fully Responsive Layout) --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 md:p-8">
                    <div className="w-full max-w-4xl bg-gray-50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[95vh] overflow-hidden border border-slate-700/30 animate-[scaleIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="relative bg-slate-900 px-5 sm:px-8 py-5 sm:py-8 shrink-0 overflow-hidden border-b border-slate-700">
                            <span className="absolute -right-6 -top-10 text-[100px] sm:text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-white/5 opacity-50 translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-4 right-4 sm:top-6 sm:right-6 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-red-500 transition-colors z-20 shadow-sm shrink-0">
                                <i className="fa-solid fa-xmark text-sm sm:text-lg"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center mt-2 sm:mt-0">
                                <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-white text-xl sm:text-3xl shadow-lg border border-white/20">
                                    <i className="fa-solid fa-receipt"></i>
                                </div>
                                <div className="min-w-0 pr-8 sm:pr-0 w-full">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-2">
                                        <span className="px-2.5 py-1 rounded-lg text-[9px] sm:text-[11px] font-black uppercase tracking-widest bg-white/10 border border-white/10 text-white shadow-sm">
                                            Ref: #{String(selectedExpense.id).padStart(6, '0')}
                                        </span>
                                    </div>
                                    <h2 className="text-[20px] sm:text-[30px] font-black text-white tracking-tight leading-tight break-words whitespace-normal">{selectedExpense.title}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5 sm:mb-2"><i className="fa-solid fa-tag mr-1 text-indigo-500"></i> Category</span>
                                    <div className="font-black text-slate-900 text-[14px] sm:text-[16px]">{selectedExpense.category?.name || "Uncategorized"}</div>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5 sm:mb-2"><i className="fa-regular fa-calendar-days mr-1 text-rose-500"></i> Date</span>
                                    <div className="font-black text-slate-900 text-[14px] sm:text-[16px]">{selectedExpense.date || "-"}</div>
                                </div>
                                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center border-l-4 border-l-emerald-500">
                                    <span className="block text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5 sm:mb-2"><i className="fa-solid fa-money-bill-wave mr-1 text-emerald-600"></i> Base Amount</span>
                                    <div className="font-black text-emerald-600 text-[20px] sm:text-[24px] tabular-nums leading-none"><Taka className="text-[14px] sm:text-[16px] mr-1 opacity-70" />{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
                                <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
                                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm">
                                        <span className="block text-[12px] sm:text-[13px] font-black uppercase tracking-widest text-slate-800 mb-2.5 sm:mb-3 border-b border-slate-200 pb-2"><i className="fa-solid fa-wallet mr-1.5 text-slate-400"></i> Payment Source</span>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
                                            {selectedExpense.account_id ? (
                                                <><div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl sm:rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm"><i className="fa-solid fa-building-columns text-[16px] sm:text-[18px]"></i></div><div><p className="text-[14px] sm:text-[15px] font-black text-slate-900">{selectedExpense.account?.name || 'Bank Account'}</p><p className="text-[11px] sm:text-[12px] font-bold text-slate-500 mt-0.5">Paid from Bank / Cash</p></div></>
                                            ) : selectedExpense.advance_user_id ? (
                                                <><div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl sm:rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-sm"><i className="fa-solid fa-hand-holding-dollar text-[16px] sm:text-[18px]"></i></div><div><p className="text-[14px] sm:text-[15px] font-black text-slate-900">Advance: {selectedExpense.advance_user?.name}</p><p className="text-[11px] sm:text-[12px] font-bold text-slate-500 mt-0.5">Paid from Employee Advance</p></div></>
                                            ) : (
                                                <><div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl sm:rounded-2xl bg-gray-200 flex items-center justify-center text-gray-500 border border-gray-300 shadow-sm"><i className="fa-solid fa-ban text-[16px] sm:text-[18px]"></i></div><div><p className="text-[14px] sm:text-[15px] font-black text-gray-900">N/A</p></div></>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm">
                                        <span className="block text-[12px] sm:text-[13px] font-black uppercase tracking-widest text-slate-800 mb-2.5 sm:mb-3 border-b border-slate-200 pb-2"><i className="fa-solid fa-align-left text-slate-400 mr-1.5"></i> Description & Notes</span>
                                        <div className="text-slate-700 text-[13.5px] sm:text-[14.5px] font-bold leading-relaxed whitespace-pre-line bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 min-h-[80px] sm:min-h-[100px] break-words">
                                            {selectedExpense.description || <span className="italic text-slate-400 font-medium">No description provided for this transaction.</span>}
                                        </div>
                                    </div>

                                    {selectedExpense.attachment && (
                                        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                            <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-widest text-slate-800"><i className="fa-solid fa-paperclip mr-1.5 text-slate-400"></i> Receipt Document</span>
                                            <a
                                                href={`/storage/${selectedExpense.attachment}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-black transition-colors shadow-sm w-full sm:w-auto"
                                            >
                                                <i className="fa-solid fa-download"></i> View Document
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-[320px] shrink-0 bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-700">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

                                    <div>
                                        <h4 className="text-[11px] sm:text-[12px] font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-6 border-b border-slate-700 pb-2 sm:pb-3"><i className="fa-solid fa-calculator mr-1.5"></i> Amount Summary</h4>
                                        <div className="space-y-4 sm:space-y-5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[13px] sm:text-[14px] font-bold text-slate-300">Base Expense</span>
                                                <span className="text-[16px] sm:text-[18px] font-black text-white tabular-nums">৳ {parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</span>
                                            </div>
                                            {selectedExpense.account_id && (
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[13px] sm:text-[14px] font-bold text-slate-400">Bank Charge <span className="text-[10px] sm:text-[11px] font-medium">(extra)</span></span>
                                                    <span className="text-[14px] sm:text-[16px] font-bold text-slate-400 tabular-nums">+ ৳ {parseFloat(selectedExpense.bank_charge || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-5 sm:pt-6 border-t border-slate-700 mt-6 sm:mt-8 relative z-10">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[12px] sm:text-[14px] text-indigo-300 font-black uppercase tracking-widest">Total Deduction</span>
                                            <span className="text-[24px] sm:text-[30px] font-black text-indigo-400 tabular-nums tracking-tight leading-none">
                                                ৳ {Number(parseFloat(selectedExpense.amount) + parseFloat(selectedExpense.account_id ? (selectedExpense.bank_charge || 0) : 0)).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-slate-300 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 px-6 sm:px-10 py-3 sm:py-3.5 text-[13px] sm:text-[14px] font-bold text-white transition-colors hover:bg-black shadow-md w-full sm:w-auto">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
