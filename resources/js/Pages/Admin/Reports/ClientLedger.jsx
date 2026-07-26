import React, { useState, useEffect } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import Select from 'react-select';
import Swal from 'sweetalert2';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

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
                        
                        /* Header Section */
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 25px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        
                        /* Client Info & Summary */
                        .report-title { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1e293b; margin-bottom: 20px; }
                        .top-panel { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; line-height: 1.6; }
                        .client-info strong { color: #0f172a; }
                        
                        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; width: 320px; }
                        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                        .summary-row.total { border-top: 2px dashed #cbd5e1; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 15px; color: #dc2626; }
                        
                        /* Table */
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; }
                        
                        /* Utility Classes */
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .text-rose { color: #dc2626; font-weight: bold; }
                        .text-emerald { color: #16a34a; font-weight: bold; }
                        .bg-highlight { background-color: #f8fafc; font-weight: bold; }
                        .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #e2e8f0; }
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
                            <div class="summary-row">
                                <span>Total Billed (Dr):</span> 
                                <span>TK. ${Number(summary.total_billed).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="summary-row">
                                <span>Total Received (Cr):</span> 
                                <span>TK. ${Number(summary.total_paid + summary.total_advance).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="summary-row total">
                                <span>Net Due Balance:</span> 
                                <span>TK. ${Number(summary.net_due).toLocaleString('en-IN')}</span>
                            </div>
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

    // React-Select Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "44px", 
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #cbd5e1",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" }, 
            fontSize: "14px", 
            background: "#fff",
        }),
        option: (provided, state) => ({
            ...provided, 
            fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", 
            cursor: "pointer",
        }),
    };

    return (
        <AdminLayout>
            <Head title="Client Ledger Statement" />

            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Client Ledger Statement</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Detailed financial history, bills, payments, and running balance.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Toolbar / Filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="w-full md:w-[400px]">
                            <Select
                                options={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''} - ${c.phone || ''}` }))}
                                value={clientId ? { value: clientId, label: clients.find(c => c.id == clientId)?.name } : null}
                                onChange={(selected) => fetchLedger(selected ? selected.value : "")}
                                placeholder="-- Search & Select Client --"
                                isSearchable
                                isClearable
                                styles={selectStyles}
                            />
                        </div>
                        
                        {ledger.length > 0 && (
                            <button onClick={handlePrint} className="flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-5 py-2.5 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 shadow-sm">
                                <i className="fa-solid fa-print text-gray-500"></i> Print Ledger
                            </button>
                        )}
                    </div>

                    {/* Summary Cards */}
                    {clientInfo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6 bg-slate-50/50 border-b border-gray-100">
                            {/* Card 1: Total Billed */}
                            <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                        <i className="fa-solid fa-file-invoice-dollar text-[16px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Billed (Dr)</span>
                                </div>
                                <div className="text-[22px] font-extrabold text-gray-900">
                                    TK. {Number(summary.total_billed).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 2: Total Received */}
                            <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                        <i className="fa-solid fa-hand-holding-dollar text-[16px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Paid (Cr)</span>
                                </div>
                                <div className="text-[22px] font-extrabold text-gray-900">
                                    TK. {Number(summary.total_paid).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 3: Net Due */}
                            <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                        <i className="fa-solid fa-triangle-exclamation text-[16px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Net Due Balance</span>
                                </div>
                                <div className="text-[22px] font-extrabold text-rose-700">
                                    TK. {Number(summary.net_due).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Card 4: Advance Balance */}
                            <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                                        <i className="fa-solid fa-wallet text-[16px]"></i>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Advance Balance</span>
                                </div>
                                <div className="text-[22px] font-extrabold text-gray-900">
                                    TK. {Number(summary.total_advance).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ledger Table */}
                    <div className="overflow-x-auto brass-scroll">
                        <table id="printable-ledger" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-32">Date</th>
                                    <th className="px-6 py-4">Transaction Type</th>
                                    <th className="px-6 py-4">Particulars / Description</th>
                                    <th className="px-6 py-4 text-right bg-rose-50/30">Debit (Bill)</th>
                                    <th className="px-6 py-4 text-right bg-emerald-50/30">Credit (Paid)</th>
                                    <th className="px-6 py-4 text-right bg-slate-50">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {!clientInfo ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-book-open-reader text-5xl mb-4 text-gray-200"></i>
                                                <p className="text-[15px] text-gray-500 font-medium">Please select a client from the dropdown to generate ledger.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : ledger.length > 0 ? (
                                    ledger.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-gray-600">
                                                {item.date}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                                    ${item.type === 'Invoice' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                                                    ${item.type === 'Payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                                    ${item.type === 'Advance' ? 'bg-purple-50 text-purple-600 border-purple-200' : ''}
                                                    ${item.type === 'Project' ? 'bg-gray-100 text-gray-600 border-gray-300' : ''}
                                                `}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-800 whitespace-normal min-w-[250px] leading-relaxed">
                                                    {item.description}
                                                </div>
                                                {item.ref !== '-' && (
                                                    <div className="text-[11.5px] text-gray-500 mt-1 font-medium">
                                                        Ref: <span className="text-blue-600">{item.ref}</span>
                                                    </div>
                                                )}
                                            </td>
                                            
                                            {/* Debit (Bill) */}
                                            <td className="px-6 py-4 text-right bg-rose-50/10">
                                                <span className="font-bold text-rose-600">
                                                    {item.debit > 0 ? `TK. ${Number(item.debit).toLocaleString('en-IN')}` : '-'}
                                                </span>
                                            </td>
                                            
                                            {/* Credit (Payment) */}
                                            <td className="px-6 py-4 text-right bg-emerald-50/10">
                                                <span className="font-bold text-emerald-600">
                                                    {item.credit > 0 ? `TK. ${Number(item.credit).toLocaleString('en-IN')}` : '-'}
                                                </span>
                                            </td>
                                            
                                            {/* Running Balance */}
                                            <td className="px-6 py-4 text-right bg-slate-50/80">
                                                <div className={`font-extrabold text-[14.5px] ${item.balance > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                                                    TK. {Number(item.balance).toLocaleString('en-IN')}
                                                    <span className={`text-[11px] ml-1.5 font-bold ${item.balance > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                                        {item.balance > 0 ? '(Dr)' : '(Cr)'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-folder-open text-4xl mb-3 text-gray-200"></i>
                                                <p>No financial records found for this client.</p>
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