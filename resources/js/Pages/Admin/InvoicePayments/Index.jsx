import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage, useForm } from "@inertiajs/react";
import Swal from "sweetalert2";
import Select from '@/Components/PortalSelect';
import CustomSelect from '@/Components/CustomSelect';
import TableExportButtons from '@/Components/TableExportButtons';

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

// 🟢 Premium High Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '44px', borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0', // slate-200
        boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        backgroundColor: '#FFFFFF', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#cbd5e1' }
    }),
    placeholder: (base) => ({ ...base, color: '#94a3b8', fontWeight: '600' }),
    singleValue: (base) => ({ ...base, color: '#1e293b', fontWeight: '700' }),
    menu: (base) => ({ ...base, fontSize: '13.5px', borderRadius: '0.75rem', padding: '4px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
        ...base, borderRadius: '0.5rem',
        backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#eef2ff' : 'transparent',
        color: state.isSelected ? '#fff' : '#334155', cursor: 'pointer', fontWeight: state.isSelected ? 800 : 600
    })
};

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

    const [viewMode, setViewMode] = useState("invoice_wise"); // 'invoice_wise' | 'date_wise'

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const getClientGroupKey = (payment) => {
        const cId = payment.invoice?.client_id || payment.invoice?.client?.id || payment.invoice?.client?.name || 'unknown';
        return `${payment.payment_date}__${cId}`;
    };

    const { dailyClientMap, dateWiseGroups } = useMemo(() => {
        const map = {};
        const groups = [];
        paymentList.forEach((payment) => {
            const key = getClientGroupKey(payment);
            if (!map[key]) {
                map[key] = {
                    key,
                    payment_date: payment.payment_date,
                    client: payment.invoice?.client || null,
                    total_amount: 0,
                    total_discount: 0,
                    items: [],
                    methods: [],
                    notes: [],
                };
                groups.push(map[key]);
            }
            const group = map[key];
            group.total_amount += parseFloat(payment.amount || 0);
            group.total_discount += parseFloat(payment.discount_amount || 0);
            group.items.push(payment);

            const methodLabel = payment.method === 'Client Advance'
                ? 'Client Advance'
                : payment.method === 'Discount Only'
                    ? 'Discount applied'
                    : (payment.account?.name || payment.method || 'Account');
            if (methodLabel && !group.methods.includes(methodLabel)) {
                group.methods.push(methodLabel);
            }
            if (payment.note && !group.notes.includes(payment.note)) {
                group.notes.push(payment.note);
            }
        });
        return { dailyClientMap: map, dateWiseGroups: groups };
    }, [paymentList]);

    const exportHeaders = useMemo(() => {
        if (viewMode === 'date_wise') {
            return ['Date', 'Client', 'Entries', 'Methods', 'Invoices Breakdown', 'Total Paid (৳)'];
        }
        return ['SL', 'Payment Date', 'Invoice No', 'Client', 'Method / Account', 'Note', 'Amount (৳)'];
    }, [viewMode]);

    const exportRows = useMemo(() => {
        if (viewMode === 'date_wise') {
            return dateWiseGroups.map(g => [
                g.date,
                g.client?.name || 'N/A',
                g.items.length,
                g.methods.join(', '),
                g.items.map(i => `${i.invoice?.invoice_number || 'Inv'}: ${parseFloat(i.amount).toFixed(2)}`).join(' | '),
                parseFloat(g.total_amount).toFixed(2)
            ]);
        }
        return paymentList.map((p, idx) => [
            idx + 1,
            p.payment_date || '',
            p.invoice?.invoice_number || 'N/A',
            p.invoice?.client?.name || 'N/A',
            p.method === 'Client Advance' ? 'Client Advance' : (p.account?.name || p.method || 'Account'),
            p.note || '',
            parseFloat(p.amount || 0).toFixed(2)
        ]);
    }, [viewMode, dateWiseGroups, paymentList]);

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

    const handleViewModeSwitch = (mode) => {
        setViewMode(mode);
        if (mode === 'date_wise' && perPage !== 'all' && (payments.total || 0) > paymentList.length) {
            setPerPage('all');
            applyFilters({ per_page: 'all' });
        }
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

    const totalDiscount = useMemo(() => {
        return Object.values(selectedInvoices).reduce((sum, inv) => sum + Number(inv.discount || 0), 0);
    }, [selectedInvoices]);

    const totalBillOriginalDue = useMemo(() => {
        return Object.keys(selectedInvoices).reduce((sum, id) => {
            const inv = clientInvoices.find(i => String(i.id) === String(id));
            return sum + Number(inv?.due_amount || 0);
        }, 0);
    }, [selectedInvoices, clientInvoices]);

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
        const next = { ...selectedInvoices };
        const selectedIds = Object.keys(selectedInvoices);

        // If user already selected specific invoice(s), prioritize only those!
        const targetInvoices = selectedIds.length > 0
            ? clientInvoices.filter(inv => selectedIds.includes(String(inv.id)))
            : [...clientInvoices].sort((a, b) => a.id - b.id);

        targetInvoices.forEach(inv => {
            if (remaining > 0.001) {
                if (!next[inv.id]) {
                    next[inv.id] = { id: inv.id, pay_amount: 0, discount: 0 };
                }

                const currentDiscount = Number(next[inv.id].discount || 0);
                const actualDue = Math.max(0, Number(inv.due_amount) - currentDiscount);

                if (actualDue > 0) {
                    if (remaining >= actualDue) {
                        next[inv.id].pay_amount = actualDue;
                        remaining -= actualDue;
                    } else {
                        next[inv.id].pay_amount = Number(remaining.toFixed(2));
                        remaining = 0;
                    }
                }
            }
        });

        setSelectedInvoices(next);

        if (remaining > 0.01) {
            Swal.fire({
                title: "Overpayment Detected",
                text: `You have allocated the target invoice(s), but ৳${remaining.toLocaleString('en-IN')} is still left over.`,
                icon: "info"
            });
        }
    };

    // 🟢 One-click sync received amount from selected invoices net due
    const autoFillReceivedFromInvoices = () => {
        if (totalAllocated <= 0) {
            return Swal.fire("Selection Required", "Please select an invoice and specify the payment amount or discount first.", "info");
        }

        const currentAccounts = [...(data.account_payments || [])];
        const defaultAccountId = currentAccounts[0]?.account_id || accounts[0]?.id || '';
        
        if (currentAccounts.length === 0) {
            setData('account_payments', [{ account_id: defaultAccountId, amount: totalAllocated }]);
        } else {
            currentAccounts[0] = { ...currentAccounts[0], account_id: defaultAccountId, amount: totalAllocated };
            setData('account_payments', currentAccounts);
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

    const handlePrintCombinedReceipt = (group) => {
        const client = group.client;
        const receiptNo = group.items.map(i => String(i.id).padStart(3, '0')).join('/');
        const invoiceBreakdown = group.items
            .map(i => `${i.invoice?.invoice_number || 'INV'} (TK. ${Number(i.amount).toLocaleString('en-IN')})`)
            .join(', ');
        const printWindow = window.open('', '_blank');
        const receiptHTML = (copyType) => `
            <div class="receipt">
                <div class="watermark">${COMPANY.name}</div>
                <div class="header">
                    <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                    <div class="company-details"><h2>${COMPANY.name}</h2>${COMPANY.address}<br/>Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</div>
                </div>
                <div class="title-container"><div class="title">Combined Money Receipt</div><div class="copy-badge">${copyType}</div></div>
                <div class="content">
                    <table class="details-table">
                        <tr><td style="width: 50%;"><strong>Receipt No:</strong> #${receiptNo}</td><td style="width: 50%; text-align: right;"><strong>Date:</strong> ${group.payment_date || ''}</td></tr>
                        <tr><td colspan="2"><strong>Received with thanks from:</strong> ${client?.name || 'N/A'} ${client?.company_name ? `(${client.company_name})` : ''}</td></tr>
                        <tr><td colspan="2"><strong>Against Invoices (${group.items.length}):</strong> ${invoiceBreakdown}</td></tr>
                        <tr><td colspan="2"><strong>Payment Mode:</strong> ${group.methods.join(', ')}</td></tr>
                        <tr><td colspan="2"><strong>Amount in Words:</strong> <span class="words">${numberToWords(group.total_amount)}</span></td></tr>
                        ${group.notes.length > 0 ? `<tr><td colspan="2"><strong>Notes:</strong> ${group.notes.join(' | ')}</td></tr>` : ''}
                    </table>
                </div>
                <div class="footer-section"><div class="amount-box">TOTAL TK. ${Number(group.total_amount).toLocaleString('en-IN')}</div><div class="signature"><div class="sign-line">Authorized Signature</div></div></div>
            </div>
        `;
        printWindow.document.write(`<html><head><title>Combined Money Receipt - ${group.payment_date}</title><style>* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #fff; } @page { size: A4 portrait; margin: 10mm; } .page-container { width: 190mm; display: flex; flex-direction: column; } .receipt { border: 2px solid #147a5b; border-radius: 10px; padding: 16px 24px; position: relative; overflow: hidden; display: flex; flex-direction: column; } .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 50px; font-weight: 900; color: rgba(20, 122, 91, 0.04); z-index: 0; pointer-events: none; text-transform: uppercase; letter-spacing: 8px; } .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; position: relative; z-index: 1; } .logo { height: 36px; width: auto; } .company-details { text-align: right; font-size: 10px; line-height: 1.4; color: #475569; } .company-details h2 { margin: 0 0 2px 0; font-size: 15px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; } .title-container { text-align: center; margin-bottom: 10px; position: relative; z-index: 1; } .title { display: inline-block; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #147a5b; background: #f0fdf4; padding: 4px 16px; border: 1px solid #147a5b; border-radius: 4px; } .copy-badge { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 9px; font-weight: bold; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; background: #f8fafc; } .content { position: relative; z-index: 1; } .details-table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.5; color: #1e293b; } .details-table td { padding: 4px 0; border-bottom: 1px dotted #cbd5e1; } .details-table strong { color: #475569; font-weight: 600; margin-right: 6px; } .words { font-weight: 700; font-style: italic; color: #0f172a; text-transform: capitalize; } .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding-top: 10px; position: relative; z-index: 1; } .amount-box { border: 2px solid #147a5b; border-radius: 6px; padding: 7px 18px; font-weight: 800; font-size: 15px; color: #147a5b; background: #f0fdf4; } .signature { text-align: center; font-size: 11px; color: #475569; width: 160px; } .sign-line { border-top: 1px solid #0f172a; padding-top: 5px; font-weight: 600; }</style></head><body><div class="page-container">${receiptHTML('Customer Copy')}</div></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const openCreateModal = () => {
        clearErrors(); setEditingPayment(null); setPaymentClientId(''); setSelectedInvoices({});
        setData({ id: '', invoice_id: '', account_id: '', amount: '', advance_amount: '', account_payments: [{ account_id: '', amount: '' }], payment_date: new Date().toISOString().slice(0, 10), note: '', _method: 'post' });
        setEditMode(false); setShowModal(true);
    };

    const handlePaymentClientSelect = (selected) => {
        setPaymentClientId(selected ? selected.value : '');
        setSelectedInvoices({}); clearErrors();
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
        setSelectedInvoices(prev => {
            const inv = clientInvoices.find(i => String(i.id) === String(invoiceId));
            const due = Number(inv?.due_amount || 0);
            const current = prev[invoiceId] ? { ...prev[invoiceId] } : { id: invoiceId, pay_amount: 0, discount: 0 };

            if (field === 'discount') {
                const discountValue = value === '' ? 0 : Number(value);
                current.discount = value;
                current.pay_amount = Math.max(0, due - discountValue);
            } else {
                current.pay_amount = value;
            }

            return { ...prev, [invoiceId]: current };
        });
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
            const invoicesList = Object.values(selectedInvoices).filter(inv => Number(inv.pay_amount) > 0 || Number(inv.discount) > 0);

            if (invoicesList.length === 0) {
                return Swal.fire("No Invoices Selected", "Please select at least one invoice and enter a payment amount or discount.", "warning");
            }

            if (Math.abs(balanceDifference) > 0.01) {
                return Swal.fire({
                    title: "Amount Mismatch",
                    html: `
                        <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
                            <p style="margin-bottom: 6px;"><strong>Selected Invoices Due:</strong> ৳${totalBillOriginalDue.toLocaleString('en-IN')}</p>
                            ${totalDiscount > 0 ? `<p style="margin-bottom: 6px; color: #d97706;"><strong>Discount Given:</strong> ৳${totalDiscount.toLocaleString('en-IN')}</p>` : ''}
                            <p style="margin-bottom: 6px; color: #4f46e5;"><strong>Net Amount to Collect:</strong> ৳${totalAllocated.toLocaleString('en-IN')}</p>
                            <p style="margin-bottom: 6px; color: #334155;"><strong>Payment Sources Entered:</strong> ৳${totalSources.toLocaleString('en-IN')}</p>
                            <p style="margin-top: 10px; color: #e11d48; font-weight: bold;">The received payment sources total must match the net amount to collect (৳${totalAllocated.toLocaleString('en-IN')}).</p>
                        </div>
                    `,
                    icon: "error"
                });
            }

            const cleanAccounts = (data.account_payments || []).filter(a => a.account_id && Number(a.amount) > 0);

            if (totalAllocated > 0 && cleanAccounts.length === 0 && Number(data.advance_amount || 0) <= 0) {
                return Swal.fire("Account Required", "Please select at least one Bank/Cash account to receive the payment.", "warning");
            }

            transform((currentData) => ({
                ...currentData,
                client_id: paymentClientId,
                invoices: invoicesList,
                account_payments: cleanAccounts,
            }));
        } else {
            transform((currentData) => currentData);
        }

        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            forceFormData: true,
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                Swal.fire({
                    title: "Payment Error",
                    text: firstErr || "Failed to log payment. Please check your inputs.",
                    icon: "error",
                    confirmButtonColor: "#4f46e5"
                });
            },
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

    const inputClassFilter = "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13.5px] font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm";

    // Options mapping for React-Select
    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }));
    const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));
    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, styles: selectStyles };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-payment-table, #printable-payment-table * { visibility: visible; }
                    #printable-payment-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-12 mt-4 px-4 sm:px-6 lg:px-8 animate-fade-in-up">

                {/* 🟢 Premium Page Header & Summary */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-money-bill-transfer"></i> Billing & Finance
                        </div>
                        <h1 className="text-[28px] sm:text-[34px] font-black text-slate-900 tracking-tight leading-none">Invoice Payments</h1>
                        <p className="text-[14.5px] font-medium text-slate-500 mt-2 max-w-lg">Track received payments, apply advances, and manage client billing natively.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 px-6 py-6 shadow-lg shadow-teal-500/20 border border-teal-400 text-white min-w-[240px] group hover:-translate-y-1 transition-all duration-300">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm">
                                    <i className="fa-solid fa-arrow-down-to-bracket text-2xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-teal-100">Total Received</p>
                                    <h3 className="text-[24px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[18px] text-teal-200 mr-1" />{(Number(totalAmount) || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-6 shadow-lg shadow-blue-500/20 border border-blue-400 text-white min-w-[240px] group hover:-translate-y-1 transition-all duration-300">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm">
                                    <i className="fa-regular fa-calendar-check text-2xl"></i>
                                </div>
                                <div>
                                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-blue-100">Received This Month</p>
                                    <h3 className="text-[24px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                        <Taka className="text-[18px] text-blue-200 mr-1" />{(Number(thisMonthReceived) || 0).toLocaleString('en-IN')}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 px-6 py-5 gap-4 bg-white no-print">
                        <div className="text-[17px] font-black text-slate-800 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm">
                                <i className="fa-solid fa-money-bill-wave text-[16px]"></i>
                            </div>
                            <div>
                                <span>Payment Directory</span>
                                <span className="block text-[11.5px] font-semibold text-slate-400">
                                    {viewMode === 'date_wise' ? 'Daily aggregated payment totals across invoices' : 'Detailed invoice-wise payment ledger'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* 🟢 View Mode Toggle: Invoice-wise vs Date-wise Summary */}
                            <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => handleViewModeSwitch('invoice_wise')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                        viewMode === 'invoice_wise'
                                            ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="fa-solid fa-file-invoice text-[11px]"></i>
                                    <span>Invoice-wise (All)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleViewModeSwitch('date_wise')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                        viewMode === 'date_wise'
                                            ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <i className="fa-solid fa-calendar-check text-[11px]"></i>
                                    <span>Date-wise Total</span>
                                </button>
                            </div>

                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename={viewMode === 'date_wise' ? 'DateWise_Invoice_Payments' : 'Invoice_Payments_Directory'}
                                title={viewMode === 'date_wise' ? 'Date-wise Invoice Payments' : 'Invoice Payments Directory'}
                            />

                            {hasPermission('create_receive_payment') && (
                                <button onClick={openCreateModal} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-6 py-2.5 text-[13.5px] font-bold text-white transition-all shadow-md active:scale-95">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Bulk Payment Entry
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 px-6 py-4 bg-slate-50/50 border-b border-slate-100 no-print">
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Rows per page */}
                                <div className="relative w-[115px]">
                                    <select value={perPage} onChange={e => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); applyFilters({ per_page: e.target.value === "all" ? "all" : Number(e.target.value) }); }} className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer h-[44px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                </div>

                                {/* Client Filter */}
                                <div className="relative w-[210px] z-20">
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(opt => String(opt.value) === String(clientId)) || null}
                                        onChange={selected => { setClientId(selected ? selected.value : ""); applyFilters({ client_id: selected ? selected.value : "" }); }}
                                        placeholder="All Clients"
                                        isSearchable isClearable {...portal}
                                    />
                                </div>

                                {/* Account Filter */}
                                <div className="relative w-[180px] z-20">
                                    <Select
                                        options={accountOptions}
                                        value={accountOptions.find(opt => String(opt.value) === String(accountFilter)) || null}
                                        onChange={selected => { setAccountFilter(selected ? selected.value : ""); applyFilters({ account_id: selected ? selected.value : "" }); }}
                                        placeholder="All Accounts"
                                        isSearchable isClearable {...portal}
                                    />
                                </div>

                                {/* 🟢 Premium Date Range Capsule */}
                                <div className={`inline-flex items-center rounded-xl bg-white border transition-all h-[44px] shadow-sm ${
                                    (dateFrom || dateTo)
                                        ? 'border-indigo-400 ring-2 ring-indigo-500/10 bg-indigo-50/20'
                                        : 'border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10'
                                }`}>
                                    <div className="flex items-center justify-center pl-3.5 pr-2 text-indigo-500 h-full">
                                        <i className="fa-regular fa-calendar-days text-[14px]"></i>
                                    </div>

                                    {/* From Date */}
                                    <div className="flex items-center gap-1.5 px-2 h-full">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">From</span>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={e => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
                                            className="text-[12.5px] font-bold text-slate-800 bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0 w-[115px] sm:w-[125px]"
                                        />
                                    </div>

                                    {/* Arrow Divider */}
                                    <div className="text-slate-300 px-1 select-none flex items-center">
                                        <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                    </div>

                                    {/* To Date */}
                                    <div className="flex items-center gap-1.5 px-2 h-full">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">To</span>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={e => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
                                            className="text-[12.5px] font-bold text-slate-800 bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0 w-[115px] sm:w-[125px]"
                                        />
                                    </div>

                                    {/* Reset Button */}
                                    {(dateFrom || dateTo) && (
                                        <button
                                            type="button"
                                            onClick={() => { setDateFrom(""); setDateTo(""); applyFilters({ date_from: "", date_to: "" }); }}
                                            className="pr-2.5 pl-1.5 h-full flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                                            title="Clear Date Filter"
                                        >
                                            <span className="h-5 w-5 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-[10px]">
                                                <i className="fa-solid fa-xmark"></i>
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Quick Date Presets */}
                                <div className="hidden xl:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 h-[44px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const todayStr = new Date().toISOString().slice(0, 10);
                                            setDateFrom(todayStr); setDateTo(todayStr);
                                            applyFilters({ date_from: todayStr, date_to: todayStr });
                                        }}
                                        className={`px-3 py-1.5 text-[11.5px] font-bold rounded-lg transition-all ${
                                            dateFrom === new Date().toISOString().slice(0, 10) && dateTo === new Date().toISOString().slice(0, 10)
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                        }`}
                                    >
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const now = new Date();
                                            const y = now.getFullYear();
                                            const m = String(now.getMonth() + 1).padStart(2, '0');
                                            const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                                            const from = `${y}-${m}-01`;
                                            const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
                                            setDateFrom(from); setDateTo(to);
                                            applyFilters({ date_from: from, date_to: to });
                                        }}
                                        className="px-3 py-1.5 text-[11.5px] font-bold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
                                    >
                                        This Month
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-[240px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]"></i>
                                <input type="text" placeholder="Search payments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClassFilter} />
                            </div>
                        </div>

                        {/* Active Filters Strip */}
                        {(clientId || accountFilter || dateFrom || dateTo || searchTerm) && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-[12px]">
                                <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider mr-1">Active Filters:</span>
                                {clientId && (
                                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-lg font-bold">
                                        Client: {clients.find(c => String(c.id) === String(clientId))?.name}
                                        <button type="button" onClick={() => { setClientId(''); applyFilters({ client_id: '' }); }} className="hover:text-indigo-900 ml-0.5"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                )}
                                {accountFilter && (
                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg font-bold">
                                        Account: {accounts.find(a => String(a.id) === String(accountFilter))?.name}
                                        <button type="button" onClick={() => { setAccountFilter(''); applyFilters({ account_id: '' }); }} className="hover:text-blue-900 ml-0.5"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                )}
                                {(dateFrom || dateTo) && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg font-bold">
                                        Date: {dateFrom || 'Start'} → {dateTo || 'End'}
                                        <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); applyFilters({ date_from: '', date_to: '' }); }} className="hover:text-emerald-900 ml-0.5"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                )}
                                {searchTerm && (
                                    <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                                        Search: "{searchTerm}"
                                        <button type="button" onClick={() => setSearchTerm('')} className="hover:text-slate-900 ml-0.5"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setClientId(''); setAccountFilter(''); setDateFrom(''); setDateTo(''); setSearchTerm('');
                                        applyFilters({ client_id: '', account_id: '', date_from: '', date_to: '', search: '' });
                                    }}
                                    className="text-rose-600 hover:text-rose-800 font-bold ml-auto text-[11.5px] hover:underline flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset All
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-payment-table" className="w-full text-left whitespace-nowrap min-w-[1100px] border-collapse">
                            <thead className="bg-white/90 backdrop-blur-md border-b-2 border-slate-200 sticky top-0 z-10 text-[11.5px] font-extrabold uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">SL</th>
                                    <th className="px-6 py-4">Client Info</th>
                                    <th className="px-6 py-4">{viewMode === 'date_wise' ? 'Covered Invoices & Breakdown' : 'Invoice Info'}</th>
                                    <th className="px-6 py-4">Deposit Source</th>
                                    <th className="px-6 py-4">Payment Date</th>
                                    <th className="px-6 py-4 text-right">{viewMode === 'date_wise' ? 'Date Total' : 'Amount'}</th>
                                    <th className="px-6 py-4 text-center no-print w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px] text-slate-700 divide-y divide-slate-100">
                                {viewMode === 'date_wise' ? (
                                    dateWiseGroups.length > 0 ? dateWiseGroups.map((group, idx) => (
                                        <tr key={group.key} className="hover:bg-emerald-50/40 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-400 text-center tabular-nums">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-[14.5px]">{group.client?.name || "N/A"}</div>
                                                {group.client?.company_name && <div className="text-[12.5px] font-medium text-slate-500 mt-1"><i className="fa-regular fa-building mr-1.5 text-slate-400"></i>{group.client.company_name}</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[290px]">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border ${group.items.length > 1 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                        <i className="fa-solid fa-layer-group text-[10px]"></i>
                                                        {group.items.length} {group.items.length === 1 ? 'Invoice Payment' : 'Invoice Payments'}
                                                    </span>
                                                    {group.total_discount > 0 && (
                                                        <span className="text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md">
                                                            Discount: ৳{group.total_discount.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {group.items.map((item) => (
                                                        <span key={item.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-2xs">
                                                            <span className="text-indigo-600 font-black">{item.invoice?.invoice_number || 'INV'}</span>
                                                            <span className="text-slate-300">:</span>
                                                            <span className="text-emerald-700 font-black tabular-nums">৳{parseFloat(item.amount).toLocaleString('en-IN')}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {group.methods.map((m, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border bg-white text-slate-700 border-slate-200 px-2.5 py-1 text-[12px] font-bold shadow-2xs">
                                                            <i className="fa-solid fa-building-columns text-slate-400 text-[11px]"></i>
                                                            {m}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                                    <i className="fa-regular fa-calendar-check text-[12.5px] text-emerald-600"></i>
                                                    <span>{group.payment_date}</span>
                                                </div>
                                                {group.notes.length > 0 && (
                                                    <div className="text-[12px] text-slate-400 max-w-[180px] truncate mt-1.5 italic border-l-2 border-slate-200 pl-2" title={group.notes.join(' | ')}>
                                                        {group.notes.join(' | ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-emerald-600 text-[16.5px] tabular-nums flex items-center justify-end">
                                                    <Taka className="text-[14px] mr-1 opacity-80"/>{group.total_amount.toLocaleString('en-IN')}
                                                </span>
                                                <span className="block text-[10.5px] font-extrabold text-emerald-700 mt-0.5">
                                                    Total on date ({group.items.length} {group.items.length === 1 ? 'bill' : 'bills'})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handlePrintCombinedReceipt(group)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[12px] font-black shadow-2xs transition-all"
                                                        title="Print Combined Money Receipt for this Date"
                                                    >
                                                        <i className="fa-solid fa-print text-[12px]"></i> Receipt
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-28 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-300 shadow-sm"><i className="fa-solid fa-money-bill-wave text-2xl"></i></div>
                                                    <p className="text-[16px] font-bold text-slate-700">No payment records found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ) : paymentList.length > 0 ? paymentList.map((payment, idx) => {
                                    const group = dailyClientMap[getClientGroupKey(payment)];
                                    const hasMultipleOnSameDate = group && group.items.length > 1;
                                    return (
                                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-400 text-center tabular-nums">{payments.from ? payments.from + idx : idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-[14.5px]">{payment.invoice?.client?.name || "N/A"}</div>
                                            {payment.invoice?.client?.company_name && <div className="text-[12.5px] font-medium text-slate-500 mt-1"><i className="fa-regular fa-building mr-1.5 text-slate-400"></i>{payment.invoice.client.company_name}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-indigo-600 text-[14.5px] mb-1.5">{payment.invoice?.invoice_number || "N/A"}</div>
                                            {Number(payment.discount_amount) > 0 && <span className="text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md shadow-sm">Includes Discount</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold shadow-sm
                                                ${payment.method === 'Client Advance' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : payment.method === 'Discount Only' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-white text-slate-600 border-slate-200'}
                                            `}>
                                                <i className={`fa-solid ${payment.method === 'Client Advance' ? 'fa-piggy-bank' : payment.method === 'Discount Only' ? 'fa-tag' : 'fa-building-columns text-slate-400'}`}></i>
                                                {payment.method === 'Client Advance' ? 'Client Advance' : payment.method === 'Discount Only' ? 'Discount applied' : (payment.account?.name || "N/A")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            <div className="flex items-center gap-2"><i className="fa-regular fa-calendar-days text-[12.5px] text-slate-400"></i> {payment.payment_date}</div>
                                            {payment.note && <div className="text-[12px] text-slate-400 max-w-[180px] truncate mt-1.5 italic border-l-2 border-slate-200 pl-2" title={payment.note}>{payment.note}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right group-hover:bg-slate-50/50 transition-colors">
                                            <span className="font-bold text-emerald-600 text-[15px] tabular-nums flex items-center justify-end">
                                                <Taka className="text-[13px] mr-1 opacity-70"/>{parseFloat(payment.amount).toLocaleString('en-IN')}
                                            </span>
                                            {hasMultipleOnSameDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewModeSwitch('date_wise')}
                                                    className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10.5px] font-black text-indigo-700 transition-colors"
                                                    title="View combined payments received on this date"
                                                >
                                                    <i className="fa-solid fa-layer-group text-[9px]"></i>
                                                    Total on date: ৳{group.total_amount.toLocaleString('en-IN')} ({group.items.length} {group.items.length === 1 ? 'bill' : 'bills'})
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center no-print">
                                            <div className="flex items-center justify-center gap-2 transition-opacity duration-200">
                                                <button onClick={() => handlePrintReceipt(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border border-transparent text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200 shadow-none hover:shadow-sm transition-all" title="Print Single Invoice Receipt"><i className="fa-solid fa-print text-[14px]"></i></button>
                                                {hasMultipleOnSameDate && (
                                                    <button onClick={() => handlePrintCombinedReceipt(group)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-2xs transition-all" title={`Print Combined Receipt (৳${group.total_amount.toLocaleString('en-IN')})`}><i className="fa-solid fa-layer-group text-[12px]"></i></button>
                                                )}
                                                {hasPermission('edit_receive_payment') && payment.method === 'Account' && (
                                                    <button onClick={() => openEditModal(payment)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border border-transparent text-amber-500 hover:bg-amber-50 hover:border-amber-200 shadow-none hover:shadow-sm transition-all" title="Edit"><i className="fa-regular fa-pen-to-square text-[14px]"></i></button>
                                                )}
                                                {hasPermission('delete_receive_payment') && (
                                                    <button onClick={() => handleDelete(payment.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border border-transparent text-rose-500 hover:bg-rose-50 hover:border-rose-200 shadow-none hover:shadow-sm transition-all" title="Reverse Payment"><i className="fa-solid fa-arrow-rotate-left text-[14px]"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-28 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-300 shadow-sm"><i className="fa-solid fa-money-bill-wave text-2xl"></i></div>
                                                <p className="text-[16px] font-bold text-slate-700">No payment records found.</p>
                                                <p className="text-[13.5px] font-medium text-slate-500 mt-1">Try adjusting your search or make a new payment entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-slate-500">
                                Showing <span className="font-bold text-slate-800">{payments.from || 0}</span> to <span className="font-bold text-slate-800">{payments.to || 0}</span> of <span className="font-bold text-slate-800">{payments.total || 0}</span> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {payments.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[34px] items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-bold transition-all ${link.active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : link.url ? 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50' : 'pointer-events-none bg-transparent text-slate-300'}`} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[11px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[11px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 ADD / EDIT SPLIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className={`w-full ${editMode ? 'max-w-2xl' : 'max-w-[1200px]'} bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[scaleIn_0.2s_ease-out]`}>

                        {/* Executive Header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-money-bills'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-receipt"></i> Client Settlement Ledger
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {editMode ? "Edit Payment Record" : "Process Bulk Payment"}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            {editMode
                                                ? "Update received transaction amount, account and particulars"
                                                : "Allocate collections across invoices, advance balances & accounts"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-800/80 border border-slate-700 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
                            {!editMode ? (
                                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                                    {/* LEFT PANE: Invoices Selection */}
                                    <div className="w-full lg:w-[55%] flex flex-col bg-slate-50/50 border-r border-slate-100">
                                        <div className="p-6 shrink-0 border-b border-slate-100 bg-white shadow-sm z-20">
                                            <label className="block text-[12px] font-bold text-slate-700 mb-2">1. Select Client to view Invoices <span className="text-red-500">*</span></label>
                                            <Select
                                                options={clientOptions}
                                                value={clientOptions.find(opt => String(opt.value) === String(paymentClientId)) || null}
                                                onChange={handlePaymentClientSelect}
                                                placeholder="Search client name..."
                                                isSearchable isClearable {...portal}
                                            />
                                        </div>

                                        <div className="p-6 flex-1 overflow-y-auto custom-table-scroll space-y-4">
                                            {!paymentClientId ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-80">
                                                    <div className="h-16 w-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm"><i className="fa-solid fa-file-invoice text-2xl"></i></div>
                                                    <p className="font-bold text-[14.5px]">Select a client to see unpaid invoices</p>
                                                </div>
                                            ) : clientInvoices.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 mb-4 border border-emerald-100 shadow-sm"><i className="fa-solid fa-check-double text-2xl"></i></div>
                                                    <p className="font-bold text-[18px] text-slate-800 mb-1">All Clear!</p>
                                                    <p className="text-[13.5px] font-medium text-slate-500">This client has no pending invoices.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-3">
                                                        <span className="text-[13.5px] font-bold text-slate-800"><i className="fa-solid fa-file-invoice-dollar mr-1.5 text-slate-400"></i> Pending Invoices</span>
                                                        <span className="text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-md shadow-sm">{clientInvoices.length} Found</span>
                                                    </div>
                                                    {clientInvoices.map(inv => {
                                                        const isSelected = !!selectedInvoices[inv.id];
                                                        const rowData = selectedInvoices[inv.id] || { pay_amount: '', discount: '' };

                                                        return (
                                                            <div key={inv.id} className={`p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-md relative' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'}`}>
                                                                <div className="flex items-start gap-4">
                                                                    <div className="pt-1.5">
                                                                        <input type="checkbox" checked={isSelected} onChange={(e) => handleInvoiceToggle(inv.id, e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div>
                                                                                <div className="font-bold text-slate-800 cursor-pointer text-[15px]" onClick={() => handleInvoiceToggle(inv.id, !isSelected)}>{inv.invoice_number}</div>
                                                                                <div className="text-[12.5px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">Total: <Taka className="text-[11px] text-slate-400" />{parseFloat(inv.grand_total).toLocaleString()}</div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Due</div>
                                                                                <div className="font-bold text-rose-600 text-[16px]"><Taka className="text-[13px] mr-0.5 opacity-80" />{parseFloat(inv.due_amount).toLocaleString()}</div>
                                                                            </div>
                                                                        </div>

                                                                        {isSelected && (
                                                                            <div className="mt-5 pt-4 border-t border-indigo-100 grid grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease-out]">
                                                                                {/* Discount Input */}
                                                                                <div>
                                                                                    <label className="block text-[11.5px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Discount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 font-bold">৳</span>
                                                                                        <input
                                                                                            type="number" step="0.01" min="0" max={inv.due_amount}
                                                                                            value={rowData.discount || ''}
                                                                                            onChange={(e) => handleInvoiceChange(inv.id, 'discount', e.target.value)}
                                                                                            className="w-full rounded-xl border border-amber-200 bg-white pl-8 pr-3 py-2.5 text-[14px] font-bold text-amber-800 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 shadow-sm transition-all placeholder:text-amber-300"
                                                                                            placeholder="0.00"
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                {/* Pay Amount Input */}
                                                                                <div>
                                                                                    <label className="block text-[11.5px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Pay Amount</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-bold">৳</span>
                                                                                        <input
                                                                                            type="number" step="0.01" min="0" max={inv.due_amount - (rowData.discount || 0)}
                                                                                            value={rowData.pay_amount || ''}
                                                                                            onChange={(e) => handleInvoiceChange(inv.id, 'pay_amount', e.target.value)}
                                                                                            className="w-full rounded-xl border border-indigo-200 bg-white pl-8 pr-3 py-2.5 text-[14px] font-bold text-indigo-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all placeholder:text-indigo-300"
                                                                                            placeholder="0.00"
                                                                                        />
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
                                            <div className={`p-5 rounded-2xl border-2 shadow-sm transition-colors duration-300 ${Math.abs(balanceDifference) < 0.01 && (totalAllocated > 0 || totalDiscount > 0) ? 'border-emerald-200 bg-emerald-50/50' : 'border-indigo-200 bg-indigo-50/30'}`}>
                                                <div className="space-y-2 mb-3 pb-3 border-b border-indigo-100">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[12px] font-bold text-slate-600">Selected Invoices Due</span>
                                                        <span className="text-[15px] font-bold text-slate-700 tabular-nums"><Taka className="text-[12px] text-slate-400" />{totalBillOriginalDue.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                    </div>
                                                    {totalDiscount > 0 && (
                                                        <div className="flex justify-between items-center text-amber-700 font-bold text-[12.5px]">
                                                            <span><i className="fa-solid fa-tag mr-1 text-amber-500"></i> Discount Given</span>
                                                            <span className="tabular-nums">- <Taka className="text-[11px]" />{totalDiscount.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pt-1 border-t border-indigo-100/60">
                                                        <span className="text-[13px] font-black text-indigo-900 uppercase tracking-wider">Net to Collect</span>
                                                        <span className="text-[19px] font-black text-indigo-600 tabular-nums"><Taka className="text-[14px] text-indigo-400" />{totalAllocated.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[12.5px] font-bold text-slate-700">Payment Sources Entered</span>
                                                    <span className="text-[18px] font-bold text-slate-900 tabular-nums"><Taka className="text-[14px] text-slate-400" />{totalSources.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                                </div>

                                                {/* SMART BUTTONS */}
                                                {totalAllocated > 0 && totalSources === 0 && (
                                                    <button type="button" onClick={autoFillReceivedFromInvoices} className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all w-full">
                                                        <i className="fa-solid fa-arrow-down mr-1"></i> Auto-Fill Received (৳{totalAllocated.toLocaleString()})
                                                    </button>
                                                )}

                                                {totalSources > 0 && Math.abs(balanceDifference) > 0.01 && (
                                                    <div className="flex flex-col gap-2">
                                                        <button type="button" onClick={autoAllocateFromTotal} className="flex items-center justify-center gap-2 bg-indigo-600 text-white text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all w-full animate-[pulse_2s_infinite]">
                                                            <i className="fa-solid fa-wand-magic-sparkles"></i> Auto-Allocate ৳{totalSources.toLocaleString()}
                                                        </button>
                                                        {totalAllocated > 0 && (
                                                            <button type="button" onClick={autoFillReceivedFromInvoices} className="text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 underline text-center">
                                                                Or set received amount to net ৳{totalAllocated.toLocaleString()}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {Math.abs(balanceDifference) < 0.01 && (totalAllocated > 0 || totalDiscount > 0) && (
                                                    <div className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 text-[13.5px] font-bold py-2.5 px-4 rounded-xl border border-emerald-200 shadow-sm w-full">
                                                        <i className="fa-solid fa-check-circle text-emerald-600 text-base"></i> Ready to Confirm!
                                                    </div>
                                                )}

                                                {totalSources === 0 && totalAllocated === 0 && totalDiscount === 0 && (
                                                    <div className="text-center text-[12px] font-medium text-slate-500 py-2 rounded-xl bg-white/60 border border-slate-100">
                                                        Select an invoice on the left to begin.
                                                    </div>
                                                )}
                                            </div>

                                            {serverErrors?.amount_mismatch && <div className="text-[13px] font-medium text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-rose-500"></i> {serverErrors.amount_mismatch}</div>}

                                            {/* Date & Note */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Date</label>
                                                    <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} required className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-[14px] font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer transition-all" />
                                                </div>
                                                <div>
                                                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                                                    <input type="text" placeholder="Ref/Chq info..." value={data.note} onChange={e => setData('note', e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-[14px] font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all" />
                                                </div>
                                            </div>

                                            <div className="h-px bg-slate-100"></div>

                                            {/* Advance Input */}
                                            {paymentClient && Number(paymentClient.advance_balance) > 0 && (
                                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                                                    <label className="flex items-center justify-between text-[12px] font-bold text-emerald-800 mb-2">
                                                        <span><i className="fa-solid fa-piggy-bank mr-1.5 text-emerald-500"></i> Use Client Advance</span>
                                                        <span className="bg-emerald-100 px-2.5 py-1 rounded-md text-[11px] border border-emerald-200">Avail: ৳{Number(paymentClient.advance_balance).toLocaleString()}</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                                                        <input type="number" step="0.01" min="0" max={paymentClient.advance_balance} value={data.advance_amount} onChange={e => setData('advance_amount', e.target.value)} className="w-full rounded-xl border border-emerald-200 bg-white pl-9 pr-4 py-2.5 text-[14.5px] font-bold text-emerald-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all placeholder:text-emerald-300" placeholder="0.00" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Accounts Input */}
                                            <div>
                                                <label className="block text-[12.5px] font-bold text-slate-800 mb-3"><i className="fa-solid fa-building-columns mr-1.5 text-indigo-500"></i> Received In Accounts</label>
                                                <div className="space-y-3 z-10">
                                                    {(data.account_payments || []).map((row, index) => (
                                                        <div key={index} className="flex gap-3">
                                                            <div className="w-[55%] z-20">
                                                                <Select
                                                                    options={accountOptions}
                                                                    value={accountOptions.find(opt => String(opt.value) === String(row.account_id)) || null}
                                                                    onChange={selected => updateAccountPayment(index, 'account_id', selected ? selected.value : '')}
                                                                    placeholder="Bank/Cash"
                                                                    isSearchable {...portal}
                                                                />
                                                            </div>
                                                            <div className="w-[35%] relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[14px]">৳</span>
                                                                <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={e => updateAccountPayment(index, 'amount', e.target.value)} className="w-full rounded-xl border border-slate-200 py-[9px] pl-7 pr-3 text-[14px] font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all bg-white" />
                                                            </div>
                                                            <button type="button" onClick={() => removeAccountPayment(index)} className="w-[10%] flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 transition-all shadow-sm active:scale-95"><i className="fa-solid fa-trash-can text-[13px]"></i></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={addAccountPayment} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[13.5px] font-bold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm bg-white active:scale-95"><i className="fa-solid fa-plus mr-1.5"></i> Add Another Account</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 sm:p-8 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-[14px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all active:scale-95">Cancel</button>
                                            <button type="submit" disabled={processing || (!totalAllocated && !totalDiscount) || Math.abs(balanceDifference) > 0.01} className="flex-[2] py-3 rounded-xl bg-indigo-600 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
                                                {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing</> : <><i className="fa-solid fa-check text-lg"></i> Confirm Payment</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full bg-slate-50/50">
                                    <div className="p-6 sm:p-10 flex-1 overflow-y-auto space-y-8">

                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                            <div>
                                                <span className="text-[11.5px] font-bold text-slate-400 uppercase tracking-widest">Editing Payment For</span>
                                                <div className="font-bold text-slate-800 mt-1 text-[16px]">{editingPayment?.invoice?.client?.name}</div>
                                            </div>
                                            <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-xl shadow-sm text-[14px]">INV {editingPayment?.invoice?.invoice_number}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="z-20">
                                                <label className="block text-[12px] font-bold text-slate-700 mb-2">Deposit Account <span className="text-red-500">*</span></label>
                                                <Select
                                                    options={accountOptions}
                                                    value={accountOptions.find(opt => String(opt.value) === String(data.account_id)) || null}
                                                    onChange={selected => setData("account_id", selected ? selected.value : '')}
                                                    placeholder="Select Bank/Cash"
                                                    {...portal}
                                                />
                                                {errors.account_id && <span className="mt-1.5 block text-[11px] font-medium text-red-500">{errors.account_id}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-slate-700 mb-2">Amount <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                                                    <input type="number" step="0.01" value={data.amount} onChange={(e) => setData("amount", e.target.value)} required className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 pl-9 pr-4 py-2.5 text-[15px] font-bold text-emerald-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all" />
                                                </div>
                                                {errors.amount && <span className="mt-1.5 block text-[11px] font-medium text-red-500">{errors.amount}</span>}
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-slate-700 mb-2">Payment Date <span className="text-red-500">*</span></label>
                                                <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-[14px] font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm cursor-pointer transition-all" />
                                            </div>
                                            <div>
                                                <label className="block text-[12px] font-bold text-slate-700 mb-2">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                                                <input type="text" placeholder="Ref/Chq info..." value={data.note} onChange={(e) => setData("note", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-[14px] font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all active:scale-95">Cancel</button>
                                        <button type="submit" disabled={processing} className="px-10 py-2.5 rounded-xl bg-indigo-600 text-[14px] font-bold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-70">{processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Saving...</> : <><i className="fa-solid fa-check text-lg"></i> Save Changes</>}</button>
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
