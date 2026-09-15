import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Daybook({ selectedDate, formattedDate, summary, accountSummary, details, marketSnapshot }) {
    const [date, setDate] = useState(selectedDate);
    // 🟢 Default tab is now set to 'all' to show everything together
    const [activeTab, setActiveTab] = useState('all');

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setDate(newDate);
        router.get(route('admin.reports.daybook'), { date: newDate }, { preserveState: true, preserveScroll: true });
    };

    const handlePrint = () => {
        window.print();
    };

    // 🟢 Dynamic CSV / Excel Export Logic
    const handleExportCSV = () => {
        let headers = [];
        let rows = [];

        if (activeTab === 'all') {
            return Swal.fire("Notice", "Please select a specific tab (like 'Account Balances' or 'Complete Daybook') from the buttons above to export its data to Excel.", "info");
        }

        if (activeTab === 'accounts') {
            headers = ["Account Name,Opening Balance,Inflow (+),Outflow (-),Closing (On Date),Live Balance (Today)"];
            rows = accountSummary.map(acc => `"${acc.name}","${acc.opening}","${acc.inflow}","${acc.outflow}","${acc.closing}","${acc.current_balance}"`);
        }
        else if (activeTab === 'combined') {
            headers = ["Account,Context / Party,Description,Money In (+),Money Out (-)"];
            rows = details.transactions.map(trx => `"${trx.account?.name || 'Unknown'}","${trx.party_name || 'System'} - ${trx.context_label}","${trx.description}","${trx.type === 'credit' ? trx.amount : '0'}","${trx.type === 'debit' ? trx.amount : '0'}"`);
        }
        else if (activeTab === 'inflow') {
            headers = ["Received In (Account),Context / Category,Description,Amount Received"];
            rows = details.inflows.map(trx => `"${trx.account?.name || 'Unknown'}","${trx.party_name || 'System'} - ${trx.context_label}","${trx.description}","${trx.amount}"`);
        }
        else if (activeTab === 'outflow') {
            headers = ["Paid From (Account),Context / Payee,Description,Amount Paid"];
            rows = details.outflows.map(trx => `"${trx.account?.name || 'Unknown'}","${trx.party_name || 'System'} - ${trx.context_label}","${trx.description}","${trx.amount}"`);
        }
        else if (activeTab === 'transactions') {
            headers = ["Trx ID,Account,Description,Type,Amount"];
            rows = details.transactions.map(trx => `"#${trx.id}","${trx.account?.name}","${trx.description}","${trx.type === 'credit' ? 'In (+)' : 'Out (-)'}","${trx.amount}"`);
        }

        if (rows.length === 0) {
            return Swal.fire("Empty!", "No data available to export.", "warning");
        }

        const csvContent = headers.join("\n") + "\n" + rows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Daybook_${activeTab}_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout>
            <Head title="Daily Daybook & Cashflow" />

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .print-bg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header & Date Picker */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Daily Cashflow
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Daybook & Ledger</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Monitor today's complete financial movement. Where money came from and where it went.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm no-print">
                        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                            <i className="fa-regular fa-calendar text-indigo-600"></i>
                            <input
                                type="date"
                                value={date}
                                onChange={handleDateChange}
                                className="bg-transparent border-none outline-none text-[14px] font-bold text-gray-700 cursor-pointer p-0"
                            />
                        </div>

                        <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

                        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm font-bold text-[13.5px]">
                            <i className="fa-solid fa-file-excel"></i> <span className="hidden sm:inline">Excel / CSV</span>
                        </button>

                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white border border-gray-900 hover:bg-gray-800 transition-colors shadow-sm font-bold text-[13.5px]">
                            <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">Print Document</span>
                        </button>
                    </div>
                </div>

                <div id="print-area">
                    {/* Print Only Header */}
                    <div className="hidden print:block mb-8 text-center border-b-2 border-gray-800 pb-4">
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Daily Daybook</h1>
                        <h3 className="text-lg font-bold text-gray-600 mt-2">{formattedDate}</h3>
                    </div>

                    {/* 🟢 TOP 4 CASHFLOW CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 print-bg">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Opening Balance</span>
                            <div className="text-[24px] font-black text-gray-900 tabular-nums">৳ {Number(summary.opening).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 print-bg">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 block">Total Inflow (+)</span>
                            <div className="text-[24px] font-black text-emerald-700 tabular-nums">৳ {Number(summary.inflow).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200 print-bg">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 block">Total Outflow (-)</span>
                            <div className="text-[24px] font-black text-rose-700 tabular-nums">৳ {Number(summary.outflow).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-lg print-bg relative overflow-hidden text-white">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
                            <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-100 mb-1.5 block relative z-10">Closing Balance</span>
                            <div className="text-[24px] font-black text-white tabular-nums relative z-10">৳ {Number(summary.closing).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    {/* 🟢 TABS (Added "View All" as default) */}
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-2 mb-6 no-print">
                        <button onClick={() => setActiveTab('all')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'all' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}><i className="fa-solid fa-layer-group mr-1.5"></i> View All (Print Ready)</button>
                        <button onClick={() => setActiveTab('accounts')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'accounts' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Account Balances</button>
                        <button onClick={() => setActiveTab('combined')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'combined' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Complete Daybook</button>
                        <button onClick={() => setActiveTab('inflow')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'inflow' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Money Received (In)</button>
                        <button onClick={() => setActiveTab('outflow')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'outflow' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Money Paid Out (Out)</button>
                        <button onClick={() => setActiveTab('transactions')} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'transactions' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Raw Data</button>
                    </div>

                    <div className="grid grid-cols-1 gap-10 print:grid-cols-1 print:gap-10">

                        {/* TAB 1: ACCOUNTS SUMMARY */}
                        <div className={`${activeTab === 'accounts' || activeTab === 'all' ? 'block' : 'hidden'} print:block`}>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-building-columns text-indigo-500"></i> Today's Account Balances</h3>
                            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 print-bg">
                                        <tr>
                                            <th className="px-6 py-4">Account Name</th>
                                            <th className="px-6 py-4 text-right">Opening Balance</th>
                                            <th className="px-6 py-4 text-right text-emerald-600">Inflow (+)</th>
                                            <th className="px-6 py-4 text-right text-rose-600">Outflow (-)</th>
                                            <th className="px-6 py-4 text-right text-indigo-600" title="Balance at the end of selected date">Closing (On Date)</th>
                                            <th className="px-6 py-4 text-right text-purple-700 bg-purple-50/50" title="Real-time current balance">Live Balance (Today)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[14px] text-gray-800 divide-y divide-gray-100">
                                        {accountSummary.map(acc => (
                                            <tr key={acc.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold flex items-center gap-2">
                                                    <i className={`fa-solid ${acc.type === 'cash' ? 'fa-money-bill-wave text-emerald-500' : 'fa-building-columns text-blue-500'} text-[12px]`}></i> {acc.name}
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-gray-600">৳ {Number(acc.opening).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-600">{acc.inflow > 0 ? `৳ ${Number(acc.inflow).toLocaleString('en-IN')}` : '-'}</td>
                                                <td className="px-6 py-4 text-right font-bold text-rose-600">{acc.outflow > 0 ? `৳ ${Number(acc.outflow).toLocaleString('en-IN')}` : '-'}</td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-900 bg-indigo-50/30">৳ {Number(acc.closing).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-black text-purple-700 bg-purple-50/50">৳ {Number(acc.current_balance).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* TAB 2: COMPLETE DAYBOOK (ALL IN ONE) */}
                        <div className={`${activeTab === 'combined' || activeTab === 'all' ? 'block' : 'hidden'} print:block`}>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-book-open text-indigo-500"></i> Complete Daybook (Inflow & Outflow)</h3>
                            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 print-bg">
                                        <tr>
                                            <th className="px-6 py-4">Account</th>
                                            <th className="px-6 py-4">Context / Party</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right text-emerald-600 bg-emerald-50/50">Money In (+)</th>
                                            <th className="px-6 py-4 text-right text-rose-600 bg-rose-50/50">Money Out (-)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[14px] text-gray-800 divide-y divide-gray-100">
                                        {details.transactions.length > 0 ? details.transactions.map(trx => (
                                            <tr key={`comb-${trx.id}`} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-700">
                                                    <i className="fa-solid fa-building-columns text-gray-400 mr-2"></i>{trx.account?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[13.5px] font-bold text-gray-900 truncate max-w-[200px]">{trx.party_name || 'System / Direct'}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm w-fit ${trx.type === 'credit' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
                                                            {trx.context_label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-[13px] whitespace-normal max-w-sm leading-relaxed">{trx.description}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600 text-[15.5px] bg-emerald-50/30">
                                                    {trx.type === 'credit' ? `৳ ${Number(trx.amount).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600 text-[15.5px] bg-rose-50/30">
                                                    {trx.type === 'debit' ? `৳ ${Number(trx.amount).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400 font-medium">No transactions today.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* TAB 3: INFLOW */}
                        <div className={`${activeTab === 'inflow' || activeTab === 'all' ? 'block' : 'hidden'} print:block`}>
                            <h3 className="text-[16px] font-bold text-emerald-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-arrow-down-to-bracket"></i> Detailed Money Received Today</h3>
                            <div className="bg-white rounded-3xl border border-emerald-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-emerald-50 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border-b border-emerald-100 print-bg">
                                        <tr>
                                            <th className="px-6 py-4">Received In (Account)</th>
                                            <th className="px-6 py-4">Context / Category</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount Received</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[14px] text-gray-800 divide-y divide-gray-100">
                                        {details.inflows.length > 0 ? details.inflows.map(trx => (
                                            <tr key={`in-${trx.id}`} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-700">
                                                    <i className="fa-solid fa-building-columns text-gray-400 mr-2"></i>{trx.account?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[13.5px] font-bold text-gray-900 truncate max-w-[200px]">{trx.party_name || 'System / Direct'}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shadow-sm w-fit">{trx.context_label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-[13px] whitespace-normal max-w-md">{trx.description}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600 text-[16px]">৳ {Number(trx.amount).toLocaleString('en-IN')}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400 font-medium">No collections today.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* TAB 4: OUTFLOW */}
                        <div className={`${activeTab === 'outflow' || activeTab === 'all' ? 'block' : 'hidden'} print:block`}>
                            <h3 className="text-[16px] font-bold text-rose-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-arrow-right-from-bracket"></i> Detailed Money Paid Out Today</h3>
                            <div className="bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-rose-50 text-[11px] font-bold uppercase tracking-wider text-rose-700 border-b border-rose-100 print-bg">
                                        <tr>
                                            <th className="px-6 py-4">Paid From (Account)</th>
                                            <th className="px-6 py-4">Context / Payee</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[14px] text-gray-800 divide-y divide-gray-100">
                                        {details.outflows.length > 0 ? details.outflows.map(trx => (
                                            <tr key={`out-${trx.id}`} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-700">
                                                    <i className="fa-solid fa-building-columns text-gray-400 mr-2"></i>{trx.account?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[13.5px] font-bold text-gray-900 truncate max-w-[200px]">{trx.party_name || 'System / Direct'}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded shadow-sm w-fit">{trx.context_label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-[13px] whitespace-normal max-w-md">{trx.description}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600 text-[16px]">৳ {Number(trx.amount).toLocaleString('en-IN')}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400 font-medium">No payments made today.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* TAB 5: RAW TRANSACTIONS */}
                        <div className={`${activeTab === 'transactions' || activeTab === 'all' ? 'block' : 'hidden'} print:block`}>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-list text-purple-500"></i> All Raw Transactions</h3>
                            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 print-bg">
                                        <tr>
                                            <th className="px-6 py-4">Trx ID</th>
                                            <th className="px-6 py-4">Account</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-center">Type</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px] text-gray-700 divide-y divide-gray-100">
                                        {details.transactions.length > 0 ? details.transactions.map(trx => (
                                            <tr key={trx.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-mono text-gray-400">#{trx.id}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{trx.account?.name}</td>
                                                <td className="px-6 py-4 text-gray-600 whitespace-normal max-w-xs leading-relaxed">{trx.description}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${trx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {trx.type === 'credit' ? 'In (+)' : 'Out (-)'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-black tabular-nums ${trx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    ৳ {Number(trx.amount).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400 font-medium">No transactions logged today.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* 🟢 MARKET SNAPSHOT (Footer Area) */}
                    <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-[16px] font-bold text-gray-800 mb-1">Market Snapshot</h3>
                            <p className="text-[13px] text-gray-500">Live summary of what you owe and what is owed to you as of right now.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-right print-bg min-w-[200px]">
                                <span className="block text-[11px] font-bold uppercase text-indigo-500 mb-1">Total Receivables (To Get)</span>
                                <span className="text-[22px] font-black text-indigo-700 tabular-nums">৳ {Number(marketSnapshot.receivable).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-right print-bg min-w-[200px]">
                                <span className="block text-[11px] font-bold uppercase text-orange-500 mb-1">Total Payables (To Give)</span>
                                <span className="text-[22px] font-black text-orange-700 tabular-nums">৳ {Number(marketSnapshot.payable).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
