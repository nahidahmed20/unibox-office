import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2'; 
import Select from 'react-select';

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
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // Modal & Mode States
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState(null);

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

    // --- Copy & Export ---
    const clientList = clientWithAdvances.data || [];

    const handleCopy = () => {
        if (!clientList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = clientList
            .map((c) => `${c.name}\tReceived: ${c.total_amount}\tAdjusted: ${c.total_used}\tAvailable: ${c.available_balance}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!clientList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Client Name,Total Received,Total Adjusted,Net Available\n"];
        const rows = clientList.map(c => `"${c.name}","${c.total_amount}","${c.total_used}","${c.available_balance}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Client_Advances_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    // --- Print Functions ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Client Advances Summary</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        .expand-btn-col, .actions-col { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Client Advances Summary Report</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Updated Compact Print Receipt ---
    const handlePrintReceipt = (advance) => {
        const client = clients.find(c => c.id == advance.client_id);
        const receiptNo = String(advance.id).padStart(3, '0');
        const printWindow = window.open('', '_blank');
        
        const receiptHTML = (copyType) => `
            <div class="receipt">
                <div class="watermark">${COMPANY.name}</div>
                
                <div class="header">
                    <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                    <div class="company-details">
                        <h2>${COMPANY.name}</h2>
                        ${COMPANY.address}<br/>
                        Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                    </div>
                </div>

                <div class="title-container">
                    <div class="title">Money Receipt</div>
                    <div class="copy-badge">${copyType}</div>
                </div>

                <div class="content">
                    <table class="details-table">
                        <tr>
                            <td style="width: 50%;"><strong>Receipt No:</strong> #${receiptNo}</td>
                            <td style="width: 50%; text-align: right;"><strong>Date:</strong> ${advance.date || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Received with thanks from:</strong> ${client?.name || 'N/A'} ${client?.company_name ? `(${client.company_name})` : ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Deposited To:</strong> ${advance.account?.name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Amount in Words:</strong> <span class="words">${numberToWords(advance.amount)}</span></td>
                        </tr>
                        ${advance.note ? `<tr><td colspan="2"><strong>Notes:</strong> ${advance.note}</td></tr>` : ''}
                    </table>
                </div>

                <div class="footer-section">
                    <div class="amount-box">TK. ${Number(advance.amount).toLocaleString('en-IN')}</div>
                    <div class="signature">
                        <div class="sign-line">Authorized Signature</div>
                    </div>
                </div>
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Money Receipt - #${receiptNo}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; display: flex; justify-content: center; }
                        
                        @page { size: auto; margin: 10mm; }
                        
                        .page-container {
                            width: 100%;
                            max-width: 160mm; /* Compact width for realistic receipt size */
                            display: flex;
                            flex-direction: column;
                            margin: 0 auto;
                        }
                        
                        .receipt {
                            min-height: 110mm; 
                            border: 2px solid #147a5b;
                            border-radius: 8px;
                            padding: 20px 25px;
                            position: relative;
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                            background: white;
                        }

                        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 50px; font-weight: 900; color: rgba(20, 122, 91, 0.04); z-index: 0; pointer-events: none; text-transform: uppercase; white-space: nowrap; letter-spacing: 8px; }
                        
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; position: relative; z-index: 1; }
                        .logo { height: 35px; width: auto; }
                        .company-details { text-align: right; font-size: 10px; line-height: 1.4; color: #475569; }
                        .company-details h2 { margin: 0 0 2px 0; font-size: 15px; color: #147a5b; text-transform: uppercase; letter-spacing: 0.5px; }
                        
                        .title-container { text-align: center; margin-bottom: 12px; position: relative; z-index: 1; }
                        .title { display: inline-block; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #147a5b; background: #f0fdf4; padding: 5px 15px; border: 1px solid #147a5b; border-radius: 4px; }
                        .copy-badge { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 9px; font-weight: bold; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; background: #f8fafc; }

                        .content { flex-grow: 1; position: relative; z-index: 1; }
                        .details-table { width: 100%; border-collapse: collapse; font-size: 12.5px; line-height: 1.6; color: #1e293b; }
                        .details-table td { padding: 6px 0; border-bottom: 1px dotted #cbd5e1; }
                        .details-table strong { color: #475569; font-weight: 600; margin-right: 8px; }
                        .words { font-weight: 700; font-style: italic; color: #0f172a; text-transform: capitalize; }
                        
                        .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; padding-top: 10px; position: relative; z-index: 1; }
                        .amount-box { border: 2px solid #147a5b; border-radius: 4px; padding: 8px 20px; font-weight: 800; font-size: 15px; color: #147a5b; background: #f0fdf4; box-shadow: 2px 2px 0px rgba(20, 122, 91, 0.15); }
                        .signature { text-align: center; font-size: 11px; color: #475569; width: 140px; }
                        .sign-line { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        ${receiptHTML('Customer Copy')}
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

    // React-Select Custom Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "42px", 
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" },
            fontSize: "13.5px",
            background: "#fff",
            padding: "0px"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 10px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "13.5px" }),
        singleValue: (provided) => ({ ...provided, color: "#111827", fontSize: "13.5px" }),
        option: (provided, state) => ({
            ...provided, fontSize: "13.5px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Client Advances" />
            
            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Client Advances</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage and track advance payments received from clients.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-700 shadow-sm">
                            <i className="fa-solid fa-hand-holding-dollar text-emerald-600"></i>
                            <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-800">Received:</span>
                            <span className="text-[16px] font-bold">TK. {Number(totalReceived).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-red-700 shadow-sm">
                            <i className="fa-solid fa-money-bill-transfer text-red-600"></i>
                            <span className="text-[12px] font-bold uppercase tracking-wider text-red-800">Adjusted:</span>
                            <span className="text-[16px] font-bold">TK. {Number(totalUsed).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-700 shadow-sm">
                            <i className="fa-solid fa-vault text-blue-600"></i>
                            <span className="text-[12px] font-bold uppercase tracking-wider text-blue-800">Net Available:</span>
                            <span className="text-[16px] font-bold">TK. {Number(totalAvailable).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-users-rectangle text-[var(--accent)]"></i> Advance Summary
                        </div>
                        {hasPermission('create_client_advance') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Receive Advance
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[140px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Clients</option>
                                    <option value={25}>25 Clients</option>
                                    <option value={50}>50 Clients</option>
                                    <option value={100}>100 Clients</option>
                                    <option value={500}>500 Clients</option>
                                    <option value={1000}>1000 Clients</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print Summary
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search client name..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12 expand-btn-col"></th>
                                    <th className="px-6 py-4">Client Details</th>
                                    <th className="px-6 py-4 text-right">Total Received</th>
                                    <th className="px-6 py-4 text-right">Total Adjusted</th>
                                    <th className="px-6 py-4 text-right">Net Available</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {clientList.length > 0 ? (
                                    clientList.map((client) => {
                                        const isExpanded = !!expandedClients[String(client.id)];
                                        return (
                                            <React.Fragment key={client.id}>
                                                {/* --- MAIN CLIENT ROW --- */}
                                                <tr className={`border-b border-gray-100 transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                                                    <td className="px-6 py-4 text-center expand-btn-col">
                                                        <button 
                                                            onClick={() => toggleExpand(client.id)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-full border-none bg-gray-200 text-gray-500 transition-colors hover:bg-gray-300 focus:outline-none"
                                                        >
                                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px]`}></i>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 text-[14.5px]">{client.name}</div>
                                                        <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                            <span>{client.company_name || "N/A"}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="font-semibold text-[var(--accent)]">{client.client_advances?.length || 0} Records</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                        TK. {Number(client.total_amount).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-red-500">
                                                        TK. {Number(client.total_used).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider border
                                                            ${client.available_balance > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}
                                                        `}>
                                                            TK. {Number(client.available_balance).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* --- EXPANDED TRANSACTIONS ROW --- */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" className="px-8 py-6 bg-gray-50 border-b border-gray-200 shadow-inner">
                                                            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                                                <table className="w-full border-collapse">
                                                                    <thead className="bg-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-4 py-3">Date</th>
                                                                            <th className="px-4 py-3">Account</th>
                                                                            <th className="px-4 py-3 text-right">Received</th>
                                                                            <th className="px-4 py-3 text-right">Available</th>
                                                                            <th className="px-4 py-3">Note</th>
                                                                            <th className="px-4 py-3 text-right actions-col">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[13px] text-gray-700">
                                                                        {client.client_advances.map((adv) => (
                                                                            <tr key={adv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                                                <td className="px-4 py-3 font-medium">
                                                                                    <i className="fa-regular fa-calendar mr-1.5 text-gray-400"></i>{adv.date}
                                                                                </td>
                                                                                <td className="px-4 py-3 font-semibold text-blue-600">
                                                                                    {adv.account?.name}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                                                    TK. {Number(adv.amount).toLocaleString('en-IN')}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <span className={`font-bold ${adv.amount - adv.used_amount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                                                        TK. {Number(adv.amount - adv.used_amount).toLocaleString('en-IN')}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-gray-500 italic">
                                                                                    {adv.note || "—"}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right actions-col">
                                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                                        {hasPermission('view_client_advance') && (
                                                                                            <button onClick={() => openViewModal(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="View">
                                                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('print_client_advance') && (
                                                                                            <button onClick={() => handlePrintReceipt(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Print Receipt">
                                                                                                <i className="fa-solid fa-print text-[12px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('edit_client_advance') && (
                                                                                            <button onClick={() => openEditModal(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('delete_client_advance') && (
                                                                                            <button onClick={() => handleDelete(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                                                <i className="fa-regular fa-trash-can text-[12px]"></i>
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
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-hand-holding-dollar text-4xl text-gray-300 mb-3"></i>
                                                <p>No client advances found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clientWithAdvances.links && clientWithAdvances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {clientWithAdvances.from || 0} to {clientWithAdvances.to || 0} of {clientWithAdvances.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {clientWithAdvances.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Transaction Details
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto brass-scroll">
                            <div className="text-center mb-6">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Client Name</span>
                                <div className="text-[24px] font-extrabold text-gray-900">
                                    {clients.find(c => c.id == selectedAdvance.client_id)?.name || "N/A"}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5 mb-5 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Amount Received</span>
                                    <div className="text-[18px] font-bold text-emerald-600">TK. {Number(selectedAdvance.amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Adjusted / Used</span>
                                    <div className="text-[18px] font-bold text-red-500">TK. {Number(selectedAdvance.used_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Currently Available</span>
                                    <div className="text-[18px] font-bold text-amber-500">TK. {Number(selectedAdvance.amount - selectedAdvance.used_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Received Date</span>
                                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days text-gray-400"></i> {selectedAdvance.date}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Notes / Reason</span>
                                <div className="text-[14px] text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {selectedAdvance.note || <span className="italic text-gray-400">No additional note provided.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => handlePrintReceipt(selectedAdvance)} className="rounded-lg bg-blue-50 text-blue-600 px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-blue-100 flex items-center gap-2">
                                <i className="fa-solid fa-print"></i> Print Receipt
                            </button>
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Edit Advance" : "✨ Receive Advance"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    
                                    {/* Client Select using react-select */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Client *</label>
                                        <Select
                                            options={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }))}
                                            value={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` })).find((opt) => Number(opt.value) === Number(data.client_id)) || null}
                                            onChange={(selected) => setData("client_id", selected ? selected.value : "")}
                                            placeholder="-- Search Client --"
                                            isSearchable
                                            isClearable
                                            styles={{
                                                control: (provided, state) => ({
                                                    ...provided, 
                                                    minHeight: "42px", 
                                                    borderRadius: "0.5rem",
                                                    border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
                                                    boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
                                                    "&:hover": { borderColor: "#9ca3af" },
                                                    fontSize: "13.5px",
                                                    background: "#fff",
                                                }),
                                                menuPortal: base => ({ ...base, zIndex: 9999 })
                                            }}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.client_id && <span className="mt-1 block text-[12px] text-red-500">{errors.client_id}</span>}
                                    </div>

                                    {/* Account Select */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Deposit To Account *</label>
                                        <Select
                                            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                            value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                            onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                            placeholder="-- Select Account --"
                                            isSearchable
                                            isClearable
                                            styles={{
                                                control: (provided, state) => ({
                                                    ...provided, 
                                                    minHeight: "42px", 
                                                    borderRadius: "0.5rem",
                                                    border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
                                                    boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
                                                    "&:hover": { borderColor: "#9ca3af" },
                                                    fontSize: "13.5px",
                                                    background: "#fff",
                                                }),
                                                menuPortal: base => ({ ...base, zIndex: 9999 })
                                            }}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.account_id && <span className="mt-1 block text-[12px] text-red-500">{errors.account_id}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-emerald-700 mb-1.5">Amount Received (TK.) *</label>
                                        <input 
                                            type="number" 
                                            step="any" 
                                            min="0"
                                            value={data.amount} 
                                            onChange={(e) => setData('amount', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[15px] font-bold text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" 
                                            required 
                                        />
                                        {errors.amount && <span className="mt-1 block text-[12px] text-red-500">{errors.amount}</span>}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Date *</label>
                                        <input 
                                            type="date" 
                                            value={data.date} 
                                            onChange={(e) => setData('date', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        />
                                        {errors.date && <span className="mt-1 block text-[12px] text-red-500">{errors.date}</span>}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Note (Optional)</label>
                                    <textarea 
                                        value={data.note} 
                                        onChange={(e) => setData('note', e.target.value)}
                                        placeholder="Enter any relevant notes..."
                                        rows="3"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 resize-y min-h-[80px]" 
                                    ></textarea>
                                    {errors.note && <span className="mt-1 block text-[12px] text-red-500">{errors.note}</span>}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                    {processing ? "Saving..." : (editMode ? "Update Advance" : "Save Advance")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}