import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Select from '@/Components/PortalSelect';
import Swal from 'sweetalert2';
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

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function VendorLedger({ vendors = [], ledger = [], dateWisePayments = [], summary = {}, vendorInfo = null, filters = {} }) {
    const [vendorId, setVendorId] = useState(filters.vendor_id || "");
    const [activeTab, setActiveTab] = useState("full_ledger");

    const fetchLedger = (selectedVendorId) => {
        setVendorId(selectedVendorId);
        router.get(
            route('admin.reports.vendor-ledger'),
            { vendor_id: selectedVendorId },
            { preserveState: true, replace: true }
        );
    };

    const clearVendor = () => {
        setVendorId("");
        router.get(route('admin.reports.vendor-ledger'), {}, { preserveState: true, replace: true });
    };

    const exportHeaders = useMemo(() => {
        if (activeTab === 'date_wise_payments') {
            return ['Date', 'Payment Mode', 'Entries', 'Bills Breakdown', 'Total Paid (৳)', 'Discount (৳)'];
        }
        return ['Date', 'Transaction Type', 'Reference', 'Method', 'Description', 'Bill Amount (৳)', 'Paid Amount (৳)', 'Discount (৳)', 'Running Balance (৳)'];
    }, [activeTab]);

    const exportRows = useMemo(() => {
        if (activeTab === 'date_wise_payments') {
            return dateWisePayments.map(g => {
                const breakdown = g.items.map(i => `${i.ref}: ${i.amount}`).join(" | ");
                return [
                    g.date,
                    g.methods.join(', '),
                    g.items.length,
                    breakdown,
                    parseFloat(g.total_amount || 0).toFixed(2),
                    parseFloat(g.total_discount || 0).toFixed(2)
                ];
            });
        }
        return ledger.map(item => [
            item.date,
            item.type,
            item.ref,
            item.method || '',
            item.description || '',
            parseFloat(item.debit || 0).toFixed(2),
            parseFloat(item.credit || 0).toFixed(2),
            parseFloat(item.discount || 0).toFixed(2),
            parseFloat(item.balance || 0).toFixed(2)
        ]);
    }, [activeTab, dateWisePayments, ledger]);

    const handlePrint = () => {
        if (!vendorInfo || ledger.length === 0) {
            return Swal.fire("Empty!", "No ledger data to print.", "warning");
        }

        const tableContent = document.getElementById("printable-vendor-ledger");
        const printWindow = window.open('', '_blank');
        const reportTitle = activeTab === 'date_wise_payments'
            ? 'Vendor Date-wise Payment Summary'
            : 'Vendor Statement of Account';

        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportTitle} - ${vendorInfo.name}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px 40px; color: #1e293b; background: #fff; margin: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 25px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        .report-title { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; margin-bottom: 20px; }
                        .top-panel { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; line-height: 1.6; }
                        .vendor-info strong { color: #0f172a; }
                        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; width: 320px; }
                        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                        .summary-row.total { border-top: 2px dashed #cbd5e1; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 15px; color: #dc2626; }
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; font-size: 11px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <div class="report-title">${reportTitle}</div>
                    <div class="top-panel">
                        <div class="vendor-info">
                            <strong>Vendor Profile:</strong><br/>
                            Name: ${vendorInfo.name} ${vendorInfo.company_name ? `(${vendorInfo.company_name})` : ''}<br/>
                            Phone: ${vendorInfo.phone || 'N/A'}<br/>
                            Email: ${vendorInfo.email || 'N/A'}<br/>
                            Address: ${vendorInfo.address || 'N/A'}
                        </div>
                        <div class="summary-box">
                            <div class="summary-row"><span>Total Billed (+ Opening):</span> <span>TK. ${Number(summary.total_billed).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Total Paid:</span> <span>TK. ${Number(summary.total_paid).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Total Discount:</span> <span>TK. ${Number(summary.total_discount || 0).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row total"><span>Net Payable Due:</span> <span>TK. ${Number(summary.net_due).toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                    ${tableContent.outerHTML}
                    <div style="margin-top: 40px; font-size: 11px; color: #64748b; text-align: center;">
                        This is a computer-generated vendor ledger report. Generated on: ${new Date().toLocaleString()}
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "44px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(200, 155, 60, 0.15)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "#9ca3af" },
            fontSize: "14px",
            background: "#fff",
            cursor: "pointer"
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
            cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    const grandTotalDateWise = dateWisePayments.reduce((sum, g) => sum + Number(g.total_amount || 0), 0);
    const grandTotalDiscountDateWise = dateWisePayments.reduce((sum, g) => sum + Number(g.total_discount || 0), 0);

    return (
        <AdminLayout>
            <Head title="Vendor Ledger Statement" />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Payable Audit Trail
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Vendor Ledger Statement</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-xl leading-relaxed">
                            Vendor opening dues, project expense bills, voucher payments, date-wise settlement summary, and running balance.
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden mb-10 flex flex-col">

                    {/* Toolbar / Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/40 no-print">
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="w-full sm:w-[360px]">
                                <Select
                                    options={vendors.map((v) => ({
                                        value: v.id,
                                        label: `${v.name} ${v.company_name ? `(${v.company_name})` : ''} ${v.phone ? `- ${v.phone}` : ''}`
                                    }))}
                                    value={vendorId ? { value: vendorId, label: vendors.find(v => v.id == vendorId)?.name } : null}
                                    onChange={(selected) => fetchLedger(selected ? selected.value : "")}
                                    placeholder="Search and select vendor..."
                                    isSearchable
                                    styles={selectStyles}
                                    menuPosition="fixed"
                                />
                            </div>
                            {vendorId && (
                                <button onClick={clearVendor} className="shrink-0 flex items-center justify-center h-[44px] w-[44px] rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Clear Selection">
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            )}

                            {vendorInfo && (
                                <div className="inline-flex items-center rounded-xl bg-slate-200/70 p-1 border border-slate-300 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('full_ledger')}
                                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                            activeTab === 'full_ledger'
                                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="fa-solid fa-book-open text-[11px]"></i>
                                        <span>Full Statement</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('date_wise_payments')}
                                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-black transition-all ${
                                            activeTab === 'date_wise_payments'
                                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="fa-solid fa-calendar-check text-[11px]"></i>
                                        <span>Date-wise Payments ({dateWisePayments.length} {dateWisePayments.length === 1 ? 'Day' : 'Days'})</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {ledger.length > 0 && (
                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename={activeTab === 'date_wise_payments' ? `Vendor_DateWise_Payments_${vendorInfo?.name || 'Vendor'}` : `Vendor_Ledger_${vendorInfo?.name || 'Vendor'}`}
                                title={activeTab === 'date_wise_payments' ? `Vendor Date-wise Payments - ${vendorInfo?.name || 'Vendor'}` : `Vendor Statement - ${vendorInfo?.name || 'Vendor'}`}
                            />
                        )}
                    </div>

                    {/* Summary Cards */}
                    {vendorInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6 bg-white border-b border-gray-100 no-print">
                            {/* Card 1: Total Billed */}
                            <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                                        <i className="fa-solid fa-file-invoice text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600/90">Total Billed (+ Opening)</span>
                                </div>
                                <div className="text-[22px] font-black text-indigo-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.total_billed).toLocaleString('en-IN')}
                                </div>
                                {Number(summary.opening_balance) > 0 && (
                                    <div className="text-[11px] font-bold text-indigo-600/80 mt-1">
                                        Opening Due: ৳{Number(summary.opening_balance).toLocaleString('en-IN')}
                                    </div>
                                )}
                            </div>

                            {/* Card 2: Total Paid & Discount */}
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                                        <i className="fa-solid fa-money-bill-transfer text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/90">Total Paid to Vendor</span>
                                </div>
                                <div className="text-[22px] font-black text-emerald-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.total_paid).toLocaleString('en-IN')}
                                </div>
                                {Number(summary.total_discount) > 0 && (
                                    <div className="text-[11px] font-bold text-amber-600 mt-1">
                                        Discount: ৳{Number(summary.total_discount).toLocaleString('en-IN')}
                                    </div>
                                )}
                            </div>

                            {/* Card 3: Wallet Balance */}
                            <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-sm">
                                        <i className="fa-solid fa-wallet text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600/90">Available Advance Wallet</span>
                                </div>
                                <div className="text-[22px] font-black text-purple-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.wallet_balance).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 4: Net Payable Due */}
                            <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${summary.net_due > 0 ? 'border-rose-200 bg-gradient-to-br from-white to-rose-50/80' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${summary.net_due > 0 ? 'bg-rose-500 text-white' : 'bg-gray-400 text-white'}`}>
                                        <i className={`fa-solid text-[15px] ${summary.net_due > 0 ? 'fa-triangle-exclamation' : 'fa-check-double'}`}></i>
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${summary.net_due > 0 ? 'text-rose-700/90' : 'text-gray-500'}`}>
                                        {summary.net_due > 0 ? 'Net Payable Due' : 'All Bills Settled'}
                                    </span>
                                </div>
                                <div className={`text-[22px] font-black tabular-nums tracking-tight ${summary.net_due > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
                                    <Taka className="text-[18px]" />{Number(summary.net_due).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table Section */}
                    <div className="overflow-x-auto pb-2">
                        {activeTab === 'date_wise_payments' && vendorInfo ? (
                            <table id="printable-vendor-ledger" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                                <thead className="bg-emerald-50/70 border-b border-emerald-200">
                                    <tr>
                                        <th className="px-6 py-4 text-center text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em] w-16">SL</th>
                                        <th className="px-6 py-4 text-left text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em] w-44">Payment Date</th>
                                        <th className="px-6 py-4 text-left text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em] w-56">Payment Source</th>
                                        <th className="px-6 py-4 text-left text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em]">Bills & Vouchers Breakdown</th>
                                        <th className="px-6 py-4 text-right text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em] w-44">Discount</th>
                                        <th className="px-6 py-4 text-right text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-[0.06em] w-56">Date Total Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                    {dateWisePayments.length > 0 ? (
                                        <>
                                            {dateWisePayments.map((group, idx) => (
                                                <tr key={group.date} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400 tabular-nums">{idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-2 font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                            <i className="fa-regular fa-calendar-check text-emerald-600"></i>
                                                            <span>{group.date}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {group.methods.map((m, i) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-2xs">
                                                                    <i className="fa-solid fa-building-columns text-slate-400 text-[10px]"></i>
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-normal min-w-[320px]">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {group.items.map((item, i) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-2xs">
                                                                    <span className="text-indigo-600 font-black">{item.ref}</span>
                                                                    <span className="text-slate-500 text-[11px]">({item.title})</span>
                                                                    <span className="text-slate-300">:</span>
                                                                    <span className="text-emerald-700 font-black tabular-nums">৳{Number(item.amount).toLocaleString('en-IN')}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-amber-600 tabular-nums">
                                                        {group.total_discount > 0 ? <><Taka />{Number(group.total_discount).toLocaleString('en-IN')}</> : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right bg-emerald-50/20">
                                                        <div className="font-black text-emerald-700 text-[16.5px] tabular-nums">
                                                            <Taka />{Number(group.total_amount).toLocaleString('en-IN')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-900 text-white font-black">
                                                <td colSpan="4" className="px-6 py-4 text-right text-[14px] uppercase tracking-wider">
                                                    Grand Total across {dateWisePayments.length} Dates:
                                                </td>
                                                <td className="px-6 py-4 text-right text-[15px] text-amber-300 tabular-nums">
                                                    <Taka />{Number(grandTotalDiscountDateWise).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-right text-[18px] text-emerald-400 tabular-nums">
                                                    <Taka className="text-[16px]" />{Number(grandTotalDateWise).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-24 text-center text-gray-400">
                                                <p className="text-[14.5px] text-gray-600 font-bold">No payment records found for this vendor.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table id="printable-vendor-ledger" className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
                                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                    <tr>
                                        <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-32">Date</th>
                                        <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Type</th>
                                        <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Particulars / Description</th>
                                        <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Bill Amount</th>
                                        <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Paid Amount</th>
                                        <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Discount</th>
                                        <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Running Due</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                    {!vendorInfo ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-24 text-center text-gray-400 no-print">
                                                <div className="flex flex-col items-center justify-center">
                                                    <i className="fa-solid fa-truck-field text-5xl mb-4 text-gray-200"></i>
                                                    <p className="text-[15px] text-gray-500 font-semibold">Select a vendor from the dropdown above to view their full ledger statement.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : ledger.length > 0 ? (
                                        ledger.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 font-semibold text-gray-600">
                                                    <div className="flex items-center gap-1.5"><i className="fa-regular fa-calendar-days text-[11px] text-gray-400"></i> {item.date}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider border shadow-sm
                                                        ${item.type === 'Opening Balance' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                        ${item.type === 'Bill' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
                                                        ${item.type === 'Direct Pay' ? 'bg-teal-50 text-teal-700 border-teal-200' : ''}
                                                        ${item.type === 'Voucher Pay' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                                    `}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 whitespace-normal min-w-[280px] leading-relaxed">
                                                        {item.description}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        {item.ref && (
                                                            <span className="text-[11px] font-bold text-gray-500 inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                                <i className="fa-solid fa-hashtag text-[9px]"></i> {item.ref}
                                                            </span>
                                                        )}
                                                        {item.method && (
                                                            <span className="text-[11px] font-bold text-slate-600 inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                {item.method}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right bg-rose-50/10">
                                                    <span className="font-black text-rose-600 tabular-nums text-[14.5px]">
                                                        {item.debit > 0 ? <><Taka />{Number(item.debit).toLocaleString('en-IN')}</> : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right bg-emerald-50/10">
                                                    <span className="font-black text-emerald-600 tabular-nums text-[14.5px] block">
                                                        {item.credit > 0 ? <><Taka />{Number(item.credit).toLocaleString('en-IN')}</> : '-'}
                                                    </span>
                                                    {item.credit > 0 && item.date_group && item.date_group.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTab('date_wise_payments')}
                                                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-black text-indigo-700 transition-colors no-print"
                                                        >
                                                            <i className="fa-solid fa-layer-group text-[9px]"></i>
                                                            Total on date: ৳{Number(item.date_group.total_amount).toLocaleString('en-IN')} ({item.date_group.items.length} {item.date_group.items.length === 1 ? 'bill' : 'bills'})
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-amber-600 tabular-nums text-[13.5px]">
                                                        {item.discount > 0 ? <><Taka />{Number(item.discount).toLocaleString('en-IN')}</> : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right bg-slate-50/50">
                                                    <div className={`font-extrabold text-[15px] tabular-nums ${item.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                        <Taka />{Number(Math.abs(item.balance)).toLocaleString('en-IN')}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-24 text-center text-gray-400 no-print">
                                                <p className="text-[14.5px] text-gray-600 font-bold">No transactions found for this vendor.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
