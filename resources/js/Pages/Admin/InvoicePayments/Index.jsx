import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ payments = {}, invoices = [], accounts = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || "",
    );
    const [perPage, setPerPage] = useState(
        () => Number(new URLSearchParams(window.location.search).get("per_page")) || 10,
    );

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const {
        data,
        setData,
        post,
        delete: destroy,
        reset,
        processing,
        errors,
        clearErrors,
    } = useForm({
        id: "",
        invoice_id: "",
        account_id: "",
        amount: "",
        payment_date: "",
        note: "",
        _method: "post",
    });

    useEffect(() => {
        isFirstRender.current = false;
    }, []);

    useEffect(() => {
        if (isFirstRender.current) return;
        const delay = setTimeout(() => {
            router.get(
                route("invoice-payments.index"),
                { search: searchTerm, per_page: perPage, page: 1 },
                { preserveState: true, replace: true },
            );
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => {
        const value = Number(e.target.value);
        setPerPage(value);
        router.get(
            route("invoice-payments.index"),
            { search: searchTerm, per_page: value, page: 1 },
            { preserveState: true, replace: true }
        );
    };

    /* =========================================
       EXPORT FUNCTIONS (Copy, CSV, Print)
    ========================================= */
    const handleCopy = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        
        const header = "SL\tDate\tInvoice\tClient\tAccount\tAmount\n";
        const text = paymentList
            .map((payment, idx) => `${idx + 1}\t${payment.payment_date}\tINV-00${payment.invoice_id}\t${payment.invoice?.client?.name || "N/A"}\t${payment.account?.name || "N/A"}\t৳${parseFloat(payment.amount).toFixed(2)}`)
            .join("\n");
            
        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        
        const headers = ["SL,Date,Invoice,Client,Account,Amount\n"];
        const rows = paymentList.map((payment, idx) => `"${idx + 1}","${payment.payment_date}","INV-00${payment.invoice_id}","${payment.invoice?.client?.name || "N/A"}","${payment.account?.name || "N/A"}","${payment.amount}"`);
        
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Payment_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-payment-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice Payments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }
                        
                        /* Hide the last column (Action buttons) during print */
                        th:last-child, td:last-child { display: none !important; }
                        
                        /* Add a Serial Number column visually only for print using CSS counters */
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }
                    </style>
                </head>
                <body>
                    <h2>Invoice Payments Directory</h2>
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

    const openCreateModal = () => {
        reset(); clearErrors(); setData("_method", "post"); setEditMode(false); setShowModal(true);
    };

    const openEditModal = (payment) => {
        clearErrors();
        setData({
            id: payment.id, invoice_id: payment.invoice_id, account_id: payment.account_id || "",
            amount: payment.amount, payment_date: payment.payment_date, note: payment.note || "", _method: "put",
        });
        setEditMode(true); setShowModal(true);
    };

    const openShowModal = (payment) => {
        setSelectedPayment(payment); setShowDetailsModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            onSuccess: () => {
                reset(); setShowModal(false);
                Swal.fire({ title: editMode ? "Updated!" : "Received!", text: editMode ? "Payment updated." : "Payment logged successfully.", icon: "success", confirmButtonColor: "#3b82f6" });
            },
            forceFormData: true,
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?", text: "This will reverse the amount from your account balance.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Yes, delete it!"
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("invoice-payments.destroy", id), { onSuccess: () => { Swal.fire("Deleted!", "Payment record removed.", "success"); } });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 className="page-title" style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Invoice Payments</h1>
                </div>

                <div className="card-container" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
                            <i className="fa-solid fa-money-bill-wave" style={{ color: "#3b82f6" }}></i> Payment History
                        </div>
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Receive Payment
                        </button>
                    </div>

                    {/* TOOLBAR */}
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                        
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={handlePerPageChange} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        {/* ATTACHED FUNCTIONS TO EXPORT BUTTONS */}
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCopy} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-copy"></i> Copy</button>
                            <button onClick={handleExportCSV} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-excel text-green-600"></i> Excel</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-pdf text-red-600"></i> PDF</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-print text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <input
                                type="text" placeholder="Search payments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "240px", padding: "6px 12px", paddingLeft: "36px", fontSize: "0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                        </div>
                    </div>

                    {/* ADDED ID: printable-payment-table HERE */}
                    <table id="printable-payment-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Date</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Invoice & Client</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Account</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Amount</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: "#334155" }}>
                            {paymentList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No payments found.</td>
                                </tr>
                            ) : (
                                paymentList.map((payment, idx) => (
                                    <tr key={payment.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fdfdfd" }}>
                                        <td style={{ padding: "16px 24px", fontWeight: "500" }}>{payment.payment_date}</td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontWeight: "600", color: "#2563eb", marginBottom: "2px" }}>INV-00{payment.invoice_id}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>{payment.invoice?.client?.name}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                                                {payment.account?.name || "N/A"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 24px", color: "#16a34a", fontWeight: "700", fontSize: "0.95rem" }}>৳ {payment.amount}</td>
                                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                <button onClick={() => openShowModal(payment)} style={{ border: "none", background: "#f0f5ff", color: "#2563eb", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-eye"></i></button>
                                                <button onClick={() => openEditModal(payment)} style={{ border: "none", background: "#fff7ed", color: "#ea580c", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(payment.id)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-trash-can"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* PAGINATION */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                                Showing <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.from || 0}</span> to <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.to || 0}</span> of <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.total || 0}</span> entries
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {payments.links.map((link, index) => (
                                    <button
                                        key={index} disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, { search: searchTerm, per_page: perPage }, { preserveState: true, replace: true })}
                                        style={{
                                            padding: '6px 12px', fontSize: '0.875rem', border: link.active ? '1px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px',
                                            background: link.active ? '#2563eb' : '#fff', color: link.active ? '#fff' : '#475569', cursor: link.url ? 'pointer' : 'not-allowed',
                                            opacity: link.url ? 1 : 0.6, fontWeight: link.active ? '600' : '500'
                                        }} dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>{editMode ? "✏️ Edit Payment Record" : "💰 Receive New Payment"}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Invoice *</label>
                                    <select value={data.invoice_id} onChange={(e) => setData("invoice_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} required>
                                        <option value="">-- Select Invoice --</option>
                                        {invoices.map((inv) => <option key={inv.id} value={inv.id}>INV-00{inv.id} ({inv.client?.name}) - ৳{inv.grand_total}</option>)}
                                    </select>
                                    {errors.invoice_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.invoice_id}</span>}
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Receive In (Account) *</label>
                                    <select value={data.account_id} onChange={(e) => setData("account_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} required>
                                        <option value="">-- Select Account --</option>
                                        {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} (Bal: ৳{acc.current_balance})</option>)}
                                    </select>
                                    {errors.account_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.account_id}</span>}
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (৳) *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} required />
                                    {errors.amount && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.amount}</span>}
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Date *</label>
                                    <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} required />
                                    {errors.payment_date && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.payment_date}</span>}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Note (Optional)</label>
                                <textarea value={data.note} onChange={(e) => setData("note", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} rows="2" />
                            </div>
                            <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>{processing ? "Saving..." : "Save Record"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {showDetailsModal && selectedPayment && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>📄 Payment Receipt</h3>
                            <button onClick={() => setShowDetailsModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Client Name:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.invoice?.client?.name}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Invoice Ref:</span><span style={{ color: "#2563eb", fontWeight: "700" }}>INV-00{selectedPayment.invoice_id}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Account Credited:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.account?.name}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Payment Date:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.payment_date}</span></div>
                                <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "8px", border: "1px solid #bbf7d0", marginTop: "12px", textAlign: "center" }}>
                                    <p style={{ color: "#166534", fontWeight: "600", margin: "0 0 4px 0", fontSize: "0.815rem", textTransform: "uppercase" }}>Total Received Amount</p>
                                    <p style={{ fontSize: "1.75rem", fontWeight: "800", color: "#16a34a", margin: 0 }}>৳ {selectedPayment.amount}</p>
                                </div>
                            </div>
                            <div style={{ marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowDetailsModal(false)} style={{ width: '100%', padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Close Receipt</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}