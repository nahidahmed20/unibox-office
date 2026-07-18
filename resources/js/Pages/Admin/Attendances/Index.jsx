import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ attendances = { data: [], links: [] }, users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        user_id: '',
        date: new Date().toISOString().split('T')[0],
        check_in: '',
        check_out: '',
        status: 'present'
    });

    // --- Live Search & Pagination Sync ---
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
                route('admin.attendances.index'), 
                params, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const recordList = attendances.data || [];

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map((a) => `${a.date}\t${a.user?.name || "N/A"}\t${a.check_in || '--:--'}\t${a.check_out || '--:--'}\t${a.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Employee Name,Check In,Check Out,Status\n"];
        const rows = recordList.map(a => `"${a.date}","${a.user?.name || ''}","${a.check_in || '--:--'}","${a.check_out || '--:--'}","${a.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Attendance Report</title>
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
                    <h2>Daily Attendance Report</h2>
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
            date: new Date().toISOString().slice(0, 10), 
            check_in: '',
            check_out: '',
            status: 'present' 
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (record) => {
        clearErrors();
        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';
        
        setData({
            id: record.id,
            user_id: record.user_id || '',
            date: record.date || '',
            check_in: formatTime(record.check_in),
            check_out: formatTime(record.check_out),
            status: record.status || 'present'
        });
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
            put(route('admin.attendances.update', data.id), { 
                onSuccess: () => { 
                    setShowModal(false); 
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.attendances.store'), { 
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
            title: 'Delete Attendance Record?',
            text: "This record will be permanently deleted!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.attendances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "The record has been deleted.", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    // Status Styling Generator
    const getStatusStyles = (status) => {
        const styles = {
            present: { bg: '#dcfce7', color: '#15803d', label: 'Present' },
            absent: { bg: '#fee2e2', color: '#b91c1c', label: 'Absent' },
            late: { bg: '#fef9c3', color: '#a16207', label: 'Late Check-in' },
            half_day: { bg: '#ffedd5', color: '#c2410c', label: 'Half Day' },
            on_leave: { bg: '#e0f2fe', color: '#0369a1', label: 'On Leave' },
            holiday: { bg: '#f3e8ff', color: '#6b21a8', label: 'Holiday' }
        };
        return styles[status] || { bg: '#f1f5f9', color: '#475569', label: status };
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
            <Head title="Employee Attendance Ledger" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Daily Attendance Ledger</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Monitor employee check-ins, check-outs, and historical logs.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-clock" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Attendance Records
                        </div>
                        {hasPermission('create_attendance') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Log Attendance
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
                            <input type="text" placeholder="Search name or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>EMPLOYEE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>CHECK IN</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>CHECK OUT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {recordList.length > 0 ? (
                                    recordList.map((record, index) => {
                                        const statusStyle = getStatusStyles(record.status);
                                        return (
                                            <tr key={record.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {attendances.from ? attendances.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontWeight: '600', color: '#0f172a' }}>{record.date}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '500', color: '#1f2937' }}>{record.user?.name || 'Unknown Employee'}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', color: '#475569', fontWeight: record.check_in ? '600' : '400' }}>
                                                    {record.check_in ? record.check_in.substring(0, 5) : '--:--'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', color: '#475569', fontWeight: record.check_out ? '600' : '400' }}>
                                                    {record.check_out ? record.check_out.substring(0, 5) : '--:--'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: 'uppercase',
                                                        background: statusStyle.bg,
                                                        color: statusStyle.color
                                                    }}>
                                                        {statusStyle.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        {hasPermission('view_attendance') && (
                                                        <button onClick={() => openViewModal(record)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('edit_attendance') && (
                                                        <button onClick={() => openEditModal(record)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('delete_attendance') && (
                                                        <button onClick={() => handleDelete(record.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
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
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No attendance records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {attendances.total > 0 && `Showing ${attendances.from || 0} to ${attendances.to || 0} of ${attendances.total || 0} entries`}
                            </div>

                            {attendances.links && attendances.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {attendances.links.map((link, index) => (
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
            {showViewModal && selectedRecord && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-address-card" style={{ marginRight: "8px", color: "#2563eb" }}></i> Attendance Summary
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                    {selectedRecord.user?.name || "N/A"}
                                </div>
                                <span style={{ 
                                    background: getStatusStyles(selectedRecord.status).bg, 
                                    color: getStatusStyles(selectedRecord.status).color, 
                                    padding: '5px 14px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "10px", display: "inline-block" 
                                }}>
                                    {getStatusStyles(selectedRecord.status).label}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "10px" }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Log Date</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}><i className="fa-regular fa-calendar text-rose-500" style={{ marginRight: "6px" }}></i>{selectedRecord.date || "-"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Current Status</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}><i className="fa-solid fa-circle-check text-emerald-500" style={{ marginRight: "6px" }}></i>{selectedRecord.status}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Check In Time</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}><i className="fa-regular fa-clock text-blue-500" style={{ marginRight: "6px" }}></i>{selectedRecord.check_in ? selectedRecord.check_in.substring(0, 5) : '--:--'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Check Out Time</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}><i className="fa-regular fa-clock text-amber-500" style={{ marginRight: "6px" }}></i>{selectedRecord.check_out ? selectedRecord.check_out.substring(0, 5) : '--:--'}</div>
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Attendance Record" : "✨ Log Manual Attendance"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
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
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required disabled={editMode} />
                                    {errors.date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.date}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Check In Time</label>
                                    <input type="time" value={data.check_in} onChange={e => setData('check_in', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.check_in && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.check_in}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Check Out Time</label>
                                    <input type="time" value={data.check_out} onChange={e => setData('check_out', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.check_out && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.check_out}</p>}
                                </div>
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Attendance Status *</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="on_leave">On Leave</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                                {errors.status && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.status}</p>}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {processing ? "Saving..." : (editMode ? "Update Record" : "Save Attendance")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}