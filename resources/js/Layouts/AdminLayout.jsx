import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function AdminLayout({ children }) {
    const { auth, flash = {} } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);
    
    // Grouped Menu States dynamically checking active routes
    const [openMenus, setOpenMenus] = useState({
        crm: route().current('admin.clients.*') || route().current('admin.projects.*') || route().current('admin.tasks.*') || route().current('admin.vendors.*'),
        hr: route().current('admin.employees.*') || route().current('admin.attendances.*') || route().current('admin.salaries.*') || route().current('admin.leaves.*') || route().current('admin.departments.*') || route().current('admin.designations.*'),
        finance: route().current('admin.invoices.*') || route().current('admin.expenses.*') || route().current('admin.expense-categories.*') || route().current('admin.investments.*') || route().current('admin.advances.*') || route().current('admin.client-advances.*') || route().current('admin.accounts.*') || route().current('admin.transactions.*') || route().current('invoice-payments.*') || route().current('admin.client-dues') || route().current('admin.vendor-dues'),
        projectExpense: route().current('admin.project-expenses.*'),
        office: route().current('admin.assets.*') || route().current('admin.requisitions.*') || route().current('admin.notices.*'), 
        access: route().current('admin.users.*') || route().current('admin.roles.*') || route().current('admin.permissions.*')
    });

    const toggleMenu = (menuName) => {
        setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex min-h-screen bg-[#f6f6f7] text-[#202223] antialiased font-sans">
            
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <nav className={`w-[260px] bg-[#010e22] text-[#e3e4e5] min-h-screen fixed z-50 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                
                <div className="relative flex items-center justify-center h-16 px-6 bg-[#010e22] border-b border-slate-700 shrink-0">
                    <Link href={route('dashboard')} className="flex items-center gap-3">
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="h-10 w-auto object-contain"/>
                    </Link>

                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute right-4 md:hidden flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
                
                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    <ul className="list-none p-0 m-0 space-y-1">
                        
                        <div className="text-[11px] uppercase tracking-[1px] text-[#8c9196] px-[25px] pt-[10px] pb-[5px] font-semibold">Main</div>
                        
                        <li className="mx-3">
                            <Link
                                href={route('dashboard')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    route().current('dashboard')
                                        ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg'
                                        : 'text-slate-400 hover:bg-[#091A33] hover:text-white'
                                }`}
                            >
                                <i className="fa-solid fa-chart-bar w-5 text-center"></i>
                                <span>Dashboard</span>
                            </Link>
                        </li>

                        {/* 1. CRM & Projects */}
                        <li className="mx-3 mt-1">
                            <button onClick={() => toggleMenu('crm')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.crm ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-briefcase w-6 text-left opacity-80"></i> CRM & Projects
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.crm ? 'rotate-90' : ''}`}></i>
                            </button>
                            {openMenus.crm && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    <li>
                                        <Link href={route('admin.clients.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.clients.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-users-line mr-2 text-[10px]"></i> Clients
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.projects.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.projects.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-layer-group mr-2 text-[10px]"></i> Projects
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.vendors.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.vendors.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-truck-field mr-2 text-[10px]"></i> Vendors
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.tasks.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.tasks.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-list-check mr-2 text-[10px]"></i> Tasks
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* Project Expense */}
                        <li className="mx-3 mt-1">
                            <button onClick={() => toggleMenu('projectExpense')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.projectExpense ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-wallet w-6 text-left opacity-80"></i> Project Expense
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.projectExpense ? 'rotate-90' : ''}`}></i>
                            </button>

                            {openMenus.projectExpense && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    <li>
                                        <Link href={route('admin.project-expenses.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.project-expenses.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-money-check-dollar mr-2 text-[10px]"></i> Project Expenses
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* 3. Finance & Accounts */}
                        <li className="mx-3 mt-1">
                            <button onClick={() => toggleMenu('finance')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.finance ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-file-invoice-dollar w-6 text-left opacity-80"></i> Finance & Accounts
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.finance ? 'rotate-90' : ''}`}></i>
                            </button>
                            
                            {openMenus.finance && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    
                                    {/* 1. Core Accounts & Ledger */}
                                    <li>
                                        <Link href={route('admin.accounts.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.accounts.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-vault mr-2 text-[10px]"></i> Accounts & Balances
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.transactions.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.transactions.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-money-bill-transfer mr-2 text-[10px]"></i> Transactions List
                                        </Link>
                                    </li>

                                    {/* 2. Income & Receivables (AR) */}
                                    <li>
                                        <Link href={route('admin.invoices.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.invoices.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-file-invoice mr-2 text-[10px]"></i> Invoices
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('invoice-payments.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('invoice-payments.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-money-bill-wave mr-2 text-[10px]"></i> Receive Payments
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.client-advances.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.client-advances.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-sack-dollar mr-2 text-[10px]"></i> Client Advances
                                        </Link>
                                    </li>

                                    {/* 3. Payables & Expenses (AP) */}
                                    <li>
                                        <Link href={route('admin.expenses.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.expenses.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-receipt mr-2 text-[10px]"></i> Expenses
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.expense-categories.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.expense-categories.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-tags mr-2 text-[10px]"></i> Categories
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.advances.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.advances.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-hand-holding-dollar mr-2 text-[10px]"></i> Staff Advances
                                        </Link>
                                    </li>

                                    {/* 4. Other Assets */}
                                    <li>
                                        <Link href={route('admin.investments.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.investments.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-building-columns mr-2 text-[10px]"></i> Investments
                                        </Link>
                                    </li>

                                    {/* 5. Reports & Summaries */}
                                    <li>
                                        <Link href={route('admin.client-dues')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.client-dues') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-file-invoice-dollar mr-2 text-[10px]"></i> Client Dues Report
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.vendor-dues')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.vendor-dues') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-hand-holding-dollar mr-2 text-[10px]"></i> Vendor Dues Report
                                        </Link>
                                    </li>
                                    
                                </ul>
                            )}
                        </li>
                        {/* 2. HR & Payroll */}
                        <li className="mx-3 mt-1">
                            <button onClick={() => toggleMenu('hr')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.hr ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-users-gear w-6 text-left opacity-80"></i> HR & Payroll
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.hr ? 'rotate-90' : ''}`}></i>
                            </button>
                            {openMenus.hr && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    <li>
                                        <Link href={route('admin.employees.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.employees.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-id-card mr-2 text-[10px]"></i> Employees
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.attendances.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.attendances.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-clock-rotate-left mr-2 text-[10px]"></i> Attendance
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.salaries.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.salaries.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-money-check-dollar mr-2 text-[10px]"></i> Payroll / Salary
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.leaves.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.leaves.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-calendar-minus mr-2 text-[10px]"></i> Leave Applications
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.departments.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.departments.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-building-user mr-2 text-[10px]"></i> Departments
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.designations.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.designations.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-user-tie mr-2 text-[10px]"></i> Designations
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* 4. Office Administration */}
                        <li className="mx-3 mt-1">
                            <button onClick={() => toggleMenu('office')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.office ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-building w-6 text-left opacity-80"></i> Office Admin
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.office ? 'rotate-90' : ''}`}></i>
                            </button>
                            {openMenus.office && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    <li>
                                        <Link href={route('admin.assets.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.assets.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-boxes-stacked mr-2 text-[10px]"></i> Assets
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.requisitions.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.requisitions.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-clipboard-list mr-2 text-[10px]"></i> Requisitions
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.notices.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.notices.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-bullhorn mr-2 text-[10px]"></i> Notices
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* 5. System Security */}
                        <div className="text-[11px] uppercase tracking-[1px] text-[#8c9196] px-[25px] pt-[20px] pb-[5px] font-semibold">Settings</div>
                        
                        <li className="mx-3">
                            <button onClick={() => toggleMenu('access')} className={`w-full flex items-center px-4 py-2.5 text-[14px] rounded-md font-medium transition-colors ${openMenus.access ? 'text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                                <i className="fa-solid fa-user-shield w-6 text-left opacity-80"></i> Access Control
                                <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.access ? 'rotate-90' : ''}`}></i>
                            </button>
                            {openMenus.access && (
                                <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-2 space-y-1 px-2">
                                    <li>
                                        <Link href={route('admin.users.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.users.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-users mr-2 text-[10px]"></i> Users
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.roles.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.roles.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-user-tag mr-2 text-[10px]"></i> Roles
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('admin.permissions.index')} className={`flex items-center pl-10 pr-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${route().current('admin.permissions.*') ? 'bg-[#0F2748] text-[#60A5FA] border-l-4 border-[#3B82F6] shadow-lg' : 'text-[#a1a5a8] hover:bg-[#091A33] hover:text-white'}`}>
                                            <i className="fa-solid fa-key mr-2 text-[10px]"></i> Permissions
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                    </ul>
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-[260px] w-full min-h-screen flex flex-col transition-all duration-300">
                
                {/* Navbar */}
                <div className="bg-white border-b border-[#e1e3e5] px-6 py-0 h-[65px] flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 border border-[#e1e3e5] rounded-md md:hidden text-gray-700 hover:bg-gray-100 mr-4 transition-colors">
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <div className="text-gray-600 text-[15px] font-medium hidden sm:block">Admin Portal</div>
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button onClick={() => setProfileDropdown(!profileDropdown)} className="flex items-center px-3 py-1.5 bg-gray-50 border border-[#e1e3e5] rounded-md hover:bg-gray-100 transition-colors">
                            <i className="fa-regular fa-circle-user text-xl mr-2 text-gray-500"></i>
                            <span className="font-medium text-[14px] text-gray-800 mr-1">{auth?.user?.name || "Admin User"}</span>
                            <i className="fa-solid fa-angle-down text-[11px] text-gray-500"></i>
                        </button>
                        
                        {profileDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)}></div>
                                
                                <div className="absolute right-0 mt-2 w-[200px] bg-white border border-[#e1e3e5] rounded-lg shadow-lg p-1.5 z-50">
                                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                                        <p className="text-[12px] text-gray-500 font-medium">Signed in as</p>
                                        <p className="text-[13px] font-semibold text-gray-800 truncate">{auth?.user?.email || "admin@example.com"}</p>
                                    </div>
                                    
                                    <Link href={route('profile.edit')} className="flex items-center px-3 py-2 text-[13.5px] font-medium rounded-md text-[#202223] hover:bg-[#f6f6f7] transition-colors">
                                        <i className="fa-regular fa-user w-5 text-gray-500 mr-1"></i> My Profile
                                    </Link>
                
                                    <Link href={route('logout')} method="post" as="button" className="w-full flex items-center px-3 py-2 text-[13.5px] font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors mt-1">
                                        <i className="fa-solid fa-arrow-right-from-bracket w-5 mr-1"></i> Log out
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Page Content Container */}
                <main className="flex-1 ">
                    {children}
                </main>
            </div>
        </div>
    );
}