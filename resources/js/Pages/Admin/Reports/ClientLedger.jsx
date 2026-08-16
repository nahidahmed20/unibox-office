import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import Select from 'react-select';
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

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function ClientLedger({ clients = [], ledger = [], summary = {}, clientInfo = null, filters = {} }) {
    const { auth } = usePage().props;
    const [clientId, setClientId] = useState(filters.client_id || "");

    const fetchLedger = (selectedClientId) => {
        setClientId(selectedClientId);
        router.get(
            route('admin.reports.client-ledger'),
            { client_id: selectedClientId },
            { preserveState: true, replace: true }
        );
    };

    const clearClient = () => {
        setClientId("");
        router.get(route('admin.reports.client-ledger'), {}, { preserveState: true, replace: true });
    };

    const handleCopy = () => {
        if (!clientInfo || ledger.length === 0) return Swal.fire("Empty!", "No ledger data to copy.", "warning");
        const text = ledger.map(item => `${item.date}\t${item.type}\t${item.description}\t${item.debit}\t${item.credit}\t${item.balance}`).join("\n");
        navigator.clipboard.writeText("Date\tType\tDescription\tDebit\tCredit\tBalance\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!clientInfo || ledger.length === 0) return Swal.fire("Empty!", "No ledger data to export.", "warning");

        let csvContent = "Date,Transaction Type,Reference,Description,Debit (Bill),Credit (Paid),Running Balance\n";
        ledger.forEach(item => {
            csvContent += `"${item.date}","${item.type}","${item.ref}","${item.description}","${item.debit}","${item.credit}","${item.balance}"\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Ledger_${clientInfo.name}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        if (!clientInfo || ledger.length === 0) {
            return Swal.fire("Empty!", "No ledger data to print.", "warning");
        }

        const tableContent = document.getElementById("printable-ledger");
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Client Ledger - ${clientInfo.name}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px 40px; color: #1e293b; background: #fff; margin: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 25px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        .report-title { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1e293b; margin-bottom: 20px; }
                        .top-panel { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; line-height: 1.6; }
                        .client-info strong { color: #0f172a; }
                        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; width: 320px; }
                        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                        .summary-row.total { border-top: 2px dashed #cbd5e1; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 15px; color: #dc2626; }
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; font-size: 11px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
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
                    <div class="report-title">Statement of Account (Ledger)</div>
                    <div class="top-panel">
                        <div class="client-info">
                            <strong>Client Profile:</strong><br/>
                            Name: ${clientInfo.name} ${clientInfo.company_name ? `(${clientInfo.company_name})` : ''}<br/>
                            Phone: ${clientInfo.phone || 'N/A'}<br/>
                            Email: ${clientInfo.email || 'N/A'}<br/>
                            Address: ${clientInfo.address || 'N/A'}
                        </div>
                        <div class="summary-box">
                            <div class="summary-row"><span>Total Billed (Dr):</span> <span>TK. ${Number(summary.total_billed).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Total Received (Cr):</span> <span>TK. ${Number(summary.total_paid + summary.total_advance).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row total"><span>Net Due Balance:</span> <span>TK. ${Number(summary.net_due).toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                    ${tableContent.outerHTML}
                    <div style="margin-top: 40px; font-size: 11px; color: #64748b; text-align: center;">
                        This is a computer-generated ledger report. Generated on: ${new Date().toLocaleString()}
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

    return (
        <AdminLayout>
            <Head title="Client Ledger Statement" />

            {/* Custom Table Scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-ledger, #printable-ledger * { visibility: visible; }
                    #printable-ledger { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Audit Trail
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Client Ledger Statement</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Detailed financial history, bills, payments, and running balance for specific clients.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden mb-10 flex flex-col">

                    {/* Toolbar / Filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/40 no-print">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-full md:w-[350px]">
                                <Select
                                    options={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''} - ${c.phone || ''}` }))}
                                    value={clientId ? { value: clientId, label: clients.find(c => c.id == clientId)?.name } : null}
                                    onChange={(selected) => fetchLedger(selected ? selected.value : "")}
                                    placeholder="Search & Select Client..."
                                    isSearchable
                                    styles={selectStyles}
                                    menuPosition="fixed"
                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                />
                            </div>
                            {clientId && (
                                <button onClick={clearClient} className="shrink-0 flex items-center justify-center h-[44px] w-[44px] rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Clear Selection">
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            )}
                        </div>

                        {ledger.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={handleCopy} className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm">
                                    <i className="fa-solid fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm">
                                    <i className="fa-solid fa-file-csv"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 border border-gray-800 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-gray-900 shadow-sm">
                                    <i className="fa-solid fa-print"></i> Print
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Summary Cards */}
                    {clientInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6 bg-white border-b border-gray-100 no-print">
                            {/* Card 1: Total Billed */}
                            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                                        <i className="fa-solid fa-file-invoice-dollar text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600/90">Total Billed (Dr)</span>
                                </div>
                                <div className="text-[22px] font-black text-blue-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.total_billed).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 2: Total Received */}
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                                        <i className="fa-solid fa-hand-holding-dollar text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/90">Total Paid (Cr)</span>
                                </div>
                                <div className="text-[22px] font-black text-emerald-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.total_paid).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 3: Total Advance */}
                            <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white shadow-sm">
                                        <i className="fa-solid fa-wallet text-[15px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600/90">Total Advance</span>
                                </div>
                                <div className="text-[22px] font-black text-purple-800 tabular-nums tracking-tight">
                                    <Taka className="text-[18px]" />{Number(summary.total_advance).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 4: DYNAMIC NET DUE CARD */}
                            <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${summary.net_due > 0 ? 'border-rose-200 bg-gradient-to-br from-white to-rose-50/80' : summary.net_due < 0 ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${summary.net_due > 0 ? 'bg-rose-500 text-white' : summary.net_due < 0 ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                                        <i className={`fa-solid text-[15px] ${summary.net_due > 0 ? 'fa-triangle-exclamation' : summary.net_due < 0 ? 'fa-sack-dollar' : 'fa-check-double'}`}></i>
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${summary.net_due > 0 ? 'text-rose-700/90' : summary.net_due < 0 ? 'text-emerald-700/90' : 'text-gray-500'}`}>
                                        {summary.net_due > 0 ? 'Client Owes Us (Due)' : summary.net_due < 0 ? 'We Owe Client (Advance)' : 'Settled / No Due'}
                                    </span>
                                </div>
                                <div className={`text-[22px] font-black tabular-nums tracking-tight ${summary.net_due > 0 ? 'text-rose-700' : summary.net_due < 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
                                    <Taka className="text-[18px]" />{Number(Math.abs(summary.net_due)).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ledger Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-ledger" className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-32">Date</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Transaction Type</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Particulars / Description</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Debit (Bill)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Credit (Paid)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {!clientInfo ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center text-gray-400 no-print">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-book-open-reader text-5xl mb-4 text-gray-200"></i>
                                                <p className="text-[15px] text-gray-500 font-semibold">Please search and select a client from the dropdown above to generate their ledger.</p>
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
                                                    ${item.type === 'Invoice' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
                                                    ${item.type === 'Payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                                    ${item.type === 'Advance' ? 'bg-purple-50 text-purple-600 border-purple-200' : ''}
                                                    ${item.type === 'Project' ? 'bg-gray-100 text-gray-600 border-gray-300' : ''}
                                                `}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 whitespace-normal min-w-[280px] leading-relaxed">
                                                    {item.description}
                                                </div>
                                                {item.ref !== '-' && item.ref && (
                                                    <div className="text-[11.5px] font-bold text-gray-500 mt-1.5 inline-flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                                                        <i className="fa-solid fa-hashtag text-[9px]"></i> Ref: {item.ref}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Debit (Bill) */}
                                            <td className="px-6 py-4 text-right bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors">
                                                <span className="font-black text-rose-600 tabular-nums text-[14.5px]">
                                                    {item.debit > 0 ? <><Taka />{Number(item.debit).toLocaleString('en-IN')}</> : '-'}
                                                </span>
                                            </td>

                                            {/* Credit (Payment) */}
                                            <td className="px-6 py-4 text-right bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                                <span className="font-black text-emerald-600 tabular-nums text-[14.5px]">
                                                    {item.credit > 0 ? <><Taka />{Number(item.credit).toLocaleString('en-IN')}</> : '-'}
                                                </span>
                                            </td>

                                            {/* Running Balance */}
                                            <td className="px-6 py-4 text-right bg-slate-50/50">
                                                <div className={`font-extrabold text-[15px] tabular-nums ${item.balance > 0 ? 'text-rose-700' : item.balance < 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                    <Taka />{Number(Math.abs(item.balance)).toLocaleString('en-IN')}
                                                    <span className={`text-[10px] ml-1.5 font-black uppercase ${item.balance > 0 ? 'text-rose-500' : item.balance < 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                        {item.balance > 0 ? '(Dr)' : item.balance < 0 ? '(Cr)' : ''}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center text-gray-400 no-print">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-folder-open text-4xl mb-3 text-gray-200"></i>
                                                <p className="text-[14.5px] text-gray-600 font-bold">No financial records found for this client.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}