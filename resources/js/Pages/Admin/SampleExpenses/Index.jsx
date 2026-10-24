import React, { useState, useEffect, useRef, useMemo } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "@/Components/PortalSelect";
import CustomSelect from '@/Components/CustomSelect';
import TableExportButtons from '@/Components/TableExportButtons';

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'fa-clock' },
    in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'fa-spinner' },
    delivered: { label: 'Delivered', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'fa-paper-plane' },
    approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'fa-circle-check' },
    rejected: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'fa-circle-xmark' },
};

const COST_TYPE_CONFIG = {
    company_cost: { label: 'Company Cost', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    billable: { label: 'Billable', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    adjusted: { label: 'Adjusted with Order', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function Index({
    samples = { data: [], links: [] },
    totalAmount = 0,
    thisMonthTotal = 0,
    pendingCount = 0,
    approvedCount = 0,
    categories = [],
    clients = [],
    accounts = [],
    advances = [],
    vendors = [],
    filters = {}
}) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedSample, setSelectedSample] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState(filters.search ?? (new URLSearchParams(window.location.search).get("search") || ""));
    const [perPage, setPerPage] = useState(() => String(filters.per_page ?? (new URLSearchParams(window.location.search).get("per_page") || "25")));
    const [clientIdFilter, setClientIdFilter] = useState(filters.client_id ?? (new URLSearchParams(window.location.search).get("client_id") || "all"));
    const [statusFilter, setStatusFilter] = useState(filters.sample_status ?? (new URLSearchParams(window.location.search).get("sample_status") || "all"));
    const [costTypeFilter, setCostTypeFilter] = useState(filters.cost_type ?? (new URLSearchParams(window.location.search).get("cost_type") || "all"));
    const [categoryIdFilter, setCategoryIdFilter] = useState(filters.expense_category_id ?? (new URLSearchParams(window.location.search).get("expense_category_id") || "all"));

    // Date Filter States
    const [dateFilter, setDateFilter] = useState(filters.date_filter ?? (new URLSearchParams(window.location.search).get("date_filter") || "all"));
    const [startDate, setStartDate] = useState(filters.start_date ?? (new URLSearchParams(window.location.search).get("start_date") || ""));
    const [endDate, setEndDate] = useState(filters.end_date ?? (new URLSearchParams(window.location.search).get("end_date") || ""));

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "",
        title: "",
        client_id: "",
        expense_category_id: "",
        account_id: "",
        advance_user_id: "",
        vendor_id: "",
        amount: "",
        bank_charge: "",
        date: new Date().toISOString().slice(0, 10),
        sample_status: "pending",
        cost_type: "company_cost",
        description: "",
        pay_type: "account",
        attachment: null,
        _method: "post",
    });

    // --- Live Search, Filters & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (perPage && perPage !== "25") params.per_page = perPage;
            if (clientIdFilter && clientIdFilter !== "all") params.client_id = clientIdFilter;
            if (statusFilter && statusFilter !== "all") params.sample_status = statusFilter;
            if (costTypeFilter && costTypeFilter !== "all") params.cost_type = costTypeFilter;
            if (categoryIdFilter && categoryIdFilter !== "all") params.expense_category_id = categoryIdFilter;

            if (dateFilter && dateFilter !== "all") {
                params.date_filter = dateFilter;
                if (dateFilter === "custom") {
                    if (startDate) params.start_date = startDate;
                    if (endDate) params.end_date = endDate;
                }
            } else if (startDate || endDate) {
                if (startDate) params.start_date = startDate;
                if (endDate) params.end_date = endDate;
            }

            router.get(route("admin.sample-expenses.index"), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 350);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage, clientIdFilter, statusFilter, costTypeFilter, categoryIdFilter, dateFilter, startDate, endDate]);

    // --- Clear All Filters ---
    const clearFilters = () => {
        setSearchTerm("");
        setPerPage("25");
        setClientIdFilter("all");
        setStatusFilter("all");
        setCostTypeFilter("all");
        setCategoryIdFilter("all");
        setDateFilter("all");
        setStartDate("");
        setEndDate("");
        router.get(route("admin.sample-expenses.index"));
    };

    const hasActiveFilters = Boolean(
        searchTerm || (perPage && perPage !== "25") || (dateFilter && dateFilter !== "all") ||
        (clientIdFilter && clientIdFilter !== "all") || (statusFilter && statusFilter !== "all") ||
        (costTypeFilter && costTypeFilter !== "all") || (categoryIdFilter && categoryIdFilter !== "all") ||
        startDate || endDate
    );

    // --- Open Create Modal ---
    const handleOpenCreateModal = () => {
        reset();
        clearErrors();
        setData({
            id: "",
            title: "",
            client_id: "",
            expense_category_id: "",
            account_id: accounts.length > 0 ? accounts[0].id : "",
            advance_user_id: "",
            vendor_id: "",
            amount: "",
            bank_charge: "",
            date: new Date().toISOString().slice(0, 10),
            sample_status: "pending",
            cost_type: "company_cost",
            description: "",
            pay_type: "account",
            attachment: null,
            _method: "post",
        });
        setEditMode(false);
        setShowModal(true);
    };

    // --- Open Edit Modal ---
    const handleOpenEditModal = (sample) => {
        clearErrors();
        let determinedPayType = "account";
        if (sample.advance_user_id) determinedPayType = "advance";
        else if (sample.vendor_id) determinedPayType = "vendor";

        setData({
            id: sample.id,
            title: sample.title || "",
            client_id: sample.client_id || "",
            expense_category_id: sample.expense_category_id || "",
            account_id: sample.account_id || "",
            advance_user_id: sample.advance_user_id || "",
            vendor_id: sample.vendor_id || "",
            amount: sample.amount || "",
            bank_charge: sample.bank_charge || "",
            date: sample.date || new Date().toISOString().slice(0, 10),
            sample_status: sample.sample_status || "pending",
            cost_type: sample.cost_type || "company_cost",
            description: sample.description || "",
            pay_type: determinedPayType,
            attachment: null,
            _method: "put",
        });
        setEditMode(true);
        setShowModal(true);
    };

    // --- Open View Modal ---
    const handleOpenViewModal = (sample) => {
        setSelectedSample(sample);
        setShowViewModal(true);
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            post(route("admin.sample-expenses.update", data.id), {
                forceFormData: true,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({
                        icon: "success",
                        title: "Updated!",
                        text: "Sample expense has been updated successfully.",
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: "top-end"
                    });
                },
                onError: (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Failed to Update",
                        text: err.error || "Please review form fields and errors.",
                    });
                }
            });
        } else {
            post(route("admin.sample-expenses.store"), {
                forceFormData: true,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({
                        icon: "success",
                        title: "Created!",
                        text: "Sample expense has been recorded successfully.",
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: "top-end"
                    });
                },
                onError: (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Failed to Record",
                        text: err.error || "Please review form fields and errors.",
                    });
                }
            });
        }
    };

    // --- Delete Sample ---
    const handleDelete = (sample) => {
        Swal.fire({
            title: "Delete Sample Expense?",
            html: `Are you sure you want to delete <b>"${sample.title}"</b>?<br/><span class="text-xs text-rose-600 font-bold">This will restore the deducted balance back to the original source.</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, Delete It",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.sample-expenses.destroy", sample.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "Sample expense has been deleted and amount restored.",
                            timer: 2000,
                            showConfirmButton: false,
                            toast: true,
                            position: "top-end"
                        });
                    },
                    onError: (err) => {
                        Swal.fire("Error!", err.error || "Failed to delete sample expense.", "error");
                    }
                });
            }
        });
    };

    // --- Inline Status Change ---
    const handleQuickStatusChange = (sample, newStatus) => {
        router.patch(route('admin.sample-expenses.update-status', sample.id), {
            sample_status: newStatus
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Status Updated',
                    text: `Sample marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        });
    };

    // --- Export Config ---
    const exportConfig = useMemo(() => {
        const rows = (samples.data || []).map((s, idx) => {
            const clientName = s.client ? `${s.client.name}${s.client.company_name ? ` (${s.client.company_name})` : ''}` : 'Internal / Company Sample';
            const paymentSource = s.account ? s.account.name : (s.advance_user ? `Staff: ${s.advance_user.name}` : (s.vendor ? `Vendor: ${s.vendor.name}` : '-'));
            return [
                idx + 1,
                s.title || '-',
                clientName,
                s.category?.name || 'Uncategorized',
                paymentSource,
                STATUS_CONFIG[s.sample_status]?.label || s.sample_status || 'Pending',
                COST_TYPE_CONFIG[s.cost_type]?.label || s.cost_type || 'Company Cost',
                formatDateDisplay(s.date),
                Number(s.amount || 0)
            ];
        });

        return {
            headers: ['SL', 'Sample Title', 'Client / Target', 'Category', 'Payment Source', 'Status', 'Billing Type', 'Date', 'Amount (Tk)'],
            rows,
            filename: 'sample_expenses_report',
            title: 'Sample Expenses Report'
        };
    }, [samples.data]);

    // Helpers for live balance badges
    const selectedAccount = accounts.find(a => String(a.id) === String(data.account_id));
    const selectedAdvanceUser = advances.find(a => String(a.user_id) === String(data.advance_user_id));
    const selectedVendor = vendors.find(v => String(v.id) === String(data.vendor_id));

    return (
        <AdminLayout>
            <Head title="Sample Expenses - Prototype & Client Samples" />

            <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-16 mt-2">

                {/* --- HEADER & METRICS --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold uppercase tracking-widest mb-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Sample & Prototype Ledger
                        </div>
                        <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                                <i className="fa-solid fa-flask text-lg"></i>
                            </div>
                            Sample Expenses
                        </h1>
                        <p className="text-[13px] sm:text-[14px] font-bold text-slate-500 mt-1.5">
                            Manage prototype, mockups, and client sample costs separately from office overhead.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                        {/* Stat: This Month */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-4 py-3.5 shadow-md border border-slate-800 text-white min-w-[150px]">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">This Month</p>
                            <h3 className="text-[19px] sm:text-[22px] font-black tracking-tight mt-0.5 tabular-nums">
                                <Taka className="text-emerald-400" />{parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>

                        {/* Stat: Filtered Total */}
                        <div className="relative overflow-hidden rounded-2xl bg-white px-4 py-3.5 shadow-sm border border-slate-200 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Filtered Total</p>
                            <h3 className="text-[19px] sm:text-[22px] font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                                <Taka className="text-slate-400" />{parseFloat(totalAmount || 0).toLocaleString('en-IN')}
                            </h3>
                        </div>

                        {/* Stat: Pending */}
                        <div className="relative overflow-hidden rounded-2xl bg-amber-50/70 border border-amber-200 px-4 py-3.5 shadow-sm min-w-[130px]">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">In Progress</p>
                            <h3 className="text-[20px] font-black text-amber-900 tracking-tight mt-0.5 tabular-nums">
                                {pendingCount} <span className="text-[12px] font-bold text-amber-600">items</span>
                            </h3>
                        </div>

                        {/* Stat: Approved */}
                        <div className="relative overflow-hidden rounded-2xl bg-emerald-50/70 border border-emerald-200 px-4 py-3.5 shadow-sm min-w-[130px]">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Approved</p>
                            <h3 className="text-[20px] font-black text-emerald-900 tracking-tight mt-0.5 tabular-nums">
                                {approvedCount} <span className="text-[12px] font-bold text-emerald-600">items</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CARD --- */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* UNIFIED TOOLBAR */}
                    <div className="flex flex-col gap-4 p-5 bg-slate-50 border-b border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Items Per Page */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                                    <span className="text-[11px] font-extrabold text-slate-500 mr-2 uppercase">Show</span>
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value)} className="border-none bg-transparent text-[12.5px] font-bold text-slate-900 outline-none cursor-pointer p-0 focus:ring-0">
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search sample, client, vendor..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-[220px] sm:w-[260px] rounded-xl border border-slate-200 hover:border-slate-300 py-2 pl-9 pr-3 text-[13px] outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-bold shadow-xs"
                                    />
                                </div>

                                {/* Client Filter */}
                                <div className="relative">
                                    <CustomSelect
                                        value={clientIdFilter}
                                        onChange={(e) => setClientIdFilter(e.target.value)}
                                        className="appearance-none w-[170px] rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 py-2 text-[12.5px] font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 shadow-xs cursor-pointer"
                                    >
                                        <option value="all">👥 All Clients</option>
                                        <option value="internal">🏢 Internal / In-House</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.company_name ? `(${c.company_name})` : ''}
                                            </option>
                                        ))}
                                    </CustomSelect>
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <CustomSelect
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="appearance-none w-[145px] rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 py-2 text-[12.5px] font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 shadow-xs cursor-pointer"
                                    >
                                        <option value="all">⚡ All Status</option>
                                        <option value="pending">⏳ Pending</option>
                                        <option value="in_progress">⚙️ In Progress</option>
                                        <option value="delivered">🚀 Delivered</option>
                                        <option value="approved">✅ Approved</option>
                                        <option value="rejected">❌ Rejected</option>
                                    </CustomSelect>
                                </div>

                                {/* Date Range Preset */}
                                <div className="relative">
                                    <CustomSelect
                                        value={dateFilter}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDateFilter(val);
                                            if (val !== 'custom') {
                                                setStartDate('');
                                                setEndDate('');
                                            }
                                        }}
                                        className="appearance-none w-[150px] rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 py-2 text-[12.5px] font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 shadow-xs cursor-pointer"
                                    >
                                        <option value="all">📅 All Dates</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="this_week">This Week</option>
                                        <option value="last_7_days">Last 7 Days</option>
                                        <option value="this_month">This Month</option>
                                        <option value="last_month">Last Month</option>
                                        <option value="this_year">This Year</option>
                                        <option value="custom">Custom Range</option>
                                    </CustomSelect>
                                </div>

                                {dateFilter === "custom" && (
                                    <div className="flex items-center gap-1.5 bg-white border border-emerald-300 rounded-xl px-2 py-1 shadow-xs">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="border-none bg-transparent p-0 text-[12px] font-bold text-slate-800 outline-none focus:ring-0 cursor-pointer"
                                            title="From Date"
                                        />
                                        <span className="text-slate-400 text-xs">to</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="border-none bg-transparent p-0 text-[12px] font-bold text-slate-800 outline-none focus:ring-0 cursor-pointer"
                                            title="To Date"
                                        />
                                    </div>
                                )}

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-[12px] font-extrabold transition-all cursor-pointer"
                                        title="Reset filters"
                                    >
                                        <i className="fa-solid fa-rotate-left"></i> Reset
                                    </button>
                                )}
                            </div>

                            {/* Export Buttons & New Sample CTA */}
                            <div className="flex items-center gap-2.5">
                                <TableExportButtons
                                    headers={exportConfig.headers}
                                    rows={exportConfig.rows}
                                    filename={exportConfig.filename}
                                    title={exportConfig.title}
                                    tableId="sample-expenses-table"
                                />

                                <button
                                    type="button"
                                    onClick={handleOpenCreateModal}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all cursor-pointer"
                                >
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>New Sample</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <table id="sample-expenses-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-12">#</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Sample Item / Spec</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Target Client</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Category</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Paid Via</th>
                                    <th className="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">Date</th>
                                    <th className="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Cost (৳)</th>
                                    <th className="px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13px]">
                                {samples.data && samples.data.length > 0 ? (
                                    samples.data.map((sample, idx) => {
                                        const statusCfg = STATUS_CONFIG[sample.sample_status] || STATUS_CONFIG.pending;
                                        const costTypeCfg = COST_TYPE_CONFIG[sample.cost_type] || COST_TYPE_CONFIG.company_cost;

                                        return (
                                            <tr key={sample.id} className="hover:bg-emerald-50/20 transition-colors group">
                                                <td className="px-5 py-4 text-center font-bold text-slate-400 text-xs">
                                                    {(samples.current_page - 1) * samples.per_page + idx + 1}
                                                </td>

                                                {/* Sample Item / Title */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                            <i className="fa-solid fa-flask text-xs"></i>
                                                        </div>
                                                        <div className="max-w-[280px]">
                                                            <p className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug truncate">
                                                                {sample.title}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${costTypeCfg.badge}`}>
                                                                    {costTypeCfg.label}
                                                                </span>
                                                                {sample.attachment && (
                                                                    <a
                                                                        href={`/storage/${sample.attachment}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                                                                        title="View attachment"
                                                                    >
                                                                        <i className="fa-solid fa-paperclip text-[10px]"></i> Slip
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Client */}
                                                <td className="px-5 py-4">
                                                    {sample.client ? (
                                                        <div>
                                                            <p className="font-extrabold text-slate-900 text-[13px]">{sample.client.name}</p>
                                                            {sample.client.company_name && (
                                                                <p className="text-[11px] font-bold text-slate-500 truncate max-w-[180px]">{sample.client.company_name}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-[11px] border border-slate-200">
                                                            <i className="fa-solid fa-building text-[10px] opacity-70"></i> In-House Sample
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Category */}
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-bold text-[12px] border border-slate-200">
                                                        <i className="fa-solid fa-tag text-[10px] text-slate-400"></i>
                                                        {sample.category?.name || "General"}
                                                    </span>
                                                </td>

                                                {/* Payment Source */}
                                                <td className="px-5 py-4">
                                                    {sample.account ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-[12.5px] leading-tight">{sample.account.name}</p>
                                                                <p className="text-[10.5px] font-bold text-slate-400">Account</p>
                                                            </div>
                                                        </div>
                                                    ) : sample.advance_user ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                                            <div>
                                                                <p className="font-bold text-amber-900 text-[12.5px] leading-tight">{sample.advance_user.name}</p>
                                                                <p className="text-[10.5px] font-bold text-amber-600">Staff Advance</p>
                                                            </div>
                                                        </div>
                                                    ) : sample.vendor ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                                            <div>
                                                                <p className="font-bold text-purple-900 text-[12.5px] leading-tight">{sample.vendor.name}</p>
                                                                <p className="text-[10.5px] font-bold text-purple-600">Vendor Advance</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                                                    )}
                                                </td>

                                                {/* Status (with Quick Change) */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="inline-flex items-center relative">
                                                        <select
                                                            value={sample.sample_status || 'pending'}
                                                            onChange={(e) => handleQuickStatusChange(sample, e.target.value)}
                                                            className={`appearance-none cursor-pointer rounded-xl px-2.5 py-1 text-[11.5px] font-black border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} pr-6 outline-none shadow-xs`}
                                                            title="Click to update status"
                                                        >
                                                            <option value="pending">⏳ Pending</option>
                                                            <option value="in_progress">⚙️ In Progress</option>
                                                            <option value="delivered">🚀 Delivered</option>
                                                            <option value="approved">✅ Approved</option>
                                                            <option value="rejected">❌ Rejected</option>
                                                        </select>
                                                        <i className="fa-solid fa-chevron-down absolute right-2 text-[9px] pointer-events-none opacity-60"></i>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="px-5 py-4 text-center font-bold text-slate-600 text-xs tabular-nums">
                                                    {formatDateDisplay(sample.date)}
                                                </td>

                                                {/* Amount */}
                                                <td className="px-5 py-4 text-right font-black text-slate-900 text-[14.5px] tabular-nums">
                                                    <Taka className="text-emerald-600" />
                                                    {parseFloat(sample.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {sample.bank_charge > 0 && (
                                                        <span className="block text-[10px] font-bold text-rose-500">
                                                            +৳{Number(sample.bank_charge).toFixed(2)} charge
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenViewModal(sample)}
                                                            className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            <i className="fa-solid fa-eye text-xs"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditModal(sample)}
                                                            className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center cursor-pointer"
                                                            title="Edit Sample"
                                                        >
                                                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(sample)}
                                                            className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center cursor-pointer"
                                                            title="Delete Sample"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                                                    <i className="fa-solid fa-flask-vial text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-black text-slate-700">No Sample Expenses Found</p>
                                                <p className="text-[13px] font-bold text-slate-400 mt-1">
                                                    {hasActiveFilters ? "Try resetting the filters above." : "Record your first prototype or client sample expense."}
                                                </p>
                                                {!hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCreateModal}
                                                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
                                                    >
                                                        <i className="fa-solid fa-plus"></i> New Sample
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {samples.links && samples.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs font-bold text-slate-500">
                                Showing {samples.from || 0} to {samples.to || 0} of {samples.total || 0} records
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                                {samples.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            link.active
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : link.url
                                                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* CREATE / EDIT MODAL */}
            {/* ======================================================== */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-flask'}`}></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">
                                        {editMode ? "Edit Sample Expense" : "Record Sample Expense"}
                                    </h3>
                                    <p className="text-[11.5px] font-bold text-slate-300">
                                        {editMode ? "Modify details or reassign payment source" : "Track cost for a prototype or client sample mockup"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
                            {/* Title / Sample Item */}
                            <div>
                                <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                    Sample Item / Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Acrylic Trophy Sample, CMEER T-shirt sample, Bag Mockup..."
                                    value={data.title}
                                    onChange={(e) => setData("title", e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                                />
                                {errors.title && <p className="text-xs text-rose-500 font-bold mt-1">{errors.title}</p>}
                            </div>

                            {/* Client & Category Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Target Client */}
                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Client / Prospect (Optional)
                                    </label>
                                    <select
                                        value={data.client_id}
                                        onChange={(e) => setData("client_id", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="">🏢 In-House / Company Sample (No Client)</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.company_name ? `(${c.company_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.client_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.client_id}</p>}
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Expense Category
                                    </label>
                                    <select
                                        value={data.expense_category_id}
                                        onChange={(e) => setData("expense_category_id", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="">General / Uncategorized</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    {errors.expense_category_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.expense_category_id}</p>}
                                </div>
                            </div>

                            {/* Amount, Bank Charge, Date Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Cost Amount (৳) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        placeholder="0.00"
                                        value={data.amount}
                                        onChange={(e) => setData("amount", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[14px] font-black text-slate-900 outline-none focus:border-emerald-600"
                                    />
                                    {errors.amount && <p className="text-xs text-rose-500 font-bold mt-1">{errors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Bank Charge (৳)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        disabled={data.pay_type !== 'account'}
                                        value={data.bank_charge}
                                        onChange={(e) => setData("bank_charge", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[14px] font-bold text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    {errors.bank_charge && <p className="text-xs text-rose-500 font-bold mt-1">{errors.bank_charge}</p>}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={data.date}
                                        onChange={(e) => setData("date", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 bg-white"
                                    />
                                    {errors.date && <p className="text-xs text-rose-500 font-bold mt-1">{errors.date}</p>}
                                </div>
                            </div>

                            {/* Status & Billing Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Sample Status
                                    </label>
                                    <select
                                        value={data.sample_status}
                                        onChange={(e) => setData("sample_status", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="pending">⏳ Pending</option>
                                        <option value="in_progress">⚙️ In Progress</option>
                                        <option value="delivered">🚀 Delivered to Client</option>
                                        <option value="approved">✅ Approved / Confirmed</option>
                                        <option value="rejected">❌ Rejected / Closed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                        Billing / Cost Nature
                                    </label>
                                    <select
                                        value={data.cost_type}
                                        onChange={(e) => setData("cost_type", e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600 bg-white"
                                    >
                                        <option value="company_cost">🏢 Company Expense (Free Sample)</option>
                                        <option value="billable">💼 Billable to Client</option>
                                        <option value="adjusted">🔄 Adjusted with Full Project Order</option>
                                    </select>
                                </div>
                            </div>

                            {/* PAYMENT METHOD SECTION */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700">
                                    Payment Method / Source <span className="text-rose-500">*</span>
                                </label>

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData("pay_type", "account")}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                            data.pay_type === "account"
                                                ? "bg-white text-blue-700 border-blue-400 shadow-sm ring-2 ring-blue-500/10"
                                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                        }`}
                                    >
                                        <i className="fa-solid fa-building-columns"></i>
                                        <span>Bank/Cash</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setData("pay_type", "advance")}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                            data.pay_type === "advance"
                                                ? "bg-white text-amber-700 border-amber-400 shadow-sm ring-2 ring-amber-500/10"
                                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                        }`}
                                    >
                                        <i className="fa-solid fa-user-clock"></i>
                                        <span>Staff Advance</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setData("pay_type", "vendor")}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                            data.pay_type === "vendor"
                                                ? "bg-white text-purple-700 border-purple-400 shadow-sm ring-2 ring-purple-500/10"
                                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                        }`}
                                    >
                                        <i className="fa-solid fa-truck-field"></i>
                                        <span>Vendor Wallet</span>
                                    </button>
                                </div>

                                {/* Source Selector */}
                                {data.pay_type === "account" && (
                                    <div className="pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-600">Select Bank or Cash Account</span>
                                            {selectedAccount && (
                                                <span className="text-[11px] font-bold text-emerald-600">
                                                    Balance: ৳{Number(selectedAccount.current_balance).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={data.account_id}
                                            onChange={(e) => setData("account_id", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-500 bg-white"
                                        >
                                            <option value="">Select Account...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} (৳{Number(acc.current_balance).toLocaleString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.account_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.account_id}</p>}
                                    </div>
                                )}

                                {data.pay_type === "advance" && (
                                    <div className="pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-600">Select Staff Member (Advance Balance)</span>
                                            {selectedAdvanceUser && (
                                                <span className="text-[11px] font-bold text-amber-600">
                                                    Available: ৳{Number(selectedAdvanceUser.balance).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={data.advance_user_id}
                                            onChange={(e) => setData("advance_user_id", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-amber-500 bg-white"
                                        >
                                            <option value="">Select Staff...</option>
                                            {advances.map(adv => (
                                                <option key={adv.user_id} value={adv.user_id}>
                                                    {adv.user?.name} (Available: ৳{Number(adv.balance).toLocaleString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.advance_user_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.advance_user_id}</p>}
                                    </div>
                                )}

                                {data.pay_type === "vendor" && (
                                    <div className="pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-600">Select Vendor (Advance Wallet)</span>
                                            {selectedVendor && (
                                                <span className="text-[11px] font-bold text-purple-600">
                                                    Wallet: ৳{Number(selectedVendor.wallet_balance).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={data.vendor_id}
                                            onChange={(e) => setData("vendor_id", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-purple-500 bg-white"
                                        >
                                            <option value="">Select Vendor...</option>
                                            {vendors.map(ven => (
                                                <option key={ven.id} value={ven.id}>
                                                    {ven.name} {ven.company_name ? `(${ven.company_name})` : ''} - (Wallet: ৳{Number(ven.wallet_balance).toLocaleString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.vendor_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.vendor_id}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Description / Notes */}
                            <div>
                                <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                    Sample Description & Specifications
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Enter material details, size, sample quantity, feedback..."
                                    value={data.description}
                                    onChange={(e) => setData("description", e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-[13px] font-bold text-slate-900 outline-none focus:border-emerald-600"
                                ></textarea>
                            </div>

                            {/* Attachment */}
                            <div>
                                <label className="block text-[12px] font-black uppercase tracking-wider text-slate-700 mb-1">
                                    Attach Mockup Photo / Slip
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setData("attachment", e.target.files[0])}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                />
                                {errors.attachment && <p className="text-xs text-rose-500 font-bold mt-1">{errors.attachment}</p>}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 cursor-pointer disabled:opacity-60"
                                >
                                    {processing ? "Saving..." : editMode ? "Update Sample" : "Record Sample Expense"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODAL */}
            {/* ======================================================== */}
            {showViewModal && selectedSample && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
                    <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-flask text-emerald-400"></i>
                                <h3 className="text-base font-black">Sample Expense #{selectedSample.id}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-center">
                                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Expense</p>
                                <h2 className="text-3xl font-black text-emerald-950 mt-0.5 tabular-nums">
                                    <Taka />{parseFloat(selectedSample.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h2>
                                {selectedSample.bank_charge > 0 && (
                                    <p className="text-xs font-bold text-rose-600 mt-1">
                                        + ৳{Number(selectedSample.bank_charge).toFixed(2)} bank charge
                                    </p>
                                )}
                            </div>

                            <div className="divide-y divide-slate-100">
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Sample Title</span>
                                    <span className="font-extrabold text-slate-900 text-right">{selectedSample.title}</span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Client / Target</span>
                                    <span className="font-extrabold text-slate-900 text-right">
                                        {selectedSample.client ? `${selectedSample.client.name}${selectedSample.client.company_name ? ` (${selectedSample.client.company_name})` : ''}` : 'In-House Sample'}
                                    </span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Category</span>
                                    <span className="font-extrabold text-slate-900">{selectedSample.category?.name || 'General'}</span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Status</span>
                                    <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${STATUS_CONFIG[selectedSample.sample_status]?.bg} ${STATUS_CONFIG[selectedSample.sample_status]?.text}`}>
                                        {STATUS_CONFIG[selectedSample.sample_status]?.label || selectedSample.sample_status}
                                    </span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Cost Nature</span>
                                    <span className="font-extrabold text-slate-900">
                                        {COST_TYPE_CONFIG[selectedSample.cost_type]?.label || selectedSample.cost_type}
                                    </span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Date</span>
                                    <span className="font-extrabold text-slate-900">{formatDateDisplay(selectedSample.date)}</span>
                                </div>
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-500">Paid Via</span>
                                    <span className="font-extrabold text-slate-900 text-right">
                                        {selectedSample.account ? `Bank: ${selectedSample.account.name}` : (selectedSample.advance_user ? `Staff: ${selectedSample.advance_user.name}` : (selectedSample.vendor ? `Vendor: ${selectedSample.vendor.name}` : '-'))}
                                    </span>
                                </div>
                                {selectedSample.logger && (
                                    <div className="py-2.5 flex justify-between items-center">
                                        <span className="font-bold text-slate-500">Logged By</span>
                                        <span className="font-extrabold text-slate-900">{selectedSample.logger.name}</span>
                                    </div>
                                )}
                            </div>

                            {selectedSample.description && (
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                    <p className="font-extrabold text-slate-700 mb-1">Specifications & Notes:</p>
                                    <p className="text-slate-600 font-bold whitespace-pre-line">{selectedSample.description}</p>
                                </div>
                            )}

                            {selectedSample.attachment && (
                                <div className="pt-2">
                                    <a
                                        href={`/storage/${selectedSample.attachment}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-black hover:bg-indigo-100 transition-colors border border-indigo-200"
                                    >
                                        <i className="fa-solid fa-file-arrow-down"></i> View / Download Voucher or Mockup
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
