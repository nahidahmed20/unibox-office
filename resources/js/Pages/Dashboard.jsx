import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

/* ---------------------------------------------------------------- */
/*  Design tokens shared with AdminLayout — `--accent` etc. are set */
/*  on AdminLayout's root and inherit down here automatically.      */
/*  `--accent-ink` is a darker brass tuned for text on a white card */
/*  (the light `--accent-bright` from the sidebar is too pale here).*/
/* ---------------------------------------------------------------- */

const TONE_STYLES = {
    ink: { chip: 'bg-[#0A0E1A] text-[var(--accent-bright)]', value: 'text-[#1D2029]' },
    accent: { chip: 'bg-[var(--accent-bg)] text-[var(--accent-ink)]', value: 'text-[var(--accent-ink)]' },
    emerald: { chip: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
    rose: { chip: 'bg-rose-50 text-rose-600', value: 'text-rose-700' },
    slate: { chip: 'bg-slate-100 text-slate-600', value: 'text-slate-700' },
};

const SectionLabel = ({ children }) => (
    <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-ink)]" />
        <h2 className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-gray-500 sm:text-sm">{children}</h2>
        <span className="h-px flex-1 bg-gray-200" />
    </div>
);

const StatCard = ({ label, value, icon, tone = 'ink', hero = false, note, noteTone = 'default' }) => {
    const t = TONE_STYLES[tone];
    return (
        <div
            className={`group flex items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                hero ? 'border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/15' : 'border-[#ECEDF0]'
            }`}
        >
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-medium text-gray-500 sm:text-sm">{label}</h3>
                <p className={`mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl ${t.value}`}>{value}</p>
                {note && (
                    <p className={`mt-0.5 text-[11px] font-semibold sm:text-xs ${noteTone === 'alert' ? 'text-rose-500' : 'text-gray-400'}`}>
                        {note}
                    </p>
                )}
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg sm:h-12 sm:w-12 sm:text-xl ${t.chip}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
        </div>
    );
};

const money = (n) => (
    <>
        <span className="mr-1 text-xs font-semibold sm:text-sm">TK.</span>
        {(n || 0).toLocaleString('en-IN')}
    </>
);

