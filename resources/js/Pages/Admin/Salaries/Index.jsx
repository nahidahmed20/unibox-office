import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link , usePage} from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Index({ salaries = { data: [], links: [] }, users = [], accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [filterMonth, setFilterMonth] = useState(() => new URLSearchParams(window.location.search).get('month') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const today = new Date();
    const defaultMonthYear = `${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        user_id: '', 
        month_year: defaultMonthYear, 
        basic_salary: 0, 
        allowances: 0, 
        bonus: 0, 
        deductions: 0, 
        net_pay: 0, 
        status: 'unpaid', 
        payment_date: '', 
        payment_method: '',
        account_id: '' 
    });

    // Auto calculate Net Pay whenever values change
    useEffect(() => {
        const basic = parseFloat(data.basic_salary) || 0;
        const allow = parseFloat(data.allowances) || 0;
        const bns = parseFloat(data.bonus) || 0;
        const ded = parseFloat(data.deductions) || 0;
        setData('net_pay', (basic + allow + bns - ded).toFixed(2));
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions]);

    // --- Live Search, Filter & Pagination Sync ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (filterMonth.trim()) params.month = filterMonth;
            if (perPage !== 25) params.per_page = perPage;

            router.get(
                route('admin.salaries.index'), 
                params, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterMonth, perPage]);

    const recordList = salaries.data || (Array.isArray(salaries) ? salaries : []);

    // Helper to get Account Name
    const getAccountName = (record) => {
        if (record?.transactions?.length > 0 && record.transactions[0].account) {
            return record.transactions[0].account.name;
        }
        return "N/A";
    };

    // --- Export Tools ---
    const formatCurrency = (val) => `BDT ${parseFloat(val || 0).toLocaleString('en-IN')}`;

    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map((s) => `${s.month_year}\t${s.user?.name || "Unknown"}\t${s.basic_salary}\t${s.net_pay}\t${s.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const rows = [
            ['Month', 'Employee Name', 'Basic Salary', 'Net Pay', 'Status', 'Payment Date'],
            ...recordList.map(s => [
                `"${s.month_year}"`,
                `"${s.user?.name ?? 'Unknown'}"`,
                s.basic_salary || 0,
                s.net_pay || 0,
                s.status?.toUpperCase(),
                s.payment_date || '-'
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Payroll_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExcel = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            recordList.map(s => ({
                "Month": s.month_year,
                "Employee Name": s.user?.name ?? 'Unknown',
                "Basic Salary": s.basic_salary || 0,
                "Allowances": s.allowances || 0,
                "Bonus": s.bonus || 0,
                "Deductions": s.deductions || 0,
                "Net Pay": s.net_pay || 0,
                "Status": s.status?.toUpperCase(),
                "Payment Date": s.payment_date || '-'
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Payroll_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePDF = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Month', 'Employee Name', 'Basic', 'Net Pay', 'Status']],
            body: recordList.map(s => [
                s.month_year,
                s.user?.name ?? 'Unknown',
                formatCurrency(s.basic_salary),
                formatCurrency(s.net_pay),
                s.status?.toUpperCase()
            ])
        });
        doc.save(`Payroll_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Payroll Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Company Payroll Report ${filterMonth ? `(${filterMonth})` : ''}</h2>
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
            user_id: '',
            month_year: '',
            basic_salary: 0,
            allowances: 0, 
            bonus: 0,      
            deductions: 0, 
            net_pay: 0,
            status: 'unpaid', 
            account_id: '',
            payment_date: '',
            payment_method: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors(); 
        const existingAccountId = sal.transactions?.length > 0 ? sal.transactions[0].account_id : '';
        setData({ 
            id: sal.id,
            user_id: sal.user_id || '',
            month_year: sal.month_year || defaultMonthYear,
            basic_salary: sal.basic_salary || 0,
            allowances: sal.allowances || 0, 
            bonus: sal.bonus || 0, 
            deductions: sal.deductions || 0,
            net_pay: sal.net_pay || 0,
            status: sal.status || 'unpaid',
            payment_date: sal.payment_date || '',
            account_id: existingAccountId 
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
            put(route('admin.salaries.update', data.id), { 
                onSuccess: () => { 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false }); 
                }
            });
        } else {
            post(route('admin.salaries.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Processed Successfully!', timer: 1500, showConfirmButton: false }); 
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Record?',
            text: 'This salary record will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.salaries.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    // Status Styling Generator
    const getStatusStyles = (status) => {
        if (status === 'paid') return { bg: '#dcfce7', color: '#15803d', label: 'Paid' };
        return { bg: '#fee2e2', color: '#b91c1c', label: 'Unpaid' };
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "38px", borderRadius: "6px",
            border: state.isFocused ? "1px solid #3b82f6" : "1px solid #cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
            "&:hover": { borderColor: "#94a3b8" },
        }),
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                
                {/* Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Employee Salaries</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage payroll records, view reports, and process payments.</p>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-money-check-dollar" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Payroll Records
                        </div>
                        {hasPermission('create_salary') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Process Salary
                        </button>
                        )}
                    </div>

                    {/* Toolbar / Filters */}
                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                {/* All Option Added Below */}
                                <option value={100000}>All</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#475569" }}><i className="fas fa-copy text-blue-500"></i> Copy</button>
                            <button type="button" onClick={handleExcel} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#475569" }}><i className="fas fa-file-excel text-emerald-500"></i> Excel</button>
                            <button type="button" onClick={handleCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#475569" }}><i className="fas fa-file-csv text-teal-500"></i> CSV</button>
                            <button type="button" onClick={handlePDF} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#475569" }}><i className="fas fa-file-pdf text-rose-500"></i> PDF</button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#475569" }}><i className="fas fa-print text-slate-500"></i> Print</button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {/* Monthly Report Filter Added Here */}
                            <div className="search-box" style={{ position: "relative" }}>
                                <input 
                                    type="month" 
                                    value={filterMonth} 
                                    onChange={(e) => setFilterMonth(e.target.value)} 
                                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem", color: "#475569" }} 
                                    title="Filter by Month"
                                />
                                {filterMonth && (
                                    <button onClick={() => setFilterMonth('')} style={{position: 'absolute', right: '5px', top: '9px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444'}}>
                                        <i className="fa-solid fa-times"></i>
                                    </button>
                                )}
                            </div>

                            <div className="search-box" style={{ position: "relative" }}>
                                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                                <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "200px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>MONTH</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>EMPLOYEE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>NET PAY</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>PAY DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {recordList.length > 0 ? (
                                    recordList.map((sal, index) => {
                                        const statusStyle = getStatusStyles(sal.status);
                                        const accName = getAccountName(sal);
                                        return (
                                            <tr key={sal.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {salaries.from ? salaries.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontWeight: '700', color: '#1e2937' }}>{sal.month_year}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '500', color: '#334155' }}>{sal.user?.name || 'Unknown Employee'}</td>
                                                <td style={{ padding: "16px 24px", fontWeight: '700', color: '#0f766e' }}>
                                                    {formatCurrency(sal.net_pay)}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.color }}>
                                                        {statusStyle.label}
                                                    </span>
                                                    {sal.status === 'paid' && accName !== 'N/A' && (
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '4px' }}>
                                                            Via: {accName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center', color: '#64748b', fontStyle: sal.payment_date ? 'normal' : 'italic' }}>
                                                    {sal.payment_date || 'Pending'}
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        {hasPermission('view_salary') && (
                                                        <button onClick={() => openViewModal(sal)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View Payslip">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('edit_salary') && (
                                                        <button onClick={() => openEditModal(sal)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                        )}
                                                        {hasPermission('delete_salary') && (
                                                        <button onClick={() => handleDelete(sal.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete">
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
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No salary records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                                {salaries.total > 0 && `Showing ${salaries.from || 0} to ${salaries.to || 0} of ${salaries.total || 0} entries`}
                            </div>
                            {salaries.links && salaries.links.length > 3 && (
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {salaries.links.map((link, index) => (
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
                                            <span dangerouslySetInnerHTML={{__html: link.label}}></span>
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
                    <div style={{ background: "#fff", width: "100%", maxWidth: "550px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: "8px", color: "#2563eb" }}></i> Payslip Summary
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#0f172a" }}>
                                    {selectedRecord.user?.name || "N/A"}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>Salary Month: {selectedRecord.month_year}</div>
                                <span style={{ 
                                    background: getStatusStyles(selectedRecord.status).bg, 
                                    color: getStatusStyles(selectedRecord.status).color, 
                                    padding: '5px 14px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginTop: "10px", display: "inline-block" 
                                }}>
                                    {getStatusStyles(selectedRecord.status).label}
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Basic Salary</span>
                                    <div style={{ color: "#334155", fontWeight: "600" }}>{formatCurrency(selectedRecord.basic_salary)}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Allowances</span>
                                    <div style={{ color: "#16a34a", fontWeight: "600" }}>+ {formatCurrency(selectedRecord.allowances)}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Bonus</span>
                                    <div style={{ color: "#16a34a", fontWeight: "600" }}>+ {formatCurrency(selectedRecord.bonus)}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Deductions</span>
                                    <div style={{ color: "#dc2626", fontWeight: "600" }}>- {formatCurrency(selectedRecord.deductions)}</div>
                                </div>
                            </div>
                            
                            <div style={{ background: '#e0f2fe', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: "700", color: "#0369a1" }}>Total Net Pay</span>
                                <div style={{ color: "#0369a1", fontSize: "1.25rem", fontWeight: "800" }}>
                                    {formatCurrency(selectedRecord.net_pay)}
                                </div>
                            </div>

                            {selectedRecord.status === 'paid' && (
                                <div style={{ marginTop: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                        <span><strong>Paid On:</strong></span>
                                        <span>{selectedRecord.payment_date}</span>
                                    </div>
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                        <span><strong>Paid From Account:</strong></span>
                                        <span style={{fontWeight: 'bold', color: '#0f766e'}}>{getAccountName(selectedRecord)}</span>
                                    </div>
                                </div>
                            )}

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
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Edit Salary Record" : "✨ Process New Salary"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div style={{ overflowY: "auto", padding: "24px" }}>
                            <form id="salary-form" onSubmit={handleSubmit}>
                                
                                {errors.month_year && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "16px" }}>{errors.month_year}</div>}

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Employee *</label>
                                        <Select
                                            options={users.map((u) => ({ value: u.id, label: u.name }))}
                                            value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                            onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                            placeholder="Choose Employee" isSearchable isClearable styles={selectStyles}
                                            isDisabled={editMode}
                                        />
                                        {errors.user_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.user_id}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Month-Year (MM-YYYY) *</label>
                                        <input type="text" value={data.month_year} onChange={e => setData('month_year', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: editMode ? "#f1f5f9" : "#fff" }} placeholder="e.g., 07-2026" required disabled={editMode} />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Basic Salary *</label>
                                        <input type="number" step="0.01" value={data.basic_salary} onChange={e => setData('basic_salary', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required />
                                        {errors.basic_salary && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.basic_salary}</p>}
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Allowances</label>
                                        <input type="number" step="0.01" value={data.allowances} onChange={e => setData('allowances', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Bonus</label>
                                        <input type="number" step="0.01" value={data.bonus} onChange={e => setData('bonus', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Deductions</label>
                                        <input type="number" step="0.01" value={data.deductions} onChange={e => setData('deductions', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Net Pay (Auto-Calculated)</label>
                                        <input type="text" value={data.net_pay} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#f1f5f9", fontWeight: "700", color: "#0f766e" }} readOnly />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Status *</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)} style={{ width: "100%", padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </div>

                                {data.status === 'paid' && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px", padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                        
                                        <div>
                                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Account *</label>
                                            <select 
                                                value={data.account_id} 
                                                onChange={e => setData('account_id', e.target.value)} 
                                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} 
                                                required={data.status === 'paid'}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name} (Balance: {parseFloat(acc.current_balance).toLocaleString('en-IN')})
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                                        </div>

                                        <div>
                                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Date *</label>
                                            <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", height: "38px", background: "#fff" }} required={data.status === 'paid'} />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", padding: "16px 24px", background: "#f8fafc" }}>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                            <button type="submit" form="salary-form" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                {processing ? "Saving..." : (editMode ? "Update Record" : "Save Payroll")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}