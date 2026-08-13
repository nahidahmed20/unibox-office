import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function ClientDues({ clientDues, filters, grandTotalDue = 0 }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Filters States
    const [searchTerm, setSearchTerm] = useState(filters?.search || "");
    const [perPage, setPerPage] = useState(filters?.per_page || "10");
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
            if (perPage !== "10" && perPage !== 10) params.per_page = perPage;

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
    const handleCopy = () => {
        if (!clients.length) return Swal.fire("Empty!", "No data to copy", "warning");

        const header = "SL\tClient Name\tEmail\tPhone\tCompany\tAvail. Advance\tTotal Due\n";
        const text = clients
            .map((c, idx) => `${idx + 1}\t${c.name}\t${c.email}\t${c.phone || "N/A"}\t${c.company_name || "Individual"}\tTK. ${parseFloat(c.available_advance || 0).toFixed(2)}\tTK. ${parseFloat(c.total_due || 0).toFixed(2)}`)
            .join("\n");

        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!clients.length) return Swal.fire("Empty!", "No data to export", "warning");

        const headers = ["SL,Client Name,Email,Phone,Company,Available Advance,Total Due\n"];
        const rows = clients.map((c, idx) =>
            `"${idx + 1}","${c.name}","${c.email}","${c.phone || "N/A"}","${c.company_name || "Individual"}","${c.available_advance}","${c.total_due}"`
        );

        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Client_Dues_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-client-dues-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Client Dues Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }

                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }

                        th:last-child, td:last-child { text-align: right !important; color: #dc2626; font-weight: bold; }
                        th:nth-last-child(2), td:nth-last-child(2) { text-align: right !important; color: #16a34a; }
                    </style>
                </head>
                <body>
                    <h2>Accounts Receivable - Client Dues</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
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
            <Head title="Client Dues Report" />

            <div className="flex flex-col gap-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Accounts Receivable</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Track and manage outstanding client dues and advances.</p>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <i className="fa-solid fa-users text-[20px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Clients Listed</p>
                            <h3 className="text-[22px] font-extrabold text-gray-900 m-0">{clientDues?.total || 0}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <i className="fa-solid fa-file-invoice-dollar text-[18px]"></i>
                        </div>
                        <div>
                            {/* 🟢 Updated Text */}
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-500">Total Due Amount</p>
                            <h3 className="text-[22px] font-extrabold text-red-700 m-0">
                                <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] mr-1 text-red-400"></i>
                                {Number(grandTotalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> Client Dues List
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">

                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value)}
                                    className="w-[100px] appearance-none text-center bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value="10">10 Entries</option>
                                    <option value="25">25 Entries</option>
                                    <option value="50">50 Entries</option>
                                    <option value="100">100 Entries</option>
                                    <option value="all">All Entries</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-client-dues-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4">Client Name</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Company</th>
                                    <th className="px-6 py-4 text-right">Available Advance</th>
                                    <th className="px-6 py-4 text-right">Total Due</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-check-double text-4xl text-gray-300 mb-3"></i>
                                                <p>No due records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    clients.map((client, idx) => (
                                        <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {client.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-blue-600 mb-0.5">{client.email}</div>
                                                <div className="text-[12px] text-gray-500 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-phone"></i> {client.phone || "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-600 border border-gray-200">
                                                    {client.company_name || "Individual"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 text-[14.5px]">
                                                {parseFloat(client.available_advance || 0) > 0 ? (
                                                    <><i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-0.5"></i>{parseFloat(client.available_advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 text-[14.5px]">
                                                {(() => {
                                                    const invoiced = parseFloat(client.total_invoiced || 0);
                                                    const paid = parseFloat(client.total_paid || 0);
                                                    const due = invoiced - paid;

                                                    return due > 0 ? (
                                                        <><i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-0.5"></i>{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
                                                    ) : '-';
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clientDues?.links && clientDues.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {clientDues.total > 0 && `Showing ${clientDues.from || 0} to ${clientDues.to || 0} of ${clientDues.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {clientDues.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
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
        </AdminLayout>
    );
}