import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';

/* ---------------------------------------------------------------- */
/*   Polished Presentational Helpers                                */
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
    const [quickAddDropdown, setQuickAddDropdown] = useState(false);

    // 🟢 Global Search State
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);

    // Access Control Logic
    const userRoles = auth?.roles || [];
    const userPermissions = auth?.permissions || [];
    const isSuperAdmin = userRoles.includes('Super Admin') || userRoles.includes('super-admin');

    const hasPermission = (permission) => {
        if (isSuperAdmin) return true;
        return userPermissions.includes(permission);
    };

    const activeRoutes = {
        hr: route().current('admin.departments.*') || route().current('admin.designations.*') || route().current('admin.employees.*') || route().current('admin.attendances.*') || route().current('admin.leaves.*') || route().current('admin.salaries.*'),
        crm: route().current('admin.clients.*') || route().current('admin.projects.*') || route().current('admin.tasks.*') || route().current('admin.vendors.*'),
        finance: route().current('admin.project-expenses.*') || route().current('admin.accounts.*') || route().current('admin.transactions.*') || route().current('admin.investments.*') || route().current('admin.invoices.*') || route().current('invoice-payments.*') || route().current('admin.client-advances.*') || route().current('admin.expenses.*') || route().current('admin.expense-categories.*') || route().current('admin.advances.*'),
        office: route().current('admin.assets.*') || route().current('admin.requisitions.*') || route().current('admin.notices.*'),
        report: route().current('admin.reports.*') || route().current('admin.account.transactions') || route().current('admin.client-dues') || route().current('admin.vendor-dues'),
        settings: route().current('admin.invoice-settings.*'),
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

    // 🟢 Keyboard Shortcut (Cmd+K / Ctrl+K / Escape)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 🟢 Auto focus input when modal opens
    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [searchOpen]);

    // 🟢 Live Search API Call (Debounced)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(route('admin.global-search'), {
                    params: { q: searchQuery }
                });
                setSearchResults(res.data || []);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

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
                <div className="relative flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#070b15] px-5 md:justify-center">
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

                        {/* CRM & Projects */}
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

                        {/* Finance & Accounts */}
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

                        {/* Office Administration */}
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

                        {/* HR & Payroll */}
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

                        {/* Reports & Analytics */}
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
                                        <li><Link href={route('admin.reports.daybook')} className={subItemClass(route().current('admin.reports.daybook'))}><i className="fa-solid fa-book-open text-[11px] opacity-80"></i> Daily Daybook</Link></li>
                                        <li><Link href={route('admin.reports.financial')} className={subItemClass(route().current('admin.reports.financial'))}><i className="fa-solid fa-chart-area text-[11px] opacity-80"></i> Financial Report</Link></li>
                                        <li><Link href={route('admin.account.transactions')} className={subItemClass(route().current('admin.account.transactions'))}><i className="fa-solid fa-money-check text-[11px] opacity-80"></i> Transaction Report</Link></li>
                                        <li><Link href={route('admin.reports.client-ledger')} className={subItemClass(route().current('admin.reports.client-ledger'))}><i className="fa-solid fa-book-journal-whills text-[11px] opacity-80"></i> Client Ledger</Link></li>
                                        <li><Link href={route('admin.client-dues')} className={subItemClass(route().current('admin.client-dues'))}><i className="fa-solid fa-file-invoice-dollar text-[11px] opacity-80"></i> Client Dues (পাওনা)</Link></li>
                                        <li><Link href={route('admin.vendor-dues')} className={subItemClass(route().current('admin.vendor-dues'))}><i className="fa-solid fa-clock-rotate-left text-[11px] opacity-80"></i> Vendor Dues (দেনা)</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* SETTINGS */}
                        {hasPermission('view_settings') && (
                            <>
                                <SectionLabel>System Configuration</SectionLabel>
                                <li className="mx-3 mb-1">
                                    <Link href={route('admin.invoice-settings.index')} className={topItemClass(route().current('admin.invoice-settings.*'))}>
                                        <i className="fa-solid fa-file-invoice-dollar w-5 text-center text-[16px]"></i>
                                        <span>Invoice Settings</span>
                                    </Link>
                                </li>
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

                {/* 🟢 Premium Top Navbar */}
                <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-xl px-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sm:px-6 print:hidden transition-all duration-300">

                    {/* Left Side: Toggle & Search Trigger */}
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open menu"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 md:hidden shadow-sm"
                        >
                            <i className="fa-solid fa-bars-staggered text-[17px]"></i>
                        </button>

                        {/* 🟢 Functional Search Trigger */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-between w-full max-w-md rounded-full border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-[var(--accent)] px-4 py-2.5 text-[13.5px] text-gray-400 transition-all shadow-sm group"
                        >
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-magnifying-glass text-[14px] text-gray-400 group-hover:text-[var(--accent)] transition-colors"></i>
                                <span className="font-medium text-gray-500">Search projects, clients, invoices...</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[10.5px] font-bold text-gray-500 shadow-sm">
                                <span>⌘</span><span>K</span>
                            </div>
                        </button>
                    </div>

                    {/* Right Side: Actions & Profile */}
                    <div className="flex items-center gap-3 sm:gap-5">

                        {/* Quick Add Dropdown */}
                        <div className="relative hidden sm:block">
                            <button
                                onClick={() => setQuickAddDropdown(!quickAddDropdown)}
                                className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5"
                            >
                                <i className="fa-solid fa-plus text-[12px]"></i>
                                <span>Create New</span>
                            </button>

                            {quickAddDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setQuickAddDropdown(false)}></div>
                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 animate-[fadeIn_0.2s_ease-out]">
                                        <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">Quick Actions</div>
                                        <div className="p-1.5 flex flex-col gap-0.5">
                                            <Link href={route('admin.invoices.create')} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-500"><i className="fa-solid fa-file-invoice"></i></div> Invoice
                                            </Link>
                                            <Link href={route('admin.project-expenses.create')} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-500"><i className="fa-solid fa-file-invoice-dollar"></i></div> Expense
                                            </Link>
                                            <Link href={route('admin.tasks.index')} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-500"><i className="fa-solid fa-list-check"></i></div> Task
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-7 w-px bg-gray-200 hidden sm:block"></div>

                        {/* Notification Bell */}
                        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-all hover:bg-white hover:text-[var(--accent)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
                            <i className="fa-regular fa-bell text-[18px]"></i>
                            <span className="absolute right-2.5 top-2.5 flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                            </span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileDropdown(!profileDropdown)}
                                className="flex items-center gap-3 rounded-full outline-none transition-all hover:ring-2 hover:ring-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent)]/50 focus-visible:ring-offset-2 p-1 pr-3 hover:bg-gray-50 border border-transparent hover:border-gray-100"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-amber-600 text-sm font-bold text-white shadow-sm ring-2 ring-white">
                                    {initials}
                                </div>
                                <div className="hidden text-left sm:block">
                                    <span className="block text-[13px] font-bold text-gray-800 leading-tight">
                                        {displayName}
                                    </span>
                                    <span className="block text-[11px] font-semibold text-gray-400">
                                        {isSuperAdmin ? 'Super Admin' : 'Staff'}
                                    </span>
                                </div>
                                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-300 ml-1 ${profileDropdown ? 'rotate-180' : ''}`}></i>
                            </button>

                            {profileDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)}></div>
                                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 animate-[fadeIn_0.2s_ease-out]">
                                        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                                            <p className="text-[14px] font-bold text-gray-900">{displayName}</p>
                                            <p className="text-[12px] font-medium text-gray-500 truncate mt-0.5">{auth?.user?.email}</p>
                                        </div>
                                        <div className="py-2 px-1.5">
                                            <Link href={route('profile.edit')} className="flex items-center rounded-xl px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors">
                                                <i className="fa-regular fa-user mr-3 text-[14px] opacity-70"></i> My Profile
                                            </Link>
                                            <Link href={route('logout')} method="post" as="button" className="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors mt-0.5">
                                                <i className="fa-solid fa-arrow-right-from-bracket mr-3 text-[14px] opacity-70"></i> Sign Out
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* 🟢 COMMAND PALETTE SEARCH MODAL */}
                {searchOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-gray-900/60 backdrop-blur-sm p-4 pt-16 sm:pt-24 animate-[fadeIn_0.15s_ease-out]">
                        <div
                            className="fixed inset-0"
                            onClick={() => setSearchOpen(false)}
                        />
                        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10">

                            {/* Search Header Input */}
                            <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
                                <i className="fa-solid fa-magnifying-glass text-[16px] text-gray-400 mr-3"></i>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Type to search projects, clients, invoices, tasks..."
                                    className="w-full bg-transparent text-[15px] font-medium text-gray-900 placeholder:text-gray-400 outline-none border-none focus:ring-0"
                                />
                                {isSearching ? (
                                    <i className="fa-solid fa-spinner fa-spin text-gray-400 text-sm"></i>
                                ) : (
                                    <button
                                        onClick={() => setSearchOpen(false)}
                                        className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 hover:bg-gray-200"
                                    >
                                        ESC
                                    </button>
                                )}
                            </div>

                            {/* Search Results / Empty State */}
                            <div className="max-h-96 overflow-y-auto p-2 custom-scroll">
                                {searchResults.length > 0 ? (
                                    <div className="space-y-1">
                                        {searchResults.map((item, index) => (
                                            <Link
                                                key={index}
                                                href={item.url}
                                                onClick={() => setSearchOpen(false)}
                                                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-[14px]">
                                                        <i className={item.icon}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-[11.5px] text-gray-400 font-medium">
                                                            {item.subtitle}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                    {item.category}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : searchQuery.length >= 2 ? (
                                    <div className="py-12 text-center text-gray-400">
                                        <i className="fa-solid fa-magnifying-glass text-2xl mb-2 opacity-50"></i>
                                        <p className="text-[14px] font-bold text-gray-600">No results found for "{searchQuery}"</p>
                                        <p className="text-[12px] text-gray-400 mt-1">Try searching by client name, project title, or invoice number.</p>
                                    </div>
                                ) : (
                                    <div className="p-4 text-[12.5px] text-gray-400 flex items-center justify-between">
                                        <span>Type at least 2 characters to search across all records...</span>
                                        <span className="font-semibold text-gray-500">Pro tip: Press ⌘K anytime</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                <main className="flex-1 p-4 sm:p-6 md:p-8">
                    {flash?.success && (
                        <div className="mb-6 flex items-center rounded-2xl border border-green-200 bg-green-50/80 p-4 text-[14px] font-bold text-green-700 shadow-sm animate-fade-in-down print:hidden backdrop-blur-sm">
                            <i className="fa-solid fa-circle-check mr-3 text-xl"></i>
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 flex items-center rounded-2xl border border-red-200 bg-red-50/80 p-4 text-[14px] font-bold text-red-700 shadow-sm animate-fade-in-down print:hidden backdrop-blur-sm">
                            <i className="fa-solid fa-circle-xmark mr-3 text-xl"></i>
                            {flash.error}
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
