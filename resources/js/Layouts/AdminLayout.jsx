import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';

/* ---------------------------------------------------------------- */
/*   Polished Presentational Helpers (Spacing Reduced)              */
/* ---------------------------------------------------------------- */

const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-3 px-5 pb-1.5 pt-4 first:pt-2">
        <span className="text-[10.5px] font-black uppercase tracking-[0.15em] text-[#5C6478]">{children}</span>
    </div>
);

const GroupLabel = ({ children }) => (
    <div className="flex items-center gap-2 px-3 pb-1 pt-2.5 first:pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#636C84]/80">{children}</span>
        <span className="h-px flex-1 bg-white/[0.04]" />
    </div>
);

const SubMenu = ({ children }) => (
    <ul className="mb-1.5 mt-0.5 list-none space-y-px rounded-xl bg-[#03050A]/40 px-1.5 py-1.5 ring-1 ring-white/[0.02]">
        {children}
    </ul>
);

const topItemClass = (active) =>
    `group flex items-center gap-3.5 rounded-xl px-4 py-2 text-[13.5px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent-bg)] text-[var(--accent-bright)] shadow-[inset_3px_0_0_0_var(--accent)]'
            : 'text-[#A0ABC0] hover:bg-white/[0.04] hover:text-[#DDE1EA]'
    }`;

const groupToggleClass = (open, isActive) =>
    `group flex w-full items-center justify-between rounded-xl px-4 py-2 text-[13.5px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        open || isActive
            ? 'bg-white/[0.03] text-white'
            : 'text-[#A0ABC0] hover:bg-white/[0.04] hover:text-[#DDE1EA]'
    }`;

const subItemClass = (active) =>
    `flex items-center gap-3 rounded-lg py-1.5 pl-4 pr-3 text-[12.5px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
        active
            ? 'bg-[var(--accent)]/10 text-[var(--accent-bright)] shadow-[inset_2px_0_0_0_var(--accent)]'
            : 'text-[#858D9D] hover:bg-white/[0.04] hover:text-[#DDE1EA] hover:translate-x-1'
    }`;

const chevronClass = (open) =>
    `fa-solid fa-chevron-right text-[10px] transition-transform duration-300 ${
        open ? 'rotate-90 text-[var(--accent)]' : 'text-[#5C6478] group-hover:text-[#A0ABC0]'
    }`;

const groupIconClass = (open, isActive) =>
    `fa-solid w-5 text-center text-[15px] transition-colors duration-300 ${
        open || isActive ? 'text-[var(--accent)]' : 'opacity-70 group-hover:text-[var(--accent)] group-hover:opacity-100'
    }`;

/* ---------------------------------------------------------------- */
/*   Hooks                                                          */
/* ---------------------------------------------------------------- */

function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}

