import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

/* ---------- Design tokens ---------- */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const filterInput = "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const ghostBtn = "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const th = "px-5 py-3.5 text-[12.5px] font-semibold text-slate-500";

const STATUS = {
    paid: { label: 'Paid', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    unpaid: { label: 'Unpaid', dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-600 border-slate-200' },
    partially_paid: { label: 'Partially paid', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
    overdue: { label: 'Overdue', dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
};
const getStatus = (s) => STATUS[s] || { label: s, dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-600 border-slate-200' };
const STATUS_OPTIONS = Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label }));

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const StatusPill = ({ status, className = "" }) => {
    const s = getStatus(status);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${s.pill} ${className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>{s.label}
        </span>
    );
};

const Stat = ({ icon, label, value, tone }) => (
    <div className="flex items-center gap-3.5 px-5 py-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[15px] ${tone}`}><i className={icon}></i></span>
        <div>
            <p className="text-[12.5px] font-medium text-slate-400">{label}</p>
            <p className="mt-0.5 text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-white"><Taka className="text-[15px]" />{fmt(value)}</p>
        </div>
    </div>
);

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
            { preserveState: true, replace: true }
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
        setInvoiceNumber(""); setClientId(""); setStatus(""); setProjectName(""); setYear(""); setDateFrom(""); setDateTo("");
        router.get(route("admin.invoices.index"), { per_page: perPage }, { preserveState: true, replace: true });
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
        Swal.fire({ title: 'Delete Invoice?', text: 'This will also restore any applied advance back to the client!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' }).then((res) => {
            if (res.isConfirmed) router.delete(route('admin.invoices.destroy', id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted & Refunded!", timer: 1500, showConfirmButton: false }) });
        });
    };

    const openViewModal = (inv) => { setSelectedInvoice(inv); setShowViewModal(true); };

    const invList = invoices.data || [];
    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }));
    const hasFilters = invoiceNumber || clientId || status || projectName || year || dateFrom || dateTo;

    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '42px', borderRadius: '0.75rem',
            borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none',
            fontSize: '13.5px', fontWeight: 500, cursor: 'pointer',
            '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#cbd5e1' }
        }),
        placeholder: (base) => ({ ...base, color: '#94a3b8' }),
        menu: (base) => ({ ...base, fontSize: '13.5px', borderRadius: '0.75rem', padding: '4px', boxShadow: '0 12px 30px -8px rgba(15,23,42,0.18)', border: '1px solid #e2e8f0' }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({ ...base, borderRadius: '0.5rem', backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#eef2ff' : 'transparent', color: state.isSelected ? '#fff' : '#1e293b', cursor: 'pointer', fontWeight: state.isSelected ? 600 : 500 })
    };
    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, styles: selectStyles };

    const modalPaid = selectedInvoice ? (selectedInvoice.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0) : 0;

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />

            <style dangerouslySetInnerHTML={{__html: `
                .soft-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .soft-scroll::-webkit-scrollbar-track { background: transparent; }
                .soft-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }
                @media print { body * { visibility: hidden; } .no-print { display: none !important; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="mx-auto mt-2 flex max-w-[1600px] flex-col gap-6 pb-12">

                {/* Header with totals */}
                <div className="overflow-hidden rounded-2xl bg-slate-900 text-white">
                    <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
                        <div>
                            <h1 className="text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px]">Invoices</h1>
                            <p className="mt-2 text-[14px] text-slate-400">Track what you've billed, what's been paid, and what's still due.</p>
                        </div>
                        {hasPermission('create_invoice') && (
                            <Link href={route('admin.invoices.create')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-95">
                                <i className="fa-solid fa-plus text-[12px]"></i> New invoice
                            </Link>
                        )}
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <Stat icon="fa-solid fa-file-invoice-dollar" label="Total billed" value={totals.grand_total} tone="text-sky-300" />
                        <Stat icon="fa-solid fa-hand-holding-dollar" label="Total paid" value={totals.paid_amount} tone="text-emerald-300" />
                        <Stat icon="fa-solid fa-scale-unbalanced" label="Total due" value={totals.due_amount} tone="text-rose-300" />
                    </div>
                </div>

                {/* Pending billing */}
                {uninvoicedProjects.length > 0 && hasPermission('create_invoice') && (
                    <section className="no-print overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
                        <div className="flex items-center gap-2.5 px-5 py-3.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-[12px] text-amber-700"><i className="fa-solid fa-stopwatch"></i></span>
                            <h2 className="text-[15px] font-bold text-amber-950">Ready to bill</h2>
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{uninvoicedProjects.length}</span>
                            <span className="ml-1 hidden text-[13px] text-amber-800/70 sm:inline">Projects without an invoice yet</span>
                        </div>
                        <div className="soft-scroll flex snap-x gap-3 overflow-x-auto px-5 pb-4">
                            {uninvoicedProjects.map((project) => (
                                <div key={project.id} className="flex w-[300px] shrink-0 snap-start items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white p-4 transition hover:border-amber-400 hover:shadow-sm">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-[14px] font-bold text-slate-900" title={project.title}>{project.title}</h3>
                                        <p className="mt-0.5 truncate text-[12.5px] text-slate-500" title={project.client?.company_name || project.client?.name}>
                                            <i className="fa-regular fa-building mr-1 text-slate-400"></i>{project.client?.company_name || project.client?.name}
                                        </p>
                                        <p className="mt-1.5 text-[15px] font-extrabold tabular-nums text-emerald-600"><Taka className="text-[12px]" />{fmt(project.budget)}</p>
                                    </div>
                                    <Link
                                        href={route('admin.invoices.create', { client_id: project.client_id, project_id: project.id })}
                                        className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-amber-600 active:scale-95"
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
                <section id="printable-area" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* Toolbar */}
                    <div className="no-print flex flex-col gap-3 border-b border-slate-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
                                    <span className="border-r border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-medium text-slate-500">Show</span>
                                    <select
                                        value={perPage}
                                        onChange={(e) => handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="cursor-pointer border-none bg-transparent py-2.5 pl-3 pr-8 text-[13.5px] font-semibold text-slate-800 outline-none focus:ring-0"
                                    >
                                        <option value={10}>10 rows</option>
                                        <option value={25}>25 rows</option>
                                        <option value={50}>50 rows</option>
                                        <option value={100}>100 rows</option>
                                        <option value="all">All rows</option>
                                    </select>
                                </div>
                                <button onClick={handleCopy} className={ghostBtn}><i className="fa-regular fa-copy text-slate-400"></i> Copy</button>
                                <button onClick={handleExportCSV} className={ghostBtn}><i className="fa-solid fa-file-csv text-emerald-500"></i> CSV</button>
                                <button onClick={handlePrint} className={ghostBtn}><i className="fa-solid fa-print text-slate-400"></i> Print</button>
                            </div>
                            {hasFilters && (
                                <button onClick={clearAllFilters} className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50">
                                    <i className="fa-solid fa-xmark"></i> Clear filters
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                            <div className="relative">
                                <i className="fa-solid fa-hashtag pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400"></i>
                                <input type="text" placeholder="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={filterInput} />
                            </div>
                            <div className="relative">
                                <i className="fa-solid fa-briefcase pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400"></i>
                                <input type="text" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className={filterInput} />
                            </div>
                            <Select
                                options={clientOptions}
                                value={clientOptions.find(opt => String(opt.value) === String(clientId)) || null}
                                onChange={(selected) => handleFilterChange('client_id', selected ? selected.value : '')}
                                placeholder="All clients" isSearchable isClearable {...portal}
                            />
                            <Select
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.find(opt => String(opt.value) === String(status)) || null}
                                onChange={(selected) => handleFilterChange('status', selected ? selected.value : '')}
                                placeholder="All statuses" isClearable {...portal}
                            />
                            <select value={year} onChange={(e) => handleFilterChange('year', e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10">
                                <option value="">All years</option>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
                                <i className="fa-regular fa-calendar-days text-[13px] text-slate-400"></i>
                                <input type="date" value={dateFrom} onChange={(e) => handleFilterChange('date_from', e.target.value)} className="w-full min-w-0 cursor-pointer border-none bg-transparent p-0 text-[12.5px] text-slate-700 outline-none focus:ring-0" title="From date" />
                                <span className="text-slate-300">–</span>
                                <input type="date" value={dateTo} onChange={(e) => handleFilterChange('date_to', e.target.value)} className="w-full min-w-0 cursor-pointer border-none bg-transparent p-0 text-[12.5px] text-slate-700 outline-none focus:ring-0" title="To date" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="soft-scroll overflow-x-auto">
                        <table className="w-full min-w-[1100px] whitespace-nowrap border-collapse text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className={`${th} w-14 text-center`}>SL</th>
                                    <th className={th}>Invoice</th>
                                    <th className={th}>Client and projects</th>
                                    <th className={`${th} text-right`}>Total</th>
                                    <th className={`${th} text-right`}>Paid</th>
                                    <th className={`${th} text-right`}>Due</th>
                                    <th className={`${th} text-center`}>Status</th>
                                    <th className={`${th} no-print text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13.5px] text-slate-800">
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const totalPaid = Number(inv.payments_sum_amount || 0);
                                    const dueAmount = Math.max(Number(inv.grand_total) - totalPaid, 0);
                                    const projectItems = inv.items?.filter(item => item.project);
                                    const expanded = expandedProjects.includes(inv.id);
                                    const chip = "flex w-max max-w-[220px] items-center gap-1.5 truncate rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-600";

                                    return (
                                        <tr key={inv.id} className="transition-colors hover:bg-slate-50/70">
                                            <td className="px-5 py-4 text-center text-slate-400 tabular-nums">{invoices.from ? invoices.from + index : index + 1}</td>
                                            <td className="px-5 py-4">
                                                <div className="text-[14.5px] font-bold text-indigo-600">#{inv.invoice_number}</div>
                                                <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-500">
                                                    <i className="fa-regular fa-calendar text-slate-400"></i>{inv.invoice_date}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-bold uppercase text-indigo-700">
                                                        {(inv.client?.company_name || inv.client?.name || '?').charAt(0)}
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{inv.client?.company_name || inv.client?.name || 'Unknown client'}</div>
                                                        {projectItems && projectItems.length > 0 ? (
                                                            <div className="mt-1 flex flex-col gap-1">
                                                                {(expanded ? projectItems : projectItems.slice(0, 1)).map((p, idx) => (
                                                                    <div key={idx} className={chip} title={p.project.title}>
                                                                        <i className="fa-solid fa-layer-group text-indigo-400"></i>{p.project.title}
                                                                    </div>
                                                                ))}
                                                                {projectItems.length > 1 && (
                                                                    <button onClick={() => toggleProjectExpand(inv.id)} className="text-left text-[12px] font-semibold text-indigo-600 hover:text-indigo-800">
                                                                        {expanded ? "Show less" : `+ ${projectItems.length - 1} more`}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-slate-400"><i className="fa-solid fa-receipt"></i> General billing</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right text-[15px] font-bold tabular-nums text-slate-900"><Taka />{fmt(inv.grand_total)}</td>
                                            <td className="px-5 py-4 text-right text-[14.5px] font-bold tabular-nums text-emerald-600">
                                                {totalPaid > 0 ? <><Taka />{fmt(totalPaid)}</> : <span className="text-slate-300">–</span>}
                                            </td>
                                            <td className="px-5 py-4 text-right text-[14.5px] font-bold tabular-nums text-rose-600">
                                                {dueAmount > 0 ? <><Taka />{fmt(dueAmount)}</> : <span className="text-slate-300">–</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center"><StatusPill status={inv.status} /></td>
                                            <td className="no-print px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {hasPermission('view_invoices') && (
                                                        <button onClick={() => openViewModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600" title="View details">
                                                            <i className="fa-regular fa-eye text-[14px]"></i>
                                                        </button>
                                                    )}
                                                    <a href={route('admin.invoices.print', inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-violet-50 hover:text-violet-600" title="Print invoice" target="_blank">
                                                        <i className="fa-solid fa-print text-[13px]"></i>
                                                    </a>
                                                    {hasPermission('edit_invoice') && (
                                                        <Link href={route('admin.invoices.edit', inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[14px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_invoice') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[14px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400"><i className="fa-solid fa-file-invoice-dollar"></i></span>
                                                <p className="text-[15px] font-bold text-slate-800">No invoices match these filters</p>
                                                <p className="mt-1 text-[13.5px] text-slate-500">Clear a filter or create a new invoice to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {invoices.links && invoices.links.length > 3 && (
                        <div className="no-print flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row">
                            <p className="text-[13px] text-slate-500">
                                Showing <b className="text-slate-700">{invoices.from || 0}</b> to <b className="text-slate-700">{invoices.to || 0}</b> of <b className="text-slate-700">{invoices.total || 0}</b> invoices
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                                {invoices.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[34px] items-center justify-center rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50' : 'pointer-events-none border-slate-100 bg-slate-50 text-slate-300'}`} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Invoice view modal */}
            {showViewModal && selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setShowViewModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ animation: 'modalIn .2s ease-out' }}>

                        {/* Top bar */}
                        <div className="no-print flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <StatusPill status={selectedInvoice.status} />
                                <span className="text-[14px] font-semibold text-slate-500">Invoice #{selectedInvoice.invoice_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={route('admin.invoices.print', selectedInvoice.id)} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-500">
                                    <i className="fa-solid fa-print"></i> Print / PDF
                                </a>
                                <button onClick={() => setShowViewModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-rose-50 hover:text-rose-500" aria-label="Close">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="soft-scroll flex flex-col gap-7 overflow-y-auto p-6 sm:p-9">

                            <div className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-7 sm:flex-row sm:items-start">
                                <div>
                                    <p className="text-[13px] font-medium text-slate-500">Invoice</p>
                                    <p className="mt-1 text-[32px] font-extrabold leading-none tracking-tight text-slate-900">#{selectedInvoice.invoice_number}</p>
                                    <p className="mt-2 text-[12.5px] text-slate-400">Reference INV-REF-{selectedInvoice.id}</p>
                                </div>
                                <div className="flex gap-6 sm:text-right">
                                    <div>
                                        <p className="text-[12.5px] font-medium text-slate-500">Issued</p>
                                        <p className="mt-1 text-[14.5px] font-bold text-slate-900">{selectedInvoice.invoice_date}</p>
                                    </div>
                                    <div>
                                        <p className="text-[12.5px] font-medium text-rose-500">Due</p>
                                        <p className="mt-1 text-[14.5px] font-bold text-rose-600">{selectedInvoice.due_date}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                                <p className="text-[12.5px] font-medium text-slate-500">Billed to</p>
                                <h3 className="mt-1 text-[19px] font-extrabold text-slate-900">{selectedInvoice.client?.company_name || selectedInvoice.client?.name || "N/A"}</h3>
                                {selectedInvoice.client?.company_name && <p className="mt-0.5 text-[13px] font-medium text-slate-600">Attn: {selectedInvoice.client?.name}</p>}
                                {selectedInvoice.client?.phone && <p className="mt-1.5 text-[13px] text-slate-500"><i className="fa-solid fa-phone mr-1.5 text-[11px] opacity-70"></i>{selectedInvoice.client?.phone}</p>}
                            </div>

                            {/* Items */}
                            <div>
                                <h4 className="mb-3 text-[15px] font-bold text-slate-900">Items</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-[520px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-[12.5px] font-semibold text-slate-500">
                                            <tr>
                                                <th className="px-5 py-3">Service</th>
                                                <th className="px-5 py-3 text-center">Qty</th>
                                                <th className="px-5 py-3 text-right">Unit price</th>
                                                <th className="px-5 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {selectedInvoice.items?.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-5 py-4">
                                                        <strong className="block text-[14px] font-bold text-slate-900">{item.item_name}</strong>
                                                        {item.project && (
                                                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-700">
                                                                <i className="fa-solid fa-layer-group text-[10px]"></i>{item.project.title}
                                                            </span>
                                                        )}
                                                        {item.description && <div className="html-content-view mt-1.5 text-[12.5px] leading-relaxed text-slate-500" dangerouslySetInnerHTML={{ __html: item.description }}></div>}
                                                    </td>
                                                    <td className="px-5 py-4 text-center font-semibold text-slate-700 tabular-nums">{item.quantity}</td>
                                                    <td className="px-5 py-4 text-right font-semibold text-slate-600 tabular-nums"><Taka />{fmt(item.unit_price)}</td>
                                                    <td className="px-5 py-4 text-right font-bold text-slate-900 tabular-nums"><Taka />{fmt(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-full overflow-hidden rounded-xl bg-slate-900 text-white shadow-lg sm:w-[360px]">
                                    <div className="flex flex-col gap-2.5 px-5 py-4 text-[13.5px]">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="font-bold tabular-nums text-white"><Taka />{fmt(selectedInvoice.sub_total)}</span></div>
                                        {Number(selectedInvoice.tax) > 0 && (
                                            <div className="flex justify-between text-slate-400"><span>Tax / VAT</span><span className="font-bold text-white">{selectedInvoice.tax}%</span></div>
                                        )}
                                        {Number(selectedInvoice.discount) > 0 && (
                                            <div className="flex justify-between text-slate-400"><span>Discount</span><span className="font-bold tabular-nums text-rose-300">– <Taka />{fmt(selectedInvoice.discount)}</span></div>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between border-t border-dashed border-white/15 bg-white/[0.04] px-5 py-4">
                                        <span className="text-[13.5px] font-medium text-slate-300">Grand total</span>
                                        <span className="text-[28px] font-extrabold leading-none tabular-nums"><Taka className="text-[18px] text-indigo-400" />{fmt(selectedInvoice.grand_total)}</span>
                                    </div>
                                    {Number(selectedInvoice.advance_used) > 0 && (
                                        <div className="flex justify-between border-t border-white/10 px-5 py-3 text-[13.5px] text-emerald-300">
                                            <span>Advance applied</span><span className="font-bold tabular-nums">– <Taka />{fmt(selectedInvoice.advance_used)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5">
                                        <span className="text-[13.5px] font-semibold text-rose-300">Payable due</span>
                                        <span className="text-[18px] font-extrabold tabular-nums text-rose-300"><Taka className="text-[14px]" />{fmt(Math.max(Number(selectedInvoice.grand_total) - modalPaid, 0))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payments */}
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
                                    <h4 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-emerald-900"><i className="fa-solid fa-clock-rotate-left text-[13px]"></i> Payments received</h4>
                                    <div className="flex flex-col gap-2.5">
                                        {selectedInvoice.payments.map((payment, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-4 py-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-bold text-slate-900">{payment.payment_date}</span>
                                                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold capitalize text-emerald-700">{payment.method}</span>
                                                    </div>
                                                    {payment.note && <p className="mt-1 text-[12.5px] italic text-slate-500">{payment.note}</p>}
                                                </div>
                                                <span className="text-[16px] font-extrabold tabular-nums text-emerald-600"><Taka />{fmt(payment.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes (saved from the rich text editor, so render as HTML) */}
                            {selectedInvoice.notes && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                    <h4 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-900"><i className="fa-solid fa-file-contract text-[13px] text-indigo-500"></i> Terms and notes</h4>
                                    <div className="html-content-view text-[13px] leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: selectedInvoice.notes }}></div>
                                </div>
                            )}
                        </div>

                        <div className="no-print flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 px-6 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-slate-800">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
