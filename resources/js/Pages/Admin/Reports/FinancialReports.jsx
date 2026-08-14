import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function FinancialReports({ clientsReport = [], monthlyReport = [], summary = {}, filters = {} }) {
    /* State Management */
    const [activeTab, setActiveTab] = useState('client');
    const [searchClient, setSearchClient] = useState('');
    const [searchMonth, setSearchMonth] = useState('');

    // Date Filters State
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [filterYear, setFilterYear] = useState(filters.year || '');

    const isFirstRender = useRef(true);

    // Get unique years for the dropdown (from 5 years back to 4 years ahead)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, index) => currentYear - 5 + index).sort((a, b) => b - a);

    /* Filtering & Reload Logic */
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

            router.get(route('admin.reports.financial'), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [startDate, endDate, filterYear]);

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setFilterYear('');
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

    /* Computed Data */
    const filteredClients = clientsReport.filter(c =>
        (c.client_name || '').toLowerCase().includes(searchClient.toLowerCase())
    );

    const filteredMonths = monthlyReport.filter(m =>
        (m.month || '').toLowerCase().includes(searchMonth.toLowerCase())
    );

    return (
        <AdminLayout>
            <Head title="Financial & Project Reports"/>

            {/* Custom Scrollbar CSS */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12">

                {/* Header & Date Filters */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Business Analytics
                        </div>
                        <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight">Financial Reports</h1>
                        <p className="text-[14px] text-gray-500 mt-1.5 max-w-md">Analyze client profitability, monthly expenses, invoices, and payments.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-calendar-days text-[13px]"></i>
                            </div>
                            <select
                                value={filterYear}
                                onChange={(e) => { setFilterYear(e.target.value); setStartDate(''); setEndDate(''); }}
                                className="appearance-none w-[110px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-semibold outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            >
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="h-8 w-px bg-gray-200 hidden md:block mx-1"></div>

                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setFilterYear(''); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            />
                            <span className="text-gray-400 font-bold">–</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setFilterYear(''); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-medium outline-none transition-shadow focus:border-indigo-500 focus:bg-white cursor-pointer"
                            />
                        </div>

                        {(startDate || endDate || filterYear) && (
                            <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-100 ml-1">
                                <i className="fa-solid fa-xmark"></i> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2.5 text-blue-600 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100"><i className="fa-solid fa-diagram-project text-[14px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600/80">Project Value</p>
                        </div>
                        <h3 className="text-[22px] font-black text-blue-800 m-0 tabular-nums tracking-tight">৳ {(summary.total_receivable || 0).toLocaleString('en-IN')}</h3>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2.5 text-rose-600 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100"><i className="fa-solid fa-file-invoice-dollar text-[14px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/80">Project Cost</p>
                        </div>
                        <h3 className="text-[22px] font-black text-rose-800 m-0 tabular-nums tracking-tight">৳ {(summary.total_cost || 0).toLocaleString('en-IN')}</h3>
                    </div>

                    <div className={`flex flex-col gap-2 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${summary.net_profit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                        <div className={`flex items-center gap-2.5 mb-1 ${summary.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${summary.net_profit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                <i className="fa-solid fa-chart-line text-[14px]"></i>
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Est. Net Profit</p>
                        </div>
                        <h3 className={`text-[22px] font-black m-0 tabular-nums tracking-tight ${summary.net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {summary.net_profit > 0 ? '+' : ''}৳ {(summary.net_profit || 0).toLocaleString('en-IN')}
                        </h3>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2.5 text-purple-600 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100"><i className="fa-solid fa-file-invoice text-[14px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600/80">Total Invoiced</p>
                        </div>
                        <h3 className="text-[22px] font-black text-purple-800 m-0 tabular-nums tracking-tight">৳ {(summary.total_invoiced || 0).toLocaleString('en-IN')}</h3>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2.5 text-teal-600 mb-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100"><i className="fa-solid fa-hand-holding-dollar text-[14px]"></i></div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600/80">Total Received</p>
                        </div>
                        <h3 className="text-[22px] font-black text-teal-800 m-0 tabular-nums tracking-tight">৳ {(summary.total_received || 0).toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                {/* Tabs & Main Content */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* 🟢 Modern Pill-Style Tabs */}
                    <div className="bg-white px-6 pt-5 pb-1 border-b border-gray-100">
                        <div className="inline-flex p-1.5 space-x-1 bg-gray-100/80 border border-gray-200/60 rounded-xl w-max">
                            <button
                                onClick={() => setActiveTab('client')}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-lg transition-all
                                    ${activeTab === 'client'
                                        ? 'bg-white text-[var(--accent)] shadow-sm border border-gray-200/50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'
                                    }
                                `}
                            >
                                <i className="fa-solid fa-users text-[12px]"></i> Client-Wise Summary
                            </button>
                            <button
                                onClick={() => setActiveTab('monthly')}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-lg transition-all
                                    ${activeTab === 'monthly'
                                        ? 'bg-white text-[var(--accent)] shadow-sm border border-gray-200/50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'
                                    }
                                `}
                            >
                                <i className="fa-regular fa-calendar-days text-[12px]"></i> Monthly Projects
                            </button>
                        </div>
                    </div>

                    {/* Client-Wise Report Section */}
                    {activeTab === 'client' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <div className="relative w-full md:w-[320px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Client..."
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

                            {/* Table */}
                            <div className="overflow-x-auto custom-table-scroll pb-2">
                                <table id="client-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                                    <thead className="bg-[#f6f6f7] text-[10.5px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                        <tr>
                                            <th className="px-6 py-4">Client Name</th>
                                            <th className="px-6 py-4 text-center">Projects</th>
                                            <th className="px-6 py-4 text-right">Project Budget</th>
                                            <th className="px-6 py-4 text-right">Project Cost</th>
                                            <th className="px-6 py-4 text-center border-l border-gray-200">Invoices</th>
                                            <th className="px-6 py-4 text-right">Total Billed</th>
                                            <th className="px-6 py-4 text-right">Received (Paid)</th>
                                            <th className="px-6 py-4 text-right">Net Due</th>
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
                                                            {client.total_projects}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600 tabular-nums">৳ {client.total_budget.toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-rose-500 tabular-nums">৳ {client.total_expense.toLocaleString('en-IN')}</td>

                                                    <td className="px-6 py-4 text-center border-l border-gray-100">
                                                        <span className="inline-flex items-center justify-center rounded-md bg-purple-50 border border-purple-100 text-purple-700 px-2.5 py-1 text-[11.5px] font-bold">
                                                            {client.total_invoices}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-purple-700 tabular-nums">৳ {client.total_billed.toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-teal-600 tabular-nums">৳ {client.total_paid.toLocaleString('en-IN')}</td>
                                                    <td className={`px-6 py-4 text-right font-black text-[14.5px] tabular-nums ${client.total_due > 0 ? "text-red-600" : "text-gray-400"}`}>
                                                        ৳ {client.total_due.toLocaleString('en-IN')}
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
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Monthly Project Report Section */}
                    {activeTab === 'monthly' && (
                        <div className="animate-[fadeIn_0.2s_ease-out]">
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <div className="relative w-full md:w-[320px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Month (e.g. July 2026)..."
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

                            {/* Table */}
                            <div className="overflow-x-auto custom-table-scroll pb-2">
                                <table id="monthly-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                                    {filteredMonths.length > 0 ? (
                                        filteredMonths.map((data) => (
                                            <React.Fragment key={data.month}>
                                                <thead>
                                                    {/* Dark Premium Header for Month */}
                                                    <tr className="bg-slate-800 text-white border-b-2 border-slate-900 month-header">
                                                        <th colSpan="5" className="px-6 py-3.5 text-[13px] font-extrabold uppercase tracking-wider">
                                                            <div className="flex items-center gap-2">
                                                                <i className="fa-regular fa-calendar-days text-blue-400"></i> {data.month}
                                                            </div>
                                                        </th>
                                                    </tr>
                                                    {/* Sub Columns Header */}
                                                    <tr className="bg-[#f6f6f7] text-[10.5px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                                        <th className="px-6 py-3.5">Project Name</th>
                                                        <th className="px-6 py-3.5">Client</th>
                                                        <th className="px-6 py-3.5 text-right">Budget</th>
                                                        <th className="px-6 py-3.5 text-right">Cost (Expenses)</th>
                                                        <th className="px-6 py-3.5 text-right">Est. Profit</th>
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
                                                            <td className="px-6 py-4 text-right font-bold text-blue-600 tabular-nums">৳ {proj.budget.toLocaleString('en-IN')}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-rose-500 tabular-nums">৳ {proj.expense.toLocaleString('en-IN')}</td>
                                                            <td className={`px-6 py-4 text-right font-black tabular-nums ${proj.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                                {proj.profit > 0 ? '+' : ''}৳ {proj.profit.toLocaleString('en-IN')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Summary Row for the Month */}
                                                    <tr className="bg-slate-50 border-t-2 border-b-4 border-gray-200 summary-row">
                                                        <td colSpan="2" className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[11px] tracking-wider">
                                                            Summary for {data.month}:
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-blue-700 text-[14.5px] tabular-nums">
                                                            ৳ {data.month_budget.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-rose-600 text-[14.5px] tabular-nums">
                                                            ৳ {data.month_expense.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-black text-[16px] tabular-nums ${data.month_profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                                            {data.month_profit > 0 ? '+' : ''}৳ {data.month_profit.toLocaleString('en-IN')}
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
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
