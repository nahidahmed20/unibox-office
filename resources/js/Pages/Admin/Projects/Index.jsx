import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ projects = { data: [], links: [] }, clients = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal এর জন্য স্টেট
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    // --- Searchable Dropdown State ---
    const [clientSearch, setClientSearch] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });
    
    const isFirstRender = useRef(true);
    
    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        reset,
        processing,
        errors,
        clearErrors,
    } = useForm({
        id: "",
        client_id: "",
        title: "",
        description: "",
        start_date: "",
        deadline: "",
        budget: "",
        status: "planning",
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route("admin.projects.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = projects.data
            .map((p) => `${p.title}\t${p.client?.name || "N/A"}\t${p.budget || "0"}\t${p.status?.toUpperCase()}\t${p.deadline || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!projects.data || !projects.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Project Title,Client,Budget,Status,Start Date,Deadline\n"];
        const rows = projects.data.map(p => `"${p.title}","${p.client?.name || ''}","${p.budget || ''}","${p.status}","${p.start_date || '-'}","${p.deadline || '-'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Projects_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Projects Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Projects Report</h2>
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

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setClientSearch("");
        setShowClientDropdown(false);
        setShowModal(true);
    };

    const openEditModal = (project) => {
        clearErrors();
        setData({
            id: project.id,
            client_id: project.client_id,
            title: project.title,
            description: project.description || "",
            start_date: project.start_date || "",
            deadline: project.deadline || "",
            budget: project.budget || "",
            status: project.status,
        });
        setClientSearch("");
        setShowClientDropdown(false);
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (project) => {
        setSelectedProject(project);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Check if Client is selected
        if (!data.client_id) {
            Swal.fire("Required", "Please select a client from the dropdown.", "warning");
            return;
        }

        if (editMode) {
            put(route("admin.projects.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.projects.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This project will be deleted permanently!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete It",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Project deleted successfully.", timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            planning: "bg-slate-100 text-slate-800 border border-slate-300",
            in_progress: "bg-amber-100 text-amber-800 border border-amber-300",
            completed: "bg-emerald-100 text-emerald-800 border border-emerald-300",
            on_hold: "bg-red-100 text-red-800 border border-red-300 animate-pulse"
        };
        return styles[status] || "bg-gray-100 text-gray-800";
    };

    return (
        <AdminLayout>
            <Head title="Projects Management" />
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Project Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage, track and oversee client projects seamlessly.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-layer-group" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Current Active Projects
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add New Project
                        </button>
                    </div>

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
                                <i className="fas fa-file-excel text-emerald-500"></i> Excel/CSV
                            </button>
                            <button type="button" className="export-btn" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search project..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table" id="printable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Project Details</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Client</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Budget</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Status</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Deadline</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {projects.data && projects.data.length > 0 ? (
                                    projects.data.map((project, index) => (
                                        <tr key={project.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {projects.from ? projects.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>
                                                <div>{project.title}</div>
                                                {project.description && <span style={{ fontSize: "0.75rem", fontWeight: "400", color: "#64748b", display: "block", marginTop: "2px" }}>{project.description.substring(0, 40)}...</span>}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{project.client?.name || "N/A"}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                {project.budget ? `TK. ${Number(project.budget).toLocaleString()}` : "-"}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span className={getStatusBadge(project.status)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }}>
                                                    {project.status ? project.status.replace("_", " ") : ""}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#64748b" }}>{project.deadline || "-"}</td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    <button onClick={() => openViewModal(project)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    <button onClick={() => openEditModal(project)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Project">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(project.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Project">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No projects found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {projects.links && projects.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {projects.from || 0} to {projects.to || 0} of {projects.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {projects.links.map((link, index) => (
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
            {showViewModal && selectedProject && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-file-lines" style={{ marginRight: "8px", color: "#2563eb" }}></i> Project Details View
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Project Title</span>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>{selectedProject.title}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Client Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-user text-blue-500" style={{ marginRight: "6px" }}></i>{selectedProject.client?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Budget Allocated</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}>
                                        <i className="fa-solid fa-money-bill-wave text-emerald-500" style={{ marginRight: "6px" }}></i>
                                        {selectedProject.budget ? `TK. ${Number(selectedProject.budget).toLocaleString()}` : "Not Set"}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Project Status</span>
                                    <span className={getStatusBadge(selectedProject.status)} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", display: "inline-block" }}>
                                        {selectedProject.status ? selectedProject.status.replace("_", " ") : "PLANNING"}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Deadline</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedProject.deadline || "No deadline"}</div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Detailed Description</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "80px", whiteSpace: "pre-line" }}>
                                    {selectedProject.description || "No descriptions provided for this project."}
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
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Modify Project Records" : "✨ Create New Project"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        {/* Outside Click Wrapper for Custom Dropdown */}
                        <div onClick={() => showClientDropdown && setShowClientDropdown(false)} style={{ padding: "24px", maxHeight: "80vh", overflowY: "auto" }}>
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div style={{ gridColumn: "span 2" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Project Title *</label>
                                        <input type="text" value={data.title} onChange={(e) => setData("title", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                        {errors.title && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.title}</p>}
                                    </div>

                                    {/* --- SEARCHABLE DROPDOWN FOR CLIENT --- */}
                                    <div style={{ gridColumn: "span 1", position: "relative" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Client *</label>
                                        
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setShowClientDropdown(!showClientDropdown); }}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                        >
                                            <span style={{ color: data.client_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem" }}>
                                                {data.client_id 
                                                    ? (() => {
                                                        const c = clients.find(cl => cl.id == data.client_id);
                                                        return c ? `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` : "-- Choose Client --";
                                                    })()
                                                    : "-- Search & Select Client --"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showClientDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem" }}></i>
                                        </div>

                                        {showClientDropdown && (
                                            <div 
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "250px", display: "flex", flexDirection: "column" }}
                                            >
                                                <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type client name..." 
                                                        value={clientSearch}
                                                        onChange={(e) => setClientSearch(e.target.value)}
                                                        style={{ width: "100%", padding: "8px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                    {clients.filter(c => 
                                                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                        (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                    ).length > 0 ? (
                                                        clients.filter(c => 
                                                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                            (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                        ).map(c => (
                                                            <div 
                                                                key={c.id} 
                                                                onClick={() => {
                                                                    setData("client_id", c.id);
                                                                    setShowClientDropdown(false);
                                                                    setClientSearch("");
                                                                }}
                                                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.9rem", color: "#334155", background: data.client_id == c.id ? "#f0fdf4" : "transparent" }}
                                                                onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                                                                onMouseLeave={(e) => e.target.style.background = data.client_id == c.id ? "#f0fdf4" : "transparent"}
                                                            >
                                                                {c.name} {c.company_name ? <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({c.company_name})</span> : ''}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No client found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {errors.client_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.client_id}</p>}
                                    </div>
                                    {/* ------------------------------------------- */}

                                    <div style={{ gridColumn: "span 1" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Budget</label>
                                        <input type="number" value={data.budget} onChange={(e) => setData("budget", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                                    </div>

                                    <div style={{ gridColumn: "span 1" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Start Date</label>
                                        <input type="date" value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                                    </div>

                                    <div style={{ gridColumn: "span 1" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Deadline *</label>
                                        <input type="date" value={data.deadline} onChange={(e) => setData("deadline", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} required />
                                    </div>

                                    <div style={{ gridColumn: "span 2" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Project Status *</label>
                                        <select value={data.status} onChange={(e) => setData("status", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} required>
                                            <option value="planning">Planning</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div style={{ marginTop: "16px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Description / Notes</label>
                                    <textarea value={data.description} onChange={(e) => setData("description", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="3"></textarea>
                                </div>

                                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                    <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                        {processing ? "Saving Changes..." : "Commit Project"}
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