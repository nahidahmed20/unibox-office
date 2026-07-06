import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 

export default function Index({ clients = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false); 
    
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
        setViewMode(false);
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
        setViewMode(false);
        setShowModal(true);
    };

    // --- Open View Modal ---
    const openViewModal = (client) => {
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
        setEditMode(false); 
        setViewMode(true);
        setShowModal(true);
    };

    // --- Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (viewMode) return; 

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
                                                    <button onClick={() => openViewModal(client)} className="icon-btn view"  title="View">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    <button onClick={() => openEditModal(client)} className="icon-btn edit" title="Edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(client.id)} className="icon-btn delete" title="Delete">
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
                                Showing <b>{clients.from ?? 0}</b> to <b>{clients.to ?? 0}</b> of{" "}
                                <b>{clients.total}</b> entries
                            </div>
    
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                <button
                                    disabled={!clients.prev_page_url}
                                    onClick={() => router.visit(clients.prev_page_url, { preserveState: true, preserveScroll: true })}
                                    className="pagination-btn"
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
    
                                {clients.links
                                    .filter(link => link.label !== "&laquo; Previous" && link.label !== "Next &raquo;")
                                    .map((link, index) => (
                                        <button
                                            key={index}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: true })}
                                            className={`pagination-btn ${link.active ? "active-page" : ""}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
    
                                <button
                                    disabled={!clients.next_page_url}
                                    onClick={() => router.visit(clients.next_page_url, { preserveState: true, preserveScroll: true })}
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
                       
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
                                {viewMode ? "Client Information" : editMode ? "Edit Client Info" : "Add New Client"}
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                title="Close"
                            >
                                &times;
                            </button>
                        </div>
                        
                        {/* VIEW MODE LAYOUT (Modern Shopify Style) */}
                        {viewMode ? (
                            <div className="view-details" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Client Name</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a', fontWeight: '500' }}>{data.name || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email Address</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0ea5e9' }}>{data.email ? <a href={`mailto:${data.email}`} style={{ textDecoration: 'none', color: 'inherit' }}>{data.email}</a> : '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Company Name</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>{data.company_name || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Phone Number</span>
                                        <span style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>{data.phone || '-'}</span>
                                    </div>
                                </div>
                                
                                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '20px', marginTop: '4px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Website</span>
                                    <span style={{ display: 'block', fontSize: '15px', color: '#0ea5e9' }}>
                                        {data.website ? <a href={data.website} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{data.website}</a> : '-'}
                                    </span>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Address</span>
                                    <span style={{ display: 'block', fontSize: '15px', color: '#0f172a', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        {data.address || 'No address provided.'}
                                    </span>
                                </div>

                                <div className="modal-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)} 
                                        style={{ padding: '6px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#e2e8f0'; e.target.style.color = '#0f172a'; }}
                                        onMouseLeave={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.color = '#475569'; }}
                                    >
                                        Close 
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ADD/EDIT MODE FORM */
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Client Name *</label>
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
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Email Address</label>
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
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Company Name</label>
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
                                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Phone Number</label>
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
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Website</label>
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
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Address</label>
                                    <textarea 
                                        value={data.address} 
                                        onChange={e => setData('address', e.target.value)} 
                                        className="form-control" 
                                        placeholder="Client's full address" 
                                        rows="2"
                                    ></textarea>
                                    {errors.address && <p className="error-text">{errors.address}</p>}
                                </div>

                                <div className="modal-footer" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel" style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={processing} className="btn-save" style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                        {processing ? 'Saving...' : 'Save Client'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}