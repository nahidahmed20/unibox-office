import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ departments = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', name: '', is_active: true
    });

    // Handle Search & Pagination
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            
            router.get(route('admin.departments.index'), params, { preserveState: true, replace: true }); 
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = departments
            .map((dept, index) => `${index + 1}\t${dept.name}\t${dept.is_active ? 'Active' : 'Inactive'}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false });
    };

    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (dept) => {
        clearErrors(); 
        setData({ id: dept.id, name: dept.name, is_active: !!dept.is_active });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.departments.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Department updated successfully.', timer: 1500, showConfirmButton: false }); }});
        } else {
            post(route('admin.departments.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Created!', text: 'Department added successfully.', timer: 1500, showConfirmButton: false }); }});
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'Associated designations might be affected!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.departments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Department deleted successfully.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Departments" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Departments</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-building-user"></i> Department List</div>
                        <button onClick={openCreateModal} className="add-btn">+ Add Department</button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" className="export-btn" onClick={handleCopy}>
                                <i className="fas fa-copy me-1"></i> Copy
                            </button>
                            <button className="export-btn">
                                <i className="fas fa-file-excel me-1"></i> Excel
                            </button>
                            <button className="export-btn">
                                <i className="fas fa-file-csv me-1"></i> CSV
                            </button>
                            <button className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input type="text" placeholder="Search department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>DEPARTMENT NAME</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.length > 0 ? departments.map((dept, index) => (
                                    <tr key={dept.id}>
                                        <td>{index + 1}</td>
                                        <td className="font-bold">{dept.name}</td>
                                        <td>
                                            <span className={dept.is_active ? "status-active" : "status-inactive"}>
                                                {dept.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(dept)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(dept.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="4" className="text-center py-4">No records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        
                        {/* Modified Modal Header with Cross Button */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? 'Edit Department' : 'Add New Department'}
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
                                <label>Department Name *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="form-control" required />
                                {errors.name && <p className="error-text">{errors.name}</p>}
                            </div>
                            <div className="form-group mt-3 flex items-center">
                                <input type="checkbox" id="is_active" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="mr-2 h-4 w-4" />
                                <label htmlFor="is_active" className="mb-0">Active Department</label>
                            </div>
                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">{processing ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}