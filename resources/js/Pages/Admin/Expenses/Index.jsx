import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ expenses = [], categories = [], accounts = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || "",
    );
    const [perPage, setPerPage] = useState(10);

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
        account_id: "", 
        amount: "",
        date: "",
        description: "",
        attachment: null,
        _method: "post",
    });

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

    const openCreateModal = () => {
        reset();
        clearErrors();
        setData("_method", "post");
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        setData({
            id: expense.id,
            title: expense.title,
            expense_category_id: expense.expense_category_id,
            account_id: expense.account_id || "", 
            amount: expense.amount,
            date: expense.date,
            description: expense.description || "",
            attachment: null,
            _method: "put",
        });
        setEditMode(true);
        setShowModal(true);
    };

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

    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Expense?",
            text: "This will restore the amount to your account balance.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("admin.expenses.destroy", id));
            }
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
                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        
                        <div className="show-entries" style={{ fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                            Show
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 mx-2 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            entries
                        </div>

                        {/* Export / Download Buttons */}
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                <i className="fas fa-copy me-1"></i> Copy
                            </button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                <i className="fas fa-file-excel me-1 text-green-600"></i> Excel
                            </button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                <i className="fas fa-file-csv me-1 text-blue-600"></i> CSV
                            </button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                <i className="fas fa-file-pdf me-1 text-red-600"></i> PDF
                            </button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                                <i className="fas fa-print me-1 text-gray-600"></i> Print
                            </button>
                        </div>

                        {/* Search Box */}
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>TITLE</th>
                                <th>CATEGORY</th>
                                <th>ACCOUNT</th> 
                                <th>AMOUNT</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((exp) => (
                                <tr key={exp.id}>
                                    <td>{exp.date}</td>
                                    <td style={{ fontWeight: "600" }}>{exp.title}</td>
                                    <td>{exp.category?.name}</td>
                                    <td>
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600">
                                            {exp.account?.name || "N/A"}
                                        </span>
                                    </td>
                                    <td className="text-red-600 font-bold">${exp.amount}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button onClick={() => openEditModal(exp)} className="icon-btn edit">
                                                <i className="fa-regular fa-pen-to-square"></i>
                                            </button>
                                            <button onClick={() => handleDelete(exp.id)} className="icon-btn delete">
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
                    <div className="modal-content" style={{ maxWidth: "600px" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Expense" : "Log New Expense"}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Expense Title *</label>
                                <input value={data.title} onChange={(e) => setData("title", e.target.value)} className="form-control" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select value={data.expense_category_id} onChange={(e) => setData("expense_category_id", e.target.value)} className="form-control" required>
                                        <option value="">Select Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* --- নতুন Account Dropdown --- */}
                                <div className="form-group">
                                    <label>Payment Source (Account) *</label>
                                    <select value={data.account_id} onChange={(e) => setData("account_id", e.target.value)} className="form-control" required>
                                        <option value="">Select Account</option>
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Bal: ${acc.current_balance})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_id && <span className="text-red-500 text-xs">{errors.account_id}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={data.date} onChange={(e) => setData("date", e.target.value)} className="form-control" required />
                                </div>
                            </div>

                            <div className="form-group mt-3">
                                <label>Description</label>
                                <textarea value={data.description} onChange={(e) => setData("description", e.target.value)} className="form-control" rows="2" />
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
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