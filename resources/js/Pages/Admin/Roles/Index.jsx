import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ roles = [], permissions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search Setup (Users পেজের মতো) ---
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '', 
        permissions: [] // এখানে Permission ID ট্র্যাক হবে
    });

    // --- Live Search ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.roles.index'), 
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
    const openEditModal = (role) => {
        clearErrors(); 
        setData({
            id: role?.id || '', 
            name: role?.name || '', 
            permissions: role?.permissions ? role.permissions.map(p => p.id) : []
        });
        setEditMode(true); 
        setShowModal(true);
    };

    // --- পারমিশন চেকবক্স হ্যান্ডলার (ID ভিত্তিক) ---
    const handleCheckboxChange = (permissionId) => {
        if (data.permissions.includes(permissionId)) {
            setData('permissions', data.permissions.filter(id => id !== permissionId));
        } else {
            setData('permissions', [...data.permissions, permissionId]);
        }
    };

    // --- ফর্ম সাবমিট ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.roles.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Role & Permissions updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.roles.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New role created successfully.', 'success');
                }
            });
        }
    };

    // --- রোল ডিলিট ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This role will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.roles.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Role has been removed.', 'success');
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Roles Management" />
            
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Roles & Permissions</h1>
                    <div className="breadcrumb">
                        Dashboard / <span>Role List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-user-shield"></i> All Roles
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Create Role
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
                                placeholder="Search roles..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ROLE TITLE</th>
                                <th>ASSIGNED PERMISSIONS</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.length > 0 ? (
                                roles.map((role, index) => (
                                    <tr key={role.id}>
                                        <td>{index + 1}</td>
                                        <td style={{ fontWeight: '600' }}>{role.name}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                {role.name === 'Super Admin' ? (
                                                    <span className="status-active" style={{ background: '#f3e8ff', color: '#6b21a8', border: 'none' }}>
                                                        All Access (Root Bypass)
                                                    </span>
                                                ) : (
                                                    role?.permissions?.map(p => (
                                                        <span key={p.id} className="status-active" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                                                            {p.name}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td><span className="status-active">Active</span></td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(role)} className="icon-btn edit">
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>
                                                {role.name !== 'Super Admin' && (
                                                    <button onClick={() => handleDelete(role.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No roles found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* โมডাল সেকশন (Users পেজের কাস্টম ক্লাসেস দিয়ে সাজানো) */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-header">
                            {editMode ? 'Modify Role & Permissions' : 'Create New Role'}
                        </h3>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Role Identifier / Name</label>
                                <input 
                                    type="text" 
                                    disabled={data.name === 'Super Admin'}
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    className="form-control" 
                                    placeholder="e.g., Manager" 
                                    required
                                />
                                {errors.name && <p className="error-text">{errors.name}</p>}
                            </div>
                            
                            {data.name !== 'Super Admin' && (
                                <div className="form-group">
                                    <label>Check Allowed Permissions</label>
                                    {/* চেকবক্সের গ্রিড লেআউট ডিজাইন */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                                        {(permissions || []).map(p => (
                                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.permissions.includes(p.id)} 
                                                    onChange={() => handleCheckboxChange(p.id)} 
                                                />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                    {errors.permissions && <p className="error-text">{errors.permissions}</p>}
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}