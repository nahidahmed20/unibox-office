import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from "react-select";

export default function Index({ tasks = [], projects = [], users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get("search") || "";
    });
    const [perPage, setPerPage] = useState(10);
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
            if (searchTerm.trim()) {
                params.search = searchTerm;
            }
            if (perPage !== 10) {
                params.per_page = perPage;
            }
            router.get(route("admin.tasks.index"), params, {
                preserveState: true,
                replace: true,
            });
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "46px",
            borderRadius: "4px",
            border: state.isFocused ? "1px solid #000" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(0,0,0,.15)" : "none",
            cursor: "pointer",
            transition: ".25s",
        }),

        valueContainer: (provided) => ({
            ...provided,
            padding: "2px 12px",
        }),

        indicatorSeparator: () => ({
            display: "none",
        }),

        dropdownIndicator: (provided) => ({
            ...provided,
            color: "#6b7280",
        }),

        menu: (provided) => ({
            ...provided,
            borderRadius: "4px",
            overflow: "hidden",
            zIndex: 9999,
        }),

        option: (provided, state) => ({
            ...provided,
            borderRadius: "4px",
            padding: "10px 14px",
            background: state.isSelected
                ? "#2563eb"
                : state.isFocused
                  ? "#eff6ff"
                  : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
        }),
    };

    const handleCopy = () => {
        const text = tasks
            .map(
                (t) =>
                    `${t.title}\t${t.project?.title}\t${t.assignee?.name}\t${t.priority}\t${t.status}`,
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

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            put(route("admin.tasks.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);

                    Swal.fire({
                        icon: "success",
                        title: "Updated!",
                        text: "Task updated successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                },
            });
        } else {
            post(route("admin.tasks.store"), {
                onSuccess: () => {
                    reset();

                    setShowModal(false);

                    Swal.fire({
                        icon: "success",
                        title: "Created!",
                        text: "Task created successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                },
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This task will be deleted!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Delete",
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route("admin.tasks.destroy", id), {
                    preserveScroll: true,

                    onSuccess: () => {
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "Task deleted successfully.",
                            timer: 1500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    const priorityBadge = (priority) => {
        switch (priority) {
            case "low":
                return "status-inactive";

            case "medium":
                return "status-pending";

            case "high":
                return "status-active";

            case "urgent":
                return "status-active";

            default:
                return "status-pending";
        }
    };

    const statusBadge = (status) => {
        switch (status) {
            case "todo":
                return "status-pending";

            case "in_progress":
                return "status-active";

            case "review":
                return "status-inactive";

            case "done":
                return "status-active";

            default:
                return "status-pending";
        }
    };

    return (
        <AdminLayout>
            <Head title="Tasks Management" />
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Tasks</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-list-check"></i> Project
                            Tasks
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Task
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show
                            <select
                                value={perPage}
                                onChange={(e) =>
                                    setPerPage(Number(e.target.value))
                                }
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            entries
                        </div>

                        <div
                            className="export-buttons"
                            style={{ display: "flex", gap: "8px" }}
                        >
                            <button
                                type="button"
                                className="export-btn"
                                onClick={handleCopy}
                            >
                                <i className="fas fa-copy me-1"></i>
                                Copy
                            </button>

                            <button className="export-btn">
                                <i className="fas fa-file-excel me-1"></i>
                                Excel
                            </button>

                            <button className="export-btn">
                                <i className="fas fa-file-csv me-1"></i>
                                CSV
                            </button>

                            <button
                                className="export-btn"
                                onClick={() => window.print()}
                            >
                                <i className="fas fa-print me-1"></i>
                                Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search task..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>TASK</th>
                                    <th>PROJECT</th>
                                    <th>ASSIGNEE</th>
                                    <th>PRIORITY</th>
                                    <th>STATUS</th>
                                    <th>DUE DATE</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td style={{ fontWeight: "600" }}>
                                            {task.title}
                                        </td>
                                        <td>{task.project?.title}</td>
                                        <td>{task.assignee?.name}</td>
                                        <td>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}
                                            >
                                                {task.priority.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-medium text-gray-600">
                                                {task.status
                                                    .replace("_", " ")
                                                    .toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{task.due_date || "-"}</td>
                                        <td>
                                            <div className="action-btns">
                                                <button
                                                    onClick={() =>
                                                        openEditModal(task)
                                                    }
                                                    className="icon-btn edit"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(task.id)
                                                    }
                                                    className="icon-btn delete"
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div
                        className="modal-content"
                        style={{ maxWidth: "650px" }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Task" : "Add New Task"}
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
                                <div
                                    className="form-group"
                                    style={{ gridColumn: "span 2" }}
                                >
                                    <label>Task Title *</label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData("title", e.target.value)
                                        }
                                        className="form-control"
                                        required
                                    />
                                    {errors.title && (
                                        <p className="error-text">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Project *</label>
                                    <select
                                        value={data.project_id}
                                        onChange={(e) =>
                                            setData(
                                                "project_id",
                                                e.target.value,
                                            )
                                        }
                                        className="form-control"
                                        required
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.project_id && (
                                        <p className="error-text">
                                            {errors.project_id}
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Assign To *</label>
                                    <select
                                        value={data.assigned_to}
                                        onChange={(e) =>
                                            setData(
                                                "assigned_to",
                                                e.target.value,
                                            )
                                        }
                                        className="form-control"
                                        required
                                    >
                                        <option value="">Select User</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.assigned_to && (
                                        <p className="error-text">
                                            {errors.assigned_to}
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={data.priority}
                                        onChange={(e) =>
                                            setData("priority", e.target.value)
                                        }
                                        className="form-control"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={data.status}
                                        onChange={(e) =>
                                            setData("status", e.target.value)
                                        }
                                        className="form-control"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">
                                            In Progress
                                        </option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) =>
                                            setData("due_date", e.target.value)
                                        }
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            <div className="form-group mt-3">
                                <label>Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData("description", e.target.value)
                                    }
                                    className="form-control"
                                    rows="3"
                                ></textarea>
                            </div>

                            <div className="modal-footer mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn-save"
                                >
                                    {processing ? "Saving..." : "Save Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
