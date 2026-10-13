import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import CustomSelect from '@/Components/CustomSelect';

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

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

// 🟢 Custom Premium Dropdown (Smooth, searchable, zero z-index clipping)
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, error, disabled }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) => getLabel(opt).toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-[13.5px] font-black outline-none transition-all ${
                    disabled ? 'bg-slate-100 cursor-not-allowed opacity-70 border-slate-200 text-slate-400' : 'bg-white hover:border-indigo-400'
                } ${
                    error ? 'border-red-400 focus:ring-red-500/50' : 'border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs'
                } ${selected && !disabled ? 'text-slate-900' : 'text-slate-400'}`}
            >
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] left-0 flex max-h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-[99999] animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-slate-100 bg-slate-50 p-2.5 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-[12.5px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-xs"
                        />
                    </div>
                    <div className="overflow-y-auto py-1 custom-table-scroll max-h-[200px]">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[12.5px] text-slate-400 font-bold">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => {
                                            onChange(String(getValue(opt)));
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className={`cursor-pointer px-4 py-2.5 text-[13px] font-black transition-colors border-b border-slate-50 last:border-0 ${
                                            isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'
                                        }`}
                                    >
                                        {getLabel(opt)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

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
                .custom-table-scroll::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-table, #printable-table * { visibility: visible; }
                    #printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1500px] mx-auto pb-12 mt-4">

                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Financial Management
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-gray-900 tracking-tight leading-none">Client Advances</h1>
                        <p className="text-[14.5px] text-gray-500 mt-2 max-w-lg leading-relaxed">Manage and track advance payments received from clients efficiently.</p>
                    </div>
                </div>

                {/* 🟢 Modern Minimal Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Card 1: Total Received */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-50 opacity-60 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200">
                                <i className="fa-solid fa-hand-holding-dollar text-[24px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-gray-500">Total Received</p>
                                <h3 className="text-[30px] font-black text-gray-900 m-0 tracking-tight flex items-center tabular-nums">
                                    <Taka className="text-[22px] mr-1.5 opacity-80 text-emerald-600" />{Number(totalReceived).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Total Adjusted */}
                    <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-50 opacity-60 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-200">
                                <i className="fa-solid fa-money-bill-transfer text-[24px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-gray-500">Total Adjusted</p>
                                <h3 className="text-[30px] font-black text-gray-900 m-0 tracking-tight flex items-center tabular-nums">
                                    <Taka className="text-[22px] mr-1.5 opacity-80 text-rose-600" />{Number(totalUsed).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Net Available */}
                    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-indigo-50 opacity-60 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
                                <i className="fa-solid fa-vault text-[24px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-gray-500">Net Available</p>
                                <h3 className="text-[30px] font-black text-gray-900 m-0 tracking-tight flex items-center tabular-nums">
                                    <Taka className="text-[22px] mr-1.5 opacity-80 text-indigo-600" />{Number(totalAvailable).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Data Card */}
                <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar / Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/50 no-print">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">

                            {/* Rows per page */}
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-bold text-gray-500 border-r border-gray-200 uppercase tracking-widest">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={handlePerPageChange} className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]" >

                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search Bar & Create Button */}
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full sm:w-[280px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search client name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] font-medium text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                                />
                            </div>

                            {hasPermission('create_client_advance') && (
                                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-600 shadow-md shrink-0">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add Advance
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 🟢 Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider w-12 expand-btn-col"></th>
                                    <th className="px-6 py-4.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[35%]">Client Profile</th>
                                    <th className="px-6 py-4.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Total Received</th>
                                    <th className="px-6 py-4.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Total Adjusted</th>
                                    <th className="px-6 py-4.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Available</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {clientList.length > 0 ? (
                                    clientList.map((client) => {
                                        const isExpanded = !!expandedClients[String(client.id)];
                                        return (
                                            <React.Fragment key={client.id}>
                                                <tr className={`hover:bg-gray-50/80 transition-colors group ${isExpanded ? 'bg-gray-50/80' : ''}`}>
                                                    <td className="px-6 py-4 text-center expand-btn-col">
                                                        <button
                                                            onClick={() => toggleExpand(client.id)}
                                                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all shadow-sm ${isExpanded ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                                                        >
                                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 text-[14px] font-extrabold uppercase shadow-sm">
                                                                {(client.name || '?').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 text-[14.5px]">{client.name}</div>
                                                                <div className="text-[12px] text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                                                                    <span><i className="fa-regular fa-building mr-1 opacity-70"></i>{client.company_name || "Individual"}</span>
                                                                    <span className="text-gray-300">•</span>
                                                                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{client.client_advances?.length || 0} Entries</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                                        <Taka className="text-[12px] mr-1 opacity-80" />{Number(client.total_amount).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-rose-500 tabular-nums bg-rose-50/20 group-hover:bg-rose-50/40 transition-colors">
                                                        <Taka className="text-[12px] mr-1 opacity-80" />{Number(client.total_used).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {client.available_balance > 0 ? (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 tabular-nums">
                                                                <Taka className="text-[12px] mr-1 opacity-80" />{Number(client.available_balance).toLocaleString('en-IN')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-bold text-gray-500 bg-gray-100 tabular-nums">
                                                                <Taka className="text-[12px] mr-1 opacity-80" />0
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* 🟢 Expandable Nested Table */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" className="px-8 py-6 bg-gray-50/80 border-b border-gray-200">
                                                            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                                                <table className="w-full border-collapse">
                                                                    <thead className="bg-gray-50/50 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-6 py-3.5">Date</th>
                                                                            <th className="px-6 py-3.5">Deposit Account</th>
                                                                            <th className="px-6 py-3.5 text-right">Received</th>
                                                                            <th className="px-6 py-3.5 text-right">Available</th>
                                                                            <th className="px-6 py-3.5 w-[250px]">Note</th>
                                                                            <th className="px-6 py-3.5 text-right actions-col no-print w-[140px]">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[13px] text-gray-700 divide-y divide-gray-100">
                                                                        {client.client_advances.map((adv) => (
                                                                            <tr key={adv.id} className="hover:bg-gray-50/50 transition-colors">
                                                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                                                    {adv.date}
                                                                                </td>
                                                                                <td className="px-6 py-4 font-bold text-gray-700">
                                                                                    <span className="inline-flex items-center gap-1.5">
                                                                                        <i className="fa-solid fa-building-columns text-indigo-400"></i> {adv.account?.name}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right font-bold text-gray-900 tabular-nums">
                                                                                    <Taka className="text-[11px] mr-0.5 opacity-60" />{Number(adv.amount).toLocaleString('en-IN')}
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right tabular-nums">
                                                                                    <span className={`font-bold ${adv.amount - adv.used_amount > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                                                        <Taka className="text-[11px] mr-0.5 opacity-60" />{Number(adv.amount - adv.used_amount).toLocaleString('en-IN')}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4 text-gray-500 italic font-medium max-w-[250px] truncate" title={adv.note}>
                                                                                    {adv.note || "—"}
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right actions-col no-print">
                                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                                        {hasPermission('view_client_advance') && (
                                                                                            <button onClick={() => openViewModal(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm group/btn" title="View">
                                                                                                <i className="fa-regular fa-eye text-[12px] group-hover/btn:scale-110 transition-transform"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('print_client_advance') && (
                                                                                            <button onClick={() => handlePrintReceipt(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm group/btn" title="Print Receipt">
                                                                                                <i className="fa-solid fa-print text-[12px] group-hover/btn:scale-110 transition-transform"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('edit_client_advance') && (
                                                                                            <button onClick={() => openEditModal(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm group/btn" title="Edit">
                                                                                                <i className="fa-regular fa-pen-to-square text-[12px] group-hover/btn:scale-110 transition-transform"></i>
                                                                                            </button>
                                                                                        )}
                                                                                        {hasPermission('delete_client_advance') && (
                                                                                            <button onClick={() => handleDelete(adv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm group/btn" title="Delete">
                                                                                                <i className="fa-regular fa-trash-can text-[12px] group-hover/btn:scale-110 transition-transform"></i>
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
                                                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300 border border-gray-100">
                                                    <i className="fa-solid fa-folder-open text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No client advances found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or record a new advance.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clientWithAdvances.links && clientWithAdvances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing <span className="font-bold text-gray-900">{clientWithAdvances.from || 0}</span> to <span className="font-bold text-gray-900">{clientWithAdvances.to || 0}</span> of <span className="font-bold text-gray-900">{clientWithAdvances.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {clientWithAdvances.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
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

            {/* --- 💎 EXECUTIVE VIEW MODAL (Advance Money Receipt Details) --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">

                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-800 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className="fa-solid fa-receipt"></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-file-invoice-dollar"></i> Money Receipt Details
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            Client Advance Voucher
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            <span>Voucher Ref: #{String(selectedAdvance.id).padStart(6, '0')}</span>
                                            <span className="text-slate-600">•</span>
                                            <span className="text-slate-300"><i className="fa-regular fa-calendar-days text-emerald-400 mr-1"></i>{formatDateDisplay(selectedAdvance.date)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* MODAL BODY */}
                        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto custom-table-scroll flex-1 bg-slate-50">

                            {/* Prominent Amount Card */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40 p-6 rounded-2xl border border-emerald-200 shadow-sm text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-widest mb-2 shadow-xs">
                                    <i className="fa-solid fa-circle-check text-emerald-600"></i> Total Advance Received
                                </div>
                                <div className="text-[32px] sm:text-[38px] font-black text-emerald-700 tracking-tight tabular-nums leading-tight flex items-center justify-center">
                                    <Taka className="text-[26px] mr-1.5 text-emerald-500" />{Number(selectedAdvance.amount).toLocaleString('en-IN')}
                                </div>
                                <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-slate-700 text-[12px] font-bold shadow-xs">
                                    <i className="fa-solid fa-spell-check text-emerald-500"></i>
                                    <span>In Words: <strong className="text-emerald-950 font-black">{numberToWords(selectedAdvance.amount)}</strong></span>
                                </div>
                            </div>

                            {/* Client & Financial Split Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs sm:col-span-2 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-sm">
                                        {(clients.find(c => c.id == selectedAdvance.client_id)?.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Payer / Client</span>
                                        <div className="text-[16px] font-black text-slate-900 truncate">
                                            {clients.find(c => c.id == selectedAdvance.client_id)?.name || "N/A"}
                                        </div>
                                        {clients.find(c => c.id == selectedAdvance.client_id)?.company_name && (
                                            <div className="text-[12.5px] font-semibold text-slate-500">
                                                <i className="fa-regular fa-building text-slate-400 mr-1"></i>
                                                {clients.find(c => c.id == selectedAdvance.client_id)?.company_name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-rose-500 mb-1.5">Adjusted in Invoices</span>
                                    <div className="text-[19px] font-black text-slate-800 tabular-nums leading-none">
                                        <Taka className="text-[14px] mr-0.5 text-rose-400" />{Number(selectedAdvance.used_amount).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-1.5">Net Available Balance</span>
                                    <div className="text-[19px] font-black text-indigo-700 tabular-nums leading-none">
                                        <Taka className="text-[14px] mr-0.5 text-indigo-500" />{Number(selectedAdvance.amount - selectedAdvance.used_amount).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Deposited Account</span>
                                        <div className="font-black text-slate-800 text-[14.5px] flex items-center gap-1.5">
                                            <i className="fa-solid fa-building-columns text-indigo-500"></i>
                                            {selectedAdvance.account?.name || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment Date</span>
                                        <div className="font-black text-slate-800 text-[14.5px] flex items-center gap-1.5 justify-end">
                                            <i className="fa-regular fa-calendar-check text-emerald-500"></i>
                                            {formatDateDisplay(selectedAdvance.date)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedAdvance.note && (
                                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs">
                                    <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Remarks / Cheque / Reference</span>
                                    <div className="text-[13.5px] text-slate-700 italic font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                        "{selectedAdvance.note}"
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrintReceipt(selectedAdvance)}
                                className="rounded-xl bg-slate-900 hover:bg-indigo-600 px-6 py-3 text-[13.5px] font-black text-white transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <i className="fa-solid fa-print"></i> Print Official Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 💎 EXECUTIVE CREATE / EDIT ADVANCE MODAL --- */}
            {showModal && (() => {
                const selectedClientObj = clients.find(c => String(c.id) === String(data.client_id));
                const clientAdvanceStats = (clientWithAdvances.data || []).find(c => String(c.id) === String(data.client_id));
                const currentClientAdvance = clientAdvanceStats ? Number(clientAdvanceStats.available_balance || 0) : 0;
                const selectedAccountObj = accounts.find(a => String(a.id) === String(data.account_id));
                const currentAccountBal = selectedAccountObj ? Number(selectedAccountObj.current_balance || 0) : 0;
                const enteredAmount = Number(data.amount || 0);
                const projectedClientAdvance = currentClientAdvance + enteredAmount;
                const projectedAccountBal = currentAccountBal + enteredAmount;

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                        <div className="w-full max-w-2xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">

                            {/* EXECUTIVE HEADER */}
                            <div className="relative overflow-hidden bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-800 shrink-0">
                                <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                                <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                            <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-hand-holding-dollar'}`}></i>
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                                <i className="fa-solid fa-coins"></i> Client Advance Inflow
                                            </div>
                                            <h3 className="text-[19px] sm:text-[23px] font-black text-white tracking-tight leading-tight">
                                                {editMode ? "Edit Client Advance Record" : "Receive Client Advance"}
                                            </h3>
                                            <p className="text-[12px] sm:text-[13px] font-medium text-slate-400 mt-0.5">
                                                Record upfront advance payment received from client into company accounts
                                            </p>
                                        </div>
                                    </div>

                                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0">
                                        <i className="fa-solid fa-xmark text-lg"></i>
                                    </button>
                                </div>

                                {selectedClientObj && (
                                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-user-tie text-indigo-400"></i>
                                            <span>{selectedClientObj.name} {selectedClientObj.company_name ? `(${selectedClientObj.company_name})` : ''}</span>
                                        </div>
                                        <div className="px-2.5 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[11.5px] tabular-nums">
                                            Current Advance: ৳ {currentClientAdvance.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8 space-y-5 bg-slate-50">
                                    {Object.keys(errors).length > 0 && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-bold text-red-700 shadow-sm flex items-start gap-2.5">
                                            <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5 text-[15px]"></i>
                                            <div>{Object.values(errors).join(' ')}</div>
                                        </div>
                                    )}

                                    {/* INPUTS CARD */}
                                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Select Client <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={clients}
                                                    value={data.client_id}
                                                    onChange={(val) => setData("client_id", val)}
                                                    placeholder="-- Search & select client --"
                                                    getValue={(c) => c.id}
                                                    getLabel={(c) => `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`}
                                                    error={errors.client_id}
                                                />
                                                {errors.client_id && <span className="mt-1 block text-[11px] font-bold text-red-600">{errors.client_id}</span>}
                                            </div>

                                            <div>
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Deposit To Account <span className="text-red-600">*</span>
                                                </label>
                                                <SearchableSelect
                                                    options={accounts}
                                                    value={data.account_id}
                                                    onChange={(val) => setData("account_id", val)}
                                                    placeholder="-- Select bank or cash account --"
                                                    getValue={(a) => a.id}
                                                    getLabel={(a) => `${a.name} (৳ ${Number(a.current_balance).toLocaleString('en-IN')})`}
                                                    error={errors.account_id}
                                                />
                                                {errors.account_id && <span className="mt-1 block text-[11px] font-bold text-red-600">{errors.account_id}</span>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11.5px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                                                    Amount Received (৳) <span className="text-red-600">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-500 text-[16px]">৳</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0.01"
                                                        value={data.amount}
                                                        onChange={(e) => setData('amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full rounded-xl border border-emerald-300 bg-emerald-50/30 focus:bg-white pl-10 pr-4 py-3.5 text-[17px] font-black text-emerald-950 outline-none transition-all focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 shadow-xs"
                                                        required
                                                    />
                                                </div>
                                                {errors.amount && <span className="mt-1 block text-[11px] font-bold text-red-600">{errors.amount}</span>}

                                                {/* Live In-Words Preview */}
                                                {Number(data.amount) > 0 && (
                                                    <div className="mt-2 text-[11.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
                                                        <i className="fa-solid fa-spell-check text-emerald-500 shrink-0"></i>
                                                        <span className="truncate">In Words: <strong className="text-emerald-950 font-black">{numberToWords(data.amount)}</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                    Received Date <span className="text-red-600">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={data.date}
                                                        onChange={(e) => setData('date', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3.5 text-[13.5px] font-black text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs transition-all cursor-pointer"
                                                        required
                                                    />
                                                </div>
                                                {errors.date && <span className="mt-1 block text-[11px] font-bold text-red-600">{errors.date}</span>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Note / Cheque No / Reference <span className="text-slate-400 font-semibold normal-case">(Optional)</span>
                                            </label>
                                            <textarea
                                                value={data.note}
                                                onChange={(e) => setData('note', e.target.value)}
                                                placeholder="e.g., Cheque #849201, Bank transfer memo, Project initial advance payment..."
                                                rows="2"
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13.5px] font-medium text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs resize-none"
                                            />
                                            {errors.note && <span className="mt-1 block text-[11px] font-bold text-red-600">{errors.note}</span>}
                                        </div>
                                    </div>

                                    {/* LIVE CALCULATION & ACCOUNT IMPACT CARD */}
                                    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                                        <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700/60 pb-2 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <i className="fa-solid fa-calculator text-indigo-400"></i> Financial Projection & Impact
                                            </span>
                                            <span className="text-[10px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                                Cash Inflow
                                            </span>
                                        </h4>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div>
                                                <span className="block text-[11px] font-bold text-slate-400 uppercase">Current Client Advance</span>
                                                <span className="text-[16px] sm:text-[18px] font-black text-white tabular-nums">
                                                    ৳ {currentClientAdvance.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[11px] font-bold text-emerald-400 uppercase">Amount Received</span>
                                                <span className="text-[16px] sm:text-[18px] font-black text-emerald-300 tabular-nums">
                                                    ৳ {enteredAmount.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[11px] font-bold text-amber-400 uppercase">Account Deposit Target</span>
                                                <span className="text-[14px] sm:text-[16px] font-black text-amber-300 truncate block" title={selectedAccountObj?.name || 'No account selected'}>
                                                    {selectedAccountObj ? selectedAccountObj.name : 'Not Selected'}
                                                </span>
                                                {selectedAccountObj && (
                                                    <span className="text-[11px] text-slate-400 font-bold block">
                                                        New Bal: ৳ {projectedAccountBal.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <span className="block text-[11px] font-bold text-cyan-300 uppercase">New Advance Balance</span>
                                                <span className="text-[18px] sm:text-[22px] font-black text-cyan-300 tabular-nums leading-tight">
                                                    ৳ {projectedClientAdvance.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3 text-[14px] font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {processing ? (
                                            <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                                        ) : (
                                            <><i className="fa-solid fa-check"></i> {editMode ? "Update Advance Record" : "Confirm Advance Receipt"}</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </AdminLayout>
    );
}
