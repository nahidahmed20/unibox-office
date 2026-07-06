import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router } from "@inertiajs/react";
import Swal from "sweetalert2";

export default function Index({ payments = [], invoices = [], accounts = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

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
        invoice_id: "",
        account_id: "",
        amount: "",
        payment_date: "",
        note: "",
        _method: "post",
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            router.get(
                route("invoice-payments.index"),
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

    const openEditModal = (payment) => {
        clearErrors();
        setData({
            id: payment.id,
            invoice_id: payment.invoice_id,
            account_id: payment.account_id || "",
            amount: payment.amount,
            payment_date: payment.payment_date,
            note: payment.note || "",
            _method: "put",
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openShowModal = (payment) => {
        setSelectedPayment(payment);
        setShowDetailsModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(
            editMode
                ? route("invoice-payments.update", data.id)
                : route("invoice-payments.store"),
            {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire(
                        editMode ? "Updated!" : "Received!",
                        editMode ? "Payment updated." : "Payment logged successfully.",
                        "success",
                    );
                },
                forceFormData: true,
            },
        );
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Delete Payment?",
            text: "This will reverse the amount from your account balance and update the invoice status.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("invoice-payments.destroy", id), {
                    onSuccess: () => {
                        Swal.fire("Deleted!", "Payment record removed.", "success");
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Invoice Payments</h1>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-money-bill-wave"></i> Payment History
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Receive Payment
                        </button>
                    </div>

                    {/* TOOLBAR */}
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

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-copy me-1"></i> Copy</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-excel me-1 text-green-600"></i> Excel</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-file-pdf me-1 text-red-600"></i> PDF</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50"><i className="fas fa-print me-1 text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search payments..."
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
                                <th>INVOICE & CLIENT</th>
                                <th>ACCOUNT</th>
                                <th>AMOUNT</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-gray-500">No payments found.</td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{payment.payment_date}</td>
                                        <td>
                                            <div style={{ fontWeight: "600", color: "#2563eb" }}>INV-00{payment.invoice_id}</div>
                                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{payment.invoice?.client?.name}</div>
                                        </td>
                                        <td>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600">
                                                {payment.account?.name || "N/A"}
                                            </span>
                                        </td>
                                        <td className="text-green-600 font-bold">৳ {payment.amount}</td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openShowModal(payment)} className="icon-btn text-blue-500 hover:bg-blue-50 rounded p-1 mx-1">
                                                    <i className="fa-regular fa-eye"></i>
                                                </button>
                                                <button onClick={() => openEditModal(payment)} className="icon-btn edit">
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>
                                                <button onClick={() => handleDelete(payment.id)} className="icon-btn delete">
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "600px" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Payment" : "Receive New Payment"}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="form-group">
                                    <label>Select Invoice *</label>
                                    <select value={data.invoice_id} onChange={(e) => setData("invoice_id", e.target.value)} className="form-control" required>
                                        <option value="">-- Select Invoice --</option>
                                        {invoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                INV-00{inv.id} ({inv.client?.name}) - Total: ৳{inv.grand_total}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.invoice_id && <span className="text-red-500 text-xs">{errors.invoice_id}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Receive In (Account) *</label>
                                    <select value={data.account_id} onChange={(e) => setData("account_id", e.target.value)} className="form-control" required>
                                        <option value="">-- Select Account --</option>
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Bal: ৳{acc.current_balance})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_id && <span className="text-red-500 text-xs">{errors.account_id}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="form-group">
                                    <label>Amount (৳) *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} className="form-control" required />
                                    {errors.amount && <span className="text-red-500 text-xs">{errors.amount}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Payment Date *</label>
                                    <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} className="form-control" required />
                                    {errors.payment_date && <span className="text-red-500 text-xs">{errors.payment_date}</span>}
                                </div>
                            </div>

                            <div className="form-group mt-3">
                                <label>Note (Optional)</label>
                                <textarea value={data.note} onChange={(e) => setData("note", e.target.value)} className="form-control" rows="2" placeholder="e.g. Paid via Bank Transfer" />
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? "Saving..." : "Save Payment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SHOW DETAILS MODAL */}
            {showDetailsModal && selectedPayment && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "500px" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Payment Receipt</h3>
                            <button onClick={() => setShowDetailsModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
                                &times;
                            </button>
                        </div>
                        
                        <div className="space-y-4 text-sm text-gray-700">
                            <p><strong className="text-gray-900 w-32 inline-block">Client Name:</strong> {selectedPayment.invoice?.client?.name}</p>
                            <p><strong className="text-gray-900 w-32 inline-block">Invoice Ref:</strong> INV-00{selectedPayment.invoice_id}</p>
                            <p><strong className="text-gray-900 w-32 inline-block">Account:</strong> {selectedPayment.account?.name}</p>
                            <p><strong className="text-gray-900 w-32 inline-block">Date:</strong> {selectedPayment.payment_date}</p>
                            
                            <div className="bg-green-50 p-4 rounded border border-green-200 mt-4 text-center">
                                <p className="text-gray-600 font-semibold mb-1">Paid Amount</p>
                                <p className="text-3xl font-bold text-green-600">৳ {selectedPayment.amount}</p>
                            </div>
                            
                            {selectedPayment.note && (
                                <div className="mt-4 bg-gray-50 p-3 rounded border border-gray-200">
                                    <strong className="text-gray-900 block mb-1">Note:</strong>
                                    <span className="italic">"{selectedPayment.note}"</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer mt-6">
                            <button type="button" onClick={() => setShowDetailsModal(false)} className="btn-cancel" style={{ width: '100%', textAlign: 'center' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}