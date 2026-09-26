import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

/* ---------- Design tokens & Helpers ---------- */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none transition hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";

const STATUS = {
    paid: { label: 'Paid', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    unpaid: { label: 'Unpaid', dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-700 border-slate-300' },
    partially_paid: { label: 'Partially paid', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-300' },
    overdue: { label: 'Overdue', dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 border-rose-300' },
};
const getStatus = (s) => STATUS[s] || { label: s, dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-700 border-slate-300' };
const STATUS_OPTIONS = Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label }));

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const StatusPill = ({ status, className = "" }) => {
    const s = getStatus(status);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest shadow-sm ${s.pill} ${className}`}>
            <span className={`h-2 w-2 rounded-full shadow-inner border border-black/10 ${s.dot}`}></span>{s.label}
        </span>
    );
};

// 🟢 High Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '46px', borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#CBD5E1',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        backgroundColor: '#FFFFFF', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#94A3B8' }
    }),
    placeholder: (base) => ({ ...base, color: '#64748B' }),
    singleValue: (base) => ({ ...base, color: '#0F172A' }),
    menu: (base) => ({ ...base, fontSize: '13.5px', borderRadius: '0.75rem', padding: '4px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #CBD5E1' }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({ ...base, borderRadius: '0.5rem', backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#eef2ff' : 'transparent', color: state.isSelected ? '#fff' : '#1e293b', cursor: 'pointer', fontWeight: state.isSelected ? 800 : 600 })
};

export default function Index({ invoices = { data: [], links: [] }, clients = [], years = [], totals = {}, uninvoicedProjects = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Filters state
    const [invoiceNumber, setInvoiceNumber] = useState(filters.invoice_number || "");
    const [clientId, setClientId] = useState(filters.client_id || "");
    const [status, setStatus] = useState(filters.status || "");
    const [projectName, setProjectName] = useState(filters.project_name || "");
    const [year, setYear] = useState(filters.year || "");
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");

    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 25);
    });

    const isFirstRender = useRef(true);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [expandedProjects, setExpandedProjects] = useState([]);

    const toggleProjectExpand = (invoiceId) => {
        setExpandedProjects(prev =>
            prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
        );
    };

    const applyFilters = (overrides = {}) => {
        router.get(
            route("admin.invoices.index"),
            {
                per_page: overrides.per_page ?? perPage,
                invoice_number: overrides.invoice_number ?? invoiceNumber,
                client_id: overrides.client_id ?? clientId,
                status: overrides.status ?? status,
                project_name: overrides.project_name ?? projectName,
                year: overrides.year ?? year,
                date_from: overrides.date_from ?? dateFrom,
                date_to: overrides.date_to ?? dateTo,
                page: 1,
            },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => applyFilters(), 400);
        return () => clearTimeout(delay);
    }, [invoiceNumber, projectName, dateFrom, dateTo]);

    const handleFilterChange = (field, value) => {
        if (field === 'per_page') setPerPage(value);
        if (field === 'client_id') setClientId(value);
        if (field === 'status') setStatus(value);
        if (field === 'year') setYear(value);
        if (field === 'date_from') setDateFrom(value);
        if (field === 'date_to') setDateTo(value);
        applyFilters({ [field]: value });
    };

    const clearAllFilters = () => {
        setInvoiceNumber(""); setClientId(""); setStatus(""); setProjectName(""); setYear(""); setDateFrom(""); setDateTo(""); setPerPage(25);
        router.get(route("admin.invoices.index"), { per_page: 25 }, { preserveState: true, replace: true });
    };

    const handleCopy = () => {
        if (!invoices.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const header = "SL\tINV #\tClient\tDate\tGrand Total\tPaid\tDue\tStatus\n";
        const text = invoices.data.map((inv, idx) => {
            const paid = Number(inv.payments_sum_amount || 0);
            const due = Math.max(Number(inv.grand_total) - paid, 0);
            return `${idx + 1}\t${inv.invoice_number}\t${inv.client?.company_name || inv.client?.name}\t${inv.invoice_date}\t${inv.grand_total}\t${paid}\t${due}\t${inv.status}`;
        }).join("\n");
        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!invoices.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,INV #,Client,Date,Grand Total,Paid,Due,Status\n"];
        const rows = invoices.data.map((inv, idx) => {
            const paid = Number(inv.payments_sum_amount || 0);
            const due = Math.max(Number(inv.grand_total) - paid, 0);
            return `"${idx + 1}","${inv.invoice_number}","${inv.client?.company_name || inv.client?.name}","${inv.invoice_date}","${inv.grand_total}","${paid}","${due}","${inv.status}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Invoices_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => { window.print(); };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Invoice?', text: 'This will also restore any applied advance back to the client!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'Yes, Delete' }).then((res) => {
            if (res.isConfirmed) router.delete(route('admin.invoices.destroy', id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted & Refunded!", timer: 1500, showConfirmButton: false }) });
        });
    };

    const openViewModal = (inv) => { setSelectedInvoice(inv); setShowViewModal(true); };

    const invList = invoices.data || [];
    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }));
    const hasFilters = invoiceNumber || clientId || status || projectName || year || dateFrom || dateTo || perPage !== 25;

    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, styles: selectStyles };

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }
                @media print { body * { visibility: hidden; } .no-print { display: none !important; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="mx-auto mt-4 flex max-w-[1600px] flex-col gap-8 pb-12">

                {/* 🟢 Premium Page Header & Summary */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-file-invoice"></i> Billing & Finances
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Invoices</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Track what you've billed, what's been paid, and what's still due.</p>
                    </div>
                    {hasPermission('create_invoice') && (
                        <Link href={route('admin.invoices.create')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-[14px] font-black text-white shadow-md transition-all hover:bg-indigo-700 hover:-translate-y-0.5">
                            <i className="fa-solid fa-plus text-[12px]"></i> New Invoice
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-6 shadow-md border border-sky-500 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-sky-100">
                                <i className="fa-solid fa-file-invoice-dollar text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-sky-200">Total Billed</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[18px] text-sky-200 mr-1" />{fmt(totals.grand_total)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-md border border-emerald-500 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-100">
                                <i className="fa-solid fa-hand-holding-dollar text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-emerald-200">Total Paid</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[18px] text-emerald-200 mr-1" />{fmt(totals.paid_amount)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-6 shadow-md border border-rose-400 text-white min-w-[240px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-rose-100">
                                <i className="fa-solid fa-scale-unbalanced text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-rose-200">Total Due</p>
                                <h3 className="text-[28px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[18px] text-rose-200 mr-1" />{fmt(totals.due_amount)}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Pending billing */}
                {uninvoicedProjects.length > 0 && hasPermission('create_invoice') && (
                    <section className="no-print overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-md">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-200 bg-amber-100/50">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-[14px] text-amber-700 shadow-sm border border-amber-300"><i className="fa-solid fa-stopwatch"></i></span>
                            <h2 className="text-[16px] font-black text-amber-900">Ready to bill</h2>
                            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[12px] font-black text-white shadow-sm">{uninvoicedProjects.length}</span>
                            <span className="ml-2 hidden text-[13.5px] font-bold text-amber-700/80 sm:inline">— Projects without an invoice yet</span>
                        </div>
                        <div className="custom-table-scroll flex snap-x gap-4 overflow-x-auto px-6 py-5">
                            {uninvoicedProjects.map((project) => (
                                <div key={project.id} className="flex w-[320px] shrink-0 snap-start items-center justify-between gap-4 rounded-xl border border-amber-300 bg-white p-5 transition hover:border-amber-400 hover:shadow-md shadow-sm">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-[15px] font-black text-slate-900 mb-1" title={project.title}>{project.title}</h3>
                                        <p className="truncate text-[13px] font-bold text-slate-500 mb-2" title={project.client?.company_name || project.client?.name}>
                                            <i className="fa-regular fa-building mr-1 text-slate-400"></i>{project.client?.company_name || project.client?.name}
                                        </p>
                                        <p className="text-[16px] font-black tabular-nums text-emerald-600 flex items-center"><Taka className="text-[13px] mr-1" />{fmt(project.budget)}</p>
                                    </div>
                                    <Link
                                        href={route('admin.invoices.create', { client_id: project.client_id, project_id: project.id })}
                                        className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-[13.5px] font-black text-white transition hover:bg-amber-600 shadow-sm hover:-translate-y-0.5"
                                        title="Create invoice for this project"
                                    >
                                        Bill now
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Directory */}
                <section id="printable-area" className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">

                    {/* Toolbar */}
                    <div className="no-print flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700">
                                <i className="fa-solid fa-list-check text-[15px]"></i>
                            </div>
                            Invoice Directory
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 shadow-sm">
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 shadow-sm">
                                <i className="fas fa-print"></i> Print
                            </button>
                        </div>
                    </div>

                    {/* 🟢 High Contrast Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5 bg-white border-b border-slate-200">

                        <div className="relative">
                            <i className="fa-solid fa-hashtag absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"></i>
                            <input type="text" placeholder="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={`${inputClass} pl-10`} />
                        </div>

                        <div className="relative">
                            <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"></i>
                            <input type="text" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className={`${inputClass} pl-10`} />
                        </div>

                        <div>
                            <Select
                                options={clientOptions}
                                value={clientOptions.find(opt => String(opt.value) === String(clientId)) || null}
                                onChange={(selected) => handleFilterChange('client_id', selected ? selected.value : '')}
                                placeholder="Select Client..." isSearchable isClearable {...portal}
                            />
                        </div>

                        <div>
                            <Select
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.find(opt => String(opt.value) === String(status)) || null}
                                onChange={(selected) => handleFilterChange('status', selected ? selected.value : '')}
                                placeholder="Select Status..." isClearable {...portal}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-200">

                        {/* Show Rows Dropdown */}
                        <div className="relative w-full sm:w-[130px]">
                            <select
                                value={perPage}
                                onChange={(e) => handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))}
                                className="appearance-none w-full bg-white border border-slate-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer"
                            >
                                <option value={10}>10 Rows</option>
                                <option value={25}>25 Rows</option>
                                <option value={50}>50 Rows</option>
                                <option value={100}>100 Rows</option>
                                <option value="all">All Rows</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                <i className="fa-solid fa-chevron-down text-[11px]"></i>
                            </div>
                        </div>

                        {/* Year Filter */}
                        <div className="relative w-full sm:w-[130px]">
                            <select
                                value={year}
                                onChange={(e) => handleFilterChange('year', e.target.value)}
                                className="appearance-none w-full bg-white border border-slate-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer"
                            >
                                <option value="">All Years</option>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                <i className="fa-solid fa-calendar text-[11px]"></i>
                            </div>
                        </div>

                        <span className="hidden lg:block text-slate-300 mx-1">|</span>

                        {/* Date Range Picker */}
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-2 shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all w-full sm:w-auto">
                            <input
                                type="date" value={dateFrom} onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-slate-800 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                                type="date" value={dateTo} onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                className="border-none bg-transparent px-2 py-2.5 text-[12.5px] font-bold text-slate-800 outline-none focus:ring-0 cursor-pointer w-full"
                            />
                        </div>

                        {/* Reset Filters */}
                        {hasFilters && (
                            <button onClick={clearAllFilters} className="h-[42px] px-4 rounded-xl border border-rose-300 bg-rose-50 text-[12.5px] font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-400 shadow-sm flex items-center justify-center gap-1.5 sm:ml-auto whitespace-nowrap">
                                <i className="fa-solid fa-rotate-left"></i> Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="custom-table-scroll overflow-x-auto pb-2 min-h-[400px]">
                        <table className="w-full min-w-[1100px] whitespace-nowrap border-collapse text-left">
                            <thead className="border-b-2 border-slate-300 bg-slate-100 text-[11.5px] font-extrabold uppercase tracking-widest text-slate-600 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-14 text-center">SL</th>
                                    <th className="px-6 py-4">Invoice Info</th>
                                    <th className="px-6 py-4 w-[25%]">Client & Projects</th>
                                    <th className="px-6 py-4 text-right bg-indigo-50/50">Total Billed</th>
                                    <th className="px-6 py-4 text-right bg-emerald-50/50 border-l border-slate-200">Paid</th>
                                    <th className="px-6 py-4 text-right bg-rose-50/50 border-x border-slate-200">Due</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 no-print text-center w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-[13.5px] text-slate-800">
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const totalPaid = Number(inv.payments_sum_amount || 0);
                                    const dueAmount = Math.max(Number(inv.grand_total) - totalPaid, 0);
                                    const projectItems = inv.items?.filter(item => item.project);
                                    const expanded = expandedProjects.includes(inv.id);
                                    const chip = "flex w-max max-w-[250px] items-center gap-1.5 truncate rounded-lg bg-white border border-slate-300 shadow-sm px-2.5 py-1 text-[12px] font-bold text-slate-700";

                                    return (
                                        <tr key={inv.id} className="transition-colors hover:bg-indigo-50/30 group">
                                            <td className="px-6 py-4 text-center font-bold text-slate-500 tabular-nums">{invoices.from ? invoices.from + index : index + 1}</td>

                                            <td className="px-6 py-4">
                                                <div className="text-[15px] font-black text-indigo-700">#{inv.invoice_number}</div>
                                                <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
                                                    <i className="fa-regular fa-calendar"></i>{inv.invoice_date}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 shadow-sm bg-white text-[13px] font-black uppercase text-indigo-700">
                                                        {(inv.client?.company_name || inv.client?.name || '?').charAt(0)}
                                                    </span>
                                                    <div>
                                                        <div className="font-extrabold text-[14.5px] text-slate-900 mb-1.5">{inv.client?.company_name || inv.client?.name || 'Unknown client'}</div>
                                                        {projectItems && projectItems.length > 0 ? (
                                                            <div className="flex flex-col gap-1.5">
                                                                {(expanded ? projectItems : projectItems.slice(0, 1)).map((p, idx) => (
                                                                    <div key={idx} className={chip} title={p.project.title}>
                                                                        <i className="fa-solid fa-layer-group text-indigo-500"></i>{p.project.title}
                                                                    </div>
                                                                ))}
                                                                {projectItems.length > 1 && (
                                                                    <button onClick={() => toggleProjectExpand(inv.id)} className="text-left text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 mt-1 w-fit">
                                                                        {expanded ? "Show Less" : `+ ${projectItems.length - 1} More`}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-slate-400 italic"><i className="fa-solid fa-receipt"></i> General billing</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right bg-indigo-50/20 group-hover:bg-indigo-50/40 transition-colors">
                                                <span className="text-[15px] font-black tabular-nums text-slate-900 flex items-center justify-end"><Taka className="text-[12px] mr-1 text-slate-500"/>{fmt(inv.grand_total)}</span>
                                            </td>

                                            <td className="px-6 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors border-l border-slate-100">
                                                {totalPaid > 0 ? (
                                                    <span className="text-[14.5px] font-black tabular-nums text-emerald-600 flex items-center justify-end"><Taka className="text-[12px] mr-1 opacity-70"/>{fmt(totalPaid)}</span>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>

                                            <td className="px-6 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors border-x border-slate-100">
                                                {dueAmount > 0 ? (
                                                    <span className="text-[15px] font-black tabular-nums text-rose-600 flex items-center justify-end"><Taka className="text-[12px] mr-1 opacity-80"/>{fmt(dueAmount)}</span>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>

                                            <td className="px-6 py-4 text-center"><StatusPill status={inv.status} /></td>

                                            <td className="no-print px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {hasPermission('view_invoices') && (
                                                        <button onClick={() => openViewModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 shadow-sm" title="View details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    <a href={route('admin.invoices.print', inv.id)} target="_blank" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600 shadow-sm" title="Print invoice">
                                                        <i className="fa-solid fa-print text-[13px]"></i>
                                                    </a>
                                                    {hasPermission('edit_invoice') && (
                                                        <Link href={route('admin.invoices.edit', inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 shadow-sm" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_invoice') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-200 shadow-sm text-2xl text-slate-300"><i className="fa-solid fa-file-invoice-dollar"></i></span>
                                                <p className="text-[16px] font-black text-slate-800">No invoices match these filters</p>
                                                <p className="mt-1 text-[13.5px] font-bold text-slate-500">Clear a filter or create a new invoice to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {invoices.links && invoices.links.length > 3 && (
                        <div className="no-print flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row">
                            <p className="text-[13.5px] font-bold text-slate-500">
                                Showing <b className="text-slate-900 font-black">{invoices.from || 0}</b> to <b className="text-slate-900 font-black">{invoices.to || 0}</b> of <b className="text-slate-900 font-black">{invoices.total || 0}</b> invoices
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {invoices.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-1.5 text-[13px] font-black transition-colors shadow-sm ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* 🟢 Premium Invoice View Modal */}
            {showViewModal && selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm sm:p-6" onClick={() => setShowViewModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700/30 bg-white shadow-2xl animate-[scaleIn_0.2s_ease-out]">

                        {/* Top bar (Dark Mode Letterhead) */}
                        <div className="no-print relative flex shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-8 py-6 overflow-hidden">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <StatusPill status={selectedInvoice.status} className="!border-white/20 !bg-white/10 !text-white !shadow-none" />
                                <span className="text-[16px] font-black text-slate-300 uppercase tracking-widest">Invoice <span className="text-white">#{selectedInvoice.invoice_number}</span></span>
                            </div>
                            <div className="flex items-center gap-3 relative z-20">
                                <a href={route('admin.invoices.print', selectedInvoice.id)} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-[13px] font-bold text-white transition-colors shadow-sm">
                                    <i className="fa-solid fa-print text-indigo-200"></i> Print / PDF
                                </a>
                                <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-red-500 hover:border-red-500 shadow-sm" aria-label="Close">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="custom-table-scroll flex flex-col gap-8 overflow-y-auto p-6 sm:p-8 bg-slate-50">

                            {/* Header Info */}
                            <div className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 sm:flex-row sm:items-start bg-white p-6 rounded-2xl shadow-sm border-t border-x">
                                <div>
                                    <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-1">Invoice</p>
                                    <p className="text-[34px] font-black leading-none tracking-tight text-slate-900">#{selectedInvoice.invoice_number}</p>
                                    <p className="mt-2.5 text-[13px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg w-fit border border-slate-200 shadow-sm">Reference: INV-REF-{selectedInvoice.id}</p>
                                </div>
                                <div className="flex gap-8 sm:text-right">
                                    <div>
                                        <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Issued</p>
                                        <p className="text-[15px] font-black text-slate-900">{selectedInvoice.invoice_date}</p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black uppercase tracking-widest text-rose-500 mb-1.5">Due Date</p>
                                        <p className="text-[15px] font-black text-rose-600">{selectedInvoice.due_date}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Client Box */}
                            <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
                                <p className="text-[11.5px] font-black uppercase tracking-widest text-slate-500 mb-2"><i className="fa-regular fa-building mr-1"></i> Billed to</p>
                                <h3 className="text-[20px] font-black text-slate-900 mb-1">{selectedInvoice.client?.company_name || selectedInvoice.client?.name || "N/A"}</h3>
                                {selectedInvoice.client?.company_name && <p className="text-[14px] font-bold text-slate-600 mb-1.5">Attn: {selectedInvoice.client?.name}</p>}
                                {selectedInvoice.client?.phone && <p className="text-[13.5px] font-bold text-slate-500"><i className="fa-solid fa-phone mr-1.5 text-[11px] opacity-70"></i>{selectedInvoice.client?.phone}</p>}
                            </div>

                            {/* Items */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                    <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest"><i className="fa-solid fa-boxes-stacked mr-1.5 text-slate-500"></i> Items</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[520px] text-left text-sm border-collapse">
                                        <thead className="border-b-2 border-slate-300 bg-slate-100 text-[12px] font-black text-slate-500 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-6 py-3.5">Service Details</th>
                                                <th className="px-6 py-3.5 text-center w-24">Qty</th>
                                                <th className="px-6 py-3.5 text-right w-32">Unit Price</th>
                                                <th className="px-6 py-3.5 text-right w-36">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {selectedInvoice.items?.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <strong className="block text-[14.5px] font-black text-slate-900 mb-1">{item.item_name}</strong>
                                                        {item.project && (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11.5px] font-bold text-indigo-700 shadow-sm mb-1.5">
                                                                <i className="fa-solid fa-layer-group text-[10px]"></i>{item.project.title}
                                                            </span>
                                                        )}
                                                        {item.description && item.description !== '<p><br></p>' && (
                                                            <div className="html-content-view text-[13px] font-semibold leading-relaxed text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700 tabular-nums bg-slate-50/50">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-600 tabular-nums"><Taka className="text-[12px] text-slate-400 mr-0.5"/>{fmt(item.unit_price)}</td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums"><Taka className="text-[12px] text-slate-500 mr-0.5"/>{fmt(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="flex justify-end">
                                <div className="w-full overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl sm:w-[400px] border border-slate-700 relative">
                                    <span className="absolute -right-4 -top-10 text-[160px] leading-none font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                                    <div className="flex flex-col gap-3 px-6 py-6 text-[14px] relative z-10">
                                        <div className="flex justify-between items-center text-slate-300 font-bold"><span>Subtotal</span><span className="tabular-nums text-white"><Taka className="text-[12px] text-slate-500 mr-0.5"/>{fmt(selectedInvoice.sub_total)}</span></div>
                                        {Number(selectedInvoice.tax) > 0 && (
                                            <div className="flex justify-between items-center text-slate-300 font-bold"><span>Tax / VAT</span><span className="text-white">{selectedInvoice.tax}%</span></div>
                                        )}
                                        {Number(selectedInvoice.discount) > 0 && (
                                            <div className="flex justify-between items-center text-slate-300 font-bold"><span>Discount</span><span className="tabular-nums text-rose-400">– <Taka className="text-[12px] text-rose-500/50 mr-0.5"/>{fmt(selectedInvoice.discount)}</span></div>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between border-t border-dashed border-white/20 bg-white/[0.03] px-6 py-5 relative z-10">
                                        <span className="text-[13.5px] font-black uppercase tracking-widest text-slate-400">Grand total</span>
                                        <span className="text-[32px] font-black leading-none tabular-nums"><Taka className="text-[20px] text-indigo-400 mr-1" />{fmt(selectedInvoice.grand_total)}</span>
                                    </div>
                                    {Number(selectedInvoice.advance_used) > 0 && (
                                        <div className="flex justify-between items-center border-t border-white/10 px-6 py-4 text-[13.5px] font-bold text-emerald-400 bg-emerald-900/20 relative z-10">
                                            <span>Advance applied</span><span className="tabular-nums">– <Taka className="text-[12px] text-emerald-600 mr-0.5"/>{fmt(selectedInvoice.advance_used)}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-white/10 px-6 py-5 bg-white/[0.05] relative z-10">
                                        <span className="text-[14px] font-black uppercase tracking-widest text-rose-400">Payable due</span>
                                        <span className="text-[24px] font-black tabular-nums text-rose-400"><Taka className="text-[16px] text-rose-500/70 mr-1" />{fmt(Math.max(Number(selectedInvoice.grand_total) - (selectedInvoice.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0) - Number(selectedInvoice.advance_used || 0), 0))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payments */}
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-6 sm:p-8 shadow-sm">
                                    <h4 className="mb-4 flex items-center gap-2.5 text-[16px] font-black text-emerald-900 uppercase tracking-widest"><i className="fa-solid fa-clock-rotate-left text-emerald-600"></i> Payments received</h4>
                                    <div className="flex flex-col gap-3">
                                        {selectedInvoice.payments.map((payment, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
                                                <div>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[14.5px] font-black text-slate-900"><i className="fa-regular fa-calendar-check text-[13px] text-slate-400 mr-1"></i>{payment.payment_date}</span>
                                                        <span className="rounded-lg bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 shadow-sm">{payment.method}</span>
                                                    </div>
                                                    {payment.note && <p className="mt-1.5 text-[13px] font-bold text-slate-500"><i className="fa-solid fa-quote-left text-[10px] text-slate-300 mr-1.5"></i>{payment.note}</p>}
                                                </div>
                                                <span className="text-[18px] font-black tabular-nums text-emerald-600"><Taka className="text-[13px] text-emerald-500/50 mr-0.5"/>{fmt(payment.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedInvoice.notes && selectedInvoice.notes !== '<p><br></p>' && (
                                <div className="rounded-2xl border border-slate-300 bg-white p-6 sm:p-8 shadow-sm">
                                    <h4 className="mb-4 flex items-center gap-2.5 text-[14px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-3"><i className="fa-solid fa-file-contract text-indigo-600"></i> Terms and notes</h4>
                                    <div className="html-content-view text-[14px] font-semibold leading-relaxed text-slate-600 bg-slate-50 p-5 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{ __html: selectedInvoice.notes }}></div>
                                </div>
                            )}
                        </div>

                        <div className="no-print flex shrink-0 justify-end border-t border-slate-300 bg-white px-8 py-5">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-black shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
