import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ permissions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search Setup (অন্যান্য পেজের মতো) ---
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

    // --- ওপেন ক্রিয়েট মোড ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    // --- ওপেন এডিট মোড ---
    const openEditModal = (permission) => {
        clearErrors(); 
        setData({
            id: permission?.id || '', 
            name: permission?.name || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    // --- ফর্ম সাবমিট ---
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

    // --- পারমিশন ডিলিট ---
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
                        Dashboard / <span>Permission List</span>
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

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>PERMISSION NAME</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.length > 0 ? (
                                permissions.map((permission, index) => (
                                    <tr key={permission.id}>
                                        <td>{index + 1}</td>
                                        <td style={{ fontWeight: '600', color: '#334155' }}>{permission.name}</td>
                                        <td><span className="status-active">Active</span></td>
                                        <td>
                                            <div className="action-btns">
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
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No permissions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* โมডাল সেকশন */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-header">
                            {editMode ? 'Edit Permission Name' : 'Add New Permission'}
                        </h3>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Permission Identifier</label>
                                <input 
                                    type="text" 
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    className="form-control" 
                                    placeholder="e.g., edit articles" 
                                    required
                                />
                                {errors.name && <p className="error-text">{errors.name}</p>}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}