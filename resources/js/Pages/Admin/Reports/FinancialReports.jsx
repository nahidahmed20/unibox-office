import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function FinancialReports({ clientsReport = [], monthlyReport = [], monthlyProfitLoss = [], summary = {}, filters = {} }) {
    /* State Management */
    const [activeTab, setActiveTab] = useState('profit_loss');
    const [searchClient, setSearchClient] = useState('');
    const [searchMonth, setSearchMonth] = useState('');

    // Date Filters State
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [filterYear, setFilterYear] = useState(filters.year || '');
    const [filterMonth, setFilterMonth] = useState(filters.month || '');

    const isFirstRender = useRef(true);

    // Get unique years for the dropdown
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, index) => currentYear - 5 + index).sort((a, b) => b - a);

    /* 🟢 AUTOMATIC Filtering & Reload Logic */
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

    /* Export Helpers */
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
        let rows = filteredClients.map(c => {
            return `"${c.client_name}","${c.total_projects}","${c.total_budget}","${c.total_expense}","${c.total_invoices}","${c.total_billed}","${c.total_paid}","${c.total_due}"`;
        }).join("\n");

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

    /* Computed Data & Totals */
    const filteredClients = clientsReport.filter(c =>
        (c.client_name || '').toLowerCase().includes(searchClient.toLowerCase())
    );

    const filteredMonths = monthlyReport.filter(m =>
        (m.month || '').toLowerCase().includes(searchMonth.toLowerCase())
    );

    const profitLossTotals = monthlyProfitLoss.reduce((totals, row) => {
        ['cash_in', 'cash_out', 'net_cash_flow', 'billed_revenue', 'office_expense', 'salary_expense', 'project_cost'].forEach(key => { totals[key] += Number(row[key] || 0); });
        return totals;
    }, { cash_in: 0, cash_out: 0, net_cash_flow: 0, billed_revenue: 0, office_expense: 0, salary_expense: 0, project_cost: 0 });

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

    const Taka = () => <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }} className="mr-1 opacity-70 text-[18px]">৳</span>;
    const fmt = (num) => Number(num || 0).toLocaleString('en-IN');

    return (
        <AdminLayout>
            <Head title="Financial Reports (আর্থিক প্রতিবেদন)"/>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2 px-2">

                {/* 🟢 Header & Auto-Triggering Date Filters */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Business Analytics (বিজনেস অ্যানালিটিক্স)
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Financial Reports <span className="text-gray-400 font-medium text-[20px]">(আর্থিক প্রতিবেদন)</span></h1>
                        <p className="text-[14px] text-gray-500 mt-1.5 max-w-lg">Track Actual Cash Flow, Market Dues, and Monthly Profitability.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-calendar-days text-[13px]"></i>
                            </div>
                            <select
                                value={filterYear}
                                onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); setStartDate(''); setEndDate(''); }}
                                className="appearance-none w-[125px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-semibold outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            >
                                <option value="">All Years (সব)</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <input
                            type="month"
                            value={filterMonth}
                            onChange={(e) => { setFilterMonth(e.target.value); setFilterYear(''); setStartDate(''); setEndDate(''); }}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-semibold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                            title="Filter by month"
                        />

                        <div className="h-8 w-px bg-gray-200 hidden md:block mx-1"></div>

                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setFilterYear(''); setFilterMonth(''); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            />
                            <span className="text-gray-400 font-bold">–</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setFilterYear(''); setFilterMonth(''); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            />
                        </div>

                        {(startDate || endDate || filterYear || filterMonth) && (
                            <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-100 ml-1">
                                <i className="fa-solid fa-xmark"></i> Clear (মুছুন)
                            </button>
                        )}
                    </div>
                </div>

                {/* 🟢 Top 4 Cards: Cash Flow Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Card 1 */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <i className="fa-solid fa-vault absolute -right-4 -bottom-4 text-[80px] text-blue-100 opacity-50"></i>
                        <div className="flex items-center gap-2.5 text-blue-600 mb-1 relative z-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100"><i className="fa-solid fa-building-columns text-[16px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600/80">Total Liquid Funds <span className="normal-case opacity-80 font-medium">(মোট তরল সম্পদ)</span></p>
                        </div>
                        <h3 className="text-[26px] font-black text-blue-800 m-0 tabular-nums tracking-tight relative z-10">৳ {fmt(summary.total_liquid_funds)}</h3>
                        <p className="text-[11px] text-blue-600 font-bold relative z-10">
                            Bank: ৳ {fmt(summary.account_balance)} | Staff Adv: ৳ {fmt(summary.staff_advance)} | Vendor Adv: ৳ {fmt(summary.vendor_advance)}
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <i className="fa-solid fa-arrow-down-to-bracket absolute -right-4 -bottom-4 text-[80px] text-emerald-100 opacity-50"></i>
                        <div className="flex items-center gap-2.5 text-emerald-600 mb-1 relative z-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100"><i className="fa-solid fa-money-bill-trend-up text-[16px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/80">Total Cash In <span className="normal-case opacity-80 font-medium">(মোট আয়/প্রাপ্তি)</span></p>
                        </div>
                        <h3 className="text-[26px] font-black text-emerald-800 m-0 tabular-nums tracking-tight relative z-10">৳ {fmt(summary.total_cash_in)}</h3>
                        <p className="text-[11px] text-emerald-600 font-bold relative z-10">
                            Inv Paid: ৳ {fmt(summary.total_invoice_received)} | Client Adv: ৳ {fmt(summary.total_client_advance)}
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <i className="fa-solid fa-arrow-right-from-bracket absolute -right-4 -bottom-4 text-[80px] text-rose-100 opacity-50"></i>
                        <div className="flex items-center gap-2.5 text-rose-600 mb-1 relative z-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><i className="fa-solid fa-money-bill-transfer text-[16px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/80">Total Cash Out <span className="normal-case opacity-80 font-medium">(মোট খরচ)</span></p>
                        </div>
                        <h3 className="text-[26px] font-black text-rose-800 m-0 tabular-nums tracking-tight relative z-10">৳ {fmt(summary.total_cash_out)}</h3>
                        <p className="text-[11px] text-rose-600 font-bold relative z-10">
                            Proj: ৳ {fmt(summary.total_project_paid)} | Office: ৳ {fmt(summary.total_office_expense)} | Salary: ৳ {fmt(summary.total_salary_paid)}
                        </p>
                    </div>

                    {/* Card 4 */}
                    <div className={`flex flex-col gap-2 rounded-3xl border p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${Number(summary.net_cash_flow) >= 0 ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 bg-gray-100'}`}>
                        <i className="fa-solid fa-scale-balanced absolute -right-4 -bottom-4 text-[80px] opacity-10 text-purple-600"></i>
                        <div className={`flex items-center gap-2.5 mb-1 relative z-10 ${Number(summary.net_cash_flow) >= 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${Number(summary.net_cash_flow) >= 0 ? 'bg-purple-100' : 'bg-gray-200'}`}>
                                <i className="fa-solid fa-chart-line text-[16px]"></i>
                            </div>
                            <p className="text-[11.5px] font-bold uppercase tracking-wider opacity-80">Net Cash Flow <span className="normal-case opacity-80 font-medium">(নীট লাভ)</span></p>
                        </div>
                        <h3 className={`text-[26px] font-black m-0 tabular-nums tracking-tight relative z-10 ${Number(summary.net_cash_flow) >= 0 ? 'text-purple-800' : 'text-gray-800'}`}>
                            {Number(summary.net_cash_flow) > 0 ? '+' : ''}৳ {fmt(summary.net_cash_flow)}
                        </h3>
                        <p className={`text-[12px] font-medium relative z-10 ${Number(summary.net_cash_flow) >= 0 ? 'text-purple-600' : 'text-gray-500'}`}>সব খরচ বাদে পকেটে থাকা আসল ক্যাশ।</p>
                    </div>
                </div>

                {/* 🟢 NEW: 2 Market Due Cards (Receivables & Payables) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Receivables Card */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <i className="fa-solid fa-hand-holding-dollar absolute -right-4 -bottom-4 text-[80px] text-amber-100 opacity-60"></i>
                        <div className="flex items-center gap-2.5 text-amber-600 mb-1 relative z-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><i className="fa-solid fa-file-invoice-dollar text-[16px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600/90">Market Receivables <span className="normal-case opacity-80 font-medium">(পাওনা টাকা)</span></p>
                        </div>
                        <h3 className="text-[26px] font-black text-amber-800 m-0 tabular-nums tracking-tight relative z-10">৳ {fmt(summary.client_due)}</h3>
                        <p className="text-[12px] text-amber-700 font-medium relative z-10">ক্লায়েন্টদের কাছে মোট যত টাকা এখনো পাওনা আছে (Unpaid Bills)।</p>
                    </div>

                    {/* Payables Card */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-red-200 bg-red-50/40 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <i className="fa-solid fa-money-check-dollar absolute -right-4 -bottom-4 text-[80px] text-red-100 opacity-60"></i>
                        <div className="flex items-center gap-2.5 text-red-600 mb-1 relative z-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100"><i className="fa-solid fa-file-signature text-[16px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-600/90">Market Payables <span className="normal-case opacity-80 font-medium">(দেনা/বকেয়া)</span></p>
                        </div>
                        <h3 className="text-[26px] font-black text-red-800 m-0 tabular-nums tracking-tight relative z-10">৳ {fmt(summary.vendor_due)}</h3>
                        <p className="text-[12px] text-red-700 font-medium relative z-10">ভেন্ডর বা অন্যান্য খাতে আপনার মোট যত টাকা পরিশোধ করা বাকি।</p>
                    </div>
                </div>

                {/* Tabs & Main Content */}
                <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col mt-2">

                    {/* Modern Pill-Style Tabs */}
                    <div className="bg-white px-6 pt-5 pb-1 border-b border-gray-100">
                        <div className="inline-flex p-1.5 space-x-1 bg-gray-100/80 border border-gray-200/60 rounded-xl w-max">
                            <button
                                onClick={() => setActiveTab('profit_loss')}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'profit_loss' ? 'bg-white text-[var(--accent)] shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}
                            >
                                <i className="fa-solid fa-chart-column text-[12px]"></i> Cash Flow Report (ক্যাশ ফ্লো)
                            </button>
                            <button
                                onClick={() => setActiveTab('client')}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'client' ? 'bg-white text-[var(--accent)] shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}
                            >
                                <i className="fa-solid fa-users text-[12px]"></i> Client-Wise Summary (ক্লায়েন্ট রিপোর্ট)
                            </button>
                            <button
                                onClick={() => setActiveTab('monthly')}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'monthly' ? 'bg-white text-[var(--accent)] shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}
                            >
                                <i className="fa-regular fa-calendar-days text-[12px]"></i> Project Accrual (প্রজেক্ট রিপোর্ট)
                            </button>
                        </div>
                    </div>

                    {/* 🟢 Tab 1: Cash Flow & Revenue Report */}
                    {activeTab === 'profit_loss' && (
                        <div className="overflow-x-auto custom-table-scroll">
                            <table id="monthly-profit-loss-table" className="w-full min-w-[1200px] text-left">
                                <thead className="border-b border-gray-200 bg-gray-50 text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500">
                                    <tr>
                                        <th className="px-5 py-4">Month <br/><span className="text-[10px] font-medium opacity-80 normal-case">(মাস)</span></th>
                                        <th className="px-5 py-4 text-right bg-blue-50/50 text-blue-600" title="Total amount invoiced/billed this month">Billed Revenue <br/><span className="text-[10px] font-medium opacity-80 normal-case">(মোট বিলকৃত)</span></th>
                                        <th className="px-5 py-4 text-right bg-emerald-50/50 text-emerald-600" title="Cash collected for invoices generated in this month">Cash In (Collected) <br/><span className="text-[10px] font-medium opacity-80 normal-case">(প্রাপ্ত ক্যাশ)</span></th>
                                        <th className="px-5 py-4 text-right bg-rose-50/50 text-rose-600">Proj Cost (Paid) <br/><span className="text-[10px] font-medium opacity-80 normal-case">(প্রজেক্ট খরচ)</span></th>
                                        <th className="px-5 py-4 text-right bg-rose-50/50 text-rose-600">Office Exp <br/><span className="text-[10px] font-medium opacity-80 normal-case">(অফিস খরচ)</span></th>
                                        <th className="px-5 py-4 text-right bg-rose-50/50 text-rose-600">Salary Paid <br/><span className="text-[10px] font-medium opacity-80 normal-case">(বেতন প্রদান)</span></th>
                                        <th className="px-5 py-4 text-right bg-rose-100/50 text-rose-700 border-r border-gray-200">Total Cash Out <br/><span className="text-[10px] font-medium opacity-80 normal-case">(মোট খরচ)</span></th>
                                        <th className="px-5 py-4 text-right bg-purple-50 text-purple-700">Net Cash Flow <br/><span className="text-[10px] font-medium opacity-80 normal-case">(নীট ক্যাশ ফ্লো)</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[13.5px]">
                                    {monthlyProfitLoss.length ? monthlyProfitLoss.map(row => <tr key={row.key} className="hover:bg-gray-50">
                                        <td className="px-5 py-4 font-extrabold text-gray-900">{row.month}</td>
                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-blue-600 bg-blue-50/20">৳ {fmt(row.billed_revenue)}</td>
                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-600 bg-emerald-50/30">৳ {fmt(row.cash_in)}</td>

                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-600 bg-rose-50/20">৳ {fmt(row.project_cost)}</td>
                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-600 bg-rose-50/20">৳ {fmt(row.office_expense)}</td>
                                        <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-600 bg-rose-50/20">৳ {fmt(row.salary_expense)}</td>
                                        <td className="px-5 py-4 text-right font-black tabular-nums text-rose-700 bg-rose-100/30 border-r border-gray-100">৳ {fmt(row.cash_out)}</td>

                                        <td className={`px-5 py-4 text-right text-[16px] font-black tabular-nums bg-purple-50/30 ${Number(row.net_cash_flow) >= 0 ? 'text-purple-700' : 'text-gray-700'}`}>{Number(row.net_cash_flow) > 0 ? '+' : ''}৳ {fmt(row.net_cash_flow)}</td>
                                    </tr>) : <tr><td colSpan="8" className="px-5 py-16 text-center font-semibold text-gray-400">No financial activity found for the selected dates.</td></tr>}
                                </tbody>
                                {monthlyProfitLoss.length > 0 && <tfoot className="border-t-2 border-gray-300 bg-slate-100 text-[13.5px] font-black">
                                    <tr>
                                        <td className="px-5 py-4 text-slate-900">GRAND TOTAL <br/><span className="text-[10px] font-bold opacity-80">(সর্বমোট)</span></td>
                                        <td className="px-5 py-4 text-right tabular-nums text-blue-700">৳ {fmt(profitLossTotals.billed_revenue)}</td>
                                        <td className="px-5 py-4 text-right tabular-nums text-emerald-700">৳ {fmt(profitLossTotals.cash_in)}</td>
                                        <td className="px-5 py-4 text-right tabular-nums text-rose-700">৳ {fmt(profitLossTotals.project_cost)}</td>
                                        <td className="px-5 py-4 text-right tabular-nums text-rose-700">৳ {fmt(profitLossTotals.office_expense)}</td>
                                        <td className="px-5 py-4 text-right tabular-nums text-rose-700">৳ {fmt(profitLossTotals.salary_expense)}</td>
                                        <td className="px-5 py-4 text-right tabular-nums text-rose-800 border-r border-gray-300">৳ {fmt(profitLossTotals.cash_out)}</td>
                                        <td className={`px-5 py-4 text-right text-[16px] tabular-nums ${Number(profitLossTotals.net_cash_flow) >= 0 ? 'text-purple-800' : 'text-gray-800'}`}>{Number(profitLossTotals.net_cash_flow) > 0 ? '+' : ''}৳ {fmt(profitLossTotals.net_cash_flow)}</td>
                                    </tr>
                                </tfoot>}
                            </table>
                        </div>
                    )}

                    {/* Tab 2: Client-Wise Report Section */}
                    {activeTab === 'client' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <div className="relative w-full md:w-[320px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Client (ক্লায়েন্ট খুঁজুন)..."
                                        value={searchClient}
                                        onChange={(e) => setSearchClient(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 bg-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button onClick={exportClientCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm">
                                        <i className="fas fa-file-csv"></i> Export CSV
                                    </button>
                                    <button onClick={() => handlePrint('client-report-table', 'Client-Wise Profitability Report')} className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm">
                                        <i className="fas fa-print text-gray-500"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-table-scroll pb-2">
                                <table id="client-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                                    <thead className="bg-[#f6f6f7] text-[10.5px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                        <tr>
                                            <th className="px-6 py-4">Client Name <br/><span className="text-[10px] font-medium opacity-80 normal-case">(ক্লায়েন্টের নাম)</span></th>
                                            <th className="px-6 py-4 text-center">Projects <br/><span className="text-[10px] font-medium opacity-80 normal-case">(প্রজেক্টস)</span></th>
                                            <th className="px-6 py-4 text-right">Project Budget <br/><span className="text-[10px] font-medium opacity-80 normal-case">(বাজেট)</span></th>
                                            <th className="px-6 py-4 text-right">Project Cost <br/><span className="text-[10px] font-medium opacity-80 normal-case">(খরচ)</span></th>
                                            <th className="px-6 py-4 text-center border-l border-gray-200">Invoices <br/><span className="text-[10px] font-medium opacity-80 normal-case">(ইনভয়েস)</span></th>
                                            <th className="px-6 py-4 text-right">Total Billed <br/><span className="text-[10px] font-medium opacity-80 normal-case">(মোট বিল)</span></th>
                                            <th className="px-6 py-4 text-right bg-emerald-50/50">Received (Paid) <br/><span className="text-[10px] font-medium opacity-80 normal-case">(প্রাপ্তি)</span></th>
                                            <th className="px-6 py-4 text-right bg-rose-50/50">Net Due <br/><span className="text-[10px] font-medium opacity-80 normal-case">(বকেয়া)</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map((client) => (
                                                <tr key={client.client_name} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold uppercase border border-blue-100">
                                                                {(client.client_name || '?').charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-gray-900">{client.client_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center rounded-md bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1 text-[11.5px] font-bold">
                                                            {fmt(client.total_projects)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600 tabular-nums">৳ {fmt(client.total_budget)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-orange-500 tabular-nums">৳ {fmt(client.total_expense)}</td>

                                                    <td className="px-6 py-4 text-center border-l border-gray-100">
                                                        <span className="inline-flex items-center justify-center rounded-md bg-purple-50 border border-purple-100 text-purple-700 px-2.5 py-1 text-[11.5px] font-bold">
                                                            {fmt(client.total_invoices)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-purple-700 tabular-nums">৳ {fmt(client.total_billed)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums bg-emerald-50/30">৳ {fmt(client.total_paid)}</td>
                                                    <td className={`px-6 py-4 text-right font-black text-[14.5px] tabular-nums bg-rose-50/30 ${Number(client.total_due) > 0 ? "text-rose-600" : "text-gray-400"}`}>
                                                        ৳ {fmt(client.total_due)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-16 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-3"></i>
                                                        <p className="text-[14px] font-bold text-gray-600">No clients found for this period.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {filteredClients.length > 0 && <tfoot className="border-t-2 border-gray-300 bg-slate-100 text-[13px] font-black text-slate-800">
                                        <tr>
                                            <td className="px-6 py-4">GRAND TOTAL <br/><span className="text-[10px] font-bold opacity-80">(সর্বমোট)</span></td>
                                            <td className="px-6 py-4 text-center">{fmt(clientTotals.total_projects)}</td>
                                            <td className="px-6 py-4 text-right">৳ {fmt(clientTotals.total_budget)}</td>
                                            <td className="px-6 py-4 text-right">৳ {fmt(clientTotals.total_expense)}</td>
                                            <td className="px-6 py-4 text-center">{fmt(clientTotals.total_invoices)}</td>
                                            <td className="px-6 py-4 text-right">৳ {fmt(clientTotals.total_billed)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-700">৳ {fmt(clientTotals.total_paid)}</td>
                                            <td className="px-6 py-4 text-right text-rose-700">৳ {fmt(clientTotals.total_due)}</td>
                                        </tr>
                                    </tfoot>}
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 🟢 Tab 3: Monthly Project Report Section */}
                    {activeTab === 'monthly' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <div className="relative w-full md:w-[320px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Month (মাস খুঁজুন)..."
                                        value={searchMonth}
                                        onChange={(e) => setSearchMonth(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 bg-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button onClick={exportMonthlyCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm">
                                        <i className="fas fa-file-csv"></i> Export CSV
                                    </button>
                                    <button onClick={() => handlePrint('monthly-report-table', 'Monthly Projects Report')} className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm">
                                        <i className="fas fa-print text-gray-500"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-table-scroll pb-2">
                                <table id="monthly-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                                    {filteredMonths.length > 0 ? (
                                        filteredMonths.map((data) => (
                                            <React.Fragment key={data.month}>
                                                <thead>
                                                    <tr className="bg-slate-800 text-white border-b-2 border-slate-900 month-header">
                                                        <th colSpan="5" className="px-6 py-3.5 text-[13px] font-extrabold uppercase tracking-wider">
                                                            <div className="flex items-center gap-2">
                                                                <i className="fa-regular fa-calendar-days text-blue-400"></i> {data.month}
                                                            </div>
                                                        </th>
                                                    </tr>
                                                    <tr className="bg-[#f6f6f7] text-[10.5px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                                        <th className="px-6 py-3.5">Project Name <br/><span className="text-[10px] font-medium opacity-80 normal-case">(প্রজেক্টের নাম)</span></th>
                                                        <th className="px-6 py-3.5">Client <br/><span className="text-[10px] font-medium opacity-80 normal-case">(ক্লায়েন্ট)</span></th>
                                                        <th className="px-6 py-3.5 text-right">Budget <br/><span className="text-[10px] font-medium opacity-80 normal-case">(বাজেট)</span></th>
                                                        <th className="px-6 py-3.5 text-right">Cost (Expenses) <br/><span className="text-[10px] font-medium opacity-80 normal-case">(খরচ)</span></th>
                                                        <th className="px-6 py-3.5 text-right">Est. Profit <br/><span className="text-[10px] font-medium opacity-80 normal-case">(সম্ভাব্য লাভ)</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[13.5px] text-[#202223]">
                                                    {data.projects.map((proj, pIdx) => (
                                                        <tr key={pIdx} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                                                                        <i className="fa-solid fa-briefcase text-[11px]"></i>
                                                                    </div>
                                                                    {proj.title}
                                                                    {proj.status === 'completed' && (
                                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                            Completed
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-medium text-gray-600">{proj.client}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-blue-600 tabular-nums">৳ {fmt(proj.budget)}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-orange-500 tabular-nums">৳ {fmt(proj.expense)}</td>
                                                            <td className={`px-6 py-4 text-right font-black tabular-nums ${Number(proj.profit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                                {Number(proj.profit) > 0 ? '+' : ''}৳ {fmt(proj.profit)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 border-t-2 border-b-4 border-gray-200 summary-row">
                                                        <td colSpan="2" className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[11px] tracking-wider">
                                                            Summary for {data.month} <br/><span className="text-[10px] font-bold opacity-80">(সারসংক্ষেপ)</span>:
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-blue-700 text-[14.5px] tabular-nums">
                                                            ৳ {fmt(data.month_budget)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-orange-600 text-[14.5px] tabular-nums">
                                                            ৳ {fmt(data.month_expense)}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-black text-[16px] tabular-nums ${Number(data.month_profit) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                                            {Number(data.month_profit) > 0 ? '+' : ''}৳ {fmt(data.month_profit)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tbody>
                                            <tr>
                                                <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <i className="fa-regular fa-calendar-xmark text-4xl text-gray-300 mb-3"></i>
                                                        <p className="text-[14px] font-bold text-gray-600">No monthly records found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    )}

                                    {filteredMonths.length > 0 && (
                                        <tfoot className="border-t-4 border-gray-300 bg-slate-800 text-[13px] font-black text-white tracking-wider">
                                            <tr>
                                                <td colSpan="2" className="px-6 py-4 text-right uppercase">
                                                    OVERALL GRAND TOTAL <br/><span className="text-[10px] font-bold opacity-80">(সর্বমোট)</span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-blue-300">৳ {fmt(monthlyReportTotals.budget)}</td>
                                                <td className="px-6 py-4 text-right text-orange-300">৳ {fmt(monthlyReportTotals.expense)}</td>
                                                <td className={`px-6 py-4 text-right ${monthlyReportTotals.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
