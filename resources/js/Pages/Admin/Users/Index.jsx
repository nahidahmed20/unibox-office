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
                        Dashboard / <span>User List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-users"></i> All Users
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

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>NAME</th>
                                <th>EMAIL</th>
                                <th>ACTIVE ROLES</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user, index) => (
                                    <tr key={user.id}>
                                        <td>{index + 1}</td>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            {user.roles && user.roles.map(r => (
                                                <span key={r.id} className="status-active" style={{ marginRight: '5px' }}>
                                                    {r.name}
                                                </span>
                                            ))}
                                        </td>
                                        <td><span className="status-active">Active</span></td>
                                        <td>
                                            <div className="action-btns">
                                                {/* এডিট বাটন */}
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
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-header">
                            {editMode ? 'Modify User Profile' : 'Register New User'}
                        </h3>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input 
                                    type="text" 
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Enter name" 
                                    required
                                />
                                {errors.name && <p className="error-text">{errors.name}</p>}
                            </div>
                            
                            <div className="form-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    value={data.email} 
                                    onChange={e => setData('email', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Enter email" 
                                    required
                                />
                                {errors.email && <p className="error-text">{errors.email}</p>}
                            </div>
                            
                            <div className="form-group">
                                <label>
                                    Password {editMode && <span style={{ fontSize: '11px', color: '#999' }}>(Leave blank to keep current)</span>}
                                </label>
                                <input 
                                    type="password" 
                                    value={data.password} 
                                    onChange={e => setData('password', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Enter password" 
                                    required={!editMode} 
                                />
                                {errors.password && <p className="error-text">{errors.password}</p>}
                            </div>
                            
                            <div className="form-group">
                                <label>Assign User Roles</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
      
                                    {(roles || []).map(role => (
                                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                                            <input 
                                                type="checkbox" 
                                                checked={data.roles.includes(role.id)} 
                                                onChange={() => handleRoleCheckbox(role.id)} 
                                            />
                                            {role.name}
                                        </label>
                                    ))}
                                </div>
                                {errors.roles && <p className="error-text">{errors.roles}</p>}
                            </div>

                            <div className="modal-footer">
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