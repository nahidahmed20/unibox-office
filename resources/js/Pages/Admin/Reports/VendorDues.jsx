import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link } from "@inertiajs/react";
import Swal from "sweetalert2";

// এখানে 'grandTotalAdvance' প্রপস হিসেবে রিসিভ করা হলো
export default function VendorDues({ vendorDues, grandTotal, grandTotalAdvance }) {
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
        }, 500);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

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
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        .summary { display: flex; justify-content: space-around; margin-bottom: 20px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }
                        
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }
                    </style>
                </head>
                <body>
                    <h2>Accounts Payable & Vendor Advances</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    <div class="summary">
                        <span style="color: #d97706;">Total Payable (দেনা): TK. ${Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span style="color: #7e22ce;">Total Advance in Wallets (জমা): TK. ${Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 className="page-title" style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Accounts Payable & Vendor Advances</h1>
                </div>
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Total Vendors</p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0' }}>{vendorDues?.total || 0}</h2>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', borderLeft: '5px solid #f59e0b' }}>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Total Payable Amount (দেনা)</p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706', margin: '0' }}>
                            TK. {Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                    {/* NEW: Advance Summary Card */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', borderLeft: '5px solid #a855f7' }}>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Total Advance in Wallets (জমা)</p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#7e22ce', margin: '0' }}>
                            TK. {Number(grandTotalAdvance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
                            <i className="fa-solid fa-hand-holding-dollar" style={{ color: "#f59e0b" }}></i> Vendor Dues & Advance List
                        </div>
                    </div>

                    {/* TOOLBAR */}
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                        
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer" }}
                            >
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        {/* EXPORT BUTTONS */}
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCopy} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-copy"></i> Copy</button>
                            <button onClick={handleExportCSV} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-excel text-green-600"></i> Excel</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-pdf text-red-600"></i> PDF</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-print text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <input
                                type="text"
                                placeholder="Search vendor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "240px", padding: "6px 12px", paddingLeft: "36px", fontSize: "0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-vendor-dues-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Vendor Name</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Total Due (দেনা)</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Advance / Wallet (জমা)</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155" }}>
                                {vendorsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No due or advance records found.</td>
                                    </tr>
                                ) : (
                                    vendorsList.map((vendor, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fdfdfd" }}>
                                            <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>
                                                <i className="fa-solid fa-store" style={{ color: "#94a3b8", marginRight: "8px" }}></i> 
                                                {vendor.vendor_name}
                                                {vendor.company_name && <span style={{display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px", marginLeft: "22px"}}>{vendor.company_name}</span>}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                {vendor.total_due > 0 ? (
                                                    <span style={{ background: "#ffedd5", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#9a3412", border: "1px solid #fdba74" }}>
                                                        Payable
                                                    </span>
                                                ) : vendor.wallet_balance > 0 ? (
                                                    <span style={{ background: "#f3e8ff", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#7e22ce", border: "1px solid #d8b4fe" }}>
                                                        Advance Given
                                                    </span>
                                                ) : (
                                                    <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                                        Clear
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#d97706', fontSize: "0.95rem" }}>
                                                TK. {parseFloat(vendor.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#7e22ce', fontSize: "0.95rem" }}>
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {vendorDues.from || 0} to {vendorDues.to || 0} of {vendorDues.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {vendorDues.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        style={{ 
                                            padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", 
                                            color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), 
                                            backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), 
                                            pointerEvents: link.url ? "auto" : "none", textDecoration: "none", 
                                            display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px" 
                                        }} 
                                        preserveState
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: link.label }}></span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}