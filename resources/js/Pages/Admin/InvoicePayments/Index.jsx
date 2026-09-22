import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

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
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3.5 text-[14px] font-semibold outline-none transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70 border-gray-200 text-gray-400' : 'bg-white hover:bg-gray-50'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'} ${selected && !disabled ? 'text-gray-900' : 'text-gray-400'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <i className={`fa-solid fa-chevron-down text-[11px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-500' : ''}`}></i>
            </div>
            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[300px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50 animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-gray-100 bg-gray-50/50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here..." className="w-full rounded-lg border-none bg-white py-2 pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                    </div>
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-gray-400 font-medium">No matches found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-4 py-3 text-[13.5px] transition-colors border-b border-gray-50 last:border-0 ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
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

    // 🔥 FIX: Added 'transform' from useForm
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

        // Sort invoices so oldest invoices get paid first
        const sortedInvoices = [...clientInvoices].sort((a, b) => a.id - b.id);

        sortedInvoices.forEach(inv => {
            if (remaining > 0.001) {
                const due = Number(inv.due_amount);
                if (remaining >= due) {
                    next[inv.id] = { id: inv.id, pay_amount: due, discount: 0 };
                    remaining -= due;
                } else {
                    next[inv.id] = { id: inv.id, pay_amount: Number(remaining.toFixed(2)), discount: 0 };
                    remaining = 0; // Exhausted
                }
            }
        });

        setSelectedInvoices(next);

        if(remaining > 0.01) {
            Swal.fire({
                title: "Overpayment Detected",
                text: `You have allocated all invoices, but ৳${remaining.toLocaleString('en-IN')} is still left over. (Overpayments will NOT be saved automatically. Please adjust the bank amount.)`,
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

    // 🔥 FIX: Adjusted handleSubmit using transform
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!editMode) {
            if (Math.abs(balanceDifference) > 0.01) {
                return Swal.fire("Amount Mismatch", "The total from payment sources must equal the total allocated to invoices. Please click Auto-Allocate.", "error");
            }

            // Set data for bulk insertion properly
            transform((currentData) => ({
                ...currentData,
                client_id: paymentClientId,
                invoices: Object.values(selectedInvoices)
            }));
        } else {
            // Keep normal data for editing
            transform((currentData) => currentData);
        }

        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setShowModal(false);
                Swal.fire({
                    title: editMode ? "Updated!" : "Received!",
                    text: editMode ? "Payment updated." : "Payment logged successfully.",
                    icon: "success",
                    confirmButtonColor: "#4f46e5"
                });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: "Reverse Payment?", text: "This will remove the payment and update the invoice balance.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!" }).then((res) => {
            if (res.isConfirmed) destroy(route("invoice-payments.destroy", id), { onSuccess: () => { Swal.fire("Deleted!", "Payment record removed.", "success"); } });
        });
    };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
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
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Billing & Finance
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Invoice Payments</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Track received payments, apply advances, and manage client billing natively.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-3.5 rounded-2xl border border-teal-200 bg-teal-50/50 px-6 py-4 shadow-sm">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 shadow-sm border border-teal-200">
                                <i className="fa-solid fa-arrow-down-to-bracket text-[18px]"></i>
                            </div>
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600/80">Total Received</div>
                                <div className="text-[20px] font-black text-teal-900 tabular-nums leading-none mt-1"><Taka />{(Number(totalAmount) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-6 py-4 shadow-sm">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200">
                                <i className="fa-regular fa-calendar-check text-[18px]"></i>
                            </div>
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600/80">Received This Month</div>
                                <div className="text-[20px] font-black text-indigo-900 tabular-nums leading-none mt-1"><Taka />{(Number(thisMonthReceived) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-wrap items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40 no-print">
                        <div className="text-[17px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <i className="fa-solid fa-money-bill-wave text-[14px]"></i>
                            </div>
                            Payment Directory
                        </div>
                        {hasPermission('create_receive_payment') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-600 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus text-[12px]"></i> Bulk Payment Entry
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100 no-print">
                        <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                            <div className="flex items-center gap-3">
                                <select value={perPage} onChange={e => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); applyFilters({ per_page: e.target.value === "all" ? "all" : Number(e.target.value) }); }} className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                    <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                </select>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <select value={clientId} onChange={e => { setClientId(e.target.value); applyFilters({ client_id: e.target.value }); }} className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                    <option value="">All Clients</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="relative">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-[200px] rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-indigo-500 shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-2 border-t border-gray-100 min-h-[400px]">
                        <table id="printable-payment-table" className="w-full text-left whitespace-nowrap min-w-[1050px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em]">Client Info</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em]">Invoice Info</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em]">Deposit Source</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em]">Payment Date</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em]">Amount</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-slate-500 uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {paymentList.length > 0 ? paymentList.map((payment, idx) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-400 text-center">{payments.from ? payments.from + idx : idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 text-[13.5px]">{payment.invoice?.client?.name || "N/A"}</div>
                                            {payment.invoice?.client?.company_name && <div className="text-[11.5px] text-gray-500 mt-0.5">{payment.invoice.client.company_name}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-indigo-600 mb-1">#{payment.invoice?.invoice_number || "N/A"}</div>
                                            {Number(payment.discount_amount) > 0 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Includes Discount</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-gray-700 shadow-sm">
                                                <i className={`fa-solid ${payment.method === 'Client Advance' ? 'fa-wallet text-emerald-500' : payment.method === 'Discount Only' ? 'fa-tag text-amber-500' : 'fa-building-columns text-indigo-400'}`}></i>
                                                {payment.method === 'Client Advance' ? 'Client Advance' : payment.method === 'Discount Only' ? 'Discount applied' : (payment.account?.name || "N/A")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-600">
                                            <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar-days text-[11px] text-gray-400"></i> {payment.payment_date}</div>
                                            {payment.note && <div className="text-[11px] text-gray-400 max-w-[150px] truncate mt-1 italic" title={payment.note}>{payment.note}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15px] tabular-nums">
                                            <Taka />{parseFloat(payment.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-right no-print">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => handlePrintReceipt(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Print Receipt"><i className="fa-solid fa-print text-[13px]"></i></button>
                                                {hasPermission('edit_receive_payment') && payment.method === 'Account' && (
                                                    <button onClick={() => openEditModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit"><i className="fa-regular fa-pen-to-square text-[13px]"></i></button>
                                                )}
                                                {hasPermission('delete_receive_payment') && (
                                                    <button onClick={() => handleDelete(payment.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="Reverse Payment"><i className="fa-solid fa-arrow-rotate-left text-[13px]"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" className="px-6 py-20 text-center text-gray-500 font-medium">No payment records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- ADD / EDIT SPLIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/70 backdrop-blur-sm p-4 md:p-6 sm:p-0">
                    <div className={`w-full ${editMode ? 'max-w-2xl' : 'max-w-6xl'} bg-white sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] h-[95vh] md:h-auto overflow-hidden animate-[fadeIn_0.2s_ease-out]`}>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-900 shrink-0">
                            <h3 className="text-[18px] font-bold text-white flex items-center gap-2.5">
                                <i className={`fa-solid ${editMode ? 'fa-pen-to-square text-amber-400' : 'fa-money-bills text-emerald-400'}`}></i>
                                {editMode ? "Edit Payment Record" : "Process Bulk Payment"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white h-8 w-8 rounded-full flex items-center justify-center transition-colors bg-white/10 hover:bg-white/20">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
                            {!editMode ? (
                                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                                    {/* LEFT PANE: Invoices Selection */}
                                    <div className="w-full lg:w-[55%] flex flex-col bg-slate-50 border-r border-gray-200">
                                        <div className="p-6 shrink-0 border-b border-gray-200 bg-white shadow-sm z-10">
                                            <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select Client to view Invoices <span className="text-red-500">*</span></label>
                                            <SearchableSelect
                                                options={clients} value={paymentClientId} onChange={handlePaymentClientSelect}
                                                placeholder="Search client name..." getValue={c => c.id}
                                                getLabel={c => `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`}
                                            />
                                        </div>

                                        <div className="p-6 flex-1 overflow-y-auto custom-table-scroll space-y-4">
                                            {!paymentClientId ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                                    <i className="fa-solid fa-file-invoice fa-3x mb-3"></i>
                                                    <p className="font-medium text-sm">Select a client to see unpaid invoices</p>
                                                </div>
                                            ) : clientInvoices.length === 0 ? (
                                                <div className="text-center py-10">
                                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-3"><i className="fa-solid fa-check-double text-xl"></i></div>
                                                    <p className="font-bold text-gray-700">All Clear!</p>
                                                    <p className="text-sm text-gray-500 mt-1">This client has no pending invoices.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold text-gray-600 uppercase">Pending Invoices</span>
                                                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">{clientInvoices.length} Found</span>
                                                    </div>
                                                    {clientInvoices.map(inv => {
                                                        const isSelected = !!selectedInvoices[inv.id];
                                                        const rowData = selectedInvoices[inv.id] || { pay_amount: '', discount: '' };

                                                        return (
                                                            <div key={inv.id} className={`p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/20 shadow-md relative' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
                                                                <div className="flex items-start gap-4">
                                                                    <div className="pt-1">
                                                                        <input type="checkbox" checked={isSelected} onChange={(e) => handleInvoiceToggle(inv.id, e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div>
                                                                                <div className="font-bold text-gray-900 cursor-pointer" onClick={() => handleInvoiceToggle(inv.id, !isSelected)}>Invoice #{inv.invoice_number}</div>
                                                                                <div className="text-[12px] text-gray-500">Total: ৳{parseFloat(inv.grand_total).toLocaleString()}</div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="text-[11px] font-bold text-gray-400 uppercase">Amount Due</div>
                                                                                <div className="font-black text-rose-500 text-[15px]"><Taka />{parseFloat(inv.due_amount).toLocaleString()}</div>
                                                                            </div>
                                                                        </div>

                                                                        {isSelected && (
                                                                            <div className="mt-4 pt-4 border-t border-indigo-100/50 grid grid-cols-2 gap-3 animate-[fadeIn_0.2s_ease-out]">
                                                                                <div>
                                                                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Pay Amount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">৳</span>
                                                                                        <input type="number" step="0.01" min="0" max={inv.due_amount - (rowData.discount || 0)} value={rowData.pay_amount} onChange={(e) => handleInvoiceChange(inv.id, 'pay_amount', e.target.value)} className="w-full rounded-lg border border-indigo-200 pl-7 pr-3 py-2 text-sm font-bold text-indigo-900 focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.00" />
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Apply Discount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">৳</span>
                                                                                        <input type="number" step="0.01" min="0" max={inv.due_amount - (rowData.pay_amount || 0)} value={rowData.discount} onChange={(e) => handleInvoiceChange(inv.id, 'discount', e.target.value)} className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm font-bold text-gray-700 focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.00" />
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
                                        <div className="p-6 flex-1 overflow-y-auto custom-table-scroll space-y-6">

                                            {/* Summary Box */}
                                            <div className={`p-5 rounded-2xl border ${Math.abs(balanceDifference) < 0.01 ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-200 bg-indigo-50'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[12px] font-bold uppercase tracking-wider text-gray-600">Total Selected to Pay</span>
                                                    <span className="text-[18px] font-black text-gray-900 tabular-nums"><Taka />{totalAllocated.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[12px] font-bold uppercase tracking-wider text-gray-600">Total Payment Received</span>
                                                    <span className="text-[16px] font-bold text-indigo-700 tabular-nums"><Taka />{totalSources.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                </div>

                                                <div className="h-px w-full bg-gray-200 mb-3"></div>

                                                {/* MAGIC BUTTON */}
                                                {totalSources > 0 && Math.abs(balanceDifference) > 0.01 && (
                                                    <button type="button" onClick={autoAllocateFromTotal} className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 shadow-md transition-all w-full animate-[pulse_2s_infinite]">
                                                        <i className="fa-solid fa-wand-magic-sparkles"></i> Auto-Allocate {totalSources.toLocaleString()} ৳
                                                    </button>
                                                )}

                                                {totalSources > 0 && Math.abs(balanceDifference) < 0.01 && (
                                                    <div className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-bold py-2.5 px-4 rounded-xl border border-emerald-200 w-full">
                                                        <i className="fa-solid fa-check-circle"></i> Amount Perfectly Matched!
                                                    </div>
                                                )}

                                                {totalSources === 0 && (
                                                    <div className="text-center text-xs font-bold text-gray-400 mt-2">
                                                        Enter the received amount below first.
                                                    </div>
                                                )}
                                            </div>

                                            {serverErrors?.amount_mismatch && <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{serverErrors.amount_mismatch}</div>}

                                            {/* Date & Note */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Date</label>
                                                    <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} required className="w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm font-semibold text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Note</label>
                                                    <input type="text" placeholder="Ref/Chq info..." value={data.note} onChange={e => setData('note', e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-100"></div>

                                            {/* Advance Input */}
                                            {paymentClient && Number(paymentClient.advance_balance) > 0 && (
                                                <div>
                                                    <label className="flex items-center justify-between text-[11px] font-bold text-emerald-600 uppercase mb-2">
                                                        <span><i className="fa-solid fa-wallet mr-1"></i> Use Client Advance</span>
                                                        <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">Avail: ৳{Number(paymentClient.advance_balance).toLocaleString()}</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                                                        <input type="number" step="0.01" min="0" max={paymentClient.advance_balance} value={data.advance_amount} onChange={e => setData('advance_amount', e.target.value)} className="w-full rounded-xl border border-emerald-300 bg-emerald-50/30 pl-8 pr-3 py-2.5 text-sm font-black text-emerald-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20" placeholder="0.00" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Accounts Input */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-3"><i className="fa-solid fa-building-columns mr-1"></i> Received In Accounts</label>
                                                <div className="space-y-3">
                                                    {(data.account_payments || []).map((row, index) => (
                                                        <div key={index} className="flex gap-2">
                                                            <div className="w-[55%]">
                                                                <SearchableSelect options={accounts} value={row.account_id} onChange={val => updateAccountPayment(index, 'account_id', val)} placeholder="Select Bank/Cash" getValue={acc => acc.id} getLabel={acc => acc.name} />
                                                            </div>
                                                            <div className="w-[35%] relative">
                                                                <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={e => updateAccountPayment(index, 'amount', e.target.value)} className="w-full rounded-xl border border-gray-300 py-[11px] px-3 text-sm font-bold text-gray-800 focus:border-indigo-500 bg-indigo-50/20" />
                                                            </div>
                                                            <button type="button" onClick={() => removeAccountPayment(index)} className="w-[10%] flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-colors"><i className="fa-solid fa-trash-can text-sm"></i></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={addAccountPayment} className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-plus mr-1"></i> Add Another Account</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
                                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition-colors">Cancel</button>
                                            <button type="submit" disabled={processing || totalAllocated === 0 || Math.abs(balanceDifference) > 0.01} className="flex-[2] py-3 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                                {processing ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Processing</> : 'Confirm Payment'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full bg-slate-50">
                                    <div className="p-8 flex-1 overflow-y-auto space-y-6">
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                                            <div>
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">Editing Payment For</span>
                                                <div className="font-bold text-gray-900 mt-0.5">{editingPayment?.invoice?.client?.name}</div>
                                            </div>
                                            <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">INV #{editingPayment?.invoice?.invoice_number}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Deposit Account <span className="text-red-500">*</span></label>
                                                <SearchableSelect options={accounts} value={data.account_id} onChange={(val) => setData("account_id", val)} placeholder="Select Bank/Cash" error={errors.account_id} getValue={(acc) => acc.id} getLabel={(acc) => acc.name} />
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Amount <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} required className="w-full rounded-xl border border-emerald-300 bg-emerald-50/20 pl-9 pr-4 py-3.5 text-[15px] font-black text-emerald-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 shadow-sm" />
                                                </div>
                                                {errors.amount && <span className="mt-1 block text-xs font-bold text-red-500">{errors.amount}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                                <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} required className="w-full rounded-xl border border-gray-300 py-3.5 px-4 text-sm font-semibold text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Notes</label>
                                                <input type="text" value={data.note} onChange={(e) => setData("note", e.target.value)} className="w-full rounded-xl border border-gray-300 py-3.5 px-4 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button type="submit" disabled={processing} className="px-8 py-3 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-md">{processing ? 'Saving...' : 'Save Changes'}</button>
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
