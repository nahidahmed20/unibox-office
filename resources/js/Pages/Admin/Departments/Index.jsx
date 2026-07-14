




import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ departments = { data: [], links: [] } }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        description: ''
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

            // Make sure your web.php has this route defined for departments
            router.get(route('admin.departments.index'), params, {
                preserveState: true,
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Copy Data ---
    const handleCopy = () => {
        if (!departments.data || !departments.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = departments.data
            .map((d) => `${d.name}\t${d.description || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    // --- Export CSV ---
    const handleExportCSV = () => {
        if (!departments.data || !departments.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Department Name,Description\n"];
        const rows = departments.data.map(d => `"${d.name}","${d.description || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Departments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    // --- Custom Full Screen Print ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open(
            '', 
            '_blank', 
            `width=${window.screen.width},height=${window.screen.height},top=0,left=0`
        );
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Departments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; }
                        /* Hide Actions Column */
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Departments Directory Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // --- Modals ---
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (department) => {
        clearErrors();
        setData({
            id: department?.id || '',
            name: department?.name || '',
            description: department?.description || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (department) => {
        setSelectedDepartment(department);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.departments.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.departments.store'), {
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
            title: 'Are you sure?',
            text: 'This department will be deleted permanently!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.departments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Department removed successfully.", timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Departments Management" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Department Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage and track all company departments.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-building" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Department Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add New Department
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
                            <button type="button" className="export-btn" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" className="export-btn" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" className="export-btn" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Department Name</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Description</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {departments.data && departments.data.length > 0 ? (
                                    departments.data.map((department, index) => (
                                        <tr key={department.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {departments.from ? departments.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{department.name}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontSize: "0.875rem", color: "#475569" }}>{department.description ? department.description.substring(0, 50) + '...' : "-"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    <button onClick={() => openViewModal(department)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    <button onClick={() => openEditModal(department)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Department">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(department.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Department">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No departments found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {departments.links && departments.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {departments.from || 0} to {departments.to || 0} of {departments.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {departments.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        style={{ 
                                            padding: "6px 12px", 
                                            border: "1px solid #cbd5e1", 
                                            borderRadius: "6px", 
                                            fontSize: "0.875rem", 
                                            color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), 
                                            backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), 
                                            pointerEvents: link.url ? "auto" : "none", 
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minWidth: "32px"
                                        }} 
                                        preserveState
                                    >
                                        {link.label.includes("Previous") ? (
                                            <i className="fa-solid fa-chevron-left"></i>
                                        ) : link.label.includes("Next") ? (
                                            <i className="fa-solid fa-chevron-right"></i>
                                        ) : (
                                            link.label.replace("&laquo;", "").replace("&raquo;", "")
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedDepartment && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-building" style={{ marginRight: "8px", color: "#2563eb" }}></i> Department Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Department Name</span>
                                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedDepartment.name}</div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Description</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    {selectedDepartment.description || "No description provided."}
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Update Department" : "✨ Add New Department"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Department Name *</label>
                                    <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="e.g. Human Resources" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                    {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Description</label>
                                    <textarea value={data.description} onChange={(e) => setData("description", e.target.value)} placeholder="Brief description about the department..." style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="4"></textarea>
                                    {errors.description && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.description}</p>}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving..." : "Save Department"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}