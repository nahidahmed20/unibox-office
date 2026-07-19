import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, Head, router, usePage } from "@inertiajs/react";
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
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, renderOption, error }) {
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
        <div ref={wrapperRef} style={{ position: "relative" }}>
            <div
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: "100%", padding: "8px 12px", border: `1px solid ${error ? "#fca5a5" : "#cbd5e1"}`,
                    borderRadius: "6px", background: "#fff", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center", fontSize: "0.875rem",
                    color: selected ? "#0f172a" : "#94a3b8",
                }}
            >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "8px", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}></i>
            </div>

            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff",
                    border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    zIndex: 60, maxHeight: "260px", display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                    <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ position: "relative" }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Type to search..."
                                style={{ width: "100%", padding: "6px 10px 6px 30px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", fontSize: "0.8rem", boxSizing: "border-box" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.75rem" }}></i>
                        </div>
                    </div>
                    <div style={{ overflowY: "auto" }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div
                                        key={getValue(opt)}
                                        onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }}
                                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "#fff"; }}
                                        style={{
                                            padding: "10px 12px", cursor: "pointer", fontSize: "0.85rem",
                                            background: isActive ? "#eff6ff" : "#fff",
                                            color: isActive ? "#2563eb" : "#334155",
                                            fontWeight: isActive ? "600" : "400",
                                            borderBottom: "1px solid #f8fafc",
                                        }}
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

