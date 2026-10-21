import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function MasterSummary({ filters, accounts, clientDues, vendorDues, clientAdvances, vendorAdvances, staffAdvances, projectExpensesTotal, projectValueTotal, officeExpensesTotal, sampleExpensesTotal = 0, payrollTotal }) {
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');

    const applyFilter = (e) => {
        e.preventDefault();
        router.get(route('admin.reports.master'), { start_date: startDate, end_date: endDate }, { preserveState: true, replace: true });
    };

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('admin.reports.master'), {}, { preserveState: true, replace: true });
    };

    // Calculate Totals
    const totalAccountBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
    const totalClientDues = clientDues.reduce((sum, c) => sum + Number(c.due), 0);
    const totalVendorDues = vendorDues.reduce((sum, v) => sum + Number(v.due), 0);
    const totalClientAdvances = clientAdvances.reduce((sum, c) => sum + Number(c.balance), 0);
    const totalVendorAdvances = vendorAdvances.reduce((sum, v) => sum + Number(v.balance), 0);
    const totalStaffAdvances = staffAdvances.reduce((sum, s) => sum + Number(s.balance), 0);

    return (
        <AdminLayout>
            <Head title="Master Executive Summary" />

            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 mt-6 px-4 sm:px-6">
                {/* Header & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-chart-pie"></i> Master Summary
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">Overview of all balances, dues, advances and expenses.</p>
                    </div>

                    <form onSubmit={applyFilter} className="flex flex-wrap items-center gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm" />
                        </div>
                        <div className="self-end flex gap-2">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors">
                                Filter
                            </button>
                            {(startDate || endDate) && (
                                <button type="button" onClick={clearFilter} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors">
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* 1. Account Balances */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-black text-gray-800 text-[15px]"><i className="fa-solid fa-building-columns text-indigo-500 mr-2"></i>Bank & Cash Balances</h3>
                                <span className="font-black text-indigo-700 text-[18px]"><Taka />{totalAccountBalance.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-2">
                                <table className="w-full text-left text-sm">
                                    <tbody>
                                        {accounts.map(acc => (
                                            <tr key={acc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-semibold text-gray-700">{acc.name}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums"><Taka className="text-[12px] opacity-50"/>{Number(acc.current_balance).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 2. Client Receivables */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 bg-emerald-50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 text-[14px]"><i className="fa-solid fa-arrow-right-to-bracket text-emerald-500 mr-2"></i>Client Due (Receivable)</h3>
                                    <span className="font-black text-emerald-700 text-[16px]"><Taka />{totalClientDues.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2 max-h-[250px] overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <tbody>
                                            {clientDues.map(c => (
                                                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2.5 font-semibold text-gray-700 truncate max-w-[120px]">{c.name}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold text-gray-900 tabular-nums"><Taka className="text-[10px] opacity-50"/>{Number(c.due).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {clientDues.length === 0 && <tr><td colSpan="2" className="px-3 py-4 text-center text-gray-400 font-medium">No client dues</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. Vendor Payables */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 bg-rose-50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 text-[14px]"><i className="fa-solid fa-arrow-right-from-bracket text-rose-500 mr-2"></i>Vendor Due (Payable)</h3>
                                    <span className="font-black text-rose-700 text-[16px]"><Taka />{totalVendorDues.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2 max-h-[250px] overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <tbody>
                                            {vendorDues.map(v => (
                                                <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2.5 font-semibold text-gray-700 truncate max-w-[120px]">{v.name}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold text-gray-900 tabular-nums"><Taka className="text-[10px] opacity-50"/>{Number(v.due).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {vendorDues.length === 0 && <tr><td colSpan="2" className="px-3 py-4 text-center text-gray-400 font-medium">No vendor dues</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. Staff Advances */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden md:col-span-2">
                                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 text-[14px]"><i className="fa-solid fa-user-tie text-blue-500 mr-2"></i>Staff Advances Given</h3>
                                    <span className="font-black text-blue-700 text-[16px]"><Taka />{totalStaffAdvances.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2 max-h-[250px] overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <tbody>
                                            {staffAdvances.map((s, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2.5 font-semibold text-gray-700">{s.name}</td>
                                                    <td className="px-3 py-2.5 text-right font-bold text-gray-900 tabular-nums"><Taka className="text-[10px] opacity-50"/>{Number(s.balance).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {staffAdvances.length === 0 && <tr><td colSpan="2" className="px-3 py-4 text-center text-gray-400 font-medium">No staff advances</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 5. Client Advances */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 text-[13px]"><i className="fa-solid fa-hand-holding-dollar text-gray-500 mr-2"></i>Client Advances Recv.</h3>
                                    <span className="font-black text-gray-700 text-[15px]"><Taka />{totalClientAdvances.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2 max-h-[200px] overflow-y-auto">
                                    <table className="w-full text-left text-[13px]">
                                        <tbody>
                                            {clientAdvances.map((c, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-semibold text-gray-600 truncate max-w-[120px]">{c.name}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums"><Taka className="text-[10px] opacity-50"/>{Number(c.balance).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {clientAdvances.length === 0 && <tr><td colSpan="2" className="px-3 py-4 text-center text-gray-400 font-medium">None</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 6. Vendor Advances */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-black text-gray-800 text-[13px]"><i className="fa-solid fa-wallet text-gray-500 mr-2"></i>Vendor Advances Given</h3>
                                    <span className="font-black text-gray-700 text-[15px]"><Taka />{totalVendorAdvances.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-2 max-h-[200px] overflow-y-auto">
                                    <table className="w-full text-left text-[13px]">
                                        <tbody>
                                            {vendorAdvances.map((v, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-semibold text-gray-600 truncate max-w-[120px]">{v.name}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums"><Taka className="text-[10px] opacity-50"/>{Number(v.balance).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                            {vendorAdvances.length === 0 && <tr><td colSpan="2" className="px-3 py-4 text-center text-gray-400 font-medium">None</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (P&L Items) */}
                    <div className="flex flex-col gap-5">
                        <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-700 p-6 text-white sticky top-24">
                            <h3 className="text-[12px] font-extrabold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-700 pb-3">
                                <i className="fa-solid fa-calendar-days mr-2"></i>
                                {startDate || endDate ? `Period: ${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time Activity'}
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[13px] font-bold text-gray-400 mb-1">Project Value (Invoiced)</p>
                                    <div className="text-[24px] font-black text-emerald-400 tabular-nums"><Taka className="text-[16px]"/>{Number(projectValueTotal).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                    <p className="text-[13px] font-bold text-gray-400 mb-1">Project Expenses</p>
                                    <div className="text-[24px] font-black text-rose-400 tabular-nums"><Taka className="text-[16px]"/>{Number(projectExpensesTotal).toLocaleString('en-IN')}</div>
                                </div>

                                <div className="pt-4 border-t border-gray-800">
                                    <p className="text-[13px] font-bold text-gray-400 mb-1">Sample Expenses</p>
                                    <div className="text-[20px] font-black text-emerald-400 tabular-nums"><Taka className="text-[14px]"/>{Number(sampleExpensesTotal || 0).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                    <p className="text-[13px] font-bold text-gray-400 mb-1">Office Expenses</p>
                                    <div className="text-[20px] font-black text-amber-400 tabular-nums"><Taka className="text-[14px]"/>{Number(officeExpensesTotal).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                    <p className="text-[13px] font-bold text-gray-400 mb-1">Payroll (Salary)</p>
                                    <div className="text-[20px] font-black text-orange-400 tabular-nums"><Taka className="text-[14px]"/>{Number(payrollTotal).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}

