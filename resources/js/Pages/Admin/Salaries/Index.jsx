import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ salaries = [], users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(10);
    const isFirstRender = useRef(true);

    // Current Month-Year Format (e.g., 07-2026)
    const today = new Date();
    const defaultMonthYear = `${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, net_pay: 0, status: 'unpaid', payment_date: '', payment_method: ''
    });

    // Auto calculate Net Pay whenever values change
    useEffect(() => {
        const basic = parseFloat(data.basic_salary) || 0;
        const allow = parseFloat(data.allowances) || 0;
        const bns = parseFloat(data.bonus) || 0;
        const ded = parseFloat(data.deductions) || 0;
        setData('net_pay', (basic + allow + bns - ded).toFixed(2));
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions]);

    // Handle Search & Pagination
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            
            router.get(route('admin.salaries.index'), params, { preserveState: true, replace: true }); 
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        const text = salaries
            .map(sal => `${sal.month_year}\t${sal.user?.name}\t$${sal.basic_salary}\t$${sal.net_pay}\t${sal.status}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1200, showConfirmButton: false });
    };

    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (sal) => {
        clearErrors(); 
        setData({ 
            ...sal, 
            allowances: sal.allowances || 0, 
            bonus: sal.bonus || 0, 
            deductions: sal.deductions || 0,
            payment_date: sal.payment_date || '',
            payment_method: sal.payment_method || ''
        });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.salaries.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', text: 'Salary record updated successfully.', timer: 1500, showConfirmButton: false }); }});
        } else {
            post(route('admin.salaries.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Generated!', text: 'Salary processed successfully.', timer: 1500, showConfirmButton: false }); }});
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This salary record will be deleted!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete' })
        .then((res) => { 
            if (res.isConfirmed) {
                destroy(route('admin.salaries.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false })
                }); 
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Employee Salaries</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-money-check-dollar"></i> Payroll Records</div>
                        <button onClick={openCreateModal} className="add-btn">+ Process Salary</button>
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
                            <input type="text" placeholder="Search month or employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>MONTH</th>
                                    <th>EMPLOYEE</th>
                                    <th>BASIC</th>
                                    <th>NET PAY</th>
                                    <th>STATUS</th>
                                    <th>PAY DATE</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salaries.length > 0 ? salaries.map((sal) => (
                                    <tr key={sal.id}>
                                        <td className="font-bold text-gray-700">{sal.month_year}</td>
                                        <td>{sal.user?.name}</td>
                                        <td>${sal.basic_salary}</td>
                                        <td className="text-green-600 font-bold">${sal.net_pay}</td>
                                        <td>
                                            <span className={`status-${sal.status === 'paid' ? 'active' : 'pending'}`}>
                                                {sal.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{sal.payment_date || '-'}</td>
                                        <td>
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(sal)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(sal.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
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
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        
                        {/* Modified Modal Header with Cross Button */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? 'Edit Salary Record' : 'Process New Salary'}
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

                        {errors.month_year && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{errors.month_year}</div>}
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Employee *</label>
                                    <select value={data.user_id} onChange={e => setData('user_id', e.target.value)} className="form-control" required disabled={editMode}>
                                        <option value="">Select Employee</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Month-Year (MM-YYYY) *</label>
                                    <input type="text" value={data.month_year} onChange={e => setData('month_year', e.target.value)} className="form-control" placeholder="07-2026" required disabled={editMode} />
                                </div>
                                <div className="form-group">
                                    <label>Basic Salary *</label>
                                    <input type="number" step="0.01" value={data.basic_salary} onChange={e => setData('basic_salary', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Allowances</label>
                                    <input type="number" step="0.01" value={data.allowances} onChange={e => setData('allowances', e.target.value)} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Bonus</label>
                                    <input type="number" step="0.01" value={data.bonus} onChange={e => setData('bonus', e.target.value)} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Deductions</label>
                                    <input type="number" step="0.01" value={data.deductions} onChange={e => setData('deductions', e.target.value)} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Net Pay</label>
                                    <input type="text" value={data.net_pay} className="form-control bg-gray-100 font-bold text-green-700" readOnly />
                                </div>
                                <div className="form-group">
                                    <label>Status *</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="form-control" required>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                                
                                {data.status === 'paid' && (
                                    <>
                                        <div className="form-group">
                                            <label>Payment Date *</label>
                                            <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} className="form-control" required />
                                        </div>
                                        <div className="form-group">
                                            <label>Payment Method *</label>
                                            <select value={data.payment_method} onChange={e => setData('payment_method', e.target.value)} className="form-control" required>
                                                <option value="">Select Method</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">{processing ? 'Saving...' : 'Save Payroll'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}