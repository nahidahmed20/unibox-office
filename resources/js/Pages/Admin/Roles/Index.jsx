import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ roles = [], permissions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search Setup ---
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '', 
        permissions: [] 
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

    // --- Open Create Modal ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    // --- Open Edit Modal ---
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

    // --- Permission Checkbox Handler ---
    const handleCheckboxChange = (permissionId) => {
        if (data.permissions.includes(permissionId)) {
            setData('permissions', data.permissions.filter(id => id !== permissionId));
        } else {
            setData('permissions', [...data.permissions, permissionId]);
        }
    };

    // --- Form Submit ---
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

    // --- Delete Role ---
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
                        Dashboard / System Settings / <span>Role List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-user-shield"></i> All System Roles
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
                                placeholder="Search roles..." 
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
                                    <th>ROLE TITLE</th>
                                    <th>ASSIGNED PERMISSIONS</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.length > 0 ? (
                                    roles.map((role, index) => (
                                        <tr key={role.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{role.name}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {role.name === 'Super Admin' ? (
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', 
                                                            background: '#f3e8ff', color: '#7e22ce' 
                                                        }}>
                                                            <i className="fa-solid fa-star me-1"></i> All Access (Root Bypass)
                                                        </span>
                                                    ) : (
                                                        role?.permissions?.map(p => (
                                                            <span key={p.id} style={{ 
                                                                padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', 
                                                                background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' 
                                                            }}>
                                                                {p.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: '#dcfce7', color: '#15803d' }}>
                                                    Active
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
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
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No roles found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        
                        {/* Custom Modal Header Provided By User */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Modify Role & Permissions' : 'Create New Role'}
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
                                <label>Role Identifier / Title *</label>
                                <input 
                                    type="text" 
                                    disabled={data.name === 'Super Admin'}
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    className="form-control" 
                                    placeholder="e.g., Manager, Editor, HR" 
                                    required
                                />
                                {errors.name && <p className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>}
                            </div>
                            
                            {data.name !== 'Super Admin' && (
                                <div className="form-group" style={{ marginTop: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px' }}>Assign Allowed Permissions</label>
                                    <div style={{ 
                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px', 
                                        background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '6px', 
                                        maxHeight: '250px', overflowY: 'auto' 
                                    }}>
                                        {(permissions || []).map(p => (
                                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', margin: 0, fontWeight: '500', color: '#374151' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.permissions.includes(p.id)} 
                                                    onChange={() => handleCheckboxChange(p.id)}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                    {errors.permissions && <p className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.permissions}</p>}
                                </div>
                            )}

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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