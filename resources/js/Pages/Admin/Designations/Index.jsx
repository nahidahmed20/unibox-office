import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ designations = [], departments = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', department_id: '', name: ''
    });

    // Handle Search & Pagination
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            
            router.get(route('admin.designations.index'), params, { preserveState: true, replace: true }); 
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = designations
            .map((desig, index) => `${index + 1}\t${desig.name}\t${desig.department?.name || ''}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false });
    };

    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (desig) => {
        clearErrors(); 
        setData({ id: desig.id, department_id: desig.department_id, name: desig.name });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.designations.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Designation updated successfully.', timer: 1500, showConfirmButton: false }); }});
        } else {
            post(route('admin.designations.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Created!', text: 'Designation added successfully.', timer: 1500, showConfirmButton: false }); }});
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This designation will be deleted!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.designations.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Designation deleted successfully.', timer: 1500, showConfirmButton: false })
                });
            } 
        });
    };

    return (
        <AdminLayout>
            <Head title="Designations" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Designations</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-user-tie"></i> Designation List</div>
                        <button onClick={openCreateModal} className="add-btn">+ Add Designation</button>
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
                            <input type="text" placeholder="Search designation or dept..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>DESIGNATION</th>
                                    <th>DEPARTMENT</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {designations.length > 0 ? designations.map((desig, index) => (
                                    <tr key={desig.id}>
                                        <td>{index + 1}</td>
                                        <td className="font-bold text-gray-800">{desig.name}</td>
                                        <td><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-medium">{desig.department?.name}</span></td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(desig)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(desig.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
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
                                {editMode ? 'Edit Designation' : 'Add New Designation'}
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
                                <label>Department *</label>
                                <select value={data.department_id} onChange={e => setData('department_id', e.target.value)} className="form-control" required>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                {errors.department_id && <p className="error-text">{errors.department_id}</p>}
                            </div>
                            <div className="form-group mt-3">
                                <label>Designation Name *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="form-control" placeholder="e.g. Software Engineer" required />
                                {errors.name && <p className="error-text">{errors.name}</p>}
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