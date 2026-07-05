import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ invoices = [], clients = [], projects = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', client_id: '', project_id: '', invoice_number: '', invoice_date: '', 
        due_date: '', sub_total: 0, tax: 0, discount: 0, grand_total: 0, status: 'unpaid', notes: ''
    });

    // Auto calculate grand total
    useEffect(() => {
        const sub = parseFloat(data.sub_total) || 0;
        const tx = parseFloat(data.tax) || 0;
        const disc = parseFloat(data.discount) || 0;
        const taxAmount = (sub * tx) / 100;
        setData('grand_total', (sub + taxAmount - disc).toFixed(2));
    }, [data.sub_total, data.tax, data.discount]);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { router.get(route('admin.invoices.index'), { search: searchTerm }, { preserveState: true, replace: true }); }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);


    const openCreateModal = () => { reset(); clearErrors(); setEditMode(false); setShowModal(true); };
    
    const openEditModal = (inv) => {
        clearErrors(); 
        setData({ ...inv, project_id: inv.project_id || '', notes: inv.notes || '' });
        setEditMode(true); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) put(route('admin.invoices.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire('Updated!', 'Invoice updated.', 'success'); }});
        else post(route('admin.invoices.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire('Created!', 'Invoice generated.', 'success'); }});
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Invoice?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })
        .then((res) => { if (res.isConfirmed) destroy(route('admin.invoices.destroy', id)); });
    };

    return (
        <AdminLayout>
            <Head title="Invoices" />
            <div className="slider-page-wrapper">
                <div className="page-header"><h1 className="page-title">Invoices</h1></div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title"><i className="fa-solid fa-file-invoice"></i> Billing & Invoices</div>
                        <button onClick={openCreateModal} className="add-btn">+ Generate Invoice</button>
                    </div>

                    <div className="table-toolbar">
                        <div className="search-box"><input type="text" placeholder="Search invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>INV #</th>
                                    <th>CLIENT</th>
                                    <th>DATE</th>
                                    <th>AMOUNT</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="font-bold text-blue-600">{inv.invoice_number}</td>
                                        <td>{inv.client?.name}</td>
                                        <td>{inv.invoice_date}</td>
                                        <td className="font-semibold">${inv.grand_total}</td>
                                        <td><span className={`status-${inv.status === 'paid' ? 'active' : (inv.status === 'overdue' ? 'inactive' : 'pending')}`}>{inv.status.toUpperCase()}</span></td>
                                        <td>
                                            <div className="action-btns">
                                                {/* Print Button */}
                                                <a 
                                                    href={route('admin.invoices.print', inv.id)} 
                                                    target="_blank" 
                                                    className="icon-btn print text-green-600 mx-2"
                                                    title="Print Invoice"
                                                >
                                                    <i className="fa-solid fa-print"></i>
                                                </a>

                                                {/* Existing Edit and Delete Buttons */}
                                                <button onClick={() => openEditModal(inv)} className="icon-btn edit">
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>
                                                <button onClick={() => handleDelete(inv.id)} className="icon-btn delete">
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Invoice" : "Add New Invoice"}
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
                                    <label>Invoice Number *</label>
                                    <input type="text" value={data.invoice_number} onChange={e => setData('invoice_number', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Client *</label>
                                    <select value={data.client_id} onChange={e => setData('client_id', e.target.value)} className="form-control" required>
                                        <option value="">Select Client</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Invoice Date *</label>
                                    <input type="date" value={data.invoice_date} onChange={e => setData('invoice_date', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input type="date" value={data.due_date} onChange={e => setData('due_date', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Sub Total *</label>
                                    <input type="number" step="0.01" value={data.sub_total} onChange={e => setData('sub_total', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Tax (%)</label>
                                    <input type="number" step="0.01" value={data.tax} onChange={e => setData('tax', e.target.value)} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Discount (Fixed Amount)</label>
                                    <input type="number" step="0.01" value={data.discount} onChange={e => setData('discount', e.target.value)} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Grand Total</label>
                                    <input type="number" value={data.grand_total} className="form-control bg-gray-100 font-bold" readOnly />
                                </div>
                                <div className="form-group">
                                    <label>Status *</label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="form-control">
                                        <option value="unpaid">Unpaid</option>
                                        <option value="partially_paid">Partially Paid</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="modal-footer mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">{processing ? 'Saving...' : 'Save Invoice'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}