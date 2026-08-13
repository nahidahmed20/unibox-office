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

/* =========================================
   REUSABLE SEARCHABLE SELECT COMPONENT
========================================= */
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, renderOption, error, disabled }) {
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
    const filtered = options.filter((opt) =>
        getLabel(opt).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'hover:bg-gray-50 focus:ring-1'} 
                    ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-gray-300 focus:border-[var(--accent)] focus:ring-[var(--accent)]/50'} 
                    ${selected ? 'text-gray-900 bg-white' : 'text-gray-500 bg-white'}
                `}
            >
                <span className="truncate flex-1">
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}></i>
            </div>

            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 flex max-h-[260px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-[13px] text-gray-400">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
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

export default function Index({ payments = {}, invoices = [], accounts = [], clients = [], years = [], totalAmount = 0, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null); // 👈 NEW: holds the full payment (with invoice) being edited

    const [clientId, setClientId] = useState(filters.client_id || "");
    const [accountFilter, setAccountFilter] = useState(filters.account_id || "");
    const [year, setYear] = useState(filters.year || "");
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");

    const [searchTerm, setSearchTerm] = useState(
        () => new URLSearchParams(window.location.search).get("search") || "",
    );
    const [perPage, setPerPage] = useState(
        () => Number(new URLSearchParams(window.location.search).get("per_page")) || 10,
    );

    const isFirstRender = useRef(true);
    const paymentList = payments.data || [];

    const {
        data,
        setData,
        post,
        delete: destroy,
        reset,
        processing,
        errors,
        clearErrors,
    } = useForm({
        id: "",
        invoice_id: "",
        account_id: "",
        amount: "",
        discount_amount: "", 
        payment_date: "",
        note: "",
        _method: "post",
    });

    // 👇 NEW: makes sure the invoice tied to the payment being edited is always
    // present in the dropdown options, even if it's already "paid" and therefore
    // excluded from the `invoices` prop sent by the backend.
    const invoiceOptions = useMemo(() => {
        if (
            editMode &&
            editingPayment?.invoice &&
            !invoices.some((inv) => String(inv.id) === String(editingPayment.invoice_id))
        ) {
            return [
                {
                    id: editingPayment.invoice_id,
                    invoice_number: editingPayment.invoice.invoice_number,
                    client: editingPayment.invoice.client,
                    grand_total: editingPayment.invoice.grand_total,
                    due_amount: editingPayment.invoice.grand_total,
                },
                ...invoices,
            ];
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
                page: 1, 
            },
            { preserveState: true, replace: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false; 
            return;
        }
        const delay = setTimeout(() => applyFilters({ search: searchTerm }), 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => {
        const rawValue = e.target.value;
        const value = rawValue === "all" ? "all" : Number(rawValue);
        setPerPage(value);
        applyFilters({ per_page: value });
    };

    const handleClientFilter = (val) => { setClientId(val); applyFilters({ client_id: val }); };
    const handleYearFilter = (e) => { setYear(e.target.value); applyFilters({ year: e.target.value }); };
    const handleDateFromChange = (e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); };
    const handleDateToChange = (e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); };

    const goToPage = (url) => {
        if (!url) return;
        router.get(url, {}, { 
            preserveState: true, 
            preserveScroll: true 
        });
    };

    const handleCopy = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        
        const header = "SL\tDate\tInvoice\tClient\tAccount\tAmount\n";
        const text = paymentList
            .map((payment, idx) => `${idx + 1}\t${payment.payment_date}\t${payment.invoice?.invoice_number || "N/A"}\t${payment.invoice?.client?.name || "N/A"}\t${payment.account?.name || "N/A"}\tTK. ${parseFloat(payment.amount).toLocaleString('en-IN')}`)
            .join("\n");
            
        navigator.clipboard.writeText(header + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!paymentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        
        const headers = ["SL,Date,Invoice,Client,Account,Amount\n"];
        const rows = paymentList.map((payment, idx) => `"${idx + 1}","${payment.payment_date}","${payment.invoice?.invoice_number || "N/A"}","${payment.invoice?.client?.name || "N/A"}","${payment.account?.name || "N/A"}","TK. ${parseFloat(payment.amount).toLocaleString('en-IN')}"`);
        
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Payment_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-payment-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice Payments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                        table { counter-reset: rowNumber; }
                        tbody tr { counter-increment: rowNumber; }
                        tbody tr td:first-child::before { content: counter(rowNumber) ". "; font-weight: bold; margin-right: 5px; }
                    </style>
                </head>
                <body>
                    <h2>Invoice Payments Directory</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
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
                            <td style="width: 50%; text-align: right;"><strong>Date:</strong> ${payment.payment_date || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Received with thanks from:</strong> ${client?.name || 'N/A'} ${client?.company_name ? `(${client.company_name})` : ''}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Against Invoice Ref:</strong> ${payment.invoice?.invoice_number || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Payment Mode:</strong> ${payment.account?.name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>Amount in Words:</strong> <span class="words">${numberToWords(payment.amount)}</span></td>
                        </tr>
                        ${payment.note ? `<tr><td colspan="2"><strong>Notes:</strong> ${payment.note}</td></tr>` : ''}
                    </table>
                </div>

                <div class="footer-section">
                    <div class="amount-box">TK. ${Number(payment.amount).toLocaleString('en-IN')}</div>
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
                        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; }
                        
                        @page { size: A4 portrait; margin: 10mm; }
                        
                        .page-container {
                            width: 190mm;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .receipt {
                            border: 2px solid #147a5b;
                            border-radius: 10px;
                            padding: 16px 24px;
                            position: relative;
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                        }

                        .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 50px; font-weight: 900; color: rgba(20, 122, 91, 0.04); z-index: 0; pointer-events: none; text-transform: uppercase; white-space: nowrap; letter-spacing: 8px; }
                        
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; position: relative; z-index: 1; }
                        .logo { height: 36px; width: auto; }
                        .company-details { text-align: right; font-size: 10px; line-height: 1.4; color: #475569; }
                        .company-details h2 { margin: 0 0 2px 0; font-size: 15px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        
                        .title-container { text-align: center; margin-bottom: 10px; position: relative; z-index: 1; }
                        .title { display: inline-block; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #147a5b; background: #f0fdf4; padding: 4px 16px; border: 1px solid #147a5b; border-radius: 4px; }
                        .copy-badge { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 9px; font-weight: bold; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; background: #f8fafc; }

                        .content { position: relative; z-index: 1; }
                        .details-table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.5; color: #1e293b; }
                        .details-table td { padding: 4px 0; border-bottom: 1px dotted #cbd5e1; }
                        .details-table strong { color: #475569; font-weight: 600; margin-right: 6px; }
                        .words { font-weight: 700; font-style: italic; color: #0f172a; text-transform: capitalize; }
                        
                        .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding-top: 10px; position: relative; z-index: 1; }
                        .amount-box { border: 2px solid #147a5b; border-radius: 6px; padding: 7px 18px; font-weight: 800; font-size: 15px; color: #147a5b; background: #f0fdf4; box-shadow: 2px 2px 0px rgba(20, 122, 91, 0.2); }
                        .signature { text-align: center; font-size: 11px; color: #475569; width: 160px; }
                        .sign-line { border-top: 1px solid #0f172a; padding-top: 5px; font-weight: 600; }
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

    const openCreateModal = () => {
        clearErrors();
        setEditingPayment(null); // 👈 NEW: clear any previously-edited payment reference

        setData({
            id: '',
            invoice_id: '',
            account_id: '',
            method: '',
            amount: 0,
            payment_date: new Date().toISOString().slice(0, 10),
            note: ''
        });

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
            return {
                ...prevData,
                invoice_id: val,
                amount: newAmount,
            };
        });
    };

    const openEditModal = (payment) => {
        clearErrors();
        setEditingPayment(payment); // 👈 NEW: remember the full payment (with its invoice) being edited
        setData({
            id: payment.id, 
            invoice_id: payment.invoice_id, 
            account_id: payment.account_id || "",
            amount: payment.amount, 
            discount_amount: "", 
            payment_date: payment.payment_date, 
            note: payment.note || "", 
            _method: "put",
        });
        setEditMode(true); setShowModal(true);
    };

    const openShowModal = (payment) => {
        setSelectedPayment(payment); setShowDetailsModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(editMode ? route("invoice-payments.update", data.id) : route("invoice-payments.store"), {
            onSuccess: () => {
                reset(); setShowModal(false);
                Swal.fire({ title: editMode ? "Updated!" : "Received!", text: editMode ? "Payment updated." : "Payment logged successfully.", icon: "success", confirmButtonColor: "#3b82f6" });
            },
            forceFormData: true,
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?", text: "This will reverse the amount from your account balance.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#64748b", confirmButtonText: "Yes, delete it!"
        }).then((res) => {
            if (res.isConfirmed) {
                destroy(route("invoice-payments.destroy", id), { onSuccess: () => { Swal.fire("Deleted!", "Payment record removed.", "success"); } });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Receive Payments" />

            <div className="flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Invoice Payments</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage and record payments received from clients.</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-emerald-700">
                        <i className="fa-solid fa-sack-dollar text-emerald-600"></i>
                        <span className="text-[14px] font-bold uppercase tracking-wider text-emerald-800">Total Received:</span>
                        <span className="text-[18px] font-bold">TK. {Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-money-bill-wave text-[var(--accent)]"></i> Payment History
                        </div>
                        {hasPermission('create_receive_payment') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Receive Payment
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
                                    onChange={handlePerPageChange} 
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
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
                                    <i className="fas fa-file-excel text-emerald-500"></i> Excel
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search invoice, client, account..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50/30">
                        {/* Client Filter */}
                        <div className="w-[220px]">
                            <SearchableSelect
                                options={[{ id: "", name: "All Clients" }, ...clients]}
                                value={clientId}
                                onChange={handleClientFilter}
                                placeholder="Filter by Client"
                                getValue={(c) => c.id}
                                getLabel={(c) => c.name}
                            />
                        </div>

                        {/* Year Filter */}
                        <div className="flex items-center gap-2 ">
                            <i className="fa-solid fa-calendar text-[var(--accent)]"></i>
                            <select 
                                value={year} 
                                onChange={handleYearFilter} 
                                className="w-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            >
                                <option value="">All Years</option>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-2">
                            <i className="fa-regular fa-calendar-days text-[var(--accent)]"></i>
                            <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={handleDateFromChange} 
                                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                            <span className="text-gray-400">–</span>
                            <input 
                                type="date" 
                                value={dateTo} 
                                onChange={handleDateToChange} 
                                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                            />
                        </div>

                        {/* Reset Filters */}
                        {(clientId || year || dateFrom || dateTo || searchTerm) && (
                            <button
                                onClick={() => {
                                    setSearchTerm(""); setClientId(""); setYear(""); setDateFrom(""); setDateTo("");
                                    router.get(route("invoice-payments.index"), { per_page: perPage }, { preserveState: true, replace: true });
                                }}
                                className="ml-auto flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100"
                            >
                                <i className="fa-solid fa-xmark"></i> Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-payment-table" className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Invoice & Client</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {paymentList.length > 0 ? paymentList.map((payment, idx) => (
                                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-500">
                                            {payments.from ? payments.from + idx : idx + 1}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-600">{payment.payment_date}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-blue-600">{payment.invoice?.invoice_number || "N/A"}</div>
                                            <div className="text-[12px] text-gray-500 mt-0.5"><i className="fa-regular fa-user mr-1"></i>{payment.invoice?.client?.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-semibold text-gray-600">
                                                <i className="fa-solid fa-building-columns text-gray-400"></i> {payment.account?.name || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 text-[14.5px]">
                                            TK. {parseFloat(payment.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {hasPermission('view_receive_payment') && (
                                                    <button onClick={() => openShowModal(payment)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                        <i className="fa-regular fa-eye text-[12px]"></i>
                                                    </button>
                                                )}
                                                <button onClick={() => handlePrintReceipt(payment)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Print Receipt">
                                                    <i className="fa-solid fa-print text-[12px]"></i>
                                                </button>
                                                {hasPermission('edit_receive_payment') && (
                                                    <button onClick={() => openEditModal(payment)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit">
                                                        <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                    </button>
                                                )}
                                                {hasPermission('delete_receive_payment') && (
                                                    <button onClick={() => handleDelete(payment.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                        <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-money-bill-transfer text-4xl text-gray-300 mb-3"></i>
                                                <p>No payments found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.links && payments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {payments.from || 0} to {payments.to || 0} of {payments.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {payments.links.map((link, index) => (
                                    <button 
                                        key={index} 
                                        onClick={() => goToPage(link.url)}
                                        disabled={!link.url}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}
                                        `}
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-sack-dollar'} text-[var(--accent)]`}></i>
                                {editMode ? "Edit Payment Record" : "Receive New Payment"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <form onSubmit={handleSubmit} className="overflow-y-auto brass-scroll p-6 flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Invoice *</label>
                                    <SearchableSelect
                                        options={invoiceOptions}
                                        value={data.invoice_id}
                                        onChange={handleInvoiceSelect}
                                        placeholder="-- Search & Select Invoice --"
                                        error={errors.invoice_id}
                                        getValue={(inv) => inv.id}
                                        getLabel={(inv) => `${inv.invoice_number} (${inv.client?.name || "N/A"}) - Due: TK. ${parseFloat(inv.due_amount ?? inv.grand_total).toLocaleString('en-IN')}`}
                                    />
                                    {errors.invoice_id && <span className="mt-1 block text-[12px] text-red-500">{errors.invoice_id}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Receive In (Account) *</label>
                                    <SearchableSelect
                                        options={accounts}
                                        value={data.account_id}
                                        onChange={(val) => setData("account_id", val)}
                                        placeholder="-- Select Bank/Cash Account --"
                                        error={errors.account_id}
                                        getValue={(acc) => acc.id}
                                        getLabel={(acc) => `${acc.name} (Balance: TK. ${parseFloat(acc.current_balance).toLocaleString('en-IN')})`}
                                    />
                                    {errors.account_id && <span className="mt-1 block text-[12px] text-red-500">{errors.account_id}</span>}
                                </div>
                            </div>

                            {data.invoice_id && (() => {
                                const selectedInvoice = invoiceOptions.find((i) => String(i.id) === String(data.invoice_id));
                                if (!selectedInvoice) return null;
                                const due = parseFloat(selectedInvoice.due_amount ?? selectedInvoice.grand_total);
                                return (
                                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                                        <span className="text-[13px] font-semibold text-blue-800">
                                            <i className="fa-solid fa-circle-info mr-2"></i>
                                            Client's Remaining Due for {selectedInvoice.invoice_number}
                                        </span>
                                        <span className="text-[16px] font-extrabold text-blue-700">TK. {due.toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5">
                                <div>
                                    <label className="block text-[13px] font-semibold text-emerald-700 mb-1.5">Cash Received (TK.) *</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        max={
                                            data.invoice_id 
                                            ? Math.max(0, (parseFloat(invoiceOptions.find(i => String(i.id) === String(data.invoice_id))?.due_amount) || 0) - (parseFloat(data.discount_amount) || 0)) 
                                            : ""
                                        }
                                        value={data.amount} 
                                        onChange={(e) => setData("amount", e.target.value)}
                                        className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[15px] font-bold text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" 
                                        required 
                                    />
                                    {errors.amount && <span className="mt-1 block text-[12px] text-red-500">{errors.amount}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Discount / Waiver (TK.)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={data.discount_amount} 
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
                                        placeholder="Leave empty if none" 
                                        className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow ${editMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50'}`} 
                                        disabled={editMode} 
                                    />
                                    {errors.discount_amount && <span className="mt-1 block text-[12px] text-red-500">{errors.discount_amount}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Payment Date *</label>
                                    <input 
                                        type="date" 
                                        value={data.payment_date} 
                                        onChange={(e) => setData("payment_date", e.target.value)} 
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        required 
                                    />
                                    {errors.payment_date && <span className="mt-1 block text-[12px] text-red-500">{errors.payment_date}</span>}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Note (Optional)</label>
                                <textarea 
                                    value={data.note} 
                                    onChange={(e) => setData("note", e.target.value)} 
                                    placeholder="Add any additional notes..."
                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 resize-y min-h-[80px]" 
                                />
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                Cancel
                            </button>
                            <button type="submit" onClick={handleSubmit} disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                {processing ? "Saving..." : "Save Record"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DETAILS MODAL --- */}
            {showDetailsModal && selectedPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> Payment Receipt
                            </h3>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6">
                            <div className="flex flex-col gap-4 text-[14px]">
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                    <span className="text-gray-500 font-medium">Client Name:</span>
                                    <span className="text-gray-900 font-semibold">{selectedPayment.invoice?.client?.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                    <span className="text-gray-500 font-medium">Invoice Ref:</span>
                                    <span className="text-blue-600 font-bold">{selectedPayment.invoice?.invoice_number || "N/A"}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                    <span className="text-gray-500 font-medium">Account Credited:</span>
                                    <span className="text-gray-900 font-semibold">{selectedPayment.account?.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                                    <span className="text-gray-500 font-medium">Payment Date:</span>
                                    <span className="text-gray-900 font-semibold">{selectedPayment.payment_date}</span>
                                </div>
                                
                                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                                    <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-emerald-700">Total Received Amount</p>
                                    <p className="text-[28px] font-extrabold text-emerald-600 m-0">TK. {parseFloat(selectedPayment.amount).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                            <button type="button" onClick={() => handlePrintReceipt(selectedPayment)} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
                                <i className="fa-solid fa-print"></i> Print Receipt
                            </button>
                            <button type="button" onClick={() => setShowDetailsModal(false)} className="flex-1 rounded-lg bg-gray-800 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}