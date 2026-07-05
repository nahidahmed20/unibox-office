import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ leaves = [], users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', user_id: '', type: 'Casual', start_date: '', end_date: '', total_days: 1, reason: '', status: 'pending'
    });

    // Auto Calculate Total Days
    useEffect(() => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            const timeDiff = end.getTime() - start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end day
            setData('total_days', daysDiff > 0 ? daysDiff : 0);
        }
    }, [data.start_date, data.end_date]);

    // Handle Search & Pagination
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            
            router.get(route('admin.leaves.index'), params, { preserveState: true, replace: true }); 
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = leaves
            .map(lv => `${lv.user?.name}\t${lv.type}\t${lv.start_date}\t${lv.end_date}\t${lv.total_days}\t${lv.status}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false });
    };

    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (leave) => {
        clearErrors(); 
        setData({ ...leave, reason: leave.reason || '' });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.leaves.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Leave application updated successfully.', timer: 1500, showConfirmButton: false }); }});
        } else {
            post(route('admin.leaves.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Created!', text: 'Leave application added successfully.', timer: 1500, showConfirmButton: false }); }});
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This leave record will be deleted!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.leaves.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false })
                }); 
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Leave Management" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Leaves</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-calendar-minus"></i> Leave Applications</div>
                        <button onClick={openCreateModal} className="add-btn">+ Apply Leave</button>
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
                            <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>EMPLOYEE</th>
                                    <th>TYPE</th>
                                    <th>START DATE</th>
                                    <th>END DATE</th>
                                    <th>DAYS</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length > 0 ? leaves.map((lv) => (
                                    <tr key={lv.id}>
                                        <td className="font-semibold">{lv.user?.name}</td>
                                        <td>{lv.type}</td>
                                        <td>{lv.start_date}</td>
                                        <td>{lv.end_date}</td>
                                        <td className="font-bold text-center bg-gray-50">{lv.total_days}</td>
                                        <td>
                                            <span className={`status-${lv.status === 'approved' ? 'active' : (lv.status === 'rejected' ? 'inactive' : 'pending')}`}>
                                                {lv.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(lv)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(lv.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="text-center py-4">No records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        
                        {/* Modified Modal Header with Cross Button */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? 'Edit Leave Application' : 'Apply for Leave'}
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
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Employee *</label>
                                    <select value={data.user_id} onChange={e => setData('user_id', e.target.value)} className="form-control" required disabled={editMode}>
                                        <option value="">Select Employee</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Leave Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} className="form-control" required>
                                        <option value="Casual">Casual Leave</option>
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Earned">Earned Leave</option>
                                        <option value="Maternity">Maternity Leave</option>
                                        <option value="Paternity">Paternity Leave</option>
                                        <option value="Unpaid">Unpaid Leave</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status *</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="form-control" required>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Start Date *</label>
                                    <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>End Date *</label>
                                    <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Total Days</label>
                                    <input type="number" value={data.total_days} className="form-control font-bold bg-gray-100" readOnly />
                                </div>
                            </div>

                            <div className="form-group mt-3">
                                <label>Reason / Comments</label>
                                <textarea value={data.reason} onChange={e => setData('reason', e.target.value)} className="form-control" rows="3"></textarea>
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing || data.total_days <= 0} className="btn-save">{processing ? 'Saving...' : 'Save Application'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}