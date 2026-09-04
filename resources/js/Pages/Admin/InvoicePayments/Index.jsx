import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

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

    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page") || filters.per_page;
        return raw === "all" ? "all" : (raw ? Number(raw) : 25);
    });

    const [expandedProjects, setExpandedProjects] = useState([]);
    const toggleProjectExpand = (paymentId) => {
        setExpandedProjects(prev => prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]);
    };

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const { data, setData, post, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "", invoice_id: "", account_id: "", amount: "", advance_amount: "", account_payments: [], discount_amount: "", payment_date: "", note: "", _method: "post",
    });

    const invoiceOptions = useMemo(() => {
        if (editMode && editingPayment?.invoice && !invoices.some((inv) => String(inv.id) === String(editingPayment.invoice_id))) {
            return [{ id: editingPayment.invoice_id, invoice_number: editingPayment.invoice.invoice_number, client: editingPayment.invoice.client, grand_total: editingPayment.invoice.grand_total, due_amount: editingPayment.invoice.grand_total }, ...invoices];
        }
        return invoices;
    }, [invoices, editMode, editingPayment]);

    const applyFilters = (overrides = {}) => {
        router.get(
            route("invoice-payments.index"),
            {
                search: overrides.search ?? searchTerm,
                per_page: overrides.per_page ?? perPage,
                client_id: overrides.client_id ?? clientId,
                account_id: overrides.account_id ?? accountFilter,
                year: overrides.year ?? year,
                date_from: overrides.date_from ?? dateFrom,
                date_to: overrides.date_to ?? dateTo,
                page: 1
            },
            { preserveState: true, replace: true }
        );
    };

    const handleDateChange = (field, val) => {
        if (field === 'date_from') setDateFrom(val);
        if (field === 'date_to') setDateTo(val);
        applyFilters({ [field]: val });
    };

    const clearAllFilters = () => {
        setClientId(""); setAccountFilter(""); setYear(""); setDateFrom(""); setDateTo(""); setSearchTerm("");
        router.get(route("invoice-payments.index"), { per_page: perPage }, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => applyFilters({ search: searchTerm }), 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => { const value = e.target.value === "all" ? "all" : Number(e.target.value); setPerPage(value); applyFilters({ per_page: value }); };
    const handleClientFilter = (e) => { const val = e.target.value; setClientId(val); applyFilters({ client_id: val }); };
    const handleAccountFilter = (e) => { const val = e.target.value; setAccountFilter(val); applyFilters({ account_id: val }); };

    const handleCopy = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = paymentList.map((p, idx) => `${idx + 1}\t${p.invoice?.client?.name}\t${p.invoice?.invoice_number}\t${p.account?.name}\t${p.payment_date}\t${p.amount}`).join("\n");
        navigator.clipboard.writeText("SL\tClient\tInvoice\tAccount\tDate\tAmount\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Client,Invoice,Account,Date,Amount\n"];
        const rows = paymentList.map((p, idx) => `"${idx + 1}","${p.invoice?.client?.name || ''}","${p.invoice?.invoice_number || ''}","${p.account?.name || ''}","${p.payment_date}","${p.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Invoice_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

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
        setData({ id: '', invoice_id: '', account_id: '', amount: '', advance_amount: '', account_payments: [], discount_amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '', _method: 'post' });
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
            return { ...prevData, invoice_id: val, amount: newAmount, advance_amount: '', account_payments: [] };
        });
    };

    const openEditModal = (payment) => {
        clearErrors(); setEditingPayment(payment);
        setData({ id: payment.id, invoice_id: payment.invoice_id, account_id: payment.account_id || "", amount: payment.amount, discount_amount: "", payment_date: payment.payment_date, note: payment.note || "", _method: "put" });
        setEditMode(true); setShowModal(true);
    };

    const addAccountPayment = () => setData('account_payments', [...(data.account_payments || []), { account_id: '', amount: '' }]);
    const updateAccountPayment = (index, field, value) => setData('account_payments', data.account_payments.map((row, i) => i === index ? { ...row, [field]: value } : row));
    const removeAccountPayment = (index) => setData('account_payments', data.account_payments.filter((_, i) => i !== index));

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
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-payment-table, #printable-payment-table * { visibility: visible; }
                    #printable-payment-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header & Top Summary Cards */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Payment Ledger
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Invoice Payments</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Track received payments, bank deposits, and manage client balances.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-3.5 rounded-2xl border border-teal-200 bg-teal-50/50 px-5 py-3 shadow-sm">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 shadow-sm border border-teal-200">
                                <i className="fa-solid fa-arrow-down-to-bracket text-[14px]"></i>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600/80">Total Received</div>
                                <div className="text-[18px] font-black text-teal-900 tabular-nums leading-none"><Taka />{(Number(totalAmount) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-5 py-3 shadow-sm">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200">
                                <i className="fa-regular fa-calendar-check text-[14px]"></i>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/80">Received This Month</div>
                                <div className="text-[18px] font-black text-indigo-900 tabular-nums leading-none"><Taka />{(Number(thisMonthReceived) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-wrap items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-money-bill-wave text-[14px]"></i>
                            </div>
                            Payment Directory
                        </div>
                        {hasPermission('create_receive_payment') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Receive Payment
                            </button>
                        )}
                    </div>

                    {/* Toolbar & Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-3">

                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={handlePerPageChange} className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select value={clientId} onChange={handleClientFilter} className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                <option value="">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <select value={accountFilter} onChange={handleAccountFilter} className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                <option value="">All Accounts</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>

                            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm">
                                <i className="fa-regular fa-calendar-days text-indigo-500 text-[13px]"></i>
                                <input type="date" value={dateFrom} onChange={(e) => handleDateChange('date_from', e.target.value)} className="bg-transparent border-none text-[12.5px] p-0 outline-none cursor-pointer" title="From Date" />
                                <span className="text-gray-400">–</span>
                                <input type="date" value={dateTo} onChange={(e) => handleDateChange('date_to', e.target.value)} className="bg-transparent border-none text-[12.5px] p-0 outline-none cursor-pointer" title="To Date" />
                            </div>

                            {(clientId || accountFilter || dateFrom || dateTo || searchTerm) && (
                                <button onClick={clearAllFilters} className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm">
                                    <i className="fa-solid fa-xmark"></i> Clear
                                </button>
                            )}

                            <div className="relative w-full sm:w-[200px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100">
                        <table id="printable-payment-table" className="w-full text-left whitespace-nowrap min-w-[1050px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Client Info</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Invoice & Project</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Deposit Account</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Payment Date</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Received Amount</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print border-l border-gray-100">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {paymentList.length > 0 ? paymentList.map((payment, idx) => {
                                    const projects = payment.invoice?.items?.filter(item => item.project);

                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400 text-center">
                                                {payments.from ? payments.from + idx : idx + 1}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[12px] font-black uppercase shadow-sm">
                                                        {(payment.invoice?.client?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[13.5px]">{payment.invoice?.client?.name || "N/A"}</div>
                                                        {payment.invoice?.client?.company_name && (
                                                            <div className="text-[11.5px] text-gray-500 font-medium mt-0.5">{payment.invoice.client.company_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-bold text-indigo-600 mb-1.5">#{payment.invoice?.invoice_number || "N/A"}</div>
                                                {projects && projects.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {expandedProjects.includes(payment.id) ? (
                                                            <>
                                                                {projects.map((p, pIdx) => (
                                                                    <div key={pIdx} className="flex items-center gap-1.5 text-[11.5px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50 w-max max-w-[200px] truncate" title={p.project.title}>
                                                                        <i className="fa-solid fa-layer-group text-indigo-400"></i> {p.project.title}
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => toggleProjectExpand(payment.id)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 text-left mt-0.5"><i className="fa-solid fa-chevron-up"></i> Less</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50 w-max max-w-[200px] truncate" title={projects[0].project.title}>
                                                                    <i className="fa-solid fa-layer-group text-indigo-400"></i> {projects[0].project.title}
                                                                </div>
                                                                {projects.length > 1 && (
                                                                    <button onClick={() => toggleProjectExpand(payment.id)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 text-left mt-0.5">+ {projects.length - 1} more</button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-[11.5px] font-bold text-gray-400">General Billing</div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-gray-700 shadow-sm">
                                                    <i className={`fa-solid ${payment.method === 'Client Advance' ? 'fa-wallet text-emerald-500' : 'fa-building-columns text-indigo-400'}`}></i> {payment.method === 'Client Advance' ? 'Client Advance' : (payment.account?.name || "N/A")}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 font-semibold text-gray-600">
                                                <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar-days text-[11px] text-gray-400"></i> {payment.payment_date}</div>
                                                {payment.note && <div className="text-[11.5px] text-gray-400 max-w-[150px] truncate mt-0.5 font-medium" title={payment.note}>{payment.note}</div>}
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15px] tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                                <Taka />{parseFloat(payment.amount).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-right no-print border-l border-gray-100">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_receive_payment') && (
                                                        <button onClick={() => openShowModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handlePrintReceipt(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm" title="Print Receipt">
                                                        <i className="fa-solid fa-print text-[13px]"></i>
                                                    </button>
                                                    {hasPermission('edit_receive_payment') && payment.method !== 'Client Advance' && (
                                                        <button onClick={() => openEditModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_receive_payment') && (
                                                        <button onClick={() => handleDelete(payment.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-200">
                                                    <i className="fa-solid fa-money-bill-wave text-2xl"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No payments found.</p>
                                                <p className="text-[13px] font-medium text-gray-400 mt-1">Try adjusting your filters or receive a new payment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                Showing {payments.from || 0} to {payments.to || 0} of {payments.total || 0} records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {payments.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        disabled={!link.url}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
                                        `}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-sack-dollar'}`}></i> {editMode ? 'Update' : 'Receive'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Edit Payment Record" : "Receive New Payment"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative z-[60]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Invoice <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={invoiceOptions}
                                            value={data.invoice_id}
                                            onChange={handleInvoiceSelect}
                                            placeholder="Search INV# or Client"
                                            error={errors.invoice_id}
                                            getValue={(inv) => inv.id}
                                            getLabel={(inv) => `${inv.invoice_number} - ${inv.client?.name} (Due: ৳${parseFloat(inv.due_amount ?? inv.grand_total).toLocaleString()})`}
                                        />
                                        {errors.invoice_id && <span className="mt-1.5 block text-[11px] text-red-500 font-bold">{errors.invoice_id}</span>}
                                    </div>
                                    {editMode && <div className="relative z-[50]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Deposit Account <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={accounts}
                                            value={data.account_id}
                                            onChange={(val) => setData("account_id", val)}
                                            placeholder="Select Bank/Cash"
                                            error={errors.account_id}
                                            getValue={(acc) => acc.id}
                                            getLabel={(acc) => `${acc.name} (Bal: ৳${parseFloat(acc.current_balance).toLocaleString()})`}
                                        />
                                        {errors.account_id && <span className="mt-1.5 block text-[11px] text-red-500 font-bold">{errors.account_id}</span>}
                                    </div>}
                                </div>

                                {data.invoice_id && (() => {
                                    const selectedInvoice = invoiceOptions.find((i) => String(i.id) === String(data.invoice_id));
                                    if (!selectedInvoice) return null;
                                    const due = parseFloat(selectedInvoice.due_amount ?? selectedInvoice.grand_total);
                                    return (
                                        <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 px-5 py-3.5 shadow-sm">
                                            <span className="text-[13px] font-bold text-blue-900 flex items-center gap-2">
                                                <i className="fa-solid fa-circle-info text-blue-500"></i> Remaining Due for {selectedInvoice.invoice_number}
                                            </span>
                                            <span className="text-[16px] font-black text-blue-700"><Taka /> {due.toLocaleString('en-IN')}</span>
                                        </div>
                                    );
                                })()}

                                {!editMode && data.invoice_id && (() => {
                                    const selectedInvoice = invoiceOptions.find(i => String(i.id) === String(data.invoice_id));
                                    const availableAdvance = Number(selectedInvoice?.available_advance || 0);
                                    const accountTotal = (data.account_payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
                                    const total = Number(data.advance_amount || 0) + accountTotal;
                                    return <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                                        <div className="flex items-center justify-between">
                                            <div><h4 className="font-extrabold text-gray-900">Payment Sources</h4><p className="text-xs text-gray-500 mt-1">Use advance only, accounts only, or combine both.</p></div>
                                            <span className="rounded-lg bg-white border px-3 py-2 text-sm font-black text-indigo-700"><Taka />{total.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Client Advance (Available: <Taka />{availableAdvance.toLocaleString('en-IN')})</label>
                                            <input type="number" min="0" max={availableAdvance} step="0.01" value={data.advance_amount} onChange={e => setData('advance_amount', e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 font-bold text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10" />
                                            {errors.advance_amount && <span className="mt-1 block text-xs font-bold text-red-500">{errors.advance_amount}</span>}
                                        </div>
                                        {(data.account_payments || []).map((row, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_180px_40px] gap-3 items-end">
                                            <div><label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Account {index + 1}</label><SearchableSelect options={accounts.filter(acc => !(data.account_payments || []).some((r, i) => i !== index && String(r.account_id) === String(acc.id)))} value={row.account_id} onChange={val => updateAccountPayment(index, 'account_id', val)} placeholder="Select Bank/Cash" getValue={acc => acc.id} getLabel={acc => `${acc.name} (Bal: ৳${Number(acc.current_balance).toLocaleString()})`} /></div>
                                            <div><label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Amount</label><input type="number" min="0.01" step="0.01" value={row.amount} onChange={e => updateAccountPayment(index, 'amount', e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold outline-none" /></div>
                                            <button type="button" onClick={() => removeAccountPayment(index)} className="h-11 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><i className="fa-solid fa-trash"></i></button>
                                        </div>)}
                                        <button type="button" onClick={addAccountPayment} className="rounded-xl border border-dashed border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50"><i className="fa-solid fa-plus mr-2"></i>Add another account</button>
                                        {errors.account_payments && <span className="block text-xs font-bold text-red-500">{errors.account_payments}</span>}
                                    </div>;
                                })()}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    {editMode && <div>
                                        <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Amount Received <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01"
                                                max={data.invoice_id ? Math.max(0, (parseFloat(invoiceOptions.find(i => String(i.id) === String(data.invoice_id))?.due_amount) || 0) - (parseFloat(data.discount_amount) || 0)) : ""}
                                                value={data.amount} onChange={(e) => setData("amount", e.target.value)}
                                                className="w-full rounded-xl border border-emerald-200 bg-white pl-9 pr-4 py-3 text-[15px] font-black text-emerald-700 outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                                required placeholder="0.00"
                                            />
                                        </div>
                                        {errors.amount && <span className="mt-1.5 block text-[11px] text-red-500 font-bold">{errors.amount}</span>}
                                    </div>}
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Discount (৳)</label>
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
                                            className={`w-full rounded-xl border px-4 py-3 text-[14px] font-bold outline-none transition-shadow shadow-sm ${editMode ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                                            disabled={editMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Notes</label>
                                    <textarea
                                        value={data.note} onChange={(e) => setData("note", e.target.value)}
                                        placeholder="Transaction ID, Cheque number etc..."
                                        className="w-full rounded-xl border border-gray-300 bg-white p-4 text-[14px] font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-y min-h-[90px] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Save Payment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VIEW (Detailed) MODAL --- */}
            {showDetailsModal && selectedPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-6 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[18px] font-extrabold text-white flex items-center gap-2">
                                    <i className="fa-solid fa-file-invoice-dollar text-indigo-200"></i> Payment Overview
                                </h3>
                                <button onClick={() => setShowDetailsModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-table-scroll">
                            <div className="text-center py-7 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                                <span className="block text-[11.5px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Amount Received</span>
                                <div className="text-[36px] font-black text-emerald-600 tracking-tight tabular-nums">
                                    <Taka className="text-[26px]" />{parseFloat(selectedPayment.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <span className="block text-[11.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">Client Info</span>
                                        <div className="text-gray-900 font-extrabold text-[15px]">{selectedPayment.invoice?.client?.name}</div>
                                        {selectedPayment.invoice?.client?.company_name && <div className="text-gray-500 text-[12px] font-medium">{selectedPayment.invoice.client.company_name}</div>}
                                    </div>
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black text-[13px] border border-indigo-100 shadow-sm">#{selectedPayment.invoice?.invoice_number || "N/A"}</span>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-400">Account Credited</span>
                                    <div className="text-gray-900 font-bold flex items-center gap-2">
                                        <i className={`fa-solid ${selectedPayment.method === 'Client Advance' ? 'fa-wallet text-emerald-500' : 'fa-building-columns text-indigo-500'}`}></i> {selectedPayment.method === 'Client Advance' ? 'Client Advance' : selectedPayment.account?.name}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-gray-400">Payment Date</span>
                                    <div className="text-gray-900 font-bold flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days text-indigo-500"></i> {selectedPayment.payment_date}
                                    </div>
                                </div>

                                {selectedPayment.note && (
                                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                        <span className="block text-gray-400 font-bold uppercase tracking-wider text-[11.5px] mb-1.5">Notes / Reference</span>
                                        <span className="text-gray-700 text-[13.5px] font-medium italic">{selectedPayment.note}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-gray-200 bg-white flex items-center gap-3 shrink-0 rounded-b-3xl">
                            <button type="button" onClick={() => handlePrintReceipt(selectedPayment)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 shadow-md">
                                <i className="fa-solid fa-print"></i> Print Receipt
                            </button>
                            <button type="button" onClick={() => setShowDetailsModal(false)} className="flex-1 rounded-xl bg-gray-900 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
