import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';

export default function TransactionsReport({ transactions = { data: [], links: [] }, accounts = [], filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    // --- Filter States ---
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [sourceType, setSourceType] = useState(filters.source_type || '');
    const [fromDate, setFromDate] = useState(filters.from || '');
    const [toDate, setToDate] = useState(filters.to || '');

    const isFirstRender = useRef(true);

    // --- View Modal States ---
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    // --- Source type লেবেল ও Tailwind ক্লাসেস ---
    const sourceMeta = {
        vendor_payment:      { label: 'Vendor Payment',      className: 'bg-orange-50 text-orange-600 border-orange-200' },
        vendor_payment_void: { label: 'Payment Voided',      className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        vendor_advance:      { label: 'Advance Given',       className: 'bg-blue-50 text-blue-600 border-blue-200' },
        vendor_refund:       { label: 'Refund Received',     className: 'bg-rose-50 text-rose-600 border-rose-200' },
        manual_adjustment:   { label: 'Manual Adjustment',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };

    const getSourceMeta = (type) =>
        sourceMeta[type] || { label: type ? type.replace('_', ' ') : 'System', className: 'bg-gray-100 text-gray-500 border-gray-200' };

    // --- ফিল্টার পরিবর্তন হলে সার্ভারে রিকোয়েস্ট ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            const params = {};
            if (accountId) params.account_id = accountId;
            if (sourceType) params.source_type = sourceType;
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;

            router.get(route('admin.reports.transactions'), params, {
                preserveState: true,
                replace: true
            });
        }, 350);

        return () => clearTimeout(delay);
    }, [accountId, sourceType, fromDate, toDate]);

    const clearFilters = () => {
        setAccountId('');
        setSourceType('');
        setFromDate('');
        setToDate('');
    };

    const openViewModal = (trx) => {
        setSelectedTrx(trx);
        setShowViewModal(true);
    };

    const hasActiveFilters = accountId || sourceType || fromDate || toDate;

    return (
        <AdminLayout>
            <Head title="Account Transactions Report" />

            {/* Custom Table Scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1500px] mx-auto pb-12">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Audit Trail
                        </div>
                        <h1 className="text-[26px] font-extrabold text-[#202223] tracking-tight">Account Transactions</h1>
                        <p className="text-[14px] text-gray-500 mt-1.5 max-w-md">প্রতিটা অ্যাকাউন্টে কবে, কোথা থেকে, কত টাকা ঢুকেছে বা বেরিয়েছে তার সম্পূর্ণ হিস্টরি।</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Filter Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-5 bg-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3 w-full">

                            {/* Account Filter */}
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Account</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="appearance-none w-full sm:w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13.5px] font-medium text-gray-700 outline-none transition-all focus:border-[var(--accent)] focus:bg-white cursor-pointer hover:bg-white"
                                >
                                    <option value="">All Accounts</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Source Type Filter */}
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Transaction Type</label>
                                <select
                                    value={sourceType}
                                    onChange={(e) => setSourceType(e.target.value)}
                                    className="appearance-none w-full sm:w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13.5px] font-medium text-gray-700 outline-none transition-all focus:border-[var(--accent)] focus:bg-white cursor-pointer hover:bg-white"
                                >
                                    <option value="">All Types</option>
                                    <option value="vendor_payment">Vendor Payment</option>
                                    <option value="vendor_payment_void">Payment Voided</option>
                                    <option value="vendor_advance">Advance Given</option>
                                    <option value="vendor_refund">Refund Received</option>
                                    <option value="manual_adjustment">Manual Adjustment</option>
                                </select>
                            </div>

                            <div className="h-10 w-px bg-gray-200 hidden md:block mt-6 mx-2"></div>

                            {/* Date Filters */}
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Date Range</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium outline-none transition-all focus:border-[var(--accent)] focus:bg-white cursor-pointer hover:bg-white"
                                    />
                                    <span className="text-gray-400 font-bold">–</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-medium outline-none transition-all focus:border-[var(--accent)] focus:bg-white cursor-pointer hover:bg-white"
                                    />
                                </div>
                            </div>

                            {/* Clear Filter Button */}
                            {hasActiveFilters && (
                                <div className="flex flex-col justify-end mt-6 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-100 shadow-sm"
                                    >
                                        <i className="fa-solid fa-xmark"></i> Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4">Source Type</th>
                                    <th className="px-6 py-4 w-[30%]">Reference / Note</th>
                                    <th className="px-6 py-4 text-right">Amount (In/Out)</th>
                                    <th className="px-6 py-4 text-right">Balance After</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {transactions.data && transactions.data.length > 0 ? (
                                    transactions.data.map((tx) => {
                                        const meta = getSourceMeta(tx.source_type);
                                        const dateObj = new Date(tx.created_at);

                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13.5px] font-bold text-gray-800 flex items-center gap-1.5">
                                                            <i className="fa-regular fa-calendar text-[var(--accent)] opacity-80"></i>
                                                            {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[11.5px] text-gray-500 mt-0.5 ml-5 font-medium">
                                                            {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-gray-700 shadow-sm">
                                                        <i className="fa-solid fa-building-columns text-gray-400"></i> {tx.account?.name || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.className}`}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900 font-semibold whitespace-normal max-w-[280px] leading-relaxed">
                                                        {tx.description || '-'}
                                                    </div>
                                                    {tx.reference_number && (
                                                        <div className="text-[11.5px] font-bold text-gray-500 mt-1 flex items-center gap-1.5 bg-gray-100 w-max px-2 py-0.5 rounded border border-gray-200">
                                                            <i className="fa-solid fa-hashtag text-[10px]"></i> {tx.reference_number}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-black text-[15px] whitespace-nowrap tabular-nums ${tx.type === 'debit' ? "text-red-600" : "text-emerald-600"}`}>
                                                    {tx.type === 'debit' ? '-' : '+'} <i className="fa-solid fa-bangladeshi-taka-sign text-[13px] mr-0.5 opacity-70"></i>{Number(tx.amount).toLocaleString('en-IN')}
                                                </td>
                                                {/* 🟢 Balance After Restored exactly as requested */}
                                                <td className="px-6 py-4 text-right font-extrabold text-gray-800 tabular-nums">
                                                    TK. {Number(tx.balance_after).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <button onClick={() => openViewModal(tx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12.5px]"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-clock-rotate-left text-4xl text-gray-300 mb-3"></i>
                                                <p className="text-[14.5px] font-bold text-gray-600">No transactions found.</p>
                                                <p className="text-[12.5px] text-gray-400 mt-1">Try adjusting your filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500 font-medium">
                                Showing <strong className="text-gray-700">{transactions.from || 0}</strong> to <strong className="text-gray-700">{transactions.to || 0}</strong> of <strong className="text-gray-700">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-transparent text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Transaction Receipt
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-red-500 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                <span className={`inline-block mb-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${selectedTrx.type === 'credit' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                </span>
                                <div className={`text-[36px] font-black tabular-nums tracking-tight ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<i className="fa-solid fa-bangladeshi-taka-sign text-[26px] mr-0.5 opacity-80"></i>{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Account</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-1.5"><i className="fa-solid fa-building-columns text-gray-400"></i> {selectedTrx.account?.name || "N/A"}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Date</span>
                                    <div className="font-bold text-gray-900 flex items-center gap-1.5"><i className="fa-regular fa-calendar text-gray-400"></i> {new Date(selectedTrx.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</span>
                                    <div className="text-gray-800 font-semibold leading-relaxed">{selectedTrx.description}</div>
                                </div>

                                {selectedTrx.reference_number && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Reference No</span>
                                        <div className="font-bold text-gray-800 flex items-center gap-1.5"><i className="fa-solid fa-hashtag text-gray-400"></i> {selectedTrx.reference_number}</div>
                                    </div>
                                )}

                                {/* 🟢 Balance After added to modal as well for better context */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 col-span-2 flex items-center justify-between">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-blue-600">Balance After Transaction</span>
                                    <div className="font-black text-blue-800 text-[16px] tabular-nums">TK. {Number(selectedTrx.balance_after).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-2.5 text-[14px] font-bold text-white hover:bg-gray-800 shadow-sm transition-colors">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
