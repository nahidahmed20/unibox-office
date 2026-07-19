import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

export default function Index({ expenses = { data: [], links: [] }, totalAmount = 0, thisMonthTotal = 0, categories = [], accounts = [], advances = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Payment Source Type Toggle (Account or Advance)
    const [paymentType, setPaymentType] = useState('account');

    // Filter States
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get("per_page") || "10");
    
    // Date Filter States
    const [dateFilter, setDateFilter] = useState(() => new URLSearchParams(window.location.search).get("date_filter") || "all");
    const [startDate, setStartDate] = useState(() => new URLSearchParams(window.location.search).get("start_date") || "");
    const [endDate, setEndDate] = useState(() => new URLSearchParams(window.location.search).get("end_date") || "");

    const isFirstRender = useRef(true);

    const { data, setData, post, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "", title: "", expense_category_id: "", account_id: "", advance_id: "", amount: "", date: "", description: "", attachment: null, _method: "post",
    });

    // --- Live Search, Filters & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== "10") params.per_page = perPage;
            
            if (dateFilter !== "all") {
                params.date_filter = dateFilter;
                if (dateFilter === "custom") {
                    if (startDate) params.start_date = startDate;
                    if (endDate) params.end_date = endDate;
                }
            }

            router.get(route("admin.expenses.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage, dateFilter, startDate, endDate]);

    // --- Clear All Filters ---
    const clearFilters = () => {
        setSearchTerm("");
        setPerPage("10");
        setDateFilter("all");
        setStartDate("");
        setEndDate("");
        router.get(route("admin.expenses.index"), {}, { replace: true });
    };

    const expList = expenses.data || [];

    // --- Export Tools ---
    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Title,Category,Payment Source,Amount,Description\n"];
        const rows = expList.map(e => {
            const safeDescription = (e.description || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
            return `"${e.date}","${e.title}","${e.category?.name || ''}","${e.account_id ? e.account?.name : (e.advance_id ? 'Advance' : '')}","${e.amount}","${safeDescription}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Office_Expenses_${new Date().toISOString().slice(0, 10)}.csv`); link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        let reportTime = "All Time";
        if (dateFilter === 'today') reportTime = "Today's";
        else if (dateFilter === 'this_week') reportTime = "This Week's";
        else if (dateFilter === 'this_month') reportTime = "This Month's";
        else if (dateFilter === 'this_year') reportTime = "This Year's";
        else if (dateFilter === 'custom') reportTime = `From ${startDate || '?'} to ${endDate || '?'}`;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Office Expenses Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 20px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; } /* Hide Actions */
                    </style>
                </head>
                <body>
                    <h2>Office Expenses Report</h2>
                    <p>Report Period: <b>${reportTime}</b></p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close(); printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            title: '',
            description: '',
            expense_category_id: '',
            advance_id: '',
            account_id: '',
            amount: 0,
            date: new Date().toISOString().slice(0, 10),
            attachment: null 
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id, title: expense.title || "", expense_category_id: expense.expense_category_id || "",
            account_id: expense.account_id || "", advance_id: expense.advance_id || "", amount: expense.amount || "",
            date: expense.date || "", description: expense.description || "", attachment: null, _method: "put", 
        });
        setPaymentType(expense.advance_id ? 'advance' : 'account'); setEditMode(true); setShowModal(true);
    };

    const openViewModal = (expense) => { setSelectedExpense(expense); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.account_id && !data.advance_id) return Swal.fire("Required", "Please select a Payment Source.", "warning");

        post(editMode ? route("admin.expenses.update", data.id) : route("admin.expenses.store"), {
            onSuccess: () => {
                reset(); setShowModal(false);
                Swal.fire({ icon: "success", title: editMode ? "Updated Successfully!" : "Logged Successfully!", timer: 1500, showConfirmButton: false });
            },
            forceFormData: true, 
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Expense?", text: "This will restore the amount to your account or advance balance.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, Delete It",
        }).then((res) => {
            if (res.isConfirmed) destroy(route("admin.expenses.destroy", id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }) });
        });
    };

    const selectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "38px", borderRadius: "6px", border: state.isFocused ? "1px solid #3b82f6" : "1px solid #cbd5e1", boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none", "&:hover": { borderColor: "#94a3b8" } }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 8px" }), placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "0.875rem" }), singleValue: (provided) => ({ ...provided, color: "#1e293b", fontSize: "0.875rem" }),
        option: (provided, state) => ({ ...provided, fontSize: "0.875rem", backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff", color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer" }),
    };

    const advanceOptions = advances.map((a) => {
        const rem = parseFloat(a.amount || 0) - (parseFloat(a.settled_amount || 0) + parseFloat(a.returned_amount || 0));
        return { value: a.id, label: `${a.user?.name || 'Unknown'} (Rem: TK. ${rem})` };
    });

    return (
        <AdminLayout>
            <Head title="Office Expenses" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Office Expenses</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Monitor and manage internal company expenses.</p>
                    </div>
                </div>

                {/* 🟢 NEW: Summary Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                    <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ background: "#eff6ff", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", fontSize: "1.25rem" }}>
                            <i className="fa-solid fa-calendar-check"></i>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>This Month's Total</p>
                            <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "#0f172a" }}>TK. {parseFloat(thisMonthTotal || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </div>
                    
                    <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ background: "#fef2f2", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: "1.25rem" }}>
                            <i className="fa-solid fa-filter"></i>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Filtered Total</p>
                            <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "#dc2626" }}>TK. {parseFloat(totalAmount || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-receipt" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Expense List
                        </div>
                        {hasPermission('create_expense') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Log Expense
                        </button>
                        )}
                    </div>

                    {/* Toolbar & Filters */}
                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                                Show 
                                <select value={perPage} onChange={(e) => setPerPage(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none" }}>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="1000">1000</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="export-buttons" style={{ display: "flex", gap: "8px", borderLeft: "1px solid #e2e8f0", paddingLeft: "12px" }}>
                                <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                    <i className="fas fa-file-csv text-teal-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                    <i className="fas fa-print text-slate-500"></i> Print Report
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <select 
                                    value={dateFilter} 
                                    onChange={(e) => { setDateFilter(e.target.value); if(e.target.value !== 'custom') { setStartDate(''); setEndDate(''); } }} 
                                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", color: "#334155", background: "#fff" }}
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="this_year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>

                                {dateFilter === "custom" && (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }} />
                                        <span style={{ color: "#94a3b8", alignSelf: "center" }}>to</span>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }} />
                                    </div>
                                )}
                            </div>

                            <div className="search-box" style={{ position: "relative" }}>
                                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                                <input type="text" placeholder="Search expenses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "220px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                            </div>

                            {/* CLEAR FILTERS BUTTON */}
                            {(searchTerm || dateFilter !== 'all' || perPage !== '10') && (
                                <button onClick={clearFilters} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <i className="fa-solid fa-xmark"></i> Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>EXPENSE TITLE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>CATEGORY & SOURCE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => (
                                        <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {expenses.from ? expenses.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#64748b" }}>{exp.date}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{exp.title}</div>
                                                {exp.description && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{exp.description.substring(0, 40)}...</div>}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span style={{ display: "inline-block", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                                    {exp.category?.name || "Uncategorized"}
                                                </span>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                    <i className={exp.advance_id ? "fa-solid fa-hand-holding-dollar me-1" : "fa-solid fa-building-columns me-1"}></i> 
                                                    {exp.account_id ? (exp.account?.name || 'Account') : (exp.advance_id ? 'Advance' : 'N/A')}
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "700", color: "#dc2626" }}>
                                                TK. {parseFloat(exp.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    {hasPermission('view_expence') && (
                                                    <button onClick={() => openViewModal(exp)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('edit_expence') && (
                                                    <button onClick={() => openEditModal(exp)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('delete_expence') && (
                                                    <button onClick={() => handleDelete(exp.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No expenses found for this period.</td>
                                    </tr>
                                )}
                            </tbody>
                            
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {expenses.links && expenses.links.length > 3 && (
                        <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                    Showing {expenses.from || 0} to {expenses.to || 0} of {expenses.total || 0} entries
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {expenses.links.map((link, index) => {
                                        // 🟢 FIXED: Pagination Icon Logic
                                        let labelContent;
                                        if (link.label.includes('Previous')) {
                                            labelContent = <i className="fa-solid fa-chevron-left"></i>;
                                        } else if (link.label.includes('Next')) {
                                            labelContent = <i className="fa-solid fa-chevron-right"></i>;
                                        } else {
                                            labelContent = <span dangerouslySetInnerHTML={{__html: link.label}}></span>;
                                        }

                                        return (
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
                                                {labelContent}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "550px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-receipt" style={{ marginRight: "8px", color: "#2563eb" }}></i> Expense Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                <div style={{ fontSize: "2rem", fontWeight: "800", color: '#dc2626' }}>
                                    TK. {parseFloat(selectedExpense.amount).toLocaleString('en-IN')}
                                </div>
                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "8px", display: "inline-block" }}>
                                    Office Expense Recorded
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Expense Title</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedExpense.title}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Category</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-tag text-blue-500" style={{ marginRight: "6px" }}></i>{selectedExpense.category?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Payment Source</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}>
                                        {selectedExpense.account_id ? (
                                            <><i className="fa-solid fa-building-columns text-purple-500" style={{ marginRight: "6px" }}></i>{selectedExpense.account?.name}</>
                                        ) : selectedExpense.advance_id ? (
                                            <><i className="fa-solid fa-hand-holding-dollar text-teal-500" style={{ marginRight: "6px" }}></i>Paid via Advance</>
                                        ) : "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Date Logged</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedExpense.date || "-"}</div>
                                </div>
                            </div>
                            
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Description & Notes</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    {selectedExpense.description || "No description provided."}
                                </div>
                            </div>

                            {selectedExpense.attachment && (
                                <div style={{ marginTop: "16px" }}>
                                    <a href={`/storage/${selectedExpense.attachment}`} target="_blank" rel="noreferrer" style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", color: "#2563eb", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                                        <i className="fa-solid fa-paperclip"></i> View Attachment
                                    </a>
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
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden", maxHeight: "95vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Expense" : "✨ Log New Expense"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1 }}>
                            <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                                
                                {/* ERROR DISPLAY */}
                                {errors.error && (
                                    <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <i className="fa-solid fa-circle-exclamation"></i> 
                                        {errors.error}
                                    </div>
                                )}

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Expense Title *</label>
                                    <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "500" }} placeholder="e.g. Monthly Electricity Bill" required />
                                    {errors.title && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.title}</p>}
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Category *</label>
                                        <Select
                                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                            value={categories.map((c) => ({ value: c.id, label: c.name })).find((opt) => Number(opt.value) === Number(data.expense_category_id)) || null}
                                            onChange={(selected) => setData("expense_category_id", selected ? selected.value : "")}
                                            placeholder="Choose Category" isSearchable isClearable styles={selectStyles}
                                        />
                                        {errors.expense_category_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.expense_category_id}</p>}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "6px" }}>
                                            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", margin: 0 }}>Payment Source *</label>
                                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <input type="radio" name="payType" checked={paymentType === 'account'} onChange={() => { setPaymentType('account'); setData('advance_id', ''); }} />
                                                    Account
                                                </label>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <input type="radio" name="payType" checked={paymentType === 'advance'} onChange={() => { setPaymentType('advance'); setData('account_id', ''); }} />
                                                    Advance
                                                </label>
                                            </div>
                                        </div>

                                        {paymentType === 'account' && (
                                            <>
                                                <Select
                                                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` }))}
                                                    value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                    onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                    placeholder="Choose Account" isSearchable isClearable styles={selectStyles}
                                                />
                                                {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                                            </>
                                        )}

                                        {paymentType === 'advance' && (
                                            <>
                                                <Select
                                                    options={advanceOptions}
                                                    value={advanceOptions.find((opt) => Number(opt.value) === Number(data.advance_id)) || null}
                                                    onChange={(selected) => setData("advance_id", selected ? selected.value : "")}
                                                    placeholder="Choose Advance" isSearchable isClearable styles={selectStyles}
                                                    noOptionsMessage={() => "No active advance found."}
                                                />
                                                {errors.advance_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.advance_id}</p>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (TK.) *</label>
                                        <input type="number" step="0.01" value={data.amount} onChange={e => setData('amount', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: 'bold' }} placeholder="0.00" required />
                                        {errors.amount && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.amount}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                        <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                        {errors.date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.date}</p>}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Description / Notes</label>
                                    <textarea value={data.description} onChange={e => setData('description', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", resize: "vertical" }} rows="2" placeholder="Optional context..."></textarea>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Attachment (Receipt / Voucher)</label>
                                    <input type="file" onChange={e => setData('attachment', e.target.files[0])} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px dashed #cbd5e1", outline: "none", fontSize: "0.85rem" }} accept="image/*,application/pdf" />
                                </div>

                                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                    <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                        {processing ? "Processing..." : (editMode ? "Update Expense" : "Commit Expense")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}