import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ categories = [] }) {
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
        errors,
        clearErrors,
    } = useForm({
        id: "",
        name: "",
        description: "",
    });

    // SEARCH (Assets style)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            router.get(
                route("admin.expense-categories.index"),
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
    const openEditModal = (cat) => {
        clearErrors();
        setData({
            id: cat.id,
            name: cat.name,
            description: cat.description || "",
        });
        setEditMode(true);
        setShowModal(true);
    };

    // SUBMIT
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            put(route("admin.expense-categories.update", data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire("Updated!", "Category updated.", "success");
                },
            });
        } else {
            post(route("admin.expense-categories.store"), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire("Created!", "Category added.", "success");
                },
            });
        }
    };

    // DELETE
    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Category?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("admin.expense-categories.destroy", id));
            }
        });
    };

    // COPY
    const handleCopy = () => {
        const text = categories
            .map((c) => `${c.name}\t${c.slug}\t${c.description ?? ""}`)
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
            <Head title="Expense Categories" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Expense Categories</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-tags"></i> Categories
                        </div>

                        <button onClick={openCreateModal} className="add-btn">
                            + Add Category
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
                                <th>#</th>
                                <th>NAME</th>
                                <th>SLUG</th>
                                <th>DESCRIPTION</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>

                        <tbody>
                            {categories.map((cat, i) => (
                                <tr key={cat.id}>
                                    <td>{i + 1}</td>
                                    <td style={{ fontWeight: "600" }}>
                                        {cat.name}
                                    </td>
                                    <td>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                            {cat.slug}
                                        </span>
                                    </td>
                                    <td>{cat.description || "-"}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button
                                                onClick={() =>
                                                    openEditModal(cat)
                                                }
                                                className="icon-btn edit"
                                            >
                                                <i className="fa-regular fa-pen-to-square"></i>
                                            </button>

                                            <button
                                                onClick={() =>
                                                    handleDelete(cat.id)
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
                    <div className="modal-content">
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Category" : "Add New Category"}
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
                                <label>Category Name *</label>
                                <input
                                    value={data.name}
                                    onChange={(e) =>
                                        setData("name", e.target.value)
                                    }
                                    className="form-control"
                                    required
                                />
                                {errors.name && (
                                    <p className="error-text">{errors.name}</p>
                                )}
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
                                />
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
                                    {processing ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
