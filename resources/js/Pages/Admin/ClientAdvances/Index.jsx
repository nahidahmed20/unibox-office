import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
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

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

// 🟢 Deeper Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '48px', borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8', // slate-400 for Deep borders
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }, // hover effect slate-500
    }),
    option: (base, state) => ({
        ...base, backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#0F172A', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#0F172A', fontWeight: 700, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
};

export default function Index({ clientWithAdvances = { data: [], links: [] }, clients = [], accounts = [], totalReceived = 0, totalUsed = 0, totalAvailable = 0, filters = {} }) {
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
    const [searchTerm, setSearchTerm] = useState(() => filters.search || new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page") || filters.per_page;
        return raw === "all" ? "all" : (raw ? Number(raw) : 10);
    });
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
            params.per_page = perPage;

            router.get(route('admin.client-advances.index'), params, {
                preserveState: true,
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const handlePerPageChange = (e) => {
        const value = e.target.value === "all" ? "all" : Number(e.target.value);
        setPerPage(value);
        router.get(route('admin.client-advances.index'), { search: searchTerm, per_page: value }, { preserveState: true, replace: true });
    };

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
        navigator.clipboard.writeText("Client Name\tTotal Received\tTotal Adjusted\tNet Available\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
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

    const handlePrint = () => {
        window.print();
    };

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
                        .page-container { width: 100%; max-width: 160mm; display: flex; flex-direction: column; margin: 0 auto; }
                        .receipt { min-height: 110mm; border: 2px solid #147a5b; border-radius: 8px; padding: 20px 25px; position: relative; overflow: hidden; display: flex; flex-direction: column; background: white; }
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
                    <div class="page-container">${receiptHTML('Customer Copy')}</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    // --- Modals Logic ---
    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', client_id: '', account_id: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (advance) => {
        if(advance.used_amount > 0) {
            return Swal.fire("Warning", "Cannot edit! This amount is already used in an invoice.", "warning");
        }
        clearErrors();
        setData({ id: advance.id, client_id: advance.client_id, account_id: advance.account_id, amount: advance.amount, date: advance.date, note: advance.note || '' });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (advance) => {
        setSelectedAdvance(advance);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) return Swal.fire("Required", "Please select a client.", "warning");

        if (editMode) {
            put(route('admin.client-advances.update', data.id), {
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: "success", title: "Updated successfully!", timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.client-advances.store'), {
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: "success", title: "Advance Received!", timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleDelete = (advance) => {
        if(advance.used_amount > 0) return Swal.fire("Restricted", "Cannot delete! Already used in billing.", "error");
        Swal.fire({
            title: 'Delete this transaction?',
            text: `TK. ${advance.amount} will be deducted from the account ledger.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.client-advances.destroy', advance.id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }) });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Client Advances" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-table, #printable-table * { visibility: visible; }
                    #printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-4 px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-piggy-bank"></i> Financial Management
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Client Advances</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Manage and track advance payments received from clients.</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-md border border-emerald-500 text-white min-w-[220px] group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-100">
                                    <i className="fa-solid fa-hand-holding-dollar text-[20px]"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">Received</p>
                                    <h3 className="text-[24px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[15px] text-emerald-200 mr-1" />{Number(totalReceived).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-6 shadow-md border border-rose-400 text-white min-w-[220px] group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-rose-100">
                                    <i className="fa-solid fa-money-bill-transfer text-[20px]"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-rose-200">Adjusted</p>
                                    <h3 className="text-[24px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[15px] text-rose-200 mr-1" />{Number(totalUsed).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-md border border-indigo-500 text-white min-w-[220px] group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100">
                                    <i className="fa-solid fa-vault text-[20px]"></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-200">Net Available</p>
                                    <h3 className="text-[24px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[15px] text-indigo-200 mr-1" />{Number(totalAvailable).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden flex flex-col">

                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50 no-print">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700">
                                <i className="fa-solid fa-users-rectangle text-[15px]"></i>
                            </div>
                            Advance Summary
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            {hasPermission('create_client_advance') && (
                                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-black text-white transition-all hover:bg-indigo-700 shadow-md ml-2 hover:-translate-y-0.5">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Receive Advance
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 bg-white border-b border-slate-200 no-print">
                        <div className="flex flex-wrap items-center gap-3 w-full justify-between">

                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all">
                                <span className="bg-slate-100 px-4 py-2.5 text-[12.5px] font-black text-slate-600 border-r border-slate-300 uppercase tracking-widest">
                                    Show
                                </span>
                                <div className="relative">
                                    <select
                                        value={perPage}
                                        onChange={handlePerPageChange}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-slate-800 outline-none cursor-pointer border-none focus:ring-0 w-[120px]"
                                        style={{ backgroundImage: 'none' }}
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-full sm:w-[280px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search client name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-[13.5px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-center text-[11.5px] font-black text-slate-500 uppercase tracking-widest w-12 expand-btn-col"></th>
                                    <th className="px-6 py-4 text-left text-[11.5px] font-black text-slate-500 uppercase tracking-widest w-[35%]">Client Details</th>
                                    <th className="px-6 py-4 text-right text-[11.5px] font-black text-slate-500 uppercase tracking-widest bg-emerald-50/50 border-l border-slate-200">Total Received</th>
                                    <th className="px-6 py-4 text-right text-[11.5px] font-black text-slate-500 uppercase tracking-widest bg-rose-50/50 border-x border-slate-200">Total Adjusted</th>
                                    <th className="px-6 py-4 text-right text-[11.5px] font-black text-slate-500 uppercase tracking-widest bg-indigo-50/50">Net Available</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {clientList.length > 0 ? (
                                    clientList.map((client) => {
                                        const isExpanded = !!expandedClients[String(client.id)];
                                        return (
                                            <React.Fragment key={client.id}>
                                                <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                                    <td className="px-6 py-4 text-center expand-btn-col">
                                                        <button
                                                            onClick={() => toggleExpand(client.id)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none shadow-sm"
                                                        >
                                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[11px]`}></i>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white text-[13px] font-black uppercase shadow-sm">
                                                                {(client.name || '?').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-extrabold text-slate-900 text-[14.5px]">{client.name}</div>
                                                                <div className="text-[12px] text-slate-500 font-bold mt-1 flex items-center gap-1.5">
                                                                    <span><i className="fa-regular fa-building mr-1 opacity-70"></i>{client.company_name || "N/A"}</span>
                                                                    <span className="text-slate-300">•</span>
                                                                    <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{client.client_advances?.length || 0} Records</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-[16px] tabular-nums bg-emerald-50/20">
                                                        <Taka className="text-[13px] mr-1 opacity-80" />{Number(client.total_amount).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-rose-500 text-[16px] tabular-nums bg-rose-50/20 border-x border-slate-100">
                                                        <Taka className="text-[13px] mr-1 opacity-80" />{Number(client.total_used).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right bg-indigo-50/20">
                                                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-[13px] font-black uppercase tracking-widest border shadow-sm tabular-nums
                                                            ${client.available_balance > 0 ? 'bg-white text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-300'}
                                                        `}>
                                                            <Taka className="text-[12px] mr-1 opacity-80" />{Number(client.available_balance).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* Expanded Transactions Row */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" className="px-8 py-6 bg-slate-50 border-b-2 border-slate-300 shadow-inner">
                                                            <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-sm">
                                                                <table className="w-full border-collapse">
                                                                    <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-300">
                                                                        <tr>
                                                                            <th className="px-6 py-3.5">Date</th>
                                                                            <th className="px-6 py-3.5">Deposit Account</th>
                                                                            <th className="px-6 py-3.5 text-right">Received</th>
                                                                            <th className="px-6 py-3.5 text-right">Available</th>
                                                                            <th className="px-6 py-3.5">Note</th>
                                                                            <th className="px-6 py-3.5 text-right actions-col no-print">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[13.5px] text-slate-700 divide-y divide-slate-100">
                                                                        {client.client_advances.map((adv) => (
                                                                            <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                                                                                <td className="px-6 py-4 font-bold text-slate-600">
                                                                                    <i className="fa-regular fa-calendar-days text-[12px] text-slate-400 mr-1.5"></i>{adv.date}
                                                                                </td>
                                                                                <td className="px-6 py-4 font-black text-indigo-700">
                                                                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 shadow-sm">
                                                                                        <i className="fa-solid fa-building-columns text-indigo-500"></i> {adv.account?.name}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right font-black text-emerald-600 tabular-nums">
                                                                                    <Taka className="text-[12px] mr-0.5 opacity-80" />{Number(adv.amount).toLocaleString('en-IN')}
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right tabular-nums">
                                                                                    <span className={`font-black ${adv.amount - adv.used_amount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                                        <Taka className="text-[12px] mr-0.5 opacity-80" />{Number(adv.amount - adv.used_amount).toLocaleString('en-IN')}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4 text-slate-500 italic font-medium max-w-[200px] truncate" title={adv.note}>
                                                                                    {adv.note || "—"}
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right actions-col no-print">
                                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                                        {hasPermission('view_client_advance') && (
                                                                                            <button onClick={() => openViewModal(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm" title="View">
                                                                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('print_client_advance') && (
                                                                                            <button onClick={() => handlePrintReceipt(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm" title="Print Receipt">
                                                                                                <i className="fa-solid fa-print text-[13px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('edit_client_advance') && (
                                                                                            <button onClick={() => openEditModal(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors shadow-sm" title="Edit">
                                                                                                <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('delete_client_advance') && (
                                                                                            <button onClick={() => handleDelete(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-sm" title="Delete">
                                                                                                <i className="fa-regular fa-trash-can text-[13px]"></i>
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
                                        <td colSpan="5" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm border border-slate-200">
                                                    <i className="fa-solid fa-users-rectangle text-2xl"></i>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800">No client advances found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your filters or receive a new advance.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clientWithAdvances.links && clientWithAdvances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 no-print">
                            <div className="text-[13.5px] font-bold text-slate-600">
                                Showing <span className="font-black text-slate-900">{clientWithAdvances.from || 0}</span> to <span className="font-black text-slate-900">{clientWithAdvances.to || 0}</span> of <span className="font-black text-slate-900">{clientWithAdvances.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {clientWithAdvances.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-black transition-colors shadow-sm
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400' : 'border-slate-200 bg-slate-50 text-slate-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 PREMIUM VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-gray-50 rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">
                        <div className="relative bg-slate-900 px-8 py-8 shrink-0 overflow-hidden border-b border-slate-700">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 opacity-50 translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[22px] font-black text-white flex items-center gap-3">
                                    <i className="fa-solid fa-receipt text-indigo-400"></i> Transaction Details
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white hover:bg-white/10 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white/5">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                            <div className="relative z-10 mt-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-black tracking-widest text-white uppercase shadow-sm">Ref. #{String(selectedAdvance.id).padStart(6, '0')}</span>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-table-scroll bg-slate-50">
                            <div className="text-center py-8 bg-white rounded-3xl border border-emerald-300 shadow-md relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                                <span className="block text-[12px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount Received</span>
                                <div className="text-[40px] font-black text-emerald-600 tracking-tight tabular-nums leading-none">
                                    <Taka className="text-[24px] mr-1 text-emerald-500/80" />{Number(selectedAdvance.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm col-span-2">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-regular fa-building mr-1 text-slate-300"></i> Client Name</span>
                                    <div className="text-[18px] font-black text-slate-900">{clients.find(c => c.id == selectedAdvance.client_id)?.name || "N/A"}</div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-rose-400 mb-1.5"><i className="fa-solid fa-money-bill-transfer mr-1"></i> Adjusted / Used</span>
                                    <div className="text-[18px] font-black text-rose-600 tabular-nums leading-none mt-1"><Taka className="text-[13px] mr-0.5" />{Number(selectedAdvance.used_amount).toLocaleString('en-IN')}</div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-amber-500 mb-1.5"><i className="fa-solid fa-vault mr-1"></i> Net Available</span>
                                    <div className="text-[18px] font-black text-amber-600 tabular-nums leading-none mt-1"><Taka className="text-[13px] mr-0.5" />{Number(selectedAdvance.amount - selectedAdvance.used_amount).toLocaleString('en-IN')}</div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm col-span-2">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-2"><i className="fa-regular fa-calendar-days mr-1 text-slate-300"></i> Received Date</span>
                                    <div className="font-black text-slate-900 flex items-center gap-2 text-[16px]">
                                        {selectedAdvance.date}
                                    </div>
                                </div>
                            </div>

                            {selectedAdvance.note && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-2"><i className="fa-solid fa-align-left mr-1 text-slate-300"></i> Notes / Reason</span>
                                    <div className="text-[14px] text-slate-700 italic font-bold leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        "{selectedAdvance.note}"
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-6 border-t border-slate-300 bg-white flex items-center gap-4 shrink-0 rounded-b-3xl">
                            <button type="button" onClick={() => handlePrintReceipt(selectedAdvance)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 shadow-md">
                                <i className="fa-solid fa-print text-[15px]"></i> Print Receipt
                            </button>
                            <button type="button" onClick={() => setShowViewModal(false)} className="flex-1 rounded-xl bg-slate-900 px-5 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-black shadow-md">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 MODERN CREATE / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2 shadow-sm">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-hand-holding-dollar'}`}></i> {editMode ? 'Update Record' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight leading-none relative z-10">
                                    {editMode ? "Edit Advance" : "Receive Advance"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white/5 relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="relative z-[60] bg-white p-5 rounded-2xl border border-slate-300 shadow-sm md:col-span-2">
                                        <label className="block text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-3"><i className="fa-regular fa-building mr-1.5 text-indigo-500"></i> Select Client <span className="text-red-600">*</span></label>
                                        <Select
                                            options={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }))}
                                            value={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` })).find((opt) => Number(opt.value) === Number(data.client_id)) || null}
                                            onChange={(selected) => setData("client_id", selected ? selected.value : "")}
                                            placeholder="Search client name..."
                                            isSearchable isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            menuPosition="fixed"
                                        />
                                        {errors.client_id && <span className="mt-2 block text-[12px] text-red-600 font-bold">{errors.client_id}</span>}
                                    </div>

                                    <div className="relative z-[50] bg-white p-5 rounded-2xl border border-slate-300 shadow-sm md:col-span-2">
                                        <label className="block text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-3"><i className="fa-solid fa-building-columns mr-1.5 text-indigo-500"></i> Deposit To Account <span className="text-red-600">*</span></label>
                                        <Select
                                            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                            value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                            onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                            placeholder="Select bank or cash account..."
                                            isSearchable isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            menuPosition="fixed"
                                        />
                                        {errors.account_id && <span className="mt-2 block text-[12px] text-red-600 font-bold">{errors.account_id}</span>}
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
                                        <label className="block text-[12.5px] font-black text-emerald-700 uppercase tracking-widest mb-3">Amount Received <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 text-[18px]" />
                                            <input
                                                type="number" step="any" min="0"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-10 pr-4 py-3 text-[16px] font-black text-emerald-800 outline-none transition-shadow focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                                                required
                                            />
                                        </div>
                                        {errors.amount && <span className="mt-2 block text-[12px] text-red-600 font-bold">{errors.amount}</span>}
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
                                        <label className="block text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-3">Date <span className="text-red-600">*</span></label>
                                        <input
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14.5px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 cursor-pointer shadow-sm transition-all"
                                            required
                                        />
                                        {errors.date && <span className="mt-2 block text-[12px] text-red-600 font-bold">{errors.date}</span>}
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm md:col-span-2">
                                        <label className="block text-[12.5px] font-black text-slate-800 uppercase tracking-widest mb-3">Note <span className="text-slate-400 normal-case">(Optional)</span></label>
                                        <textarea
                                            value={data.note}
                                            onChange={(e) => setData('note', e.target.value)}
                                            placeholder="Enter any relevant notes or check details..."
                                            rows="3"
                                            className="w-full rounded-xl border border-slate-400 bg-white p-4 text-[14px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 resize-none min-h-[90px] shadow-sm transition-all"
                                        />
                                        {errors.note && <span className="mt-2 block text-[12px] text-red-600 font-bold">{errors.note}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-10 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Saving...</> : <><i className="fa-solid fa-check text-lg"></i> {editMode ? "Update Advance" : "Save Advance"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
