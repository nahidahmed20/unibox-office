import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ expenses = [], categories = [] }) {
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
        delete: destroy,
        reset,
        processing,
        errors,
        clearErrors,
    } = useForm({
        id: "",
        title: "",
        expense_category_id: "",
        amount: "",
        date: "",
        description: "",
        attachment: null,
        _method: "post",
    });

    // SEARCH (Assets style)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            router.get(
                route("admin.expenses.index"),
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
        setData("_method", "post");
        setEditMode(false);
        setShowModal(true);
    };

    // EDIT
    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id,
            title: expense.title,
            expense_category_id: expense.expense_category_id,
            amount: expense.amount,
            date: expense.date,
            description: expense.description || "",
            attachment: null,
            _method: "put",
        });
        setEditMode(true);
        setShowModal(true);
    };

    // SUBMIT
    const handleSubmit = (e) => {
        e.preventDefault();

        post(
            editMode
                ? route("admin.expenses.update", data.id)
                : route("admin.expenses.store"),
            {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire(
                        editMode ? "Updated!" : "Created!",
                        editMode ? "Expense updated." : "Expense logged.",
                        "success",
                    );
                },
                forceFormData: true,
            },
        );
    };

    // DELETE
    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Expense?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("admin.expenses.destroy", id));
            }
        });
    };

    // COPY
    const handleCopy = () => {
        const text = expenses
            .map(
                (e) =>
                    `${e.date}\t${e.title}\t${e.category?.name}\t${e.amount}\t${e.logger?.name ?? "Admin"}`,
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
            <Head title="Expenses" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Office Expenses</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-receipt"></i> Expense List
                        </div>

                        <button onClick={openCreateModal} className="add-btn">
                            + Log Expense
                        </button>
                    </div>

                    {/* TOOLBAR (Assets style EXACT) */}
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
                                <th>DATE</th>
                                <th>TITLE</th>
                                <th>CATEGORY</th>
                                <th>AMOUNT</th>
                                <th>LOGGED BY</th>
                                <th>RECEIPT</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>

                        <tbody>
                            {expenses.map((exp) => (
                                <tr key={exp.id}>
                                    <td>{exp.date}</td>

                                    <td style={{ fontWeight: "600" }}>
                                        {exp.title}
                                    </td>

                                    <td>{exp.category?.name}</td>

                                    <td className="text-red-600 font-bold">
                                        ${exp.amount}
                                    </td>

                                    <td>{exp.logger?.name || "Admin"}</td>

                                    <td>
                                        {exp.attachment ? (
                                            <a
                                                href={`/storage/${exp.attachment}`}
                                                target="_blank"
                                                className="text-blue-500 underline text-sm"
                                            >
                                                <i className="fa-solid fa-paperclip"></i>{" "}
                                                View
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        <div className="action-btns">
                                            <button
                                                onClick={() =>
                                                    openEditModal(exp)
                                                }
                                                className="icon-btn edit"
                                            >
                                                <i className="fa-regular fa-pen-to-square"></i>
                                            </button>

                                            <button
                                                onClick={() =>
                                                    handleDelete(exp.id)
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
                                {editMode ? "Edit Expense" : "Log New Expense"}
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
                                <label>Expense Title *</label>
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
                                <label>Category *</label>
                                <select
                                    value={data.expense_category_id}
                                    onChange={(e) =>
                                        setData(
                                            "expense_category_id",
                                            e.target.value,
                                        )
                                    }
                                    className="form-control"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group mt-3">
                                <label>Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) =>
                                        setData("amount", e.target.value)
                                    }
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div className="form-group mt-3">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    value={data.date}
                                    onChange={(e) =>
                                        setData("date", e.target.value)
                                    }
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div className="form-group mt-3">
                                <label>Receipt (Optional)</label>
                                <input
                                    type="file"
                                    onChange={(e) =>
                                        setData("attachment", e.target.files[0])
                                    }
                                    className="form-control"
                                />
                            </div>

                            <div className="form-group mt-3">
                                <label>Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData("description", e.target.value)
                                    }
                                    className="form-control"
                                    rows="2"
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
                                    {processing ? "Saving..." : "Save Expense"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
