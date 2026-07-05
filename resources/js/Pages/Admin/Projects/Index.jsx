import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from 'react-select';

export default function Index({ projects = [], clients = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });

    const [perPage, setPerPage] = useState(10);
    const [clientSearch, setClientSearch] = useState("");

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
        const text = projects
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
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

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

        valueContainer: (provided) => ({
            ...provided,
            padding: "2px 12px",
        }),

        placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
            fontSize: "14px",
        }),

        singleValue: (provided) => ({
            ...provided,
            color: "#111827",
            fontWeight: 500,
        }),

        input: (provided) => ({
            ...provided,
            color: "#111827",
        }),

        indicatorSeparator: () => ({
            display: "none",
        }),

        dropdownIndicator: (provided, state) => ({
            ...provided,
            color: state.isFocused ? "#000000" : "#6b7280",
            transition: "all .2s",

            "&:hover": {
                color: "#050505",
            },
        }),

        clearIndicator: (provided) => ({
            ...provided,
            color: "#ef4444",

            "&:hover": {
                color: "#dc2626",
            },
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

        menuList: (provided) => ({
            ...provided,
            padding: "6px",
        }),

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

        noOptionsMessage: (provided) => ({
            ...provided,
            color: "#9ca3af",
        }),
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

    // filtered clients for searchable dropdown
    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()),
    );

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
                            <i className="fa-solid fa-layer-group"></i> Project
                            Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Project
                        </button>
                    </div>

                    {/* ===== SAME ASSETS STYLE TOOLBAR ===== */}
                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show 
                            <select defaultValue="10">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
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
                                placeholder="Search clients..." 
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
                                {projects.length > 0 ? (
                                    projects.map((project, index) => (
                                        <tr key={project.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: "600" }}>
                                                {project.title}
                                            </td>
                                            <td>
                                                {project.client?.name || "N/A"}
                                            </td>
                                            <td>{project.deadline}</td>
                                            <td>
                                                <span
                                                    className={`status-${
                                                        project.status ===
                                                        "completed"
                                                            ? "active"
                                                            : project.status ===
                                                                "on_hold"
                                                              ? "inactive"
                                                              : "pending"
                                                    }`}
                                                >
                                                    {project.status
                                                        .replace("_", " ")
                                                        .toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button
                                                        onClick={() =>
                                                            openEditModal(
                                                                project,
                                                            )
                                                        }
                                                        className="icon-btn edit"
                                                    >
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                project.id,
                                                            )
                                                        }
                                                        className="icon-btn delete"
                                                    >
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            style={{
                                                textAlign: "center",
                                                padding: "20px",
                                            }}
                                        >
                                            No projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ===== MODAL ===== */}
            {showModal && (
                <div className="modal-overlay">
                    <div
                        className="modal-content"
                        style={{ maxWidth: "650px" }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Project" : "Add New Project"}
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                                title="Close"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "15px",
                                }}
                            >
                                <div className="form-group">
                                    <label>Project Title *</label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData("title", e.target.value)
                                        }
                                        className="form-control"
                                        required
                                    />
                                </div>

                                {/* ===== CLIENT SEARCHABLE ===== */}
                                <div className="form-group">
                                    <label>Client *</label>
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
                                </div>

                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) =>
                                            setData(
                                                "start_date",
                                                e.target.value,
                                            )
                                        }
                                        className="form-control"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Deadline *</label>
                                    <input
                                        type="date"
                                        value={data.deadline}
                                        onChange={(e) =>
                                            setData("deadline", e.target.value)
                                        }
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Budget</label>
                                    <input
                                        type="number"
                                        value={data.budget}
                                        onChange={(e) =>
                                            setData("budget", e.target.value)
                                        }
                                        className="form-control"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Status *</label>
                                    <select
                                        value={data.status}
                                        onChange={(e) =>
                                            setData("status", e.target.value)
                                        }
                                        className="form-control"
                                        required
                                    >
                                        <option value="planning">
                                            Planning
                                        </option>
                                        <option value="in_progress">
                                            In Progress
                                        </option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                        <option value="on_hold">On Hold</option>
                                    </select>
                                </div>
                            </div>

                            <div
                                className="form-group"
                                style={{ marginTop: "15px" }}
                            >
                                <label>Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData("description", e.target.value)
                                    }
                                    className="form-control"
                                    rows="3"
                                />
                            </div>

                            <div
                                className="modal-footer"
                                style={{ marginTop: "20px" }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-save">
                                    Save Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
