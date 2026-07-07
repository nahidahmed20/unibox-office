import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ advances = [], filters = {} }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // পেজিনেটেড অবজেক্ট বা নরমাল অ্যারে থেকে ডেটা বের করা
    const advanceList = Array.isArray(advances) ? advances : (advances.data || []);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const [perPage, setPerPage] = useState(() => {
        return new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        given_to: '', 
        amount: '', 
        date: '', 
        purpose: 'Office Purpose', 
        status: 'unsettled',
        notes: ''
    });

    // --- Live Search & Per Page Change ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.advances.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Utilities ---
    const handleCopy = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = advanceList
            .map((adv, idx) => `${idx + 1}\t${adv.date}\t${adv.given_to}\t${adv.purpose}\t${adv.status}\tBDT ${parseFloat(adv.amount).toFixed(2)}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Given To,Date,Purpose,Status,Amount\n"];
        const rows = advanceList.map((adv, idx) => `"${idx + 1}","${adv.given_to}","${adv.date}","${adv.purpose}","${adv.status}","${adv.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Advance_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-advance-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Advance Payments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Advance Payments Directory</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modal Management ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors(); 
        setData({
            id: adv.id,
            given_to: adv.given_to,
            amount: adv.amount,
            date: adv.date,
            purpose: adv.purpose || 'Office Purpose',
            status: adv.status || 'unsettled',
            notes: adv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.advances.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Advance record updated successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.advances.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Logged!', text: 'New advance payment logged.', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This advance record will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record has been removed.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const totalUnsettled = advanceList.filter(a => a.status === 'unsettled').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            
            <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Advance Payments</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Dashboard / Finance / Advances</p>
                    </div>
                    
                    {/* Total Unsettled Badge */}
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#b91c1c', padding: '12px 20px', background: '#fee2e2', borderRadius: '8px', border: "1px solid #fecaca", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "8px", color: "#dc2626" }}></i>
                        Total Unsettled: <span style={{ fontSize: "1.2rem" }}>BDT {totalUnsettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Main Card Container */}
                <div style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-hand-holding-dollar" style={{ marginRight: "8px", color: "#2563eb" }}></i> Employee & Vendor Advances
                        </div>
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)" }}>
                            <i className="fa-solid fa-plus"></i> Log Advance
                        </button>
                    </div>

                    {/* Toolbar Panel */}
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        
                        {/* Dynamic Per Page Selector */}
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        {/* Export Action Tools */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={() => handleExportCSV('excel')} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> Excel
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        {/* Search Component */}
                        <div style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input 
                                type="text" 
                                placeholder="Search name or purpose..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }}
                            />
                        </div>
                    </div>

                    {/* Main Data Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-advance-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>GIVEN TO</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>PURPOSE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center", width: "120px" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {advanceList.length > 0 ? (
                                    advanceList.map((adv, index) => (
                                        <tr key={adv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {advances.current_page ? (advances.current_page - 1) * advances.per_page + index + 1 : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{adv.date}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{adv.given_to}</div>
                                                {adv.notes && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{adv.notes}</div>}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{adv.purpose || 'N/A'}</td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0f766e' }}>
                                                BDT {parseFloat(adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize',
                                                    background: adv.status === 'settled' ? '#dcfce7' : '#fee2e2', 
                                                    color: adv.status === 'settled' ? '#15803d' : '#b91c1c' 
                                                }}>
                                                    {adv.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    <button onClick={() => openEditModal(adv)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Record">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(adv.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Record">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No advance records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {advances.links && advances.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexWrap: "wrap", gap: "16px" }}>
                            <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                                Showing <b>{advances.from || 0}</b> to <b>{advances.to || 0}</b> of <b>{advances.total || 0}</b> entries
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                                {advances.links.map((link, i) => (
                                    link.url === null ? (
                                        <span key={i} style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#cbd5e1", fontSize: "0.85rem", cursor: "not-allowed", background: "#fff" }} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ) : (
                                        <Link key={i} href={link.url} preserveState style={{ padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", textDecoration: "none", fontWeight: link.active ? "700" : "500", background: link.active ? "#2563eb" : "#ffffff", color: link.active ? "#ffffff" : "#475569", boxShadow: link.active ? "0 2px 4px rgba(37, 99, 235, 0.2)" : "none" }} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL SECTION --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        
                        {/* Modal Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? '📝 Edit Advance Info' : '✨ Log Advance Payment'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Given To (Name) *</label>
                                    <input 
                                        type="text" 
                                        value={data.given_to} 
                                        onChange={e => setData('given_to', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "500" }}
                                        placeholder="e.g., John Doe" 
                                        required
                                    />
                                    {errors.given_to && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.given_to}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (BDT) *</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.amount} 
                                        onChange={e => setData('amount', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "700" }}
                                        placeholder="0.00" 
                                        required
                                    />
                                    {errors.amount && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.amount}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                    <input 
                                        type="date" 
                                        value={data.date} 
                                        onChange={e => setData('date', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }}
                                        required
                                    />
                                    {errors.date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.date}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Purpose</label>
                                    <input 
                                        type="text" 
                                        value={data.purpose} 
                                        onChange={e => setData('purpose', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                                        placeholder="e.g. Office Shopping" 
                                    />
                                    {errors.purpose && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.purpose}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Status</label>
                                    <select 
                                        value={data.status} 
                                        onChange={e => setData('status', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", color: "#334155", height: "38px" }}
                                    >
                                        <option value="unsettled">Unsettled (Not adjusted)</option>
                                        <option value="settled">Settled (Bill Submitted)</option>
                                    </select>
                                    {errors.status && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.status}</p>}
                                </div>
                                
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Notes</label>
                                    <textarea 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        rows="1"
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", resize: "none" }}
                                        placeholder="Additional details..." 
                                    ></textarea>
                                    {errors.notes && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.notes}</p>}
                                </div>
                            </div>

                            {/* Modal Footer Control */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}