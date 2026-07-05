import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ attendances = [], users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', user_id: '', date: new Date().toISOString().split('T')[0], check_in: '', check_out: '', status: 'present'
    });

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            
            router.get(route('admin.attendances.index'), params, { preserveState: true, replace: true }); 
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = attendances
            .map(a => `${a.date}\t${a.user?.name}\t${a.check_in || '--:--'}\t${a.check_out || '--:--'}\t${a.status}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false });
    };

    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (record) => {
        clearErrors(); 
        // HTML time input requires HH:mm format, stripping seconds if present from DB
        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';
        
        setData({ 
            id: record.id, 
            user_id: record.user_id, 
            date: record.date, 
            check_in: formatTime(record.check_in), 
            check_out: formatTime(record.check_out), 
            status: record.status 
        });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.attendances.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Attendance updated successfully.', timer: 1500, showConfirmButton: false }); }});
        } else {
            post(route('admin.attendances.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Created!', text: 'Attendance logged successfully.', timer: 1500, showConfirmButton: false }); }});
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This record will be deleted!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.attendances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false })
                }); 
            }
        });
    };

    const getStatusColor = (status) => {
        const colors = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-yellow-100 text-yellow-700', half_day: 'bg-orange-100 text-orange-700', on_leave: 'bg-blue-100 text-blue-700', holiday: 'bg-purple-100 text-purple-700' };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <AdminLayout>
            <Head title="Attendances" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Daily Attendance</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-clock"></i> Attendance Records</div>
                        <button onClick={openCreateModal} className="add-btn">+ Log Attendance</button>
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
                            <input type="text" placeholder="Search by name or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>EMPLOYEE</th>
                                    <th>CHECK IN</th>
                                    <th>CHECK OUT</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.length > 0 ? attendances.map((record) => (
                                    <tr key={record.id}>
                                        <td className="font-semibold">{record.date}</td>
                                        <td>{record.user?.name}</td>
                                        <td>{record.check_in || '--:--'}</td>
                                        <td>{record.check_out || '--:--'}</td>
                                        <td><span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>{record.status.replace('_', ' ')}</span></td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(record)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(record.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="6" className="text-center py-4">No records found.</td></tr>}
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
                                {editMode ? 'Edit Attendance' : 'Log Attendance'}
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

                        {errors.date && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{errors.date}</div>}
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Employee *</label>
                                    <select value={data.user_id} onChange={e => setData('user_id', e.target.value)} className="form-control" required disabled={editMode}>
                                        <option value="">Select Employee</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    {errors.user_id && <p className="error-text">{errors.user_id}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="form-control" required disabled={editMode} />
                                </div>
                                <div className="form-group">
                                    <label>Check In Time</label>
                                    <input type="time" value={data.check_in} onChange={e => setData('check_in', e.target.value)} className="form-control" />
                                    {errors.check_in && <p className="error-text">{errors.check_in}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Check Out Time</label>
                                    <input type="time" value={data.check_out} onChange={e => setData('check_out', e.target.value)} className="form-control" />
                                    {errors.check_out && <p className="error-text">{errors.check_out}</p>}
                                </div>
                            </div>
                            
                            <div className="form-group mt-3">
                                <label>Status *</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className="form-control" required>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="on_leave">On Leave</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">{processing ? 'Saving...' : 'Save Record'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}