export default function Dashboard({
    stats = {
        totalEmployees: 45,
        presentToday: 42,
        activeProjects: 12,
        pendingTasks: 28,
        unpaidInvoices: 5,
        monthlyRevenue: 24500,
        monthlyExpenses: 3200,
        pendingLeaves: 3,
        pendingRequisitions: 4,
        totalInvestment: 500000,
        totalClients: 18,
        totalBalance: 150000,
        cashBalance: 25000,
        bankBalance: 125000,
        totalProjectDue: 15000,
        totalClientDue: 35000,
    },
    recentNotices = [],
    recentTasks = [],
    recentTransactions = [],
}) {
    return (
        <AdminLayout>
            <div className="slider-page-wrapper mx-auto max-w-[1600px] p-3 sm:p-6" style={{ '--accent-ink': '#8A6A24' }}>
                <Head title="Dashboard Overview" />

                {/* --- Header --- */}
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-xl font-bold text-[#202223] sm:text-2xl">Dashboard Overview</h1>
                        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">Welcome back! Here is your business at a glance.</p>
                    </div>
                    <div className="flex items-center gap-2 self-start whitespace-nowrap rounded-md border border-[#ECEDF0] bg-white px-3.5 py-2 text-xs font-medium text-gray-500 shadow-sm sm:self-auto sm:text-sm">
                        <i className="fa-regular fa-calendar text-[var(--accent-ink)]"></i>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* --- Row 1: Accounts & Assets --- */}
                <SectionLabel>Accounts & Assets</SectionLabel>
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                    <StatCard hero tone="accent" label="Total Available Balance" value={money(stats.totalBalance)} icon="fa-wallet" />
                    <StatCard tone="ink" label="Cash in Hand" value={money(stats.cashBalance)} icon="fa-money-bill-wave" />
                    <StatCard tone="ink" label="Bank & Mobile Banking" value={money(stats.bankBalance)} icon="fa-building-columns" />
                    <StatCard tone="ink" label="Total Capital / Invest" value={money(stats.totalInvestment)} icon="fa-sack-dollar" />
                </div>

                {/* --- Row 2: Finance, Dues & Payables --- */}
                <SectionLabel>Finance, Dues & Payables</SectionLabel>
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                    <StatCard tone="emerald" label="Monthly Revenue" value={money(stats.monthlyRevenue)} icon="fa-chart-line" />
                    <StatCard tone="rose" label="Monthly Expenses" value={money(stats.monthlyExpenses)} icon="fa-receipt" />
                    <StatCard
                        tone="accent"
                        label="Client Dues (Receivable)"
                        value={money(stats.totalClientDue)}
                        icon="fa-file-invoice-dollar"
                        note={`${stats.unpaidInvoices} Unpaid Invoices`}
                        noteTone="alert"
                    />
                    <StatCard
                        tone="slate"
                        label="Vendor Dues (Payable)"
                        value={money(stats.totalProjectDue)}
                        icon="fa-hand-holding-dollar"
                        note="To be paid"
                    />
                </div>

                {/* --- Row 3: Operations & HR --- */}
                <SectionLabel>Operations & HR</SectionLabel>
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                    <StatCard tone="ink" label="Active Projects" value={stats.activeProjects} icon="fa-layer-group" />
                    <StatCard tone="ink" label="Total Clients" value={stats.totalClients} icon="fa-users-line" />
                    <StatCard
                        tone="ink"
                        label="Present Today"
                        value={
                            <>
                                {stats.presentToday} <span className="text-xs font-normal text-gray-400 sm:text-sm">/ {stats.totalEmployees}</span>
                            </>
                        }
                        icon="fa-user-check"
                    />
                    <StatCard
                        tone="ink"
                        label="Requisitions"
                        value={
                            <>
                                {stats.pendingRequisitions} <span className="text-xs font-normal text-[var(--accent-ink)] sm:text-sm">Pending</span>
                            </>
                        }
                        icon="fa-clipboard-list"
                    />
                </div>

                {/* --- Section 4: Lists & Activity --- */}
                <SectionLabel>Recent Activities</SectionLabel>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Recent Transactions Table */}
                    <div className="flex flex-col overflow-hidden rounded-lg border border-[#ECEDF0] bg-white shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4">
                            <h3 className="text-sm font-bold text-[#202223] sm:text-base">
                                <i className="fa-solid fa-arrow-right-arrow-left mr-2 text-[var(--accent-ink)]"></i> Recent Transactions
                            </h3>
                            <Link href={route('admin.transactions.index')} className="text-xs font-medium text-[var(--accent-ink)] hover:text-[var(--accent)] hover:underline sm:text-sm">
                                View Ledger
                            </Link>
                        </div>

                        <div className="overflow-x-auto p-0">
                            <table className="w-full min-w-[500px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase text-gray-500 sm:px-4">Date</th>
                                        <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase text-gray-500 sm:px-4">Account</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-500 sm:px-4">Description</th>
                                        <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase text-gray-500 sm:px-4">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((trx) => (
                                            <tr key={trx.id} className="transition-colors hover:bg-gray-50">
                                                <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500 sm:px-4 sm:text-sm">{trx.transaction_date}</td>
                                                <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-gray-800 sm:px-4 sm:text-sm">{trx.account?.name || '-'}</td>
                                                <td className="max-w-[150px] truncate px-3 py-3 text-xs text-gray-600 sm:max-w-[250px] sm:px-4 sm:text-sm">{trx.description}</td>
                                                <td
                                                    className={`whitespace-nowrap px-3 py-3 text-right text-xs font-bold tabular-nums sm:px-4 sm:text-sm ${
                                                        trx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}
                                                >
                                                    {trx.type === 'credit' ? '+' : '-'}TK. {parseFloat(trx.amount).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-xs text-gray-500 sm:text-sm">
                                                No recent transactions found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Tasks & Notices Stacked */}
                    <div className="flex flex-col gap-6">
                        {/* Recent Tasks */}
                        <div className="rounded-lg border border-[#ECEDF0] bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4">
                                <h3 className="text-sm font-bold text-[#202223] sm:text-base">
                                    <i className="fa-solid fa-list-check mr-2 text-[var(--accent-ink)]"></i> Recent Tasks
                                </h3>
                                <Link href={route('admin.tasks.index')} className="text-xs font-medium text-[var(--accent-ink)] hover:text-[var(--accent)] hover:underline sm:text-sm">
                                    View All
                                </Link>
                            </div>
                            <div className="p-0">
                                <ul className="divide-y divide-gray-100">
                                    {recentTasks.map((task) => (
                                        <li key={task.id} className="flex flex-col justify-between gap-2 p-3.5 hover:bg-gray-50 sm:flex-row sm:items-center sm:p-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-gray-800 sm:text-sm">{task.title}</p>
                                                <span
                                                    className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                        task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-[var(--accent-bg)] text-[var(--accent-ink)]'
                                                    }`}
                                                >
                                                    {task.priority} Priority
                                                </span>
                                            </div>
                                            <span className="self-start whitespace-nowrap rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500 sm:self-auto sm:text-xs">
                                                {task.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </li>
                                    ))}
                                    {recentTasks.length === 0 && <li className="p-4 text-center text-xs text-gray-500 sm:text-sm">No recent tasks.</li>}
                                </ul>
                            </div>
                        </div>

                        {/* Notice Board */}
                        <div className="rounded-lg border border-[#ECEDF0] bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4">
                                <h3 className="text-sm font-bold text-[#202223] sm:text-base">
                                    <i className="fa-solid fa-bullhorn mr-2 text-[var(--accent-ink)]"></i> Notice Board
                                </h3>
                                <Link href={route('admin.notices.index')} className="text-xs font-medium text-[var(--accent-ink)] hover:text-[var(--accent)] hover:underline sm:text-sm">
                                    View All
                                </Link>
                            </div>
                            <div className="p-0">
                                <ul className="divide-y divide-gray-100">
                                    {recentNotices.map((notice) => (
                                        <li key={notice.id} className="p-3.5 hover:bg-gray-50 sm:p-4">
                                            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-4">
                                                <p className="break-words text-xs font-semibold text-[var(--accent-ink)] sm:text-sm">{notice.title}</p>
                                                <span className="shrink-0 whitespace-nowrap text-[11px] text-gray-400 sm:text-xs">{notice.date}</span>
                                            </div>
                                        </li>
                                    ))}
                                    {recentNotices.length === 0 && <li className="p-4 text-center text-xs text-gray-500 sm:text-sm">No active notices.</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}