import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

// Premium Stat Card Component
const StatCard = ({ label, value, icon, gradient, note, noteColor }) => {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md group">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${gradient}`}></div>

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                    <h3 className="text-[24px] font-black text-gray-900 tracking-tight tabular-nums">{value}</h3>
                    {note && (
                        <p className={`text-[11.5px] font-bold ${noteColor || 'text-gray-400'}`}>
                            {note}
                        </p>
                    )}
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${gradient}`}>
                    <i className={`fa-solid ${icon} text-[20px]`}></i>
                </div>
            </div>
        </div>
    );
};

const money = (n) => (
    <>
        <span className="text-[16px] font-bold text-gray-400 mr-0.5">৳</span>
        {(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
    </>
);

export default function Dashboard({ stats, recentPendingInvoices = [], recentNotices = [], recentTasks = [], recentTransactions = [] }) {
    // 🟢 Calculating Total Monthly Spent (Expenses + Payroll)
    const totalSpentThisMonth = (Number(stats.monthlyExpensesOnly) || 0) + (Number(stats.monthlySalaryPaid) || 0);

    return (
        <AdminLayout>
            <Head title="Dashboard Overview" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-8 pb-12">

                {/* --- Page Header --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Welcome Back
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Business Overview</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5">Here is what's happening with your business today.</p>
                    </div>
                    <div className="flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm sm:self-auto">
                        <i className="fa-regular fa-calendar text-indigo-600"></i>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                </div>

                {/* --- Row 1: Key Financials (Top Priority) --- */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Available Balance"
                        value={money(stats.totalBalance)}
                        icon="fa-wallet"
                        gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                        note={`Cash: ৳${(Number(stats.cashBalance) || 0).toLocaleString()} | Bank: ৳${(Number(stats.bankBalance) || 0).toLocaleString()}`}
                        noteColor="text-indigo-600"
                    />
                    <StatCard
                        label="Market Receivable (Due)"
                        value={money(stats.totalClientDue)}
                        icon="fa-file-invoice-dollar"
                        gradient="bg-gradient-to-br from-rose-500 to-red-600"
                        note={`${stats.unpaidInvoices} Invoices are unpaid`}
                        noteColor="text-rose-500"
                    />
                    <StatCard
                        label="Received This Month"
                        value={money(stats.monthlyRevenue)}
                        icon="fa-arrow-down-to-bracket"
                        gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        note="Total cash-in this month"
                        noteColor="text-emerald-600"
                    />
                    {/* 🟢 NEW: Updated Spent Card with Payroll Data */}
                    <StatCard
                        label="Spent This Month"
                        value={money(totalSpentThisMonth)}
                        icon="fa-arrow-right-from-bracket"
                        gradient="bg-gradient-to-br from-orange-400 to-amber-500"
                        note={`Exp: ৳${(Number(stats.monthlyExpensesOnly) || 0).toLocaleString()} | Payroll: ৳${(Number(stats.monthlySalaryPaid) || 0).toLocaleString()}`}
                        noteColor="text-orange-600"
                    />
                </div>

                {/* --- Row 2: Secondary Stats --- */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center">
                        <i className="fa-solid fa-layer-group text-blue-500 text-xl mb-2"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.activeProjects}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-0.5">Active Projects</p>
                    </div>
                    {/* 🟢 NEW: Unpaid Salaries Card */}
                    <Link href={route('admin.salaries.index')} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                        <i className="fa-solid fa-money-check-dollar text-rose-500 text-xl mb-2"></i>
                        <h4 className="text-[18px] font-black text-gray-800 tabular-nums">৳{(Number(stats.unpaidSalaries)/1000).toFixed(1)}k</h4>
                        <p className="text-[11px] font-bold uppercase text-rose-500 mt-0.5">Unpaid Salaries</p>
                    </Link>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center">
                        <i className="fa-solid fa-hand-holding-dollar text-orange-500 text-xl mb-2"></i>
                        <h4 className="text-[18px] font-black text-gray-800 tabular-nums">৳{(Number(stats.totalProjectDue)/1000).toFixed(1)}k</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-0.5">Vendor Dues</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center">
                        <i className="fa-solid fa-list-check text-amber-500 text-xl mb-2"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.pendingTasks}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-0.5">Pending Tasks</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center">
                        <i className="fa-solid fa-user-check text-emerald-500 text-xl mb-2"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.presentToday} <span className="text-sm text-gray-400">/ {stats.totalEmployees}</span></h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-0.5">Staff Present</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center text-center">
                        <i className="fa-solid fa-clipboard-list text-purple-500 text-xl mb-2"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.pendingRequisitions}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-0.5">Requisitions</p>
                    </div>
                </div>

                {/* --- Row 3: Complex Data (Receivables & Transactions) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Pending Receivables Table */}
                    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice-dollar text-rose-500"></i> Pending Receivables (Who owes what)
                            </h3>
                            <Link href={route('admin.invoices.index')} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800">
                                View All &rarr;
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-100 text-[10.5px] font-bold uppercase text-gray-400">
                                    <tr>
                                        <th className="px-5 py-3">Client & Invoice</th>
                                        <th className="px-5 py-3">Work / Project</th>
                                        <th className="px-5 py-3 text-right">Due Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13px] text-gray-700 divide-y divide-gray-50">
                                    {recentPendingInvoices.length > 0 ? (
                                        recentPendingInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-gray-900">{inv.client?.name}</div>
                                                    <div className="text-[11.5px] text-indigo-600 font-bold mt-0.5">#{inv.invoice_number}</div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={inv.work_details}>
                                                        <i className="fa-solid fa-briefcase text-gray-400 text-[10px]"></i>
                                                        <span className="font-medium">{inv.work_details}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="font-black text-rose-600 tabular-nums">৳ {Number(inv.due_amount).toLocaleString('en-IN')}</div>
                                                    <Link href={route('invoice-payments.index', { search: inv.invoice_number })} className="inline-block mt-1 text-[10px] font-bold uppercase text-white bg-rose-500 px-2 py-0.5 rounded hover:bg-rose-600">
                                                        Collect
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-5 py-10 text-center text-gray-400">
                                                <i className="fa-solid fa-check-double text-3xl mb-2 text-emerald-400"></i>
                                                <p className="font-bold text-[13px]">No pending receivables!</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-money-bill-transfer text-emerald-500"></i> Recent Transactions
                            </h3>
                            <Link href={route('admin.transactions.index')} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800">
                                Ledger &rarr;
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-100 text-[10.5px] font-bold uppercase text-gray-400">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Account & Details</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13px] text-gray-700 divide-y divide-gray-50">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-gray-500 text-[12px]">{new Date(trx.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                                        <i className="fa-solid fa-building-columns text-[10px] text-gray-400"></i> {trx.account?.name || '-'}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 mt-0.5 max-w-[200px] truncate" title={trx.description}>{trx.description}</div>
                                                </td>
                                                <td className={`px-5 py-3.5 text-right font-black tabular-nums ${trx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {trx.type === 'credit' ? '+' : '-'}৳ {Number(trx.amount).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-5 py-10 text-center text-gray-400">
                                                <p className="font-bold text-[13px]">No recent transactions.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- Row 4: Tasks & Notices --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Tasks */}
                    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-amber-500"></i> Active Tasks
                            </h3>
                            <Link href={route('admin.tasks.index')} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800">
                                View Board &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50">
                            {recentTasks.length > 0 ? (
                                recentTasks.map((task) => (
                                    <li key={task.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                        <div>
                                            <p className="text-[13.5px] font-bold text-gray-800">{task.title}</p>
                                            <span className={`mt-1 inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                {task.priority} Priority
                                            </span>
                                        </div>
                                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500 border border-gray-200 uppercase">
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="p-8 text-center text-[13px] font-bold text-gray-400">All caught up! No active tasks.</li>
                            )}
                        </ul>
                    </div>

                    {/* Notice Board */}
                    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-bullhorn text-purple-500"></i> Notice Board
                            </h3>
                            <Link href={route('admin.notices.index')} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800">
                                View All &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50">
                            {recentNotices.length > 0 ? (
                                recentNotices.map((notice) => (
                                    <li key={notice.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-500">
                                            <i className="fa-regular fa-bell"></i>
                                        </div>
                                        <div>
                                            <p className="text-[13.5px] font-bold text-gray-800 leading-snug">{notice.title}</p>
                                            <p className="text-[11.5px] font-medium text-gray-400 mt-0.5">{notice.date}</p>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="p-8 text-center text-[13px] font-bold text-gray-400">No active notices.</li>
                            )}
                        </ul>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}
