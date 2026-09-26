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
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || "10");
    const [dateFilter, setDateFilter] = useState(() => new URLSearchParams(window.location.search).get("date_filter") || "all");
    const [startDate, setStartDate] = useState(() => new URLSearchParams(window.location.search).get("start_date") || "");
    const [endDate, setEndDate] = useState(() => new URLSearchParams(window.location.search).get("end_date") || "");

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "", title: "", expense_category_id: "", account_id: "", advance_user_id: "",
        amount: "", bank_charge: 0, date: new Date().toISOString().slice(0, 10),
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
            router.get(route("admin.expenses.index"), params, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage, dateFilter, startDate, endDate]);

    const clearFilters = () => {
        setSearchTerm(""); setPerPage("10"); setDateFilter("all"); setStartDate(""); setEndDate("");
        router.get(route("admin.expenses.index"), {}, { replace: true });
    };

    const expList = expenses.data || [];

    // --- Export Tools ---
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
        setData({ id: '', title: '', description: '', expense_category_id: '', advance_user_id: '', account_id: '', amount: '', bank_charge: 0, date: new Date().toISOString().slice(0, 10), pay_type: 'account', attachment: null, _method: "post" });
        setEditMode(false); setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id, title: expense.title || "", expense_category_id: expense.expense_category_id || "", account_id: expense.account_id || "", advance_user_id: expense.advance_user_id || "",
            amount: expense.amount || "", bank_charge: expense.bank_charge || 0, date: expense.date || "", description: expense.description || "", pay_type: expense.advance_user_id ? 'advance' : 'account', attachment: null, _method: "put",
        });
        setEditMode(true); setShowModal(true);
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
        control: (provided, state) => ({ ...provided, minHeight: "46px", borderRadius: "0.75rem", border: state.isFocused ? "2px solid #6366f1" : "1px solid #d1d5db", boxShadow: "none", fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", transition: "all 0.2s" }),
        option: (provided, state) => ({ ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "#4f46e5" : state.isFocused ? "#f1f5f9" : "#fff", color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer", padding: "10px 14px" }),
        menuPortal: base => ({ ...base, zIndex: 99999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", zIndex: 99999 })
    };

    const advanceOptions = advances.map((a) => ({ value: a.user_id, label: `${a.user?.name || 'Unknown'} (Rem: ৳${Number(a.balance).toLocaleString('en-IN')})` }));

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
                        <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span> Financial Operations
                        </div>
                        <h1 className="text-[32px] font-black text-gray-900 tracking-tight leading-none">Office Expenses</h1>
                        <p className="text-[14px] text-gray-500 mt-2 font-medium">Track, manage, and analyze your company's operational spending.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-900 px-6 py-5 shadow-lg border border-gray-800 text-white min-w-[240px]">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-indigo-300">
                                    <i className="fa-solid fa-chart-pie text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">This Month</p>
                                    <h3 className="text-[22px] font-black tracking-tight mt-0.5">
                                        <Taka className="text-indigo-400" />{parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-5 shadow-sm border border-gray-200 min-w-[240px]">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-500">
                                    <i className="fa-solid fa-filter-circle-dollar text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Filtered Total</p>
                                    <h3 className="text-[22px] font-black text-gray-900 tracking-tight mt-0.5">
                                        <Taka className="text-gray-400" />{parseFloat(totalAmount || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT CARD --- */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* UNIFIED TOOLBAR */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gray-50/50 border-b border-gray-200">

                        <div className="flex flex-wrap items-center gap-3">

                            {/* 🟢 BEAUTIFUL SHOW ENTRIES DROPDOWN */}
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value)}
                                    className="appearance-none bg-white border border-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer w-[120px]"
                                >
                                    <option value="10">10 Rows</option>
                                    <option value="25">25 Rows</option>
                                    <option value="50">50 Rows</option>
                                    <option value="100">100 Rows</option>
                                    <option value="all">All Rows</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                    <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                </div>
                            </div>

                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input type="text" placeholder="Search anything..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-[240px] rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-[13px] outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium shadow-sm" />
                            </div>

                            {/* 🟢 BEAUTIFUL DATE FILTER DROPDOWN */}
                            <div className="relative">
                                <select
                                    value={dateFilter}
                                    onChange={(e) => { setDateFilter(e.target.value); if(e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }}
                                    className="appearance-none w-full sm:w-[150px] bg-white border border-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="this_year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                    <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                </div>
                            </div>

                            {dateFilter === "custom" && (
                                <div className="flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] bg-white border border-gray-300 rounded-xl px-2 shadow-sm">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-none bg-transparent px-2 py-2.5 text-[12px] font-semibold outline-none focus:ring-0 cursor-pointer" />
                                    <span className="text-gray-300 text-[12px]">-</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-none bg-transparent px-2 py-2.5 text-[12px] font-semibold outline-none focus:ring-0 cursor-pointer" />
                                </div>
                            )}

                            {(searchTerm || dateFilter !== 'all' || perPage !== '10') && (
                                <button onClick={clearFilters} className="h-[42px] px-4 rounded-xl border border-rose-200 bg-rose-50 text-[12px] font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-300 shadow-sm flex items-center gap-1.5">
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <button onClick={handleExportCSV} className="px-4 py-2.5 border-r border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-bold text-emerald-600 flex items-center gap-1.5"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="px-4 py-2.5 hover:bg-gray-50 transition-colors text-[13px] font-bold text-gray-700 flex items-center gap-1.5"><i className="fas fa-print text-gray-400"></i> Print</button>
                            </div>

                            {hasPermission('create_expense') && (
                                <button onClick={openCreateModal} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-lg shadow-md hover:-translate-y-0.5">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add Expense
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto custom-table-scroll min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-16">SL</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-32">Date</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[35%]">Expense Details</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Payment Source</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider no-print w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center text-[13px]">
                                                {expenses.from ? expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-bold text-[12px]">
                                                    <i className="fa-regular fa-calendar text-[10px]"></i> {exp.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-[14px] text-gray-900 mb-1">{exp.title}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                                        {exp.category?.name || "Uncategorized"}
                                                    </span>
                                                    {exp.description && (
                                                        <span className="text-[12px] text-gray-400 truncate max-w-[200px]" title={exp.description}>
                                                            • {exp.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {exp.account_id ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[12.5px] font-bold">
                                                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center"><i className="fa-solid fa-building-columns text-[10px]"></i></div>
                                                        {exp.account?.name || 'Bank Account'}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12.5px] font-bold">
                                                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center"><i className="fa-solid fa-hand-holding-dollar text-[10px]"></i></div>
                                                        Advance: {exp.advance_user?.name?.split(' ')[0] || 'User'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-rose-600 text-[16px] tabular-nums tracking-tight">
                                                    <Taka />{parseFloat(exp.amount).toLocaleString('en-IN')}
                                                </div>
                                                {exp.bank_charge > 0 && <div className="text-[10px] font-bold text-gray-400 mt-0.5">+ ৳{exp.bank_charge} charge</div>}
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                {/* 🟢 ACTION BUTTONS ALWAYS VISIBLE */}
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {hasPermission('view_expence') && (
                                                        <button onClick={() => openViewModal(exp)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_expence') && (
                                                        <button onClick={() => openEditModal(exp)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 flex items-center justify-center transition-all shadow-sm" title="Edit Expense">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_expence') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-all shadow-sm" title="Delete Expense">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300 ring-4 ring-gray-50/50">
                                                    <i className="fa-solid fa-box-open text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-600">No records found</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Adjust your filters or add a new expense.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4 no-print">
                            <div className="text-[13px] font-semibold text-gray-500">
                                Showing <span className="font-bold text-gray-900">{expenses.from || 0}</span> to <span className="font-bold text-gray-900">{expenses.to || 0}</span> of <span className="font-bold text-gray-900">{expenses.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {expenses.links.map((link, index) => (
                                    <Link
                                        key={index} href={link.url || "#"} preserveState
                                        className={`flex min-w-[32px] items-center justify-center rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-transparent text-gray-300 pointer-events-none'}
                                        `}
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-arrow-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-arrow-right text-[10px]"></i>' : link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- PREMIUM RECEIPT STYLE VIEW MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl relative animate-[scaleIn_0.2s_ease-out] border border-gray-100">
                        <div className="absolute top-0 left-0 right-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:12px_12px] -mt-1.5 z-10"></div>

                        <button onClick={() => setShowViewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 h-8 w-8 rounded-full flex items-center justify-center transition-colors z-20">
                            <i className="fa-solid fa-xmark text-sm"></i>
                        </button>

                        <div className="px-8 pt-10 pb-6 text-center border-b border-dashed border-gray-200">
                            <div className="h-14 w-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-3 border border-indigo-100 shadow-inner">
                                <i className="fa-solid fa-receipt text-2xl"></i>
                            </div>
                            <h2 className="text-[22px] font-black text-gray-900 leading-tight mb-1">{selectedExpense.title}</h2>
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{selectedExpense.date}</p>
                        </div>

                        <div className="px-8 py-6 space-y-5">
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                <span className="text-[13px] font-bold text-gray-500">Category</span>
                                <span className="text-[14px] font-bold text-gray-900">{selectedExpense.category?.name || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                <span className="text-[13px] font-bold text-gray-500">Paid Via</span>
                                <span className="text-[14px] font-bold text-gray-900 flex items-center gap-1.5">
                                    <i className={selectedExpense.account_id ? "fa-solid fa-building-columns text-blue-500" : "fa-solid fa-hand-holding-dollar text-emerald-500"}></i>
                                    {selectedExpense.account_id ? (selectedExpense.account?.name) : (`Advance: ${selectedExpense.advance_user?.name}`)}
                                </span>
                            </div>

                            {selectedExpense.description && (
                                <div className="pb-4 border-b border-gray-100">
                                    <span className="block text-[13px] font-bold text-gray-500 mb-2">Notes</span>
                                    <span className="text-[13px] font-medium text-gray-700 leading-relaxed block bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedExpense.description}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-end pt-2">
                                <span className="text-[14px] font-black text-gray-900 uppercase tracking-wider">Total Amount</span>
                                <span className="text-[32px] font-black text-rose-600 tabular-nums leading-none tracking-tight">
                                    <Taka />{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {selectedExpense.attachment && (
                            <div className="px-8 pb-8">
                                <a href={`/storage/${selectedExpense.attachment}`} target="_blank" rel="noreferrer" className="w-full flex justify-center items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl text-[14px] font-bold transition-all shadow-md">
                                    <i className="fa-solid fa-paperclip"></i> View Attached Document
                                </a>
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_4px)] bg-[length:12px_12px] -mb-1.5 rotate-180 z-10"></div>
                    </div>
                </div>
            )}

            {/* --- PREMIUM CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-gray-50 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-gray-700/20">

                        {/* Modal Header with Gradient */}
                        <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-900 px-8 py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-2">
                                    <i className="fa-solid fa-file-invoice"></i> {editMode ? 'Edit Mode' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight leading-none">
                                    {editMode ? "Update Office Expense" : "Log Office Expense"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 h-10 w-10 rounded-full flex items-center justify-center transition-all z-10 shadow-sm">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                {errors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] font-bold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg"></i> {errors.error}
                                    </div>
                                )}

                                {/* Card 1: Basic Info */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
                                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-circle-info mr-1 text-indigo-400"></i> Basic Information</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Expense Title / Subject <span className="text-rose-500">*</span></label>
                                            <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all" placeholder="e.g. Monthly Electricity Bill" required />
                                            {errors.title && <p className="text-rose-500 text-[11px] font-bold mt-1">{errors.title}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Category <span className="text-rose-500">*</span></label>
                                            <Select options={categories.map((c) => ({ value: c.id, label: c.name }))} value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null} onChange={(s) => setData("expense_category_id", s ? s.value : "")} placeholder="Select Category..." styles={selectStyles} menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Transaction Date <span className="text-rose-500">*</span></label>
                                            <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-[11px] text-[14px] font-bold text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all cursor-pointer" required />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Payment Source */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
                                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-wallet mr-1 text-emerald-400"></i> Payment Source</h4>

                                    <div className="flex flex-col sm:flex-row gap-4 mb-5">
                                        <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all flex items-center justify-center gap-3 ${data.pay_type === 'account' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-md ring-2 ring-indigo-500/10' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'}`}>
                                            <input type="radio" className="sr-only" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${data.pay_type === 'account' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}><i className="fa-solid fa-building-columns"></i></div>
                                            <div className="text-left">
                                                <span className="block text-[14px] font-black leading-tight">Bank / Cash Box</span>
                                                <span className="block text-[11px] font-semibold opacity-70">Pay from office fund</span>
                                            </div>
                                        </label>

                                        <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all flex items-center justify-center gap-3 ${data.pay_type === 'advance' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'}`}>
                                            <input type="radio" className="sr-only" checked={data.pay_type === 'advance'} onChange={() => { setData(prev => ({...prev, pay_type: 'advance', bank_charge: 0})); setData('account_id', ''); }} />
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${data.pay_type === 'advance' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}><i className="fa-solid fa-hand-holding-dollar"></i></div>
                                            <div className="text-left">
                                                <span className="block text-[14px] font-black leading-tight">Advance Balance</span>
                                                <span className="block text-[11px] font-semibold opacity-70">Settle employee advance</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="relative z-50">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">{data.pay_type === 'account' ? 'Select Bank/Cash Account' : 'Select Employee'} <span className="text-rose-500">*</span></label>
                                        {data.pay_type === 'account' ? (
                                            <Select options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Balance: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }))} value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Balance: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null} onChange={(s) => setData("account_id", s ? s.value : "")} placeholder="Type to search account..." styles={selectStyles} menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" />
                                        ) : (
                                            <Select options={advanceOptions} value={advanceOptions.find((opt) => Number(opt.value) === Number(data.advance_user_id)) || null} onChange={(s) => setData("advance_user_id", s ? s.value : "")} placeholder="Type to search employee..." styles={selectStyles} menuPortalTarget={typeof window !== 'undefined' ? document.body : null} menuPosition="fixed" />
                                        )}
                                    </div>
                                </div>

                                {/* Card 3: Amount & Details */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60">
                                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-file-invoice-dollar mr-1 text-rose-400"></i> Value & Details</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Expense Amount <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 text-[18px]" />
                                                <input type="number" step="0.01" min="1" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-rose-200 bg-rose-50/30 pl-10 pr-4 py-3 text-[16px] font-black text-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm transition-all" placeholder="0.00" required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Receipt Attachment <span className="text-gray-400 font-medium normal-case">(Optional)</span></label>
                                            <input type="file" onChange={e => setData('attachment', e.target.files[0])} className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-[13px] font-medium text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-1.5 file:text-[12px] file:font-bold file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer transition-all" accept="image/*,application/pdf" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Description / Notes</label>
                                        <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows="2" className="w-full rounded-xl border border-gray-300 p-4 text-[14px] font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all resize-none" placeholder="Add additional context, notes or breakdowns..."></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end gap-4 shrink-0 rounded-b-2xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-6 py-3 text-[14px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-all hover:bg-gray-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Expense Record" : "Save Expense Record"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