export default function Index({ payments = {}, invoices = [], accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

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

    useEffect(() => {
        isFirstRender.current = false;
    }, []);

    useEffect(() => {
        if (isFirstRender.current) return;
        const delay = setTimeout(() => {
            router.get(
                route("invoice-payments.index"),
                { search: searchTerm, per_page: perPage, page: 1 },
                { preserveState: true, replace: true },
            );
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    const handlePerPageChange = (e) => {
        const rawValue = e.target.value;
        const value = rawValue === "all" ? "all" : Number(rawValue);
        setPerPage(value);
        router.get(
            route("invoice-payments.index"),
            { search: searchTerm, per_page: value, page: 1 },
            { preserveState: true, replace: true }
        );
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
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; }
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
                        .brand-logo { width: 150px; max-width: 150px;  height: auto; display: block; margin-right: 14px; }
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
                            <td><span class="label">Date:</span><span class="value">${payment.payment_date || ''}</span></td>
                        </tr></table>
                        <table class="field-table"><tr><td><span class="label">Received with thanks from:</span><span class="value">${client?.name || 'N/A'}</span></td></tr></table>
                        <table class="field-table"><tr><td><span class="label">Address:</span><span class="value">${client?.address || '-'}</span></td></tr></table>
                        <table class="field-table"><tr><td><span class="label">In Words:</span><span class="value">${numberToWords(payment.amount)}</span></td></tr></table>
                        <table class="field-table"><tr>
                            <td><span class="label">Against Invoice:</span><span class="value">${payment.invoice?.invoice_number || '-'}</span></td>
                            <td><span class="label">Deposited To:</span><span class="value">${payment.account?.name || '-'}</span></td>
                        </tr></table>
                        <table class="footer-table"><tr>
                            <td><div class="taka-box">Taka: ${Number(payment.amount).toLocaleString('en-IN')}</div></td>
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

    const openCreateModal = () => {
        clearErrors();

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

            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc" }}>
                <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <h1 className="page-title" style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Invoice Payments</h1>
                </div>

                <div className="card-container" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
                            <i className="fa-solid fa-money-bill-wave" style={{ color: "#3b82f6" }}></i> Payment History
                        </div>
                        {hasPermission('create_receive_payment') && (
                        <button onClick={openCreateModal} style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Receive Payment
                        </button>
                        )}
                    </div>

                    <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={handlePerPageChange} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                <option value={500}>500 Entries</option>
                                <option value={1000}>1000 Entries</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        <div className="export-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCopy} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-copy"></i> Copy</button>
                            <button onClick={handleExportCSV} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-excel text-green-600"></i> Excel</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-file-pdf text-red-600"></i> PDF</button>
                            <button onClick={handlePrint} type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "0.875rem", fontWeight: "500", color: "#475569", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}><i className="fas fa-print text-gray-600"></i> Print</button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <input
                                type="text" placeholder="Search by invoice #, client, account..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "240px", padding: "6px 12px", paddingLeft: "36px", fontSize: "0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            />
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                        </div>
                    </div>

                    <table id="printable-payment-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Date</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Invoice & Client</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Account</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem" }}>Amount</th>
                                <th style={{ padding: "14px 24px", fontWeight: "600", color: "#475569", textTransform: "uppercase", fontSize: "0.75rem", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: "#334155" }}>
                            {paymentList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No payments found.</td>
                                </tr>
                            ) : (
                                paymentList.map((payment, idx) => (
                                    <tr key={payment.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fdfdfd" }}>
                                        <td style={{ padding: "16px 24px", fontWeight: "500" }}>{payment.payment_date}</td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontWeight: "600", color: "#2563eb", marginBottom: "2px" }}>{payment.invoice?.invoice_number || "N/A"}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>{payment.invoice?.client?.name}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                                                {payment.account?.name || "N/A"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 24px", color: "#16a34a", fontWeight: "700", fontSize: "0.95rem" }}>TK. {parseFloat(payment.amount).toLocaleString('en-IN')}</td>
                                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                {hasPermission('view_receive_payment') && (
                                                <button onClick={() => openShowModal(payment)} style={{ border: "none", background: "#f0f5ff", color: "#2563eb", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-eye"></i></button>
                                                )}
                                                <button onClick={() => handlePrintReceipt(payment)} style={{ border: "none", background: "#f0fdf4", color: "#16a34a", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }} title="Print Receipt"><i className="fa-solid fa-print"></i></button>

                                                {hasPermission('edit_receive_payment') && (
                                                <button onClick={() => openEditModal(payment)} style={{ border: "none", background: "#fff7ed", color: "#ea580c", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-pen-to-square"></i></button>
                                                )}
                                                {hasPermission('delete_receive_payment') && (
                                                <button onClick={() => handleDelete(payment.id)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><i className="fa-regular fa-trash-can"></i></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {payments.links && payments.links.length > 3 && (
                        <div className="pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                                Showing <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.from || 0}</span> to <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.to || 0}</span> of <span style={{ color: '#0f172a', fontWeight: '600' }}>{payments.total || 0}</span> entries
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {payments.links.map((link, index) => (
                                    <button
                                        key={index} disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, { search: searchTerm, per_page: perPage }, { preserveState: true, replace: true })}
                                        style={{
                                            padding: '6px 12px', fontSize: '0.875rem', border: link.active ? '1px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px',
                                            background: link.active ? '#2563eb' : '#fff', color: link.active ? '#fff' : '#475569', cursor: link.url ? 'pointer' : 'not-allowed',
                                            opacity: link.url ? 1 : 0.6, fontWeight: link.active ? '600' : '500'
                                        }} dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "900px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>{editMode ? "✏️ Edit Payment Record" : "💰 Receive New Payment"}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Invoice *</label>
                                    <SearchableSelect
                                        options={invoices}
                                        value={data.invoice_id}
                                        onChange={handleInvoiceSelect}
                                        placeholder="-- Select Invoice --"
                                        error={errors.invoice_id}
                                        getValue={(inv) => inv.id}
                                        getLabel={(inv) => `${inv.invoice_number} (${inv.client?.name || "N/A"}) - Due: TK. ${parseFloat(inv.due_amount ?? inv.grand_total).toLocaleString('en-IN')}`}
                                    />
                                    {errors.invoice_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.invoice_id}</span>}
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Receive In (Account) *</label>
                                    <SearchableSelect
                                        options={accounts}
                                        value={data.account_id}
                                        onChange={(val) => setData("account_id", val)}
                                        placeholder="-- Select Account --"
                                        error={errors.account_id}
                                        getValue={(acc) => acc.id}
                                        getLabel={(acc) => `${acc.name} (Balance: TK. ${parseFloat(acc.current_balance).toLocaleString('en-IN')})`}
                                    />
                                    {errors.account_id && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.account_id}</span>}
                                </div>
                            </div>

                            {data.invoice_id && (() => {
                                const selectedInvoice = invoices.find((i) => String(i.id) === String(data.invoice_id));
                                if (!selectedInvoice) return null;
                                const due = parseFloat(selectedInvoice.due_amount ?? selectedInvoice.grand_total);
                                return (
                                    <div style={{ marginTop: "16px", padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#1e40af" }}>Client's Remaining Due for {selectedInvoice.invoice_number}</span>
                                        <span style={{ fontSize: "1rem", fontWeight: "800", color: "#1d4ed8" }}>TK. {due.toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })()}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
                                <div className="form-group">
    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
        Cash Received (TK.) *
    </label>
    <input 
        type="number" 
        step="0.01" 
        value={data.amount} 
        onChange={(e) => setData("amount", e.target.value)} 
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", background: "#f0fdf4", color: "#166534", fontWeight: "bold" }} 
        required 
    />
    {errors.amount && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.amount}</span>}
</div>

                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                        Discount / Waiver (TK.)
                                    </label>
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
                                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", background: editMode ? "#f1f5f9" : "#fff" }} 
                                        disabled={editMode} 
                                    />
                                    {errors.discount_amount && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.discount_amount}</span>}
                                </div>

                                <div className="form-group">
                                    <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Payment Date *</label>
                                    <input type="date" value={data.payment_date} onChange={(e) => setData("payment_date", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} required />
                                    {errors.payment_date && <span style={{ color: "#ef4444", fontSize: "0.75rem", display: "block" }}>{errors.payment_date}</span>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.815rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Note (Optional)</label>
                                <textarea value={data.note} onChange={(e) => setData("note", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} rows="2" />
                            </div>
                            <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", opacity: processing ? 0.7 : 1 }}>{processing ? "Saving..." : "Save Record"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {showDetailsModal && selectedPayment && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="modal-content" style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>📄 Payment Receipt</h3>
                            <button onClick={() => setShowDetailsModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Client Name:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.invoice?.client?.name}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Invoice Ref:</span><span style={{ color: "#2563eb", fontWeight: "700" }}>{selectedPayment.invoice?.invoice_number || "N/A"}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Account Credited:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.account?.name}</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "8px" }}><span style={{ color: "#64748b", fontWeight: "500" }}>Payment Date:</span><span style={{ color: "#0f172a", fontWeight: "600" }}>{selectedPayment.payment_date}</span></div>
                                <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "8px", border: "1px solid #bbf7d0", marginTop: "12px", textAlign: "center" }}>
                                    <p style={{ color: "#166534", fontWeight: "600", margin: "0 0 4px 0", fontSize: "0.815rem", textTransform: "uppercase" }}>Total Received Amount</p>
                                    <p style={{ fontSize: "1.75rem", fontWeight: "800", color: "#16a34a", margin: 0 }}>TK. {parseFloat(selectedPayment.amount).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                            <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => handlePrintReceipt(selectedPayment)} style={{ flex: 1, padding: "10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <i className="fa-solid fa-print"></i> Print Receipt
                                </button>
                                <button type="button" onClick={() => setShowDetailsModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}