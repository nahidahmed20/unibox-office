import React, { useState, useEffect, useRef, useMemo } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, Link, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";

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
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const twoDigits = (n) => { if (n < 20) return ones[n]; const t = Math.floor(n / 10); const o = n % 10; return tens[t] + (o ? ' ' + ones[o] : ''); };
    const threeDigits = (n) => { const h = Math.floor(n / 100); const rest = n % 100; let str = ''; if (h) str += ones[h] + ' Hundred'; if (rest) str += (str ? ' ' : '') + twoDigits(rest); return str; };
    let n = num; const crore = Math.floor(n / 10000000); n %= 10000000; const lakh = Math.floor(n / 100000); n %= 100000; const thousand = Math.floor(n / 1000); n %= 1000; const hundred = n;
    const parts = [];
    if (crore) parts.push(threeDigits(crore) + ' Crore');
    if (lakh) parts.push(threeDigits(lakh) + ' Lakh');
    if (thousand) parts.push(threeDigits(thousand) + ' Thousand');
    if (hundred) parts.push(threeDigits(hundred));
    return parts.join(' ') + ' Taka Only';
}

function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, renderOption, error, disabled }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setOpen(false); setSearch(""); } }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) => getLabel(opt).toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-[13.5px] font-medium outline-none transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'bg-gray-50 hover:bg-white'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-200 focus:border-[var(--accent)] focus:bg-white'} ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-[13px] outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-[13px] text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-4 py-2.5 text-[13.5px] transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                        {renderOption ? renderOption(opt) : getLabel(opt)}
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

