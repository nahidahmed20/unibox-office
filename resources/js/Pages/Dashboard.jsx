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
        totalRevenue: 24500,
        monthlyExpenses: 3200,
        pendingLeaves: 3,
        pendingRequisitions: 4,
        totalInvestment: 500000, 
        totalClients: 18         
    },
    recentNotices = [
        { id: 1, title: 'Office closed on upcoming Sunday for maintenance', date: '2026-07-02' },
        { id: 2, title: 'Submit your tax rebate documents', date: '2026-07-01' },
    ],
    recentTasks = [
        { id: 1, title: 'Fix login issue', priority: 'high', status: 'todo' },
        { id: 2, title: 'Prepare monthly invoice', priority: 'medium', status: 'in_progress' },
    ]
}) {
    return (
        <AdminLayout>
            <div className="slider-page-wrapper">
                <Head title="Dashboard Overview" />

                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-[#202223]">Dashboard Overview</h1>
                        <p className="text-gray-500 text-sm mt-1">Welcome back! Here is what's happening today.</p>
                    </div>
                    <div className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-md border shadow-sm">
                        <i className="fa-regular fa-calendar mr-2"></i> 
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                
                {/* --- Section 1: Finance & Investments --- */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Finance & Capital</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Total Capital / Invest</h3>
                            <p className="text-2xl font-bold mt-1 text-teal-700">
                                <span className="text-sm font-semibold mr-1">BDT</span>
                                {stats.totalInvestment.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Monthly Revenue</h3>
                            <p className="text-2xl font-bold mt-1 text-green-700">
                                <span className="text-sm font-semibold mr-1">BDT</span>
                                {stats.totalRevenue.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-sack-dollar"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Monthly Expenses</h3>
                            <p className="text-2xl font-bold mt-1 text-red-600">
                                <span className="text-sm font-semibold mr-1">BDT</span>
                                {stats.monthlyExpenses.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-receipt"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Unpaid Invoices</h3>
                            <p className="text-2xl font-bold mt-1 text-rose-600">{stats.unpaidInvoices}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-file-invoice-dollar"></i>
                        </div>
                    </div>
                </div>

                {/* --- Section 2: CRM & Projects --- */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">CRM & Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Total Clients</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">{stats.totalClients}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-users-line"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Active Projects</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">{stats.activeProjects}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-layer-group"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Pending Tasks</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">{stats.pendingTasks}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-list-check"></i>
                        </div>
                    </div>
                </div>

                {/* --- Section 3: HR & Operations --- */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">HR & Operations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Present Today</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">
                                {stats.presentToday} <span className="text-sm font-normal text-gray-400">/ {stats.totalEmployees}</span>
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-user-check"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Leave Requests</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">
                                {stats.pendingLeaves} <span className="text-sm font-normal text-yellow-600">Pending</span>
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-calendar-minus"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-sm text-gray-500 font-medium">Requisitions</h3>
                            <p className="text-2xl font-bold mt-1 text-[#202223]">
                                {stats.pendingRequisitions} <span className="text-sm font-normal text-yellow-600">Pending</span>
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-clipboard-list"></i>
                        </div>
                    </div>
                </div>

                {/* --- Section 4: Lists & Activity --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Recent Tasks */}
                    <div className="bg-white rounded-lg border shadow-sm">
                        <div className="px-5 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-[#202223]"><i className="fa-solid fa-list-check text-gray-400 mr-2"></i> Recent Tasks</h3>
                            <Link href={route('admin.tasks.index')} className="text-sm text-blue-600 hover:underline">View All</Link>
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-gray-100">
                                {recentTasks.map(task => (
                                    <li key={task.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{task.title}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-1 inline-block ${task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {task.priority} Priority
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {task.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </li>
                                ))}
                                {recentTasks.length === 0 && <li className="p-4 text-sm text-gray-500 text-center">No recent tasks.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Notice Board */}
                    <div className="bg-white rounded-lg border shadow-sm">
                        <div className="px-5 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-[#202223]"><i className="fa-solid fa-bullhorn text-gray-400 mr-2"></i> Notice Board</h3>
                            <Link href={route('admin.notices.index')} className="text-sm text-blue-600 hover:underline">View All</Link>
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-gray-100">
                                {recentNotices.map(notice => (
                                    <li key={notice.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-sm text-blue-800">{notice.title}</p>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{notice.date}</span>
                                        </div>
                                    </li>
                                ))}
                                {recentNotices.length === 0 && <li className="p-4 text-sm text-gray-500 text-center">No active notices.</li>}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}