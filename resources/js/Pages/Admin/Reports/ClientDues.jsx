import React, { useState, useEffect, useRef, useMemo } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import CustomSelect from '@/Components/CustomSelect';
import TableExportButtons from '@/Components/TableExportButtons';

export default function ClientDues({ clientDues, filters, grandTotalDue = 0, grandTotalInvoiceDue = 0, grandTotalAdvance = 0, grandTotalNetDue = 0 }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Filters States
    const [searchTerm, setSearchTerm] = useState(filters?.search || "");
    const [perPage, setPerPage] = useState(filters?.per_page || "25");
    const isFirstRender = useRef(true);

    const clients = clientDues?.data || [];

    // --- Search & Pagination Logic ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== "25" && perPage !== 25) params.per_page = perPage;

            router.get(window.location.pathname, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    /* =========================================
       EXPORT FUNCTIONS (Copy, CSV, Print)
    ========================================= */
    const exportHeaders = ['SL', 'Client Name', 'Company', 'Phone', 'Total Billed (৳)', 'Total Paid (৳)', 'Invoice Due (৳)', 'Available Advance (৳)', 'Net Due (৳)'];
    const exportRows = useMemo(() => {
        return clients.map((c, idx) => {
            const billed = parseFloat(c.total_invoiced || 0);
            const paid = parseFloat(c.total_paid || 0);
            const invDue = parseFloat(c.invoice_due !== undefined ? c.invoice_due : Math.max(0, billed - paid));
            const advance = parseFloat(c.available_advance || 0);
            const netDue = parseFloat(c.net_due !== undefined ? c.net_due : Math.max(0, invDue - advance));
            return [
                idx + 1,
                c.name || '',
                c.company_name || 'Individual',
                c.phone || 'N/A',
                billed.toFixed(2),
                paid.toFixed(2),
                invDue.toFixed(2),
                advance.toFixed(2),
                netDue.toFixed(2)
            ];
        });
    }, [clients]);

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-client-dues-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Accounts Receivable - Client Dues</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
                        .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
                        h2 { color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1.5px; font-size: 22px; }
                        p { color: #64748b; font-size: 13px; margin: 0; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; font-size: 13px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; }
                        th { background-color: #f8fafc; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 12px; }
                        .no-print { display: none !important; }
                        .text-right { text-align: right !important; }
                        .text-center { text-align: center !important; }
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; color: #64748b; }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h2>Accounts Receivable Report</h2>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    return (
        <AdminLayout>
            <Head title="Accounts Receivable (Dues)" />

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1500px] mx-auto pb-12">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Financial Analytics
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Accounts Receivable</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Monitor and manage your outstanding market dues, client billing, and advance balances efficiently.
                        </p>
                    </div>
                </div>

                {/* 🟢 4 Summary Cards (Grid 4 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Card 1: Active Clients */}
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition-all group">
                        <div className="relative flex items-center gap-4">
                            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200">
                                <i className="fa-solid fa-users text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Active Clients</p>
                                <h3 className="text-[24px] font-black text-gray-900 m-0 tracking-tight">{clientDues?.total || 0}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Total Invoice Due */}
                    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-xs hover:shadow-md transition-all group">
                        <div className="relative flex items-center gap-4">
                            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200">
                                <i className="fa-solid fa-file-invoice text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">Gross Invoice Due</p>
                                <h3 className="text-[24px] font-black text-amber-800 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1 opacity-80"></i>
                                    {Number(grandTotalInvoiceDue || grandTotalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Total Available Advance */}
                    <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/40 p-5 shadow-xs hover:shadow-md transition-all group">
                        <div className="relative flex items-center gap-4">
                            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-200">
                                <i className="fa-solid fa-wallet text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700">Client Advance In-Hand</p>
                                <h3 className="text-[24px] font-black text-purple-800 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1 opacity-80"></i>
                                    {Number(grandTotalAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Market Actual Net Due */}
                    <div className="relative overflow-hidden rounded-2xl border border-rose-300 bg-gradient-to-br from-white to-rose-50/60 p-5 shadow-xs hover:shadow-md transition-all group ring-1 ring-rose-200">
                        <div className="relative flex items-center gap-4">
                            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-200">
                                <i className="fa-solid fa-file-invoice-dollar text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-black uppercase tracking-wider text-rose-600">Actual Net Receivable</p>
                                <h3 className="text-[24px] font-black text-rose-700 m-0 tabular-nums tracking-tight">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1 opacity-90"></i>
                                    {Number(grandTotalNetDue || grandTotalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar & Table */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/40">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename="Client_Dues_Report"
                                title="Accounts Receivable - Client Dues Report"
                            />
                        </div>

                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search client name, company, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table id="printable-client-dues-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-5 py-4 w-12">SL</th>
                                    <th className="px-5 py-4">Client Profile</th>
                                    <th className="px-5 py-4 text-right bg-blue-50/40">Total Billed</th>
                                    <th className="px-5 py-4 text-right bg-emerald-50/40">Total Paid</th>
                                    <th className="px-5 py-4 text-right bg-amber-50/40">Invoice Due</th>
                                    <th className="px-5 py-4 text-right bg-purple-50/40">Avail. Advance</th>
                                    <th className="px-5 py-4 text-right bg-rose-50/40 border-r border-gray-100">Actual Net Due</th>
                                    <th className="px-5 py-4 text-center no-print w-32">Audit Trail</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-check-double text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No due records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    clients.map((client, idx) => {
                                        const invoiced = parseFloat(client.total_invoiced || 0);
                                        const paid = parseFloat(client.total_paid || 0);
                                        const invoiceDue = parseFloat(client.invoice_due !== undefined ? client.invoice_due : Math.max(0, invoiced - paid));
                                        const advance = parseFloat(client.available_advance || 0);
                                        const netDue = parseFloat(client.net_due !== undefined ? client.net_due : Math.max(0, invoiceDue - advance));
                                        const advanceSurplus = parseFloat(client.advance_surplus !== undefined ? client.advance_surplus : Math.max(0, advance - invoiceDue));

                                        return (
                                            <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-5 py-4 font-medium text-gray-400">
                                                    {clientDues.from ? clientDues.from + idx : idx + 1}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[13px] font-extrabold uppercase shadow-sm">
                                                            {(client.name || '?').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-[14px]">{client.name}</div>
                                                            <div className="text-[11.5px] font-medium text-gray-500 mt-0.5 flex items-center gap-2">
                                                                {client.company_name ? (
                                                                    <span className="flex items-center gap-1"><i className="fa-regular fa-building opacity-70"></i> {client.company_name}</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1"><i className="fa-regular fa-user opacity-70"></i> Individual</span>
                                                                )}
                                                                {client.phone && (
                                                                    <>
                                                                        <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                                                                        <span className="flex items-center gap-1"><i className="fa-solid fa-phone opacity-70"></i> {client.phone}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors">
                                                    <span className="font-bold text-blue-700 tabular-nums">
                                                        {invoiced > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 opacity-60"></i>{invoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</> : <span className="text-gray-300">-</span>}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                                    <span className="font-bold text-emerald-600 tabular-nums">
                                                        {paid > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 opacity-60"></i>{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</> : <span className="text-gray-300">-</span>}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right bg-amber-50/20 group-hover:bg-amber-50/40 transition-colors">
                                                    <span className="font-bold text-amber-700 tabular-nums">
                                                        {invoiceDue > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 opacity-60"></i>{invoiceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</> : <span className="text-gray-300">-</span>}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right bg-purple-50/20 group-hover:bg-purple-50/40 transition-colors tabular-nums">
                                                    {advance > 0 ? (
                                                        <span className="inline-flex items-center font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                                                            <i className="fa-solid fa-bangladeshi-taka-sign text-[10.5px] mr-1 opacity-70"></i>
                                                            {advance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors border-r border-gray-100">
                                                    {netDue > 0 ? (
                                                        <div>
                                                            <span className="font-black text-[15px] text-rose-600 tabular-nums">
                                                                <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1 opacity-80"></i>
                                                                {netDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            {advance > 0 && (
                                                                <span className="block text-[10px] font-semibold text-purple-600 mt-0.5">
                                                                    (-৳{advance.toLocaleString('en-IN')} adv)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : advanceSurplus > 0 ? (
                                                        <span className="inline-flex items-center font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[11.5px]">
                                                            ৳{advanceSurplus.toLocaleString('en-IN')} Surplus
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center font-bold text-emerald-600 text-[12px]">
                                                            <i className="fa-solid fa-check mr-1 text-[11px]"></i> Settled
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-center no-print">
                                                    <Link
                                                        href={route('admin.reports.client-ledger', { client_id: client.id })}
                                                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-[12px] font-bold transition-all shadow-xs group/btn"
                                                        title="View full statement for this client"
                                                    >
                                                        <i className="fa-solid fa-arrow-up-right-from-square transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"></i> Ledger
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clientDues?.links && clientDues.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {clientDues.total > 0 && `Showing ${clientDues.from || 0} to ${clientDues.to || 0} of ${clientDues.total || 0} clients`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {clientDues.links.map((link, index) => {
                                    let labelHtml = link.label.replace("&laquo;", "«").replace("&raquo;", "»");
                                    if (link.label.includes("Previous")) labelHtml = '<i class="fa-solid fa-chevron-left text-[10px]"></i>';
                                    if (link.label.includes("Next")) labelHtml = '<i class="fa-solid fa-chevron-right text-[10px]"></i>';

                                    return link.url ? (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            preserveState
                                            preserveScroll
                                            className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                                            dangerouslySetInnerHTML={{ __html: labelHtml }}
                                        />
                                    ) : (
                                        <span
                                            key={index}
                                            className="flex min-w-[36px] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[13px] font-bold text-gray-400 cursor-not-allowed"
                                            dangerouslySetInnerHTML={{ __html: labelHtml }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

