import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout'; 
import { Head, Link } from '@inertiajs/react';

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
        totalClientDue: 35000
    },
    recentNotices = [],
    recentTasks = [],
    recentTransactions = []
}) {
    return (
        <AdminLayout>
            <div className="slider-page-wrapper p-3 sm:p-6 max-w-[1600px] mx-auto">
                <Head title="Dashboard Overview" />

                {/* --- Header --- */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#202223]">Dashboard Overview</h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Welcome back! Here is your business at a glance.</p>
                    </div>
                    <div className="self-start sm:self-auto text-xs sm:text-sm font-medium text-gray-500 bg-white px-3.5 py-2 rounded-md border shadow-sm flex items-center whitespace-nowrap">
                        <i className="fa-regular fa-calendar mr-2"></i> 
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                
                {/* --- Row 1: Accounts & Assets --- */}
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Accounts & Assets</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                    
                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Total Available Balance</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-700 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.totalBalance || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-wallet"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Cash in Hand</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.cashBalance || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-money-bill-wave"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Bank & Mobile Banking</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-teal-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.bankBalance || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Total Capital / Invest</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-indigo-700 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.totalInvestment || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-sack-dollar"></i>
                        </div>
                    </div>
                </div>

                {/* --- Row 2: Finance, Dues & Payables --- */}
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Finance, Dues & Payables</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                    
                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Monthly Revenue</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.monthlyRevenue || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-chart-line"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Monthly Expenses</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-orange-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.monthlyExpenses || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-receipt"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Client Dues (Receivable)</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.totalClientDue || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] sm:text-xs text-rose-500 font-semibold mt-0.5">{stats.unpaidInvoices} Unpaid Invoices</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-file-invoice-dollar"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Vendor Dues (Payable)</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-rose-600 truncate">
                                <span className="text-xs sm:text-sm font-semibold mr-1">TK.</span>
                                {(stats.totalProjectDue || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">To be paid</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-hand-holding-dollar"></i>
                        </div>
                    </div>
                </div>

                {/* --- Row 3: Operations & HR --- */}
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Operations & HR</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Active Projects</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-[#202223]">{stats.activeProjects}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-layer-group"></i>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Total Clients</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-[#202223]">{stats.totalClients}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-users-line"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Present Today</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-[#202223]">
                                {stats.presentToday} <span className="text-xs sm:text-sm font-normal text-gray-400">/ {stats.totalEmployees}</span>
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-user-check"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-lg border shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm text-gray-500 font-medium truncate">Requisitions</h3>
                            <p className="text-xl sm:text-2xl font-bold mt-1 text-[#202223]">
                                {stats.pendingRequisitions} <span className="text-xs sm:text-sm font-normal text-yellow-600">Pending</span>
                            </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            <i className="fa-solid fa-clipboard-list"></i>
                        </div>
                    </div>
                </div>

                {/* --- Section 4: Lists & Activity --- */}
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activities</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Recent Transactions Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden">
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-sm sm:text-base text-[#202223]">
                                <i className="fa-solid fa-arrow-right-arrow-left text-gray-400 mr-2"></i> Recent Transactions
                            </h3>
                            <Link href={route('admin.transactions.index')} className="text-xs sm:text-sm text-blue-600 hover:underline font-medium">View Ledger</Link>
                        </div>
                        
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Date</th>
                                        <th className="px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Account</th>
                                        <th className="px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                                        <th className="px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right whitespace-nowrap">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map(trx => (
                                            <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{trx.transaction_date}</td>
                                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-800 whitespace-nowrap">{trx.account?.name || '-'}</td>
                                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 truncate max-w-[150px] sm:max-w-[250px]">{trx.description}</td>
                                                <td className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-right whitespace-nowrap ${trx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {trx.type === 'credit' ? '+' : '-'}TK. {parseFloat(trx.amount).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">No recent transactions found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Tasks & Notices Stacked */}
                    <div className="flex flex-col gap-6">
                        
                        {/* Recent Tasks */}
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-sm sm:text-base text-[#202223]">
                                    <i className="fa-solid fa-list-check text-gray-400 mr-2"></i> Recent Tasks
                                </h3>
                                <Link href={route('admin.tasks.index')} className="text-xs sm:text-sm text-blue-600 hover:underline font-medium">View All</Link>
                            </div>
                            <div className="p-0">
                                <ul className="divide-y divide-gray-100">
                                    {recentTasks.map(task => (
                                        <li key={task.id} className="p-3.5 sm:p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-xs sm:text-sm text-gray-800 truncate">{task.title}</p>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-1 inline-block ${task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {task.priority} Priority
                                                </span>
                                            </div>
                                            <span className="self-start sm:self-auto text-[11px] sm:text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                                                {task.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </li>
                                    ))}
                                    {recentTasks.length === 0 && <li className="p-4 text-xs sm:text-sm text-gray-500 text-center">No recent tasks.</li>}
                                </ul>
                            </div>
                        </div>

                        {/* Notice Board */}
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-sm sm:text-base text-[#202223]">
                                    <i className="fa-solid fa-bullhorn text-gray-400 mr-2"></i> Notice Board
                                </h3>
                                <Link href={route('admin.notices.index')} className="text-xs sm:text-sm text-blue-600 hover:underline font-medium">View All</Link>
                            </div>
                            <div className="p-0">
                                <ul className="divide-y divide-gray-100">
                                    {recentNotices.map(notice => (
                                        <li key={notice.id} className="p-3.5 sm:p-4 hover:bg-gray-50">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                                <p className="font-semibold text-xs sm:text-sm text-blue-800 break-words">{notice.title}</p>
                                                <span className="text-[11px] sm:text-xs text-gray-400 whitespace-nowrap shrink-0">{notice.date}</span>
                                            </div>
                                        </li>
                                    ))}
                                    {recentNotices.length === 0 && <li className="p-4 text-xs sm:text-sm text-gray-500 text-center">No active notices.</li>}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}