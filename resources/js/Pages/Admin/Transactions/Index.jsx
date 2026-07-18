import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ transactions = { data: [], links: [] }, accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        account_id: '',
        type: 'credit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: ''
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
            if (perPage !== 25) params.per_page = perPage;

            router.get(
                route('admin.transactions.index'), 
                params, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const trxList = transactions.data || [];

    const handleCopy = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = trxList
            .map((t) => `${t.transaction_date}\t${t.account?.name || "N/A"}\t${t.description}\t${t.type?.toUpperCase()}\t${t.amount}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Description,Reference,Type,Amount\n"];
        const rows = trxList.map(t => `"${t.transaction_date}","${t.account?.name || ''}","${t.description}","${t.reference_number || ''}","${t.type}","${t.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction Ledger Report</title>
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
                    <h2>Transaction Ledger Report</h2>
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
        clearErrors();

        setData({
            id: '',
            account_id: '',
            type: 'credit', 
            amount: 0,
            transaction_date: new Date().toISOString().slice(0, 10),
            reference_number: '',
            description: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (trx) => {
        clearErrors();
        setData({
            id: trx.id,
            account_id: trx.account_id || '',
            type: trx.type || 'credit',
            amount: trx.amount || '',
            transaction_date: trx.transaction_date || '',
            description: trx.description || '',
            reference_number: trx.reference_number || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (trx) => {
        setSelectedTrx(trx);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.transactions.update', data.id), { 
                onSuccess: () => { 
                    setShowModal(false); 
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.transactions.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: "success", title: "Logged Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This will reverse the amount in your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.transactions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Transaction removed and balance restored.", timer: 1500, showConfirmButton: false }),
                    onError: () => Swal.fire({ icon: "error", title: "Error!", text: "Cannot delete auto-generated transactions.", confirmButtonColor: '#3b82f6' })
                });
            }
        });
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
            <Head title="Transactions Ledger" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Transaction Ledger</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Monitor all cash inflows and outflows across your accounts.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-money-bill-transfer" style={{ marginRight: "8px", color: "#3b82f6" }}></i> All Transactions
                        </div>
                        {hasPermission('create_requisition') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Manual Entry
                        </button>
                        )}
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
                            <input type="text" placeholder="Search description/ref..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ACCOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DESCRIPTION & REF</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>TYPE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT (IN/OUT)</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {trxList.length > 0 ? (
                                    trxList.map((trx, index) => (
                                        <tr key={trx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {transactions.from ? transactions.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#64748b" }}>{trx.transaction_date}</td>
                                            <td style={{ padding: "16px 24px", fontWeight: '600', color: '#0f172a' }}>{trx.account?.name || 'Deleted Account'}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ color: '#1f2937', fontWeight: '500' }}>{trx.description}</div>
                                                {trx.reference_number && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}><i className="fa-solid fa-hashtag me-1"></i> {trx.reference_number}</div>}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600",
                                                    background: trx.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                                    color: trx.type === 'credit' ? '#15803d' : '#b91c1c'
                                                }}>
                                                    {trx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: trx.type === 'credit' ? '#16a34a' : '#dc2626' }}>
                                                {trx.type === 'credit' ? '+' : '-'}TK. {parseFloat(trx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    {hasPermission('view_transaction') && (
                                                    <button onClick={() => openViewModal(trx)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {!trx.transactionable_id ? (
                                                        <>
                                                        {hasPermission('edit_transaction') && (
                                                            <button onClick={() => openEditModal(trx)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                                <i className="fa-regular fa-pen-to-square"></i>
                                                            </button>
                                                            )}
                                                            {hasPermission('delete_transaction') && (
                                                            <button onClick={() => handleDelete(trx.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                                <i className="fa-regular fa-trash-can"></i>
                                                            </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span style={{ display: "inline-block", padding: "6px", color: "#94a3b8", fontSize: "0.75rem", fontWeight: "bold" }}>AUTO</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No transactions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {transactions.total > 0 && `Showing ${transactions.from || 0} to ${transactions.to || 0} of ${transactions.total || 0} entries`}
                            </div>

                            {transactions.links && transactions.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {transactions.links.map((link, index) => (
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
            {showViewModal && selectedTrx && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "550px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-receipt" style={{ marginRight: "8px", color: "#2563eb" }}></i> Transaction Receipt
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                <div style={{ fontSize: "2rem", fontWeight: "800", color: selectedTrx.type === 'credit' ? '#16a34a' : '#dc2626' }}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'} TK. {parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                                <span style={{ background: selectedTrx.type === 'credit' ? '#dcfce7' : '#fee2e2', color: selectedTrx.type === 'credit' ? '#15803d' : '#b91c1c', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "8px", display: "inline-block" }}>
                                    {selectedTrx.type === 'credit' ? 'Successful Deposit' : 'Successful Withdrawal'}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Account</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-building-columns text-purple-500" style={{ marginRight: "6px" }}></i>{selectedTrx.account?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Transaction Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedTrx.transaction_date || "-"}</div>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Description</span>
                                    <div style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a" }}>{selectedTrx.description}</div>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Reference Number</span>
                                    <div style={{ fontWeight: "500", color: "#475569" }}>{selectedTrx.reference_number || "No reference attached"}</div>
                                </div>
                            </div>
                            
                            {selectedTrx.transactionable_id && (
                                <div style={{ background: "#fef3c7", border: "1px solid #fde047", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", color: "#92400e", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <i className="fa-solid fa-circle-info"></i> This is an auto-generated system transaction and cannot be modified.
                                </div>
                            )}

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Manual Transaction" : "✨ Manual Transaction Entry"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Account *</label>
                                    <Select
                                        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` }))}
                                        value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                        onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                        placeholder="Choose Account" isSearchable isClearable styles={selectStyles}
                                    />
                                    {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Transaction Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required>
                                        <option value="credit">Deposit / In (Credit)</option>
                                        <option value="debit">Withdrawal / Out (Debit)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={e => setData('amount', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: '600' }} placeholder="0.00" required />
                                    {errors.amount && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.amount}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                    <input type="date" value={data.transaction_date} onChange={e => setData('transaction_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                </div>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Description / Reason *</label>
                                <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="e.g. Added capital, Bank charge" required />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Reference Number (Optional)</label>
                                <input type="text" value={data.reference_number} onChange={e => setData('reference_number', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="Cheque No, Txn ID, etc." />
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Processing..." : (editMode ? "Update Entry" : "Submit Entry")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}