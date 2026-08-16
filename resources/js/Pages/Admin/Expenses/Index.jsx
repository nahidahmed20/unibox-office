import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

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
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || "10");

    // Date Filter States
    const [dateFilter, setDateFilter] = useState(() => new URLSearchParams(window.location.search).get("date_filter") || "all");
    const [startDate, setStartDate] = useState(() => new URLSearchParams(window.location.search).get("start_date") || "");
    const [endDate, setEndDate] = useState(() => new URLSearchParams(window.location.search).get("end_date") || "");

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "",
        title: "",
        expense_category_id: "",
        account_id: "",
        advance_user_id: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        pay_type: "account",
        attachment: null,
        _method: "post",
    });

    // --- Live Search, Filters & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
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
            });
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage, dateFilter, startDate, endDate]);

    // --- Clear All Filters ---
    const clearFilters = () => {
        setSearchTerm("");
        setPerPage("10");
        setDateFilter("all");
        setStartDate("");
        setEndDate("");
        router.get(route("admin.expenses.index"), {}, { replace: true });
    };

    const expList = expenses.data || [];

    // --- Export Tools ---
    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList
            .map((e) => `${e.date}\t${e.title}\t${e.category?.name || "N/A"}\t${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'N/A')}\tTK. ${e.amount}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Title,Category,Payment Source,Amount,Description\n"];
        const rows = expList.map(e => {
            const safeDescription = (e.description || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
            return `"${e.date}","${e.title}","${e.category?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : '')}","${e.amount}","${safeDescription}"`;
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
            id: '',
            title: '',
            description: '',
            expense_category_id: '',
            advance_user_id: '',
            account_id: '',
            amount: '',
            date: new Date().toISOString().slice(0, 10),
            pay_type: 'account',
            attachment: null,
            _method: "post"
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id,
            title: expense.title || "",
            expense_category_id: expense.expense_category_id || "",
            account_id: expense.account_id || "",
            advance_user_id: expense.advance_user_id || "",
            amount: expense.amount || "",
            date: expense.date || "",
            description: expense.description || "",
            pay_type: expense.advance_user_id ? 'advance' : 'account',
            attachment: null,
            _method: "put",
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

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "48px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent, #6366f1)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent, #6366f1)" : "#9ca3af" },
            fontSize: "14px",
            background: "#fff",
            cursor: "pointer"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#1f2937", fontSize: "14px", fontWeight: "600" }),
        option: (provided, state) => ({
            ...provided, fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent, #4f46e5)" : state.isFocused ? "#f8fafc" : "#fff",
            color: state.isSelected ? "#fff" : "#1f2937", cursor: "pointer",
            padding: "10px 12px"
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    const advanceOptions = advances.map((a) => {
        return { value: a.user_id, label: `${a.user?.name || 'Unknown'} (Rem: ৳${Number(a.balance).toLocaleString('en-IN')})` };
    });

    return (
        <AdminLayout>
            <Head title="Office Expenses" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Page Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Financial Operations
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Office Expenses</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Monitor and manage internal company expenses and outlays.</p>
                    </div>

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-3.5 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 px-5 py-4 shadow-sm">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
                                <i className="fa-solid fa-calendar-check text-[15px]"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600/90">This Month's Total</p>
                                <h3 className="text-[18px] font-black text-blue-700 tabular-nums tracking-tight mt-0.5">
                                    <Taka />{parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 px-5 py-4 shadow-sm">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                                <i className="fa-solid fa-filter text-[15px]"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/90">Filtered Total</p>
                                <h3 className="text-[18px] font-black text-rose-700 tabular-nums tracking-tight mt-0.5">
                                    <Taka />{parseFloat(totalAmount || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-receipt text-[14px]"></i>
                            </div>
                            Expense List
                        </div>
                        {hasPermission('create_expense') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Log Expense
                            </button>
                        )}
                    </div>

                    {/* Toolbar & Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Show Entries */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select
                                        value={perPage}
                                        onChange={(e) => setPerPage(e.target.value)}
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value="10">10 Rows</option>
                                        <option value="25">25 Rows</option>
                                        <option value="50">50 Rows</option>
                                        <option value="100">100 Rows</option>
                                        <option value="1000">1000 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search & Date Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">

                            {/* Date Filter Dropdown */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={dateFilter}
                                    onChange={(e) => { setDateFilter(e.target.value); if(e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }}
                                    className="appearance-none bg-none [background-image:none] w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="this_year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>

                                {/* Custom Date Range Picker */}
                                {dateFilter === "custom" && (
                                    <div className="flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[13px] font-semibold outline-none transition-shadow focus:border-indigo-500 cursor-pointer shadow-sm" />
                                        <span className="text-gray-400 text-[13px]">to</span>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[13px] font-semibold outline-none transition-shadow focus:border-indigo-500 cursor-pointer shadow-sm" />
                                    </div>
                                )}
                            </div>

                            {/* Search Box */}
                            <div className="relative w-full sm:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search expenses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white font-medium"
                                />
                            </div>

                            {/* CLEAR FILTERS BUTTON */}
                            {(searchTerm || dateFilter !== 'all' || perPage !== '10') && (
                                <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-600 transition-colors hover:bg-rose-100 shadow-sm shrink-0">
                                    <i className="fa-solid fa-xmark"></i> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Date</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[30%]">Expense Title</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Category & Source</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Amount</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                {expenses.from ? expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-600">
                                                <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar-days text-[11px] text-gray-400"></i> {exp.date}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-[14.5px] text-gray-900 truncate max-w-[300px]" title={exp.title}>{exp.title}</div>
                                                {exp.description && (
                                                    <div className="text-[12px] font-medium text-gray-500 mt-1 max-w-[280px] truncate" title={exp.description}>
                                                        {exp.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 mb-1.5 rounded-md bg-gray-100 text-[10px] font-extrabold uppercase tracking-wider text-gray-600 border border-gray-200">
                                                    {exp.category?.name || "Uncategorized"}
                                                </span>
                                                <div className="text-[12px] text-gray-600 font-bold flex items-center gap-1.5">
                                                    <i className={exp.advance_user_id ? "fa-solid fa-hand-holding-dollar text-emerald-500 text-[11px]" : "fa-solid fa-building-columns text-indigo-400 text-[11px]"}></i>
                                                    {exp.account_id ? (exp.account?.name || 'Account') : (exp.advance_user_id ? 'Advance' : 'N/A')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 text-[15px] tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors">
                                                <Taka />{parseFloat(exp.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_expence') && (
                                                        <button onClick={() => openViewModal(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_expence') && (
                                                        <button onClick={() => openEditModal(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Expense">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_expence') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Expense">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-receipt text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No expenses found for this period.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or log a new expense.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing {expenses.from || 0} to {expenses.to || 0} of {expenses.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {expenses.links.map((link, index) => (
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

            {/* --- WIDE & MODERN VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-black opacity-10 -translate-x-5 translate-y-5"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl shadow-lg ring-1 ring-white/30">
                                    <i className="fa-solid fa-receipt"></i>
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/20 text-white">
                                            Ref: #{String(selectedExpense.id).padStart(5, '0')}
                                        </span>
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">{selectedExpense.title}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-tag mr-1 text-indigo-400"></i> Category</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedExpense.category?.name || "Uncategorized"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-rose-400"></i> Date</span>
                                    <div className="font-bold text-gray-900 text-[15px]">{selectedExpense.date || "-"}</div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"><i className="fa-solid fa-money-bill-wave mr-1 text-emerald-500"></i> Amount</span>
                                    <div className="font-black text-rose-600 text-[18px] tabular-nums"><Taka />{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Payment Source</span>
                                    <div className="font-bold text-gray-900 text-[15px] flex items-center gap-2">
                                        <i className={selectedExpense.advance_user_id ? "fa-solid fa-hand-holding-dollar text-emerald-500" : "fa-solid fa-building-columns text-indigo-500"}></i>
                                        {selectedExpense.account_id ? (selectedExpense.account?.name || 'Account') : (selectedExpense.advance_user_id ? `Advance (${selectedExpense.advance_user?.name || ''})` : 'N/A')}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-3 border-b border-gray-100 pb-2"><i className="fa-solid fa-align-left text-gray-400 mr-1.5"></i> Description & Notes</span>
                                <div className="text-gray-600 text-[14.5px] leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[90px]">
                                    {selectedExpense.description || <span className="italic text-gray-400">No description provided for this transaction.</span>}
                                </div>
                            </div>

                            {selectedExpense.attachment && (
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-gray-600">Attached Receipt Document</span>
                                    <a
                                        href={`/storage/${selectedExpense.attachment}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-[13px] font-bold transition-colors shadow-sm"
                                    >
                                        <i className="fa-solid fa-paperclip"></i> View Document
                                    </a>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIDE & MODERN CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-receipt"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Edit Office Expense" : "Log Office Expense"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {errors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-semibold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5 text-lg"></i>
                                        {errors.error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Expense Title / Subject <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={e => setData('title', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                                            placeholder="e.g. Monthly Electricity Bill"
                                            required
                                            autoFocus
                                        />
                                        {errors.title && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.title}</p>}
                                    </div>

                                    <div className="relative z-[60]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Expense Category <span className="text-red-500">*</span></label>
                                        <Select
                                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                            value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null}
                                            onChange={(selected) => setData("expense_category_id", selected ? selected.value : "")}
                                            placeholder="Search Category..."
                                            isSearchable isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.expense_category_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.expense_category_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Transaction Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={data.date}
                                            onChange={e => setData('date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                            required
                                        />
                                        {errors.date && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.date}</p>}
                                    </div>
                                </div>

                                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-3">Payment Source <span className="text-red-500">*</span></label>

                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <label className={`flex-1 cursor-pointer rounded-2xl border-2 p-4 text-center transition-all ${data.pay_type === 'account' ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                                            <input type="radio" name="payType" className="sr-only" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                            <i className={`fa-solid fa-building-columns text-xl mb-1.5 block ${data.pay_type === 'account' ? 'text-indigo-600' : 'text-gray-400'}`}></i>
                                            <span className={`block text-[13.5px] font-extrabold ${data.pay_type === 'account' ? 'text-indigo-900' : 'text-gray-600'}`}>Bank / Cash Box</span>
                                        </label>

                                        <label className={`flex-1 cursor-pointer rounded-2xl border-2 p-4 text-center transition-all ${data.pay_type === 'advance' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
                                            <input type="radio" name="payType" className="sr-only" checked={data.pay_type === 'advance'} onChange={() => { setData('pay_type', 'advance'); setData('account_id', ''); }} />
                                            <i className={`fa-solid fa-hand-holding-dollar text-xl mb-1.5 block ${data.pay_type === 'advance' ? 'text-emerald-600' : 'text-gray-400'}`}></i>
                                            <span className={`block text-[13.5px] font-extrabold ${data.pay_type === 'advance' ? 'text-emerald-900' : 'text-gray-600'}`}>Advance Balance</span>
                                        </label>
                                    </div>

                                    <div className="relative z-[50]">
                                        {data.pay_type === 'account' ? (
                                            <>
                                                <Select
                                                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                    value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                    onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                    placeholder="-- Search Account --"
                                                    isSearchable isClearable
                                                    styles={selectStyles}
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                />
                                                {errors.account_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                            </>
                                        ) : (
                                            <>
                                                <Select
                                                    options={advanceOptions}
                                                    value={advanceOptions.find((opt) => Number(opt.value) === Number(data.advance_user_id)) || null}
                                                    onChange={(selected) => setData("advance_user_id", selected ? selected.value : "")}
                                                    placeholder="-- Search Advance User --"
                                                    isSearchable isClearable
                                                    styles={selectStyles}
                                                    noOptionsMessage={() => "No active advance found."}
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                />
                                                {errors.advance_user_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.advance_user_id}</p>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Expense Amount <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01" min="1"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-rose-200 bg-white pl-9 pr-4 py-3 text-[15px] font-black text-rose-700 outline-none transition-shadow focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {errors.amount && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.amount}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Attachment <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                                        <input
                                            type="file"
                                            onChange={e => setData('attachment', e.target.files[0])}
                                            className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-[12px] file:font-bold file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer shadow-sm"
                                            accept="image/*,application/pdf"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description / Notes</label>
                                    <textarea
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        rows="3"
                                        className="w-full rounded-xl border border-gray-300 bg-white p-4 text-[14px] font-medium text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y min-h-[90px] shadow-sm"
                                        placeholder="Add any extra context or breakdown of the expense..."
                                    ></textarea>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Record" : "Save Record"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}