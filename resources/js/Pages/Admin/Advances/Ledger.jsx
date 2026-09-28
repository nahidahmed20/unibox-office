import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Ledger({ employee, advancesHistory, settlements, summary }) {
    const [activeTab, setActiveTab] = useState('taken'); // 'taken' | 'settled'

    // Helper function to render pagination links smoothly
    const renderPagination = (paginator) => {
        if (!paginator.links || paginator.links.length <= 3) return null;
        
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                <div className="text-[12.5px] font-semibold text-gray-500">
                    Showing <span className="font-bold text-gray-900">{paginator.from || 0}</span> to <span className="font-bold text-gray-900">{paginator.to || 0}</span> of <span className="font-bold text-gray-900">{paginator.total || 0}</span> records
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {paginator.links.map((link, index) => (
                        <Link 
                            key={index} 
                            href={link.url || "#"} 
                            preserveState={true} // 🟢 Prevents tab changing when paginating
                            preserveScroll={true} 
                            className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all
                                ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-transparent text-gray-400 pointer-events-none'}
                            `}
                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} 
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title={`${employee.name} - Advance Ledger`} />

            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 mt-6 px-4 sm:px-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-user-tie"></i> Employee Ledger
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{employee.name}</h1>
                        <p className="text-sm font-medium text-gray-500 mt-1">Detailed breakdown of advances taken and settled.</p>
                    </div>
                    <Link href={route('admin.advances.index')} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[13.5px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                        <i className="fa-solid fa-arrow-left"></i> Back to Advances
                    </Link>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-20 w-20 bg-indigo-50 rounded-full blur-xl -translate-y-5 translate-x-5"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Advance Given</p>
                        <h3 className="text-2xl font-black text-indigo-700 tabular-nums"><Taka />{summary.total_advance.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-20 w-20 bg-emerald-50 rounded-full blur-xl -translate-y-5 translate-x-5"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Settled / Cut</p>
                        <h3 className="text-2xl font-black text-emerald-600 tabular-nums"><Taka />{summary.total_settled.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-20 w-20 bg-blue-50 rounded-full blur-xl -translate-y-5 translate-x-5"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Refunded (Cash)</p>
                        <h3 className="text-2xl font-black text-blue-600 tabular-nums"><Taka />{summary.total_returned.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-rose-200 rounded-full blur-2xl -translate-y-5 translate-x-5 opacity-50"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1">Current Due Balance</p>
                        <h3 className="text-[26px] font-black text-rose-700 tabular-nums tracking-tight"><Taka className="text-[18px]"/>{summary.current_due.toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                {/* Tabs & Table Container */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50/50 px-2 pt-2">
                        <button onClick={() => setActiveTab('taken')} className={`px-6 py-3.5 text-[14px] font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'taken' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-hand-holding-dollar"></i> Advances Taken
                        </button>
                        <button onClick={() => setActiveTab('settled')} className={`px-6 py-3.5 text-[14px] font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'settled' ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-list-check"></i> Settlement History (Where it was used)
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                {activeTab === 'taken' ? (
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Purpose</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Settled</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Used For (Type)</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-1/3">Reference / Description</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Amount Deducted</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[13.5px]">
                                
                                {/* TAB 1: ADVANCES TAKEN */}
                                {activeTab === 'taken' && (
                                    advancesHistory.data.length > 0 ? advancesHistory.data.map((adv) => (
                                        <tr key={adv.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4"><span className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md text-[11.5px] font-bold text-gray-700 shadow-sm"><i className="fa-regular fa-calendar mr-1.5 text-indigo-400"></i>{adv.date}</span></td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{adv.purpose || 'Office Purpose'}</td>
                                            <td className="px-6 py-4 text-right font-black text-indigo-600 tabular-nums"><Taka/>{Number(adv.amount).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">{Number(adv.settled_amount) > 0 ? <><Taka/>{Number(adv.settled_amount).toLocaleString('en-IN')}</> : '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {adv.status === 'settled' ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Settled</span> : <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Unsettled</span>}
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className="text-center py-16 text-gray-400 font-medium">No advances taken yet.</td></tr>
                                )}

                                {/* TAB 2: SETTLEMENTS (WHERE IT WAS CUT) */}
                                {activeTab === 'settled' && (
                                    settlements.data.length > 0 ? settlements.data.map((set, idx) => (
                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4"><span className="text-gray-500 font-bold text-[12px]"><i className="fa-regular fa-calendar mr-1.5"></i>{set.date}</span></td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm
                                                    ${set.type.includes('Salary') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                                                `}>
                                                    {set.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-gray-900 mb-0.5">{set.reference}</div>
                                                <div className="text-[12px] font-medium text-gray-500 truncate max-w-sm">{set.description}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-rose-600 tabular-nums bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm">- <Taka/>{Number(set.amount).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="4" className="text-center py-16 text-gray-400 font-medium">No settlements recorded yet.</td></tr>
                                )}

                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Sections */}
                    {activeTab === 'taken' && renderPagination(advancesHistory)}
                    {activeTab === 'settled' && renderPagination(settlements)}

                </div>
            </div>
        </AdminLayout>
    );
}