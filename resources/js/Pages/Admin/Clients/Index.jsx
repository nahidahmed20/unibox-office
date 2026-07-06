import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ clients = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // --- Live Search & Pagination Setup ---
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(10); 
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        name: '',
        company_name: '',
        email: '',
        phone: '',
        address: '',
        website: ''
    });

    // --- Live Search & Entries Limit ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.clients.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]); 

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
    const openEditModal = (client) => {
        clearErrors(); 
        setData({
            id: client?.id || '', 
            name: client?.name || '',
            company_name: client?.company_name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || '',
            website: client?.website || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.clients.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire('Updated!', 'Client updated successfully.', 'success');
                }
            });
        } else {
            post(route('admin.clients.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire('Created!', 'New client added successfully.', 'success');
                }
            });
        }
    };

    // --- Client Delete ---
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This client will be temporarily deleted (soft delete)!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.clients.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Client has been removed.', 'success');
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Clients Management" />
            
            <div className="slider-page-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Clients</h1>
                    <div className="breadcrumb">
                        Dashboard / <span>Client List</span>
                    </div>
                </div>

                <div className="card-container">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fa-solid fa-users-line"></i> Client Directory
                        </div>
                        <button onClick={openCreateModal} className="add-btn">
                            + Add Client
                        </button>
                    </div>

                    <div className="table-toolbar">
                        <div className="show-entries">
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
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
                                placeholder="Search clients..." 
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
                                    <th>CLIENT NAME</th>
                                    <th>COMPANY</th>
                                    <th>EMAIL</th>
                                    <th>PHONE</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(clients.data || clients).length > 0 ? (
                                    (clients.data || clients).map((client, index) => (
                                        <tr key={client.id}>
                                            <td>{clients.from ? clients.from + index : index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#334155' }}>{client.name}</td>
                                            <td>{client.company_name || '-'}</td>
                                            <td>{client.email || '-'}</td>
                                            <td>{client.phone || '-'}</td>
                                            <td>
                                                <div className="action-btns">
                                                    <button onClick={() => openEditModal(client)} className="icon-btn edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(client.id)} className="icon-btn delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No clients found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Page Numbers (Pagination with Icons) --- */}
                    {clients.links && clients.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4 rounded-b-lg">
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{clients.from || 0}</span> to <span className="font-medium">{clients.to || 0}</span> of <span className="font-medium">{clients.total || 0}</span> entries
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        {clients.links.map((link, index) => {
                                            // 'Previous' এবং 'Next' লেখাকে FontAwesome আইকন দিয়ে রিপ্লেস করা হচ্ছে
                                            let labelContent = link.label;
                                            if (labelContent.includes('Previous')) {
                                                labelContent = '<i class="fa-solid fa-chevron-left text-[12px]"></i>';
                                            } else if (labelContent.includes('Next')) {
                                                labelContent = '<i class="fa-solid fa-chevron-right text-[12px]"></i>';
                                            }

                                            return (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    dangerouslySetInnerHTML={{ __html: labelContent }}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border ${
                                                        link.active
                                                            ? 'z-10 bg-[#008060] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008060]'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                    } ${!link.url ? 'text-gray-400 cursor-not-allowed pointer-events-none bg-gray-50' : ''}
                                                    ${index === 0 ? 'rounded-l-md' : ''} 
                                                    ${index === clients.links.length - 1 ? 'rounded-r-md' : ''}`}
                                                />
                                            );
                                        })}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- End of Pagination --- */}

                </div>
            </div>

            {/* Modal Section */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                       
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                {editMode ? "Edit Client Info" : "Add New Client"}
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
                                    <label>Client Name *</label>
                                    <input 
                                        type="text" 
                                        value={data.name} 
                                        onChange={e => setData('name', e.target.value)} 
                                        className="form-control" 
                                        placeholder="e.g., John Doe" 
                                        required
                                    />
                                    {errors.name && <p className="error-text">{errors.name}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={data.email} 
                                        onChange={e => setData('email', e.target.value)} 
                                        className="form-control" 
                                        placeholder="john@example.com" 
                                    />
                                    {errors.email && <p className="error-text">{errors.email}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Company Name</label>
                                    <input 
                                        type="text" 
                                        value={data.company_name} 
                                        onChange={e => setData('company_name', e.target.value)} 
                                        className="form-control" 
                                        placeholder="e.g., ABC Corp" 
                                    />
                                    {errors.company_name && <p className="error-text">{errors.company_name}</p>}
                                </div>

                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input 
                                        type="text" 
                                        value={data.phone} 
                                        onChange={e => setData('phone', e.target.value)} 
                                        className="form-control" 
                                        placeholder="+8801..." 
                                    />
                                    {errors.phone && <p className="error-text">{errors.phone}</p>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Website</label>
                                <input 
                                    type="url" 
                                    value={data.website} 
                                    onChange={e => setData('website', e.target.value)} 
                                    className="form-control" 
                                    placeholder="https://example.com" 
                                />
                                {errors.website && <p className="error-text">{errors.website}</p>}
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Address</label>
                                <textarea 
                                    value={data.address} 
                                    onChange={e => setData('address', e.target.value)} 
                                    className="form-control" 
                                    placeholder="Client's full address" 
                                    rows="2"
                                ></textarea>
                                {errors.address && <p className="error-text">{errors.address}</p>}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" disabled={processing} className="btn-save">
                                    {processing ? 'Saving...' : 'Save Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}