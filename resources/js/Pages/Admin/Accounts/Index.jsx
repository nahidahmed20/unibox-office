import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ accounts, totalBalance }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        return Number(
            new URLSearchParams(window.location.search).get("per_page")
        ) || 10;
    });
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '',
        type: 'cash',
        account_number: '',
        opening_balance: '',
        is_active: 1
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.accounts.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const openCreateModal = () => {
        reset(); 
        clearErrors(); 
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (acc) => {
        clearErrors(); 
        setData({
            id: acc.id, 
            name: acc.name || '',
            type: acc.type || 'cash',
            account_number: acc.account_number || '',
            opening_balance: acc.opening_balance || '',
            is_active: acc.is_active !== undefined ? acc.is_active : 1
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.accounts.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Account updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.accounts.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New account created successfully.', 'success');
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this account?',
            text: "You can only delete accounts with no transactions.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.accounts.destroy', id), {
                    onSuccess: () => Swal.fire('Deleted!', 'Account removed.', 'success'),
                    onError: () => Swal.fire('Error!', 'Cannot delete account with existing transactions.', 'error')
                });
            }
        });
    };


    return (
        <AdminLayout>
            <Head title="Accounts & Balances" />
            
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Accounts & Balances</h1>
                    <div className="breadcrumb">
                        Dashboard / Finance / <span>Accounts</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-vault"></i> Account List
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Account
                        </button>
                    </div>

                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div className="show-entries" style={{ fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                            Show
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 mx-2 text-sm focus:outline-none focus:border-blue-500">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            entries
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-700 font-medium"><i className="fas fa-copy me-1"></i> Copy</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-green-600 font-medium"><i className="fas fa-file-excel me-1"></i> Excel</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-blue-600 font-medium"><i className="fas fa-file-csv me-1"></i> CSV</button>
                            <button type="button" className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-red-600 font-medium"><i className="fas fa-file-pdf me-1"></i> PDF</button>
                            <button type="button" onClick={() => window.print()} className="export-btn px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-700 font-medium"><i className="fas fa-print me-1"></i> Print</button>
                        </div>

                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search account..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 min-w-[200px]"
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>SL</th>
                                    <th>ACCOUNT NAME</th>
                                    <th>TYPE</th>
                                    <th>A/C NUMBER</th>
                                    <th style={{ textAlign: 'right' }}>OPENING BAL.</th>
                                    <th style={{ textAlign: 'right' }}>CURRENT BAL.</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.data.length > 0 ? (
                                    accounts.data.map((acc, index) => (
                                        <tr key={acc.id}>
                                            <td>
                                                {(accounts.current_page - 1) * accounts.per_page + index + 1}
                                            </td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{acc.name}</td>
                                            <td style={{ textTransform: 'capitalize' }}>
                                                <span className={`px-2 py-1 rounded text-[11px] font-bold ${acc.type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {acc.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{acc.account_number || '-'}</td>
                                            <td style={{ textAlign: 'right', color: '#64748b' }}>{parseFloat(acc.opening_balance).toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: acc.current_balance < 0 ? '#dc2626' : '#16a34a' }}>
                                                {parseFloat(acc.current_balance).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ color: acc.is_active ? '#15803d' : '#dc2626', fontWeight: 'bold', fontSize: '12px' }}>
                                                    {acc.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                    <button onClick={() => openEditModal(acc)} className="icon-btn edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                    <button onClick={() => handleDelete(acc.id)} className="icon-btn delete"><i className="fa-regular fa-trash-can"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No accounts found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: "20px",
                                padding: "15px 0",
                                borderTop: "1px solid #e5e7eb",
                            }}>
                            <div style={{ fontSize: "14px", color: "#6b7280" }}>
                                Showing <b>{accounts.from ?? 0}</b> to <b>{accounts.to ?? 0}</b> of{" "}
                                <b>{accounts.total}</b> entries
                            </div>
                            <div style={{ fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>
                                Total Balance: ৳ {Number(totalBalance ?? 0).toLocaleString()}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                {/* Previous */}
                                <button
                                    disabled={!accounts.prev_page_url}
                                    onClick={() =>
                                        router.visit(accounts.prev_page_url, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        })
                                    }
                                    className="pagination-btn"
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>

                                {/* Page Numbers */}
                                {accounts.links
                                    .filter(
                                        (link) =>
                                            link.label !== "&laquo; Previous" &&
                                            link.label !== "Next &raquo;"
                                    )
                                    .map((link, index) => (
                                        <button
                                            key={index}
                                            disabled={!link.url}
                                            onClick={() =>
                                                link.url &&
                                                router.visit(link.url, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                })
                                            }
                                            className={`pagination-btn ${
                                                link.active ? "active-page" : ""
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}

                                {/* Next */}
                                <button
                                    disabled={!accounts.next_page_url}
                                    onClick={() =>
                                        router.visit(accounts.next_page_url, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        })
                                    }
                                    className="pagination-btn"
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>

            {/* Modal Section */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Update Account' : 'Create New Account'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label>Account Name *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="form-control" placeholder="e.g. Main Cash, DBBL Bank" required />
                                {errors.name && <p className="error-text text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="form-group">
                                    <label>Account Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} className="form-control" required>
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank Account</option>
                                        <option value="mobile_banking">Mobile Banking</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>A/C Number (Optional)</label>
                                    <input type="text" value={data.account_number} onChange={e => setData('account_number', e.target.value)} className="form-control" placeholder="If bank/mobile" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Opening Balance</label>
                                    <input type="number" step="0.01" value={data.opening_balance} onChange={e => setData('opening_balance', e.target.value)} className="form-control" disabled={editMode} placeholder="0.00" />
                                    {editMode && <p style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Opening balance cannot be edited later.</p>}
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={data.is_active} onChange={e => setData('is_active', e.target.value)} className="form-control">
                                        <option value={1}>Active</option>
                                        <option value={0}>Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}