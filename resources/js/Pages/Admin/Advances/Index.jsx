import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ advances = [], filters = {} }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        given_to: '', 
        amount: '', 
        date: '', 
        purpose: 'Office Purpose', 
        status: 'unsettled',
        notes: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.advances.index'), 
                { search: searchTerm }, 
                { preserveState: true, replace: true }
            );
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleCopy = () => {
        const table = document.querySelector('.data-table');
        if (!table) return;
        navigator.clipboard.writeText(table.innerText).then(() => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Data copied!', showConfirmButton: false, timer: 2000 });
        });
    };

    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors(); 
        setData({
            id: adv.id,
            given_to: adv.given_to,
            amount: adv.amount,
            date: adv.date,
            purpose: adv.purpose || '',
            status: adv.status || 'unsettled',
            notes: adv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.advances.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Advance record updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.advances.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Logged!', 'New advance payment logged.', 'success');
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
                destroy(route('admin.advances.destroy', id), {
                    onSuccess: () => Swal.fire('Deleted!', 'Record removed.', 'success')
                });
            }
        });
    };

    const totalUnsettled = advances.filter(a => a.status === 'unsettled').reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            
            <div className="slider-page-wrapper">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Advance Payments</h1>
                        <div className="breadcrumb">Dashboard / Finance / <span>Advances</span></div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#b91c1c', padding: '10px 15px', background: '#fee2e2', borderRadius: '5px' }}>
                        Total Unsettled: BDT {totalUnsettled.toLocaleString('en-IN')}
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-hand-holding-dollar"></i> Employee & Vendor Advances
                        </div>
                        <button onClick={openCreateModal} className="add-btn">+ Log Advance</button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show <select defaultValue="10"><option value="10">10</option><option value="25">25</option></select> entries
                        </div>
                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn" onClick={handleCopy}><i className="fas fa-copy me-1"></i> Copy</button>
                            <button type="button" className="export-btn" onClick={() => window.print()}><i className="fas fa-print me-1"></i> Print</button>
                        </div>
                        <div className="search-box">
                            <input type="text" placeholder="Search name or purpose..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>GIVEN TO</th>
                                    <th>PURPOSE</th>
                                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advances.length > 0 ? advances.map((adv) => (
                                    <tr key={adv.id}>
                                        <td>{adv.date}</td>
                                        <td style={{ fontWeight: '600', color: '#334155' }}>{adv.given_to}</td>
                                        <td>{adv.purpose}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0f766e' }}>
                                            {parseFloat(adv.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                                background: adv.status === 'settled' ? '#dcfce7' : '#fee2e2', 
                                                color: adv.status === 'settled' ? '#15803d' : '#b91c1c' 
                                            }}>
                                                {adv.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                <button onClick={() => openEditModal(adv)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                <button onClick={() => handleDelete(adv.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No advance records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Update Advance Info' : 'Log Advance Payment'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Given To (Name) *</label>
                                    <input type="text" value={data.given_to} onChange={e => setData('given_to', e.target.value)} className="form-control" placeholder="e.g. Employee or Vendor Name" required />
                                    {errors.given_to && <p className="error-text">{errors.given_to}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Amount (BDT) *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={e => setData('amount', e.target.value)} className="form-control" required />
                                    {errors.amount && <p className="error-text">{errors.amount}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="form-control" required />
                                </div>
                                <div className="form-group">
                                    <label>Purpose</label>
                                    <input type="text" value={data.purpose} onChange={e => setData('purpose', e.target.value)} className="form-control" placeholder="e.g. Office Shopping" />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Status</label>
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className="form-control">
                                    <option value="unsettled">Unsettled (Not adjusted yet)</option>
                                    <option value="settled">Settled (Adjusted / Bill Submitted)</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Notes</label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} className="form-control" rows="2" placeholder="Any details..."></textarea>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}