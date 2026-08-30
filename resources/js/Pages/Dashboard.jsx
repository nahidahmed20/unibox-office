import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

// Premium Stat Card Component
const StatCard = ({ label, value, icon, gradient, note, noteColor }) => {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
            <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${gradient}`}></div>

            <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                    <h3 className="text-[26px] font-black text-gray-900 tracking-tight tabular-nums mt-0.5">{value}</h3>
                    {note && (
                        <p className={`text-[11.5px] font-bold mt-1 ${noteColor || 'text-gray-400'}`}>
                            {note}
                        </p>
                    )}
                </div>
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${gradient}`}>
                    <i className={`fa-solid ${icon} text-[22px]`}></i>
                </div>
            </div>
        </div>
    );
};

// Straight Taka Symbol Component
const Taka = () => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }} className="mr-1 opacity-70 text-[18px]">৳</span>
);

const money = (n) => (
    <div className="flex items-center">
        <Taka />
        {(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
    </div>
);

export default function Dashboard({ stats, recentPendingInvoices = [], recentNotices = [], recentTasks = [], recentTransactions = [] }) {
    // Calculating Total Monthly General Spent (Office Expenses + Payroll)
    const totalSpentThisMonth = (Number(stats.monthlyExpensesOnly) || 0) + (Number(stats.monthlySalaryPaid) || 0);

    return (
        <AdminLayout>
            <Head title="Dashboard Overview" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-8 pb-12 mt-2">

                {/* --- Page Header --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Welcome Back
                        </div>
                        <h1 className="text-[30px] font-black text-gray-900 tracking-tight">Business Overview</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 font-medium">Here is what's happening with your agency today.</p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-auto">
                        <Link href={route('admin.reports.daybook')} className="rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-5 py-2.5 text-[13px] font-bold transition-colors shadow-sm flex items-center gap-2 border border-indigo-100">
                            <i className="fa-solid fa-book-open"></i> Daily Daybook
                        </Link>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
                            <i className="fa-regular fa-calendar text-indigo-500"></i>
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* --- Row 1 & 2: 8 Key Financials (Top Priority) --- */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                    {/* 1. Available Balance */}
                    <StatCard
                        label="Available Balance"
                        value={money(stats.availableBalance)}
                        icon="fa-wallet"
                        gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                        note={`Accounts: ৳ ${(Number(stats.totalBalance) || 0).toLocaleString()} | Cl. Adv: ৳ ${(Number(stats.clientAdvance) || 0).toLocaleString()}`}
                        noteColor="text-indigo-600"
                    />

                    {/* 2. Vendor Payables & Advance */}
                    <StatCard
                        label="Vendor Dues (Payables)"
                        value={money(stats.vendorDue)}
                        icon="fa-truck-field"
                        gradient="bg-gradient-to-br from-rose-500 to-red-600"
                        note={`Wallet Advance: ৳ ${(Number(stats.vendorAdvance) || 0).toLocaleString()} | Paid: ৳ ${(Number(stats.vendorPaid) || 0).toLocaleString()}`}
                        noteColor="text-rose-500"
                    />

                    {/* 3. Market Receivables */}
                    <StatCard
                        label="Market Receivable (Due)"
                        value={money(stats.totalClientDue)}
                        icon="fa-file-invoice-dollar"
                        gradient="bg-gradient-to-br from-orange-400 to-amber-500"
                        note={`${stats.unpaidInvoices} Invoices are currently unpaid`}
                        noteColor="text-orange-600"
                    />

                    {/* 4. Monthly Project Expense */}
                    <StatCard
                        label="Project Exp. (This Month)"
                        value={money(stats.monthlyProjectExpense)}
                        icon="fa-diagram-project"
                        gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        note="Total billed on projects this month"
                        noteColor="text-emerald-600"
                    />

                    {/* 5. Total Investments */}
                    <StatCard
                        label="Total Investment"
                        value={money(stats.totalInvestment)}
                        icon="fa-chart-line"
                        gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
                        note="Total capital invested in company"
                        noteColor="text-purple-600"
                    />

                    {/* 6. Total Assets */}
                    <StatCard
                        label="Total Asset Value"
                        value={money(stats.totalAssets)}
                        icon="fa-couch"
                        gradient="bg-gradient-to-br from-cyan-400 to-emerald-500"
                        note="Current valuation of company assets"
                        noteColor="text-cyan-700"
                    />

                    {/* 7. Employee Advance */}
                    <StatCard
                        label="Employee Advance (Given)"
                        value={money(stats.employeeAdvance)}
                        icon="fa-user-tie"
                        gradient="bg-gradient-to-br from-blue-400 to-cyan-500"
                        note="Total unsettled staff advances"
                        noteColor="text-blue-600"
                    />

                    {/* 8. Office Expenses */}
                    <StatCard
                        label="Office Spent (This Month)"
                        value={money(totalSpentThisMonth)}
                        icon="fa-arrow-right-from-bracket"
                        gradient="bg-gradient-to-br from-fuchsia-500 to-pink-600"
                        note={`Office Exp: ৳ ${(Number(stats.monthlyExpensesOnly) || 0).toLocaleString()} | Salary: ৳ ${(Number(stats.monthlySalaryPaid) || 0).toLocaleString()}`}
                        noteColor="text-fuchsia-600"
                    />
                </div>

                {/* --- Row 3: Operational Stats --- */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mt-2">
                    <Link href={route('admin.projects.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-200 transition-all group">
                        <i className="fa-solid fa-layer-group text-blue-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.activeProjects}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">Active Projects</p>
                    </Link>

                    <Link href={route('admin.salaries.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-rose-200 transition-all group">
                        <i className="fa-solid fa-money-check-dollar text-rose-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-[20px] font-black text-gray-800 tabular-nums">৳ {(Number(stats.unpaidSalaries)/1000).toFixed(1)}k</h4>
                        <p className="text-[11px] font-bold uppercase text-rose-500 mt-1">Unpaid Salaries</p>
                    </Link>

                    <Link href={route('admin.invoices.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-200 transition-all group">
                        <i className="fa-solid fa-arrow-down-to-bracket text-emerald-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-[20px] font-black text-gray-800 tabular-nums">৳ {(Number(stats.monthlyRevenue)/1000).toFixed(1)}k</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">Revenue This Month</p>
                    </Link>

                    <Link href={route('admin.tasks.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-amber-200 transition-all group">
                        <div className="relative">
                            <i className="fa-solid fa-list-check text-amber-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                            {stats.pendingTasks > 0 && <span className="absolute -top-1 -right-2 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping"></span>}
                        </div>
                        <h4 className="text-2xl font-black text-gray-800">{stats.pendingTasks}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">Pending Tasks</p>
                    </Link>

                    <Link href={route('admin.attendances.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-200 transition-all group">
                        <i className="fa-solid fa-user-check text-emerald-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-2xl font-black text-gray-800">{stats.presentToday} <span className="text-sm text-gray-400">/ {stats.totalEmployees}</span></h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">Staff Present</p>
                    </Link>

                    <Link href={route('admin.leaves.index')} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-purple-200 transition-all group">
                        <div className="relative">
                            <i className="fa-solid fa-calendar-minus text-purple-500 text-2xl mb-2.5 group-hover:scale-110 transition-transform"></i>
                            {(stats.pendingLeaves > 0 || stats.pendingRequisitions > 0) && <span className="absolute -top-1 -right-2 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                        </div>
                        <h4 className="text-2xl font-black text-gray-800">{stats.pendingLeaves + stats.pendingRequisitions}</h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">Pending Requests</p>
                    </Link>
                </div>

                {/* --- Row 4: Complex Data (Receivables & Transactions) --- */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-2">

                    {/* Pending Receivables Table */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                                Pending Receivables
                            </h3>
                            <Link href={route('admin.invoices.index')} className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                View All &rarr;
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-50 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Client & Invoice</th>
                                        <th className="px-6 py-4">Project / Work</th>
                                        <th className="px-6 py-4 text-right">Due Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-700 divide-y divide-gray-50/80">
                                    {recentPendingInvoices.length > 0 ? (
                                        recentPendingInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-[14.5px]">{inv.client?.name}</div>
                                                    <div className="text-[11.5px] text-indigo-500 font-bold mt-0.5 bg-indigo-50 px-2 py-0.5 rounded w-fit">#{inv.invoice_number}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 max-w-[220px] truncate" title={inv.work_details}>
                                                        <i className="fa-solid fa-briefcase text-gray-400 text-[11px]"></i>
                                                        <span className="font-medium text-gray-600">{inv.work_details}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-black text-rose-600 tabular-nums text-[15px] flex items-center justify-end gap-1"><Taka /> {Number(inv.due_amount).toLocaleString('en-IN')}</div>
                                                    <Link href={route('invoice-payments.index', { search: inv.invoice_number })} className="inline-block mt-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white bg-rose-500 hover:bg-rose-600 px-3 py-1 rounded-md transition-colors shadow-sm">
                                                        Collect Payment
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-400 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-check-double text-2xl"></i></div>
                                                <p className="font-bold text-[14px] text-gray-500">All invoices are paid!</p>
                                                <p className="text-[12px] mt-1">No pending receivables found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Transactions Table */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><i className="fa-solid fa-money-bill-transfer"></i></div>
                                Recent Transactions
                            </h3>
                            <Link href={route('admin.transactions.index')} className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                View Ledger &rarr;
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-50 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Account & Details</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-700 divide-y divide-gray-50/80">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-500 text-[12.5px] bg-gray-50/30">
                                                    {new Date(trx.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                                                        <i className="fa-solid fa-building-columns text-[11px] text-indigo-400"></i> {trx.account?.name || '-'}
                                                    </div>
                                                    <div className="text-[12px] text-gray-500 mt-1 max-w-[250px] truncate" title={trx.description}>{trx.description}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className={`font-black tabular-nums text-[15px] flex items-center justify-end gap-1 ${trx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {trx.type === 'credit' ? '+' : '-'} <Taka /> {Number(trx.amount).toLocaleString('en-IN')}
                                                    </div>
                                                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${trx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {trx.type === 'credit' ? 'Cash In' : 'Cash Out'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                <div className="h-14 w-14 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-file-invoice text-2xl"></i></div>
                                                <p className="font-bold text-[14px] text-gray-500">No recent transactions.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- Row 5: Tasks & Notices --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
                    {/* Active Tasks */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center"><i className="fa-solid fa-list-check"></i></div>
                                Active Tasks
                            </h3>
                            <Link href={route('admin.tasks.index')} className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                View Board &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50/80">
                            {recentTasks.length > 0 ? (
                                recentTasks.map((task) => (
                                    <li key={task.id} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">{task.title}</p>
                                            <div className="mt-1.5 flex gap-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    {task.priority} Priority
                                                </span>
                                            </div>
                                        </div>
                                        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-[10.5px] font-bold text-gray-600 border border-gray-200 uppercase tracking-wider shadow-sm">
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="p-10 text-center">
                                    <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-400 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-mug-hot text-2xl"></i></div>
                                    <p className="font-bold text-[14px] text-gray-500">All caught up!</p>
                                    <p className="text-[12px] text-gray-400 mt-1">No active tasks on the board.</p>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Notice Board */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center"><i className="fa-solid fa-bullhorn"></i></div>
                                Notice Board
                            </h3>
                            <Link href={route('admin.notices.index')} className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                View All &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50/80">
                            {recentNotices.length > 0 ? (
                                recentNotices.map((notice) => (
                                    <li key={notice.id} className="p-5 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-500 shadow-sm border border-purple-100">
                                            <i className="fa-regular fa-bell"></i>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800 leading-snug">{notice.title}</p>
                                            <p className="text-[11.5px] font-bold text-gray-400 mt-1 flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> {notice.date}</p>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="p-10 text-center">
                                    <div className="h-14 w-14 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-clipboard text-2xl"></i></div>
                                    <p className="font-bold text-[14px] text-gray-500">No recent notices.</p>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}
