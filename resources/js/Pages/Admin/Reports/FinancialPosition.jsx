import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const money = (value) => `৳ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/* Cards grouped by meaning: what the business holds vs. what it owes */
const holdings = [
    ['account_balance', 'Bank and accounts', 'fa-building-columns', 'blue', 'Current balance of all active accounts'],
    ['client_due', 'Client receivable', 'fa-file-invoice-dollar', 'emerald', 'Amount still receivable from clients'],
    ['vendor_advance', 'Vendor advance', 'fa-hand-holding-dollar', 'amber', 'Unused money held in vendor wallets'],
    ['staff_advance', 'Staff advance', 'fa-user-clock', 'orange', 'Outstanding advance currently with staff'],
    ['asset_value', 'Asset value', 'fa-boxes-stacked', 'violet', 'Total purchase value of recorded assets'],
];

const obligations = [
    ['investment_balance', 'Net investment', 'fa-arrow-trend-up', 'indigo', 'Gross investment less returned principal'],
    ['client_advance', 'Client advance', 'fa-wallet', 'cyan', 'Unused advance received from clients'],
    ['vendor_due', 'Vendor payable', 'fa-truck-field', 'rose', 'Opening and project bills still payable'],
    ['unpaid_salaries', 'Unpaid salaries', 'fa-users-slash', 'rose', 'Pending staff salary payments'],
];

const tones = {
    indigo: { icon: 'bg-indigo-50 text-indigo-600', value: 'text-indigo-700' },
    blue: { icon: 'bg-blue-50 text-blue-600', value: 'text-blue-700' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
    cyan: { icon: 'bg-cyan-50 text-cyan-600', value: 'text-cyan-700' },
    rose: { icon: 'bg-rose-50 text-rose-600', value: 'text-rose-700' },
    amber: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' },
    violet: { icon: 'bg-violet-50 text-violet-600', value: 'text-violet-700' },
    orange: { icon: 'bg-orange-50 text-orange-600', value: 'text-orange-700' },
};

function KpiCard({ item, summary }) {
    const [key, label, icon, color, hint] = item;
    const tone = tones[color];
    return (
        <div className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[14px] ${tone.icon}`}><i className={`fa-solid ${icon}`}></i></span>
                <span className="text-[14px] font-semibold text-slate-700">{label}</span>
            </div>
            <p className={`mt-4 text-[26px] font-extrabold leading-none tracking-tight tabular-nums ${tone.value}`}>{money(summary[key])}</p>
            <p className="mt-2 text-[12.5px] leading-snug text-slate-500">{hint}</p>
            {key === 'investment_balance' && (
                <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-3 text-[12px] font-medium text-slate-500">
                    <span>Gross <b className="tabular-nums text-slate-700">{money(summary.investment_gross)}</b></span>
                    <span>Returned <b className="tabular-nums text-slate-700">{money(summary.investment_returned)}</b></span>
                </div>
            )}
        </div>
    );
}