export default function AdminLayout({ children }) {
    const { auth, flash = {} } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Dropdown States
    const [profileDropdown, setProfileDropdown] = useState(false);
    const [quickAddDropdown, setQuickAddDropdown] = useState(false);
    const profileRef = useRef();
    const quickAddRef = useRef();

    useOnClickOutside(profileRef, () => setProfileDropdown(false));
    useOnClickOutside(quickAddRef, () => setQuickAddDropdown(false));

    // Global Search State
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
        crm: route().current('admin.clients.*') || route().current('admin.projects.*') || route().current('admin.tasks.*') || route().current('admin.vendors.*'),
        hr: route().current('admin.employees.*') || route().current('admin.attendances.*') || route().current('admin.leaves.*') || route().current('admin.salaries.*') || route().current('admin.departments.*') || route().current('admin.designations.*'),
        sales: route().current('admin.invoices.*') || route().current('invoice-payments.*') || route().current('admin.client-advances.*'),
        accounting: route().current('admin.accounts.*') || route().current('admin.transactions.*') || route().current('admin.investments.*') || route().current('admin.project-expenses.*') || route().current('admin.expenses.*') || route().current('admin.expense-categories.*') || route().current('admin.advances.*'),
        office: route().current('admin.assets.*') || route().current('admin.requisitions.*') || route().current('admin.notices.*') || route().current('admin.challans.*') || route().current('admin.useful-links.*'),
        report: route().current('admin.reports.*') || route().current('admin.account.transactions') || route().current('admin.client-dues') || route().current('admin.vendor-dues') || route().current('admin.vendor-payments'),
        settings: route().current('admin.invoice-settings.*') || route().current('admin.challan-settings.*') || route().current('admin.users.*') || route().current('admin.roles.*') || route().current('admin.permissions.*'),
    };

    const [openMenus, setOpenMenus] = useState(activeRoutes);

    const toggleMenu = (menuName) => {
        setOpenMenus((prev) => ({
            ...Object.keys(prev).reduce((acc, key) => {
                acc[key] = key === menuName ? !prev[menuName] : false;
                return acc;
            }, {})
        }));
    };

    // Keyboard Shortcut (Cmd+K / Ctrl+K / Escape)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
            if (e.key === 'Escape') setSearchOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto focus input when modal opens
    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [searchOpen]);

    // Live Search API Call (Debounced)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(route('admin.global-search'), { params: { q: searchQuery } });
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
        const handleResize = () => { if (window.innerWidth >= 768) setIsSidebarOpen(false); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const displayName = auth?.user?.name || 'Admin';
    const initials = displayName.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div
            className="min-h-screen bg-[#f4f5f7] font-sans text-[#202223] antialiased"
            style={{
                '--accent': '#C89B3C',
                '--accent-bright': '#E7C572',
                '--accent-bg': 'rgba(200, 155, 60, 0.12)',
            }}
        >
            <style dangerouslySetInnerHTML={{__html: `
                .brass-scroll::-webkit-scrollbar { width: 5px; }
                .brass-scroll::-webkit-scrollbar-track { background: transparent; }
                .brass-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .brass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(200,155,60,0.5); }
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
                @media (prefers-reduced-motion: reduce) {
                    .brass-scroll *, .custom-scroll * { transition: none !important; animation: none !important; }
                }
            `}} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden animate-[fadeIn_0.2s_ease-out]"
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

                <div className="brass-scroll flex-1 overflow-y-auto py-2 pb-10">
                    <ul className="m-0 list-none space-y-0.5 p-0">

                        <li className="mx-3 mt-2 mb-1">
                            <Link href={route('dashboard')} className={topItemClass(route().current('dashboard'))}>
                                <i className="fa-solid fa-chart-pie w-5 text-center text-[15px]"></i>
                                <span>Dashboard Overview</span>
                            </Link>
                        </li>

                        {/* ================= OPERATIONS ================= */}
                        {(hasPermission('view_crm') || hasPermission('view_hr')) && <SectionLabel>Operations</SectionLabel>}

                        {hasPermission('view_crm') && (
                            <li className="mx-3 mt-0.5">
                                <button onClick={() => toggleMenu('crm')} aria-expanded={openMenus.crm} className={groupToggleClass(openMenus.crm, activeRoutes.crm)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.crm, activeRoutes.crm) + ' fa-layer-group'}></i>
                                        CRM & Projects
                                    </span>
                                    <i className={chevronClass(openMenus.crm)}></i>
                                </button>
                                {openMenus.crm && (
                                    <SubMenu>
                                        <li><Link href={route('admin.clients.index')} className={subItemClass(route().current('admin.clients.*'))}><i className="fa-solid fa-building-user w-4 text-center text-[11px] opacity-70"></i> Clients</Link></li>
                                        <li><Link href={route('admin.projects.index')} className={subItemClass(route().current('admin.projects.*'))}><i className="fa-solid fa-rocket w-4 text-center text-[11px] opacity-70"></i> Projects</Link></li>
                                        <li><Link href={route('admin.tasks.index')} className={subItemClass(route().current('admin.tasks.*'))}><i className="fa-solid fa-list-check w-4 text-center text-[11px] opacity-70"></i> Tasks</Link></li>
                                        <li><Link href={route('admin.vendors.index')} className={subItemClass(route().current('admin.vendors.*'))}><i className="fa-solid fa-truck-field w-4 text-center text-[11px] opacity-70"></i> Vendors</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {hasPermission('view_hr') && (
                            <li className="mx-3 mt-0.5">
                                <button onClick={() => toggleMenu('hr')} aria-expanded={openMenus.hr} className={groupToggleClass(openMenus.hr, activeRoutes.hr)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.hr, activeRoutes.hr) + ' fa-users-viewfinder'}></i>
                                        HR & Payroll
                                    </span>
                                    <i className={chevronClass(openMenus.hr)}></i>
                                </button>
                                {openMenus.hr && (
                                    <SubMenu>
                                        <li><Link href={route('admin.employees.index')} className={subItemClass(route().current('admin.employees.*'))}><i className="fa-solid fa-id-badge w-4 text-center text-[11px] opacity-70"></i> Employees</Link></li>
                                        <li><Link href={route('admin.attendances.index')} className={subItemClass(route().current('admin.attendances.*'))}><i className="fa-solid fa-clock-rotate-left w-4 text-center text-[11px] opacity-70"></i> Attendance</Link></li>
                                        <li><Link href={route('admin.leaves.index')} className={subItemClass(route().current('admin.leaves.*'))}><i className="fa-solid fa-calendar-minus w-4 text-center text-[11px] opacity-70"></i> Leaves</Link></li>
                                        <li><Link href={route('admin.salaries.index')} className={subItemClass(route().current('admin.salaries.*'))}><i className="fa-solid fa-money-check-dollar w-4 text-center text-[11px] opacity-70"></i> Payroll</Link></li>
                                        <GroupLabel>Setup</GroupLabel>
                                        <li><Link href={route('admin.departments.index')} className={subItemClass(route().current('admin.departments.*'))}><i className="fa-solid fa-sitemap w-4 text-center text-[11px] opacity-70"></i> Departments</Link></li>
                                        <li><Link href={route('admin.designations.index')} className={subItemClass(route().current('admin.designations.*'))}><i className="fa-solid fa-user-tie w-4 text-center text-[11px] opacity-70"></i> Designations</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* ================= FINANCE & ACCOUNTS ================= */}
                        {hasPermission('view_finance') && <SectionLabel>Finance</SectionLabel>}

                        {hasPermission('view_finance') && (
                            <li className="mx-3 mt-0.5">
                                <button onClick={() => toggleMenu('sales')} aria-expanded={openMenus.sales} className={groupToggleClass(openMenus.sales, activeRoutes.sales)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.sales, activeRoutes.sales) + ' fa-file-invoice-dollar'}></i>
                                        Sales & Billing
                                    </span>
                                    <i className={chevronClass(openMenus.sales)}></i>
                                </button>
                                {openMenus.sales && (
                                    <SubMenu>
                                        <li><Link href={route('admin.invoices.index')} className={subItemClass(route().current('admin.invoices.*'))}><i className="fa-solid fa-file-invoice w-4 text-center text-[11px] opacity-70"></i> Invoices</Link></li>
                                        <li><Link href={route('invoice-payments.index')} className={subItemClass(route().current('invoice-payments.*'))}><i className="fa-solid fa-hand-holding-dollar w-4 text-center text-[11px] opacity-70"></i> Received Payments</Link></li>
                                        <li><Link href={route('admin.client-advances.index')} className={subItemClass(route().current('admin.client-advances.*'))}><i className="fa-solid fa-sack-dollar w-4 text-center text-[11px] opacity-70"></i> Client Advances</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {hasPermission('view_finance') && (
                            <li className="mx-3 mt-0.5">
                                <button onClick={() => toggleMenu('accounting')} aria-expanded={openMenus.accounting} className={groupToggleClass(openMenus.accounting, activeRoutes.accounting)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.accounting, activeRoutes.accounting) + ' fa-wallet'}></i>
                                        Accounting & Expenses
                                    </span>
                                    <i className={chevronClass(openMenus.accounting)}></i>
                                </button>
                                {openMenus.accounting && (
                                    <SubMenu>
                                        <GroupLabel>Core Accounts</GroupLabel>
                                        <li><Link href={route('admin.accounts.index')} className={subItemClass(route().current('admin.accounts.*'))}><i className="fa-solid fa-building-columns w-4 text-center text-[11px] opacity-70"></i> Accounts Balance</Link></li>
                                        <li><Link href={route('admin.transactions.index')} className={subItemClass(route().current('admin.transactions.*'))}><i className="fa-solid fa-money-bill-transfer w-4 text-center text-[11px] opacity-70"></i> Transactions</Link></li>
                                        <li><Link href={route('admin.investments.index')} className={subItemClass(route().current('admin.investments.*'))}><i className="fa-solid fa-arrow-trend-up w-4 text-center text-[11px] opacity-70"></i> Investments</Link></li>
                                        <GroupLabel>Payables</GroupLabel>
                                        <li><Link href={route('admin.expenses.index')} className={subItemClass(route().current('admin.expenses.*'))}><i className="fa-solid fa-receipt w-4 text-center text-[11px] opacity-70"></i> Office Expenses</Link></li>
                                        <li><Link href={route('admin.project-expenses.index')} className={subItemClass(route().current('admin.project-expenses.*'))}><i className="fa-solid fa-boxes-packing w-4 text-center text-[11px] opacity-70"></i> Project Expenses</Link></li>
                                        <li><Link href={route('admin.advances.index')} className={subItemClass(route().current('admin.advances.*'))}><i className="fa-solid fa-handshake-angle w-4 text-center text-[11px] opacity-70"></i> Staff Advances</Link></li>
                                        <li><Link href={route('admin.expense-categories.index')} className={subItemClass(route().current('admin.expense-categories.*'))}><i className="fa-solid fa-tags w-4 text-center text-[11px] opacity-70"></i> Expense Tags</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* ================= ADMINISTRATION ================= */}
                        {(hasPermission('view_office') || hasPermission('view_report')) && <SectionLabel>Administration</SectionLabel>}

                        {hasPermission('view_office') && (
                            <li className="mx-3 mt-0.5">
                                <button onClick={() => toggleMenu('office')} aria-expanded={openMenus.office} className={groupToggleClass(openMenus.office, activeRoutes.office)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.office, activeRoutes.office) + ' fa-building'}></i>
                                        Office & Assets
                                    </span>
                                    <i className={chevronClass(openMenus.office)}></i>
                                </button>
                                {openMenus.office && (
                                    <SubMenu>
                                        <li><Link href={route('admin.requisitions.index')} className={subItemClass(route().current('admin.requisitions.*'))}><i className="fa-solid fa-clipboard-list w-4 text-center text-[11px] opacity-70"></i> Requisitions</Link></li>
                                        <li><Link href={route('admin.assets.index')} className={subItemClass(route().current('admin.assets.*'))}><i className="fa-solid fa-boxes-stacked w-4 text-center text-[11px] opacity-70"></i> Asset Register</Link></li>
                                        <li><Link href={route('admin.challans.index')} className={subItemClass(route().current('admin.challans.*'))}><i className="fa-solid fa-truck-fast w-4 text-center text-[11px] opacity-70"></i> Delivery Challans</Link></li>
                                        <li><Link href={route('admin.notices.index')} className={subItemClass(route().current('admin.notices.*'))}><i className="fa-solid fa-bullhorn w-4 text-center text-[11px] opacity-70"></i> Notice Board</Link></li>
                                        <li><Link href={route('admin.useful-links.index')} className={subItemClass(route().current('admin.useful-links.*'))}><i className="fa-solid fa-link w-4 text-center text-[11px] opacity-70 text-amber-400"></i> Useful Links</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {hasPermission('view_report') && (
                            <li className="mx-3 mt-0.5 mb-1.5">
                                <button onClick={() => toggleMenu('report')} aria-expanded={openMenus.report} className={groupToggleClass(openMenus.report, activeRoutes.report)}>
                                    <span className="flex items-center gap-3.5">
                                        <i className={groupIconClass(openMenus.report, activeRoutes.report) + ' fa-chart-line'}></i>
                                        Reports & Analytics
                                    </span>
                                    <i className={chevronClass(openMenus.report)}></i>
                                </button>
                                {openMenus.report && (
                                    <SubMenu>
                                        <li><Link href={route('admin.reports.master')} className={subItemClass(route().current('admin.reports.master'))}><i className="fa-solid fa-chart-pie w-4 text-center text-[11px] opacity-70 text-[var(--accent)]"></i> Master Summary</Link></li>
                                        <li><Link href={route('admin.reports.position')} className={subItemClass(route().current('admin.reports.position'))}><i className="fa-solid fa-scale-balanced w-4 text-center text-[11px] opacity-70"></i> Financial Position</Link></li>
                                        <li><Link href={route('admin.reports.daybook')} className={subItemClass(route().current('admin.reports.daybook'))}><i className="fa-solid fa-book-open w-4 text-center text-[11px] opacity-70"></i> Daily Daybook</Link></li>
                                        <li><Link href={route('admin.reports.monthly-balance')} className={subItemClass(route().current('admin.reports.monthly-balance'))}><i className="fa-solid fa-calendar-days w-4 text-center text-[11px] opacity-70"></i> Monthly Balance</Link></li>
                                        <li><Link href={route('admin.reports.financial')} className={subItemClass(route().current('admin.reports.financial'))}><i className="fa-solid fa-chart-area w-4 text-center text-[11px] opacity-70"></i> Profit & Loss</Link></li>
                                        <li><Link href={route('admin.reports.project-profit')} className={subItemClass(route().current('admin.reports.project-profit'))}><i className="fa-solid fa-sack-dollar w-4 text-center text-[11px] opacity-70 text-emerald-400"></i> Project Profit & Loss</Link></li>
                                        <li><Link href={route('admin.reports.expense-analysis')} className={subItemClass(route().current('admin.reports.expense-analysis'))}><i className="fa-solid fa-chart-column w-4 text-center text-[11px] opacity-70 text-amber-400"></i> Expense & Aging</Link></li>
                                        <li><Link href={route('admin.account.transactions')} className={subItemClass(route().current('admin.account.transactions'))}><i className="fa-solid fa-money-check w-4 text-center text-[11px] opacity-70"></i> Transactions Log</Link></li>
                                        <GroupLabel>Dues & Ledgers</GroupLabel>
                                        <li><Link href={route('admin.reports.client-ledger')} className={subItemClass(route().current('admin.reports.client-ledger'))}><i className="fa-solid fa-book-journal-whills w-4 text-center text-[11px] opacity-70"></i> Client Ledger</Link></li>
                                        <li><Link href={route('admin.reports.vendor-ledger')} className={subItemClass(route().current('admin.reports.vendor-ledger'))}><i className="fa-solid fa-book-bookmark w-4 text-center text-[11px] opacity-70"></i> Vendor Ledger</Link></li>
                                        <li><Link href={route('admin.client-dues')} className={subItemClass(route().current('admin.client-dues'))}><i className="fa-solid fa-file-invoice-dollar w-4 text-center text-[11px] opacity-70"></i> Client Dues</Link></li>
                                        <li><Link href={route('admin.client-advances.index')} className={subItemClass(route().current('admin.client-advances.*'))}><i className="fa-solid fa-sack-dollar w-4 text-center text-[11px] opacity-70"></i> Client Advances</Link></li>
                                        <li><Link href={route('admin.vendor-dues')} className={subItemClass(route().current('admin.vendor-dues'))}><i className="fa-solid fa-clock-rotate-left w-4 text-center text-[11px] opacity-70"></i> Vendor Dues</Link></li>
                                        <li><Link href={route('admin.vendor-payments')} className={subItemClass(route().current('admin.vendor-payments'))}><i className="fa-solid fa-money-bill-transfer w-4 text-center text-[11px] opacity-70"></i> Vendor Payments</Link></li>
                                    </SubMenu>
                                )}
                            </li>
                        )}

                        {/* ================= SYSTEM ================= */}
                        {hasPermission('view_settings') && (
                            <>
                                <SectionLabel>System</SectionLabel>
                                <li className="mx-3 mt-0.5 mb-4">
                                    <button onClick={() => toggleMenu('settings')} aria-expanded={openMenus.settings} className={groupToggleClass(openMenus.settings, activeRoutes.settings)}>
                                        <span className="flex items-center gap-3.5">
                                            <i className={groupIconClass(openMenus.settings, activeRoutes.settings) + ' fa-gear'}></i>
                                            Settings & Security
                                        </span>
                                        <i className={chevronClass(openMenus.settings)}></i>
                                    </button>
                                    {openMenus.settings && (
                                        <SubMenu>
                                            <GroupLabel>Preferences</GroupLabel>
                                            <li><Link href={route('admin.invoice-settings.index')} className={subItemClass(route().current('admin.invoice-settings.*'))}><i className="fa-solid fa-file-invoice-dollar w-4 text-center text-[11px] opacity-70"></i> Invoice Settings</Link></li>
                                            <li><Link href={route('admin.challan-settings.index')} className={subItemClass(route().current('admin.challan-settings.*'))}><i className="fa-solid fa-file-signature w-4 text-center text-[11px] opacity-70"></i> Challan Settings</Link></li>
                                            <GroupLabel>Access Control</GroupLabel>
                                            <li><Link href={route('admin.users.index')} className={subItemClass(route().current('admin.users.*'))}><i className="fa-solid fa-users w-4 text-center text-[11px] opacity-70"></i> Users</Link></li>
                                            <li><Link href={route('admin.roles.index')} className={subItemClass(route().current('admin.roles.*'))}><i className="fa-solid fa-user-shield w-4 text-center text-[11px] opacity-70"></i> Roles</Link></li>
                                            <li><Link href={route('admin.permissions.index')} className={subItemClass(route().current('admin.permissions.*'))}><i className="fa-solid fa-key w-4 text-center text-[11px] opacity-70"></i> Permissions</Link></li>
                                            <GroupLabel>System Data</GroupLabel>
                                            <li><a href={route('admin.backup.download')} className={subItemClass(false)}><i className="fa-solid fa-database w-4 text-center text-[11px] opacity-70 text-indigo-400"></i> Backup Database</a></li>
                                        </SubMenu>
                                    )}
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </nav>

            <div className="flex min-h-screen flex-col transition-all duration-300 md:ml-[270px]">

                {/* Premium Top Navbar */}
                <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-200/80 bg-white/90 backdrop-blur-xl px-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sm:px-6 print:hidden transition-all duration-300">

                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open menu"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 md:hidden shadow-sm hover:text-[var(--accent)]"
                        >
                            <i className="fa-solid fa-bars-staggered text-[17px]"></i>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-between w-full max-w-md rounded-full border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-[var(--accent)] px-4 py-2.5 text-[13.5px] text-gray-400 transition-all shadow-sm group"
                        >
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-magnifying-glass text-[14px] text-gray-400 group-hover:text-[var(--accent)] transition-colors"></i>
                                <span className="hidden min-[420px]:inline font-medium text-gray-500">Search projects, clients, invoices...</span>
                                <span className="min-[420px]:hidden font-medium text-gray-500">Search...</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-400 shadow-sm transition-colors group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30">
                                <span>⌘</span><span>K</span>
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">

                        {/* Quick Add Dropdown */}
                        <div className="relative hidden sm:block" ref={quickAddRef}>
                            <button
                                onClick={() => setQuickAddDropdown(!quickAddDropdown)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-all shadow-sm ${quickAddDropdown ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5'}`}
                            >
                                <i className="fa-solid fa-plus text-[12px]"></i>
                                <span>Create New</span>
                            </button>

                            {quickAddDropdown && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 animate-[scaleIn_0.15s_ease-out] transform origin-top-right">
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
                            )}
                        </div>

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
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileDropdown(!profileDropdown)}
                                className={`flex items-center gap-3 rounded-full outline-none transition-all p-1 pr-3 border ${profileDropdown ? 'bg-gray-50 border-gray-200 ring-2 ring-[var(--accent)]/30' : 'hover:bg-gray-50 border-transparent hover:border-gray-100'}`}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-amber-600 text-sm font-bold text-white shadow-sm ring-2 ring-white">
                                    {initials}
                                </div>
                                <div className="hidden text-left sm:block">
                                    <span className="block text-[13px] font-bold text-gray-800 leading-tight">{displayName}</span>
                                    <span className="block text-[11px] font-semibold text-gray-400">{isSuperAdmin ? 'Super Admin' : 'Staff'}</span>
                                </div>
                                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-300 ml-1 ${profileDropdown ? 'rotate-180' : ''}`}></i>
                            </button>

                            {profileDropdown && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 animate-[scaleIn_0.15s_ease-out] transform origin-top-right">
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
                            )}
                        </div>
                    </div>
                </header>

                {/* COMMAND PALETTE SEARCH MODAL */}
                {searchOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-gray-900/60 backdrop-blur-sm p-4 pt-16 sm:pt-24 animate-[fadeIn_0.15s_ease-out]">
                        <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />
                        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-[scaleIn_0.15s_ease-out]">
                            <div className="flex items-center px-4 py-4 border-b border-gray-100">
                                <i className="fa-solid fa-magnifying-glass text-[16px] text-gray-400 mr-3"></i>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Type to search projects, clients, invoices, tasks..."
                                    className="w-full bg-transparent text-[15px] font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium outline-none border-none focus:ring-0"
                                />
                                {isSearching ? (
                                    <i className="fa-solid fa-spinner fa-spin text-[var(--accent)] text-sm ml-2"></i>
                                ) : (
                                    <button onClick={() => setSearchOpen(false)} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 hover:bg-gray-200 ml-2">ESC</button>
                                )}
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scroll">
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
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-[14px] group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                        <i className={item.icon}></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{item.title}</p>
                                                        <p className="text-[11.5px] text-gray-400 font-medium">{item.subtitle}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded">
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
                                    <div className="p-4 text-[12.5px] text-gray-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <span>Type at least 2 characters to search across all records...</span>
                                        <span className="font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg w-fit">Pro tip: Press ⌘K anytime</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <main className="admin-content min-w-0 flex-1 overflow-x-hidden p-3 sm:p-6 md:p-8">
                    {flash?.success && (
                        <div className="mb-6 flex items-center rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-[14px] font-bold text-emerald-700 shadow-sm animate-[fadeIn_0.3s_ease-out] print:hidden backdrop-blur-sm">
                            <i className="fa-solid fa-circle-check mr-3 text-xl"></i>
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 flex items-center rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-[14px] font-bold text-rose-700 shadow-sm animate-[fadeIn_0.3s_ease-out] print:hidden backdrop-blur-sm">
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
