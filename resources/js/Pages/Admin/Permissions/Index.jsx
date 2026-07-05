import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ permissions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search Setup ---
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: ''
    });

    // --- Live Search ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.permissions.index'), 
                { search: searchTerm }, 
                { preserveState: true, replace: true }
            );
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // --- Copy Table Data ---
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

    // --- Open Create Modal ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    // --- Open Edit Modal ---
    const openEditModal = (permission) => {
        clearErrors(); 
        setData({
            id: permission?.id || '', 
            name: permission?.name || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.permissions.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Permission updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.permissions.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New permission added successfully.', 'success');
                }
            });
        }
    };

    // --- Delete Permission ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This permission will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.permissions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Permission has been removed.', 'success');
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Permissions Management" />
            
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Permissions</h1>
                    <div className="breadcrumb">
                        Dashboard / System Settings / <span>Permission List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-key"></i> System Capabilities
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Permission
                        </button>
                    </div>

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
                            <button type="button" className="export-btn">
                                <i className="fas fa-file-pdf me-1"></i> PDF
                            </button>
                            <button type="button" className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search permissions..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>PERMISSION NAME</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.length > 0 ? (
                                    permissions.map((permission, index) => (
                                        <tr key={permission.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{permission.name}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: '#dcfce7', color: '#15803d' }}>
                                                    Active
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                    <button onClick={() => openEditModal(permission)} className="icon-btn edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(permission.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No permissions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Section */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        
                        {/* Custom Modal Header with Close Button */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Edit Permission Name' : 'Add New Permission'}
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
                                <label>Permission Identifier *</label>
                                <input 
                                    type="text" 
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    className="form-control" 
                                    placeholder="e.g., create_users, edit_invoices" 
                                    required
                                />
                                {errors.name && <p className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Permission'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}