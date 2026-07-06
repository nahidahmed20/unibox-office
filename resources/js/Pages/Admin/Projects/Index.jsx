import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from 'react-select';

export default function Index({ projects = [], clients = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false);

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
        client_name: "", // View mode e client name dekhabar jonno
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            const params = {};

            if (searchTerm.trim()) {
                params.search = searchTerm;
            }

            if (perPage !== 10) {
                params.per_page = perPage;
            }

            router.get(route("admin.projects.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 500);

        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const projectList = projects.data || projects;
        const text = projectList
            .map(
                (p) =>
                    `${p.title}\t${p.client?.name || ""}\t${p.deadline}\t${p.status}`,
            )
            .join("\n");

        navigator.clipboard.writeText(text);

        Swal.fire({
            icon: "success",
            title: "Copied!",
            timer: 1200,
            showConfirmButton: false,
        });
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setViewMode(false);
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
            client_name: project.client?.name || "",
        });
        setEditMode(true);
        setViewMode(false);
        setShowModal(true);
    };

    const openViewModal = (project) => {
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
            client_name: project.client?.name || "",
        });
        setEditMode(false);
        setViewMode(true);
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (viewMode) return;

        if (editMode) {
            put(route("admin.projects.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire(
                        "Updated!",
                        "Project updated successfully.",
                        "success",
                    );
                },
            });
        } else {
            post(route("admin.projects.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire(
                        "Created!",
                        "New project added successfully.",
                        "success",
                    );
                },
            });
        }
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "46px",
            borderRadius: "4px",
            border: state.isFocused
                ? "1px solid #000000"
                : "1px solid #d1d5db",
            boxShadow: state.isFocused
                ? "0 0 0 1px rgba(0,0,0,.15)"
                : "none",
            backgroundColor: "#fff",
            transition: "all .25s ease",
            cursor: "pointer",

            "&:hover": {
                borderColor: "#050505",
            },
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#111827", fontWeight: 500 }),
        input: (provided) => ({ ...provided, color: "#111827" }),
        indicatorSeparator: () => ({ display: "none" }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            color: state.isFocused ? "#000000" : "#6b7280",
            transition: "all .2s",
            "&:hover": { color: "#050505" },
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: "#ef4444",
            "&:hover": { color: "#dc2626" },
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: "4px",
            overflow: "hidden",
            marginTop: "6px",
            boxShadow: "0 10px 25px rgba(0,0,0,.12)",
            border: "1px solid #e5e7eb",
            zIndex: 9999,
        }),
        menuList: (provided) => ({ ...provided, padding: "6px" }),
        option: (provided, state) => ({
            ...provided,
            padding: "10px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            backgroundColor: state.isSelected
                ? "#2563eb"
                : state.isFocused
                ? "#eff6ff"
                : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
            transition: "all .2s",
        }),
        noOptionsMessage: (provided) => ({ ...provided, color: "#9ca3af" }),
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This project will be deleted!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            confirmButtonColor: "#d33",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.projects.destroy", id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        Swal.fire(
                            "Deleted!",
                            "Project has been removed.",
                            "success",
                        ),
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Projects Management" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Projects</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-layer-group"></i> Project Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Project
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select> 
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn" onClick={handleCopy}>
                                <i className="fas fa-copy me-1"></i> Copy
                            </button>
                            <button type="button" className="export-btn">
                                <i className="fas fa-file-excel me-1"></i> Excel
                            </button>
                            <button type="button" className="export-btn">
                                <i className="fas fa-file-csv me-1"></i> CSV
                            </button>
                            <button type="button" className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search projects..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>PROJECT TITLE</th>
                                    <th>CLIENT</th>
                                    <th>DEADLINE</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>

                            <tbody>
                                {(projects.data || projects).length > 0 ? (
                                    (projects.data || projects).map((project, index) => (
                                        <tr key={project.id}>
                                            <td>{projects.from ? projects.from + index : index + 1}</td>
                                            <td style={{ fontWeight: "600", color: "#334155" }}>
                                                {project.title}
                                            </td>
                                            <td>
                                                {project.client?.name || "N/A"}
                                            </td>
                                            <td>{project.deadline || "-"}</td>
                                            <td>
                                                <span
                                                    className={`status-${
                                                        project.status === "completed"
                                                            ? "active"
                                                            : project.status === "on_hold"
                                                            ? "inactive"
                                                            : "pending"
                                                    }`}
                                                >
                                                    {project.status.replace("_", " ").toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button
                                                        onClick={() => openViewModal(project)}
                                                        className="icon-btn view"
                                                        title="View"
                                                    >
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(project)}
                                                        className="icon-btn edit"
                                                        title="Edit"
                                                    >
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(project.id)}
                                                        className="icon-btn delete"
                                                        title="Delete"
                                                    >
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                                            No projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Section */}
                        {projects.links && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: "20px",
                                    padding: "15px 0",
                                    borderTop: "1px solid #e5e7eb",
                                }}
                            >
                                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                                    Showing <b>{projects.from ?? 0}</b> to <b>{projects.to ?? 0}</b> of{" "}
                                    <b>{projects.total}</b> entries
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <button
                                        disabled={!projects.prev_page_url}
                                        onClick={() => router.visit(projects.prev_page_url, { preserveState: true, preserveScroll: true })}
                                        className="pagination-btn"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>

                                    {projects.links
                                        .filter(link => link.label !== "&laquo; Previous" && link.label !== "Next &raquo;")
                                        .map((link, index) => (
                                            <button
                                                key={index}
                                                disabled={!link.url}
                                                onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: true })}
                                                className={`pagination-btn ${link.active ? "active-page" : ""}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}

                                    <button
                                        disabled={!projects.next_page_url}
                                        onClick={() => router.visit(projects.next_page_url, { preserveState: true, preserveScroll: true })}
                                        className="pagination-btn"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== MODAL ===== */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "650px" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
                                {viewMode ? "Project Information" : editMode ? "Edit Project" : "Add New Project"}
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                title="Close"
                            >
                                &times;
                            </button>
                        </div>

                        {/* VIEW MODE LAYOUT */}
                        {viewMode ? (
                            <div className="view-details" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Project Title</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>{data.title || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Client</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0ea5e9', fontWeight: '500' }}>{data.client_name || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Start Date</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>{data.start_date || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Deadline</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#ef4444', fontWeight: '500' }}>{data.deadline || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Budget</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>
                                            {data.budget ? `TK. ${Number(data.budget).toLocaleString()}` : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Status</span>
                                        <span style={{ 
                                            display: 'inline-block', 
                                            padding: '4px 10px', 
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            backgroundColor: data.status === "completed" ? '#dcfce7' : data.status === "on_hold" ? '#fee2e2' : '#e0f2fe',
                                            color: data.status === "completed" ? '#166534' : data.status === "on_hold" ? '#991b1b' : '#075985'
                                        }}>
                                            {data.status ? data.status.replace("_", " ").toUpperCase() : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '20px', marginTop: '4px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Description</span>
                                    <span style={{ display: 'block', fontSize: '14px', color: '#334155', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px' }}>
                                        {data.description || 'No description provided for this project.'}
                                    </span>
                                </div>

                                <div className="modal-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)} 
                                        style={{ padding: '6px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#e2e8f0'; e.target.style.color = '#0f172a'; }}
                                        onMouseLeave={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.color = '#475569'; }}
                                    >
                                        Close 
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ADD / EDIT FORM */
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Project Title *</label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={(e) => setData("title", e.target.value)}
                                            className="form-control"
                                            required
                                        />
                                        {errors.title && <p className="error-text" style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{errors.title}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Client *</label>
                                        <Select
                                            options={clients.map((c) => ({
                                                value: c.id,
                                                label: c.name,
                                            }))}
                                            value={
                                                clients
                                                    .map((c) => ({
                                                        value: c.id,
                                                        label: c.name,
                                                    }))
                                                    .find((opt) => Number(opt.value) === Number(data.client_id)) || null
                                            }
                                            onChange={(selected) =>
                                                setData("client_id", selected ? selected.value : "")
                                            }
                                            placeholder="Search & Select Client"
                                            isSearchable={true}
                                            isClearable
                                            styles={selectStyles}
                                        />
                                        {errors.client_id && <p className="error-text" style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{errors.client_id}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={data.start_date}
                                            onChange={(e) => setData("start_date", e.target.value)}
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Deadline *</label>
                                        <input
                                            type="date"
                                            value={data.deadline}
                                            onChange={(e) => setData("deadline", e.target.value)}
                                            className="form-control"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Budget</label>
                                        <input
                                            type="number"
                                            value={data.budget}
                                            onChange={(e) => setData("budget", e.target.value)}
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Status *</label>
                                        <select
                                            value={data.status}
                                            onChange={(e) => setData("status", e.target.value)}
                                            className="form-control"
                                            required
                                        >
                                            <option value="planning">Planning</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="on_hold">On Hold</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: "15px" }}>
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Description</label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        className="form-control"
                                        rows="3"
                                    />
                                </div>

                                <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        {processing ? 'Saving...' : 'Save Project'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}