import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

/* ---------------------------------------------------------------- */
/*  Polished Presentational Helpers                                 */
/* ---------------------------------------------------------------- */

const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-3 px-4 pb-2 pt-6 first:pt-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#78829D]">{children}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
    </div>
);

const GroupLabel = ({ children }) => (
    <div className="flex items-center gap-2 px-4 pb-1.5 pt-4 first:pt-1">
        <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-[var(--accent)]/60 shadow-[0_0_4px_var(--accent)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#636C84]">{children}</span>
    </div>
);

const SubMenu = ({ children }) => (
    <ul className="mb-2 mt-1 list-none space-y-0.5 rounded-xl bg-black/20 px-2 py-2 ring-1 ring-white/[0.02]">
        {children}
    </ul>
);

const topItemClass = (active) =>
    `group flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent-bg)] text-[var(--accent-bright)] shadow-[inset_3px_0_0_0_var(--accent)]'
            : 'text-[#A0ABC0] hover:bg-white/[0.04] hover:text-white'
    }`;

const groupToggleClass = (open, isActive) =>
    `group flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        open || isActive 
            ? 'bg-white/[0.03] text-white' 
            : 'text-[#A0ABC0] hover:bg-white/[0.04] hover:text-white'
    }`;

const subItemClass = (active) =>
    `flex items-center gap-3 rounded-lg py-2 pl-6 pr-3 text-[13px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent)]/10 text-[var(--accent-bright)] shadow-[inset_2px_0_0_0_var(--accent)]'
            : 'text-[#858D9D] hover:bg-white/[0.04] hover:text-[#DDE1EA] hover:translate-x-1'
    }`;

const chevronClass = (open) =>
    `fa-solid fa-chevron-right ml-auto text-[10px] transition-transform duration-300 ${
        open ? 'rotate-90 text-[var(--accent)]' : 'text-[#5C6478] group-hover:text-[#A0ABC0]'
    }`;

const groupIconClass = (open, isActive) => 
    `fa-solid w-5 text-center text-[16px] transition-colors duration-300 ${
        open || isActive ? 'text-[var(--accent)]' : 'opacity-70 group-hover:text-[var(--accent)] group-hover:opacity-100'
    }`;

export default function AdminLayout({ children }) {
    const { auth, flash = {} } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);

    // --- Access Control Logic ---
    const userRoles = auth?.roles || [];
    const userPermissions = auth?.permissions || [];
    const isSuperAdmin = userRoles.includes('Super Admin') || userRoles.includes('super-admin');

    const hasPermission = (permission) => {
        if (isSuperAdmin) return true;
        return userPermissions.includes(permission);
    };

    // রাউটগুলোকে লজিক্যাল মডিউলে ভাগ করা হয়েছে
    const activeRoutes = {
        hr: route().current('admin.departments.*') || route().current('admin.designations.*') || route().current('admin.employees.*') || route().current('admin.attendances.*') || route().current('admin.leaves.*') || route().current('admin.salaries.*'),
        crm: route().current('admin.clients.*') || route().current('admin.projects.*') || route().current('admin.tasks.*') || route().current('admin.vendors.*'),
        finance: route().current('admin.project-expenses.*') || route().current('admin.accounts.*') || route().current('admin.transactions.*') || route().current('admin.investments.*') || route().current('admin.invoices.*') || route().current('invoice-payments.*') || route().current('admin.client-advances.*') || route().current('admin.expenses.*') || route().current('admin.expense-categories.*') || route().current('admin.advances.*'),
        office: route().current('admin.assets.*') || route().current('admin.requisitions.*') || route().current('admin.notices.*'),
        report: route().current('admin.reports.*') || route().current('admin.account.transactions') || route().current('admin.client-dues') || route().current('admin.vendor-dues'),
        access: route().current('admin.users.*') || route().current('admin.roles.*') || route().current('admin.permissions.*'),
    };

    const [openMenus, setOpenMenus] = useState(activeRoutes);

    const toggleMenu = (menuName) => {
        setOpenMenus((prev) => {
            return Object.keys(prev).reduce((acc, key) => {
                acc[key] = key === menuName ? !prev[menuName] : false;
                return acc;
            }, {});
        });
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

    const displayName = auth?.user?.name || 'Admin';
    const initials = displayName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div
            className="min-h-screen bg-[#f4f5f7] font-sans text-[#202223] antialiased"
            style={{
                '--accent': '#C89B3C',
                '--accent-bright': '#E7C572',
                '--accent-bg': 'rgba(200, 155, 60, 0.12)',
                '--ink-elevated': '#0A0E1A',
                '--text-bright': '#FFFFFF',
            }}
        >
            <style>{`
                .brass-scroll::-webkit-scrollbar { width: 5px; }
                .brass-scroll::-webkit-scrollbar-track { background: transparent; }
                .brass-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .brass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(200,155,60,0.5); }
                @media (prefers-reduced-motion: reduce) {
                    .brass-scroll * { transition: none !important; animation: none !important; }
                }
            `}</style>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <nav
                className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#070b15] text-[#C7CCD9] shadow-2xl transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#070b15] px-5 md:justify-center">
                    <Link href={route('dashboard')} className="flex items-center gap-3 transition-transform hover:scale-105">
                        <img src="/images/logo.png" alt="Logo" className="h-9 w-auto object-contain drop-shadow-md" />
                    </Link>

                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-white md:hidden"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="brass-scroll flex-1 overflow-y-auto py-4">
                    <ul className="m-0 list-none space-y-1.5 p-0">
                        
                        <SectionLabel>Overview</SectionLabel>
                        <li className="mx-3 mb-4">
                            <Link href={route('dashboard')} className={topItemClass(route().current('dashboard'))}>
                                <i className="fa-solid fa-chart-pie w-5 text-center text-[16px]"></i>
                                <span>Dashboard</span>
                            </Link>
                        </li>

                        <SectionLabel>Workspace Modules</SectionLabel>

                        

                        {/* 2. CRM & Projects (Operations) */}
                        {hasPermission('view_crm') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('crm')}
                                    aria-expanded={openMenus.crm}
                                    className={groupToggleClass(openMenus.crm, activeRoutes.crm)}
                                >
                                    <i className={groupIconClass(openMenus.crm, activeRoutes.crm) + ' fa-layer-group'}></i>
                                    CRM & Projects
                                    <i className={chevronClass(openMenus.crm)}></i>
                                </button>

                                {openMenus.crm && (
                                    <SubMenu>
                                        <li><Link href={route('admin.clients.index')} className={subItemClass(route().current('admin.clients.*'))}><i className="fa-solid fa-users-line text-[11px] opacity-80"></i> Clients</Link></li>
                                        <li><Link href={route('admin.vendors.index')} className={subItemClass(route().current('admin.vendors.*'))}><i className="fa-solid fa-truck-field text-[11px] opacity-80"></i> Vendors</Link></li>
                                        <li><Link href={route('admin.projects.index')} className={subItemClass(route().current('admin.projects.*'))}><i className="fa-solid fa-rocket text-[11px] opacity-80"></i> Projects</Link></li>
                                        <li><Link href={route('admin.tasks.index')} className={subItemClass(route().current('admin.tasks.*'))}><i className="fa-solid fa-list-check text-[11px] opacity-80"></i> Tasks</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 3. Finance & Accounts */}
                        {hasPermission('view_finance') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('finance')}
                                    aria-expanded={openMenus.finance}
                                    className={groupToggleClass(openMenus.finance, activeRoutes.finance)}
                                >
                                    <i className={groupIconClass(openMenus.finance, activeRoutes.finance) + ' fa-wallet'}></i>
                                    Finance & Accounts
                                    <i className={chevronClass(openMenus.finance)}></i>
                                </button>

                                {openMenus.finance && (
                                    <SubMenu>
                                        <GroupLabel>Accounts & Banking</GroupLabel>
                                        <li><Link href={route('admin.accounts.index')} className={subItemClass(route().current('admin.accounts.*'))}><i className="fa-solid fa-building-columns text-[11px] opacity-80"></i> Accounts Balance</Link></li>
                                        <li><Link href={route('admin.transactions.index')} className={subItemClass(route().current('admin.transactions.*'))}><i className="fa-solid fa-money-bill-transfer text-[11px] opacity-80"></i> Transactions</Link></li>
                                        <li><Link href={route('admin.investments.index')} className={subItemClass(route().current('admin.investments.*'))}><i className="fa-solid fa-arrow-trend-up text-[11px] opacity-80"></i> Investments</Link></li>

                                        <GroupLabel>Income & Receivables</GroupLabel>
                                        <li><Link href={route('admin.invoices.index')} className={subItemClass(route().current('admin.invoices.*'))}><i className="fa-solid fa-file-invoice text-[11px] opacity-80"></i> Invoices</Link></li>
                                        <li><Link href={route('invoice-payments.index')} className={subItemClass(route().current('invoice-payments.*'))}><i className="fa-solid fa-hand-holding-dollar text-[11px] opacity-80"></i> Receive Payments</Link></li>
                                        <li><Link href={route('admin.client-advances.index')} className={subItemClass(route().current('admin.client-advances.*'))}><i className="fa-solid fa-sack-dollar text-[11px] opacity-80"></i> Client Advances</Link></li>

                                        <GroupLabel>Expenses & Payables</GroupLabel>
                                        {hasPermission('view_project_expenses') && (
                                            <li><Link href={route('admin.project-expenses.index')} className={subItemClass(route().current('admin.project-expenses.*'))}><i className="fa-solid fa-file-invoice-dollar text-[11px] opacity-80"></i> Project Expenses</Link></li>
                                        )}
                                        <li><Link href={route('admin.expenses.index')} className={subItemClass(route().current('admin.expenses.*'))}><i className="fa-solid fa-receipt text-[11px] opacity-80"></i> Office Expenses</Link></li>
                                        <li><Link href={route('admin.expense-categories.index')} className={subItemClass(route().current('admin.expense-categories.*'))}><i className="fa-solid fa-tags text-[11px] opacity-80"></i> Expense Categories</Link></li>
                                        <li><Link href={route('admin.advances.index')} className={subItemClass(route().current('admin.advances.*'))}><i className="fa-solid fa-handshake-angle text-[11px] opacity-80"></i> Staff Advances</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 4. Office Administration */}
                        {hasPermission('view_office') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('office')}
                                    aria-expanded={openMenus.office}
                                    className={groupToggleClass(openMenus.office, activeRoutes.office)}
                                >
                                    <i className={groupIconClass(openMenus.office, activeRoutes.office) + ' fa-building'}></i>
                                    Office Admin
                                    <i className={chevronClass(openMenus.office)}></i>
                                </button>
                                {openMenus.office && (
                                    <SubMenu>
                                        <li><Link href={route('admin.assets.index')} className={subItemClass(route().current('admin.assets.*'))}><i className="fa-solid fa-boxes-stacked text-[11px] opacity-80"></i> Assets</Link></li>
                                        <li><Link href={route('admin.requisitions.index')} className={subItemClass(route().current('admin.requisitions.*'))}><i className="fa-solid fa-clipboard-list text-[11px] opacity-80"></i> Requisitions</Link></li>
                                        <li><Link href={route('admin.notices.index')} className={subItemClass(route().current('admin.notices.*'))}><i className="fa-solid fa-bullhorn text-[11px] opacity-80"></i> Notices</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 1. HR & Payroll (People first) */}
                        {hasPermission('view_hr') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('hr')}
                                    aria-expanded={openMenus.hr}
                                    className={groupToggleClass(openMenus.hr, activeRoutes.hr)}
                                >
                                    <i className={groupIconClass(openMenus.hr, activeRoutes.hr) + ' fa-users-viewfinder'}></i>
                                    HR & Payroll
                                    <i className={chevronClass(openMenus.hr)}></i>
                                </button>
                                {openMenus.hr && (
                                    <SubMenu>
                                        <li><Link href={route('admin.departments.index')} className={subItemClass(route().current('admin.departments.*'))}><i className="fa-solid fa-building-user text-[11px] opacity-80"></i> Departments</Link></li>
                                        <li><Link href={route('admin.designations.index')} className={subItemClass(route().current('admin.designations.*'))}><i className="fa-solid fa-user-tie text-[11px] opacity-80"></i> Designations</Link></li>
                                        <li><Link href={route('admin.employees.index')} className={subItemClass(route().current('admin.employees.*'))}><i className="fa-solid fa-id-badge text-[11px] opacity-80"></i> Employees</Link></li>
                                        <li><Link href={route('admin.attendances.index')} className={subItemClass(route().current('admin.attendances.*'))}><i className="fa-solid fa-clock-rotate-left text-[11px] opacity-80"></i> Attendance</Link></li>
                                        <li><Link href={route('admin.leaves.index')} className={subItemClass(route().current('admin.leaves.*'))}><i className="fa-solid fa-calendar-minus text-[11px] opacity-80"></i> Leaves</Link></li>
                                        <li><Link href={route('admin.salaries.index')} className={subItemClass(route().current('admin.salaries.*'))}><i className="fa-solid fa-money-check-dollar text-[11px] opacity-80"></i> Payroll</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 5. Reports */}
                        {hasPermission('view_report') && (
                            <li className="mx-3 mt-1 mb-2">
                                <button
                                    onClick={() => toggleMenu('report')}
                                    aria-expanded={openMenus.report}
                                    className={groupToggleClass(openMenus.report, activeRoutes.report)}
                                >
                                    <i className={groupIconClass(openMenus.report, activeRoutes.report) + ' fa-chart-line'}></i>
                                    Reports & Analytics
                                    <i className={chevronClass(openMenus.report)}></i>
                                </button>
                                {openMenus.report && (
                                    <SubMenu>
                                        <li><Link href={route('admin.reports.financial')} className={subItemClass(route().current('admin.reports.financial'))}><i className="fa-solid fa-chart-area text-[11px] opacity-80"></i> Financial Report</Link></li>
                                        <li><Link href={route('admin.account.transactions')} className={subItemClass(route().current('admin.account.transactions'))}><i className="fa-solid fa-money-check text-[11px] opacity-80"></i> Transaction Report</Link></li>
                                        <li><Link href={route('admin.reports.client-ledger')} className={subItemClass(route().current('admin.reports.client-ledger'))}><i className="fa-solid fa-book-journal-whills text-[11px] opacity-80"></i> Client Ledger</Link></li>
                                        <li><Link href={route('admin.client-dues')} className={subItemClass(route().current('admin.client-dues'))}><i className="fa-solid fa-file-invoice-dollar text-[11px] opacity-80"></i> Client Dues (পাওনা)</Link></li>
                                        <li><Link href={route('admin.vendor-dues')} className={subItemClass(route().current('admin.vendor-dues'))}><i className="fa-solid fa-clock-rotate-left text-[11px] opacity-80"></i> Vendor Dues (দেনা)</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* --- SETTINGS --- */}
                        {hasPermission('view_settings') && (
                            <>
                                <SectionLabel>System Configuration</SectionLabel>
                                <li className="mx-3 mb-6">
                                    <button
                                        onClick={() => toggleMenu('access')}
                                        aria-expanded={openMenus.access}
                                        className={groupToggleClass(openMenus.access, activeRoutes.access)}
                                    >
                                        <i className={groupIconClass(openMenus.access, activeRoutes.access) + ' fa-user-shield'}></i>
                                        Access Control
                                        <i className={chevronClass(openMenus.access)}></i>
                                    </button>
                                    {openMenus.access && (
                                        <SubMenu>
                                            <li><Link href={route('admin.users.index')} className={subItemClass(route().current('admin.users.*'))}><i className="fa-solid fa-users text-[11px] opacity-80"></i> Users</Link></li>
                                            <li><Link href={route('admin.roles.index')} className={subItemClass(route().current('admin.roles.*'))}><i className="fa-solid fa-user-tag text-[11px] opacity-80"></i> Roles</Link></li>
                                            <li><Link href={route('admin.permissions.index')} className={subItemClass(route().current('admin.permissions.*'))}><i className="fa-solid fa-key text-[11px] opacity-80"></i> Permissions</Link></li>
                                        </SubMenu>
                                    )}
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </nav>

            <div className="flex min-h-screen flex-col transition-all duration-300 md:ml-[270px]">
                {/* Navbar */}
                <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between border-b border-[#e1e3e5] bg-white px-4 shadow-sm sm:px-6">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open menu"
                            className="mr-3 rounded-lg border border-[#e1e3e5] bg-gray-50 p-2 text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
                        >
                            <i className="fa-solid fa-bars text-lg"></i>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setProfileDropdown(!profileDropdown)}
                                className="flex items-center gap-2 rounded-full outline-none transition-shadow hover:ring-2 hover:ring-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent)]/50 focus-visible:ring-offset-2"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white shadow-sm">
                                    {initials}
                                </div>
                                <span className="hidden text-sm font-semibold text-gray-700 sm:block">
                                    {displayName}
                                </span>
                                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-300 ${profileDropdown ? 'rotate-180' : ''}`}></i>
                            </button>

                            {profileDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)}></div>
                                    <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                            <p className="text-xs text-gray-500 truncate">{auth?.user?.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link href={route('profile.edit')} className="flex items-center px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
                                                <i className="fa-regular fa-user mr-2.5 w-4 text-center"></i> My Profile
                                            </Link>
                                            <Link href={route('logout')} method="post" as="button" className="flex w-full items-center px-4 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors">
                                                <i className="fa-solid fa-arrow-right-from-bracket mr-2.5 w-4 text-center"></i> Sign Out
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 md:p-8">
                    {flash?.success && (
                        <div className="mb-6 flex items-center rounded-lg border border-green-200 bg-green-50 p-4 text-[14px] font-medium text-green-700 shadow-sm animate-fade-in-down">
                            <i className="fa-solid fa-circle-check mr-2.5 text-lg"></i>
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 flex items-center rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] font-medium text-red-700 shadow-sm animate-fade-in-down">
                            <i className="fa-solid fa-circle-xmark mr-2.5 text-lg"></i>
                            {flash.error}
                        </div>
                    )}
                    
                    {children}
                </main>
            </div>
        </div>
    );
}