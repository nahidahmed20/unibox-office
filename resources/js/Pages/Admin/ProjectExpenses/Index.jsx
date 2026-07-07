import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], accounts = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        project_id: '',
        expense_category_id: '',
        account_id: '', 
        title: '', 
        vendor_name: '',
        total_bill: '',
        paid_amount: '',
        date: '',
        description: ''
    });

    // --- Auto Calculate Due & Status in UI ---
    const calculateDue = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        return (bill - paid).toFixed(2);
    };

    const calculateStatus = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        if (bill > 0 && paid >= bill) return 'PAID';
        if (paid > 0 && paid < bill) return 'PARTIAL';
        return 'DUE';
    };

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
                route('admin.project-expenses.index'), 
                params, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList
            .map((e) => `${e.date}\t${e.title}\t${e.vendor_name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Project,Expense Title,Vendor,Account,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.name || ''}","${e.title}","${e.vendor_name || ''}","${e.account?.name || ''}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Project Expenses Report</title>
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
                    <h2>Project Expenses & Payables</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors(); 
        setData({
            id: expense.id, 
            project_id: expense.project_id || '',
            expense_category_id: expense.expense_category_id || '',
            account_id: expense.account_id || '', 
            title: expense.title || '', 
            vendor_name: expense.vendor_name || '',
            total_bill: expense.total_bill || '',
            paid_amount: expense.paid_amount || '',
            date: expense.date || '',
            description: expense.description || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openViewModal = (expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    // --- Actions ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.project-expenses.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.project-expenses.store'), { 
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
            title: 'Delete this record?',
            text: "Paid amount will be refunded to your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.project-expenses.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed and balance restored.", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const getPaymentStatusBadge = (status) => {
        if (status === 'paid') return { bg: '#dcfce7', text: '#15803d' };
        if (status === 'partial') return { bg: '#fef08a', text: '#a16207' };
        return { bg: '#fee2e2', text: '#b91c1c' };
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

    const totalBilled = expList.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalDue = expList.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Project Expenses & Payables" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header & Summary */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Project Accounts Payable</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage vendor bills and track project costs.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', padding: '10px 16px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            Total Billed: <span style={{ fontSize: '16px' }}>BDT {totalBilled.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#b91c1c', padding: '10px 16px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            Total Due: <span style={{ fontSize: '16px' }}>BDT {totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-wallet" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Vendor Bills & Project Cost
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Log Bill/Expense
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
                            <input type="text" placeholder="Search vendor or project..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>PROJECT & DETAILS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>VENDOR / PAYEE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>TOTAL BILL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>PAID</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>DUE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => {
                                        const badge = getPaymentStatusBadge(exp.payment_status);
                                        return (
                                            <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {project_expenses.from ? project_expenses.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontSize: '0.875rem', color: "#475569" }}>{exp.date}</td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{exp.project?.name || 'N/A'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{exp.title}</div>
                                                </td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '500', color: '#334155' }}>{exp.vendor_name || '-'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}><i className="fa-solid fa-building-columns me-1"></i> {exp.account?.name || 'N/A'}</div>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{parseFloat(exp.total_bill).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{parseFloat(exp.paid_amount).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>{parseFloat(exp.due_amount).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        {exp.payment_status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                        <button onClick={() => openViewModal(exp)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        <button onClick={() => openEditModal(exp)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(exp.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No project expenses found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {project_expenses.from || 0} to {project_expenses.to || 0} of {project_expenses.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {project_expenses.links.map((link, index) => (
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
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-file-invoice-dollar" style={{ marginRight: "8px", color: "#2563eb" }}></i> Expense Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Expense Title</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedExpense.title}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Project Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-folder text-blue-500" style={{ marginRight: "6px" }}></i>{selectedExpense.project?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Vendor / Payee</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-user-tie text-amber-500" style={{ marginRight: "6px" }}></i>{selectedExpense.vendor_name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Payment Account</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-building-columns text-purple-500" style={{ marginRight: "6px" }}></i>{selectedExpense.account?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedExpense.date || "-"}</div>
                                </div>
                            </div>
                            
                            {/* Billing Summary Box */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Total Bill</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>৳ {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Paid Amount</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>৳ {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Due Amount</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>৳ {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Remarks / Description</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    {selectedExpense.description || "No remarks provided."}
                                </div>
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
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
                                {editMode ? "📝 Update Bill/Expense" : "✨ Log New Bill/Expense"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Project *</label>
                                    <Select
                                        options={projects.map((p) => ({ value: p.id, label: p.title || p.name }))}
                                        value={projects.map((p) => ({ value: p.id, label: p.title || p.name })).find((opt) => Number(opt.value) === Number(data.project_id)) || null}
                                        onChange={(selected) => setData("project_id", selected ? selected.value : "")}
                                        placeholder="Choose Project" isSearchable isClearable styles={selectStyles}
                                    />
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Expense Category *</label>
                                    <Select
                                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                        value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null}
                                        onChange={(selected) => setData("expense_category_id", selected ? selected.value : "")}
                                        placeholder="Choose Category" isSearchable isClearable styles={selectStyles}
                                    />
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Source *</label>
                                    <Select
                                        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${a.current_balance})` }))}
                                        value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${a.current_balance})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                        onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                        placeholder="Select Account" isSearchable isClearable styles={selectStyles}
                                    />
                                    {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Expense Title / Subject *</label>
                                    <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="e.g., Domain Purchase" required />
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Vendor / Contractor Name</label>
                                    <input type="text" value={data.vendor_name} onChange={e => setData('vendor_name', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="e.g., Mr. Rahim or IT Host" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Total Bill (BDT) *</label>
                                    <input type="number" step="0.01" value={data.total_bill} onChange={e => setData('total_bill', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: '600' }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#16a34a", marginBottom: "6px" }}>Paid Amount (BDT) *</label>
                                    <input type="number" step="0.01" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: '600', color: '#16a34a' }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#dc2626", marginBottom: "6px" }}>Calculated Due</label>
                                    <input type="text" value={calculateDue()} disabled style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: '#f1f5f9', fontWeight: 'bold', color: '#dc2626' }} />
                                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>STATUS: {calculateStatus()}</div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginTop: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Remarks / Notes</label>
                                    <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="Optional notes..." />
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving Changes..." : "Commit Expense"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}