import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage} from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

export default function Index({ assets = { data: [], links: [] }, users = [], accounts = [], filters = {} }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => filters.search || new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(filters.per_page) || Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        asset_code: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
        account_id: '',
        assigned_to: '',
        assigned_date: '',
        condition: 'new'
    });

    // --- Live Search & Pagination Sync ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;

            router.get(
                route('admin.assets.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const assetList = assets.data || [];

    // --- Export Tools ---
    const handleCopy = () => {
        if (!assetList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = assetList
            .map((a) => `${a.name}\t${a.asset_code}\t${a.serial_number || '-'}\t${a.assignee?.name || 'Unassigned'}\t${a.purchase_price || '0'}\t${a.condition?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!assetList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Asset Name,Asset Code,Serial Number,Assigned To,Purchase Price,Condition\n"];
        const rows = assetList.map(a => `"${a.name}","${a.asset_code}","${a.serial_number || ''}","${a.assignee?.name || ''}","${a.purchase_price || '0'}","${a.condition}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Asset_Register_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Asset Register</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; } /* Hide Actions */
                    </style>
                </head>
                <body>
                    <h2>Company Asset Register</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            account_id: '',
            name: '',
            asset_code: '',
            serial_number: '',
            purchase_date: '',
            purchase_price: '',
            assigned_to: '',
            assigned_date: '',
            condition: 'new' 
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (record) => {
        clearErrors();
        setData({
            id: record.id,
            name: record.name || '',
            asset_code: record.asset_code || '',
            serial_number: record.serial_number || '',
            purchase_date: record.purchase_date || '',
            purchase_price: record.purchase_price || '',
            account_id: record.account_id || '',
            assigned_to: record.assigned_to || '',
            assigned_date: record.assigned_date || '',
            condition: record.condition || 'new'
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (record) => {
        setSelectedRecord(record);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.assets.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.assets.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Asset Added Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: "This asset record will be permanently deleted! If it has a linked purchase cost, that amount will be refunded to the account.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.assets.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "The asset has been deleted.", timer: 1500, showConfirmButton: false }),
                });
            }
        });
    };

    // Condition Styling Generator
    const getConditionStyles = (condition) => {
        const styles = {
            new: { bg: '#dcfce7', color: '#15803d', label: 'New' },
            good: { bg: '#e0f2fe', color: '#0369a1', label: 'Good' },
            damaged: { bg: '#fee2e2', color: '#b91c1c', label: 'Damaged' },
            under_repair: { bg: '#fef9c3', color: '#a16207', label: 'Under Repair' }
        };
        return styles[condition] || { bg: '#f1f5f9', color: '#475569', label: condition };
    };

    // React-Select Custom Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "38px", borderRadius: "6px",
            border: state.isFocused ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
            "&:hover": { borderColor: "#94a3b8" },
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 8px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "0.875rem" }),
        singleValue: (provided) => ({ ...provided, color: "#1e293b", fontSize: "0.875rem" }),
        option: (provided, state) => ({
            ...provided, fontSize: "0.875rem",
            backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff",
            color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer",
        }),
    };

    return (
        <AdminLayout>
            <Head title="Asset Management" />

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>

                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Asset Management</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Track company assets, assignments, and purchase costs.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>

                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-boxes-stacked" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Asset Records
                        </div>
                        {hasPermission('create_asset') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add Asset
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
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search name or asset code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ASSET</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>SERIAL NO</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ASSIGNED TO</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>PURCHASE PRICE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>CONDITION</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {assetList.length > 0 ? (
                                    assetList.map((record, index) => {
                                        const conditionStyle = getConditionStyles(record.condition);
                                        return (
                                            <tr key={record.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {assets.from ? assets.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{record.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{record.asset_code}</div>
                                                </td>
                                                <td style={{ padding: "16px 24px", color: '#475569' }}>{record.serial_number || '-'}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '500', color: '#1f2937' }}>{record.assignee?.name || 'Unassigned'}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                                                    {record.purchase_price ? `TK. ${parseFloat(record.purchase_price).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: 'uppercase',
                                                        background: conditionStyle.bg,
                                                        color: conditionStyle.color
                                                    }}>
                                                        {conditionStyle.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        {hasPermission('view_asset') && (
                                                        <button onClick={() => openViewModal(record)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('edit_asset') && (
                                                        <button onClick={() => openEditModal(record)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('delete_asset') && (
                                                        <button onClick={() => handleDelete(record.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No asset records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {assets.total > 0 && `Showing ${assets.from || 0} to ${assets.to || 0} of ${assets.total || 0} entries`}
                            </div>

                            {assets.links && assets.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {assets.links.map((link, index) => (
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

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedRecord && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-regular fa-address-card" style={{ marginRight: "8px", color: "#2563eb" }}></i> Asset Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                    {selectedRecord.name}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>{selectedRecord.asset_code}</div>
                                <span style={{
                                    background: getConditionStyles(selectedRecord.condition).bg,
                                    color: getConditionStyles(selectedRecord.condition).color,
                                    padding: '5px 14px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "10px", display: "inline-block"
                                }}>
                                    {getConditionStyles(selectedRecord.condition).label}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "10px" }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Serial Number</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}><i className="fa-solid fa-barcode text-rose-500" style={{ marginRight: "6px" }}></i>{selectedRecord.serial_number || "-"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Assigned To</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}><i className="fa-solid fa-user text-emerald-500" style={{ marginRight: "6px" }}></i>{selectedRecord.assignee?.name || "Unassigned"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Purchase Date</span>
                                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}><i className="fa-regular fa-calendar text-blue-500" style={{ marginRight: "6px" }}></i>{selectedRecord.purchase_date || '-'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Purchase Price</span>
                                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}>{selectedRecord.purchase_price ? `৳ ${parseFloat(selectedRecord.purchase_price).toLocaleString('en-IN')}` : "N/A"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Paid From Account</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}>{selectedRecord.account?.name || "N/A"}</div>
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Asset" : "✨ Add New Asset"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Asset Name *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} required />
                                    {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Asset Code *</label>
                                    <input type="text" value={data.asset_code} onChange={e => setData('asset_code', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} required />
                                    {errors.asset_code && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.asset_code}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Serial Number</label>
                                    <input type="text" value={data.serial_number} onChange={e => setData('serial_number', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} />
                                    {errors.serial_number && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.serial_number}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Condition *</label>
                                    <select value={data.condition} onChange={e => setData('condition', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required>
                                        <option value="new">New</option>
                                        <option value="good">Good</option>
                                        <option value="damaged">Damaged</option>
                                        <option value="under_repair">Under Repair</option>
                                    </select>
                                    {errors.condition && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.condition}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Purchase Date</label>
                                    <input type="date" value={data.purchase_date} onChange={e => setData('purchase_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} />
                                    {errors.purchase_date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.purchase_date}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Purchase Price</label>
                                    <input type="number" step="0.01" value={data.purchase_price} onChange={e => setData('purchase_price', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} />
                                    {errors.purchase_price && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.purchase_price}</p>}
                                </div>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Paid From Account</label>
                                <Select
                                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${a.current_balance})` }))}
                                    value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${a.current_balance})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                    onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                    placeholder="-- Select Account --" isSearchable isClearable styles={selectStyles}
                                />
                                {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Assigned To (User)</label>
                                    <Select
                                        options={users?.map(u => ({ value: u.id, label: u.name })) || []}
                                        value={users?.map(u => ({ value: u.id, label: u.name })).find(opt => opt.value === data.assigned_to) || null}
                                        onChange={option => setData('assigned_to', option ? option.value : '')}
                                        styles={selectStyles}
                                        isClearable
                                        placeholder="Select a user..."
                                    />
                                    {errors.assigned_to && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.assigned_to}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Assigned Date</label>
                                    <input type="date" value={data.assigned_date} onChange={e => setData('assigned_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px" }} />
                                    {errors.assigned_date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.assigned_date}</p>}
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? 'Saving...' : (editMode ? 'Update Asset' : 'Save Asset')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}