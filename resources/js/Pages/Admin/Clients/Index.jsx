import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link , usePage} from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ clients = { data: [], links: [] } }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });

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

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route('admin.clients.index'), params, {
                preserveState: true,
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Copy Data ---
    const handleCopy = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = clients.data
            .map((c) => `${c.name}\t${c.company_name || "N/A"}\t${c.email || "N/A"}\t${c.phone || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    // --- Export CSV ---
    const handleExportCSV = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Client Name,Company,Email,Phone,Website,Address\n"];
        const rows = clients.data.map(c => `"${c.name}","${c.company_name || ''}","${c.email || ''}","${c.phone || ''}","${c.website || ''}","${c.address || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Clients_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    // --- Custom Full Screen Print ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open(
            '', 
            '_blank', 
            `width=${window.screen.width},height=${window.screen.height},top=0,left=0`
        );
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Clients Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; }
                        /* Hide Actions Column */
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Clients Directory Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        
        setData({
            id: '',
            name: '',
            company_name: '',
            email: '',
            phone: '',
            address: '',
            website: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

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

    const openViewModal = (client) => {
        setSelectedClient(client);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.clients.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.clients.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This client will be deleted permanently!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.clients.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Client removed successfully.", timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Clients Management" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Client Workspace</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage, track and communicate with your clients.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-users" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Client Directory
                        </div>
                        {hasPermission('create_client') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add New Client
                        </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" className="export-btn" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" className="export-btn" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" className="export-btn" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Client Details</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Contact Info</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Address</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {clients.data && clients.data.length > 0 ? (
                                    clients.data.map((client, index) => (
                                        <tr key={client.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {clients.from ? clients.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{client.name}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}><i className="fa-regular fa-building me-1"></i> {client.company_name || "No Company"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ color: "#0ea5e9", fontSize: "0.875rem" }}>{client.email || "-"}</div>
                                                <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: "2px" }}>{client.phone || "-"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ fontSize: "0.875rem", color: "#475569" }}>{client.address ? client.address.substring(0, 30) + '...' : "-"}</div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                    {hasPermission('view_clients') && (
                                                    <button onClick={() => openViewModal(client)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('edit_client') && (
                                                    <button onClick={() => openEditModal(client)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Client">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                    <button onClick={() => handleDelete(client.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Client">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No clients found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {clients.links && clients.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                Showing {clients.from || 0} to {clients.to || 0} of {clients.total || 0} entries
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {clients.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        style={{ 
                                            padding: "6px 12px", 
                                            border: "1px solid #cbd5e1", 
                                            borderRadius: "6px", 
                                            fontSize: "0.875rem", 
                                            color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), 
                                            backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), 
                                            pointerEvents: link.url ? "auto" : "none", 
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minWidth: "32px"
                                        }} 
                                        preserveState
                                    >
                                        {link.label.includes("Previous") ? (
                                            <i className="fa-solid fa-chevron-left"></i>
                                        ) : link.label.includes("Next") ? (
                                            <i className="fa-solid fa-chevron-right"></i>
                                        ) : (
                                            link.label.replace("&laquo;", "").replace("&raquo;", "")
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedClient && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-address-card" style={{ marginRight: "8px", color: "#2563eb" }}></i> Client Profile
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Client Name</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedClient.name}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Company Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-regular fa-building text-amber-500" style={{ marginRight: "6px" }}></i>{selectedClient.company_name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Email Address</span>
                                    <div style={{ fontWeight: "600", color: "#0ea5e9" }}><i className="fa-regular fa-envelope" style={{ marginRight: "6px" }}></i>{selectedClient.email || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Phone Number</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-solid fa-phone text-emerald-500" style={{ marginRight: "6px" }}></i>{selectedClient.phone || "N/A"}</div>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Website</span>
                                    <div style={{ color: "#2563eb", fontWeight: "500" }}>
                                        <i className="fa-solid fa-globe" style={{ marginRight: "6px" }}></i>
                                        {selectedClient.website ? <a href={selectedClient.website} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{selectedClient.website}</a> : "N/A"}
                                    </div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Physical Address</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    <i className="fa-solid fa-location-dot text-rose-500" style={{ marginRight: "6px" }}></i>
                                    {selectedClient.address || "No address provided."}
                                </div>
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close Profile</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Update Client Details" : "✨ Register New Client"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Client Name *</label>
                                    <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="e.g. John Doe" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                    {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Company Name</label>
                                    <input type="text" value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} placeholder="e.g. ABC Corp" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.company_name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.company_name}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Email Address</label>
                                    <input type="email" value={data.email} onChange={(e) => setData("email", e.target.value)} placeholder="john@example.com" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.email}</p>}
                                </div>
                                <div style={{ gridColumn: "span 1" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Phone Number</label>
                                    <input type="text" value={data.phone} onChange={(e) => setData("phone", e.target.value)} placeholder="+8801..." style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.phone && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.phone}</p>}
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Website URL</label>
                                    <input type="url" value={data.website} onChange={(e) => setData("website", e.target.value)} placeholder="https://example.com" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} />
                                    {errors.website && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.website}</p>}
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Full Address</label>
                                    <textarea value={data.address} onChange={(e) => setData("address", e.target.value)} placeholder="Client's physical address" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }} rows="2"></textarea>
                                    {errors.address && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.address}</p>}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Saving Changes..." : "Save Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}