import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ leaves = { data: [], links: [] }, users = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        user_id: '', 
        type: 'Casual', 
        start_date: '', 
        end_date: '', 
        total_days: 1, 
        reason: '', 
        status: 'pending'
    });

    const recordList = leaves.data || [];

    // Auto Calculate Total Days
    useEffect(() => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            const timeDiff = end.getTime() - start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            setData('total_days', daysDiff > 0 ? daysDiff : 0);
        }
    }, [data.start_date, data.end_date]);

    // Live Search & Pagination Sync
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;

            router.get(route('admin.leaves.index'), params, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map(lv => `${lv.user?.name || "N/A"}\t${lv.type}\t${lv.start_date}\t${lv.end_date}\t${lv.total_days} Days\t${lv.status.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Employee Name,Leave Type,Start Date,End Date,Total Days,Reason,Status\n"];
        const rows = recordList.map(lv => `"${lv.user?.name || ''}","${lv.type}","${lv.start_date}","${lv.end_date}","${lv.total_days}","${lv.reason || ''}","${lv.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Leave_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Leave Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Employee Leave Report</h2>
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
            user_id: '',
            type: '',
            start_date: '',
            end_date: '',
            total_days: 0,
            reason: '',
            status: 'pending', 
            approved_by: ''
        });

        setEditMode(false);
        setShowModal(true);
    };
    
    const openEditModal = (leave) => {
        clearErrors(); 
        setData({ ...leave, reason: leave.reason || '' });
        setEditMode(true); 
        setShowModal(true);
    };

    const openViewModal = (record) => {
        setSelectedRecord(record);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.leaves.update', data.id), { 
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.leaves.store'), { 
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Applied!', timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Leave Record?', text: 'This action cannot be undone!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.leaves.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false })
                }); 
            }
        });
    };

    // Status Styling Generator
    const getStatusStyles = (status) => {
        const styles = {
            approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved', icon: 'fa-check-circle' },
            rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected', icon: 'fa-times-circle' },
            pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending', icon: 'fa-clock' }
        };
        return styles[status] || { bg: '#f1f5f9', color: '#475569', label: status, icon: 'fa-circle-dot' };
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
            <Head title="Leave Applications Ledger" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Leave Applications Ledger</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage employee leave requests, approvals, and history.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-calendar-minus" style={{ marginRight: "8px", color: "#8b5cf6" }}></i> Leave Records
                        </div>
                        {hasPermission('create_leave') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Apply Leave
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
                            <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>EMPLOYEE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>TYPE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>DURATION</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>DAYS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {recordList.length > 0 ? (
                                    recordList.map((lv, index) => {
                                        const statusStyle = getStatusStyles(lv.status);
                                        return (
                                            <tr key={lv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {leaves.from ? leaves.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontWeight: '600', color: '#0f172a' }}>{lv.user?.name || 'Unknown'}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '500', color: '#475569' }}>
                                                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{lv.type}</span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                                                    <div>{lv.start_date}</div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>to</div>
                                                    <div>{lv.end_date}</div>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', fontWeight: '700', color: '#334155' }}>
                                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', display: 'inline-block', minWidth: '35px' }}>
                                                        {lv.total_days}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: 'uppercase',
                                                        background: statusStyle.bg, color: statusStyle.color, display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <i className={`fa-solid ${statusStyle.icon}`}></i> {statusStyle.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        {hasPermission('view_leave') && (
                                                        <button onClick={() => openViewModal(lv)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('edit_leave') && (
                                                        <button onClick={() => openEditModal(lv)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('delete_leave') && (
                                                        <button onClick={() => handleDelete(lv.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No leave applications found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {leaves.total > 0 && `Showing ${leaves.from || 0} to ${leaves.to || 0} of ${leaves.total || 0} entries`}
                            </div>

                            {leaves.links && leaves.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {leaves.links.map((link, index) => (
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
                                            <span dangerouslySetInnerHTML={{__html: link.label}}></span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedRecord && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "550px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-file-lines" style={{ marginRight: "8px", color: "#8b5cf6" }}></i> Application Summary
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                    {selectedRecord.user?.name || "N/A"}
                                </div>
                                <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "4px" }}>{selectedRecord.type} Leave Request</div>
                                
                                <span style={{ 
                                    background: getStatusStyles(selectedRecord.status).bg, 
                                    color: getStatusStyles(selectedRecord.status).color, 
                                    padding: '5px 14px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "12px", display: "inline-block" 
                                }}>
                                    <i className={`fa-solid ${getStatusStyles(selectedRecord.status).icon}`} style={{ marginRight: '4px' }}></i> {getStatusStyles(selectedRecord.status).label}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Start Date</span>
                                    <div style={{ color: "#334155", fontWeight: "600", fontSize: "1.05rem" }}><i className="fa-regular fa-calendar-check text-indigo-500" style={{ marginRight: "6px" }}></i>{selectedRecord.start_date}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>End Date</span>
                                    <div style={{ color: "#334155", fontWeight: "600", fontSize: "1.05rem" }}><i className="fa-regular fa-calendar-xmark text-rose-500" style={{ marginRight: "6px" }}></i>{selectedRecord.end_date}</div>
                                </div>
                            </div>
                            
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: "16px", textAlign: 'center' }}>
                                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Total Duration</span>
                                 <div style={{ color: "#0f172a", fontWeight: "700", fontSize: "1.2rem" }}>{selectedRecord.total_days} Days</div>
                            </div>

                            {selectedRecord.reason && (
                                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Reason / Comments</span>
                                    <div style={{ color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>{selectedRecord.reason}</div>
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
                                {editMode ? "📝 Edit Leave Application" : "✨ Apply for Leave"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Employee *</label>
                                <Select
                                    options={users.map((u) => ({ value: u.id, label: u.name }))}
                                    value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                    onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                    placeholder="Choose Employee" isSearchable isClearable styles={selectStyles}
                                    isDisabled={editMode}
                                />
                                {errors.user_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.user_id}</p>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Leave Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required>
                                        <option value="Casual">Casual Leave</option>
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Earned">Earned Leave</option>
                                        <option value="Maternity">Maternity Leave</option>
                                        <option value="Paternity">Paternity Leave</option>
                                        <option value="Unpaid">Unpaid Leave</option>
                                    </select>
                                    {errors.type && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.type}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Approval Status *</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                    {errors.status && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.status}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Start Date *</label>
                                    <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>End Date *</label>
                                    <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Total Days</label>
                                    <input type="number" value={data.total_days} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#f1f5f9", fontWeight: "bold" }} readOnly />
                                </div>
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Reason / Comments</label>
                                <textarea value={data.reason} onChange={e => setData('reason', e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", resize: "none" }} rows="3" placeholder="Briefly state the reason..."></textarea>
                                {errors.reason && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.reason}</p>}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing || data.total_days <= 0} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {processing ? "Saving..." : (editMode ? "Update Details" : "Submit Request")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}