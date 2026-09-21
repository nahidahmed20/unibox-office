import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

/* ---------- Design tokens ---------- */
const fmt = (num) => Number(num || 0).toLocaleString('en-IN');
const darkInput = "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-white outline-none transition [color-scheme:dark] hover:bg-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 cursor-pointer";
const th = "px-5 py-3.5 text-[12.5px] font-semibold text-slate-500";
const Bn = ({ children }) => <span className="block text-[11.5px] font-medium text-slate-400">{children}</span>;

/* Defined outside the page so typing in search never remounts them */
const Toolbar = ({ placeholder, value, onChange, onCsv, onPrint }) => (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-[320px]">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"></i>
            <input
                type="text" placeholder={placeholder} value={value} onChange={onChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                <i className="fa-solid fa-file-csv text-emerald-500"></i> Export CSV
            </button>
            <button onClick={onPrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
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

const Tile = ({ label, bn, value, tone, op }) => (
    <div className="relative flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
        <span className="text-[11.5px] text-slate-400">{bn}</span>
        <span className={`mt-2 text-[20px] font-extrabold leading-none tabular-nums ${tone}`}>৳ {fmt(value)}</span>
        {op && <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[13px] font-bold text-slate-500 md:flex">{op}</span>}
    </div>
);

const MiniCard = ({ icon, label, bn, value, note, tone, className = "" }) => (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] ${tone.icon}`}><i className={icon}></i></span>
            <div>
                <p className="text-[14px] font-semibold text-slate-800">{label}</p>
                <p className="text-[12px] text-slate-400">{bn}</p>
            </div>
        </div>
        <p className={`mt-5 text-[30px] font-extrabold leading-none tracking-tight tabular-nums ${tone.value}`}>{value}</p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500">{note}</p>
    </div>
);

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
            <Head title="Financial Reports (আর্থিক প্রতিবেদন)"/>

            <style dangerouslySetInnerHTML={{__html: `
                .soft-scroll::-webkit-scrollbar { height: 8px; }
                .soft-scroll::-webkit-scrollbar-track { background: transparent; }
                .soft-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
            `}} />

            <div className="mx-auto mt-2 flex w-full max-w-[1600px] flex-col gap-6 px-2 pb-12">

                {/* Header with filters */}
                <div className="overflow-hidden rounded-2xl bg-slate-900 text-white">
                    <div className="px-6 py-6 sm:px-8 sm:py-7">
                        <h1 className="text-[28px] font-extrabold leading-none tracking-tight sm:text-[34px]">
                            Financial reports <span className="text-[20px] font-medium text-slate-400">(আর্থিক প্রতিবেদন)</span>
                        </h1>
                        <p className="mt-2 max-w-2xl text-[14px] text-slate-400">Track actual cash flow, market dues and monthly profitability. Pick a period below and the numbers update by themselves.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-white/[0.03] px-6 py-4 sm:px-8">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-400"><i className="fa-solid fa-calendar-days"></i> Period</span>
                        <select
                            value={filterYear}
                            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); setStartDate(''); setEndDate(''); }}
                            className={`${darkInput} w-[140px]`}
                        >
                            <option value="" className="text-slate-900">All years (সব)</option>
                            {years.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                        </select>
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
                            <button onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-rose-300 transition hover:bg-rose-500/10">
                                <i className="fa-solid fa-xmark"></i> Clear (মুছুন)
                            </button>
                        )}
                    </div>
                </div>

                {/* Hero: actual net profit */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2.5">
                                <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-[14px] ${profitable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><i className="fa-solid fa-chart-line"></i></span>
                                <h2 className="text-[18px] font-bold text-slate-900">Actual net profit <span className="font-medium text-slate-400">(আসল লাভ)</span></h2>
                            </div>
                            <p className="mt-3 text-[13.5px] leading-relaxed text-slate-500">
                                এটি আপনার ব্যবসার প্রকৃত লাভ। আপনি মোট কত টাকার কাজ (Invoice) করেছেন, তার থেকে ওই কাজগুলো করতে বা অফিস চালাতে আপনার মোট কত টাকার খরচ (Bills/Salary) হয়েছে— তার নিখুঁত হিসাব।
                            </p>
                        </div>
                        <p className={`text-[42px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[52px] ${profitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(summary.net_actual_profit) > 0 ? '+' : ''}৳ {fmt(summary.net_actual_profit)}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:px-8 md:grid-cols-5">
                        <Tile label="Total invoiced" bn="(আয়)" value={summary.accrual_revenue} tone="text-blue-700" op="−" />
                        <Tile label="Project bills" bn="(প্রজেক্ট খরচ)" value={summary.accrual_project_cost} tone="text-rose-600" op="−" />
                        <Tile label="Office expenses" bn="(অফিস খরচ)" value={summary.accrual_office_cost} tone="text-rose-600" op="−" />
                        <Tile label="Salaries" bn="(বেতন)" value={summary.accrual_salary_cost} tone="text-rose-600" op="=" />
                        <div className={`col-span-2 flex flex-col justify-center rounded-xl p-4 text-white md:col-span-1 ${profitable ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                            <span className="text-[12.5px] font-semibold text-white/80">Net profit</span>
                            <span className="text-[11.5px] text-white/60">(নীট লাভ)</span>
                            <span className="mt-2 text-[22px] font-extrabold leading-none tabular-nums">৳ {fmt(summary.net_actual_profit)}</span>
                        </div>
                    </div>
                </section>

                {/* Cash flow and market dues */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <MiniCard
                        className="lg:col-span-2"
                        icon="fa-solid fa-money-bill-transfer" label="Net cash flow" bn="(হাতে থাকা ক্যাশ)"
                        value={`${Number(summary.net_cash_flow) > 0 ? '+' : ''}৳ ${fmt(summary.net_cash_flow)}`}
                        note="টোটাল যত টাকা ক্যাশ ঢুকেছে তার থেকে টোটাল যত টাকা ক্যাশ বের হয়েছে তার বিয়োগফল।"
                        tone={cashPositive ? { icon: 'bg-violet-50 text-violet-600', value: 'text-violet-700' } : { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-700' }}
                    />
                    <MiniCard
                        icon="fa-solid fa-file-invoice-dollar" label="Market receivables" bn="(পাওনা টাকা)"
                        value={`৳ ${fmt(summary.client_due)}`} note="ক্লায়েন্টদের কাছে মোট পাওনা।"
                        tone={{ icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' }}
                    />
                    <MiniCard
                        icon="fa-solid fa-file-signature" label="Market payables" bn="(দেনা/বকেয়া)"
                        value={`৳ ${fmt(summary.vendor_due)}`} note="ভেন্ডরদের মোট পরিশোধযোগ্য বকেয়া।"
                        tone={{ icon: 'bg-rose-50 text-rose-600', value: 'text-rose-700' }}
                    />
                </div>

                {/* Tabs and tables */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2 sm:px-6">
                        {[
                            ['profit_loss', 'fa-solid fa-users', 'Client-wise summary', '(ক্লায়েন্ট রিপোর্ট)'],
                            ['monthly', 'fa-regular fa-calendar-days', 'Project accrual', '(প্রজেক্ট রিপোর্ট)'],
                        ].map(([id, icon, label, bn]) => (
                            <button
                                key={id} onClick={() => setActiveTab(id)}
                                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-[14px] font-semibold transition ${activeTab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <i className={`${icon} text-[13px]`}></i>{label}<span className="hidden font-medium text-slate-400 sm:inline">{bn}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: client-wise */}
                    {activeTab === 'profit_loss' && (
                        <div style={{ animation: 'fadeIn .2s ease-out' }}>
                            <Toolbar
                                placeholder="Search client (ক্লায়েন্ট খুঁজুন)…" value={searchClient}
                                onChange={(e) => setSearchClient(e.target.value)} onCsv={exportClientCSV}
                                onPrint={() => handlePrint('client-report-table', 'Client-Wise Profitability Report')}
                            />

                            <div className="soft-scroll overflow-x-auto">
                                <table id="client-report-table" className="w-full min-w-[1200px] whitespace-nowrap border-collapse text-left">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className={th}>Client name<Bn>(ক্লায়েন্টের নাম)</Bn></th>
                                            <th className={`${th} text-center`}>Projects<Bn>(প্রজেক্টস)</Bn></th>
                                            <th className={`${th} text-right`}>Project budget<Bn>(বাজেট)</Bn></th>
                                            <th className={`${th} text-right`}>Project cost<Bn>(খরচ)</Bn></th>
                                            <th className={`${th} border-l border-slate-200 text-center`}>Invoices<Bn>(ইনভয়েস)</Bn></th>
                                            <th className={`${th} text-right`}>Total billed<Bn>(মোট বিল)</Bn></th>
                                            <th className={`${th} bg-emerald-50/60 text-right`}>Received<Bn>(প্রাপ্তি)</Bn></th>
                                            <th className={`${th} bg-rose-50/60 text-right`}>Net due<Bn>(বকেয়া)</Bn></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[13.5px] text-slate-800">
                                        {filteredClients.length > 0 ? filteredClients.map((client) => (
                                            <tr key={client.client_name} className="transition-colors hover:bg-slate-50/70">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-bold uppercase text-indigo-700">
                                                            {(client.client_name || '?').charAt(0)}
                                                        </span>
                                                        <span className="font-bold text-slate-900">{client.client_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="inline-flex min-w-[32px] justify-center rounded-md bg-slate-100 px-2 py-1 text-[12px] font-bold tabular-nums text-slate-700">{fmt(client.total_projects)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-blue-600">৳ {fmt(client.total_budget)}</td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-orange-500">৳ {fmt(client.total_expense)}</td>
                                                <td className="border-l border-slate-100 px-5 py-4 text-center">
                                                    <span className="inline-flex min-w-[32px] justify-center rounded-md bg-violet-50 px-2 py-1 text-[12px] font-bold tabular-nums text-violet-700">{fmt(client.total_invoices)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold tabular-nums text-violet-700">৳ {fmt(client.total_billed)}</td>
                                                <td className="bg-emerald-50/30 px-5 py-4 text-right font-bold tabular-nums text-emerald-600">৳ {fmt(client.total_paid)}</td>
                                                <td className={`bg-rose-50/30 px-5 py-4 text-right text-[14.5px] font-extrabold tabular-nums ${Number(client.total_due) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>৳ {fmt(client.total_due)}</td>
                                            </tr>
                                        )) : <EmptyRow cols={8} icon="fa-solid fa-users-slash" text="No clients found for this period." />}
                                    </tbody>
                                    {filteredClients.length > 0 && (
                                        <tfoot className="border-t-2 border-slate-300 bg-slate-100 text-[13.5px] font-extrabold text-slate-800">
                                            <tr>
                                                <td className="px-5 py-4">Grand total<Bn>(সর্বমোট)</Bn></td>
                                                <td className="px-5 py-4 text-center tabular-nums">{fmt(clientTotals.total_projects)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums">৳ {fmt(clientTotals.total_budget)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums">৳ {fmt(clientTotals.total_expense)}</td>
                                                <td className="px-5 py-4 text-center tabular-nums">{fmt(clientTotals.total_invoices)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums">৳ {fmt(clientTotals.total_billed)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-emerald-700">৳ {fmt(clientTotals.total_paid)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-rose-700">৳ {fmt(clientTotals.total_due)}</td>
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
                                placeholder="Search month (মাস খুঁজুন)…" value={searchMonth}
                                onChange={(e) => setSearchMonth(e.target.value)} onCsv={exportMonthlyCSV}
                                onPrint={() => handlePrint('monthly-report-table', 'Monthly Projects Report')}
                            />

                            <div className="soft-scroll overflow-x-auto">
                                <table id="monthly-report-table" className="w-full min-w-[950px] whitespace-nowrap border-collapse text-left">
                                    {filteredMonths.length > 0 ? filteredMonths.map((data) => (
                                        <React.Fragment key={data.month}>
                                            <thead>
                                                <tr className="month-header bg-slate-900 text-white">
                                                    <th colSpan="5" className="px-5 py-3.5 text-[14px] font-bold">
                                                        <div className="flex items-center gap-2.5"><i className="fa-regular fa-calendar-days text-indigo-300"></i>{data.month}</div>
                                                    </th>
                                                </tr>
                                                <tr className="border-b border-slate-200 bg-slate-50">
                                                    <th className={th}>Project name<Bn>(প্রজেক্টের নাম)</Bn></th>
                                                    <th className={th}>Client<Bn>(ক্লায়েন্ট)</Bn></th>
                                                    <th className={`${th} text-right`}>Budget<Bn>(বাজেট)</Bn></th>
                                                    <th className={`${th} text-right`}>Cost<Bn>(খরচ)</Bn></th>
                                                    <th className={`${th} text-right`}>Est. profit<Bn>(সম্ভাব্য লাভ)</Bn></th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[13.5px] text-slate-800">
                                                {data.projects.map((proj, pIdx) => (
                                                    <tr key={pIdx} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500"><i className="fa-solid fa-briefcase text-[11px]"></i></span>
                                                                {proj.title}
                                                                {proj.status === 'completed' && (
                                                                    <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Completed
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 font-medium text-slate-600">{proj.client}</td>
                                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-blue-600">৳ {fmt(proj.budget)}</td>
                                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-orange-500">৳ {fmt(proj.expense)}</td>
                                                        <td className={`px-5 py-4 text-right font-extrabold tabular-nums ${Number(proj.profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {Number(proj.profit) > 0 ? '+' : ''}৳ {fmt(proj.profit)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="summary-row border-b-4 border-slate-200 bg-slate-50">
                                                    <td colSpan="2" className="px-5 py-4 text-right text-[13px] font-semibold text-slate-500">
                                                        Summary for {data.month} <span className="text-slate-400">(সারসংক্ষেপ)</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right text-[14.5px] font-extrabold tabular-nums text-blue-700">৳ {fmt(data.month_budget)}</td>
                                                    <td className="px-5 py-4 text-right text-[14.5px] font-extrabold tabular-nums text-orange-600">৳ {fmt(data.month_expense)}</td>
                                                    <td className={`px-5 py-4 text-right text-[16px] font-extrabold tabular-nums ${Number(data.month_profit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {Number(data.month_profit) > 0 ? '+' : ''}৳ {fmt(data.month_profit)}
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
                                                <td colSpan="2" className="px-5 py-4 text-right">Overall grand total <span className="font-medium text-slate-400">(সর্বমোট)</span></td>
                                                <td className="px-5 py-4 text-right tabular-nums text-blue-300">৳ {fmt(monthlyReportTotals.budget)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums text-orange-300">৳ {fmt(monthlyReportTotals.expense)}</td>
                                                <td className={`px-5 py-4 text-right tabular-nums ${monthlyReportTotals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {monthlyReportTotals.profit > 0 ? '+' : ''}৳ {fmt(monthlyReportTotals.profit)}
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
