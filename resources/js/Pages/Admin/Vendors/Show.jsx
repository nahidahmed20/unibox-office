import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Show({ vendor, payments, ledgers, bills, stats }) {
    const [activeTab, setActiveTab] = useState('payments');

    return (
        <AdminLayout>
            <Head title={`${vendor.name} - Vendor Profile`} />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Back Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link href={route('admin.vendors.index')} className="text-gray-600 hover:text-indigo-600 font-bold text-[13px] flex items-center gap-2 w-fit bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50">
                        <i className="fa-solid fa-arrow-left"></i> Back to Vendors
                    </Link>
                </div>

                {/* 🟢 Premium Clean Profile Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    <div className="flex items-center gap-5 sm:gap-6">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl sm:text-4xl font-black border border-indigo-100 shadow-inner uppercase">
                            {vendor.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-[24px] sm:text-[30px] font-black text-gray-900 tracking-tight leading-tight">{vendor.name}</h1>
                            {vendor.company_name && (
                                <p className="text-gray-500 font-bold flex items-center gap-2 mt-1 text-[14px] sm:text-[15px]">
                                    <i className="fa-regular fa-building text-gray-400"></i> {vendor.company_name}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-[12.5px] sm:text-[13.5px] font-semibold text-gray-600">
                                {vendor.phone && <span className="flex items-center gap-1.5"><i className="fa-solid fa-phone text-gray-400"></i> {vendor.phone}</span>}
                                {vendor.address && <span className="flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400"></i> {vendor.address}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-100 shrink-0 w-full xl:w-auto">
                        <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 sm:pr-6">
                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-money-check-dollar"></i> Total Payable (Due)</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-rose-700">
                                <Taka className="text-lg sm:text-xl text-rose-500"/>{Number(vendor.total_due || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex flex-col sm:pl-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-wallet"></i> Wallet (Advance)</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-purple-700">
                                <Taka className="text-lg sm:text-xl text-purple-500"/>{Number(vendor.wallet_balance || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🟢 Additional Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Billed by Vendor</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-gray-900 tabular-nums"><Taka/>{Number(stats.totalBilled || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl sm:text-2xl border border-blue-100"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Amount Paid</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-emerald-700 tabular-nums"><Taka/>{Number(stats.totalPaid || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl sm:text-2xl border border-emerald-100"><i className="fa-solid fa-check-double"></i></div>
                    </div>
                </div>

                {/* 🟢 Tabs Area */}
                <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex border-b border-gray-200 bg-gray-50/80 p-3 gap-2 overflow-x-auto custom-table-scroll">
                        <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-money-bill-transfer"></i> Payment History
                        </button>
                        <button onClick={() => setActiveTab('bills')} className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'bills' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-list-check"></i> Project Bills & Details
                        </button>
                        <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-wallet"></i> Wallet Ledger
                        </button>
                    </div>

                    <div className="p-0 overflow-x-auto custom-table-scroll">

                        {/* 🟢 PAYMENTS TAB (Upgraded with Detailed Purpose & Project) */}
                        {activeTab === 'payments' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date & Details</th>
                                        <th className="px-6 py-4.5">Source / Account</th>
                                        <th className="px-6 py-4.5">Purpose / Settled Bills</th>
                                        <th className="px-6 py-4.5 text-center">Status</th>
                                        <th className="px-6 py-4.5 text-right">Amount Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {payments.length > 0 ? payments.map(pay => (
                                        <tr key={pay.id} className={`hover:bg-gray-50/80 transition-colors ${pay.status === 'voided' ? 'bg-red-50/40' : ''}`}>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                                    <i className="fa-regular fa-calendar-days text-gray-400 text-[12px]"></i> {pay.date}
                                                </div>
                                                <div className="text-[11.5px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                                    Ref: #{String(pay.id).padStart(5, '0')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-indigo-700 flex items-center gap-2 bg-indigo-50 px-3 py-1.5 w-fit rounded-lg border border-indigo-100">
                                                    <i className={`fa-solid ${pay.payment_source === 'account' ? 'fa-building-columns' : 'fa-user-tie'}`}></i>
                                                    {pay.payment_source === 'account' ? (pay.account?.name || 'Bank/Cash') : 'Employee Advance'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[300px] max-w-lg align-top">
                                                <div className="flex flex-col gap-2.5">
                                                    {/* Payment Note/Description */}
                                                    {pay.note && (
                                                        <div className="text-[12.5px] text-gray-600 bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg font-medium">
                                                            <span className="font-bold text-amber-700 block mb-0.5"><i className="fa-solid fa-note-sticky mr-1"></i> Note:</span>
                                                            {pay.note}
                                                        </div>
                                                    )}

                                                    {/* Linked Bills/Expenses Details */}
                                                    {pay.details?.length > 0 ? pay.details.map(d => (
                                                        <div key={d.id} className="bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-sm">
                                                            <div className="font-bold text-gray-800 leading-snug">
                                                                {d.expense?.title || 'Unknown Expense / Bill'}
                                                            </div>
                                                            {d.expense?.project && (
                                                                <div className="text-indigo-600 font-bold mt-1 text-[11.5px] flex items-center gap-1.5">
                                                                    <i className="fa-solid fa-folder-open text-indigo-400"></i> {d.expense.project.title}
                                                                </div>
                                                            )}
                                                            <div className="text-[11.5px] text-gray-500 font-medium mt-1.5 flex items-center gap-2 border-t border-gray-200 pt-1.5">
                                                                <span>Bill Settled: <strong className="text-gray-800 tabular-nums">৳{Number(d.amount).toLocaleString('en-IN')}</strong></span>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <span className="text-gray-400 italic text-[12px] font-medium">Advance deposit (No specific bill attached)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center align-top">
                                                {pay.status === 'voided' ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-200">VOIDED</span>
                                                        {pay.void_reason && <span className="text-[10px] text-red-500 font-bold max-w-[120px] truncate" title={pay.void_reason}>{pay.void_reason}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200">COMPLETED</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className={`font-black text-[18px] ${pay.status === 'voided' ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>
                                                    <Taka/>{Number(pay.pay_amount).toLocaleString('en-IN')}
                                                </div>
                                                {Number(pay.wallet_credit_amount) > 0 && (
                                                    <div className="text-[11.5px] font-bold text-purple-600 mt-1 flex justify-end items-center gap-1 bg-purple-50 w-fit ml-auto px-2 py-0.5 rounded border border-purple-100">
                                                        <i className="fa-solid fa-arrow-turn-down"></i> Sent to Wallet: ৳{Number(pay.wallet_credit_amount).toLocaleString('en-IN')}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-receipt text-4xl mb-4 block text-gray-200"></i>No payment history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 PROJECT BILLS TAB (Upgraded to show full details) */}
                        {activeTab === 'bills' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date</th>
                                        <th className="px-6 py-4.5">Project & Client</th>
                                        <th className="px-6 py-4.5">Bill Details & Description</th>
                                        <th className="px-6 py-4.5 text-right">Total Bill</th>
                                        <th className="px-6 py-4.5 text-right">Paid Amount</th>
                                        <th className="px-6 py-4.5 text-right bg-rose-50/50 text-rose-500">Due Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {bills.length > 0 ? bills.map(bill => (
                                        <tr key={bill.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-600 align-top">
                                                {bill.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[200px] max-w-[250px] align-top">
                                                {bill.project ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-extrabold text-indigo-700 leading-snug">{bill.project.title}</span>
                                                        {bill.project.client && (
                                                            <span className="text-[11.5px] font-bold text-gray-500 flex items-center gap-1.5">
                                                                <i className="fa-regular fa-building opacity-70"></i> {bill.project.client.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400 italic">General (No Project)</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[250px] max-w-[350px] align-top">
                                                <div className="font-extrabold text-gray-900 text-[14.5px] leading-snug">{bill.title}</div>
                                                {bill.category && (
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit mt-1.5">
                                                        {bill.category.name}
                                                    </div>
                                                )}
                                                {bill.description && (
                                                    <div className="text-[12.5px] text-gray-500 mt-2 italic border-l-2 border-gray-200 pl-2 line-clamp-2" title={bill.description}>
                                                        {bill.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-700 bg-gray-50/50 align-top"><Taka/>{Number(bill.total_bill).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/30 align-top"><Taka/>{Number(bill.paid_amount).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 bg-rose-50/40 align-top"><Taka/>{Number(bill.due_amount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-folder-open text-4xl mb-4 block text-gray-200"></i>No bills found for this vendor.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 WALLET LEDGER TAB (Upgraded Description Display) */}
                        {activeTab === 'ledger' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date</th>
                                        <th className="px-6 py-4.5">Transaction Type</th>
                                        <th className="px-6 py-4.5">Wallet Description / Context</th>
                                        <th className="px-6 py-4.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {ledgers.length > 0 ? ledgers.map(l => (
                                        <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-600 align-top">{new Date(l.date || l.created_at).toLocaleDateString('en-GB')}</td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${l.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    <i className={`fa-solid mr-1.5 ${l.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                                                    {l.type === 'credit' ? 'DEPOSIT (IN)' : 'WITHDRAW (OUT)'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[300px] align-top">
                                                <div className="font-bold text-gray-800 leading-relaxed bg-gray-50 border border-gray-100 p-3 rounded-xl shadow-sm">
                                                    {l.description}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[18px] align-top tabular-nums ${l.type === 'credit' ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'}`}>
                                                {l.type === 'credit' ? '+' : '-'} <Taka className="ml-0.5 text-sm"/> {Number(l.amount).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-wallet text-4xl mb-4 block text-gray-200"></i>No wallet transactions found.</td></tr>
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
