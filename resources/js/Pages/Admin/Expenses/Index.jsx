import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

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
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
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
                Swal.fire({ icon: "success", title: editMode ? "Updated Successfully!" : "Logged Successfully!", timer: 1500, showConfirmButton: false });
            },
            forceFormData: true, 
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Expense?", text: "This will restore the amount to your account or advance balance.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, Delete It",
        }).then((res) => {
            if (res.isConfirmed) destroy(route("admin.expenses.destroy", id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }) });
        });
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "46px", 
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #e5e7eb",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(200, 155, 60, 0.15)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "#d1d5db" },
            fontSize: "14px",
            background: state.isFocused ? "#fff" : "#f9fafb",
            cursor: "pointer"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#1f2937", fontSize: "14px", fontWeight: "500" }),
        option: (provided, state) => ({
            ...provided, fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#1f2937", cursor: "pointer",
            padding: "10px 12px"
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    const advanceOptions = advances.map((a) => {
        return { value: a.user_id, label: `${a.user?.name || 'Unknown'} (Rem: ${Number(a.balance).toLocaleString('en-IN')})` };
    });

    return (
        <AdminLayout>
            <Head title="Office Expenses" />

            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Office Expenses</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Monitor and manage internal company expenses.</p>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <i className="fa-solid fa-calendar-check text-[24px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">This Month's Total</p>
                            <h3 className="text-[24px] font-extrabold text-gray-900 m-0">
                                <i className="fa-solid fa-bangladeshi-taka-sign text-[20px] mr-1 text-gray-400"></i>
                                {parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <i className="fa-solid fa-filter text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-500">Filtered Total</p>
                            <h3 className="text-[24px] font-extrabold text-red-700 m-0">
                                <i className="fa-solid fa-bangladeshi-taka-sign text-[20px] mr-1 text-red-400"></i>
                                {parseFloat(totalAmount || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Expense List
                        </div>
                        {hasPermission('create_expense') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[14px] font-bold text-white transition-all shadow-sm hover:shadow-md hover:bg-[#b08630]">
                                <i className="fa-solid fa-plus"></i> Log Expense
                            </button>
                        )}
                    </div>

                    {/* Toolbar & Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value)} 
                                    className="w-[100px] appearance-none text-center bg-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value="10">10 Entries</option>
                                    <option value="25">25 Entries</option>
                                    <option value="50">50 Entries</option>
                                    <option value="100">100 Entries</option>
                                    <option value="1000">1000 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-csv text-teal-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search & Date Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select 
                                    value={dateFilter} 
                                    onChange={(e) => { setDateFilter(e.target.value); if(e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }} 
                                    className="appearance-none text-center bg-none w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="this_year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>

                                {dateFilter === "custom" && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] cursor-pointer" />
                                        <span className="text-gray-400 text-[13px]">to</span>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] cursor-pointer" />
                                    </div>
                                )}
                            </div>

                            <div className="relative w-full sm:w-[240px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search expenses..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                />
                            </div>

                            {/* CLEAR FILTERS BUTTON */}
                            {(searchTerm || dateFilter !== 'all' || perPage !== '10') && (
                                <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100 shrink-0">
                                    <i className="fa-solid fa-xmark"></i> Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Expense Title</th>
                                    <th className="px-6 py-4">Category & Source</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px] text-gray-700">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {expenses.from ? expenses.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">{exp.date}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{exp.title}</div>
                                                {exp.description && (
                                                    <div className="text-[12.5px] text-gray-500 mt-0.5 max-w-[280px] truncate" title={exp.description}>
                                                        {exp.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 mb-1.5 rounded-md bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-600 border border-gray-200">
                                                    {exp.category?.name || "Uncategorized"}
                                                </span>
                                                <div className="text-[12.5px] text-gray-600 font-medium">
                                                    <i className={exp.advance_user_id ? "fa-solid fa-hand-holding-dollar mr-1.5 text-emerald-500" : "fa-solid fa-building-columns mr-1.5 text-purple-500"}></i> 
                                                    {exp.account_id ? (exp.account?.name || 'Account') : (exp.advance_user_id ? 'Advance' : 'N/A')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 text-[15px]">
                                                <i className="fa-solid fa-bangladeshi-taka-sign text-[13px] mr-0.5 text-red-400"></i>
                                                {parseFloat(exp.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {hasPermission('view_expence') && (
                                                        <button onClick={() => openViewModal(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_expence') && (
                                                        <button onClick={() => openEditModal(exp)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Expense">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_expence') && (
                                                        <button onClick={() => handleDelete(exp.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Expense">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                    <i className="fa-solid fa-receipt text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-medium text-gray-600">No expenses found for this period.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500 font-medium">
                                Showing {expenses.from || 0} to {expenses.to || 0} of {expenses.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {expenses.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-transparent text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- WIDE & MODERN VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col relative my-auto animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/80 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                    <i className="fa-solid fa-receipt text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Expense Details</h3>
                                    <p className="text-[12.5px] text-gray-500 font-medium">Reference: #{String(selectedExpense.id).padStart(5, '0')}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors">
                                <i className="fa-solid fa-xmark text-[15px]"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-8">
                            {/* Amount Display */}
                            <div className="text-center mb-8 bg-red-50/50 py-6 rounded-2xl border border-red-100">
                                <span className="block text-[11px] font-bold uppercase tracking-widest text-red-400 mb-1">Total Expense</span>
                                <div className="text-[36px] font-black text-red-600 tracking-tight flex justify-center items-center gap-1.5">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[26px] text-red-400"></i>
                                    {parseFloat(selectedExpense.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Expense Title</span>
                                    <div className="text-[18px] font-bold text-gray-900">{selectedExpense.title}</div>
                                </div>
                                
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Category</span>
                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-tag text-[var(--accent)]"></i>
                                        {selectedExpense.category?.name || "Uncategorized"}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Date Logged</span>
                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days text-rose-500"></i>
                                        {selectedExpense.date || "-"}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Payment Source</span>
                                    <div className="flex items-center gap-3">
                                        {selectedExpense.account_id ? (
                                            <><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i className="fa-solid fa-building-columns"></i></div><div><p className="text-[15px] font-bold text-gray-900">{selectedExpense.account?.name}</p><p className="text-[12px] text-gray-500">Bank / Cash Box</p></div></>
                                        ) : selectedExpense.advance_user_id ? (
                                            <><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-hand-holding-dollar"></i></div><div><p className="text-[15px] font-bold text-gray-900">{selectedExpense.advance_user?.name}</p><p className="text-[12px] text-gray-500">Advance Balance</p></div></>
                                        ) : (
                                            <><div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><i className="fa-solid fa-ban"></i></div><div><p className="text-[15px] font-bold text-gray-900">Unknown Source</p></div></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description & Notes */}
                            <div className="border-t border-gray-100 pt-6">
                                <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-3"><i className="fa-solid fa-align-left text-gray-400 mr-2"></i> Description & Notes</span>
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 text-gray-600 text-[14.5px] leading-relaxed min-h-[80px] whitespace-pre-line shadow-sm">
                                    {selectedExpense.description || <span className="italic text-gray-400">No description provided for this transaction.</span>}
                                </div>
                            </div>

                            {selectedExpense.attachment && (
                                <div className="mt-6">
                                    <a 
                                        href={`/storage/${selectedExpense.attachment}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-[13.5px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100 hover:border-indigo-300 w-full sm:w-auto"
                                    >
                                        <i className="fa-solid fa-paperclip"></i> View Attached Receipt
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/80 rounded-b-3xl flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-2.5 text-[14px] font-bold text-white transition-all shadow-md hover:bg-gray-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIDE & MODERN CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-file-invoice-dollar"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Edit Office Expense" : "Log Office Expense"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
                            <div className="p-8 overflow-y-auto brass-scroll flex-1">
                                
                                {errors.error && (
                                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-semibold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5 text-lg"></i> 
                                        {errors.error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Expense Title / Subject <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={data.title} 
                                            onChange={e => setData('title', e.target.value)} 
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] font-semibold text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                                            placeholder="e.g. Monthly Electricity Bill" 
                                            required 
                                            autoFocus
                                        />
                                        {errors.title && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.title}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Expense Category <span className="text-rose-500">*</span></label>
                                        <Select
                                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                            value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null}
                                            onChange={(selected) => setData("expense_category_id", selected ? selected.value : "")}
                                            placeholder="Search Category..."
                                            isSearchable
                                            isClearable
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.expense_category_id && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.expense_category_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Transaction Date <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="date" 
                                            value={data.date} 
                                            onChange={e => setData('date', e.target.value)} 
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14.5px] font-semibold text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                                            required 
                                        />
                                        {errors.date && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.date}</p>}
                                    </div>
                                </div>

                                <div className="mb-6 p-5 bg-gray-50/80 rounded-2xl border border-gray-100">
                                    <label className="block text-[13px] font-extrabold text-gray-900 mb-3 border-b border-gray-200 pb-2">Payment Source <span className="text-rose-500">*</span></label>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${data.pay_type === 'account' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
                                            <input type="radio" name="payType" className="sr-only" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                            <i className={`fa-solid fa-building-columns text-2xl mb-2 block transition-colors ${data.pay_type === 'account' ? 'text-emerald-600' : 'text-gray-400'}`}></i>
                                            <span className={`block text-[14px] font-bold transition-colors ${data.pay_type === 'account' ? 'text-emerald-800' : 'text-gray-600'}`}>Bank / Cash Box</span>
                                        </label>
                                        
                                        <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${data.pay_type === 'advance' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                                            <input type="radio" name="payType" className="sr-only" checked={data.pay_type === 'advance'} onChange={() => { setData('pay_type', 'advance'); setData('account_id', ''); }} />
                                            <i className={`fa-solid fa-hand-holding-dollar text-2xl mb-2 block transition-colors ${data.pay_type === 'advance' ? 'text-blue-600' : 'text-gray-400'}`}></i>
                                            <span className={`block text-[14px] font-bold transition-colors ${data.pay_type === 'advance' ? 'text-blue-800' : 'text-gray-600'}`}>Advance Balance</span>
                                        </label>
                                    </div>

                                    <div className="animate-[fadeIn_0.3s_ease-in-out]">
                                        {data.pay_type === 'account' ? (
                                            <>
                                                <Select
                                                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                    value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                    onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                    placeholder="Search Account..."
                                                    isSearchable
                                                    isClearable
                                                    styles={selectStyles}
                                                    menuPosition="fixed"
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                />
                                                {errors.account_id && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.account_id}</p>}
                                            </>
                                        ) : (
                                            <>
                                                <Select
                                                    options={advanceOptions}
                                                    value={advanceOptions.find((opt) => Number(opt.value) === Number(data.advance_user_id)) || null}
                                                    onChange={(selected) => setData("advance_user_id", selected ? selected.value : "")}
                                                    placeholder="Search Advance User..."
                                                    isSearchable
                                                    isClearable
                                                    styles={selectStyles}
                                                    noOptionsMessage={() => "No active advance found."}
                                                    menuPosition="fixed"
                                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                />
                                                {errors.advance_user_id && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.advance_user_id}</p>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Expense Amount <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <i className="fa-solid fa-bangladeshi-taka-sign absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                            <input 
                                                type="number" step="0.01" min="1"
                                                value={data.amount} 
                                                onChange={e => setData('amount', e.target.value)} 
                                                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-3.5 text-[16px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                                                placeholder="0.00" 
                                                required 
                                            />
                                        </div>
                                        {errors.amount && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.amount}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Attachment <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                        <input 
                                            type="file" 
                                            onChange={e => setData('attachment', e.target.files[0])} 
                                            className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-[13.5px] text-gray-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--accent-bg)] file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-[var(--accent)] hover:file:bg-[var(--accent)] hover:file:text-white transition-all cursor-pointer" 
                                            accept="image/*,application/pdf" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Description / Notes</label>
                                    <textarea 
                                        value={data.description} 
                                        onChange={e => setData('description', e.target.value)} 
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[14.5px] text-gray-900 outline-none resize-y min-h-[100px] transition-shadow focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" 
                                        placeholder="Add any extra context or breakdown of the expense..."
                                    ></textarea>
                                </div>

                            </div>

                            {/* Form Actions Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-[14.5px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-[14.5px] font-bold text-white transition-all shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:opacity-70">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-save"></i> {editMode ? "Update Record" : "Save Record"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}