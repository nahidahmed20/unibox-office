import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ project_expenses = [], projects = [], categories = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        project_id: '',
        expense_category_id: '',
        title: '', 
        vendor_name: '',
        total_bill: '',
        paid_amount: '',
        date: '',
        description: ''
    });

    // --- Auto Calculate Due & Status in UI ---
    const calculateDue = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        return (bill - paid).toFixed(2);
    };

    const calculateStatus = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        if (bill > 0 && paid >= bill) return 'PAID';
        if (paid > 0 && paid < bill) return 'PARTIAL';
        return 'DUE';
    };

    // --- Live Search ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.project-expenses.index'), 
                { search: searchTerm }, 
                { preserveState: true, replace: true }
            );
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors(); 
        setData({
            id: expense.id, 
            project_id: expense.project_id || '',
            expense_category_id: expense.expense_category_id || '',
            title: expense.title || '', 
            vendor_name: expense.vendor_name || '',
            total_bill: expense.total_bill || '',
            paid_amount: expense.paid_amount || '',
            date: expense.date || '',
            description: expense.description || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.project-expenses.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Expense updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.project-expenses.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'Project expense logged successfully.', 'success');
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this record?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.project-expenses.destroy', id), {
                    onSuccess: () => Swal.fire('Deleted!', 'Record removed.', 'success')
                });
            }
        });
    };

    // Total Aggregations
    const totalBilled = project_expenses.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalDue = project_expenses.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Project Expenses & Payables" />
            
            <div className="slider-page-wrapper">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Project Accounts Payable</h1>
                        <div className="breadcrumb">
                            Dashboard / Projects / <span>Expenses</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#008060', padding: '10px 15px', background: '#e8f5e9', borderRadius: '5px' }}>
                            Total Billed: BDT {totalBilled.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#dc2626', padding: '10px 15px', background: '#fef2f2', borderRadius: '5px' }}>
                            Total Due: BDT {totalDue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-wallet"></i> Vendor Bills & Project Cost
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Log Bill/Expense
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show <select defaultValue="10"><option value="10">10</option><option value="25">25</option></select> entries
                        </div>
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search vendor or project..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>PROJECT & DETAILS</th>
                                    <th>VENDOR / PAYEE</th>
                                    <th style={{ textAlign: 'right' }}>TOTAL BILL</th>
                                    <th style={{ textAlign: 'right' }}>PAID</th>
                                    <th style={{ textAlign: 'right' }}>DUE</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project_expenses.length > 0 ? (
                                    project_expenses.map((exp) => (
                                        <tr key={exp.id}>
                                            <td style={{ fontSize: '13px' }}>{exp.date}</td>
                                            <td>
                                                <div style={{ fontWeight: '600', color: '#334155' }}>{exp.project?.name || 'N/A'}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{exp.title}</div>
                                            </td>
                                            <td style={{ fontWeight: '500' }}>{exp.vendor_name || '-'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(exp.total_bill).toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>{parseFloat(exp.paid_amount).toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>{parseFloat(exp.due_amount).toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                                    background: exp.payment_status === 'paid' ? '#dcfce7' : (exp.payment_status === 'partial' ? '#fef08a' : '#fee2e2'), 
                                                    color: exp.payment_status === 'paid' ? '#15803d' : (exp.payment_status === 'partial' ? '#a16207' : '#b91c1c') 
                                                }}>
                                                    {exp.payment_status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                    <button onClick={() => openEditModal(exp)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                    <button onClick={() => handleDelete(exp.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No project expenses found.</td>
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
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Update Bill/Expense' : 'Log New Bill/Expense'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Select Project *</label>
                                    <select value={data.project_id} onChange={e => setData('project_id', e.target.value)} className="form-control" required>
                                        <option value="">-- Choose Project --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {errors.project_id && <p className="error-text">{errors.project_id}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Expense Category *</label>
                                    <select value={data.expense_category_id} onChange={e => setData('expense_category_id', e.target.value)} className="form-control" required>
                                        <option value="">-- Choose Category --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {errors.expense_category_id && <p className="error-text">{errors.expense_category_id}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>Expense Title / Subject *</label>
                                    <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} className="form-control" placeholder="e.g., Domain Purchase" required />
                                    {errors.title && <p className="error-text">{errors.title}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Vendor / Contractor Name</label>
                                    <input type="text" value={data.vendor_name} onChange={e => setData('vendor_name', e.target.value)} className="form-control" placeholder="e.g., Mr. Rahim or IT Host" />
                                    {errors.vendor_name && <p className="error-text">{errors.vendor_name}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Total Bill (BDT) *</label>
                                    <input type="number" step="0.01" value={data.total_bill} onChange={e => setData('total_bill', e.target.value)} className="form-control" required />
                                    {errors.total_bill && <p className="error-text">{errors.total_bill}</p>}
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold', color: '#16a34a' }}>Paid Amount (BDT) *</label>
                                    <input type="number" step="0.01" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} className="form-control" required />
                                    {errors.paid_amount && <p className="error-text">{errors.paid_amount}</p>}
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold', color: '#dc2626' }}>Calculated Due</label>
                                    <input type="text" value={calculateDue()} disabled className="form-control" style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#dc2626' }} />
                                    <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>STATUS: {calculateStatus()}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="form-control" required />
                                    {errors.date && <p className="error-text">{errors.date}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Remarks / Notes</label>
                                    <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} className="form-control" placeholder="Optional notes..." />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Bill'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}