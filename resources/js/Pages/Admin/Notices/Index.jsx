import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ notices = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || "",
    );

    const isFirstRender = useRef(true);

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        reset,
        processing,
        clearErrors,
    } = useForm({
        id: "",
        title: "",
        content: "",
        is_active: true,
    });

    // SEARCH (Assets style)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            router.get(
                route("admin.notices.index"),
                { search: searchTerm },
                { preserveState: true, replace: true },
            );
        }, 500);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    // CREATE
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setShowModal(true);
    };

    // EDIT
    const openEditModal = (notice) => {
        clearErrors();
        setData({
            ...notice,
            is_active: !!notice.is_active,
        });
        setEditMode(true);
        setShowModal(true);
    };

    // SUBMIT
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            put(route("admin.notices.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire("Success", "Updated successfully", "success");
                },
            });
        } else {
            post(route("admin.notices.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire("Success", "Created successfully", "success");
                },
            });
        }
    };

    // DELETE
    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete notice?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("admin.notices.destroy", id));
            }
        });
    };

    // COPY (optional like assets)
    const handleCopy = () => {
        const text = notices
            .map(
                (n) =>
                    `${n.title}\t${n.creator?.name}\t${new Date(n.created_at).toLocaleDateString()}\t${n.is_active ? "Active" : "Inactive"}`,
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

    return (
        <AdminLayout>
            <Head title="Notices" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Notice Board</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-bullhorn"></i> Company
                            Notices
                        </div>

                        <button onClick={openCreateModal} className="add-btn">
                            + Add Notice
                        </button>
                    </div>

                    {/* TOOLBAR (Assets style exact match) */}
                    <div className="table-toolbar">

                        <div className="show-entries">
                            Show
                            <select defaultValue="10">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>

                            <button type="button" className="export-btn">
                                <i className="fas fa-copy me-1"></i> Copy
                            </button>

                            <button type="button" className="export-btn">
                                <i className="fas fa-file-excel me-1"></i> Excel
                            </button>

                            <button type="button" className="export-btn">
                                <i className="fas fa-file-csv me-1"></i> CSV
                            </button>

                            <button type="button" className="export-btn">
                                <i className="fas fa-file-pdf me-1"></i> PDF
                            </button>

                            <button type="button" className="export-btn">
                                <i className="fas fa-print me-1"></i> Print
                            </button>

                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search requisitions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                    </div>

                    {/* TABLE */}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>TITLE</th>
                                <th>POSTED BY</th>
                                <th>DATE</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>

                        <tbody>
                            {notices.map((n) => (
                                <tr key={n.id}>
                                    <td className="font-bold text-blue-800">
                                        {n.title}
                                    </td>
                                    <td>{n.creator?.name}</td>
                                    <td>
                                        {new Date(
                                            n.created_at,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <span
                                            className={
                                                n.is_active
                                                    ? "status-active"
                                                    : "status-inactive"
                                            }
                                        >
                                            {n.is_active
                                                ? "Active"
                                                : "Inactive"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="action-btns">
                                            <button
                                                onClick={() => openEditModal(n)}
                                                className="icon-btn edit"
                                            >
                                                <i className="fa-regular fa-pen-to-square"></i>
                                            </button>

                                            <button
                                                onClick={() =>
                                                    handleDelete(n.id)
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

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div
                        className="modal-content"
                        style={{ maxWidth: "600px" }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Notice" : "Post Notice"}
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
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    value={data.title}
                                    onChange={(e) =>
                                        setData("title", e.target.value)
                                    }
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div className="form-group mt-3">
                                <label>Content *</label>
                                <textarea
                                    value={data.content}
                                    onChange={(e) =>
                                        setData("content", e.target.value)
                                    }
                                    className="form-control"
                                    rows="5"
                                    required
                                />
                            </div>

                            <div className="form-group mt-3 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) =>
                                        setData("is_active", e.target.checked)
                                    }
                                    className="mr-2 h-4 w-4"
                                />
                                <label>Publish immediately (Active)</label>
                            </div>

                            <div className="modal-footer mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>

                                <button type="submit" className="btn-save">
                                    Save Notice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
