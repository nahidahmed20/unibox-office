import React, { useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import CustomSelect from '@/Components/CustomSelect';
import TableExportButtons from '@/Components/TableExportButtons';

const money = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MonthlyBalance({ rows = [], summary = {}, years = [], accounts = [], filters = {} }) {
    const applyFilters = (changes) => {
        const next = { year: filters.year, account_id: filters.account_id || '', ...changes };
        if (!next.account_id) delete next.account_id;
        router.get(route('admin.reports.monthly-balance'), next, { preserveState: true, preserveScroll: true });
    };

    const selectedAccount = accounts.find((a) => Number(a.id) === Number(filters.account_id));
    const scopeLabel = selectedAccount ? selectedAccount.name : 'All accounts';

    const exportHeaders = ['Month', 'Opening (Tk)', 'Deposit (+) (Tk)', 'Withdraw (-) (Tk)', 'Closing (Tk)', 'Net Change (Tk)', 'Transactions'];
    const exportRows = useMemo(() => {
        const list = (rows || []).map((r) => [
            r.label || '—',
            Number(r.opening || 0),
            Number(r.deposit || 0),
            Number(r.withdraw || 0),
            Number(r.closing || 0),
            Number((r.closing || 0) - (r.opening || 0)),
            Number(r.count || 0)
        ]);
        if (summary) {
            list.push([
                `Total ${filters.year || ''}`,
                Number(summary.opening || 0),
                Number(summary.deposit || 0),
                Number(summary.withdraw || 0),
                Number(summary.closing || 0),
                Number((summary.closing || 0) - (summary.opening || 0)),
                ''
            ]);
        }
        return list;
    }, [rows, summary, filters.year]);

    const cards = [
        { label: 'Year Opening', sub: 'Start of the year', value: summary.opening, icon: 'fa-flag', tone: 'text-slate-900', bg: 'bg-slate-100 text-slate-600' },
        { label: 'Total Deposit', sub: 'Total money in', value: summary.deposit, icon: 'fa-arrow-down', tone: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', prefix: '+' },
        { label: 'Total Withdraw', sub: 'Total money out', value: summary.withdraw, icon: 'fa-arrow-up', tone: 'text-rose-600', bg: 'bg-rose-50 text-rose-600', prefix: '-' },
        { label: 'Closing Balance', sub: 'Current closing balance', value: summary.closing, icon: 'fa-wallet', tone: 'text-indigo-700', bg: 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <AdminLayout>
            <Head title="Monthly Balance" />

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            ` }} />

            <div className="mx-auto mt-2 flex w-full max-w-[1400px] flex-col gap-6 pb-12">
                {/* Header + filters */}
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                    <div>
                        <div className="mb-2.5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Monthly Cashflow
                        </div>
                        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">
                            Monthly Balance
                        </h1>
                        <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-gray-500">
                            Track monthly starting balances, deposits, withdrawals, and ending balance progression.
                        </p>
                    </div>

                    <div className="no-print flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="w-[130px]">
                            <CustomSelect value={filters.year} isClearable={false} onChange={(e) => applyFilters({ year: e.target.value })}>
                                {years.map((y) => <option key={y} value={y}>{y}</option>)}
                            </CustomSelect>
                        </div>
                        <div className="w-[240px]">
                            <CustomSelect value={filters.account_id || ''} onChange={(e) => applyFilters({ account_id: e.target.value })}>
                                <option value="">All accounts</option>
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}{a.is_active ? '' : ' (inactive)'}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        <TableExportButtons
                            headers={exportHeaders}
                            rows={exportRows}
                            filename={`monthly_balance_${filters.year || ''}`}
                            title={`Monthly Balance Summary - ${filters.year || ''} (${scopeLabel})`}
                        />
                    </div>
                </div>

                <div id="print-area" className="flex flex-col gap-6">
                    <div className="hidden border-b-2 border-gray-800 pb-4 text-center print:block">
                        <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900">Monthly Balance {filters.year}</h1>
                        <p className="mt-1 text-sm font-semibold text-gray-600">{scopeLabel}</p>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map((c) => (
                            <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[12px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
                                        <div className="text-[12px] text-gray-400">{c.sub}</div>
                                    </div>
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
                                        <i className={`fa-solid ${c.icon}`}></i>
                                    </div>
                                </div>
                                <div className={`mt-3 text-[24px] font-black tabular-nums ${c.tone}`}>
                                    {c.prefix || ''}৳ {money(c.value)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Month table */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div className="text-[15px] font-bold text-gray-900">
                                {filters.year} · <span className="font-semibold text-gray-500">{scopeLabel}</span>
                            </div>
                            <div className="no-print text-[12px] text-gray-400">Click a month to view its transaction records</div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                                        <th className="px-6 py-3.5">Month</th>
                                        <th className="px-6 py-3.5 text-right">Opening</th>
                                        <th className="px-6 py-3.5 text-right">Deposit (+)</th>
                                        <th className="px-6 py-3.5 text-right">Withdraw (−)</th>
                                        <th className="px-6 py-3.5 text-right">Closing</th>
                                        <th className="px-6 py-3.5 text-right">Change</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[14px]">
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-14 text-center text-gray-400">
                                                No transactions found for this year.
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((r) => {
                                        const change = r.closing - r.opening;
                                        return (
                                            <tr key={r.month} className="transition-colors hover:bg-indigo-50/40">
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={route('admin.transactions.index', {
                                                            date_from: r.start_date,
                                                            date_to: r.end_date,
                                                            ...(filters.account_id ? { account_id: filters.account_id } : {}),
                                                        })}
                                                        className="font-bold text-gray-900 hover:text-indigo-600"
                                                    >
                                                        {r.label}
                                                    </Link>
                                                    <div className="text-[12px] text-gray-400">{r.count} transactions</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold tabular-nums text-gray-700">৳ {money(r.opening)}</td>
                                                <td className="px-6 py-4 text-right font-semibold tabular-nums text-emerald-600">{r.deposit > 0 ? `+ ৳ ${money(r.deposit)}` : '—'}</td>
                                                <td className="px-6 py-4 text-right font-semibold tabular-nums text-rose-600">{r.withdraw > 0 ? `- ৳ ${money(r.withdraw)}` : '—'}</td>
                                                <td className={`px-6 py-4 text-right font-black tabular-nums ${r.closing < 0 ? 'text-rose-600' : 'text-gray-900'}`}>৳ {money(r.closing)}</td>
                                                <td className={`px-6 py-4 text-right text-[13px] font-bold tabular-nums ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                    {change > 0 ? '▲' : change < 0 ? '▼' : ''} {money(Math.abs(change))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {rows.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 bg-gray-50 text-[14px] font-black">
                                            <td className="px-6 py-4 text-gray-900">Total {filters.year}</td>
                                            <td className="px-6 py-4 text-right tabular-nums text-gray-700">৳ {money(summary.opening)}</td>
                                            <td className="px-6 py-4 text-right tabular-nums text-emerald-600">+ ৳ {money(summary.deposit)}</td>
                                            <td className="px-6 py-4 text-right tabular-nums text-rose-600">- ৳ {money(summary.withdraw)}</td>
                                            <td className="px-6 py-4 text-right tabular-nums text-indigo-700">৳ {money(summary.closing)}</td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
