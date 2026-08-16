import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select'; // 🟢 Added React-Select for Searchable Dropdowns

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Index({ invoices = { data: [], links: [] }, clients = [], years = [], uninvoicedProjects = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Filters State
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
            const paid = Number(inv.payments_sum_amount || 0) + Number(inv.advance_used || 0);
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
            const paid = Number(inv.payments_sum_amount || 0) + Number(inv.advance_used || 0);
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

    const getStatusStyle = (status) => {
        const styles = { paid: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-600', label: 'Paid' }, unpaid: { bg: 'bg-gray-50 border border-gray-200', text: 'text-gray-600', label: 'Unpaid' }, partially_paid: { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-600', label: 'Partially Paid' }, overdue: { bg: 'bg-red-50 border border-red-200', text: 'text-red-600', label: 'Overdue' } };
        return styles[status] || { bg: 'bg-gray-50', text: 'text-gray-600', label: status };
    };

    const openViewModal = (inv) => { setSelectedInvoice(inv); setShowViewModal(true); };

    const invList = invoices.data || [];

    // 🟢 React-Select Styling
    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '38px', borderRadius: '0.5rem',
            border: state.isFocused ? '1px solid var(--accent, #6366f1)' : '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
            transition: 'all 0.2s ease', fontSize: '13px', cursor: 'pointer',
            '&:hover': { borderColor: state.isFocused ? 'var(--accent, #6366f1)' : '#9ca3af' }
        }),
        menu: (base) => ({ ...base, fontSize: '13px', borderRadius: '0.5rem', zIndex: 9999 }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base, backgroundColor: state.isSelected ? 'var(--accent, #4f46e5)' : state.isFocused ? '#f8fafc' : 'white',
            color: state.isSelected ? 'white' : '#1e293b', cursor: 'pointer', fontWeight: state.isSelected ? '700' : '500',
        })
    };

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-amber-scroll::-webkit-scrollbar { height: 6px; }
                .custom-amber-scroll::-webkit-scrollbar-track { background: #fef3c7; border-radius: 8px; margin: 0 15px; }
                .custom-amber-scroll::-webkit-scrollbar-thumb { background: #f59e0b; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 mt-2">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Finance & Revenue
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Billing & Invoices</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Manage client invoices, monitor dues, and record payments.</p>
                    </div>
                </div>

                {/* 🟢 Pending Billing Section */}
                {uninvoicedProjects.length > 0 && hasPermission('create_invoice') && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl shadow-sm overflow-hidden no-print">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100/80">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><i className="fa-solid fa-clock-rotate-left text-[14px]"></i></div>
                                <h2 className="text-[15px] font-bold text-amber-900">Pending for Billing</h2>
                                <span className="bg-amber-500 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ml-1 shadow-sm">{uninvoicedProjects.length}</span>
                            </div>
                            {uninvoicedProjects.length > 3 && (
                                <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 animate-pulse bg-white/50 px-3 py-1 rounded-full border border-amber-200">
                                    Scroll <i className="fa-solid fa-arrow-right-long"></i>
                                </div>
                            )}
                        </div>

                        <div className="flex overflow-x-auto gap-4 p-5 custom-amber-scroll snap-x pb-6">
                            {uninvoicedProjects.map((project) => (
                                <div key={project.id} className="w-[300px] shrink-0 snap-start bg-white border border-amber-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-amber-300 transition-all flex flex-col justify-between group relative overflow-hidden">
                                    <div className="absolute right-0 top-0 h-16 w-16 bg-amber-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <div className="flex-1 min-w-0 pr-2 relative z-10">
                                        <h3 className="font-extrabold text-gray-900 text-[14px] truncate mb-2" title={project.title}>{project.title}</h3>
                                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 mb-2 truncate" title={project.client?.company_name || project.client?.name}>
                                            <i className="fa-regular fa-building text-gray-400"></i> {project.client?.company_name || project.client?.name}
                                        </div>
                                        <div className="font-black text-emerald-600 text-[15px]">
                                            <Taka className="text-[13px]" />{parseFloat(project.budget).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <Link href={route('admin.invoices.create')} className="mt-4 flex w-full items-center justify-center gap-2 bg-amber-100 text-amber-700 font-bold text-[12px] py-2 rounded-lg hover:bg-amber-500 hover:text-white transition-colors">
                                        <i className="fa-solid fa-file-invoice"></i> Create Bill
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟢 Main Data Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" id="printable-area">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-file-invoice-dollar text-[14px]"></i>
                            </div>
                            Invoice Directory
                        </div>
                        {hasPermission('create_invoice') && (
                            <Link href={route('admin.invoices.create')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Generate Invoice
                            </Link>
                        )}
                    </div>

                    {/* 🟢 Modern Filter Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-3">
                            
                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all z-20">
                                <span className="bg-gray-50/80 px-4 py-2 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select 
                                        value={perPage} 
                                        onChange={(e) => handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 z-20">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        {/* Search by Invoice/Project */}
                        <div className="flex items-center gap-3 w-full lg:w-auto z-20">
                            <div className="relative w-full sm:w-[180px]">
                                <i className="fa-solid fa-hashtag absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                                <input type="text" placeholder="Invoice Number..." value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                            </div>
                            <div className="relative w-full sm:w-[200px]">
                                <i className="fa-solid fa-briefcase absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                                <input type="text" placeholder="Project Name..." value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                            </div>
                        </div>
                    </div>

                    {/* 🟢 Searchable Selects & Date Filters */}
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50/50 border-b border-gray-100 no-print">
                        
                        {/* React-Select for Client */}
                        <div className="relative w-full sm:w-[260px] z-[60]">
                            <Select
                                options={clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }))}
                                value={clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` })).find(opt => String(opt.value) === String(clientId)) || null}
                                onChange={(selected) => handleFilterChange('client_id', selected ? selected.value : '')}
                                placeholder="🔍 Search Client..."
                                isSearchable isClearable
                                styles={selectStyles}
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                        </div>

                        {/* React-Select for Status */}
                        <div className="relative w-full sm:w-[180px] z-[50]">
                            <Select
                                options={[
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'unpaid', label: 'Unpaid' },
                                    { value: 'partially_paid', label: 'Partially Paid' },
                                    { value: 'overdue', label: 'Overdue' }
                                ]}
                                value={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' }, { value: 'partially_paid', label: 'Partially Paid' }, { value: 'overdue', label: 'Overdue' }].find(opt => String(opt.value) === String(status)) || null}
                                onChange={(selected) => handleFilterChange('status', selected ? selected.value : '')}
                                placeholder="Select Status..."
                                isClearable
                                styles={selectStyles}
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select value={year} onChange={(e) => handleFilterChange('year', e.target.value)} className="w-[100px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                <option value="">All Years</option>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm">
                            <i className="fa-regular fa-calendar-days text-indigo-500 text-[13px]"></i>
                            <input type="date" value={dateFrom} onChange={(e) => handleFilterChange('date_from', e.target.value)} className="bg-transparent border-none text-[12.5px] p-0 outline-none cursor-pointer" title="From Date" />
                            <span className="text-gray-400">–</span>
                            <input type="date" value={dateTo} onChange={(e) => handleFilterChange('date_to', e.target.value)} className="bg-transparent border-none text-[12.5px] p-0 outline-none cursor-pointer" title="To Date" />
                        </div>

                        {(invoiceNumber || clientId || status || projectName || year || dateFrom || dateTo) && (
                            <button onClick={clearAllFilters} className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-600 hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm">
                                <i className="fa-solid fa-xmark"></i> Clear
                            </button>
                        )}
                    </div>

                    {/* 🟢 Modern Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-[#F8FAFC] border-b-2 border-[#E2E8F0] print-bg">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Invoice Details</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Client / Project</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Grand Total</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Paid Amount</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] border-r border-gray-100">Due Amount</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Status</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const statusStyle = getStatusStyle(inv.status);
                                    const advanceUsed = Number(inv.advance_used || 0);
                                    const totalPaid = Number(inv.payments_sum_amount || 0) + advanceUsed;
                                    const dueAmount = Math.max(Number(inv.grand_total) - totalPaid, 0);
                                    const projectItems = inv.items?.filter(item => item.project);

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">{invoices.from ? invoices.from + index : index + 1}</td>
                                            
                                            <td className="px-6 py-4">
                                                <div className="font-black text-indigo-600 text-[14.5px]">#{inv.invoice_number}</div>
                                                <div className="text-[11.5px] font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                                                    <i className="fa-regular fa-calendar text-gray-400"></i> {inv.invoice_date}
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[12px] font-black uppercase shadow-sm">
                                                        {(inv.client?.company_name || inv.client?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-gray-900 text-[13.5px]">
                                                            {inv.client?.company_name || inv.client?.name || 'Unknown Client'}
                                                        </div>
                                                        {projectItems && projectItems.length > 0 ? (
                                                            <div className="mt-1 flex flex-col gap-1">
                                                                {expandedProjects.includes(inv.id) ? (
                                                                    <>
                                                                        {projectItems.map((p, idx) => (
                                                                            <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded border border-gray-200/50 w-max max-w-[200px] truncate" title={p.project.title}>
                                                                                <i className="fa-solid fa-layer-group text-indigo-400"></i> {p.project.title}
                                                                            </div>
                                                                        ))}
                                                                        <button onClick={() => toggleProjectExpand(inv.id)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 text-left mt-0.5"><i className="fa-solid fa-chevron-up"></i> Less</button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded border border-gray-200/50 w-max max-w-[200px] truncate" title={projectItems[0].project.title}>
                                                                            <i className="fa-solid fa-layer-group text-indigo-400"></i> {projectItems[0].project.title}
                                                                        </div>
                                                                        {projectItems.length > 1 && (
                                                                            <button onClick={() => toggleProjectExpand(inv.id)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 text-left mt-0.5">+ {projectItems.length - 1} more</button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[11px] font-bold text-gray-400 mt-1 flex items-center gap-1"><i className="fa-solid fa-receipt"></i> General Billing</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-gray-900 text-[15.5px] tabular-nums bg-gray-50 px-2.5 py-1 rounded-lg inline-block border border-gray-200/60 shadow-sm">
                                                    <Taka />{parseFloat(inv.grand_total).toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-[14.5px] tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                                {totalPaid > 0 ? <><Taka />{totalPaid.toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-right font-black text-rose-600 text-[14.5px] tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors border-r border-gray-100">
                                                {dueAmount > 0 ? <><Taka />{dueAmount.toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                                                    {statusStyle.label}
                                                </span>
                                            </td>
                                            
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_invoices') && (
                                                        <button onClick={() => openViewModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    <a href={route('admin.invoices.print', inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors shadow-sm" title="Print Invoice" target="_blank">
                                                        <i className="fa-solid fa-print text-[13px]"></i>
                                                    </a>
                                                    {hasPermission('edit_invoice') && (
                                                        <Link href={route('admin.invoices.edit', inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </Link>
                                                    )}
                                                    {hasPermission('delete_invoice') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-file-invoice-dollar text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No invoices found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or generate a new invoice.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {invoices.links && invoices.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4 no-print">
                            <div className="text-[13px] font-medium text-gray-500">
                                Showing {invoices.from || 0} to {invoices.to || 0} of {invoices.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {invoices.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] font-bold transition-colors ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}`} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <button onClick={() => setShowViewModal(false)} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white h-9 w-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20"><i className="fa-solid fa-xmark text-sm"></i></button>
                            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl shadow-lg ring-1 ring-white/30"><i className="fa-solid fa-file-invoice"></i></div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white ${getStatusStyle(selectedInvoice.status).text}`}>
                                            {getStatusStyle(selectedInvoice.status).label}
                                        </span>
                                    </div>
                                    <h2 className="text-[26px] font-black text-white tracking-tight leading-tight">Invoice #{selectedInvoice.invoice_number}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-address-card text-blue-500 mr-1.5"></i> Billed To</span>
                                    <div className="font-extrabold text-gray-900 text-[18px]">{selectedInvoice.client?.company_name || selectedInvoice.client?.name || "N/A"}</div>
                                    {selectedInvoice.client?.company_name && <div className="text-[13px] text-gray-500 mt-1 font-medium">Attn: {selectedInvoice.client?.name}</div>}
                                    {selectedInvoice.client?.phone && <div className="text-[13px] text-gray-500 mt-0.5"><i className="fa-solid fa-phone text-[10px] mr-1"></i> {selectedInvoice.client?.phone}</div>}
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-4 border-b border-gray-100 pb-2"><i className="fa-solid fa-calendar-days text-rose-500 mr-1.5"></i> Timeline</span>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-500 font-semibold text-[13px]">Issue Date:</span>
                                        <span className="font-bold text-gray-800 text-[14px]">{selectedInvoice.invoice_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-semibold text-[13px]">Due Date:</span>
                                        <span className="font-bold text-rose-600 text-[14px]">{selectedInvoice.due_date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800"><i className="fa-solid fa-list text-indigo-500 mr-1.5"></i> Line Items</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col gap-4">
                                        {selectedInvoice.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start pb-4 border-b border-dashed border-gray-200 last:border-0 last:pb-0">
                                                <div className="flex-1 pr-6">
                                                    {item.item_name && <strong className="text-[15px] text-gray-900 block mb-1">{item.item_name}</strong>}
                                                    {item.project && (
                                                        <div className="bg-indigo-50/50 px-2.5 py-1 rounded-md border border-indigo-100 text-[12px] text-indigo-700 mb-2 inline-flex items-center font-bold">
                                                            <i className="fa-solid fa-diagram-project mr-1.5"></i> {item.project.title}
                                                        </div>
                                                    )}
                                                    <div className="html-content-view text-[13px] text-gray-600" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="text-[12px] font-bold text-gray-400 mb-1">{item.quantity} x <Taka className="text-[10px]"/>{item.unit_price}</div>
                                                    <strong className="text-[16px] text-gray-900 font-black tabular-nums"><Taka />{item.total}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <div className="w-full sm:w-[320px] bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-end"><span className="text-[13px] text-gray-400 font-medium">Sub Total</span><span className="text-[15px] font-bold tabular-nums"><Taka />{selectedInvoice.sub_total}</span></div>
                                        {Number(selectedInvoice.tax) > 0 && <div className="flex justify-between items-end"><span className="text-[13px] text-gray-400 font-medium">Tax</span><span className="text-[15px] font-bold">{selectedInvoice.tax}%</span></div>}
                                        {Number(selectedInvoice.discount) > 0 && <div className="flex justify-between items-end"><span className="text-[13px] text-rose-400 font-medium">Discount</span><span className="text-[15px] font-bold text-rose-400">- <Taka />{selectedInvoice.discount}</span></div>}
                                        <div className="flex justify-between border-t border-gray-700 pt-3 mt-1 items-end">
                                            <span className="text-[13px] text-gray-300 font-bold uppercase tracking-widest">Grand Total</span>
                                            <span className="text-[22px] font-black text-white tabular-nums"><Taka className="text-[18px]"/>{parseFloat(selectedInvoice.grand_total).toLocaleString('en-IN')}</span>
                                        </div>
                                        {(Number(selectedInvoice.advance_used) > 0) && (
                                            <>
                                                <div className="flex justify-between items-end mt-2 bg-emerald-500/20 px-3 py-2 rounded-lg border border-emerald-500/30">
                                                    <span className="text-[12px] font-bold text-emerald-400">Advance Applied</span>
                                                    <span className="text-[14px] font-bold text-emerald-400 tabular-nums">- <Taka />{parseFloat(selectedInvoice.advance_used).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    <span className="text-[13px] text-rose-300 font-bold uppercase tracking-widest">Payable Due</span>
                                                    <span className="text-[20px] font-black text-rose-400 tabular-nums"><Taka className="text-[16px]"/>{(Number(selectedInvoice.grand_total) - Number(selectedInvoice.advance_used)).toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-emerald-100/80 bg-emerald-100/30">
                                        <span className="block text-[12px] font-bold uppercase tracking-wider text-emerald-800"><i className="fa-solid fa-clock-rotate-left mr-1.5"></i> Payment Received History</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-3">
                                            {selectedInvoice.payments.map((payment, i) => (
                                                <div key={i} className="flex justify-between items-center text-[13.5px] border-b border-emerald-100/50 pb-3 last:border-0 last:pb-0">
                                                    <div>
                                                        <span className="font-extrabold text-gray-900 mr-3">{payment.payment_date}</span>
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider border border-emerald-200">{payment.method}</span>
                                                        {payment.note && <div className="text-gray-500 italic mt-1 text-[12px]"><i className="fa-solid fa-quote-left opacity-50 mr-1"></i> {payment.note}</div>}
                                                    </div>
                                                    <div className="font-black text-emerald-600 text-[16px] tabular-nums"><Taka />{parseFloat(payment.amount).toLocaleString('en-IN')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedInvoice.notes && (
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
                                    <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider mb-2"><i className="fa-solid fa-circle-info mr-1 text-blue-500"></i> Terms & Notes</h4>
                                    <div className="text-[13.5px] text-gray-600 whitespace-pre-line leading-relaxed font-medium">
                                        {selectedInvoice.notes}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}