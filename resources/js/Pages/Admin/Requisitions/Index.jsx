import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ requisitions = [], users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get('search') || ''
    );

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        user_id: '',
        item_name: '',
        quantity: 1,
        estimated_cost: '',
        reason: '',
        status: 'pending'
    });

    // --- LIVE SEARCH ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delay = setTimeout(() => {
            router.get(
                route('admin.requisitions.index'),
                { search: searchTerm },
                { preserveState: true, replace: true }
            );
        }, 500);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    // --- COPY TABLE DATA ---
    const handleCopy = () => {
        const table = document.querySelector('.data-table');
        if (!table) return;
        
        navigator.clipboard.writeText(table.innerText).then(() => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Table data copied!',
                showConfirmButton: false,
                timer: 2000
            });
        });
    };

    // --- MODAL CONTROLS ---
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (req) => {
        clearErrors();
        setData({
            ...req,
            estimated_cost: req.estimated_cost || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    // --- FORM SUBMIT ---
    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode) {
            put(route('admin.requisitions.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Success', 'Requisition updated successfully', 'success');
                }
            });
        } else {
            post(route('admin.requisitions.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire('Success', 'Requisition created successfully', 'success');
                }
            });
        }
    };

    // --- DELETE ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete requisition?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route('admin.requisitions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire('Deleted!', 'Requisition has been removed.', 'success')
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Requisitions" />

            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Requisitions</h1>
                    <div className="breadcrumb">
                        Dashboard / Office Admin / <span>Requisitions</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-clipboard-list"></i> Item Requests
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + New Request
                        </button>
                    </div>

                    {/* TOOLBAR */}
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
                                placeholder="Search requests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* TABLE */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>REQUESTED BY</th>
                                    <th>ITEM NAME</th>
                                    <th style={{ textAlign: 'center' }}>QTY</th>
                                    <th>EST. COST</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requisitions.length > 0 ? (
                                    requisitions.map((req) => (
                                        <tr key={req.id}>
                                            <td style={{ fontWeight: '500', color: '#334155' }}>{req.user?.name}</td>
                                            <td className="font-bold">{req.item_name}</td>
                                            <td style={{ textAlign: 'center' }}>{req.quantity}</td>
                                            <td style={{ fontWeight: '600', color: '#0f766e' }}>
                                                BDT {parseFloat(req.estimated_cost || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`uppercase text-[11px] font-bold px-2 py-1 rounded
                                                    ${req.status === 'approved' ? 'bg-green-100 text-green-700'
                                                    : req.status === 'rejected' ? 'bg-red-100 text-red-700'
                                                    : req.status === 'purchased' ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                    <button onClick={() => openEditModal(req)} className="icon-btn edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(req.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                            No requisitions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Requisition" : "New Requisition"}
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Requested By (User) *</label>
                                    <select
                                        value={data.user_id}
                                        onChange={(e) => setData('user_id', e.target.value)}
                                        className="form-control"
                                        required
                                    >
                                        <option value="">Select User</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    {errors.user_id && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.user_id}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Item Name *</label>
                                    <input
                                        type="text"
                                        value={data.item_name}
                                        onChange={(e) => setData('item_name', e.target.value)}
                                        className="form-control"
                                        placeholder="e.g., Office Chair"
                                        required
                                    />
                                    {errors.item_name && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.item_name}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input
                                        type="number"
                                        value={data.quantity}
                                        onChange={(e) => setData('quantity', e.target.value)}
                                        className="form-control"
                                        min="1"
                                        required
                                    />
                                    {errors.quantity && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.quantity}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Estimated Cost (BDT)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.estimated_cost}
                                        onChange={(e) => setData('estimated_cost', e.target.value)}
                                        className="form-control"
                                        placeholder="0.00"
                                    />
                                    {errors.estimated_cost && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.estimated_cost}</p>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Reason / Purpose *</label>
                                <textarea
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    className="form-control"
                                    rows="2"
                                    placeholder="Why do you need this item?"
                                    required
                                />
                                {errors.reason && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.reason}</p>}
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Approval Status</label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="form-control"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="purchased">Purchased</option>
                                </select>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Requisition'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}