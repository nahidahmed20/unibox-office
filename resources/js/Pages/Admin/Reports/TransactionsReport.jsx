import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

export default function TransactionsReport({ transactions = { data: [], links: [] }, accounts = [], filters = {} }) {
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [sourceType, setSourceType] = useState(filters.source_type || '');
    const [fromDate, setFromDate] = useState(filters.from || '');
    const [toDate, setToDate] = useState(filters.to || '');

    const isFirstRender = useRef(true);

    // --- Source type লেবেল ও Tailwind ক্লাসেস ---
    const sourceMeta = {
        vendor_payment:      { label: 'Vendor Payment',      className: 'bg-orange-50 text-orange-600 border-orange-200' },
        vendor_payment_void: { label: 'Payment Voided',      className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        vendor_advance:      { label: 'Advance Given',       className: 'bg-blue-50 text-blue-600 border-blue-200' },
        vendor_refund:       { label: 'Refund Received',     className: 'bg-rose-50 text-rose-600 border-rose-200' },
        manual_adjustment:   { label: 'Manual Adjustment',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };

    const getSourceMeta = (type) =>
        sourceMeta[type] || { label: type || 'Unknown', className: 'bg-gray-100 text-gray-500 border-gray-200' };

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

            router.get(route('admin.accounts.transactions'), params, {
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

    const hasActiveFilters = accountId || sourceType || fromDate || toDate;

    return (
        <AdminLayout>
            <Head title="Account Transactions Report" />

            <div className="flex flex-col gap-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Account Transactions Report</h1>
                        <p className="text-[14px] text-gray-500 mt-1">প্রতিটা অ্যাকাউন্টে কবে, কোথা থেকে, কত টাকা ঢুকেছে বা বেরিয়েছে তার সম্পূর্ণ হিস্টরি।</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Filter Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3 w-full">

                            {/* Account Filter */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Account</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="appearance-none bg-none w-full sm:w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value="">All Accounts</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Source Type Filter */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Transaction Type</label>
                                <select
                                    value={sourceType}
                                    onChange={(e) => setSourceType(e.target.value)}
                                    className="appearance-none bg-none w-full sm:w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value="">All Types</option>
                                    <option value="vendor_payment">Vendor Payment</option>
                                    <option value="vendor_payment_void">Payment Voided</option>
                                    <option value="vendor_advance">Advance Given</option>
                                    <option value="vendor_refund">Refund Received</option>
                                    <option value="manual_adjustment">Manual Adjustment</option>
                                </select>
                            </div>

                            <div className="h-8 w-px bg-gray-300 hidden md:block mt-4"></div>

                            {/* Date Filters */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Date Range</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                    />
                                    <span className="text-gray-400 text-[13px]">to</span>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Clear Filter Button */}
                            {hasActiveFilters && (
                                <div className="flex flex-col justify-end mt-4 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100"
                                    >
                                        <i className="fa-solid fa-xmark"></i> Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4">Source Type</th>
                                    <th className="px-6 py-4 w-[35%]">Reference / Note</th>
                                    <th className="px-6 py-4 text-right">Amount (In/Out)</th>
                                    <th className="px-6 py-4 text-right">Balance After</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {transactions.data && transactions.data.length > 0 ? (
                                    transactions.data.map((tx) => {
                                        const meta = getSourceMeta(tx.source_type);
                                        return (
                                            <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13.5px] font-semibold text-gray-800 flex items-center gap-1.5">
                                                            <i className="fa-regular fa-calendar text-gray-400"></i>
                                                            {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[11.5px] text-gray-500 mt-0.5 ml-5">
                                                            {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {tx.account?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.className}`}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-800 font-medium whitespace-normal max-w-[250px] leading-relaxed">
                                                        {tx.reference || '-'}
                                                    </div>
                                                    {tx.note && (
                                                        <div className="text-[12px] text-gray-500 mt-1 whitespace-normal max-w-[250px]">
                                                            {tx.note}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold text-[14.5px] ${tx.type === 'debit' ? "text-red-600" : "text-emerald-600"}`}>
                                                    {tx.type === 'debit' ? '-' : '+'} TK. {Number(tx.amount).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-gray-800">
                                                    TK. {Number(tx.balance_after).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-clock-rotate-left text-4xl text-gray-300 mb-3"></i>
                                                <p>কোনো ট্রানজেকশন পাওয়া যায়নি।</p>
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
                            <div className="text-[13px] text-gray-500">
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {transactions.links.map((link, index) => (
                                    link.url === null ? (
                                        <span
                                            key={index}
                                            className="flex min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[13px] text-gray-400 cursor-not-allowed"
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                        />
                                    ) : (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            preserveState
                                            className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                                ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
