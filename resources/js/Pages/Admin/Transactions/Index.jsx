import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ transactions = [], accounts = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        account_id: '',
        type: 'credit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.transactions.index'), 
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

    const openEditModal = (trx) => {
        clearErrors();
        setData({
            id: trx.id,
            account_id: trx.account_id || '',
            type: trx.type || 'credit',
            amount: trx.amount || '',
            transaction_date: trx.transaction_date || '',
            description: trx.description || '',
            reference_number: trx.reference_number || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.transactions.update', data.id), { 
                onSuccess: () => { 
                    setShowModal(false); 
                    Swal.fire('Updated!', 'Transaction updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.transactions.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Success!', 'Manual transaction added successfully.', 'success');
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This will reverse the amount in your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.transactions.destroy', id), {
                    onSuccess: () => Swal.fire('Deleted!', 'Transaction removed and balance restored.', 'success'),
                    onError: () => Swal.fire('Error!', 'Cannot delete auto-generated transactions.', 'error')
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Transactions Ledger" />
            
            <div className="slider-page-wrapper">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Transaction Ledger</h1>
                        <div className="breadcrumb">
                            Dashboard / Finance / <span>Transactions</span>
                        </div>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-money-bill-transfer"></i> All Transactions
                        </div>
                        <button onClick={openCreateModal} className="add-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            <i className="fa-solid fa-plus mr-1"></i> Manual Entry
                        </button>
                    </div>

                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div className="show-entries" style={{ fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                            Show
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 mx-2 text-sm focus:outline-none focus:border-blue-500">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
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
                                placeholder="Search by description or ref..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 min-w-[220px]"
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>ACCOUNT</th>
                                    <th>DESCRIPTION & REF</th>
                                    <th style={{ textAlign: 'center' }}>TYPE</th>
                                    <th style={{ textAlign: 'right' }}>AMOUNT (IN/OUT)</th>
                                    <th style={{ textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map((trx) => (
                                        <tr key={trx.id}>
                                            <td style={{ fontSize: '13px', color: '#64748b' }}>{trx.transaction_date}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{trx.account?.name || 'Deleted Account'}</td>
                                            <td>
                                                <div style={{ fontSize: '13px', color: '#1f2937' }}>{trx.description}</div>
                                                {trx.reference_number && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ref: {trx.reference_number}</div>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
                                                    background: trx.type === 'credit' ? '#dcfce7' : '#fee2e2', 
                                                    color: trx.type === 'credit' ? '#15803d' : '#b91c1c' 
                                                }}>
                                                    {trx.type === 'credit' ? 'Deposit' : 'Expense/Withdraw'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: trx.type === 'credit' ? '#16a34a' : '#dc2626' }}>
                                                {trx.type === 'credit' ? '+' : '-'}{parseFloat(trx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {!trx.transactionable_id ? (
                                                    <div className="action-btns" style={{ justifyContent: 'center' }}>
                                                        <button onClick={() => openEditModal(trx)} className="icon-btn edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(trx.id)} className="icon-btn delete">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>AUTO GENERATED</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No transactions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Manual Transaction Entry */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                                {editMode ? 'Edit Manual Transaction' : 'Manual Transaction Entry'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="form-group">
                                    <label>Select Account *</label>
                                    <select value={data.account_id} onChange={e => setData('account_id', e.target.value)} className="form-control" required>
                                        <option value="">-- Choose Account --</option>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Bal: ${acc.current_balance})</option>)}
                                    </select>
                                    {errors.account_id && <p className="error-text text-red-500 text-xs mt-1">{errors.account_id}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Transaction Type *</label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)} className="form-control" required>
                                        <option value="credit">Deposit / In (Credit)</option>
                                        <option value="debit">Withdrawal / Out (Debit)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input type="number" step="0.01" value={data.amount} onChange={e => setData('amount', e.target.value)} className="form-control" required />
                                    {errors.amount && <p className="error-text text-red-500 text-xs mt-1">{errors.amount}</p>}
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={data.transaction_date} onChange={e => setData('transaction_date', e.target.value)} className="form-control" required />
                                </div>
                            </div>

                            <div className="form-group mb-3">
                                <label>Description / Reason *</label>
                                <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} className="form-control" placeholder="e.g. Added capital, Bank charge" required />
                            </div>

                            <div className="form-group">
                                <label>Reference Number (Optional)</label>
                                <input type="text" value={data.reference_number} onChange={e => setData('reference_number', e.target.value)} className="form-control" placeholder="Cheque No, Txn ID, etc." />
                            </div>

                            <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save bg-blue-600 hover:bg-blue-700">
                                    {processing ? 'Processing...' : (editMode ? 'Update Entry' : 'Submit Entry')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}