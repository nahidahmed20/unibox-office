import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2'; 

export default function Index({ advances = [], filters = {}, accounts = [], employees = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});

    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);
    
    const advanceList = Array.isArray(advances) ? advances : (advances.data || []);
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const [perPage, setPerPage] = useState(() => {
        return new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10';
    });
    
    const isFirstRender = useRef(true);

    // Main Create/Edit Form
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        account_id: '',
        user_id: '', 
        amount: '', 
        date: '', 
        purpose: 'Office Purpose', 
        status: 'unsettled',
        notes: ''
    });

    // Cash Return Form
    const { data: returnData, setData: setReturnData, post: postReturn, processing: returnProcessing, reset: returnReset, errors: returnErrors, clearErrors: clearReturnErrors } = useForm({
        return_amount: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.advances.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Group advances by employee so repeated advances to the same person collapse into one row ---
    const groupedAdvances = React.useMemo(() => {
        const map = new Map();
        advanceList.forEach((adv) => {
            const key = adv.user_id;
            if (!map.has(key)) {
                map.set(key, {
                    user_id: adv.user_id,
                    user: adv.user,
                    records: [],
                    total_given: 0,
                    total_expensed: 0,
                    total_returned: 0,
                });
            }
            const group = map.get(key);
            group.records.push(adv);
            group.total_given += parseFloat(adv.amount || 0);
            group.total_expensed += parseFloat(adv.settled_amount || 0);
            group.total_returned += parseFloat(adv.returned_amount || 0);
        });
        return Array.from(map.values()).map((group) => ({
            ...group,
            total_due: group.total_given - group.total_expensed - group.total_returned,
        }));
    }, [advanceList]);

    const toggleExpand = (userId) => {
        setExpandedRows((prev) => ({ ...prev, [userId]: !prev[userId] }));
    };

    // --- Export Utilities ---
    const handleCopy = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = advanceList
            .map((adv, idx) => `${idx + 1}\t${adv.date}\t${adv.account?.name || 'N/A'}\t${adv.user?.name}\t${adv.purpose}\t${adv.status}\tBDT ${parseFloat(adv.amount).toFixed(2)}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Date,Account,Given To,Purpose,Total Given,Expensed,Returned,Due,Status\n"];
        const rows = advanceList.map((adv, idx) => {
            const expensed = parseFloat(adv.settled_amount || 0);
            const returned = parseFloat(adv.returned_amount || 0);
            const total = parseFloat(adv.amount || 0);
            const due = total - expensed - returned;
            return `"${idx + 1}","${adv.date}","${adv.account?.name || 'N/A'}","${adv.user?.name}","${adv.purpose}","${total}","${expensed}","${returned}","${due}","${adv.status}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Advance_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-advance-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Advance Payments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Advance Payments Directory</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modal Management ---
    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            account_id: '',
            user_id: '',
            amount: 0,
            settled_amount: 0,
            returned_amount: 0,
            date: new Date().toISOString().slice(0, 10),
            purpose: '',
            status: 'unsettled', 
            notes: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors(); 
        setData({
            id: adv.id,
            account_id: adv.account_id || '',
            user_id: adv.user_id || '', 
            amount: adv.amount,
            date: adv.date,
            purpose: adv.purpose || 'Office Purpose',
            status: adv.status || 'unsettled',
            notes: adv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openReturnModal = (adv) => {
        setSelectedAdvance(adv);
        returnReset();
        clearReturnErrors();
        
        // Calculate due amount to show as placeholder/default
        const totalSettled = parseFloat(adv.settled_amount || 0) + parseFloat(adv.returned_amount || 0);
        const due = parseFloat(adv.amount) - totalSettled;
        
        setReturnData('return_amount', due > 0 ? due : '');
        setShowReturnModal(true);
    };

    // --- Form Submits ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.advances.update', data.id), { 
                preserveScroll: true,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Advance record updated successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.advances.store'), { 
                preserveScroll: true,
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Logged!', text: 'New advance payment logged.', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        postReturn(route('admin.advances.returnMoney', selectedAdvance.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowReturnModal(false);
                Swal.fire({ icon: 'success', title: 'Refunded!', text: 'Leftover cash returned to account.', timer: 2000, showConfirmButton: false });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Remaining money will be automatically refunded to the account!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record removed and refunded.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    // Total Unsettled Calculation based on Due
    const totalUnsettled = advanceList.filter(a => a.status === 'unsettled').reduce((sum, item) => {
        const remaining = parseFloat(item.amount) - parseFloat(item.settled_amount || 0) - parseFloat(item.returned_amount || 0);
        return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            
            <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Advance Payments</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Dashboard / Finance / Advances</p>
                    </div>
                    
                    {/* Total Unsettled Badge */}
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#b91c1c', padding: '12px 20px', background: '#fee2e2', borderRadius: '8px', border: "1px solid #fecaca", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "8px", color: "#dc2626" }}></i>
                        Total Unsettled Due: <span style={{ fontSize: "1.2rem" }}>BDT {totalUnsettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Main Card Container */}
                <div style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Card Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-hand-holding-dollar" style={{ marginRight: "8px", color: "#2563eb" }}></i> Employee & Vendor Advances
                        </div>
                        {hasPermission('create_advance') && (
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)" }}>
                            <i className="fa-solid fa-plus"></i> Log Advance
                        </button>
                        )}
                    </div>

                    {/* Toolbar Panel */}
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        
                        {/* Dynamic Per Page Selector */}
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        {/* Export Action Tools */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> Excel
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontWeight: "500" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        {/* Search Component */}
                        <div style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input 
                                type="text" 
                                placeholder="Search name or purpose..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }}
                            />
                        </div>
                    </div>

                    {/* Main Data Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-advance-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "50px" }}></th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ACCOUNT</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>GIVEN TO</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>GIVEN</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", textAlign: "right" }}>EXPENSED</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", textAlign: "right" }}>RETURNED</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#dc2626", textTransform: "uppercase", textAlign: "right" }}>DUE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center", width: "160px" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {groupedAdvances.length > 0 ? (
                                    groupedAdvances.map((group) => {
                                        const isExpanded = !!expandedRows[group.user_id];
                                        const hasMultiple = group.records.length > 1;
                                        const single = group.records[0];

                                        return (
                                            <React.Fragment key={group.user_id}>
                                                {/* Group summary row */}
                                                <tr style={{ borderBottom: isExpanded ? "none" : "1px solid #f1f5f9", background: isExpanded ? "#f8fafc" : "#fff" }}>
                                                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                        {hasMultiple && (
                                                            <button 
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                style={{ border: "none", background: "#e2e8f0", color: "#475569", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }}
                                                            >
                                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: "0.75rem" }}></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", color: "#475569" }}>
                                                        {hasMultiple ? `${group.records.length} entries` : single.date}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", color: "#0f766e", fontWeight: "600" }}>
                                                        {hasMultiple ? 'Multiple' : (single.account?.name || 'N/A')}
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <Link href={route('admin.advances.employeeLedger', group.user_id)} style={{ fontWeight: '700', color: '#0f172a', textDecoration: 'none' }}>
                                                            {group.user?.name}
                                                        </Link>
                                                        {hasMultiple ? (
                                                            <span style={{ marginLeft: "8px", fontSize: "0.7rem", fontWeight: "700", color: "#2563eb", background: "#dbeafe", padding: "2px 8px", borderRadius: "999px" }}>
                                                                {group.records.length}
                                                            </span>
                                                        ) : (
                                                            single.purpose && <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{single.purpose}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                                        {group.total_given.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                                                        {group.total_expensed > 0 ? group.total_expensed.toLocaleString('en-IN') : '-'}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                                                        {group.total_returned > 0 ? group.total_returned.toLocaleString('en-IN') : '-'}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                                                        {group.total_due > 0 ? group.total_due.toLocaleString('en-IN') : '0'}
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize',
                                                            background: group.total_due > 0 ? '#fee2e2' : '#dcfce7', 
                                                            color: group.total_due > 0 ? '#b91c1c' : '#15803d' 
                                                        }}>
                                                            {group.total_due > 0 ? 'unsettled' : 'settled'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                        {hasMultiple ? (
                                                            <button 
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                style={{ background: "#f1f5f9", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", color: "#2563eb", fontSize: "0.8rem", fontWeight: "600" }}
                                                            >
                                                                {isExpanded ? 'Hide' : 'View'} details
                                                            </button>
                                                        ) : (
                                                            <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                                {hasPermission('return_advance') && single.status !== 'settled' && group.total_due > 0 && (
                                                                    <button onClick={() => openReturnModal(single)} style={{ background: "#dcfce7", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a", fontSize: "0.85rem", fontWeight: "600" }} title="Refund Cash">
                                                                        <i className="fa-solid fa-money-bill-transfer"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('edit_advance') && (
                                                                <button onClick={() => openEditModal(single)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit Record">
                                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                                </button>
                                                                )}
                                                                {hasPermission('delete_advance') && (
                                                                <button onClick={() => handleDelete(single.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete Record">
                                                                    <i className="fa-regular fa-trash-can"></i>
                                                                </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded detail rows - individual advances for this employee */}
                                                {isExpanded && hasMultiple && group.records.map((adv) => {
                                                    const expensed = parseFloat(adv.settled_amount || 0);
                                                    const returned = parseFloat(adv.returned_amount || 0);
                                                    const totalGiven = parseFloat(adv.amount || 0);
                                                    const due = totalGiven - expensed - returned;

                                                    return (
                                                        <tr key={adv.id} style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                                                            <td></td>
                                                            <td style={{ padding: "10px 24px", color: "#64748b", fontSize: "0.85rem" }}>{adv.date}</td>
                                                            <td style={{ padding: "10px 24px", color: "#0f766e", fontSize: "0.85rem" }}>{adv.account?.name || 'N/A'}</td>
                                                            <td style={{ padding: "10px 24px", color: "#64748b", fontSize: "0.85rem" }}>{adv.purpose || '-'}</td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'right', fontWeight: '600', color: '#334155', fontSize: "0.85rem" }}>
                                                                {totalGiven.toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'right', color: '#16a34a', fontSize: "0.85rem" }}>
                                                                {expensed > 0 ? expensed.toLocaleString('en-IN') : '-'}
                                                            </td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'right', color: '#2563eb', fontSize: "0.85rem" }}>
                                                                {returned > 0 ? returned.toLocaleString('en-IN') : '-'}
                                                            </td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'right', color: '#dc2626', fontSize: "0.85rem" }}>
                                                                {due > 0 ? due.toLocaleString('en-IN') : '0'}
                                                            </td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize',
                                                                    background: adv.status === 'settled' ? '#dcfce7' : '#fee2e2', 
                                                                    color: adv.status === 'settled' ? '#15803d' : '#b91c1c' 
                                                                }}>
                                                                    {adv.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: "10px 24px", textAlign: 'center' }}>
                                                                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                                    {hasPermission('return_advance') && adv.status !== 'settled' && due > 0 && (
                                                                        <button onClick={() => openReturnModal(adv)} style={{ background: "#dcfce7", border: "none", padding: "5px 9px", borderRadius: "6px", cursor: "pointer", color: "#16a34a", fontSize: "0.8rem" }} title="Refund Cash">
                                                                            <i className="fa-solid fa-money-bill-transfer"></i>
                                                                        </button>
                                                                    )}
                                                                    {hasPermission('edit_advance') && (
                                                                        <button onClick={() => openEditModal(adv)} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "5px 9px", borderRadius: "6px", cursor: "pointer", color: "#0f172a", fontSize: "0.8rem" }} title="Edit Record">
                                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                                        </button>
                                                                    )}
                                                                    {hasPermission('delete_advance') && (
                                                                        <button onClick={() => handleDelete(adv.id)} style={{ background: "#fff", border: "1px solid #fecaca", padding: "5px 9px", borderRadius: "6px", cursor: "pointer", color: "#ef4444", fontSize: "0.8rem" }} title="Delete Record">
                                                                            <i className="fa-regular fa-trash-can"></i>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>No advance records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {advances.links && advances.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexWrap: "wrap", gap: "16px" }}>
                            <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                                Showing <b>{advances.from || 0}</b> to <b>{advances.to || 0}</b> of <b>{advances.total || 0}</b> entries
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                                {advances.links.map((link, i) => (
                                    link.url === null ? (
                                        <span key={i} style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#cbd5e1", fontSize: "0.85rem", cursor: "not-allowed", background: "#fff" }} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ) : (
                                        <Link key={i} href={link.url} preserveState style={{ padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", textDecoration: "none", fontWeight: link.active ? "700" : "500", background: link.active ? "#2563eb" : "#ffffff", color: link.active ? "#ffffff" : "#475569", boxShadow: link.active ? "0 2px 4px rgba(37, 99, 235, 0.2)" : "none" }} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN CREATE / EDIT FORM MODAL SECTION --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        
                        {/* Modal Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? '📝 Edit Advance Info' : '✨ Log Advance Payment'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            
                            {errors.error && (
                                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    {errors.error}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Account *</label>
                                    <select 
                                        value={data.account_id} 
                                        onChange={e => setData('account_id', e.target.value)} 
                                        disabled={editMode}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "500", background: editMode ? "#f1f5f9" : "#fff", color: "#334155", height: "42px" }}
                                        required={!editMode}
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Bal: {Number(acc.current_balance).toLocaleString('en-IN')})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.account_id}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex", marginBottom: "16px" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                        Employee *
                                    </label>
                                    <select 
                                        value={data.user_id} 
                                        onChange={e => setData('user_id', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        required
                                    >
                                        <option value="">Select an Employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (BDT) *</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={data.amount} 
                                        onChange={e => setData('amount', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "700" }}
                                        placeholder="0.00" 
                                        required
                                    />
                                    {errors.amount && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.amount}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                    <input 
                                        type="date" 
                                        value={data.date} 
                                        onChange={e => setData('date', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }}
                                        required
                                    />
                                    {errors.date && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.date}</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: "16px" }}>
                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Purpose</label>
                                    <input 
                                        type="text" 
                                        value={data.purpose} 
                                        onChange={e => setData('purpose', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                                        placeholder="e.g. Office Shopping" 
                                    />
                                    {errors.purpose && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.purpose}</p>}
                                </div>

                                <div style={{ flexDirection: "column", display: "flex" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Status</label>
                                    <select 
                                        value={data.status} 
                                        onChange={e => setData('status', e.target.value)} 
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", color: "#334155", height: "42px" }}
                                    >
                                        <option value="unsettled">Unsettled (Not adjusted)</option>
                                        <option value="settled">Settled (Bill Submitted)</option>
                                    </select>
                                    {errors.status && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.status}</p>}
                                </div>
                            </div>

                            <div style={{ flexDirection: "column", display: "flex", marginBottom: "16px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Notes</label>
                                <textarea 
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)} 
                                    rows="1"
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", resize: "none" }}
                                    placeholder="Additional details..." 
                                ></textarea>
                                {errors.notes && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{errors.notes}</p>}
                            </div>

                            {/* Modal Footer Control */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                    {processing ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- CASH RETURN MODAL --- */}
            {showReturnModal && selectedAdvance && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                    💵 Refund Leftover Cash
                                </h3>
                                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                                    Return cash from <b>{selectedAdvance.user?.name || 'N/A'}</b> to Account.
                                </p>
                            </div>
                            <button type="button" onClick={() => setShowReturnModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleReturnSubmit} style={{ padding: "24px" }}>
                            {returnErrors.error && (
                                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    {returnErrors.error}
                                </div>
                            )}

                            <div style={{ flexDirection: "column", display: "flex", marginBottom: "16px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Refund Amount (BDT) *</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={returnData.return_amount} 
                                    onChange={e => setReturnData('return_amount', e.target.value)} 
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: "700" }}
                                    placeholder="Enter returned cash amount" 
                                    required
                                />
                                {returnErrors.return_amount && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>{returnErrors.return_amount}</p>}
                                <small style={{ color: "#64748b", marginTop: "6px", fontSize: "0.75rem" }}>
                                    This money will be added back to <b>{selectedAdvance.account?.name}</b>.
                                </small>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowReturnModal(false)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                                <button type="submit" disabled={returnProcessing} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: returnProcessing ? 0.7 : 1 }}>
                                    {returnProcessing ? 'Processing...' : 'Confirm Refund'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}