import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

const COMPANY = {
    name: 'UNIBOX',
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function ProjectProfitLoss({ projects = [], summary = {}, clients = [], filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [clientId, setClientId] = useState(filters.client_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const applyFilters = (overrides = {}) => {
        const params = {
            search,
            client_id: clientId,
            status,
            start_date: startDate,
            end_date: endDate,
            ...overrides,
        };
        router.get(route('admin.reports.project-profit'), params, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setClientId('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        router.get(route('admin.reports.project-profit'), {}, { preserveState: true, replace: true });
    };

    const handleExportCSV = () => {
        if (projects.length === 0) return Swal.fire("Empty!", "No project data to export.", "warning");
        let csvContent = "Project Title,Client,Start Date,Status,Budget,Invoiced Amount,Collected,Receivable Due,Total Expense,Vendor Due,Net Profit/Loss,Margin %\n";
        projects.forEach(p => {
            csvContent += `"${(p.title || '').replace(/"/g, '""')}","${(p.client_name || '').replace(/"/g, '""')}","${p.start_date || ''}","${p.status || ''}","${p.budget}","${p.invoiced}","${p.collected}","${p.receivable}","${p.total_expense}","${p.due_expense}","${p.net_profit}","${p.margin}%"\n`;
        });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Profit_Loss_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        if (projects.length === 0) return Swal.fire("Empty!", "No project data to print.", "warning");
        const tableContent = document.getElementById("printable-project-profit");
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Project Profit & Loss Report - ${COMPANY.name}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px 30px; color: #1e293b; background: #fff; margin: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 12px; margin-bottom: 20px; }
                        .logo { height: 42px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; }
                        .report-title { text-align: center; font-size: 17px; font-weight: bold; text-transform: uppercase; margin-bottom: 18px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
                        th, td { padding: 8px 10px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10.5px; }
                        .text-right { text-align: right; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <div class="report-title">Project-wise Profit & Loss Analysis Report</div>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const statusBadge = (st) => {
        switch (st) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'on_hold': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <AdminLayout>
            <Head title="Project Profit & Loss Report" />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Profitability Analytics
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Project Profit & Loss Report</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1">
                            প্রতিটি প্রজেক্টের বাজেট, ইনভয়েস বিল, আদায়কৃত টাকা, ভেন্ডর ও প্রজেক্ট খরচ এবং নিট লাভ-ক্ষতির পূর্ণাঙ্গ হিসাব।
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm">
                            <i className="fa-solid fa-file-csv"></i> Export CSV
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-gray-800 shadow-sm">
                            <i className="fa-solid fa-print"></i> Print Report
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Budget & Invoiced */}
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                                <i className="fa-solid fa-file-invoice-dollar"></i>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Invoiced (মোট বিল)</span>
                        </div>
                        <div className="text-[22px] font-black text-indigo-900 tabular-nums">
                            <Taka className="text-[18px]" />{Number(summary.total_invoiced || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11.5px] font-bold text-slate-500 mt-1">
                            প্রজেক্ট বাজেট: ৳{Number(summary.total_budget || 0).toLocaleString('en-IN')} ({summary.total_projects || 0}টি প্রজেক্ট)
                        </div>
                    </div>

                    {/* Card 2: Total Collected & Receivable */}
                    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                <i className="fa-solid fa-hand-holding-dollar"></i>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Collected (মোট আদায়)</span>
                        </div>
                        <div className="text-[22px] font-black text-blue-900 tabular-nums">
                            <Taka className="text-[18px]" />{Number(summary.total_collected || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11.5px] font-bold text-rose-600 mt-1">
                            ক্লায়েন্ট বকেয়া: ৳{Number(summary.total_receivable || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* Card 3: Total Project Cost */}
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/50 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                                <i className="fa-solid fa-boxes-packing"></i>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Total Project Cost (মোট খরচ)</span>
                        </div>
                        <div className="text-[22px] font-black text-amber-900 tabular-nums">
                            <Taka className="text-[18px]" />{Number(summary.total_expense || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11.5px] font-bold text-amber-700 mt-1">
                            পরিশোধিত: ৳{Number(summary.total_expense_paid || 0).toLocaleString('en-IN')} | ভেন্ডর বকেয়া: ৳{Number(summary.total_expense_due || 0).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* Card 4: Net Profit & Margin */}
                    <div className={`rounded-2xl border p-5 shadow-sm ${Number(summary.net_profit) >= 0 ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70' : 'border-rose-200 bg-gradient-to-br from-white to-rose-50/70'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${Number(summary.net_profit) >= 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                    <i className={`fa-solid ${Number(summary.net_profit) >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                                </div>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${Number(summary.net_profit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {Number(summary.net_profit) >= 0 ? 'Net Profit (নিট লাভ)' : 'Net Loss (নিট ক্ষতি)'}
                                </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${Number(summary.net_profit) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {summary.overall_margin || 0}% Margin
                            </span>
                        </div>
                        <div className={`text-[22px] font-black tabular-nums ${Number(summary.net_profit) >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                            <Taka className="text-[18px]" />{Number(Math.abs(summary.net_profit || 0)).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11.5px] font-bold text-slate-600 mt-1">
                            নগদ উদ্বৃত্ত (Cash Profit): ৳{Number(summary.cash_profit || 0).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Main Table Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    {/* Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="lg:col-span-2 relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-gray-400 text-sm"></i>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: e.target.value })}
                                placeholder="প্রজেক্ট বা ক্লায়েন্টের নাম দিয়ে সার্চ..."
                                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-[13.5px] focus:border-[var(--accent)] focus:outline-none"
                            />
                        </div>
                        <div>
                            <select
                                value={clientId}
                                onChange={(e) => { setClientId(e.target.value); applyFilters({ client_id: e.target.value }); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13.5px] focus:border-[var(--accent)] focus:outline-none"
                            >
                                <option value="">সব ক্লায়েন্ট (All Clients)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); applyFilters({ status: e.target.value }); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13.5px] focus:border-[var(--accent)] focus:outline-none"
                            >
                                <option value="">সব স্ট্যাটাস (All Status)</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 lg:col-span-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); applyFilters({ start_date: e.target.value }); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px]"
                                title="From Date"
                            />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); applyFilters({ end_date: e.target.value }); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px]"
                                title="To Date"
                            />
                            {(search || clientId || status || startDate || endDate) && (
                                <button
                                    onClick={resetFilters}
                                    className="shrink-0 h-10 w-10 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                    title="Reset Filters"
                                >
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table id="printable-project-profit" className="w-full text-left border-collapse whitespace-nowrap min-w-[1150px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-5 py-4 text-[11px] font-extrabold text-[#64748B] uppercase">Project & Client</th>
                                    <th className="px-4 py-4 text-center text-[11px] font-extrabold text-[#64748B] uppercase">Status</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Budget</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Invoiced Bill</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Collected</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Client Due</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Project Expense</th>
                                    <th className="px-4 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Net Profit / Loss</th>
                                    <th className="px-4 py-4 text-center text-[11px] font-extrabold text-[#64748B] uppercase">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] divide-y divide-gray-100">
                                {projects.length > 0 ? (
                                    <>
                                        {projects.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-4 whitespace-normal min-w-[240px]">
                                                    <div className="font-bold text-slate-900">{p.title}</div>
                                                    <div className="text-[12px] text-slate-500 mt-0.5">
                                                        <i className="fa-regular fa-building mr-1"></i>
                                                        {p.client_name} {p.company_name ? `(${p.company_name})` : ''}
                                                    </div>
                                                    {p.invoices && p.invoices.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {p.invoices.map((inv, idx) => (
                                                                <span key={idx} className="text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                                                                    {inv}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase border ${statusBadge(p.status)}`}>
                                                        {(p.status || 'pending').replace('_', ' ')}
                                                    </span>
                                                    {p.start_date && <div className="text-[11px] text-gray-400 mt-1">{p.start_date}</div>}
                                                </td>
                                                <td className="px-4 py-4 text-right font-semibold text-slate-700 tabular-nums">
                                                    <Taka />{Number(p.budget).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-4 text-right tabular-nums">
                                                    {p.is_billed ? (
                                                        <span className="font-bold text-indigo-700"><Taka />{Number(p.invoiced).toLocaleString('en-IN')}</span>
                                                    ) : (
                                                        <span className="text-[11.5px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Unbilled</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-emerald-700 tabular-nums">
                                                    <Taka />{Number(p.collected).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-rose-600 tabular-nums">
                                                    {p.receivable > 0 ? <><Taka />{Number(p.receivable).toLocaleString('en-IN')}</> : '-'}
                                                </td>
                                                <td className="px-4 py-4 text-right tabular-nums">
                                                    <div className="font-bold text-amber-800"><Taka />{Number(p.total_expense).toLocaleString('en-IN')}</div>
                                                    {p.due_expense > 0 && (
                                                        <div className="text-[10.5px] font-bold text-rose-500">বকেয়া: ৳{Number(p.due_expense).toLocaleString('en-IN')}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right bg-slate-50/60 tabular-nums">
                                                    <div className={`font-black text-[15px] ${p.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {p.net_profit < 0 ? '-' : ''}<Taka />{Number(Math.abs(p.net_profit)).toLocaleString('en-IN')}
                                                    </div>
                                                    {!p.is_billed && (
                                                        <span className="text-[10px] font-semibold text-slate-400">বাজেট অনুযায়ী প্রাক্কলিত</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-black ${p.margin >= 25 ? 'bg-emerald-100 text-emerald-800' : p.margin >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {p.margin}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-900 text-white font-black">
                                            <td colSpan="2" className="px-5 py-4 text-right uppercase text-[13px]">মোট যোগফল (Grand Total):</td>
                                            <td className="px-4 py-4 text-right tabular-nums"><Taka />{Number(summary.total_budget || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-4 text-right tabular-nums text-indigo-300"><Taka />{Number(summary.total_invoiced || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-4 text-right tabular-nums text-emerald-300"><Taka />{Number(summary.total_collected || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-4 text-right tabular-nums text-rose-300"><Taka />{Number(summary.total_receivable || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-4 text-right tabular-nums text-amber-300"><Taka />{Number(summary.total_expense || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-4 text-right tabular-nums text-[16px] text-emerald-400">
                                                {summary.net_profit < 0 ? '-' : ''}<Taka />{Number(Math.abs(summary.net_profit || 0)).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-4 text-center text-emerald-300">{summary.overall_margin || 0}%</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-20 text-center text-gray-500 font-bold">
                                            কোনো প্রজেক্টের তথ্য পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