function Group({ title, hint, items, summary, cols }) {
    return (
        <section>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-[18px] font-bold text-slate-900">{title}</h2>
                <p className="text-[13px] text-slate-500">{hint}</p>
            </div>
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}`}>
                {items.map((item) => <KpiCard key={item[0]} item={item} summary={summary} />)}
            </div>
        </section>
    );
}

function Breakdown({ title, icon, rows, columns, empty = 'No records found' }) {
    const count = rows?.length || 0;
    return (
        <section className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-[14px] text-white"><i className={`fa-solid ${icon}`}></i></span>
                    <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-slate-600">{count}</span>
            </div>
            <div className="soft-scroll overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13.5px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-[12.5px] font-semibold text-slate-500">
                            {columns.map(col => <th key={col.key} className={`px-5 py-3 ${col.number ? 'text-right' : ''}`}>{col.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {count ? rows.map((row, index) => (
                            <tr key={index} className="transition-colors hover:bg-slate-50/70">
                                {columns.map(col => (
                                    <td key={col.key} className={`px-5 py-3.5 ${col.number ? 'text-right font-bold tabular-nums' : 'font-semibold text-slate-800'} ${col.highlight || ''}`}>
                                        {col.number ? money(row[col.key]) : <>{row[col.key]}{col.key === 'name' && row.company && <span className="ml-1 text-[12px] font-medium text-slate-400">({row.company})</span>}</>}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-10 text-center">
                                    <i className="fa-regular fa-circle-check mb-2 block text-[20px] text-slate-300"></i>
                                    <span className="text-[13.5px] text-slate-500">{empty}</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default function FinancialPosition({ summary = {}, accounts = [], clientAdvances = [], vendorPositions = [], clientDues = [], staffAdvances = [], alerts = [], unpaidSalariesDetails = [], activeInvestments = [] }) {
    return <AdminLayout>
        <Head title="Financial Position" />

        <style dangerouslySetInnerHTML={{__html: `
            .soft-scroll::-webkit-scrollbar { height: 8px; }
            .soft-scroll::-webkit-scrollbar-track { background: transparent; }
            .soft-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        `}} />

        <div className="mx-auto mt-2 flex w-full max-w-[1600px] flex-col gap-8 pb-12">

            {/* Header */}
            <header className="flex flex-col gap-5 rounded-2xl bg-slate-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7 print:bg-white print:px-0 print:text-slate-900">
                <div>
                    <h1 className="text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px]">Financial position</h1>
                    <p className="mt-2 max-w-xl text-[14px] text-slate-400 print:text-slate-500">A current snapshot of your funds, advances, receivables, payables and liabilities.</p>
                </div>
                <button onClick={() => window.print()} className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-[14px] font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-95 print:hidden">
                    <i className="fa-solid fa-print"></i> Print report
                </button>
            </header>

            {/* Alerts */}
            {alerts.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 print:hidden">
                    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-amber-950">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-[12px] text-amber-700"><i className="fa-solid fa-triangle-exclamation"></i></span>
                        Data health alerts
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{alerts.length}</span>
                    </h2>
                    <ul className="flex flex-col gap-2">
                        {alerts.map((alert, index) => (
                            <li key={index} className={`flex items-start gap-2.5 text-[13.5px] font-medium ${alert.level === 'danger' ? 'text-rose-700' : 'text-amber-900'}`}>
                                <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${alert.level === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                {alert.message}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* KPI groups */}
            <Group title="What you hold" hint="Cash, money owed to you, and assets." items={holdings} summary={summary} cols="lg:grid-cols-3 xl:grid-cols-5" />
            <Group title="What you owe" hint="Investor capital, client advances, vendor bills and salaries." items={obligations} summary={summary} cols="xl:grid-cols-4" />

            {/* Breakdowns */}
            <section>
                <h2 className="mb-3 text-[18px] font-bold text-slate-900">Breakdown</h2>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Breakdown title="Bank and account balances" icon="fa-building-columns" rows={accounts} columns={[{ key: 'name', label: 'Account' }, { key: 'balance', label: 'Current balance', number: true, highlight: 'text-blue-700' }]} />
                    <Breakdown title="Client receivables" icon="fa-file-invoice-dollar" rows={clientDues} columns={[{ key: 'name', label: 'Client' }, { key: 'invoiced', label: 'Invoiced', number: true }, { key: 'paid', label: 'Settled', number: true }, { key: 'due', label: 'Due', number: true, highlight: 'text-emerald-700' }]} />
                    <Breakdown title="Available client advances" icon="fa-wallet" rows={clientAdvances.filter(row => row.balance > 0)} columns={[{ key: 'name', label: 'Client' }, { key: 'received', label: 'Received', number: true }, { key: 'used', label: 'Used', number: true }, { key: 'balance', label: 'Available', number: true, highlight: 'text-cyan-700' }]} />
                    <Breakdown title="Vendor position" icon="fa-truck-field" rows={vendorPositions.filter(row => row.advance > 0 || row.due > 0)} columns={[{ key: 'name', label: 'Vendor' }, { key: 'advance', label: 'Advance', number: true, highlight: 'text-amber-700' }, { key: 'due', label: 'Payable', number: true, highlight: 'text-rose-700' }]} />
                    <Breakdown title="Outstanding staff advances" icon="fa-user-clock" rows={staffAdvances.filter(row => row.balance > 0)} columns={[{ key: 'name', label: 'Staff' }, { key: 'given', label: 'Given', number: true }, { key: 'used', label: 'Used', number: true }, { key: 'returned', label: 'Returned', number: true }, { key: 'balance', label: 'Outstanding', number: true, highlight: 'text-orange-700' }]} />
                    <Breakdown title="Unpaid salaries liability" icon="fa-users-slash" rows={unpaidSalariesDetails} columns={[{ key: 'name', label: 'Staff' }, { key: 'month', label: 'Month' }, { key: 'due', label: 'Pending due', number: true, highlight: 'text-rose-700' }]} empty="All salaries are paid." />
                    <Breakdown title="Active investments liability" icon="fa-arrow-trend-up" rows={activeInvestments} columns={[{ key: 'name', label: 'Investor' }, { key: 'gross', label: 'Gross', number: true }, { key: 'returned', label: 'Returned', number: true }, { key: 'balance', label: 'Balance due', number: true, highlight: 'text-indigo-700' }]} empty="No active investments." />
                </div>
            </section>
        </div>
    </AdminLayout>;
}
