import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function ClientDues({ clientDues, filters, grandTotalDue = 0 }) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || "");
    const [perPage, setPerPage] = useState(filters?.per_page || 10);
    const isFirstRender = useRef(true);

    const clients = clientDues?.data || [];
    
    // Calculates total due for the current page
    // const pageTotalDue = clients.reduce((sum, client) => sum + parseFloat(client.total_due || 0), 0);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route('admin.client-dues'), params, {
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
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }
                        
                        /* Add a Serial Number column visually only for print */
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }
                        
                        /* Ensure the Total Due column aligns to the right */
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
    /* ========================================= */

    return (
        <AdminLayout>
            <Head title="Client Dues Report" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 className="page-title" style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Accounts Receivable</h1>
                </div>
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Clients on this Page</p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0' }}>{clientDues?.total || 0}</h2>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', borderLeft: '5px solid #ef4444' }}>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>Page Total Receivable</p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626', margin: '0' }}>
                            TK. {Number(grandTotalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
                            <i className="fa-solid fa-file-invoice-dollar" style={{ color: "#3b82f6" }}></i> Client Dues List
                        </div>
                    </div>

                    {/* TOOLBAR */}
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer" }}
                            >
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                <option value="all">All Entries</option>
                            </select>
                        </div>

                        {/* EXPORT BUTTONS */}
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCopy} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-copy"></i> Copy</button>
                            <button onClick={handleExportCSV} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-excel" style={{ color: "#16a34a"}}></i> Excel</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-print" style={{ color: "#475569"}}></i> Print</button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "240px", padding: "6px 12px", paddingLeft: "36px", fontSize: "0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-client-dues-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem", minWidth: "800px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Client Name</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Contact Info</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Company</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Available Advance</th>
                                    <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Total Due</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155" }}>
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No due records found.</td>
                                    </tr>
                                ) : (
                                    clients.map((client, idx) => (
                                        <tr key={client.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fdfdfd" }}>
                                            <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>{client.name}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#3b82f6", marginBottom: "2px" }}>{client.email}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}><i className="fa-solid fa-phone" style={{marginRight: '4px'}}></i> {client.phone || "N/A"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                                                    {client.company_name || "Individual"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                                                TK. {parseFloat(client.available_advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#dc2626', fontSize: "0.95rem" }}>
                                                TK. {parseFloat(client.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {clientDues?.links && clientDues.links.length > 3 && (
                        <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                    {clientDues.total > 0 && `Showing ${clientDues.from || 0} to ${clientDues.to || 0} of ${clientDues.total || 0} entries`}
                                </div>
                                {clientDues.links && clientDues.links.length > 3 && (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        {clientDues.links.map((link, index) => (
                                            <Link 
                                                key={index} 
                                                href={link.url || "#"} 
                                                style={{ 
                                                    padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", 
                                                    color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), 
                                                    backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), 
                                                    pointerEvents: link.url ? "auto" : "none", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px"
                                                }} 
                                                preserveState
                                            >
                                                {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}