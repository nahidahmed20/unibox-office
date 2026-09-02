import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

const money = (value) => `৳ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const cards = [
    ['investment_balance', 'Net Investment', 'fa-arrow-trend-up', 'indigo', 'Gross investment less returned principal'],
    ['account_balance', 'Bank & Accounts', 'fa-building-columns', 'blue', 'Current balance of all active accounts'],
    ['client_due', 'Client Receivable', 'fa-file-invoice-dollar', 'emerald', 'Amount still receivable from clients'],
    ['client_advance', 'Client Advance', 'fa-wallet', 'cyan', 'Unused advance received from clients'],
    ['vendor_due', 'Vendor Payable', 'fa-truck-field', 'rose', 'Opening and project bills still payable'],
    ['vendor_advance', 'Vendor Advance', 'fa-hand-holding-dollar', 'amber', 'Unused money held in vendor wallets'],
    ['asset_value', 'Asset Value', 'fa-boxes-stacked', 'violet', 'Total purchase value of recorded assets'],
    ['staff_advance', 'Staff Advance', 'fa-user-clock', 'orange', 'Outstanding advance currently with staff'],
];

const themes = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100', blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100', cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100', amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100', orange: 'bg-orange-50 text-orange-700 border-orange-100',
};

function Breakdown({ title, icon, rows, columns, empty = 'No records found' }) {
    return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm break-inside-avoid">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white"><i className={`fa-solid ${icon}`}></i></span>
            <h2 className="text-[16px] font-extrabold text-gray-900">{title}</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead><tr className="bg-gray-50 text-[10.5px] font-black uppercase tracking-wider text-gray-500">
                    {columns.map(col => <th key={col.key} className={`px-5 py-3 ${col.number ? 'text-right' : ''}`}>{col.label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.length ? rows.map((row, index) => <tr key={index} className="hover:bg-gray-50/70">
                        {columns.map(col => <td key={col.key} className={`px-5 py-3.5 ${col.number ? 'text-right font-bold tabular-nums' : 'font-semibold text-gray-800'} ${col.highlight || ''}`}>
                            {col.number ? money(row[col.key]) : <>{row[col.key]}{col.key === 'name' && row.company && <span className="ml-1 text-[11px] font-medium text-gray-400">({row.company})</span>}</>}
                        </td>)}
                    </tr>) : <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-gray-400">{empty}</td></tr>}
                </tbody>
            </table>
        </div>
    </section>;
}

export default function FinancialPosition({ summary = {}, accounts = [], clientAdvances = [], vendorPositions = [], clientDues = [], staffAdvances = [], alerts = [] }) {
    return <AdminLayout>
        <Head title="Financial Position" />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-12">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:mb-6">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-600"><i className="fa-solid fa-chart-pie"></i> Consolidated Report</div>
                    <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">Financial Position</h1>
                    <p className="mt-1 text-[13.5px] text-gray-500">A current snapshot of funds, advances, receivables, payables and assets.</p>
                </div>
                <button onClick={() => window.print()} className="print:hidden inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-[13px] font-bold text-white shadow-sm hover:bg-gray-800"><i className="fa-solid fa-print"></i> Print Report</button>
            </header>

            {alerts.length > 0 && <section className="print:hidden rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-amber-900"><i className="fa-solid fa-triangle-exclamation"></i> Data Health Alerts</h2>
                <div className="space-y-1.5">{alerts.map((alert, index) => <p key={index} className={`text-[12.5px] font-semibold ${alert.level === 'danger' ? 'text-red-700' : 'text-amber-800'}`}>• {alert.message}</p>)}</div>
            </section>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([key, label, icon, color, hint]) => <div key={key} className={`rounded-2xl border p-5 ${themes[color]} break-inside-avoid`}>
                    <div className="mb-4 flex items-start justify-between"><span className="text-[12px] font-black uppercase tracking-wider opacity-75">{label}</span><i className={`fa-solid ${icon} text-lg opacity-70`}></i></div>
                    <div className="text-[25px] font-black tabular-nums">{money(summary[key])}</div>
                    <p className="mt-1.5 text-[11px] font-medium opacity-65">{hint}</p>
                    {key === 'investment_balance' && <div className="mt-3 flex justify-between border-t border-current/10 pt-2 text-[10.5px] font-bold"><span>Gross {money(summary.investment_gross)}</span><span>Returned {money(summary.investment_returned)}</span></div>}
                </div>)}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Breakdown title="Bank & Account Balances" icon="fa-building-columns" rows={accounts} columns={[{ key: 'name', label: 'Account' }, { key: 'balance', label: 'Current Balance', number: true, highlight: 'text-blue-700' }]} />
                <Breakdown title="Client Receivables" icon="fa-file-invoice-dollar" rows={clientDues} columns={[{ key: 'name', label: 'Client' }, { key: 'invoiced', label: 'Invoiced', number: true }, { key: 'paid', label: 'Settled', number: true }, { key: 'due', label: 'Due', number: true, highlight: 'text-emerald-700' }]} />
                <Breakdown title="Available Client Advances" icon="fa-wallet" rows={clientAdvances.filter(row => row.balance > 0)} columns={[{ key: 'name', label: 'Client' }, { key: 'received', label: 'Received', number: true }, { key: 'used', label: 'Used', number: true }, { key: 'balance', label: 'Available', number: true, highlight: 'text-cyan-700' }]} />
                <Breakdown title="Vendor Position" icon="fa-truck-field" rows={vendorPositions.filter(row => row.advance > 0 || row.due > 0)} columns={[{ key: 'name', label: 'Vendor' }, { key: 'advance', label: 'Advance', number: true, highlight: 'text-amber-700' }, { key: 'due', label: 'Payable', number: true, highlight: 'text-rose-700' }]} />
                <Breakdown title="Outstanding Staff Advances" icon="fa-user-clock" rows={staffAdvances.filter(row => row.balance > 0)} columns={[{ key: 'name', label: 'Staff' }, { key: 'given', label: 'Given', number: true }, { key: 'used', label: 'Used', number: true }, { key: 'returned', label: 'Returned', number: true }, { key: 'balance', label: 'Outstanding', number: true, highlight: 'text-orange-700' }]} />
            </div>
        </div>
    </AdminLayout>;
}
