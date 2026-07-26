import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function VendorDues({ vendorDues, grandTotal, grandTotalAdvance }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || ""
    );
    const [perPage, setPerPage] = useState(
        () => Number(new URLSearchParams(window.location.search).get("per_page")) || 10
    );
    const isFirstRender = useRef(true);

    const vendorsList = vendorDues?.data || [];

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            router.get(
                route("admin.vendor-dues"),
                { search: searchTerm, per_page: perPage },
                { preserveState: true, replace: true }
            );
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    /* =========================================
       EXPORT FUNCTIONS (Copy, CSV, Print)
    ========================================= */
    const handleCopy = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to copy", "warning");

        const header = "SL\tVendor Name\tStatus\tTotal Due (Payable)\tAdvance (Wallet Balance)\n";
        const text = vendorsList
            .map((vendor, idx) => `${(vendorDues.from || 1) + idx}\t${vendor.vendor_name}\t${vendor.total_due > 0 ? 'Payable' : (vendor.wallet_balance > 0 ? 'Advance Given' : 'Clear')}\tTK. ${parseFloat(vendor.total_due || 0).toFixed(2)}\tTK. ${parseFloat(vendor.wallet_balance || 0).toFixed(2)}`)
            .join("\n");

        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!vendorsList.length) return Swal.fire("Empty!", "No data to export", "warning");

        const headers = ["SL,Vendor Name,Status,Total Due (Payable),Advance (Wallet Balance)\n"];
        const rows = vendorsList.map((vendor, idx) =>
            `"${(vendorDues.from || 1) + idx}","${vendor.vendor_name}","${vendor.total_due > 0 ? 'Payable' : (vendor.wallet_balance > 0 ? 'Advance Given' : 'Clear')}","${vendor.total_due || 0}","${vendor.wallet_balance || 0}"`
        );

        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Vendor_Dues_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-vendor-dues-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Vendor Dues & Advance Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        .summary { display: flex; justify-content: space-around; margin-bottom: 20px; font-weight: bold; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }

                        /* Add a Serial Number column visually only for print */
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }

                        th:nth-last-child(2), td:nth-last-child(2) { text-align: right !important; color: #d97706; font-weight: bold; }
                        th:last-child, td:last-child { text-align: right !important; color: #7e22ce; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>Accounts Payable & Vendor Advances</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    <div class="summary">
                        <span style="color: #d97706;">Total Payable (দেনা): TK. ${Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span style="color: #7e22ce;">Total Advance (জমা): TK. ${Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
            <Head title="Vendor Dues Report" />

            <div className="flex flex-col gap-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Accounts Payable</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Track and manage vendor dues, payables, and advances.</p>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Card 1: Total Vendors */}
                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <i className="fa-solid fa-store text-[20px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Vendors</p>
                            <h3 className="text-[22px] font-extrabold text-gray-900 m-0">{vendorDues?.total || 0}</h3>
                        </div>
                    </div>

                    {/* Card 2: Total Payable */}
                    <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <i className="fa-solid fa-file-invoice-dollar text-[18px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-600">Total Payable Amount (দেনা)</p>
                            <h3 className="text-[22px] font-extrabold text-amber-700 m-0">TK. {Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    {/* Card 3: Total Advance */}
                    <div className="flex items-center gap-4 rounded-xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                            <i className="fa-solid fa-wallet text-[18px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-purple-600">Total Advance in Wallets (জমা)</p>
                            <h3 className="text-[22px] font-extrabold text-purple-700 m-0">TK. {Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-hand-holding-dollar text-[var(--accent)]"></i> Vendor Dues & Advance List
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
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
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

                        {/* Search Box */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search vendor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-vendor-dues-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4">Vendor Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Total Due (Payable)</th>
                                    <th className="px-6 py-4 text-right">Advance (Wallet)</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {vendorsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-check-double text-4xl text-gray-300 mb-3"></i>
                                                <p>No due or advance records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    vendorsList.map((vendor, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 text-[14.5px] flex items-center gap-2">
                                                    <i className="fa-solid fa-store text-gray-400"></i>
                                                    {vendor.vendor_name}
                                                </div>
                                                {vendor.company_name && (
                                                    <div className="text-[12px] text-gray-500 mt-1 pl-6">
                                                        {vendor.company_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vendor.total_due > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-[10.5px] font-bold uppercase tracking-wider text-orange-600 border border-orange-200">
                                                        Payable
                                                    </span>
                                                ) : vendor.wallet_balance > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-[10.5px] font-bold uppercase tracking-wider text-purple-600 border border-purple-200">
                                                        Advance Given
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 border border-gray-200">
                                                        Clear
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-amber-600 text-[14.5px]">
                                                TK. {parseFloat(vendor.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-purple-600 text-[14.5px]">
                                                TK. {parseFloat(vendor.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {vendorDues?.links && vendorDues.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {vendorDues.total > 0 && `Showing ${vendorDues.from || 0} to ${vendorDues.to || 0} of ${vendorDues.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {vendorDues.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
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
