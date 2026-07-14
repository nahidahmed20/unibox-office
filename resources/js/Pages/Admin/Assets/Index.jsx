import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Index({ assets = { data: [], links: [] }, users = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        asset_code: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
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

    // Handle both paginated object or flat array
    const recordList = assets.data || (Array.isArray(assets) ? assets : []);

    // --- Export Tools ---
    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map((a) => `${a.asset_code}\t${a.name}\t${a.condition}\t${a.assignee?.name || "Unassigned"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const rows = [
            ['Code', 'Name', 'Condition', 'Assigned'],
            ...recordList.map(a => [
                a.asset_code,
                a.name,
                a.condition,
                a.assignee?.name ?? 'Unassigned'
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Assets_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExcel = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            recordList.map(a => ({
                Code: a.asset_code,
                Name: a.name,
                Condition: a.condition?.replace('_', ' ').toUpperCase(),
                Assigned: a.assignee?.name ?? 'Unassigned'
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Assets");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Assets_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePDF = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Code', 'Name', 'Condition', 'Assigned']],
            body: recordList.map(a => [
                a.asset_code,
                a.name,
                a.condition?.replace('_', ' ').toUpperCase(),
                a.assignee?.name ?? 'Unassigned'
            ])
        });
        doc.save(`Assets_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Asset Inventory Report</title>
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
                    <h2>Company Asset Inventory</h2>
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
        reset(); 
        clearErrors(); 
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
                    Swal.fire({ icon: "success", title: "Added Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: "This asset will be permanently deleted!",
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
        return styles[condition] || { bg: '#f1f5f9', color: '#475569', label: condition?.replace('_', ' ') || 'Unknown' };
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
            <Head title="Company Assets Inventory" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Company Assets</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage and track equipment, assignments, and asset conditions.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-boxes-stacked" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Asset Inventory
                        </div>
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Add Asset
                        </button>
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
                            <button type="button" onClick={handleExcel} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> Excel
                            </button>
                            <button type="button" onClick={handleCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-csv text-teal-500"></i> CSV
                            </button>
                            <button type="button" onClick={handlePDF} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-pdf text-rose-500"></i> PDF
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search assets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>CODE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ASSET NAME</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>CONDITION</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ASSIGNED TO</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {recordList.length > 0 ? (
                                    recordList.map((record, index) => {
                                        const conditionStyle = getConditionStyles(record.condition);
                                        return (
                                            <tr key={record.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {assets.from ? assets.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontWeight: '700', color: '#0f172a' }}>{record.asset_code}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '500', color: '#1f2937' }}>{record.name}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: 'uppercase',
                                                        background: conditionStyle.bg,
                                                        color: conditionStyle.color
                                                    }}>
                                                        {conditionStyle.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", color: '#475569' }}>
                                                    {record.assignee?.name ? (
                                                        <span style={{ fontWeight: '600', color: '#334155' }}>{record.assignee.name}</span>
                                                    ) : (
                                                        <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Unassigned</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        <button onClick={() => openViewModal(record)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Details">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        <button onClick={() => openEditModal(record)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(record.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No asset records found.</td>
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-box" style={{ marginRight: "8px", color: "#2563eb" }}></i> Asset Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                    {selectedRecord.name || "N/A"}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>Code: {selectedRecord.asset_code}</div>
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
                                    <div style={{ color: "#334155", fontWeight: "600" }}>{selectedRecord.serial_number || "N/A"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Current Assignee</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}><i className="fa-regular fa-user text-blue-500" style={{ marginRight: "6px" }}></i>{selectedRecord.assignee?.name || "Unassigned"}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Assigned Date</span>
                                    <div style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a" }}><i className="fa-regular fa-calendar text-emerald-500" style={{ marginRight: "6px" }}></i>{selectedRecord.assigned_date || 'N/A'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Condition Status</span>
                                    <div style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a" }}>{getConditionStyles(selectedRecord.condition).label}</div>
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
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Asset Details" : "✨ Add New Asset"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Asset Name *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required />
                                    {errors.name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.name}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Asset Code *</label>
                                    <input type="text" value={data.asset_code} onChange={e => setData('asset_code', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required />
                                    {errors.asset_code && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.asset_code}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Serial Number</label>
                                    <input type="text" value={data.serial_number} onChange={e => setData('serial_number', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} />
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

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Assign To</label>
                                    <Select
                                        options={users.map((u) => ({ value: u.id, label: u.name }))}
                                        value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.assigned_to)) || null}
                                        onChange={(selected) => setData("assigned_to", selected ? selected.value : "")}
                                        placeholder="-- Unassigned --" isSearchable isClearable styles={selectStyles}
                                    />
                                    {errors.assigned_to && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.assigned_to}</p>}
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Assigned Date</label>
                                    <input type="date" value={data.assigned_date} onChange={e => setData('assigned_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} />
                                    {errors.assigned_date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.assigned_date}</p>}
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {processing ? "Saving..." : (editMode ? "Update Asset" : "Save Asset")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}