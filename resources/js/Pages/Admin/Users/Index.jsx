import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ users = [], roles = [] }) { 
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '', 
        email: '', 
        password: '', 
        roles: [] 
    });

    // --- Live Search ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.users.index'), 
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

    // --- Modal Controls ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true); 
    };

    const openEditModal = (user) => {
        clearErrors(); 
        setData({
            id: user?.id || '', 
            name: user?.name || '', 
            email: user?.email || '', 
            password: '', 
            roles: user?.roles ? user.roles.map(r => r.id) : [] 
        });
        setEditMode(true); 
        setShowModal(true); 
    };

    const handleRoleCheckbox = (roleId) => {
        if (data.roles.includes(roleId)) {
            setData('roles', data.roles.filter(id => id !== roleId));
        } else {
            setData('roles', [...data.roles, roleId]);
        }
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.users.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'User profile has been updated.', 'success');
                }
            });
        } else {
            post(route('admin.users.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New user has been registered successfully.', 'success');
                }
            });
        }
    };

    // --- Delete User ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This user will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.users.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'User has been removed successfully.', 'success');
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="System Users" />
            
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Users</h1>
                    <div className="breadcrumb">
                        Dashboard / System Settings / <span>User List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-users"></i> All Users Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add User
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
                                placeholder="Search users..." 
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
                                    <th>NAME</th>
                                    <th>EMAIL</th>
                                    <th>ACTIVE ROLES</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map((user, index) => (
                                        <tr key={user.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                {user.roles && user.roles.map(r => (
                                                    <span 
                                                        key={r.id} 
                                                        style={{ 
                                                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', 
                                                            background: '#e0e7ff', color: '#4338ca', marginRight: '6px', display: 'inline-block', marginBottom: '2px' 
                                                        }}
                                                    >
                                                        {r.name}
                                                    </span>
                                                ))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: '#dcfce7', color: '#15803d' }}>
                                                    Active
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                    <button onClick={() => openEditModal(user)} className="icon-btn edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(user.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No users found.</td>
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
                    <div className="modal-content" style={{ maxWidth: '550px' }}>
                        
                        {/* Custom Modal Header Provided By User */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Modify User Profile" : "Register New User"}
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
                                    <label>Full Name *</label>
                                    <input 
                                        type="text" 
                                        value={data.name} 
                                        onChange={e => setData('name', e.target.value)} 
                                        className="form-control" 
                                        placeholder="Enter name" 
                                        required
                                    />
                                    {errors.name && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.name}</p>}
                                </div>
                                
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input 
                                        type="email" 
                                        value={data.email} 
                                        onChange={e => setData('email', e.target.value)} 
                                        className="form-control" 
                                        placeholder="Enter email" 
                                        required
                                    />
                                    {errors.email && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.email}</p>}
                                </div>
                            </div>
                            
                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>
                                    Password {editMode && <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>(Leave blank to keep current)</span>}
                                </label>
                                <input 
                                    type="password" 
                                    value={data.password} 
                                    onChange={e => setData('password', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Enter password" 
                                    required={!editMode} 
                                />
                                {errors.password && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.password}</p>}
                            </div>
                            
                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Assign User Roles</label>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                    {(roles || []).map(role => (
                                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={data.roles.includes(role.id)} 
                                                onChange={() => handleRoleCheckbox(role.id)} 
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {role.name}
                                        </label>
                                    ))}
                                </div>
                                {errors.roles && <p className="error-text" style={{ color: 'red', fontSize: '12px' }}>{errors.roles}</p>}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}