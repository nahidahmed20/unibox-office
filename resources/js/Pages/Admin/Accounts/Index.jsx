import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ accounts = { data: [], links: [] }, totalBalance }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '',
        type: 'cash',
        account_number: '',
        opening_balance: '',
        is_active: 1
    });

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(
                route('admin.accounts.index'), 
                params, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const accList = accounts.data || [];

    const handleCopy = () => {
        if (!accList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = accList
            .map((a) => `${a.name}\t${a.type}\t${a.account_number || "N/A"}\t${a.opening_balance}\t${a.current_balance}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!accList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Account Name,Type,A/C Number,Opening Balance,Current Balance,Status\n"];
        const rows = accList.map(a => `"${a.name}","${a.type}","${a.account_number || ''}","${a.opening_balance}","${a.current_balance}","${a.is_active ? 'Active' : 'Inactive'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Accounts_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Accounts & Balances Report</title>
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
                    <h2>Accounts & Balances Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Submits ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (acc) => {
        clearErrors(); 
        setData({
            id: acc.id, 
            name: acc.name || '',
            type: acc.type || 'cash',
            account_number: acc.account_number || '',
            opening_balance: acc.opening_balance || '',
            is_active: acc.is_active !== undefined ? acc.is_active : 1
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.accounts.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.accounts.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this account?',
            text: "You can only delete accounts with no transactions.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.accounts.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Account removed successfully.", timer: 1500, showConfirmButton: false }),
                    onError: () => Swal.fire({ icon: "error", title: "Error!", text: "Cannot delete account with existing transactions.", confirmButtonColor: '#3b82f6' })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Accounts & Balances" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Accounts Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage cash, bank and mobile banking accounts.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-vault" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Account List
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add Account
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
                            <input type="text" placeholder="Search account..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ACCOUNT NAME</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>TYPE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>A/C NUMBER</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>OPENING BAL.</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>CURRENT BAL.</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {accList.length > 0 ? (
                                    accList.map((acc, index) => (
                                        <tr key={acc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {accounts.from ? accounts.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", fontWeight: '600', color: '#0f172a' }}>{acc.name}</td>
                                            <td style={{ padding: "16px 24px", textTransform: 'capitalize' }}>
                                                <span style={{ 
                                                    padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600",
                                                    background: acc.type === 'cash' ? '#dcfce7' : (acc.type === 'bank' ? '#dbeafe' : '#f3e8ff'),
                                                    color: acc.type === 'cash' ? '#15803d' : (acc.type === 'bank' ? '#1d4ed8' : '#7e22ce')
                                                }}>
                                                    {acc.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{acc.account_number || '-'}</td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', color: '#64748b' }}>
                                                {parseFloat(acc.opening_balance).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: acc.current_balance < 0 ? '#dc2626' : '#16a34a' }}>
                                                {parseFloat(acc.current_balance).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <span style={{ color: acc.is_active ? '#15803d' : '#dc2626', fontWeight: '600', fontSize: '0.85rem' }}>
                                                    {acc.is_active ? '● Active' : '● Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    <button onClick={() => openEditModal(acc)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(acc.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No accounts found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination & Total Balance Section */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                            {/* Total Balance (Always Visible) */}
                            <div style={{ fontWeight: "700", color: "#15803d", fontSize: "1rem", background: "#dcfce7", padding: "8px 20px", borderRadius: "50px", border: "1px solid #bbf7d0" }}>
                                Total Net Balance: ৳ {Number(totalBalance ?? 0).toLocaleString('en-IN')}
                            </div>

                            {/* Pagination Links */}
                            {accounts.links && accounts.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {accounts.links.map((link, index) => (
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

                        {/* Showing Info (If Pagination exists) */}
                        {accounts.total > 0 && (
                            <div style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "12px", textAlign: "right" }}>
                                Showing {accounts.from || 0} to {accounts.to || 0} of {accounts.total || 0} entries
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Update Account" : "✨ Add New Account"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Account Name *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="e.g. Main Cash, DBBL Bank" required />
                                {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Account Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required>
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank Account</option>
                                        <option value="mobile_banking">Mobile Banking</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>A/C Number (Optional)</label>
                                    <input type="text" value={data.account_number} onChange={e => setData('account_number', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="If bank/mobile" />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Opening Balance</label>
                                    <input type="number" step="0.01" value={data.opening_balance} onChange={e => setData('opening_balance', e.target.value)} disabled={editMode} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: editMode ? "#f1f5f9" : "#fff" }} placeholder="0.00" />
                                    {editMode && <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>Opening balance cannot be edited later.</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Status</label>
                                    <select value={data.is_active} onChange={e => setData('is_active', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}>
                                        <option value={1}>Active</option>
                                        <option value={0}>Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving Changes..." : "Commit Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}