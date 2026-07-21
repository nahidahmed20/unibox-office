import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout'; 
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';


const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

function numberToWords(amount) {
    const num = Math.round(Number(amount) || 0);
    if (num === 0) return 'Zero Taka Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigits = (n) => {
        if (n < 20) return ones[n];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return tens[t] + (o ? ' ' + ones[o] : '');
    };

    const threeDigits = (n) => {
        const h = Math.floor(n / 100);
        const rest = n % 100;
        let str = '';
        if (h) str += ones[h] + ' Hundred';
        if (rest) str += (str ? ' ' : '') + twoDigits(rest);
        return str;
    };

    let n = num;
    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh = Math.floor(n / 100000); n %= 100000;
    const thousand = Math.floor(n / 1000); n %= 1000;
    const hundred = n;

    const parts = [];
    if (crore) parts.push(threeDigits(crore) + ' Crore');
    if (lakh) parts.push(threeDigits(lakh) + ' Lakh');
    if (thousand) parts.push(threeDigits(thousand) + ' Thousand');
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(' ') + ' Taka Only';
}

export default function Index({ clientWithAdvances = { data: [], links: [] }, clients = [], accounts = [], totalReceived = 0, totalUsed = 0, totalAvailable = 0 }) {
    // Modal & Mode States
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState(null);

    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Searchable Dropdown States
    const [clientSearch, setClientSearch] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Accordion State
    const [expandedClients, setExpandedClients] = useState({});

    // Filter & Pagination States
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
    const isFirstRender = useRef(true);

    // Inertia Form Setup
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        client_id: '',
        account_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });

    // --- Live Search & Pagination Effect ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;

            router.get(route('admin.client-advances.index'), params, {
                preserveState: true,
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Accordion Toggle ---
    const toggleExpand = (clientId) => {
        const idStr = String(clientId);
        setExpandedClients(prev => ({
            ...prev,
            [idStr]: !prev[idStr] 
        }));
    };

    // --- Print Function ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Client Advances Summary</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
                        th, td { padding: 10px; border: 1px solid #cbd5e1; font-size: 14px; }
                        th { background-color: #f1f5f9; font-weight: bold; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>Client Advances Summary Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Print a single Money Receipt (styled like the UNIBOX paper receipt book) ---
    const handlePrintReceipt = (advance) => {
        const client = clients.find(c => c.id == advance.client_id);
        const receiptNo = String(advance.id).padStart(3, '0');
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Money Receipt - ${receiptNo}</title>
                    <style>
                        @page { margin: 12mm; }
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        html, body { margin: 0; padding: 0; }
                        body { font-family: Georgia, 'Times New Roman', serif; padding: 24px; color: #1e293b; }
                        .receipt { max-width: 720px; margin: 0 auto; border: 2px solid #10b981; border-radius: 6px; padding: 24px 32px; page-break-inside: avoid; break-inside: avoid; }
                        .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px solid #10b981; margin-bottom: 20px; }
                        .header-table td { vertical-align: middle; padding-bottom: 14px; }
                        .header-table td:last-child { text-align: right; vertical-align: top; }
                        .brand-table { border-collapse: collapse; }
                        .brand-table td { padding: 0; vertical-align: middle; }
                        .brand-logo { width: 150px; max-width: 150px; height: auto; display: block; margin-right: 14px; }
                        .brand h1 { margin: 0; font-size: 28px; letter-spacing: 1px; color: #0f172a; line-height: 1.1; }
                        .brand p { margin: 4px 0 0; font-size: 11px; color: #10b981; letter-spacing: 3px; text-transform: uppercase; }
                        .contact { font-size: 11px; color: #475569; line-height: 1.6; }
                        .title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 4px; margin: 6px 0 26px; text-transform: uppercase; color: #0f172a; }
                        .field-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px; }
                        .field-table td { border-bottom: 1px dotted #94a3b8; padding: 0 24px 5px 0; }
                        .field-table td:last-child { padding-right: 0; }
                        .label { color: #64748b; margin-right: 6px; }
                        .value { font-weight: 600; color: #0f172a; }
                        .footer-table { width: 100%; border-collapse: collapse; margin-top: 36px; }
                        .footer-table td { vertical-align: bottom; width: 33.33%; }
                        .taka-box { display: inline-block; border: 2px solid #0f172a; border-radius: 4px; padding: 10px 22px; font-weight: bold; font-size: 16px; }
                        .sign { text-align: center; font-size: 12px; color: #475569; }
                        .sign .line { border-top: 1px solid #334155; width: 150px; margin: 0 auto 6px; }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <table class="header-table"><tr>
                            <td>
                                <table class="brand-table">
                                    <tr>
                                        <td>
                                            <img src="${COMPANY.logo}" class="brand-logo" alt="Logo" />
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td class="contact">
                                ${COMPANY.phone}<br/>
                                ${COMPANY.email}<br/>
                                ${COMPANY.website}<br/>
                                ${COMPANY.address}
                            </td>
                        </tr></table>
                        <div class="title">Money Receipt</div>
                        <table class="field-table"><tr>
                            <td style="width:220px;"><span class="label">SL NO:</span><span class="value">${receiptNo}</span></td>
                            <td><span class="label">Date:</span><span class="value">${advance.date || ''}</span></td>
                        </tr></table>
                        <table class="field-table"><tr><td><span class="label">Received with thanks from:</span><span class="value">${client?.name || 'N/A'}</span></td></tr></table>
                        <table class="field-table"><tr><td><span class="label">Address:</span><span class="value">${client?.address || '-'}</span></td></tr></table>
                        <table class="field-table"><tr><td><span class="label">In Words:</span><span class="value">${numberToWords(advance.amount)}</span></td></tr></table>
                        <table class="field-table"><tr>
                            <td><span class="label">Note:</span><span class="value">${advance.note || '-'}</span></td>
                            <td><span class="label">Deposited To:</span><span class="value">${advance.account?.name || '-'}</span></td>
                        </tr></table>
                        <table class="footer-table"><tr>
                            <td><div class="taka-box">Taka: ${Number(advance.amount).toLocaleString()}</div></td>
                            <td class="sign"><div class="line"></div>Received By</td>
                            <td class="sign"><div class="line"></div>For ${COMPANY.name}</td>
                        </tr></table>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => { 
            printWindow.print(); 
            printWindow.close(); 
        }, 500);
    };

    // --- Modals Logic ---
    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            client_id: '',
            account_id: '',
            amount: 0,
            used_amount: 0,
            date: new Date().toISOString().slice(0, 10),
            note: '',
            is_settled: false 
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (advance) => {
        if(advance.used_amount > 0) {
            return Swal.fire("Warning", "Cannot edit! This amount is already used in an invoice.", "warning");
        }
        clearErrors();
        setData({
            id: advance.id,
            client_id: advance.client_id,
            account_id: advance.account_id,
            amount: advance.amount,
            date: advance.date,
            note: advance.note || ''
        });
        setClientSearch("");
        setShowClientDropdown(false);
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (advance) => {
        setSelectedAdvance(advance);
        setShowViewModal(true);
    };

    // --- CRUD Actions ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) {
            Swal.fire("Required", "Please select a client.", "warning");
            return;
        }

        if (editMode) {
            put(route('admin.client-advances.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.client-advances.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Advance Received!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (advance) => {
        if(advance.used_amount > 0) {
            return Swal.fire("Restricted", "Cannot delete! Already used in billing.", "error");
        }
        Swal.fire({
            title: 'Delete this transaction?',
            text: `TK. ${advance.amount} will be deducted from the account ledger.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.client-advances.destroy', advance.id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Client Advances" />
            
            <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                {/* --- HEADER --- */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Client Advances</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>Manage and track advance payments received from clients.</p>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f766e', padding: '10px 18px', background: '#f0fdfa', borderRadius: '8px', border: "1px solid #ccfbf1" }}>
                            <i className="fa-solid fa-hand-holding-dollar" style={{ marginRight: "8px", color: "#0d9488" }}></i>
                            Total Received: TK. {Number(totalReceived).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#b91c1c', padding: '10px 18px', background: '#fef2f2', borderRadius: '8px', border: "1px solid #fecaca" }}>
                            <i className="fa-solid fa-money-bill-transfer" style={{ marginRight: "8px", color: "#ef4444" }}></i>
                            Total Adjusted: TK. {Number(totalUsed).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#15803d', padding: '10px 18px', background: '#ecfdf5', borderRadius: '8px', border: "1px solid #bbf7d0" }}>
                            <i className="fa-solid fa-vault" style={{ marginRight: "8px", color: "#10b981" }}></i>
                            Net Available: TK. {Number(totalAvailable).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* --- MAIN CARD --- */}
                <div style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    {/* Header Title & Add Button */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-users-rectangle" style={{ marginRight: "8px", color: "#10b981" }}></i> Advance Summary
                        </div>
                        {hasPermission('create_client_advance') && (
                            <button onClick={openCreateModal} style={{ background: "#10b981", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "0.3s" }}>
                                <i className="fa-solid fa-plus"></i> Receive Advance
                            </button>
                        )}
                    </div>

                    {/* Toolbar (Pagination, Print, Search) */}
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none" }}>
                                <option value={10}>10 Clients</option>
                                <option value={25}>25 Clients</option>
                                <option value={50}>50 Clients</option>
                                <option value={100}>100 Clients</option>
                                <option value={500}>500 Clients</option>
                                <option value={1000}>1000 Clients</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        <button onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                            <i className="fas fa-print"></i> Print Summary
                        </button>

                        <div style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input 
                                type="text" 
                                placeholder="Search client name..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} 
                            />
                        </div>
                    </div>

                    {/* Table Data */}
                    <div style={{ overflowX: "auto" }}>
                        <table id="printable-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", width: "40px" }}></th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Client Details</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Total Received</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Total Adjusted</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Net Available</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {clientWithAdvances.data && clientWithAdvances.data.length > 0 ? (
                                    clientWithAdvances.data.map((client) => {
                                        const isExpanded = !!expandedClients[String(client.id)];
                                        return (
                                            <React.Fragment key={client.id}>
                                                {/* --- MAIN CLIENT ROW --- */}
                                                <tr style={{ borderBottom: "1px solid #f1f5f9", background: isExpanded ? "#f8fafc" : "transparent" }}>
                                                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                        <button 
                                                            onClick={() => toggleExpand(client.id)}
                                                            style={{ border: "none", background: "#e2e8f0", color: "#475569", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }}
                                                        >
                                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: "0.75rem" }}></i>
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>{client.name}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                                            {client.company_name || "N/A"} | <span style={{ color: "#2563eb", fontWeight: "600" }}>{client.client_advances?.length || 0} Records</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "16px 24px", fontWeight: "600", color: "#0f172a" }}>TK. {Number(client.total_amount).toLocaleString()}</td>
                                                    <td style={{ padding: "16px 24px", fontWeight: "600", color: "#ef4444" }}>TK. {Number(client.total_used).toLocaleString()}</td>
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <span style={{ background: client.available_balance > 0 ? "#ecfdf5" : "#f1f5f9", color: client.available_balance > 0 ? "#10b981" : "#94a3b8", padding: "6px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "0.85rem" }}>
                                                            TK. {Number(client.available_balance).toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* --- EXPANDED TRANSACTIONS ROW --- */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: "0 24px 24px 76px", background: "#f8fafc" }}>
                                                            <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                                                    <thead>
                                                                        <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b" }}>Date</th>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b" }}>Account</th>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b" }}>Received</th>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b" }}>Available</th>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b" }}>Note</th>
                                                                            <th style={{ padding: "10px 16px", color: "#64748b", textAlign: "right" }}>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {client.client_advances.map((adv) => (
                                                                            <tr key={adv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                                <td style={{ padding: "12px 16px", fontWeight: "600", color: "#334155" }}>
                                                                                    <i className="fa-regular fa-calendar" style={{ marginRight: "6px", color: "#94a3b8" }}></i>{adv.date}
                                                                                </td>
                                                                                <td style={{ padding: "12px 16px", color: "#2563eb", fontWeight: "500" }}>{adv.account?.name}</td>
                                                                                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#10b981" }}>TK. {Number(adv.amount).toLocaleString()}</td>
                                                                                <td style={{ padding: "12px 16px" }}>
                                                                                    <span style={{ color: (adv.amount - adv.used_amount) > 0 ? "#f59e0b" : "#94a3b8", fontWeight: "600" }}>
                                                                                        TK. {Number(adv.amount - adv.used_amount).toLocaleString()}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ padding: "12px 16px", color: "#64748b" }}>{adv.note || "—"}</td>
                                                                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                                                        {hasPermission('view_client_advance') && (
                                                                                        <button onClick={() => openViewModal(adv)} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px", borderRadius: "4px", cursor: "pointer", color: "#16a34a" }} title="View">
                                                                                            <i className="fa-regular fa-eye"></i>
                                                                                        </button>
                                                                                        )}
                                                                                        {hasPermission('print_client_advance') && (
                                                                                        <button onClick={() => handlePrintReceipt(adv)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px", borderRadius: "4px", cursor: "pointer", color: "#2563eb" }} title="Print Receipt">
                                                                                            <i className="fa-solid fa-print"></i>
                                                                                        </button>
                                                                                        )}
                                                                                        {hasPermission('edit_client_advance') && (
                                                                                            <button onClick={() => openEditModal(adv)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px", borderRadius: "4px", cursor: "pointer", color: "#334155" }} title="Edit">
                                                                                                <i className="fa-regular fa-pen-to-square"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('delete_client_advance') && (
                                                                                            <button onClick={() => handleDelete(adv)} style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "6px", borderRadius: "4px", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                                                                                <i className="fa-regular fa-trash-can"></i>
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>No data found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {clientWithAdvances.links && clientWithAdvances.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Showing {clientWithAdvances.from || 0} to {clientWithAdvances.to || 0} of {clientWithAdvances.total || 0} results</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {clientWithAdvances.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), pointerEvents: link.url ? "auto" : "none", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px" }} 
                                        preserveState
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: link.label }}></span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "12px", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>Transaction Details</h3>
                            <button onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ marginBottom: "16px" }}>
                                <span style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>Client</span>
                                <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>{clients.find(c => c.id == selectedAdvance.client_id)?.name || "N/A"}</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                <div>
                                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>Amount Received</span>
                                    <div style={{ fontWeight: "700", color: "#10b981", fontSize: "1.1rem" }}>TK. {selectedAdvance.amount}</div>
                                </div>
                                <div>
                                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>Adjusted / Used</span>
                                    <div style={{ fontWeight: "700", color: "#ef4444", fontSize: "1.1rem" }}>TK. {selectedAdvance.used_amount}</div>
                                </div>
                                <div>
                                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>Currently Available</span>
                                    <div style={{ fontWeight: "700", color: "#f59e0b", fontSize: "1.1rem" }}>TK. {selectedAdvance.amount - selectedAdvance.used_amount}</div>
                                </div>
                                <div>
                                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>Received Date</span>
                                    <div style={{ fontWeight: "600" }}>{selectedAdvance.date}</div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px", color: "#475569", fontSize: "0.9rem" }}>
                                <b>Note:</b> {selectedAdvance.note || "No additional note."}
                            </div>
                            <div style={{ marginTop: "24px", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button onClick={() => handlePrintReceipt(selectedAdvance)} style={{ background: "#2563eb", color: "#fff", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <i className="fa-solid fa-print"></i> Print Receipt
                                </button>
                                <button onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", border: "none" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "12px", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>{editMode ? "📝 Edit Advance" : "✨ Receive Advance"}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div onClick={() => showClientDropdown && setShowClientDropdown(false)} style={{ padding: "24px", maxHeight: "75vh", overflowY: "auto" }}>
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: "grid", gap: "16px" }}>
                                    
                                    {/* Custom Searchable Select for Client */}
                                    <div style={{ position: "relative" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Client <span style={{color:"red"}}>*</span></label>
                                        
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setShowClientDropdown(!showClientDropdown); }}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                        >
                                            <span style={{ color: data.client_id ? "#0f172a" : "#94a3b8", fontSize: "0.9rem" }}>
                                                {data.client_id 
                                                    ? (() => {
                                                        const c = clients.find(cl => cl.id == data.client_id);
                                                        return c ? `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` : "-- Choose Client --";
                                                    })()
                                                    : "-- Choose Client --"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showClientDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem" }}></i>
                                        </div>

                                        {showClientDropdown && (
                                            <div 
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "250px", display: "flex", flexDirection: "column" }}
                                            >
                                                <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type client name..." 
                                                        value={clientSearch}
                                                        onChange={(e) => setClientSearch(e.target.value)}
                                                        style={{ width: "100%", padding: "8px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                    {clients.filter(c => 
                                                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                        (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                    ).length > 0 ? (
                                                        clients.filter(c => 
                                                            c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                            (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase()))
                                                        ).map(c => (
                                                            <div 
                                                                key={c.id} 
                                                                onClick={() => { setData("client_id", c.id); setShowClientDropdown(false); setClientSearch(""); }}
                                                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.9rem", color: "#334155", background: data.client_id == c.id ? "#f0fdf4" : "transparent" }}
                                                                onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                                                                onMouseLeave={(e) => e.target.style.background = data.client_id == c.id ? "#f0fdf4" : "transparent"}
                                                            >
                                                                {c.name} {c.company_name ? <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({c.company_name})</span> : ''}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No clients found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {errors.client_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.client_id}</span>}
                                    </div>

                                    {/* Account Dropdown */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Deposit Account <span style={{color:"red"}}>*</span></label>
                                        <select 
                                            value={data.account_id} 
                                            onChange={(e) => setData('account_id', e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", background: "#fff", color: "#334155" }}
                                        >
                                            <option value="">-- Select Account --</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} (Bal: {Number(acc.current_balance).toLocaleString()})</option>
                                            ))}
                                        </select>
                                        {errors.account_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.account_id}</span>}
                                    </div>

                                    {/* Amount Input */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Amount (TK.) <span style={{color:"red"}}>*</span></label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            step="0.01"
                                            value={data.amount} 
                                            onChange={(e) => setData('amount', e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }}
                                            placeholder="Enter amount"
                                        />
                                        {errors.amount && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.amount}</span>}
                                    </div>

                                    {/* Date Input */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date <span style={{color:"red"}}>*</span></label>
                                        <input 
                                            type="date" 
                                            value={data.date} 
                                            onChange={(e) => setData('date', e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", color: "#334155" }}
                                        />
                                        {errors.date && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.date}</span>}
                                    </div>

                                    {/* Note Input */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Note (Optional)</label>
                                        <textarea 
                                            value={data.note} 
                                            onChange={(e) => setData('note', e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", minHeight: "80px", resize: "vertical", color: "#334155" }}
                                            placeholder="Enter any relevant notes..."
                                        ></textarea>
                                        {errors.note && <span style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{errors.note}</span>}
                                    </div>
                                </div>

                                {/* Form Buttons */}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: "500" }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#10b981", color: "#fff", cursor: processing ? "not-allowed" : "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}
                                    >
                                        {processing ? "Saving..." : (editMode ? "Update Advance" : "Save Advance")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
