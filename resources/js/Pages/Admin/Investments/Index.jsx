import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link , usePage} from '@inertiajs/react';
import Swal from 'sweetalert2'; 

export default function Index({ investments = {}, accounts = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const investmentList = investments.data || [];
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const [perPage, setPerPage] = useState(() => {
        return new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        account_id: '', 
        amount: '', 
        investor_name: '', 
        investment_date: '', 
        purpose: 'Office Purpose', 
        notes: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.investments.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = investmentList
            .map((inv, idx) => `${idx + 1}\t${inv.investor_name}\t${inv.investment_date}\t${inv.purpose}\t$${parseFloat(inv.amount).toFixed(2)}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Investor Name,Date,Purpose,Account,Amount\n"];
        const rows = investmentList.map((inv, idx) => {
            const accountName = inv.account ? inv.account.name : 'N/A';
            return `"${idx + 1}","${inv.investor_name}","${inv.investment_date}","${inv.purpose}","${accountName}","${inv.amount}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Investment_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-investment-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Capital & Investments Report</title>
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
                    <h2>Capital & Investments Directory</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            account_id: '',
            amount: 0,
            investor_name: '',
            investment_date: new Date().toISOString().slice(0, 10),
            purpose: '',
            notes: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (inv) => {
        clearErrors(); 
        setData({
            id: inv.id,
            account_id: inv.account_id || '',
            amount: inv.amount,
            investor_name: inv.investor_name,
            investment_date: inv.investment_date,
            purpose: inv.purpose || 'Office Purpose',
            notes: inv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.investments.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Investment updated successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.investments.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Logged!', text: 'New investment added successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This investment record will be permanently deleted and account balance will be updated!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.investments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record has been removed.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const totalInvestment = investmentList.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Investments Management" />
            
            <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Investments Management</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Track and manage asset allocations, seed funding, and corporate capitals.</p>
                    </div>
                    
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f766e', padding: '12px 20px', background: '#f0fdfa', borderRadius: '8px', border: "1px solid #ccfbf1", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                        <i className="fa-solid fa-chart-line" style={{ marginRight: "8px", color: "#0d9488" }}></i>
                        Page Total: <span style={{ fontSize: "1.2rem" }}>${totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Main Card Container */}
                <div style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-money-bill-trend-up" style={{ marginRight: "8px", color: "#2563eb" }}></i> Capital & Investments Directory
                        </div>
                        {hasPermission('create_investment') && (
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)" }}>
                            <i className="fa-solid fa-plus"></i> Log Investment
                        </button>
                        )}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> Excel
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input 
                                type="text" 
                                placeholder="Search investor or purpose..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-investment-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>INVESTOR NAME</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>INVESTMENT DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>PURPOSE TARGET</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center", width: "120px" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {investmentList.length > 0 ? (
                                    investmentList.map((inv, index) => (
                                        <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {(investments.current_page - 1) * investments.per_page + index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{inv.investor_name}</div>
                                                {inv.account && (
                                                    <div style={{ fontSize: "0.75rem", color: "#6366f1", marginTop: "4px", display: "inline-block", background: "#e0e7ff", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                                                        <i className="fa-solid fa-building-columns" style={{ marginRight: "4px" }}></i>
                                                        {inv.account.name}
                                                    </div>
                                                )}
                                                {inv.notes && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>{inv.notes}</div>}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{inv.investment_date}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                                                    background: inv.purpose === 'Work Purpose' ? '#e0f2fe' : inv.purpose === 'Office Purpose' ? '#dcfce7' : '#f1f5f9', 
                                                    color: inv.purpose === 'Work Purpose' ? '#0369a1' : inv.purpose === 'Office Purpose' ? '#15803d' : '#475569' 
                                                }}>
                                                    {inv.purpose}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0d9488' }}>
                                                Tk. {parseFloat(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    {hasPermission('edit_investment') && (
                                                    <button onClick={() => openEditModal(inv)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Record">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                    <button onClick={() => handleDelete(inv.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Record">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No investment records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexWrap: "wrap", gap: "16px" }}>
                        <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                            Showing <b>{investments.from || 0}</b> to <b>{investments.to || 0}</b> of <b>{investments.total || 0}</b> entries
                        </div>
                        {investments.links && investments.links.length > 3 && (
                            <div style={{ display: "flex", gap: "4px" }}>
                                {investments.links.map((link, i) => {
                                    return link.url === null ? (
                                        <span 
                                            key={i} 
                                            style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#cbd5e1", fontSize: "0.85rem", cursor: "not-allowed", background: "#fff" }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            preserveState
                                            style={{
                                                padding: "8px 14px",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "6px",
                                                fontSize: "0.85rem",
                                                textDecoration: "none",
                                                fontWeight: link.active ? "700" : "500",
                                                background: link.active ? "#2563eb" : "#ffffff",
                                                color: link.active ? "#ffffff" : "#475569",
                                                boxShadow: link.active ? "0 2px 4px rgba(37, 99, 235, 0.2)" : "none"
                                            }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL SECTION --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "750px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? '📝 Edit Investment Info' : '✨ Log New Investment'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            {/* 1st Row: Investor Name and Select Account */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Investor Name *</label>
                                    <input 
                                        type="text" 
                                        value={data.investor_name} 
                                        onChange={e => setData('investor_name', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "500" }}
                                        placeholder="e.g., John Doe" 
                                        required
                                    />
                                    {errors.investor_name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.investor_name}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Deposit To Account *</label>
                                    <select 
                                        value={data.account_id} 
                                        onChange={e => setData('account_id', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", color: "#334155", height: "42px" }}
                                        required
                                    >
                                        <option value="">-- Select Account --</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Balance: {parseFloat(acc.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.account_id}</p>}
                                </div>
                            </div>

                            {/* 2nd Row: Amount and Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount ($) *</label>
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

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Investment Date *</label>
                                    <input 
                                        type="date" 
                                        value={data.investment_date} 
                                        onChange={e => setData('investment_date', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155", height: "42px" }}
                                        required
                                    />
                                    {errors.investment_date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.investment_date}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Purpose *</label>
                                    <select 
                                        value={data.purpose} 
                                        onChange={e => setData('purpose', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", color: "#334155", height: "42px" }}
                                    >
                                        <option value="Office Purpose">Office Purpose</option>
                                        <option value="Work Purpose">Work Purpose</option>
                                        <option value="Other Purpose">Other Purpose</option>
                                    </select>
                                    {errors.purpose && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.purpose}</p>}
                                </div>
                            </div>

                            <div style={{ flexDirection: "column", display: "flex", marginBottom: "20px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Notes</label>
                                <textarea 
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)} 
                                    rows="3"
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", resize: "none" }}
                                    placeholder="Any additional funding details..." 
                                ></textarea>
                                {errors.notes && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.notes}</p>}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? 'Saving...' : 'Save Investment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}