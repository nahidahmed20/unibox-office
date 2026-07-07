import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ invoices = { data: [], links: [] }, clients = [], projects = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        client_id: '', 
        project_id: '', 
        invoice_number: '', 
        invoice_date: '', 
        due_date: '', 
        sub_total: 0, 
        tax: 0, 
        discount: 0, 
        grand_total: 0, 
        status: 'unpaid', 
        notes: ''
    });

    // --- Auto calculate grand total ---
    useEffect(() => {
        const sub = parseFloat(data.sub_total) || 0;
        const tx = parseFloat(data.tax) || 0;
        const disc = parseFloat(data.discount) || 0;
        const taxAmount = (sub * tx) / 100;
        setData('grand_total', (sub + taxAmount - disc).toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.sub_total, data.tax, data.discount]);

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) { 
            isFirstRender.current = false; 
            return; 
        }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route('admin.invoices.index'), params, { preserveState: true, replace: true }); 
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const invList = invoices.data || [];

    const handleCopy = () => {
        if (!invList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = invList
            .map((i) => `${i.invoice_number}\t${i.client?.name || "N/A"}\t${i.invoice_date}\t${i.grand_total}\t${i.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!invList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Invoice No,Client,Project,Date,Due Date,Amount,Status\n"];
        const rows = invList.map(i => `"${i.invoice_number}","${i.client?.name || ''}","${i.project?.title || ''}","${i.invoice_date}","${i.due_date}","${i.grand_total}","${i.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoices List Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; } /* Hide Actions */
                    </style>
                </head>
                <body>
                    <h2>Invoices Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => { 
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true); 
    };
    
    const openEditModal = (inv) => {
        clearErrors(); 
        setData({ 
            id: inv.id,
            client_id: inv.client_id || '',
            project_id: inv.project_id || '',
            invoice_number: inv.invoice_number || '',
            invoice_date: inv.invoice_date || '',
            due_date: inv.due_date || '',
            sub_total: inv.sub_total || 0,
            tax: inv.tax || 0,
            discount: inv.discount || 0,
            grand_total: inv.grand_total || 0,
            status: inv.status || 'unpaid',
            notes: inv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openViewModal = (inv) => {
        setSelectedInvoice(inv);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.invoices.update', data.id), { 
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Invoice updated successfully.', timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.invoices.store'), { 
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Created!', text: 'Invoice generated successfully.', timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Invoice?', text: 'This action cannot be undone!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete It' })
        .then((res) => { if (res.isConfirmed) destroy(route('admin.invoices.destroy', id), { preserveScroll: true }); });
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: "bg-emerald-100 text-emerald-800 border border-emerald-300",
            unpaid: "bg-slate-100 text-slate-800 border border-slate-300",
            partially_paid: "bg-amber-100 text-amber-800 border border-amber-300",
            overdue: "bg-red-100 text-red-800 border border-red-300"
        };
        return styles[status] || "bg-gray-100 text-gray-800";
    };

    // React-Select Custom Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "38px", borderRadius: "6px",
            border: state.isFocused ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
            "&:hover": { borderColor: "#94a3b8" },
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 8px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "0.875rem" }),
        singleValue: (provided) => ({ ...provided, color: "#1e293b", fontSize: "0.875rem" }),
        option: (provided, state) => ({
            ...provided, fontSize: "0.875rem",
            backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff",
            color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer",
        }),
    };

    return (
        <AdminLayout>
            <Head title="Invoices" />
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Billing & Invoices</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage client invoices, track payments and generate receipts.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-file-invoice" style={{ marginRight: "8px", color: "#3b82f6" }}></i> All Invoices
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Generate Invoice
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>INV #</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>CLIENT & PROJECT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATES</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {invList.length > 0 ? (
                                    invList.map((inv, index) => (
                                        <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {invoices.from ? invoices.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", fontWeight: '700', color: '#2563eb' }}>{inv.invoice_number}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{inv.client?.name || 'N/A'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}><i className="fa-solid fa-diagram-project me-1"></i> {inv.project?.title || "No Project"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontSize: '0.85rem', color: '#334155' }}>Issue: {inv.invoice_date}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: '2px' }}>Due: {inv.due_date}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                                TK. {parseFloat(inv.grand_total).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <span className={getStatusBadge(inv.status)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }}>
                                                    {inv.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    {/* View Button */}
                                                    <button onClick={() => openViewModal(inv)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    {/* Print/Download Official PDF */}
                                                    <a href={route('admin.invoices.print', inv.id)} target="_blank" rel="noreferrer" style={{ background: "#fef2f2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#dc2626", textDecoration: "none" }} title="Print / PDF">
                                                        <i className="fa-solid fa-file-pdf"></i>
                                                    </a>
                                                    {/* Edit Button */}
                                                    <button onClick={() => openEditModal(inv)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Invoice">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    {/* Delete Button */}
                                                    <button onClick={() => handleDelete(inv.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Invoice">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No invoices found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {invoices.total > 0 && `Showing ${invoices.from || 0} to ${invoices.to || 0} of ${invoices.total || 0} entries`}
                            </div>

                            {invoices.links && invoices.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {invoices.links.map((link, index) => (
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
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedInvoice && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-file-invoice" style={{ marginRight: "8px", color: "#2563eb" }}></i> Invoice Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Invoice Number</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#2563eb" }}>#{selectedInvoice.invoice_number}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Status</span>
                                    <span className={getStatusBadge(selectedInvoice.status)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }}>
                                        {selectedInvoice.status.replace("_", " ")}
                                    </span>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Client Information</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-user-tie text-blue-500" style={{ marginRight: "6px" }}></i>{selectedInvoice.client?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Issue Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-indigo-500" style={{ marginRight: "6px" }}></i>{selectedInvoice.invoice_date || "-"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Due Date</span>
                                    <div style={{ color: "#dc2626", fontWeight: "600" }}><i className="fa-regular fa-calendar-xmark text-rose-500" style={{ marginRight: "6px" }}></i>{selectedInvoice.due_date || "-"}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Sub Total</span>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>TK. {parseFloat(selectedInvoice.sub_total).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Tax / Discount</span>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>T: {selectedInvoice.tax}% | D: TK. {parseFloat(selectedInvoice.discount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Grand Total</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>TK. {parseFloat(selectedInvoice.grand_total).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Invoice Notes</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    {selectedInvoice.notes || "No extra notes provided."}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <a href={route('admin.invoices.print', selectedInvoice.id)} target="_blank" rel="noreferrer" style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                    <i className="fa-solid fa-file-pdf"></i> Download PDF
                                </a>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "750px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Invoice" : "✨ Create New Invoice"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Invoice Number *</label>
                                    <input type="text" value={data.invoice_number} onChange={e => setData('invoice_number', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: 'bold' }} placeholder="INV-00001" required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Client *</label>
                                    <Select
                                        options={clients.map((c) => ({ value: c.id, label: c.name }))}
                                        value={clients.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.client_id)) || null}
                                        onChange={(selected) => setData("client_id", selected ? selected.value : "")}
                                        placeholder="Choose Client" isSearchable isClearable styles={selectStyles}
                                    />
                                    {errors.client_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.client_id}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Project (Optional)</label>
                                    <Select
                                        options={projects.map((p) => ({ value: p.id, label: p.title || p.name }))}
                                        value={projects.map((p) => ({ value: p.id, label: p.title || p.name })).find((opt) => Number(opt.value) === Number(data.project_id)) || null}
                                        onChange={(selected) => setData("project_id", selected ? selected.value : "")}
                                        placeholder="Choose Project" isSearchable isClearable styles={selectStyles}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Status *</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="partially_paid">Partially Paid</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Invoice Date *</label>
                                    <input type="date" value={data.invoice_date} onChange={e => setData('invoice_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Due Date *</label>
                                    <input type="date" value={data.due_date} onChange={e => setData('due_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Sub Total (BDT) *</label>
                                    <input type="number" step="0.01" value={data.sub_total} onChange={e => setData('sub_total', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: '600' }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Tax (%)</label>
                                    <input type="number" step="0.01" value={data.tax} onChange={e => setData('tax', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Discount (Fixed)</label>
                                    <input type="number" step="0.01" value={data.discount} onChange={e => setData('discount', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: "16px", textAlign: "right" }}>
                                <label style={{ fontSize: "1rem", fontWeight: "700", color: "#475569", marginRight: "10px" }}>Grand Total:</label>
                                <input type="text" value={data.grand_total} disabled style={{ width: "150px", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: '#dcfce7', fontWeight: 'bold', color: '#16a34a', textAlign: "right", fontSize: "1.1rem" }} />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Notes / Terms</label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="2" placeholder="Thank you for your business!"></textarea>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Processing..." : (editMode ? "Update Invoice" : "Generate Invoice")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}