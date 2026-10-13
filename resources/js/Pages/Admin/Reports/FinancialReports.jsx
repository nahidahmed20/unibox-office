import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';

/* ---------- Design tokens ---------- */
const fmt = (num) => Number(num || 0).toLocaleString('en-IN');
const darkInput = "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-white outline-none transition [color-scheme:dark] hover:bg-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 cursor-pointer";
const th = "px-5 py-3.5 text-[12.5px] font-semibold text-slate-500";

// 🟢 Custom Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

/* ---------- Reusable Components ---------- */
const Toolbar = ({ placeholder, value, onChange, onCsv, onPrint }) => (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between no-print">
        <div className="relative w-full md:w-[320px]">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"></i>
            <input
                type="text" placeholder={placeholder} value={value} onChange={onChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
            />
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 shadow-sm">
                <i className="fa-solid fa-file-csv text-emerald-500"></i> Export CSV
            </button>
            <button onClick={onPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 shadow-sm">
                <i className="fa-solid fa-print text-slate-400"></i> Print / PDF
            </button>
        </div>
    </div>
);

const EmptyRow = ({ cols, icon, text }) => (
    <tr>
        <td colSpan={cols} className="px-6 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400"><i className={icon}></i></span>
            <p className="text-[14.5px] font-semibold text-slate-700">{text}</p>
        </td>
    </tr>
);

const Tile = ({ label, sub, value, tone, op }) => (
    <div className="relative flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
        {sub && <span className="text-[11.5px] text-slate-400">{sub}</span>}
        <span className={`mt-2 text-[20px] font-extrabold leading-none tabular-nums ${tone}`}><Taka className="text-[15px]" />{fmt(value)}</span>
        {op && <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[13px] font-bold text-slate-500 md:flex shadow-sm">{op}</span>}
    </div>
);

const MiniCard = ({ icon, label, sub, value, note, tone, className = "" }) => (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] ${tone.icon}`}><i className={icon}></i></span>
            <div>
                <p className="text-[14px] font-semibold text-slate-800">{label}</p>
                {sub && <p className="text-[12px] text-slate-400">{sub}</p>}
            </div>
        </div>
        <p className={`mt-5 text-[30px] font-extrabold leading-none tracking-tight tabular-nums ${tone.value}`}>{value}</p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500">{note}</p>
    </div>
);

/* ---------- Main Component ---------- */
export default function FinancialReports({ clientsReport = [], monthlyReport = [], summary = {}, filters = {} }) {
    /* State management */
    const [activeTab, setActiveTab] = useState('profit_loss');
    const [searchClient, setSearchClient] = useState('');
    const [searchMonth, setSearchMonth] = useState('');

    // Date filters state
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [filterYear, setFilterYear] = useState(filters.year || '');
    const [filterMonth, setFilterMonth] = useState(filters.month || '');

    const isFirstRender = useRef(true);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, index) => currentYear - 5 + index).sort((a, b) => b - a);

    /* Automatic filtering */
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (filterYear) params.year = filterYear;
            if (filterMonth) params.month = filterMonth;

            router.get(route('admin.reports.financial'), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [startDate, endDate, filterYear, filterMonth]);

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setFilterYear('');
        setFilterMonth('');
    };

    /* Export helpers */
    const handlePrint = (elementId, title) => {
        const tableContent = document.getElementById(elementId);
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                        .month-header { background-color: #1e293b !important; color: #fff !important; }
                        .month-header th { color: #fff !important; background-color: #1e293b !important; }
                        .summary-row td { background-color: #f1f5f9 !important; font-weight: bold; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportClientCSV = () => {
        if (!filteredClients.length) return Swal.fire("Empty!", "No data to export", "warning");

        let headers = "Client Name,Total Projects,Project Budget,Project Cost (Expenses),Invoices Generated,Total Billed,Received (Paid),Net Due\n";
        let rows = filteredClients.map(c => `"${c.client_name}","${c.total_projects}","${c.total_budget}","${c.total_expense}","${c.total_invoices}","${c.total_billed}","${c.total_paid}","${c.total_due}"`).join("\n");

        downloadCSV(headers + rows, `Client_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const exportMonthlyCSV = () => {
        if (!filteredMonths.length) return Swal.fire("Empty!", "No data to export", "warning");

        let headers = "Month,Project Name,Client,Budget,Cost (Expenses),Est. Profit,Status\n";
        let rows = [];
        filteredMonths.forEach(m => {
            m.projects.forEach(p => {
                rows.push(`"${m.month}","${p.title}","${p.client}","${p.budget}","${p.expense}","${p.profit}","${p.status}"`);
            });
            rows.push(`"Summary for ${m.month}",,, "${m.month_budget}","${m.month_expense}","${m.month_profit}",""`);
        });

        downloadCSV(headers + rows.join("\n"), `Monthly_Projects_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    /* Computed data and totals */
    const filteredClients = clientsReport.filter(c => (c.client_name || '').toLowerCase().includes(searchClient.toLowerCase()));
    const filteredMonths = monthlyReport.filter(m => (m.month || '').toLowerCase().includes(searchMonth.toLowerCase()));

    const clientTotals = filteredClients.reduce((totals, row) => {
        ['total_projects', 'total_budget', 'total_expense', 'total_invoices', 'total_billed', 'total_paid', 'total_due'].forEach(key => { totals[key] += Number(row[key] || 0); });
        return totals;
    }, { total_projects: 0, total_budget: 0, total_expense: 0, total_invoices: 0, total_billed: 0, total_paid: 0, total_due: 0 });

    const monthlyReportTotals = filteredMonths.reduce((totals, m) => {
        totals.budget += Number(m.month_budget || 0);
        totals.expense += Number(m.month_expense || 0);
        totals.profit += Number(m.month_profit || 0);
        return totals;
    }, { budget: 0, expense: 0, profit: 0 });

    const profitable = Number(summary.net_actual_profit) >= 0;
    const cashPositive = Number(summary.net_cash_flow) >= 0;
    const hasFilters = startDate || endDate || filterYear || filterMonth;

    return (
        <AdminLayout>
            <Head title="Financial Reports"/>

            <style dangerouslySetInnerHTML={{__html: `
                .soft-scroll::-webkit-scrollbar { height: 8px; }
                .soft-scroll::-webkit-scrollbar-track { background: transparent; }
                .soft-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
            `}} />

            <div className="mx-auto mt-2 flex w-full max-w-[1600px] flex-col gap-6 px-4 sm:px-6 lg:px-8 pb-12">

                {/* Header with filters */}
                <div className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
                    <div className="px-6 py-6 sm:px-8 sm:py-8 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none translate-x-10 -translate-y-10"></div>
                        <h1 className="text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px] relative z-10">
                            Financial Reports
                        </h1>
                        <p className="mt-2.5 max-w-2xl text-[14px] text-slate-400 relative z-10">Track actual cash flow, market dues and monthly profitability. Pick a period below and the numbers update automatically.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-white/[0.03] px-6 py-4 sm:px-8 relative z-10">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-slate-400"><i className="fa-solid fa-calendar-days"></i> Period</span>
                        <CustomSelect
                            value={filterYear}
                            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); setStartDate(''); setEndDate(''); }}
                            className={`${darkInput} w-[140px]`}
                        >
                            <option value="" className="text-slate-900 font-bold">All Years</option>
                            {years.map(y => <option key={y} value={y} className="text-slate-900 font-bold">{y}</option>)}
                        </CustomSelect>
                        <input
                            type="month" value={filterMonth}
                            onChange={(e) => { setFilterMonth(e.target.value); setFilterYear(''); setStartDate(''); setEndDate(''); }}
                            className={darkInput} title="Filter by month"
                        />
                        <span className="hidden h-6 w-px bg-white/10 md:block"></span>
                        <div className="flex items-center gap-2">
                            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterYear(''); setFilterMonth(''); }} className={darkInput} />
                            <span className="text-slate-500">–</span>
                            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterYear(''); setFilterMonth(''); }} className={darkInput} />
                        </div>
                        {hasFilters && (
                            <button onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200">
                                <i className="fa-solid fa-xmark"></i> Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Hero: actual net profit */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
                    <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2.5">
                                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-[16px] shadow-sm border ${profitable ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}><i className="fa-solid fa-chart-line"></i></span>
                                <h2 className="text-[20px] font-black text-slate-900">Actual Net Profit</h2>
                            </div>
                            <p className="mt-3 text-[14px] font-medium leading-relaxed text-slate-500">
                                Accrual-based business net profit calculated by deducting all project costs, office overheads, and salaries from total invoiced revenue.
                            </p>
                        </div>
                        <div className="lg:text-right bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                            <span className="block text-[12px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Net Income</span>
                            <p className={`text-[42px] font-black leading-none tracking-tight tabular-nums sm:text-[52px] ${profitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {Number(summary.net_actual_profit) > 0 ? '+' : ''}<Taka className="text-[28px] sm:text-[34px]" />{fmt(summary.net_actual_profit)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-slate-50/50 p-5 sm:px-8 md:grid-cols-5">
                        <Tile label="Total Invoiced" sub="(Revenue)" value={summary.accrual_revenue} tone="text-blue-700" op="−" />
                        <Tile label="Project Bills" sub="(Direct Costs)" value={summary.accrual_project_cost} tone="text-rose-600" op="−" />
                        <Tile label="Office Expenses" sub="(Overheads)" value={summary.accrual_office_cost} tone="text-rose-600" op="−" />
                        <Tile label="Salaries" sub="(Payroll)" value={summary.accrual_salary_cost} tone="text-rose-600" op="=" />
                        <div className={`col-span-2 flex flex-col justify-center rounded-2xl p-5 text-white md:col-span-1 shadow-md relative overflow-hidden ${profitable ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-rose-500 to-rose-700'}`}>
                            <div className="absolute right-0 top-0 h-20 w-20 bg-white/10 blur-xl rounded-full translate-x-5 -translate-y-5"></div>
                            <span className="text-[13px] font-bold text-white/90 uppercase tracking-widest relative z-10">Net Profit</span>
                            <span className="text-[11.5px] font-medium text-white/70 relative z-10">(Net Income)</span>
                            <span className="mt-2 text-[26px] font-black leading-none tabular-nums relative z-10"><Taka className="text-[18px]" />{fmt(summary.net_actual_profit)}</span>
                        </div>
                    </div>
                </section>

                {/* Cash flow and market dues */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <MiniCard
                        className="lg:col-span-2"
                        icon="fa-solid fa-money-bill-transfer" label="Net cash flow" sub="(Cash in hand)"
                        value={`${Number(summary.net_cash_flow) > 0 ? '+' : ''}৳ ${fmt(summary.net_cash_flow)}`}
                        note="Net cash flow: Total cash received minus total cash disbursed."
                        tone={cashPositive ? { icon: 'bg-violet-100 text-violet-700 border border-violet-200', value: 'text-violet-700' } : { icon: 'bg-slate-100 text-slate-600 border border-slate-200', value: 'text-slate-700' }}
                    />
                    <MiniCard
                        icon="fa-solid fa-file-invoice-dollar" label="Market receivables" sub="(Client Dues)"
                        value={`৳ ${fmt(summary.client_due)}`} note="Total outstanding balance receivable from clients."
                        tone={{ icon: 'bg-amber-100 text-amber-700 border border-amber-200', value: 'text-amber-700' }}
                    />
                    <MiniCard
                        icon="fa-solid fa-file-signature" label="Market payables" sub="(Vendor Dues)"
                        value={`৳ ${fmt(summary.vendor_due)}`} note="Total outstanding payables due to suppliers and vendors."
                        tone={{ icon: 'bg-rose-100 text-rose-700 border border-rose-200', value: 'text-rose-700' }}
                    />
                </div>

                {/* Tabs and tables */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
                    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-3 sm:px-6 no-print">
                        {[
                            ['profit_loss', 'fa-solid fa-users', 'Client-wise summary', '(Client Report)'],
                            ['monthly', 'fa-regular fa-calendar-days', 'Project accrual', '(Project Report)'],
                        ].map(([id, icon, label, sub]) => (
                            <button
                                key={id} onClick={() => setActiveTab(id)}
                                className={`-mb-px flex shrink-0 items-center gap-2 border-b-[3px] px-5 py-3.5 text-[14.5px] font-bold transition-all ${activeTab === id ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-[0_-2px_10px_rgba(0,0,0,0.02)]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-xl'}`}
                            >
                                <i className={`${icon} text-[13px]`}></i>{label}<span className="hidden font-semibold text-slate-400 sm:inline">{sub}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: client-wise */}
                    {activeTab === 'profit_loss' && (
                        <div style={{ animation: 'fadeIn .2s ease-out' }}>
                            <Toolbar
                                placeholder="Search client…" value={searchClient}
                                onChange={(e) => setSearchClient(e.target.value)} onCsv={exportClientCSV}
                                onPrint={() => handlePrint('client-report-table', 'Client-Wise Profitability Report')}
                            />

                            <div className="soft-scroll overflow-x-auto pb-4">
                                <table id="client-report-table" className="w-full min-w-[1200px] whitespace-nowrap border-collapse text-left">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className={th}>Client name</th>
                                            <th className={`${th} text-center`}>Projects</th>
                                            <th className={`${th} text-right`}>Project budget</th>
                                            <th className={`${th} text-right`}>Project cost</th>
                                            <th className={`${th} border-l border-slate-200 text-center`}>Invoices</th>
                                            <th className={`${th} text-right`}>Total billed</th>
                                            <th className={`${th} bg-emerald-50/60 text-right`}>Received</th>
                                            <th className={`${th} bg-rose-50/60 text-right`}>Net due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[13.5px] text-slate-800">
                                        {filteredClients.length > 0 ? filteredClients.map((client) => (
                                            <tr key={client.client_name} className="transition-colors hover:bg-slate-50/70">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-[14px] font-black uppercase text-indigo-700 shadow-sm">
                                                            {(client.client_name || '?').charAt(0)}
                                                        </span>
                                                        <span className="font-bold text-slate-900">{client.client_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="inline-flex min-w-[32px] justify-center rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[12px] font-bold tabular-nums text-slate-700 shadow-sm">{fmt(client.total_projects)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-blue-600"><Taka className="opacity-60" /> {fmt(client.total_budget)}</td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-orange-500"><Taka className="opacity-60" /> {fmt(client.total_expense)}</td>
                                                <td className="border-l border-slate-100 px-5 py-4 text-center">
                                                    <span className="inline-flex min-w-[32px] justify-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[12px] font-bold tabular-nums text-violet-700 shadow-sm">{fmt(client.total_invoices)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-violet-700"><Taka className="opacity-60" /> {fmt(client.total_billed)}</td>
                                                <td className="bg-emerald-50/30 px-5 py-4 text-right font-bold tabular-nums text-emerald-600"><Taka className="opacity-60" /> {fmt(client.total_paid)}</td>
                                                <td className={`bg-rose-50/30 px-5 py-4 text-right text-[14.5px] font-extrabold tabular-nums ${Number(client.total_due) > 0 ? 'text-rose-600' : 'text-slate-400'}`}><Taka className="opacity-60" /> {fmt(client.total_due)}</td>
                                            </tr>
                                        )) : <EmptyRow cols={8} icon="fa-solid fa-users-slash" text="No clients found for this period." />}
                                    </tbody>
                                    {filteredClients.length > 0 && (
                                        <tfoot className="border-t-4 border-slate-200 bg-slate-100 text-[13.5px] font-extrabold text-slate-800">
                                            <tr>
                                                <td className="px-5 py-4 uppercase tracking-wider text-[12px] text-slate-500">Grand Total</td>
                                                <td className="px-5 py-4 text-center tabular-nums text-[15px]">{fmt(clientTotals.total_projects)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-[15px]"><Taka className="text-[12px] opacity-70" /> {fmt(clientTotals.total_budget)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-[15px]"><Taka className="text-[12px] opacity-70" /> {fmt(clientTotals.total_expense)}</td>
                                                <td className="px-5 py-4 text-center tabular-nums text-[15px]">{fmt(clientTotals.total_invoices)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-[15px]"><Taka className="text-[12px] opacity-70" /> {fmt(clientTotals.total_billed)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-emerald-700 text-[15px]"><Taka className="text-[12px] opacity-70" /> {fmt(clientTotals.total_paid)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-rose-700 text-[15px]"><Taka className="text-[12px] opacity-70" /> {fmt(clientTotals.total_due)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: monthly project accrual */}
                    {activeTab === 'monthly' && (
                        <div style={{ animation: 'fadeIn .2s ease-out' }}>
                            <Toolbar
                                placeholder="Search month…" value={searchMonth}
                                onChange={(e) => setSearchMonth(e.target.value)} onCsv={exportMonthlyCSV}
                                onPrint={() => handlePrint('monthly-report-table', 'Monthly Projects Report')}
                            />

                            <div className="soft-scroll overflow-x-auto pb-4">
                                <table id="monthly-report-table" className="w-full min-w-[950px] whitespace-nowrap border-collapse text-left">
                                    {filteredMonths.length > 0 ? filteredMonths.map((data) => (
                                        <React.Fragment key={data.month}>
                                            <thead>
                                                <tr className="month-header bg-slate-900 text-white">
                                                    <th colSpan="5" className="px-6 py-4 text-[15px] font-black uppercase tracking-widest">
                                                        <div className="flex items-center gap-3"><i className="fa-regular fa-calendar-days text-indigo-400 text-lg"></i>{data.month}</div>
                                                    </th>
                                                </tr>
                                                <tr className="border-b border-slate-200 bg-slate-100">
                                                    <th className={th}>Project Name</th>
                                                    <th className={th}>Client</th>
                                                    <th className={`${th} text-right`}>Budget</th>
                                                    <th className={`${th} text-right`}>Cost</th>
                                                    <th className={`${th} text-right`}>Est. Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[13.5px] text-slate-800">
                                                {data.projects.map((proj, pIdx) => (
                                                    <tr key={pIdx} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3 font-bold text-slate-900">
                                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"><i className="fa-solid fa-briefcase text-[12px]"></i></span>
                                                                {proj.title}
                                                                {proj.status === 'completed' && (
                                                                    <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Done
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-600">{proj.client}</td>
                                                        <td className="px-6 py-4 text-right font-bold tabular-nums text-blue-600"><Taka className="opacity-60" /> {fmt(proj.budget)}</td>
                                                        <td className="px-6 py-4 text-right font-bold tabular-nums text-orange-500"><Taka className="opacity-60" /> {fmt(proj.expense)}</td>
                                                        <td className={`px-6 py-4 text-right font-extrabold tabular-nums ${Number(proj.profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {Number(proj.profit) > 0 ? '+' : ''}<Taka className="opacity-60" /> {fmt(proj.profit)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="summary-row border-b-[6px] border-slate-200 bg-slate-50">
                                                    <td colSpan="2" className="px-6 py-4 text-right text-[13px] font-bold uppercase tracking-widest text-slate-500">
                                                        Summary for {data.month}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-[15px] font-extrabold tabular-nums text-blue-700"><Taka className="text-[12px] opacity-70" /> {fmt(data.month_budget)}</td>
                                                    <td className="px-6 py-4 text-right text-[15px] font-extrabold tabular-nums text-orange-600"><Taka className="text-[12px] opacity-70" /> {fmt(data.month_expense)}</td>
                                                    <td className={`px-6 py-4 text-right text-[16px] font-extrabold tabular-nums ${Number(data.month_profit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {Number(data.month_profit) > 0 ? '+' : ''}<Taka className="text-[12px] opacity-70" /> {fmt(data.month_profit)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </React.Fragment>
                                    )) : (
                                        <tbody><EmptyRow cols={5} icon="fa-regular fa-calendar-xmark" text="No monthly records found." /></tbody>
                                    )}

                                    {filteredMonths.length > 0 && (
                                        <tfoot className="bg-slate-900 text-[13.5px] font-extrabold text-white">
                                            <tr>
                                                <td colSpan="2" className="px-6 py-5 text-right uppercase tracking-widest text-[12.5px] text-slate-300">Overall Grand Total</td>
                                                <td className="px-6 py-5 text-right tabular-nums text-[16px] text-blue-300"><Taka className="text-[12px] opacity-70" /> {fmt(monthlyReportTotals.budget)}</td>
                                                <td className="px-6 py-5 text-right tabular-nums text-[16px] text-orange-300"><Taka className="text-[12px] opacity-70" /> {fmt(monthlyReportTotals.expense)}</td>
                                                <td className={`px-6 py-5 text-right tabular-nums text-[18px] ${monthlyReportTotals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {monthlyReportTotals.profit > 0 ? '+' : ''}<Taka className="text-[14px] opacity-70" /> {fmt(monthlyReportTotals.profit)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
