import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import Swal from "sweetalert2";

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
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-[14px] font-bold outline-none transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 border-gray-200 text-gray-400' : 'bg-white hover:border-indigo-400'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm'} ${selected && !disabled ? 'text-slate-900' : 'text-slate-500'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1.5 flex max-h-[300px] w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl z-50 animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-slate-200 bg-slate-50 p-2.5 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here..." className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                    <div className="overflow-y-auto py-1 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-slate-400 font-bold">No matches found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-4 py-3 text-[13.5px] font-bold transition-colors border-b border-slate-100 last:border-0 ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
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
    const { auth, errors: serverErrors } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);

    // For Multi-Invoice Creation
    const [paymentClientId, setPaymentClientId] = useState('');
    const [selectedInvoices, setSelectedInvoices] = useState({});

    const paymentClient = clients.find(client => String(client.id) === String(paymentClientId));
    const clientInvoices = useMemo(() => invoices.filter(inv => String(inv.client_id ?? inv.client?.id) === String(paymentClientId)), [invoices, paymentClientId]);

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

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const { data, setData, post, delete: destroy, reset, processing, errors, clearErrors, transform } = useForm({
        id: "", invoice_id: "", account_id: "", amount: "", advance_amount: "", account_payments: [{ account_id: '', amount: '' }], payment_date: new Date().toISOString().slice(0, 10), note: "", _method: "post",
    });

    const applyFilters = (overrides = {}) => {
        router.get(route("invoice-payments.index"), {
            search: overrides.search ?? searchTerm, per_page: overrides.per_page ?? perPage,
            client_id: overrides.client_id ?? clientId, account_id: overrides.account_id ?? accountFilter,
            year: overrides.year ?? year, date_from: overrides.date_from ?? dateFrom, date_to: overrides.date_to ?? dateTo, page: 1
        }, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => applyFilters({ search: searchTerm }), 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    // Derived Totals
    const totalAllocated = useMemo(() => {
        return Object.values(selectedInvoices).reduce((sum, inv) => sum + Number(inv.pay_amount || 0), 0);
    }, [selectedInvoices]);

    const totalSources = useMemo(() => {
        return Number(data.advance_amount || 0) + (data.account_payments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    }, [data.advance_amount, data.account_payments]);

    const balanceDifference = totalAllocated - totalSources;

    // 🔥 SMART MAGIC ALLOCATE LOGIC
    const autoAllocateFromTotal = () => {
        if (totalSources <= 0) {
            return Swal.fire("Amount Required", "Please input the received amount in the Bank/Cash section first.", "warning");
        }

        let remaining = totalSources;
        const next = {};

        const sortedInvoices = [...clientInvoices].sort((a, b) => a.id - b.id);

        sortedInvoices.forEach(inv => {
            if (remaining > 0.001) {
                const due = Number(inv.due_amount);
                if (remaining >= due) {
                    next[inv.id] = { id: inv.id, pay_amount: due, discount: 0 };
                    remaining -= due;
                } else {
                    next[inv.id] = { id: inv.id, pay_amount: Number(remaining.toFixed(2)), discount: 0 };
                    remaining = 0;
                }
            }
        });

        setSelectedInvoices(next);

        if(remaining > 0.01) {
            Swal.fire({
                title: "Overpayment Detected",
                text: `You have allocated all invoices, but ৳${remaining.toLocaleString('en-IN')} is still left over.`,
                icon: "info"
            });
        }
    };

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
                        <tr><td colspan="2"><strong>Payment Mode:</strong> ${payment.account?.name || payment.method}</td></tr>
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
        clearErrors(); setEditingPayment(null); setPaymentClientId(''); setSelectedInvoices({});
        setData({ id: '', invoice_id: '', account_id: '', amount: '', advance_amount: '', account_payments: [{ account_id: '', amount: '' }], payment_date: new Date().toISOString().slice(0, 10), note: '', _method: 'post' });
        setEditMode(false); setShowModal(true);
    };

    const handlePaymentClientSelect = (value) => {
        setPaymentClientId(value); setSelectedInvoices({}); clearErrors();
        setData(prev => ({ ...prev, advance_amount: '', account_payments: [{ account_id: '', amount: '' }] }));
    };

    const handleInvoiceToggle = (invoiceId, isChecked) => {
        setSelectedInvoices(prev => {
            const next = { ...prev };
            if (isChecked) {
                const inv = invoices.find(i => String(i.id) === String(invoiceId));
                next[invoiceId] = { id: invoiceId, pay_amount: inv ? inv.due_amount : 0, discount: 0 };
            } else {
                delete next[invoiceId];
            }
            return next;
        });
    };

    const handleInvoiceChange = (invoiceId, field, value) => {
        setSelectedInvoices(prev => ({
            ...prev,
            [invoiceId]: { ...prev[invoiceId], [field]: value }
        }));
    };

    const openEditModal = (payment) => {
        clearErrors(); setEditingPayment(payment);
        setData({ id: payment.id, invoice_id: payment.invoice_id, account_id: payment.account_id || "", amount: payment.amount, payment_date: payment.payment_date, note: payment.note || "", _method: "put" });
        setEditMode(true); setShowModal(true);
    };

    const addAccountPayment = () => setData('account_payments', [...(data.account_payments || []), { account_id: '', amount: '' }]);
    const updateAccountPayment = (index, field, value) => setData('account_payments', data.account_payments.map((row, i) => i === index ? { ...row, [field]: value } : row));
    const removeAccountPayment = (index) => setData('account_payments', data.account_payments.filter((_, i) => i !== index));

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!editMode) {
            if (Math.abs(balanceDifference) > 0.01) {
                return Swal.fire("Amount Mismatch", "The total from payment sources must equal the total allocated to invoices. Please click Auto-Allocate.", "error");
            }
            transform((currentData) => ({ ...currentData, client_id: paymentClientId, invoices: Object.values(selectedInvoices) }));
        } else {
            transform((currentData) => currentData);
        }

        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setShowModal(false);
                Swal.fire({ title: editMode ? "Updated!" : "Received!", text: editMode ? "Payment updated." : "Payment logged successfully.", icon: "success", confirmButtonColor: "#4f46e5" });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: "Reverse Payment?", text: "This will remove the payment and update the invoice balance.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!" }).then((res) => {
            if (res.isConfirmed) destroy(route("invoice-payments.destroy", id), { onSuccess: () => { Swal.fire("Deleted!", "Payment record removed.", "success"); } });
        });
    };

    const inputClassFilter = "w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-[13.5px] font-bold text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-payment-table, #printable-payment-table * { visibility: visible; }
                    #printable-payment-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-4 px-4 sm:px-6 lg:px-8">

                {/* 🟢 Premium Page Header & Summary */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-money-bill-transfer"></i> Billing & Finance
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Invoice Payments</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Track received payments, apply advances, and manage client billing natively.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 px-6 py-6 shadow-md border border-teal-500 text-white min-w-[240px] group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-100">
                                    <i className="fa-solid fa-arrow-down-to-bracket text-2xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-bold uppercase tracking-widest text-teal-200">Total Received</p>
                                    <h3 className="text-[20px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[18px] text-teal-200 mr-1" />{(Number(totalAmount) || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-md border border-indigo-500 text-white min-w-[240px] group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100">
                                    <i className="fa-regular fa-calendar-check text-2xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-bold uppercase tracking-widest text-indigo-200">Received This Month</p>
                                    <h3 className="text-[20px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[18px] text-indigo-200 mr-1" />{(Number(thisMonthReceived) || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50 no-print">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700">
                                <i className="fa-solid fa-money-bill-wave text-[15px]"></i>
                            </div>
                            Payment Directory
                        </div>
                        {hasPermission('create_receive_payment') && (
                            <button onClick={openCreateModal} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-6 py-3 text-[13.5px] font-bold text-white transition-all shadow-md">
                                <i className="fa-solid fa-plus text-[12px]"></i> Bulk Payment Entry
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 bg-white border-b border-slate-200 no-print">
                        <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative w-[130px]">
                                    <select value={perPage} onChange={e => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); applyFilters({ per_page: e.target.value === "all" ? "all" : Number(e.target.value) }); }} className="appearance-none w-full bg-white border border-slate-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                                <div className="relative w-[200px]">
                                    <select value={clientId} onChange={e => { setClientId(e.target.value); applyFilters({ client_id: e.target.value }); }} className="appearance-none w-full bg-white border border-slate-300 rounded-xl pl-4 pr-9 py-2.5 text-[13px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer">
                                        <option value="">All Clients</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="relative w-[280px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]"></i>
                                <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClassFilter} />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-payment-table" className="w-full text-left whitespace-nowrap min-w-[1100px] border-collapse">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10 text-[11.5px] font-black uppercase tracking-widest text-slate-600">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">SL</th>
                                    <th className="px-6 py-4">Client Info</th>
                                    <th className="px-6 py-4">Invoice Info</th>
                                    <th className="px-6 py-4">Deposit Source</th>
                                    <th className="px-6 py-4">Payment Date</th>
                                    <th className="px-6 py-4 text-right bg-emerald-50/50">Amount</th>
                                    <th className="px-6 py-4 text-center no-print w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {paymentList.length > 0 ? paymentList.map((payment, idx) => (
                                    <tr key={payment.id} className="hover:bg-indigo-50/40 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-500 text-center tabular-nums">{payments.from ? payments.from + idx : idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 text-[14px]">{payment.invoice?.client?.name || "N/A"}</div>
                                            {payment.invoice?.client?.company_name && <div className="text-[12px] font-bold text-slate-500 mt-1"><i className="fa-regular fa-building mr-1 opacity-70"></i>{payment.invoice.client.company_name}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-indigo-700 text-[14.5px] mb-1.5">#{payment.invoice?.invoice_number || "N/A"}</div>
                                            {Number(payment.discount_amount) > 0 && <span className="text-[10.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md shadow-sm">Includes Discount</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-black text-slate-700 shadow-sm">
                                                <i className={`fa-solid ${payment.method === 'Client Advance' ? 'fa-piggy-bank text-emerald-500' : payment.method === 'Discount Only' ? 'fa-tag text-amber-500' : 'fa-building-columns text-indigo-500'}`}></i>
                                                {payment.method === 'Client Advance' ? 'Client Advance' : payment.method === 'Discount Only' ? 'Discount applied' : (payment.account?.name || "N/A")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-600">
                                            <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar-days text-[12px] text-slate-400"></i> {payment.payment_date}</div>
                                            {payment.note && <div className="text-[11px] font-semibold text-slate-400 max-w-[180px] truncate mt-1.5 italic border-l-2 border-slate-300 pl-2" title={payment.note}>{payment.note}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                                            <span className="font-black text-emerald-600 text-[15px] tabular-nums flex items-center justify-end">
                                                <Taka className="text-[12px] mr-1 opacity-70"/>{parseFloat(payment.amount).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center no-print">
                                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button onClick={() => handlePrintReceipt(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm transition-colors" title="Print Receipt"><i className="fa-solid fa-print text-[13px]"></i></button>
                                                {hasPermission('edit_receive_payment') && payment.method === 'Account' && (
                                                    <button onClick={() => openEditModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-amber-600 hover:bg-amber-50 hover:border-amber-300 shadow-sm transition-colors" title="Edit"><i className="fa-regular fa-pen-to-square text-[13px]"></i></button>
                                                )}
                                                {hasPermission('delete_receive_payment') && (
                                                    <button onClick={() => handleDelete(payment.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-sm transition-colors" title="Reverse Payment"><i className="fa-solid fa-arrow-rotate-left text-[13px]"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-300 shadow-sm"><i className="fa-solid fa-money-bill-wave text-2xl"></i></div>
                                                <p className="text-[16px] font-black text-slate-800">No payment records found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your search or make a new payment entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
                            <div className="text-[13.5px] font-bold text-slate-600">
                                Showing <span className="font-black text-slate-900">{payments.from || 0}</span> to <span className="font-black text-slate-900">{payments.to || 0}</span> of <span className="font-black text-slate-900">{payments.total || 0}</span> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {payments.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-black transition-colors shadow-sm ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 ADD / EDIT SPLIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 sm:p-0">
                    <div className={`w-full ${editMode ? 'max-w-2xl' : 'max-w-[1200px]'} bg-slate-50 sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] h-[95vh] md:h-auto overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30`}>

                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <h3 className="text-[20px] font-black text-white flex items-center gap-3 relative z-10">
                                <i className={`fa-solid ${editMode ? 'fa-pen-to-square text-amber-400' : 'fa-money-bills text-emerald-400'}`}></i>
                                {editMode ? "Edit Payment Record" : "Process Bulk Payment"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors bg-white/5 border border-white/10 relative z-10 shadow-sm">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
                            {!editMode ? (
                                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                                    {/* LEFT PANE: Invoices Selection */}
                                    <div className="w-full lg:w-[55%] flex flex-col bg-slate-50 border-r border-slate-300">
                                        <div className="p-6 shrink-0 border-b border-slate-300 bg-white shadow-sm z-10">
                                            <label className="block text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2.5">1. Select Client to view Invoices <span className="text-red-600">*</span></label>
                                            <SearchableSelect
                                                options={clients} value={paymentClientId} onChange={handlePaymentClientSelect}
                                                placeholder="Search client name..." getValue={c => c.id}
                                                getLabel={c => `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`}
                                            />
                                        </div>

                                        <div className="p-6 flex-1 overflow-y-auto custom-table-scroll space-y-4">
                                            {!paymentClientId ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                                    <i className="fa-solid fa-file-invoice fa-3x mb-4"></i>
                                                    <p className="font-bold text-sm">Select a client to see unpaid invoices</p>
                                                </div>
                                            ) : clientInvoices.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 border border-emerald-200 shadow-sm"><i className="fa-solid fa-check-double text-2xl"></i></div>
                                                    <p className="font-black text-[18px] text-slate-800 mb-1">All Clear!</p>
                                                    <p className="text-[14px] font-bold text-slate-500">This client has no pending invoices.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                                        <span className="text-[13px] font-black text-slate-800 uppercase tracking-widest"><i className="fa-solid fa-file-invoice-dollar mr-1 text-slate-500"></i> Pending Invoices</span>
                                                        <span className="text-[11px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full shadow-sm">{clientInvoices.length} Found</span>
                                                    </div>
                                                    {clientInvoices.map(inv => {
                                                        const isSelected = !!selectedInvoices[inv.id];
                                                        const rowData = selectedInvoices[inv.id] || { pay_amount: '', discount: '' };

                                                        return (
                                                            <div key={inv.id} className={`p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md relative' : 'border-slate-300 bg-white hover:border-indigo-400 hover:shadow-sm'}`}>
                                                                <div className="flex items-start gap-4">
                                                                    <div className="pt-1.5">
                                                                        <input type="checkbox" checked={isSelected} onChange={(e) => handleInvoiceToggle(inv.id, e.target.checked)} className="w-5 h-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div>
                                                                                <div className="font-black text-slate-900 cursor-pointer text-[15px]" onClick={() => handleInvoiceToggle(inv.id, !isSelected)}>Invoice #{inv.invoice_number}</div>
                                                                                <div className="text-[13px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">Total: <Taka className="text-[11px]" />{parseFloat(inv.grand_total).toLocaleString()}</div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Due</div>
                                                                                <div className="font-black text-rose-600 text-[16px]"><Taka className="text-[13px] mr-0.5 opacity-80" />{parseFloat(inv.due_amount).toLocaleString()}</div>
                                                                            </div>
                                                                        </div>

                                                                        {isSelected && (
                                                                            <div className="mt-5 pt-4 border-t border-indigo-200 grid grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease-out]">
                                                                                <div>
                                                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Pay Amount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                                                                                        <input type="number" step="0.01" min="0" max={inv.due_amount - (rowData.discount || 0)} value={rowData.pay_amount} onChange={(e) => handleInvoiceChange(inv.id, 'pay_amount', e.target.value)} className="w-full rounded-xl border border-slate-400 pl-8 pr-3 py-2.5 text-[14px] font-black text-indigo-900 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all" placeholder="0.00" />
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Apply Discount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                                                                                        <input type="number" step="0.01" min="0" max={inv.due_amount - (rowData.pay_amount || 0)} value={rowData.discount} onChange={(e) => handleInvoiceChange(inv.id, 'discount', e.target.value)} className="w-full rounded-xl border border-slate-400 pl-8 pr-3 py-2.5 text-[14px] font-black text-slate-900 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all" placeholder="0.00" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT PANE: Payment Allocation */}
                                    <div className="w-full lg:w-[45%] flex flex-col bg-white relative">
                                        <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-table-scroll space-y-6">

                                            {/* Summary Box */}
                                            <div className={`p-6 rounded-2xl border-2 shadow-sm ${Math.abs(balanceDifference) < 0.01 ? 'border-emerald-300 bg-emerald-50' : 'border-indigo-300 bg-indigo-50'}`}>
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-indigo-200/50">
                                                    <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">Total Selected to Pay</span>
                                                    <span className="text-[18px] font-black text-slate-900 tabular-nums"><Taka className="text-[14px]" />{totalAllocated.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">Total Payment Received</span>
                                                    <span className="text-[18px] font-black text-indigo-700 tabular-nums"><Taka className="text-[14px]" />{totalSources.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                </div>

                                                {/* MAGIC BUTTON */}
                                                {totalSources > 0 && Math.abs(balanceDifference) > 0.01 && (
                                                    <button type="button" onClick={autoAllocateFromTotal} className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-[14px] font-bold py-3 px-4 rounded-xl border-b-4 border-indigo-800 hover:bg-indigo-500 hover:border-indigo-700 active:border-b-0 active:translate-y-1 shadow-md transition-all w-full animate-[pulse_2s_infinite]">
                                                        <i className="fa-solid fa-wand-magic-sparkles"></i> Auto-Allocate {totalSources.toLocaleString()} ৳
                                                    </button>
                                                )}

                                                {totalSources > 0 && Math.abs(balanceDifference) < 0.01 && (
                                                    <div className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 text-[14px] font-black py-3 px-4 rounded-xl border border-emerald-300 shadow-sm w-full">
                                                        <i className="fa-solid fa-check-circle text-lg"></i> Amount Perfectly Matched!
                                                    </div>
                                                )}

                                                {totalSources === 0 && (
                                                    <div className="text-center text-[12px] font-bold text-slate-500 mt-2 bg-white/50 py-2 rounded-lg border border-slate-200">
                                                        Enter the received amount below first.
                                                    </div>
                                                )}
                                            </div>

                                            {serverErrors?.amount_mismatch && <div className="text-[13px] font-bold text-rose-700 bg-rose-50 p-4 rounded-xl border border-rose-300 shadow-sm flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-rose-500"></i> {serverErrors.amount_mismatch}</div>}

                                            {/* Date & Note */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">Date</label>
                                                    <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} required className="w-full rounded-xl border border-slate-400 py-3 px-4 text-[14px] font-bold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer transition-all" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">Note <span className="text-slate-400 normal-case">(optional)</span></label>
                                                    <input type="text" placeholder="Ref/Chq info..." value={data.note} onChange={e => setData('note', e.target.value)} className="w-full rounded-xl border border-slate-400 py-3 px-4 text-[14px] font-bold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all" />
                                                </div>
                                            </div>

                                            <div className="h-px bg-slate-200"></div>

                                            {/* Advance Input */}
                                            {paymentClient && Number(paymentClient.advance_balance) > 0 && (
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                                                    <label className="flex items-center justify-between text-[11.5px] font-black text-emerald-800 uppercase tracking-widest mb-3">
                                                        <span><i className="fa-solid fa-piggy-bank mr-1 text-emerald-600"></i> Use Client Advance</span>
                                                        <span className="bg-emerald-200/50 px-2.5 py-1 rounded-lg text-[10px] border border-emerald-300">Avail: ৳{Number(paymentClient.advance_balance).toLocaleString()}</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">৳</span>
                                                        <input type="number" step="0.01" min="0" max={paymentClient.advance_balance} value={data.advance_amount} onChange={e => setData('advance_amount', e.target.value)} className="w-full rounded-xl border border-emerald-400 bg-white pl-9 pr-4 py-3 text-[15px] font-black text-emerald-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-sm transition-all" placeholder="0.00" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Accounts Input */}
                                            <div>
                                                <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4"><i className="fa-solid fa-building-columns mr-1.5 text-indigo-500"></i> Received In Accounts</label>
                                                <div className="space-y-4">
                                                    {(data.account_payments || []).map((row, index) => (
                                                        <div key={index} className="flex gap-3">
                                                            <div className="w-[55%]">
                                                                <SearchableSelect options={accounts} value={row.account_id} onChange={val => updateAccountPayment(index, 'account_id', val)} placeholder="Select Bank/Cash" getValue={acc => acc.id} getLabel={acc => acc.name} />
                                                            </div>
                                                            <div className="w-[35%] relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 font-bold text-[13px]">৳</span>
                                                                <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={e => updateAccountPayment(index, 'amount', e.target.value)} className="w-full rounded-xl border border-slate-400 py-[11px] pl-7 pr-3 text-[14px] font-black text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all bg-white" />
                                                            </div>
                                                            <button type="button" onClick={() => removeAccountPayment(index)} className="w-[10%] flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 border border-slate-300 transition-colors shadow-sm"><i className="fa-solid fa-trash-can text-[13px]"></i></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={addAccountPayment} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-[13px] font-black text-slate-600 hover:bg-slate-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors shadow-sm bg-white"><i className="fa-solid fa-plus mr-1.5"></i> Add Another Account</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 sm:p-8 border-t border-slate-300 bg-slate-100 shrink-0 flex gap-4">
                                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-400 bg-white text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                                            <button type="submit" disabled={processing || totalAllocated === 0 || Math.abs(balanceDifference) > 0.01} className="flex-[2] py-3.5 rounded-xl bg-indigo-600 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                                {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing</> : <><i className="fa-solid fa-check text-lg"></i> Confirm Payment</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full bg-slate-50">
                                    <div className="p-6 sm:p-10 flex-1 overflow-y-auto space-y-8">

                                        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md flex justify-between items-center">
                                            <div>
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Editing Payment For</span>
                                                <div className="font-black text-slate-900 mt-1 text-[16px]">{editingPayment?.invoice?.client?.name}</div>
                                            </div>
                                            <span className="font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-4 py-1.5 rounded-xl shadow-sm text-[14px]">INV #{editingPayment?.invoice?.invoice_number}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md">
                                            <div>
                                                <label className="block text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2">Deposit Account <span className="text-red-600">*</span></label>
                                                <SearchableSelect options={accounts} value={data.account_id} onChange={(val) => setData("account_id", val)} placeholder="Select Bank/Cash" error={errors.account_id} getValue={(acc) => acc.id} getLabel={(acc) => acc.name} />
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-black text-emerald-700 uppercase tracking-widest mb-2">Amount <span className="text-red-600">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">৳</span>
                                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} required className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-9 pr-4 py-3 text-[15px] font-black text-emerald-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-sm transition-all" />
                                                </div>
                                                {errors.amount && <span className="mt-1.5 block text-[11px] font-bold text-red-600">{errors.amount}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2">Payment Date <span className="text-red-600">*</span></label>
                                                <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} required className="w-full rounded-xl border border-slate-400 bg-white py-3 px-4 text-[14px] font-bold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm cursor-pointer transition-all" />
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-black text-slate-700 uppercase tracking-widest mb-2">Notes <span className="text-slate-400 normal-case">(optional)</span></label>
                                                <input type="text" placeholder="Ref/Chq info..." value={data.note} onChange={(e) => setData("note", e.target.value)} className="w-full rounded-xl border border-slate-400 bg-white py-3 px-4 text-[14px] font-bold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3.5 rounded-xl border border-slate-400 bg-white text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                                        <button type="submit" disabled={processing} className="px-10 py-3.5 rounded-xl bg-indigo-600 text-[14px] font-bold text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">{processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Saving...</> : <><i className="fa-solid fa-check text-lg"></i> Save Changes</>}</button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
