import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select'; 

export default function Index({ invoices = { data: [], links: [] }, clients = [], projects = [], nextInvoiceNumber }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);

    const [availableAdvance, setAvailableAdvance] = useState(0);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "",
        client_id: "",
        invoice_number: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        tax: 0,
        discount: 0,
        sub_total: 0,
        grand_total: 0,
        use_advance_amount: 0,
        status: "unpaid",
        notes: "",
        items: [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
    });

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "38px", 
            borderRadius: "6px",
            border: state.isFocused ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
            "&:hover": { borderColor: "#94a3b8" },
            fontSize: "0.875rem",
            background: "#fff",
            padding: "2px 0px"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 8px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "0.875rem" }),
        singleValue: (provided) => ({ ...provided, color: "#334155", fontSize: "0.875rem" }),
        option: (provided, state) => ({
            ...provided, fontSize: "0.875rem",
            backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff",
            color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    const clientOptions = clients.map(c => ({
        value: c.id,
        label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`,
        advance: Number(c.available_advance || 0)
    }));

    const statusOptions = [
        { value: "unpaid", label: "Unpaid" },
        { value: "partially_paid", label: "Partially Paid" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" }
    ];

    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({
        value: p.id,
        label: p.title
    }));

    const addItem = () => {
        setData("items", [...data.items, { project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
    };

    const removeItem = (index) => {
        const rows = [...data.items];
        rows.splice(index, 1);
        setData("items", rows);
    };

    const updateItem = (index, field, value) => {
        const rows = [...data.items];
        rows[index][field] = value;
        if (field === "quantity" || field === "unit_price") {
            rows[index].total = (Number(rows[index].quantity) || 0) * (Number(rows[index].unit_price) || 0);
        }
        setData("items", rows);
    };

    // Auto Calculations: Overwrite Prevention Fixed!
    useEffect(() => {
        let subtotal = 0;
        data.items.forEach(item => { subtotal += Number(item.total); });
        
        const taxAmount = (subtotal * Number(data.tax)) / 100;
        const grand = subtotal + taxAmount - Number(data.discount);

        setData(prev => {
            // Prevent overriding the advance unless it strictly exceeds the grand total
            let validAdvanceUsed = Number(prev.use_advance_amount) || 0;
            if (validAdvanceUsed > grand) validAdvanceUsed = grand;
            
            // Only update state if values actually changed to prevent loop/overrides
            if (prev.sub_total !== subtotal || prev.grand_total !== grand || prev.use_advance_amount !== validAdvanceUsed) {
                return {
                    ...prev,
                    sub_total: subtotal,
                    grand_total: grand,
                    use_advance_amount: validAdvanceUsed
                };
            }
            return prev;
        });
    }, [data.items, data.tax, data.discount]); 

    const handleAdvanceChange = (e) => {
        let val = Number(e.target.value);
        if (val > data.grand_total) val = data.grand_total;
        if (val > availableAdvance) val = availableAdvance;
        setData("use_advance_amount", val);
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            router.get(route('admin.invoices.index'), params, { preserveState: true, replace: true }); 
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const openCreateModal = () => { 
        reset(); 
        clearErrors(); 
        setEditingInvoice(null);
        setAvailableAdvance(0);
        setEditMode(false); 
        setData("invoice_number", nextInvoiceNumber || ""); 
        setShowModal(true); 
    };
    
    const openEditModal = (inv) => {
        clearErrors(); 
        setEditingInvoice(inv);
        
        // Exact 20,000 (or whatever was used) comes from backend
        const advanceUsedByThisInvoice = Number(inv.advance_used) || 0;
        
        const selectedClient = clients.find(c => c.id === inv.client_id);
        const currentAvailable = selectedClient ? Number(selectedClient.available_advance || 0) : 0;
        
        setAvailableAdvance(currentAvailable + advanceUsedByThisInvoice);
        
        setData({ 
            id: inv.id,
            client_id: inv.client_id || '',
            invoice_number: inv.invoice_number || '',
            invoice_date: inv.invoice_date || '',
            due_date: inv.due_date || '',
            sub_total: inv.sub_total || 0,
            tax: inv.tax || 0,
            discount: inv.discount || 0,
            grand_total: inv.grand_total || 0,
            use_advance_amount: advanceUsedByThisInvoice, // 20,000 will be set here
            status: inv.status || 'unpaid',
            notes: inv.notes || '',
            items: inv.items?.length > 0
                ? inv.items.map(item => ({
                    project_id: item.project_id || "",
                    description: item.description || "",
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || 0,
                    total: item.total || 0,
                }))
                : [{
                    project_id: "",
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    total: 0,
                }]
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openViewModal = (inv) => { 
        setSelectedInvoice(inv); 
        setShowViewModal(true); 
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) return Swal.fire("Required", "Please select a client.", "warning");

        if (editMode) {
            put(route('admin.invoices.update', data.id), { 
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.invoices.store'), { 
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Generated Successfully!', timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ 
            title: 'Delete Invoice?', 
            text: 'This will also restore any applied advance back to the client!', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete' 
        }).then((res) => { 
            if (res.isConfirmed) destroy(route('admin.invoices.destroy', id), { 
                preserveScroll: true,
                onSuccess: () => Swal.fire({ icon: "success", title: "Deleted & Refunded!", timer: 1500, showConfirmButton: false })
            }); 
        });
    };

    const getStatusStyle = (status) => {
        const styles = { 
            paid: { bg: '#dcfce7', text: '#15803d', label: 'Paid' },
            unpaid: { bg: '#f1f5f9', text: '#475569', label: 'Unpaid' },
            partially_paid: { bg: '#fef3c7', text: '#b45309', label: 'Partially Paid' },
            overdue: { bg: '#fee2e2', text: '#b91c1c', label: 'Overdue' }
        };
        return styles[status] || { bg: '#f1f5f9', text: '#475569', label: status };
    };

    const invList = invoices.data || [];

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Billing & Invoices</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage client invoices, monitor dues, and record payments.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: "8px", color: "#3b82f6" }}></i> All Invoices
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Generate Invoice
                        </button>
                    </div>

                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                            </select>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input 
                                type="text" 
                                placeholder="Search INV # or Client..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} 
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>INV #</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>CLIENT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>AMOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const status = getStatusStyle(inv.status);
                                    return (
                                        <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                {invoices.from ? invoices.from + index : index + 1}
                                            </td>
                                            <td style={{ padding: "16px 24px", fontWeight: '700', color: '#2563eb' }}>{inv.invoice_number}</td>
                                            <td style={{ padding: "16px 24px", fontWeight: '600', color: '#0f172a' }}>{inv.client?.name || 'N/A'}</td>
                                            <td style={{ padding: "16px 24px", color: "#64748b" }}>{inv.invoice_date}</td>
                                            <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                                TK. {parseFloat(inv.grand_total).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", background: status.bg, color: status.text }}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                    <button onClick={() => openViewModal(inv)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View">
                                                        <i className="fa-regular fa-eye"></i>
                                                    </button>
                                                    <a 
                                                        href={route('admin.invoices.print', inv.id)} 
                                                        style={{ background: "#faf5ff", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#a855f7", textDecoration: "none" }} 
                                                        title="Print" 
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <i className="fa-solid fa-print"></i>
                                                    </a>
                                                    <button onClick={() => openEditModal(inv)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(inv.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No invoices found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {invoices.total > 0 && `Showing ${invoices.from || 0} to ${invoices.to || 0} of ${invoices.total || 0} entries`}
                            </div>
                            {invoices.links && invoices.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {invoices.links.map((link, index) => (
                                        <Link 
                                            key={index} 
                                            href={link.url || "#"} 
                                            style={{ 
                                                padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", 
                                                color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), 
                                                backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), 
                                                pointerEvents: link.url ? "auto" : "none", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px"
                                            }} 
                                            preserveState
                                        >
                                            {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedInvoice && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-file-invoice" style={{ marginRight: "8px", color: "#2563eb" }}></i> Invoice Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div style={{ padding: "24px", maxHeight: "75vh", overflowY: "auto" }}>
                            
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#0f172a" }}>
                                    TK. {parseFloat(selectedInvoice.grand_total).toLocaleString('en-IN')}
                                </div>
                                <span style={{ background: getStatusStyle(selectedInvoice.status).bg, color: getStatusStyle(selectedInvoice.status).text, padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "8px", display: "inline-block" }}>
                                    {getStatusStyle(selectedInvoice.status).label}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Invoice Number</span>
                                    <div style={{ fontWeight: "700", color: "#2563eb" }}>{selectedInvoice.invoice_number}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Client</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-regular fa-user text-slate-400" style={{ marginRight: "6px" }}></i>{selectedInvoice.client?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Issue Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar text-slate-400" style={{ marginRight: "6px" }}></i>{selectedInvoice.invoice_date}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Due Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-check text-rose-400" style={{ marginRight: "6px" }}></i>{selectedInvoice.due_date}</div>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginBottom: "16px" }}>
                                <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "0.95rem", fontWeight: "600" }}>Items Overview</h4>
                                {selectedInvoice.items?.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px dashed #e2e8f0", fontSize: "0.9rem" }}>
                                        <div>
                                            <strong style={{ color: "#334155" }}>{item.description}</strong>
                                            {item.project && <span style={{ display: "block", color: "#64748b", fontSize: "0.75rem", marginTop: "4px" }}><i className="fa-solid fa-briefcase me-1"></i> {item.project.title}</span>}
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{item.quantity} x TK {item.unit_price}</span> <br/>
                                            <strong style={{ color: "#0f172a" }}>TK {item.total}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.95rem", color: "#334155" }}>
                                <div style={{ width: "270px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Sub Total:</span> <span>TK {selectedInvoice.sub_total}</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Tax:</span> <span>{selectedInvoice.tax}%</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span>Discount:</span> <span style={{ color: "#ef4444" }}>- TK {selectedInvoice.discount}</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #e2e8f0", paddingTop: "10px", marginTop: "4px", fontWeight: "700", color: "#2563eb", fontSize: "1.1rem" }}>
                                        <span>Grand Total:</span> <span>TK {selectedInvoice.grand_total}</span>
                                    </div>
                                    
                                    {(Number(selectedInvoice.advance_used) > 0) && (
                                        <>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontWeight: "600", color: "#059669", fontSize: "0.95rem" }}>
                                                <span>Advance Applied:</span> <span>- TK {Number(selectedInvoice.advance_used)}</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: "10px", marginTop: "4px", fontWeight: "800", color: "#dc2626", fontSize: "1.1rem" }}>
                                                <span>Payable Due:</span> <span>TK {Number(selectedInvoice.grand_total) - Number(selectedInvoice.advance_used)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "1000px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden", maxHeight: "95vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Invoice" : "✨ Generate New Invoice"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Client *</label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(opt => opt.value === data.client_id) || null}
                                        onChange={(selected) => {
                                            const clientId = selected ? selected.value : "";
                                            let advance = selected ? Number(selected.advance) : 0;
                                            
                                            let prevUsedAdvance = 0;
                                            if (editMode && editingInvoice && clientId === editingInvoice.client_id) {
                                                prevUsedAdvance = Number(editingInvoice.advance_used || 0);
                                                advance += prevUsedAdvance;
                                            }

                                            setAvailableAdvance(advance);
                                            
                                            setData(prev => ({
                                                ...prev,
                                                client_id: clientId,
                                                use_advance_amount: prevUsedAdvance,
                                                items: [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
                                            }));
                                        }}
                                        placeholder="Search & Select Client..."
                                        isSearchable
                                        isClearable
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {errors.client_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.client_id}</span>}
                                    
                                    {availableAdvance > 0 && (
                                        <div style={{ fontSize: "0.80rem", color: "#047857", marginTop: "8px", background: "#ecfdf5", padding: "6px 10px", borderRadius: "6px", border: "1px solid #a7f3d0", display: "inline-block" }}>
                                            <i className="fa-solid fa-wallet me-1"></i> Available Advance: <strong style={{ marginLeft: "4px" }}>TK. {availableAdvance.toLocaleString('en-IN')}</strong>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Invoice Number *</label>
                                    <input type="text" value={data.invoice_number} onChange={(e) => setData("invoice_number", e.target.value)} readOnly={!editMode} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: !editMode ? "#f8fafc" : "#fff", fontWeight: "600", color: "#334155" }} />
                                    {errors.invoice_number && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.invoice_number}</span>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Invoice Date *</label>
                                    <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }} required />
                                    {errors.invoice_date && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.invoice_date}</span>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Due Date *</label>
                                    <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }} required />
                                    {errors.due_date && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.due_date}</span>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Status *</label>
                                    <Select
                                        options={statusOptions}
                                        value={statusOptions.find(opt => opt.value === data.status) || null}
                                        onChange={(selected) => setData("status", selected ? selected.value : "")}
                                        isSearchable={true}
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {errors.status && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.status}</span>}
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h4 style={{ margin: 0, color: "#334155", fontWeight: "600", fontSize: "1.05rem" }}><i className="fa-solid fa-list-check me-2 text-slate-400"></i>Line Items</h4>
                                    <button type="button" onClick={addItem} style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}>
                                        <i className="fa-solid fa-plus me-1"></i> Add Item
                                    </button>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 0.8fr 1.2fr 1.2fr 40px", gap: "10px", padding: "0 12px", marginBottom: "8px", fontWeight: "700", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>
                                    <div>Project</div>
                                    <div>Description</div>
                                    <div>Qty</div>
                                    <div>Unit Price</div>
                                    <div style={{ textAlign: "right" }}>Total</div>
                                    <div></div>
                                </div>

                                {data.items.map((item, index) => (
                                    <div key={index} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 0.8fr 1.2fr 1.2fr 40px", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "10px", border: "1px solid #f1f5f9" }}>
                                        <Select
                                            options={projectOptions}
                                            value={projectOptions.find(opt => opt.value === item.project_id) || null}
                                            onChange={(selected) => updateItem(index, "project_id", selected ? selected.value : "")}
                                            placeholder="Search Project..."
                                            isSearchable
                                            isClearable
                                            styles={{
                                                ...selectStyles, 
                                                control: (base, state) => ({ ...selectStyles.control(base, state), minHeight: "36px" })
                                            }}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        <input type="text" placeholder="Item description" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", width: "100%", fontSize: "0.85rem" }} required />
                                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", width: "100%", fontSize: "0.85rem" }} required />
                                        <input type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", width: "100%", fontSize: "0.85rem" }} required />
                                        <div style={{ textAlign: "right", fontWeight: "700", alignSelf: "center", color: "#334155", fontSize: "0.95rem" }}>{(item.total || 0).toLocaleString('en-IN')}</div>
                                        <button type="button" onClick={() => removeItem(index)} disabled={data.items.length === 1} style={{ background: "none", border: "none", color: data.items.length === 1 ? "#cbd5e1" : "#ef4444", cursor: data.items.length === 1 ? "not-allowed" : "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove">
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                ))}
                                {errors.items && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>{errors.items}</span>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Notes / Terms & Conditions</label>
                                    <textarea rows="4" value={data.notes} onChange={(e) => setData("notes", e.target.value)} placeholder="Write note here..." style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical", outline: "none", fontSize: "0.875rem", color: "#334155" }}></textarea>
                                </div>

                                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center", fontSize: "0.9rem" }}>
                                        <span style={{ color: "#475569", fontWeight: "600" }}>Sub Total:</span> 
                                        <strong style={{ fontSize: "1.05rem", color: "#334155" }}>TK. {(data.sub_total || 0).toLocaleString('en-IN')}</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center", fontSize: "0.9rem" }}>
                                        <span style={{ color: "#475569", fontWeight: "600" }}>Tax (%):</span> 
                                        <input type="number" min="0" value={data.tax} onChange={(e) => setData("tax", e.target.value)} style={{ width: "90px", textAlign: "right", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px", outline: "none" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center", fontSize: "0.9rem" }}>
                                        <span style={{ color: "#475569", fontWeight: "600" }}>Discount (TK):</span> 
                                        <input type="number" min="0" value={data.discount} onChange={(e) => setData("discount", e.target.value)} style={{ width: "90px", textAlign: "right", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 8px", outline: "none" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px dashed #cbd5e1", paddingTop: "16px", fontSize: "1.15rem", fontWeight: "800", color: "#1e293b" }}>
                                        <span>Grand Total:</span> 
                                        <span style={{ color: "#2563eb" }}>TK. {(data.grand_total || 0).toLocaleString('en-IN')}</span>
                                    </div>

                                    {availableAdvance > 0 && (
                                        <div style={{ marginTop: "24px", padding: "16px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px" }}>
                                            <span style={{ fontSize: "0.85rem", color: "#047857", fontWeight: "700", display: "block", marginBottom: "12px" }}>
                                                <i className="fa-solid fa-wallet" style={{ marginRight: "6px" }}></i> 
                                                Advance Available: TK. {availableAdvance.toLocaleString('en-IN')}
                                            </span>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: data.use_advance_amount > 0 ? "12px" : "0" }}>
                                                <span style={{ fontSize: "0.85rem", color: "#065f46", fontWeight: "600" }}>Apply to Invoice:</span>
                                                <input 
                                                    type="number" min="0" max={Math.min(availableAdvance, data.grand_total)}
                                                    value={data.use_advance_amount} onChange={handleAdvanceChange} 
                                                    style={{ width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #10b981", textAlign: "right", fontWeight: "700", color: "#047857", outline: "none" }} 
                                                />
                                            </div>
                                            {data.use_advance_amount > 0 && (
                                                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px dashed #6ee7b7", fontWeight: "800", fontSize: "1.05rem", color: "#dc2626" }}>
                                                    <span>Payable Due:</span>
                                                    <span>TK. {(data.grand_total - data.use_advance_amount).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "600" }}>Dismiss</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? "Processing..." : (editMode ? "Update Invoice" : "Generate Invoice")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}