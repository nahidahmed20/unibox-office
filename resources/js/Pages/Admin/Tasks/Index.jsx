import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ tasks = { data: [], links: [] }, projects = [], users = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    
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
        project_id: "",
        assigned_to: "",
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        due_date: "",
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

            router.get(route("admin.tasks.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!tasks.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = tasks.data
            .map((t) => `${t.title}\t${t.project?.title || "N/A"}\t${t.assignee?.name || "N/A"}\t${t.priority?.toUpperCase()}\t${t.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!tasks.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Task Title,Project,Assignee,Priority,Status,Due Date\n"];
        const rows = tasks.data.map(t => `"${t.title}","${t.project?.title || ''}","${t.assignee?.name || ''}","${t.priority}","${t.status}","${t.due_date || '-'}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Tasks_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            project_id: '',
            assigned_to: '',
            title: '',
            description: '',
            priority: 'medium', 
            status: 'todo',     
            due_date: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (task) => {
        clearErrors();
        setData({
            id: task.id,
            project_id: task.project_id,
            assigned_to: task.assigned_to,
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: task.status,
            due_date: task.due_date || "",
        });
        setEditMode(true);
        setShowModal(true);
    };

    // View Modal ওপেন করার ফাংশন
    const openViewModal = (task) => {
        setSelectedTask(task);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route("admin.tasks.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                },
            });
        } else {
            post(route("admin.tasks.store"), {
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
            text: "This task will be deleted permanently!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete It",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.tasks.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Task deleted successfully.", timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            low: "bg-gray-100 text-gray-700 ring-1 ring-gray-300",
            medium: "bg-blue-100 text-blue-700 ring-1 ring-blue-300",
            high: "bg-orange-100 text-orange-700 ring-1 ring-orange-300",
            urgent: "bg-red-100 text-red-700 ring-1 ring-red-300 animate-pulse"
        };
        return styles[priority] || "bg-gray-100 text-gray-700";
    };

    const getStatusBadge = (status) => {
        const styles = {
            todo: "bg-slate-100 text-slate-800 border border-slate-300",
            in_progress: "bg-amber-100 text-amber-800 border border-amber-300",
            review: "bg-purple-100 text-purple-800 border border-purple-300",
            done: "bg-emerald-100 text-emerald-800 border border-emerald-300"
        };
        return styles[status] || "bg-gray-100 text-gray-800";
    };

    return (
        <AdminLayout>
            <Head title="Tasks Management" />
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Task Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage, track and update team assignments seamlessly.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-list-check" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Current Active Tasks
                        </div>
                        {hasPermission('create_task') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add New Task
                        </button>
                        )}
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
                            <button type="button" className="export-btn" onClick={() => window.print()} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search task..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Task Details</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Project</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Assignee</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Priority</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Status</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Due Date</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {tasks.data && tasks.data.length > 0 ? (
                                    tasks.data.map((task, index) => (
                                        <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {tasks.from ? tasks.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>
                                                <div>{task.title}</div>
                                                {task.description && <span style={{ fontSize: "0.75rem", fontWeight: "400", color: "#64748b", display: "block", marginTop: "2px" }}>{task.description.substring(0, 40)}...</span>}
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#475569" }}>{task.project?.title || "N/A"}</td>
                                            <td style={{ padding: "16px 24px" }}>{task.assignee?.name || "Unassigned"}</td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span className={getPriorityBadge(task.priority)} style={{ padding: "4px 10px", borderRadius: "50px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <span className={getStatusBadge(task.status)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase" }}>
                                                    {task.status ? task.status.replace("_", " ") : ""}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", color: "#64748b" }}>{task.due_date || "-"}</td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    {hasPermission('view_tasks') && (
                                                    <button onClick={() => openViewModal(task)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('edit_task') && (
                                                    <button onClick={() => openEditModal(task)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Task">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('delete_task') && (
                                                    <button onClick={() => handleDelete(task.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Task">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No tasks found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {tasks.links && tasks.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {tasks.from || 0} to {tasks.to || 0} of {tasks.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {tasks.links.map((link, index) => (
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

            {showViewModal && selectedTask && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-file-lines" style={{ marginRight: "8px", color: "#2563eb" }}></i> Task Details View
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Task Title</span>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>{selectedTask.title}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Project Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-folder text-amber-500" style={{ marginRight: "6px" }}></i>{selectedTask.project?.title || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Assigned Personnel</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-user text-blue-500" style={{ marginRight: "6px" }}></i>{selectedTask.assignee?.name || "Unassigned"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Priority Rating</span>
                                    <span className={getPriorityBadge(selectedTask.priority)} style={{ padding: "4px 12px", borderRadius: "50px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", display: "inline-block" }}>
                                        {selectedTask.priority}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Workflow Status</span>
                                    <span className={getStatusBadge(selectedTask.status)} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", display: "inline-block" }}>
                                        {selectedTask.status ? selectedTask.status.replace("_", " ") : "TODO"}
                                    </span>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Deadline / Due Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedTask.due_date || "No deadline assigned"}</div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Detailed Description / Context</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "80px", whiteSpace: "pre-line" }}>
                                    {selectedTask.description || "No descriptions or scope notes provided for this task."}
                                </div>
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close Portal</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ২. CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Modify Task Records" : "✨ Create New Project Task"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Task Title *</label>
                                    <input type="text" value={data.title} onChange={(e) => setData("title", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                    {errors.title && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.title}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Project Allocation *</label>
                                    <select value={data.project_id} onChange={(e) => setData("project_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} required>
                                        <option value="">Select Project</option>
                                        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Assign To Personnel *</label>
                                    <select value={data.assigned_to} onChange={(e) => setData("assigned_to", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} required>
                                        <option value="">Select User</option>
                                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Priority Level</label>
                                    <select value={data.priority} onChange={(e) => setData("priority", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Workflow Status</label>
                                    <select value={data.status} onChange={(e) => setData("status", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Target Due Date</label>
                                    <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                                </div>
                            </div>
                            <div style={{ marginTop: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Task Description / Notes</label>
                                <textarea value={data.description} onChange={(e) => setData("description", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="3"></textarea>
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving Changes..." : "Commit Assignment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}