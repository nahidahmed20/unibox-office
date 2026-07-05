import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ investments = [], filters = {} }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search Setup ---
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        amount: '', 
        investor_name: '', 
        investment_date: '', 
        purpose: 'Office Purpose', 
        notes: ''
    });

    // --- Live Search ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.investments.index'), 
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

    // --- Open Create Modal ---
    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    // --- Open Edit Modal ---
    const openEditModal = (inv) => {
        clearErrors(); 
        setData({
            id: inv.id,
            amount: inv.amount,
            investor_name: inv.investor_name,
            investment_date: inv.investment_date,
            purpose: inv.purpose || 'Office Purpose',
            notes: inv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.investments.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Investment updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.investments.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New investment added successfully.', 'success');
                }
            });
        }
    };

    // --- Delete Investment ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This investment record will be deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.investments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Record has been removed.', 'success');
                    }
                });
            }
        });
    };

    // Total Calculation
    const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return (
        <AdminLayout>
            <Head title="Investments Management" />
            
            <div className="slider-page-wrapper">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Investments</h1>
                        <div className="breadcrumb">
                            Dashboard / <span>Investment List</span>
                        </div>
                    </div>
                    {/* Total Capital display matching header style */}
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#008060', padding: '10px 15px', background: '#e8f5e9', borderRadius: '5px' }}>
                        Total Capital: ${totalInvestment.toFixed(2)}
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-money-bill-trend-up"></i> Capital & Investments Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Log Investment
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show 
                            <select defaultValue="10">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
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
                            <button type="button" className="export-btn" onClick={() => window.print()}>
                                <i className="fas fa-print me-1"></i> Print
                            </button>
                        </div>

                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search by name or purpose..." 
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
                                    <th>INVESTOR NAME</th>
                                    <th>DATE</th>
                                    <th>PURPOSE</th>
                                    <th>AMOUNT</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.length > 0 ? (
                                    investments.map((inv, index) => (
                                        <tr key={inv.id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{inv.investor_name}</td>
                                            <td>{inv.investment_date}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                                                    background: inv.purpose === 'Work Purpose' ? '#e0f2fe' : '#dcfce7', 
                                                    color: inv.purpose === 'Work Purpose' ? '#0369a1' : '#15803d' 
                                                }}>
                                                    {inv.purpose}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: '#008060' }}>
                                                ${parseFloat(inv.amount).toFixed(2)}
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button onClick={() => openEditModal(inv)} className="icon-btn edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(inv.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No investment records found.</td>
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
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3 className="modal-header">
                            {editMode ? 'Edit Investment Info' : 'Log New Investment'}
                        </h3>
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Investor Name *</label>
                                    <input 
                                        type="text" 
                                        value={data.investor_name} 
                                        onChange={e => setData('investor_name', e.target.value)} 
                                        className="form-control" 
                                        placeholder="e.g., John Doe" 
                                        required
                                    />
                                    {errors.investor_name && <p className="error-text">{errors.investor_name}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Amount ($) *</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.amount} 
                                        onChange={e => setData('amount', e.target.value)} 
                                        className="form-control" 
                                        placeholder="0.00" 
                                        required
                                    />
                                    {errors.amount && <p className="error-text">{errors.amount}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Investment Date *</label>
                                    <input 
                                        type="date" 
                                        value={data.investment_date} 
                                        onChange={e => setData('investment_date', e.target.value)} 
                                        className="form-control" 
                                        required
                                    />
                                    {errors.investment_date && <p className="error-text">{errors.investment_date}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Purpose *</label>
                                    <select 
                                        value={data.purpose} 
                                        onChange={e => setData('purpose', e.target.value)} 
                                        className="form-control"
                                    >
                                        <option value="Office Purpose">Office Purpose</option>
                                        <option value="Work Purpose">Work Purpose</option>
                                        <option value="Other Purpose">Other Purpose</option>
                                    </select>
                                    {errors.purpose && <p className="error-text">{errors.purpose}</p>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Notes</label>
                                <textarea 
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Any additional details..." 
                                    rows="2"
                                ></textarea>
                                {errors.notes && <p className="error-text">{errors.notes}</p>}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Investment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}