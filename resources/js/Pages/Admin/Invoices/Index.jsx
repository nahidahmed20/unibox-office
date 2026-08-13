import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ invoices = { data: [], links: [] }, clients = [], years = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [clientId, setClientId] = useState(filters.client_id || "");
    const [year, setYear] = useState(filters.year || "");
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 10);
    });

    const isFirstRender = useRef(true);

    // View Modal States
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const applyFilters = (overrides = {}) => {
        router.get(
            route("admin.invoices.index"),
            {
                search: overrides.search ?? searchTerm,
                per_page: overrides.per_page ?? perPage,
                client_id: overrides.client_id ?? clientId,
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
        const delay = setTimeout(() => applyFilters({ search: searchTerm }), 400);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => {
        const val = e.target.value === "all" ? "all" : Number(e.target.value);
        setPerPage(val);
        applyFilters({ per_page: val });
    };

    const handleClientFilter = (e) => { const val = e.target.value; setClientId(val); applyFilters({ client_id: val }); };
    const handleYearFilter = (e) => { const val = e.target.value; setYear(val); applyFilters({ year: val }); };
    const handleDateFromChange = (e) => { const val = e.target.value; setDateFrom(val); applyFilters({ date_from: val }); };
    const handleDateToChange = (e) => { const val = e.target.value; setDateTo(val); applyFilters({ date_to: val }); };

    const handleCopy = () => {
        if (!invoices.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const header = "SL\tINV #\tClient\tDate\tGrand Total\tPaid\tDue\tStatus\n";
        const text = invoices.data.map((inv, idx) => {
            const paid = Number(inv.payments_sum_amount || 0) + Number(inv.advance_used || 0);
            const due = Math.max(Number(inv.grand_total) - paid, 0);
            return `${idx + 1}\t${inv.invoice_number}\t${inv.client?.company_name || inv.client?.name}\t${inv.invoice_date}\t${inv.grand_total}\t${paid}\t${due}\t${inv.status}`;
        }).join("\n");
        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
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
        const styles = { paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' }, unpaid: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unpaid' }, partially_paid: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partially Paid' }, overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' } };
        return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    };

    const openViewModal = (inv) => { setSelectedInvoice(inv); setShowViewModal(true); };

    const invList = invoices.data || [];

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />
            <style dangerouslySetInnerHTML={{__html: `
                .html-content-view ul { list-style-type: disc; padding-left: 20px; margin-bottom: 10px; }
                .html-content-view ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 10px; }
                .html-content-view p { margin-bottom: 8px; }
                @media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Billing & Invoices</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage client invoices, monitor dues, and record payments.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden" id="printable-area">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> All Invoices
                        </div>
                        {hasPermission('create_invoice') && (
                            <Link href={route('admin.invoices.create')} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] shadow-sm">
                                <i className="fa-solid fa-plus"></i> Generate Invoice
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-gray-600">
                            <select value={perPage} onChange={handlePerPageChange} className="w-[100px] rounded-md border border-gray-300 bg-white px-3 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer text-center">
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                <option value="all">All</option>
                            </select>
                            <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] hover:bg-gray-50"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] hover:bg-gray-50"><i className="fas fa-file-excel text-emerald-500"></i> Excel</button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] hover:bg-gray-50"><i className="fas fa-print text-gray-500"></i> Print</button>
                        </div>
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input type="text" placeholder="Search INV # or Client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none focus:border-[var(--accent)]" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 px-6 py-3.5 bg-gray-50/50 border-b border-gray-100">
                        <select value={clientId} onChange={handleClientFilter} className="w-[200px] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)] cursor-pointer">
                            <option value="">All Clients</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                        </select>
                        <select value={year} onChange={handleYearFilter} className="w-[110px] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)] cursor-pointer">
                            <option value="">All Years</option>
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="flex items-center gap-2 text-[13px]">
                            <i className="fa-regular fa-calendar-days text-[var(--accent)]"></i>
                            <input type="date" value={dateFrom} onChange={handleDateFromChange} className="rounded-md border border-gray-300 bg-white px-2 py-1 outline-none focus:border-[var(--accent)]" />
                            <span className="text-gray-400">–</span>
                            <input type="date" value={dateTo} onChange={handleDateToChange} className="rounded-md border border-gray-300 bg-white px-2 py-1 outline-none focus:border-[var(--accent)]" />
                        </div>
                        {(clientId || year || dateFrom || dateTo || searchTerm) && (
                            <button onClick={() => { setSearchTerm(""); setClientId(""); setYear(""); setDateFrom(""); setDateTo(""); router.get(route("admin.invoices.index"), { per_page: perPage }, { preserveState: true, replace: true }); }} className="ml-auto flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-[12.5px] font-medium text-red-600 hover:bg-red-100">
                                <i className="fa-solid fa-xmark"></i> Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">INV #</th>
                                    <th className="px-6 py-4">Client / Company</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-right">Paid Amount</th>
                                    <th className="px-6 py-4 text-right">Due Amount</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const status = getStatusStyle(inv.status);
                                    const advanceUsed = Number(inv.advance_used || 0);
                                    const totalPaid = Number(inv.payments_sum_amount || 0) + advanceUsed;
                                    const dueAmount = Math.max(Number(inv.grand_total) - totalPaid, 0);

                                    return (
                                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">{invoices.from ? invoices.from + index : index + 1}</td>
                                            <td className="px-6 py-4 font-bold text-[var(--accent)]">{inv.invoice_number}</td>
                                            <td className="px-6 py-4">
                                                {inv.client?.company_name ? (
                                                    <div>
                                                        <span className="font-bold text-gray-900">{inv.client.company_name}</span>
                                                        <span className="block text-xs text-gray-500">Attn: {inv.client.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-semibold text-gray-900">{inv.client?.name || 'N/A'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{inv.invoice_date}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">TK. {parseFloat(inv.grand_total).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600">TK. {totalPaid.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-500">TK. {dueAmount.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_invoices') && (
                                                        <button onClick={() => openViewModal(inv)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    <a href={route('admin.invoices.print', inv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors" title="Print" target="_blank"><i className="fa-solid fa-print text-[12px]"></i></a>
                                                    {hasPermission('edit_invoice') && (
                                                        <Link href={route('admin.invoices.edit', inv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit"><i className="fa-regular fa-pen-to-square text-[12px]"></i></Link>
                                                    )}
                                                    {hasPermission('delete_invoice') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete"><i className="fa-regular fa-trash-can text-[12px]"></i></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                                                <p>No invoices found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {invoices.links && invoices.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {invoices.from || 0} to {invoices.to || 0} of {invoices.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {invoices.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}`} preserveState>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice text-[var(--accent)]"></i> Invoice Overview
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto brass-scroll bg-[#fafafa]">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-center mb-6">
                                    <div className="text-[36px] font-black text-gray-900">
                                        TK. {parseFloat(selectedInvoice.grand_total).toLocaleString('en-IN')}
                                    </div>
                                    <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[12px] font-bold uppercase tracking-wider mt-2 ${getStatusStyle(selectedInvoice.status).bg} ${getStatusStyle(selectedInvoice.status).text}`}>
                                        {getStatusStyle(selectedInvoice.status).label}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-5 mb-8 bg-blue-50/50 p-5 rounded-xl border border-blue-100/50">
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Invoice Details</span>
                                        <div className="text-[16px] font-bold text-[var(--accent)]"># {selectedInvoice.invoice_number}</div>
                                        <div className="text-[13px] text-gray-600 mt-1">Issue: {selectedInvoice.invoice_date}</div>
                                        <div className="text-[13px] text-red-500 font-medium">Due: {selectedInvoice.due_date}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Billed To</span>
                                        <div className="font-bold text-gray-800 text-[15px]">
                                            {selectedInvoice.client?.company_name || selectedInvoice.client?.name || "N/A"}
                                        </div>
                                        {selectedInvoice.client?.company_name && (
                                            <div className="text-[13px] text-gray-500 mt-0.5">Attn: {selectedInvoice.client?.name}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <h4 className="text-[15px] font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Line Items</h4>
                                    <div className="flex flex-col gap-4">
                                        {selectedInvoice.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start pb-4 border-b border-dashed border-gray-200 last:border-0 last:pb-0">
                                                <div className="flex-1 pr-6">
                                                    {item.item_name && (
                                                        <strong className="text-[15px] text-gray-900 block mb-1">{item.item_name}</strong>
                                                    )}
                                                    <div className="html-content-view text-[14px] text-gray-800" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="text-[13px] text-gray-500 mb-1">{item.quantity} x TK {item.unit_price}</div>
                                                    <strong className="text-[15px] text-gray-900 font-black">TK {item.total}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-5 border-t-2 border-gray-100">
                                    <div className="w-full sm:w-[320px] flex flex-col gap-3 text-[14px] text-gray-600">
                                        <div className="flex justify-between"><span>Sub Total:</span> <span className="font-semibold text-gray-900">TK {selectedInvoice.sub_total}</span></div>
                                        <div className="flex justify-between"><span>Tax:</span> <span className="font-semibold text-gray-900">{selectedInvoice.tax}%</span></div>
                                        <div className="flex justify-between"><span>Discount:</span> <span className="font-semibold text-red-500">- TK {selectedInvoice.discount}</span></div>
                                        <div className="flex justify-between border-t-2 border-gray-800 pt-3 mt-1 text-[18px] font-black text-gray-900">
                                            <span>Grand Total:</span> <span>TK {selectedInvoice.grand_total}</span>
                                        </div>
                                        {(Number(selectedInvoice.advance_used) > 0) && (
                                            <>
                                                <div className="flex justify-between text-[14px] font-bold text-emerald-600 mt-2 bg-emerald-50 px-3 py-2 rounded-lg">
                                                    <span>Advance Applied:</span> <span>- TK {Number(selectedInvoice.advance_used)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-dashed border-gray-300 pt-3 mt-1 text-[18px] font-black text-rose-600">
                                                    <span>Payable Due:</span> <span>TK {Number(selectedInvoice.grand_total) - Number(selectedInvoice.advance_used)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-gray-900 shadow-md">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}