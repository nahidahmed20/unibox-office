import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

/* ---------------------------------------------------------------- */
/*  Small presentational helpers                                    */
/* ---------------------------------------------------------------- */

const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-2 px-[22px] pb-2 pt-5 first:pt-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#4E5771]">{children}</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
    </div>
);

const GroupLabel = ({ children }) => (
    <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 first:pt-1">
        <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]/70" />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">{children}</span>
    </div>
);

const SubMenu = ({ children }) => (
    <ul className="mb-2 mt-1 list-none space-y-0.5 rounded-xl bg-[var(--ink-elevated)] px-2 py-2 ring-1 ring-white/[0.04]">
        {children}
    </ul>
);

const topItemClass = (active) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent-bg)] text-[var(--accent-bright)]'
            : 'text-[#9AA2B4] hover:bg-white/[0.05] hover:text-[#E7E9EF]'
    }`;

// আপডেট: এখানে active চেক যোগ করা হয়েছে
const groupToggleClass = (open, isActive) =>
    `flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        open || isActive ? 'text-[var(--text-bright)]' : 'text-[#9AA2B4] hover:bg-white/[0.05] hover:text-[#E7E9EF]'
    }`;

const subItemClass = (active) =>
    `flex items-center gap-2.5 rounded-md py-2 pl-4 pr-3 text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent-bg)] text-[var(--accent-bright)] shadow-[inset_2px_0_0_0_var(--accent)]'
            : 'text-[#8B93A7] hover:bg-white/[0.05] hover:text-[#DDE1EA]'
    }`;

const chevronClass = (open) =>
    `fa-solid fa-chevron-right ml-auto text-[10px] transition-transform duration-200 ${
        open ? 'rotate-90 text-[var(--accent)]' : 'text-[#5C6478]'
    }`;

// আপডেট: এখানে active চেক যোগ করা হয়েছে
const groupIconClass = (open, isActive) => 
    `fa-solid w-5 text-center text-[14px] ${open || isActive ? 'text-[var(--accent)]' : 'opacity-70'}`;

export default function AdminLayout({ children }) {
    const { auth, flash = {} } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);

    // --- Access Control Logic (Spatie) ---
    const userRoles = auth?.roles || [];
    const userPermissions = auth?.permissions || [];
    const isSuperAdmin = userRoles.includes('Super Admin');

    const hasPermission = (permission) => {
        if (isSuperAdmin) return true;
        return userPermissions.includes(permission);
    };

    const canSeeProjectFinance =
        hasPermission('view_crm') ||
        hasPermission('view_project_expenses') ||
        hasPermission('view_finance');

    // আপডেট: কোন রাউটে আছেন সেটা আলাদা করে রাখা হয়েছে
    const activeRoutes = {
        projectFinance:
            route().current('admin.clients.*') || route().current('admin.projects.*') || route().current('admin.tasks.*') || route().current('admin.vendors.*') || route().current('admin.project-expenses.*') || route().current('admin.accounts.*') || route().current('admin.transactions.*') || route().current('admin.investments.*') || route().current('admin.invoices.*') || route().current('invoice-payments.*') || route().current('admin.client-advances.*') || route().current('admin.expenses.*') || route().current('admin.expense-categories.*') || route().current('admin.advances.*') || route().current('admin.client-dues') || route().current('admin.vendor-dues'),
        hr: route().current('admin.departments.*') || route().current('admin.designations.*') || route().current('admin.employees.*') || route().current('admin.attendances.*') || route().current('admin.leaves.*') || route().current('admin.salaries.*'),
        office: route().current('admin.assets.*') || route().current('admin.requisitions.*') || route().current('admin.notices.*'),
        access: route().current('admin.users.*') || route().current('admin.roles.*') || route().current('admin.permissions.*'),
        report: route().current('admin.reports.financial') || route().current('admin.account.transactions') || route().current('admin.reports.client-ledger'),
    };

    const [openMenus, setOpenMenus] = useState(activeRoutes);

    // আপডেট: এক সাথে শুধু একটি মেনু ওপেন থাকবে
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
            className="min-h-screen bg-[#f6f6f7] font-sans text-[#202223] antialiased"
            style={{
                '--accent': '#C89B3C',
                '--accent-bright': '#E7C572',
                '--accent-bg': 'rgba(200, 155, 60, 0.16)',
                '--ink-elevated': '#121A2E',
                '--text-bright': '#F2F1EA',
            }}
        >
            <style>{`
                .brass-scroll::-webkit-scrollbar { width: 6px; }
                .brass-scroll::-webkit-scrollbar-track { background: transparent; }
                .brass-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
                .brass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(200,155,60,0.45); }
                @media (prefers-reduced-motion: reduce) {
                    .brass-scroll * { transition: none !important; animation: none !important; }
                }
            `}</style>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <nav
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#0A0E1A] text-[#C7CCD9] transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0A0E1A] px-4 md:justify-center md:px-6">
                    <Link href={route('dashboard')} className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                    </Link>

                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Close menu"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white md:hidden"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="brass-scroll flex-1 overflow-y-auto py-3">
                    <ul className="m-0 list-none space-y-1 p-0">
                        <SectionLabel>Overview</SectionLabel>
                        <li className="mx-3 mb-2">
                            <Link href={route('dashboard')} className={topItemClass(route().current('dashboard'))}>
                                <i className="fa-solid fa-chart-bar w-5 text-center"></i>
                                <span>Dashboard</span>
                            </Link>
                        </li>

                        <SectionLabel>Modules</SectionLabel>

                        {/* 1. Project & Finance */}
                        {canSeeProjectFinance && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('projectFinance')}
                                    aria-expanded={openMenus.projectFinance}
                                    className={groupToggleClass(openMenus.projectFinance, activeRoutes.projectFinance)}
                                >
                                    <i className={groupIconClass(openMenus.projectFinance, activeRoutes.projectFinance) + ' fa-diagram-project'}></i>
                                    Project & Finance
                                    <i className={chevronClass(openMenus.projectFinance)}></i>
                                </button>

                                {openMenus.projectFinance && (
                                    <SubMenu>
                                        {hasPermission('view_crm') && (
                                            <>
                                                <GroupLabel>CRM & Projects</GroupLabel>
                                                <li><Link href={route('admin.clients.index')} className={subItemClass(route().current('admin.clients.*'))}><i className="fa-solid fa-users-line text-[10px]"></i> Clients</Link></li>
                                                <li><Link href={route('admin.vendors.index')} className={subItemClass(route().current('admin.vendors.*'))}><i className="fa-solid fa-truck-field text-[10px]"></i> Vendors</Link></li>
                                                <li><Link href={route('admin.projects.index')} className={subItemClass(route().current('admin.projects.*'))}><i className="fa-solid fa-layer-group text-[10px]"></i> Projects</Link></li>
                                                <li><Link href={route('admin.tasks.index')} className={subItemClass(route().current('admin.tasks.*'))}><i className="fa-solid fa-list-check text-[10px]"></i> Tasks</Link></li>
                                            </>
                                        )}

                                        {hasPermission('view_project_expenses') && (
                                            <>
                                                <GroupLabel>Project Expense</GroupLabel>
                                                <li><Link href={route('admin.project-expenses.index')} className={subItemClass(route().current('admin.project-expenses.*'))}><i className="fa-solid fa-money-check-dollar text-[10px]"></i> Project Expenses</Link></li>
                                            </>
                                        )}

                                        {hasPermission('view_finance') && (
                                            <>
                                                <GroupLabel>Accounts & Banking</GroupLabel>
                                                <li><Link href={route('admin.accounts.index')} className={subItemClass(route().current('admin.accounts.*'))}><i className="fa-solid fa-vault text-[10px]"></i> Accounts Balance</Link></li>
                                                <li><Link href={route('admin.transactions.index')} className={subItemClass(route().current('admin.transactions.*'))}><i className="fa-solid fa-money-bill-transfer text-[10px]"></i> Transactions</Link></li>
                                                <li><Link href={route('admin.investments.index')} className={subItemClass(route().current('admin.investments.*'))}><i className="fa-solid fa-building-columns text-[10px]"></i> Investments</Link></li>

                                                <GroupLabel>Income & Receivables</GroupLabel>
                                                <li><Link href={route('admin.invoices.index')} className={subItemClass(route().current('admin.invoices.*'))}><i className="fa-solid fa-file-invoice text-[10px]"></i> Invoices</Link></li>
                                                <li><Link href={route('invoice-payments.index')} className={subItemClass(route().current('invoice-payments.*'))}><i className="fa-solid fa-money-bill-wave text-[10px]"></i> Receive Payments</Link></li>
                                                <li><Link href={route('admin.client-advances.index')} className={subItemClass(route().current('admin.client-advances.*'))}><i className="fa-solid fa-sack-dollar text-[10px]"></i> Client Advances</Link></li>

                                                <GroupLabel>Expenses & Payables</GroupLabel>
                                                <li><Link href={route('admin.expenses.index')} className={subItemClass(route().current('admin.expenses.*'))}><i className="fa-solid fa-receipt text-[10px]"></i> Direct Expenses</Link></li>
                                                <li><Link href={route('admin.expense-categories.index')} className={subItemClass(route().current('admin.expense-categories.*'))}><i className="fa-solid fa-tags text-[10px]"></i> Expense Categories</Link></li>
                                                <li><Link href={route('admin.advances.index')} className={subItemClass(route().current('admin.advances.*'))}><i className="fa-solid fa-hand-holding-dollar text-[10px]"></i> Staff Advances</Link></li>

                                                <GroupLabel>Financial Reports</GroupLabel>
                                                <li><Link href={route('admin.client-dues')} className={subItemClass(route().current('admin.client-dues'))}><i className="fa-solid fa-file-invoice-dollar text-[10px]"></i> Client Dues (পাওনা)</Link></li>
                                                <li><Link href={route('admin.vendor-dues')} className={subItemClass(route().current('admin.vendor-dues'))}><i className="fa-solid fa-hand-holding-dollar text-[10px]"></i> Vendor Dues (দেনা)</Link></li>
                                            </>
                                        )}
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 2. HR & Payroll */}
                        {hasPermission('view_hr') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('hr')}
                                    aria-expanded={openMenus.hr}
                                    className={groupToggleClass(openMenus.hr, activeRoutes.hr)}
                                >
                                    <i className={groupIconClass(openMenus.hr, activeRoutes.hr) + ' fa-users-gear'}></i>
                                    HR & Payroll
                                    <i className={chevronClass(openMenus.hr)}></i>
                                </button>
                                {openMenus.hr && (
                                    <SubMenu>
                                        <li><Link href={route('admin.departments.index')} className={subItemClass(route().current('admin.departments.*'))}><i className="fa-solid fa-building-user text-[10px]"></i> Departments</Link></li>
                                        <li><Link href={route('admin.designations.index')} className={subItemClass(route().current('admin.designations.*'))}><i className="fa-solid fa-user-tie text-[10px]"></i> Designations</Link></li>
                                        <li><Link href={route('admin.employees.index')} className={subItemClass(route().current('admin.employees.*'))}><i className="fa-solid fa-id-card text-[10px]"></i> Employees</Link></li>
                                        <li><Link href={route('admin.attendances.index')} className={subItemClass(route().current('admin.attendances.*'))}><i className="fa-solid fa-clock-rotate-left text-[10px]"></i> Attendance</Link></li>
                                        <li><Link href={route('admin.leaves.index')} className={subItemClass(route().current('admin.leaves.*'))}><i className="fa-solid fa-calendar-minus text-[10px]"></i> Leave Applications</Link></li>
                                        <li><Link href={route('admin.salaries.index')} className={subItemClass(route().current('admin.salaries.*'))}><i className="fa-solid fa-money-check-dollar text-[10px]"></i> Payroll / Salary</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 3. Office Administration */}
                        {hasPermission('view_office') && (
                            <li className="mx-3 mb-2 mt-1">
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
                                        <li><Link href={route('admin.assets.index')} className={subItemClass(route().current('admin.assets.*'))}><i className="fa-solid fa-boxes-stacked text-[10px]"></i> Assets</Link></li>
                                        <li><Link href={route('admin.requisitions.index')} className={subItemClass(route().current('admin.requisitions.*'))}><i className="fa-solid fa-clipboard-list text-[10px]"></i> Requisitions</Link></li>
                                        <li><Link href={route('admin.notices.index')} className={subItemClass(route().current('admin.notices.*'))}><i className="fa-solid fa-bullhorn text-[10px]"></i> Notices</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* 4. Reports */}
                        {hasPermission('view_report') && (
                            <li className="mx-3 mt-1">
                                <button
                                    onClick={() => toggleMenu('report')}
                                    aria-expanded={openMenus.report}
                                    className={groupToggleClass(openMenus.report, activeRoutes.report)}
                                >
                                    <i className={groupIconClass(openMenus.report, activeRoutes.report) + ' fa-chart-line'}></i>
                                    Reports
                                    <i className={chevronClass(openMenus.report)}></i>
                                </button>
                                {openMenus.report && (
                                    <SubMenu>
                                        <li><Link href={route('admin.reports.financial')} className={subItemClass(route().current('admin.reports.financial'))}><i className="fa-solid fa-file-invoice-dollar text-[10px]"></i> Financial Report</Link></li>
                                        <li><Link href={route('admin.account.transactions')} className={subItemClass(route().current('admin.account.transactions'))}><i className="fa-solid fa-file-invoice-dollar text-[10px]"></i> Account Transaction Report</Link></li>
                                        <li><Link href={route('admin.reports.client-ledger')} className={subItemClass(route().current('admin.reports.client-ledger'))}><i className="fa-solid fa-file-invoice-dollar text-[10px]"></i> Client Ledger</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* --- SETTINGS --- */}
                        {hasPermission('view_settings') && (
                            <>
                                <SectionLabel>System Settings</SectionLabel>
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
                                            <li><Link href={route('admin.users.index')} className={subItemClass(route().current('admin.users.*'))}><i className="fa-solid fa-users text-[10px]"></i> Users</Link></li>
                                            <li><Link href={route('admin.roles.index')} className={subItemClass(route().current('admin.roles.*'))}><i className="fa-solid fa-user-tag text-[10px]"></i> Roles</Link></li>
                                            <li><Link href={route('admin.permissions.index')} className={subItemClass(route().current('admin.permissions.*'))}><i className="fa-solid fa-key text-[10px]"></i> Permissions</Link></li>
                                        </SubMenu>
                                    )}
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </nav>

            <div className="flex min-h-screen flex-col transition-all duration-300 md:ml-[260px]">
                {/* Navbar */}
                <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between border-b border-[#e1e3e5] bg-white px-4 shadow-sm sm:px-6">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open menu"
                            className="mr-3 rounded-md border border-[#e1e3e5] bg-gray-50 p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                        >
                            <i className="fa-solid fa-bars text-lg"></i>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setProfileDropdown(!profileDropdown)}
                                className="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus-visible:ring-offset-2"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                                    {initials}
                                </div>
                                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                                    {displayName}
                                </span>
                                <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${profileDropdown ? 'rotate-180' : ''}`}></i>
                            </button>

                            {profileDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)}></div>
                                    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                        <Link href={route('profile.edit')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            <i className="fa-solid fa-user mr-2 text-gray-400"></i> Profile
                                        </Link>
                                        <Link href={route('logout')} method="post" as="button" className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                                            <i className="fa-solid fa-right-from-bracket mr-2 text-gray-400"></i> Log Out
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 md:p-8">
                    {flash?.success && (
                        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
                            <i className="fa-solid fa-circle-check mr-2"></i>
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                            <i className="fa-solid fa-circle-xmark mr-2"></i>
                            {flash.error}
                        </div>
                    )}
                    
                    {children}
                </main>
            </div>
        </div>
    );
}