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

    // Get unique years for the dropdown (from 2020 up to current year + 2)
    const currentYear = new Date().getFullYear();
    const years = Array.from(new Array(10), (val, index) => currentYear - 5 + index).sort((a, b) => b - a);

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

            router.get(route('admin.reports.financial'), params, { preserveState: true, replace: true });
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
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; }
                        p { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                        .month-header { background-color: #1e293b !important; color: #fff !important; }
                        .summary-row { background-color: #f1f5f9 !important; font-weight: bold; }
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
        link.click();
    };

    const exportClientCSV = () => {
        if (!filteredClients.length) return Swal.fire("Empty!", "No data to export", "warning");
        let headers = "Client Name,Total Projects,Project Value (Receivable),Total Cost (Expenses),Cost Paid,Cost Due,Est. Profit\n";
        let rows = filteredClients.map(c => {
            const profit = c.total_budget - c.total_expense;
            return `"${c.client_name}","${c.total_projects}","${c.total_budget}","${c.total_expense}","${c.vendor_paid}","${c.vendor_due}","${profit}"`;
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
            // Month Summary Row
            rows.push(`"Summary for ${m.month}",,, "${m.month_budget}","${m.month_expense}","${m.month_profit}",""`);
        });
        downloadCSV(headers + rows.join("\n"), `Monthly_Projects_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const filteredClients = clientsReport.filter(c => c.client_name.toLowerCase().includes(searchClient.toLowerCase()));
    const filteredMonths = monthlyReport.filter(m => m.month.toLowerCase().includes(searchMonth.toLowerCase()));

    return (
        <AdminLayout>
            <Head title="Financial & Project Reports"/>

            <div className="flex flex-col gap-6">

                {/* Header & Date Filters */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Business Financial Reports</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Analyze client profitability, monthly expenses, and net profit margins.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e1e3e5] bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <label className="text-[13px] font-semibold text-gray-600">Year:</label>
                            <select
                                value={filterYear}
                                onChange={(e) => { setFilterYear(e.target.value); setStartDate(''); setEndDate(''); }}
                                className="appearance-none bg-none w-[100px] rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                            >
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                        <div className="flex items-center gap-2">
                            <label className="text-[13px] font-semibold text-gray-600">Range:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setFilterYear(''); }}
                                className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                            />
                            <span className="text-gray-400 text-[13px]">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setFilterYear(''); }}
                                className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                            />
                        </div>

                        {(startDate || endDate || filterYear) && (
                            <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100">
                                <i className="fa-solid fa-xmark"></i> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Total Receivable */}
                    <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <i className="fa-solid fa-money-bill-trend-up text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">Total Project Value (Receivable)</p>
                            <h3 className="text-[24px] font-extrabold text-blue-800 m-0">TK. {summary.total_receivable?.toLocaleString('en-IN')}</h3>
                        </div>
                    </div>

                    {/* Card 2: Total Cost */}
                    <div className="flex items-center gap-4 rounded-xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <i className="fa-solid fa-file-invoice-dollar text-[22px]"></i>
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-rose-600">Total Project Cost (Expenses)</p>
                            <h3 className="text-[24px] font-extrabold text-rose-800 m-0">TK. {summary.total_cost?.toLocaleString('en-IN')}</h3>
                        </div>
                    </div>

                    {/* Card 3: Net Profit */}
                    <div className={`flex items-center gap-4 rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md ${summary.net_profit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${summary.net_profit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <i className="fa-solid fa-chart-line text-[22px]"></i>
                        </div>
                        <div>
                            <p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${summary.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Estimated Net Profit</p>
                            <h3 className={`text-[24px] font-extrabold m-0 ${summary.net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {summary.net_profit > 0 ? '+' : ''}TK. {summary.net_profit?.toLocaleString('en-IN')}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Tabs & Main Content */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-gray-200 bg-gray-50/50 px-2 pt-2 overflow-x-auto brass-scroll">
                        <button
                            onClick={() => setActiveTab('client')}
                            className={`flex items-center gap-2 px-6 py-3.5 text-[14px] font-semibold transition-all rounded-t-lg
                                ${activeTab === 'client'
                                    ? 'border-b-2 border-[var(--accent)] bg-white text-[var(--accent)] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]'
                                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }
                            `}
                        >
                            <i className="fa-solid fa-users"></i> Client-Wise Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('monthly')}
                            className={`flex items-center gap-2 px-6 py-3.5 text-[14px] font-semibold transition-all rounded-t-lg
                                ${activeTab === 'monthly'
                                    ? 'border-b-2 border-[var(--accent)] bg-white text-[var(--accent)] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]'
                                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }
                            `}
                        >
                            <i className="fa-regular fa-calendar-days"></i> Monthly Project Details
                        </button>
                    </div>

                    {/* Client-Wise Report Section */}
                    {activeTab === 'client' && (
                        <div>
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/30">
                                <div className="relative w-full md:w-[300px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Client..."
                                        value={searchClient}
                                        onChange={(e) => setSearchClient(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={exportClientCSV} className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100">
                                        <i className="fas fa-file-csv"></i> Export CSV
                                    </button>
                                    <button onClick={() => handlePrint('client-report-table', 'Client-Wise Profitability Report')} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                        <i className="fas fa-print text-gray-500"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto brass-scroll">
                                <table id="client-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                                    <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                        <tr>
                                            <th className="px-6 py-4">Client Name</th>
                                            <th className="px-6 py-4 text-center">Total Projects</th>
                                            <th className="px-6 py-4 text-right">Project Value (Receivable)</th>
                                            <th className="px-6 py-4 text-right">Total Cost (Expenses)</th>
                                            <th className="px-6 py-4 text-right">Cost Paid</th>
                                            <th className="px-6 py-4 text-right">Cost Due</th>
                                            <th className="px-6 py-4 text-right">Est. Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13.5px] text-[#202223]">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map((client, index) => {
                                                const profit = client.total_budget - client.total_expense;
                                                return (
                                                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-900">{client.client_name}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-[11px] font-bold">
                                                                {client.total_projects}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-blue-600">TK. {client.total_budget.toLocaleString('en-IN')}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-rose-500">TK. {client.total_expense.toLocaleString('en-IN')}</td>
                                                        <td className="px-6 py-4 text-right text-emerald-600">TK. {client.vendor_paid.toLocaleString('en-IN')}</td>
                                                        <td className="px-6 py-4 text-right font-medium text-orange-500">TK. {client.vendor_due.toLocaleString('en-IN')}</td>
                                                        <td className={`px-6 py-4 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                            {profit > 0 ? '+' : ''}{profit.toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-3"></i>
                                                        <p>No clients found for this period.</p>
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
                        <div>
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/30">
                                <div className="relative w-full md:w-[300px]">
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                    <input
                                        type="text"
                                        placeholder="Search Month (e.g. July 2026)..."
                                        value={searchMonth}
                                        onChange={(e) => setSearchMonth(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={exportMonthlyCSV} className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100">
                                        <i className="fas fa-file-csv"></i> Export CSV
                                    </button>
                                    <button onClick={() => handlePrint('monthly-report-table', 'Monthly Projects Report')} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                        <i className="fas fa-print text-gray-500"></i> Print / PDF
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto brass-scroll">
                                <table id="monthly-report-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                                    {filteredMonths.length > 0 ? (
                                        filteredMonths.map((data, index) => (
                                            <React.Fragment key={index}>
                                                <thead>
                                                    {/* Dark Premium Header for Month */}
                                                    <tr className="bg-slate-800 text-white border-b-2 border-slate-900 month-header">
                                                        <th colSpan="5" className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider">
                                                            <i className="fa-regular fa-calendar-days text-blue-400 mr-2"></i> {data.month}
                                                        </th>
                                                    </tr>
                                                    {/* Sub Columns Header */}
                                                    <tr className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                                        <th className="px-6 py-3">Project Name</th>
                                                        <th className="px-6 py-3">Client</th>
                                                        <th className="px-6 py-3 text-right">Budget</th>
                                                        <th className="px-6 py-3 text-right">Cost (Expenses)</th>
                                                        <th className="px-6 py-3 text-right">Est. Profit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[13.5px] text-[#202223]">
                                                    {data.projects.map((proj, pIdx) => (
                                                        <tr key={pIdx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-3.5 font-semibold text-gray-900">
                                                                {proj.title}
                                                                {proj.status === 'completed' && (
                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                                                        Completed
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-gray-600">{proj.client}</td>
                                                            <td className="px-6 py-3.5 text-right font-medium text-blue-600">TK. {proj.budget.toLocaleString('en-IN')}</td>
                                                            <td className="px-6 py-3.5 text-right font-medium text-rose-500">TK. {proj.expense.toLocaleString('en-IN')}</td>
                                                            <td className={`px-6 py-3.5 text-right font-bold ${proj.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                                {proj.profit > 0 ? '+' : ''}{proj.profit.toLocaleString('en-IN')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Summary Row for the Month */}
                                                    <tr className="bg-slate-50 border-t-2 border-b-4 border-gray-200 summary-row">
                                                        <td colSpan="2" className="px-6 py-4 text-right font-bold text-gray-800 uppercase text-[11px] tracking-wider">
                                                            Summary for {data.month}:
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-extrabold text-blue-700 text-[14.5px]">
                                                            TK. {data.month_budget.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-extrabold text-rose-600 text-[14.5px]">
                                                            TK. {data.month_expense.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-extrabold text-[15px] ${data.month_profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                                            {data.month_profit > 0 ? '+' : ''}{data.month_profit.toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tbody>
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <i className="fa-regular fa-calendar-xmark text-4xl text-gray-300 mb-3"></i>
                                                        <p>No monthly records found.</p>
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
