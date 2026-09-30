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
                            preserveState={true} 
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
                
                {/* Header Profile Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-2xl font-black shadow-inner border border-indigo-200 uppercase">
                            {employee.name.charAt(0)}
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 mb-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                                <i className="fa-solid fa-book-open-reader"></i> Employee Ledger
                            </div>
                            <h1 className="text-2xl sm:text-[26px] font-extrabold text-gray-900 tracking-tight leading-none">{employee.name}</h1>
                            <p className="text-[13px] font-medium text-gray-500 mt-1.5">Detailed breakdown of all advances taken, settled, and refunded.</p>
                        </div>
                    </div>
                    <Link href={route('admin.advances.index')} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[13.5px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 shrink-0">
                        <i className="fa-solid fa-arrow-left"></i> Back to Advances
                    </Link>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-indigo-50 rounded-full blur-xl -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-hand-holding-dollar text-indigo-400"></i> Total Given</p>
                        <h3 className="text-[26px] font-black text-indigo-700 tabular-nums tracking-tight"><Taka className="text-[18px]" />{summary.total_advance.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-emerald-50 rounded-full blur-xl -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-file-invoice text-emerald-400"></i> Adjusted / Cut</p>
                        <h3 className="text-[26px] font-black text-emerald-600 tabular-nums tracking-tight"><Taka className="text-[18px]" />{summary.total_settled.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-blue-50 rounded-full blur-xl -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-money-bill-transfer text-blue-400"></i> Cash Refunded</p>
                        <h3 className="text-[26px] font-black text-blue-600 tabular-nums tracking-tight"><Taka className="text-[18px]" />{summary.total_returned.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-28 w-28 bg-rose-200 rounded-full blur-2xl -translate-y-6 translate-x-6 opacity-40 group-hover:scale-110 transition-transform"></div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1 flex items-center gap-1.5"><i className="fa-solid fa-triangle-exclamation text-rose-400"></i> Current Due Balance</p>
                        <h3 className="text-[28px] font-black text-rose-700 tabular-nums tracking-tight leading-none mt-1.5"><Taka className="text-[20px]" />{summary.current_due.toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                {/* Tabs & Table Container */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50/50 px-2 pt-2">
                        <button onClick={() => setActiveTab('taken')} className={`px-6 py-3.5 text-[14px] font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'taken' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.05)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-money-bill-trend-up"></i> Advances Taken & Status
                        </button>
                        <button onClick={() => setActiveTab('settled')} className={`px-6 py-3.5 text-[14px] font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'settled' ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.05)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-list-check"></i> Settlement History (Adjustments)
                        </button>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll">
                        <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                {activeTab === 'taken' ? (
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[28%]">Purpose & Notes</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50/30">Total Taken</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Adjusted/Used</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Refunded</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-rose-600 uppercase tracking-wider bg-rose-50/50">Unpaid Due</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[20%]">Adjustment Type</th>
                                        <th className="px-6 py-4 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[45%]">Reference & Description</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-extrabold text-rose-600 uppercase tracking-wider bg-rose-50/50">Amount Deducted</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[13.5px]">
                                
                                {/* TAB 1: ADVANCES TAKEN */}
                                {activeTab === 'taken' && (
                                    advancesHistory.data.length > 0 ? advancesHistory.data.map((adv) => {
                                        const amount = Number(adv.amount || 0);
                                        const settled = Number(adv.settled_amount || 0);
                                        const returned = Number(adv.returned_amount || 0);
                                        const due = amount - settled - returned;

                                        return (
                                            <tr key={adv.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold text-gray-700 shadow-sm flex items-center gap-1.5 w-max">
                                                        <i className="fa-regular fa-calendar text-indigo-400"></i>{adv.date}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-extrabold text-gray-800 text-[13.5px] truncate max-w-[250px]">{adv.purpose || 'Office Purpose'}</div>
                                                    {adv.notes && (
                                                        <div className="text-[11.5px] text-gray-500 mt-1 flex items-start gap-1.5 whitespace-normal max-w-[280px] leading-snug">
                                                            <i className="fa-solid fa-align-left mt-0.5 text-gray-400"></i> {adv.notes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-600 tabular-nums bg-indigo-50/10 border-l border-r border-indigo-50">
                                                    <Taka className="text-[12px] mr-0.5 text-indigo-400"/>{amount.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">
                                                    {settled > 0 ? <><Taka className="text-[11px] mr-0.5 text-emerald-400"/>{settled.toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-blue-600 tabular-nums">
                                                    {returned > 0 ? <><Taka className="text-[11px] mr-0.5 text-blue-400"/>{returned.toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600 tabular-nums bg-rose-50/30 border-l border-rose-100">
                                                    {due > 0 ? <><Taka className="text-[12px] mr-0.5 text-rose-400"/>{due.toLocaleString('en-IN')}</> : <span className="text-gray-300 font-medium">0.00</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {adv.status === 'settled' 
                                                        ? <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 w-max mx-auto"><i className="fa-solid fa-check-double text-[10px]"></i> Settled</span> 
                                                        : <span className="bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 w-max mx-auto"><i className="fa-solid fa-hourglass-half text-[10px]"></i> Unsettled</span>}
                                                </td>
                                            </tr>
                                        )
                                    }) : <tr><td colSpan="7" className="text-center py-20 text-gray-400 font-medium"><i className="fa-solid fa-folder-open text-3xl mb-3 text-gray-300 block"></i> No advances taken yet.</td></tr>
                                )}

                                {/* TAB 2: SETTLEMENTS (WHERE IT WAS CUT) */}
                                {activeTab === 'settled' && (
                                    settlements.data.length > 0 ? settlements.data.map((set, idx) => (
                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold text-gray-700 shadow-sm flex items-center gap-1.5 w-max">
                                                    <i className="fa-regular fa-calendar text-emerald-500"></i>{set.date}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm inline-flex items-center gap-1.5
                                                    ${set.type.includes('Salary') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                                                `}>
                                                    <i className={`fa-solid ${set.type.includes('Salary') ? 'fa-file-invoice-dollar' : 'fa-briefcase'}`}></i> {set.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-gray-900 mb-0.5 text-[13.5px]">{set.reference}</div>
                                                <div className="text-[12px] font-medium text-gray-500 truncate max-w-md">{set.description}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-rose-50/30 border-l border-rose-100">
                                                <span className="font-black text-rose-600 tabular-nums text-[14px]">
                                                    - <Taka className="text-[12px] text-rose-400"/>{Number(set.amount).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="4" className="text-center py-20 text-gray-400 font-medium"><i className="fa-solid fa-folder-open text-3xl mb-3 text-gray-300 block"></i> No settlement history recorded yet.</td></tr>
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