export default function Index({ payments = {}, invoices = [], accounts = [], clients = [], years = [], totalAmount = 0, thisMonthReceived = 0, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);

    const [clientId, setClientId] = useState(filters.client_id || "");
    const [accountFilter, setAccountFilter] = useState(filters.account_id || "");
    const [year, setYear] = useState(filters.year || "");
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);

    const [expandedProjects, setExpandedProjects] = useState([]);
    const toggleProjectExpand = (paymentId) => {
        setExpandedProjects(prev => prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]);
    };

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const { data, setData, post, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "", invoice_id: "", account_id: "", amount: "", discount_amount: "", payment_date: "", note: "", _method: "post",
    });

    const invoiceOptions = useMemo(() => {
        if (editMode && editingPayment?.invoice && !invoices.some((inv) => String(inv.id) === String(editingPayment.invoice_id))) {
            return [{ id: editingPayment.invoice_id, invoice_number: editingPayment.invoice.invoice_number, client: editingPayment.invoice.client, grand_total: editingPayment.invoice.grand_total, due_amount: editingPayment.invoice.grand_total }, ...invoices];
        }
        return invoices;
    }, [invoices, editMode, editingPayment]);

    const applyFilters = (overrides = {}) => {
        router.get(route("invoice-payments.index"), { search: overrides.search ?? searchTerm, per_page: overrides.per_page ?? perPage, client_id: overrides.client_id ?? clientId, account_id: overrides.account_id ?? accountFilter, year: overrides.year ?? year, date_from: overrides.date_from ?? dateFrom, date_to: overrides.date_to ?? dateTo, page: 1 }, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => applyFilters({ search: searchTerm }), 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => { const value = e.target.value === "all" ? "all" : Number(e.target.value); setPerPage(value); applyFilters({ per_page: value }); };
    const handleClientFilter = (e) => { const val = e.target.value; setClientId(val); applyFilters({ client_id: val }); };
    const handleAccountFilter = (e) => { const val = e.target.value; setAccountFilter(val); applyFilters({ account_id: val }); };
    const handleYearFilter = (e) => { setYear(e.target.value); applyFilters({ year: e.target.value }); };
    const handleDateFromChange = (e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); };
    const handleDateToChange = (e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); };

    const handleCopy = () => { /* Logic omitted for brevity */ };
    const handleExportCSV = () => { /* Logic omitted for brevity */ };

    const handlePrint = () => { window.print(); };

    const handlePrintReceipt = (payment) => {
        const client = payment.invoice?.client;
        const receiptNo = String(payment.id).padStart(3, '0');
        const printWindow = window.open('', '_blank');

        const receiptHTML = (copyType) => `
            <div class="receipt">
                <div class="watermark">${COMPANY.name}</div>
                <div class="header">
                    <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                    <div class="company-details"><h2>${COMPANY.name}</h2>${COMPANY.address}<br/>Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</div>
                </div>
                <div class="title-container"><div class="title">Money Receipt</div><div class="copy-badge">${copyType}</div></div>
                <div class="content">
                    <table class="details-table">
                        <tr><td style="width: 50%;"><strong>Receipt No:</strong> #${receiptNo}</td><td style="width: 50%; text-align: right;"><strong>Date:</strong> ${payment.payment_date || ''}</td></tr>
                        <tr><td colspan="2"><strong>Received with thanks from:</strong> ${client?.name || 'N/A'} ${client?.company_name ? `(${client.company_name})` : ''}</td></tr>
                        <tr><td colspan="2"><strong>Against Invoice Ref:</strong> ${payment.invoice?.invoice_number || 'N/A'}</td></tr>
                        <tr><td colspan="2"><strong>Payment Mode:</strong> ${payment.account?.name || 'N/A'}</td></tr>
                        <tr><td colspan="2"><strong>Amount in Words:</strong> <span class="words">${numberToWords(payment.amount)}</span></td></tr>
                        ${payment.note ? `<tr><td colspan="2"><strong>Notes:</strong> ${payment.note}</td></tr>` : ''}
                    </table>
                </div>
                <div class="footer-section"><div class="amount-box">TK. ${Number(payment.amount).toLocaleString('en-IN')}</div><div class="signature"><div class="sign-line">Authorized Signature</div></div></div>
            </div>
        `;

        printWindow.document.write(`<html><head><title>Money Receipt - #${receiptNo}</title><style>* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #fff; } @page { size: A4 portrait; margin: 10mm; } .page-container { width: 190mm; display: flex; flex-direction: column; } .receipt { border: 2px solid #147a5b; border-radius: 10px; padding: 16px 24px; position: relative; overflow: hidden; display: flex; flex-direction: column; } .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 50px; font-weight: 900; color: rgba(20, 122, 91, 0.04); z-index: 0; pointer-events: none; text-transform: uppercase; letter-spacing: 8px; } .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; position: relative; z-index: 1; } .logo { height: 36px; width: auto; } .company-details { text-align: right; font-size: 10px; line-height: 1.4; color: #475569; } .company-details h2 { margin: 0 0 2px 0; font-size: 15px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; } .title-container { text-align: center; margin-bottom: 10px; position: relative; z-index: 1; } .title { display: inline-block; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #147a5b; background: #f0fdf4; padding: 4px 16px; border: 1px solid #147a5b; border-radius: 4px; } .copy-badge { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 9px; font-weight: bold; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; background: #f8fafc; } .content { position: relative; z-index: 1; } .details-table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.5; color: #1e293b; } .details-table td { padding: 4px 0; border-bottom: 1px dotted #cbd5e1; } .details-table strong { color: #475569; font-weight: 600; margin-right: 6px; } .words { font-weight: 700; font-style: italic; color: #0f172a; text-transform: capitalize; } .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding-top: 10px; position: relative; z-index: 1; } .amount-box { border: 2px solid #147a5b; border-radius: 6px; padding: 7px 18px; font-weight: 800; font-size: 15px; color: #147a5b; background: #f0fdf4; } .signature { text-align: center; font-size: 11px; color: #475569; width: 160px; } .sign-line { border-top: 1px solid #0f172a; padding-top: 5px; font-weight: 600; }</style></head><body><div class="page-container">${receiptHTML('Customer Copy')}</div></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const openCreateModal = () => {
        clearErrors();
        setEditingPayment(null);
        setData({ id: '', invoice_id: '', account_id: '', method: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: '' });
        setEditMode(false);
        setShowModal(true);
    };

    const handleInvoiceSelect = (val) => {
        const inv = invoices.find((i) => String(i.id) === String(val));
        setData((prevData) => {
            let newAmount = prevData.amount;
            if (!editMode && inv) {
                const due = parseFloat(inv.due_amount ?? inv.grand_total) || 0;
                const discount = parseFloat(prevData.discount_amount) || 0;
                newAmount = Math.max(due - discount, 0).toString();
            }
            return { ...prevData, invoice_id: val, amount: newAmount };
        });
    };

    const openEditModal = (payment) => {
        clearErrors(); setEditingPayment(payment);
        setData({ id: payment.id, invoice_id: payment.invoice_id, account_id: payment.account_id || "", amount: payment.amount, discount_amount: "", payment_date: payment.payment_date, note: payment.note || "", _method: "put" });
        setEditMode(true); setShowModal(true);
    };

    const openShowModal = (payment) => { setSelectedPayment(payment); setShowDetailsModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            onSuccess: () => { reset(); setShowModal(false); Swal.fire({ title: editMode ? "Updated!" : "Received!", text: editMode ? "Payment updated." : "Payment logged successfully.", icon: "success", confirmButtonColor: "#3b82f6" }); },
            forceFormData: true,
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: "Are you sure?", text: "This will reverse the amount from your account balance.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!" }).then((res) => {
            if (res.isConfirmed) destroy(route("invoice-payments.destroy", id), { onSuccess: () => { Swal.fire("Deleted!", "Payment record removed.", "success"); } });
        });
    };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print { body * { visibility: hidden; } #printable-payment-table, #printable-payment-table * { visibility: visible; } #printable-payment-table { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="flex flex-col gap-8">
                {/* 🟢 NEW: Premium Header just like Investment Page */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Payment Ledger
                        </div>
                        <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight">Invoice Payments</h1>
                        <p className="text-[14px] text-gray-500 mt-1.5 max-w-md">Track received payments, bank deposits, and manage client balances.</p>
                    </div>

                    {/* 🟢 NEW: Top Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                                <i className="fa-solid fa-arrow-down-to-bracket text-[14px]"></i>
                            </div>
                            <div>
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Total Received</div>
                                <div className="text-[18px] font-black text-gray-900 tabular-nums">৳{parseFloat(totalAmount || 0).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-regular fa-calendar-check text-[14px]"></i>
                            </div>
                            <div>
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Received This Month</div>
                                <div className="text-[18px] font-black text-gray-900 tabular-nums">৳{parseFloat(thisMonthReceived || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                                <i className="fa-solid fa-money-bill-wave text-[14px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">Payment Directory</h2>
                                <p className="text-[12px] text-gray-400">{payments.total ?? paymentList.length} total records</p>
                            </div>
                        </div>
                        {hasPermission('create_receive_payment') && (
                            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-sm hover:bg-[#b08630] transition-colors">
                                <i className="fa-solid fa-plus text-[12px]"></i> Receive Payment
                            </button>
                        )}
                    </div>

                    {/* Compact Filter Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/60 border-b border-gray-100">
                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[12.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search INV#, Client, Project, Account..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-[13.5px] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select value={clientId} onChange={handleClientFilter} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-gray-600 outline-none focus:border-[var(--accent)] transition-all cursor-pointer">
                                <option value="">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={accountFilter} onChange={handleAccountFilter} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-gray-600 outline-none focus:border-[var(--accent)] transition-all cursor-pointer">
                                <option value="">All Accounts</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            {(clientId || accountFilter || searchTerm) && (
                                <button onClick={() => { setSearchTerm(""); setClientId(""); setAccountFilter(""); router.get(route("invoice-payments.index"), { per_page: perPage }, { preserveState: true, replace: true }); }} className="flex items-center gap-1 rounded-xl bg-red-50 text-red-600 px-3 py-2.5 text-[12px] font-bold hover:bg-red-100 transition-colors">
                                    <i className="fa-solid fa-xmark"></i> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-payment-table" className="w-full text-left whitespace-nowrap min-w-[1050px]">
                            {/* 🟢 NEW: Header matching Investment style */}
                            <thead className="bg-gray-50/70 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 w-12">SL</th>
                                    <th className="px-6 py-3.5">Client Info</th>
                                    <th className="px-6 py-3.5">Invoice & Project</th>
                                    <th className="px-6 py-3.5">Deposit Account</th>
                                    <th className="px-6 py-3.5">Payment Date</th>
                                    <th className="px-6 py-3.5 text-right">Received Amount</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {paymentList.length > 0 ? paymentList.map((payment, idx) => {
                                    const projects = payment.invoice?.items?.filter(item => item.project);

                                    return (
                                        <tr key={payment.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-medium">
                                                {payments.from ? payments.from + idx : idx + 1}
                                            </td>

                                            {/* 🟢 NEW: Avatar & Client Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold uppercase">
                                                        {(payment.invoice?.client?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[13.5px]">{payment.invoice?.client?.name || "N/A"}</div>
                                                        {payment.invoice?.client?.company_name && (
                                                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">{payment.invoice.client.company_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 🟢 NEW: Invoice & Project Mini Card */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[var(--accent)] mb-2">#{payment.invoice?.invoice_number || "N/A"}</div>
                                                {projects && projects.length > 0 ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        {expandedProjects.includes(payment.id) ? (
                                                            <>
                                                                {projects.map((p, pIdx) => (
                                                                    <div key={pIdx} className="flex items-center gap-2 bg-white border border-gray-200/70 rounded-lg p-1.5 pr-3 w-max shadow-sm animate-[fadeIn_0.2s_ease-out]">
                                                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-50 text-[var(--accent)] border border-gray-100">
                                                                            <i className="fa-solid fa-diagram-project text-[10px]"></i>
                                                                        </div>
                                                                        <span className="text-[12px] font-bold text-gray-800 truncate max-w-[150px]" title={p.project.title}>
                                                                            {p.project.title}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => toggleProjectExpand(payment.id)} className="flex items-center gap-1 px-1 mt-0.5 text-[10px] font-bold text-gray-500 hover:text-gray-700 w-max transition-colors">
                                                                    <i className="fa-solid fa-chevron-up text-[8px]"></i> Show less
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2 bg-white border border-gray-200/70 rounded-lg p-1.5 pr-3 w-max shadow-sm">
                                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-50 text-[var(--accent)] border border-gray-100">
                                                                        <i className="fa-solid fa-diagram-project text-[10px]"></i>
                                                                    </div>
                                                                    <span className="text-[12px] font-bold text-gray-800 truncate max-w-[150px]" title={projects[0].project.title}>
                                                                        {projects[0].project.title}
                                                                    </span>
                                                                </div>
                                                                {projects.length > 1 && (
                                                                    <button onClick={() => toggleProjectExpand(payment.id)} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100/70 text-[9.5px] font-bold text-blue-600 w-max transition-colors hover:bg-blue-100 mt-0.5">
                                                                        +{projects.length - 1} more
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100/80 text-[11px] font-medium text-gray-500">
                                                        <i className="fa-solid fa-layer-group opacity-70"></i> General Bill
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-gray-600 shadow-sm">
                                                    <i className="fa-solid fa-building-columns text-gray-400"></i> {payment.account?.name || "N/A"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-800">{payment.payment_date}</div>
                                                {payment.note && <div className="text-[11px] text-gray-400 max-w-[150px] truncate mt-0.5" title={payment.note}>{payment.note}</div>}
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15px] tabular-nums">
                                                ৳ {parseFloat(payment.amount).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_receive_payment') && (
                                                        <button onClick={() => openShowModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12.5px]"></i>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handlePrintReceipt(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Print Receipt">
                                                        <i className="fa-solid fa-print text-[12.5px]"></i>
                                                    </button>
                                                    {hasPermission('edit_receive_payment') && (
                                                        <button onClick={() => openEditModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[12.5px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_receive_payment') && (
                                                        <button onClick={() => handleDelete(payment.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[12.5px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><i className="fa-solid fa-inbox text-lg"></i></div>
                                                <p className="text-gray-600 font-semibold text-[13.5px]">No payments found</p>
                                                <p className="text-gray-400 text-[12px]">Try a different search term, or receive a new payment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                            <div className="text-[12.5px] text-gray-500">
                                Showing <strong className="text-gray-700">{payments.from || 0}</strong> to <strong className="text-gray-700">{payments.to || 0}</strong> of <strong className="text-gray-700">{payments.total || 0}</strong> records
                            </div>
                            <div className="flex gap-1">
                                {payments.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        disabled={!link.url}
                                        className={`min-w-[34px] text-center px-2.5 py-1.5 rounded-lg border text-[12.5px] font-semibold transition-colors ${link.active ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm' : link.url ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-sack-dollar'} text-[var(--accent)]`}></i>
                                {editMode ? "Edit Payment Record" : "Receive New Payment"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto brass-scroll p-6 flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2">Select Invoice *</label>
                                    <SearchableSelect
                                        options={invoiceOptions}
                                        value={data.invoice_id}
                                        onChange={handleInvoiceSelect}
                                        placeholder="Search INV# or Client"
                                        error={errors.invoice_id}
                                        getValue={(inv) => inv.id}
                                        getLabel={(inv) => `${inv.invoice_number} - ${inv.client?.name} (Due: ৳${parseFloat(inv.due_amount ?? inv.grand_total).toLocaleString()})`}
                                    />
                                    {errors.invoice_id && <span className="mt-1 block text-[11px] text-red-500 font-medium">{errors.invoice_id}</span>}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2">Deposit Account *</label>
                                    <SearchableSelect
                                        options={accounts}
                                        value={data.account_id}
                                        onChange={(val) => setData("account_id", val)}
                                        placeholder="Select Bank/Cash"
                                        error={errors.account_id}
                                        getValue={(acc) => acc.id}
                                        getLabel={(acc) => `${acc.name} (Bal: ৳${parseFloat(acc.current_balance).toLocaleString()})`}
                                    />
                                    {errors.account_id && <span className="mt-1 block text-[11px] text-red-500 font-medium">{errors.account_id}</span>}
                                </div>
                            </div>

                            {data.invoice_id && (() => {
                                const selectedInvoice = invoiceOptions.find((i) => String(i.id) === String(data.invoice_id));
                                if (!selectedInvoice) return null;
                                const due = parseFloat(selectedInvoice.due_amount ?? selectedInvoice.grand_total);
                                return (
                                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 animate-[fadeIn_0.3s_ease-out]">
                                        <span className="text-[13px] font-bold text-blue-800">
                                            <i className="fa-solid fa-circle-info mr-2"></i>
                                            Client's Remaining Due for {selectedInvoice.invoice_number}
                                        </span>
                                        <span className="text-[16px] font-black text-blue-700">৳ {due.toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5 mt-2">
                                <div>
                                    <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wide mb-2">Amount Received *</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[15px]">৳</span>
                                        <input
                                            type="number" step="0.01"
                                            max={data.invoice_id ? Math.max(0, (parseFloat(invoiceOptions.find(i => String(i.id) === String(data.invoice_id))?.due_amount) || 0) - (parseFloat(data.discount_amount) || 0)) : ""}
                                            value={data.amount} onChange={(e) => setData("amount", e.target.value)}
                                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50/60 pl-8 pr-3.5 py-2.5 text-[15px] font-extrabold text-emerald-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                            required
                                        />
                                    </div>
                                    {errors.amount && <span className="mt-1 block text-[11px] text-red-500 font-medium">{errors.amount}</span>}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2">Discount (৳)</label>
                                    <input
                                        type="number" step="0.01" value={data.discount_amount}
                                        onChange={(e) => {
                                            const discValue = e.target.value;
                                            setData(prevData => {
                                                const selectedInvoice = invoices.find(i => String(i.id) === String(prevData.invoice_id));
                                                let newAmount = prevData.amount;
                                                if (!editMode && selectedInvoice) {
                                                    const due = parseFloat(selectedInvoice.due_amount ?? selectedInvoice.grand_total) || 0;
                                                    const discount = parseFloat(discValue) || 0;
                                                    newAmount = Math.max(due - discount, 0).toString();
                                                }
                                                return { ...prevData, discount_amount: discValue, amount: newAmount };
                                            });
                                        }}
                                        placeholder="0.00"
                                        className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] font-medium outline-none transition-all ${editMode ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent)]/10'}`}
                                        disabled={editMode}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2">Payment Date *</label>
                                    <input
                                        type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13.5px] font-medium text-gray-900 outline-none transition-all focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent)]/10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5 mt-2">
                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2">Notes</label>
                                <textarea
                                    value={data.note} onChange={(e) => setData("note", e.target.value)}
                                    placeholder="Transaction ID, Cheque number etc..."
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-[13.5px] font-medium text-gray-900 outline-none transition-all focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent)]/10 resize-y min-h-[80px]"
                                />
                            </div>
                        </form>

                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-[13.5px] font-bold text-gray-600 transition-colors hover:bg-gray-50 shadow-sm">
                                Cancel
                            </button>
                            <button type="submit" onClick={handleSubmit} disabled={processing} className="rounded-xl bg-[var(--accent)] px-8 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#b08630] shadow-sm disabled:opacity-70">
                                {processing ? "Processing..." : "Save Payment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW (Detailed) MODAL --- */}
            {showDetailsModal && selectedPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> Payment Overview
                            </h3>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="text-center mb-8 bg-emerald-50/50 py-6 rounded-2xl border border-emerald-100">
                                <span className="block text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Amount Received</span>
                                <div className="text-[36px] font-black text-emerald-600 tracking-tight flex justify-center items-center gap-1.5">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[26px] text-emerald-400"></i>
                                    {parseFloat(selectedPayment.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 text-[14px]">
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-3">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Client Info</span>
                                    <div className="text-right">
                                        <div className="text-gray-900 font-bold text-[14.5px]">{selectedPayment.invoice?.client?.name}</div>
                                        {selectedPayment.invoice?.client?.company_name && <div className="text-gray-500 text-[12px]">{selectedPayment.invoice.client.company_name}</div>}
                                    </div>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-3 items-center">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Invoice Ref</span>
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">{selectedPayment.invoice?.invoice_number || "N/A"}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-3 items-center">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Account Credited</span>
                                    <span className="text-gray-800 font-bold flex items-center gap-1.5">
                                        <i className="fa-solid fa-building-columns text-[var(--accent)]"></i> {selectedPayment.account?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-3 items-center">
                                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Payment Date</span>
                                    <span className="text-gray-800 font-bold">{selectedPayment.payment_date}</span>
                                </div>
                                {selectedPayment.note && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                                        <span className="block text-gray-500 font-bold uppercase tracking-wider text-[11px] mb-1.5">Notes / Reference</span>
                                        <span className="text-gray-700 text-[13.5px] italic">{selectedPayment.note}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
                            <button type="button" onClick={() => handlePrintReceipt(selectedPayment)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 shadow-sm">
                                <i className="fa-solid fa-print"></i> Print Receipt
                            </button>
                            <button type="button" onClick={() => setShowDetailsModal(false)} className="flex-1 rounded-xl bg-gray-800 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-900 shadow-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
