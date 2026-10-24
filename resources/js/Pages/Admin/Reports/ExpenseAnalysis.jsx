import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import TableExportButtons from '@/Components/TableExportButtons';

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

export default function ExpenseAnalysis({
    categoryRows = [],
    expenseSummary = {},
    receivableAging = [],
    receivableBuckets = {},
    payableAging = [],
    payableBuckets = {},
    filters = {}
}) {
    const [activeTab, setActiveTab] = useState('expense_category'); // 'expense_category' | 'receivable_aging' | 'payable_aging'
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const applyDateFilter = (overrides = {}) => {
        router.get(
            route('admin.reports.expense-analysis'),
            { start_date: startDate, end_date: endDate, ...overrides },
            { preserveState: true, replace: true }
        );
    };

    const clearDates = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('admin.reports.expense-analysis'), {}, { preserveState: true, replace: true });
    };

    const exportConfig = useMemo(() => {
        if (activeTab === 'expense_category') {
            return {
                headers: ['Category Name', 'Entries Count', 'Office Expense (Tk)', 'Sample Expense (Tk)', 'Project Expense (Tk)', 'Total Expense (Tk)', 'Share %'],
                rows: categoryRows.map(r => [
                    r.category || '—',
                    r.entries_count || 0,
                    Number(r.office_amount || 0),
                    Number(r.sample_amount || 0),
                    Number(r.project_amount || 0),
                    Number(r.total_amount || 0),
                    `${r.percentage || 0}%`
                ]),
                filename: 'category_wise_expense_analysis',
                title: 'Category-wise Expense Analysis Report'
            };
        } else if (activeTab === 'receivable_aging') {
            return {
                headers: ['Invoice #', 'Client Name', 'Phone', 'Due Date', 'Overdue Age (Days)', 'Bucket', 'Total Bill (Tk)', 'Paid (Tk)', 'Due Amount (Tk)'],
                rows: receivableAging.map(r => [
                    r.ref || '—',
                    r.party_name || '—',
                    r.phone || '—',
                    r.due_date || r.date || '—',
                    r.days_old || 0,
                    r.bucket || '—',
                    Number(r.total_bill || 0),
                    Number(r.paid || 0),
                    Number(r.due || 0)
                ]),
                filename: 'client_receivable_aging_report',
                title: 'Client Receivable Aging Report'
            };
        } else {
            return {
                headers: ['Bill Ref', 'Vendor Name', 'Project', 'Bill Date', 'Age (Days)', 'Bucket', 'Total Bill (Tk)', 'Paid (Tk)', 'Due Amount (Tk)'],
                rows: payableAging.map(r => [
                    r.ref || '—',
                    r.party_name || '—',
                    r.project || '—',
                    r.date || '—',
                    r.days_old || 0,
                    r.bucket || '—',
                    Number(r.total_bill || 0),
                    Number(r.paid || 0),
                    Number(r.due || 0)
                ]),
                filename: 'vendor_payable_aging_report',
                title: 'Vendor Payable Aging Report'
            };
        }
    }, [activeTab, categoryRows, receivableAging, payableAging]);

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-analysis-table");
        if (!tableContent) return Swal.fire("Empty!", "Nothing to print.", "warning");
        const printWindow = window.open('', '_blank');
        const title = activeTab === 'expense_category'
            ? 'Category-wise Expense Analysis Report'
            : activeTab === 'receivable_aging'
                ? 'Client Receivable Aging Report'
                : 'Vendor Payable Aging Report';

        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px 30px; color: #1e293b; background: #fff; margin: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 12px; margin-bottom: 20px; }
                        .logo { height: 42px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; }
                        .report-title { text-align: center; font-size: 17px; font-weight: bold; text-transform: uppercase; margin-bottom: 18px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
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
                    <div class="report-title">${title}</div>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const bucketColor = (bucket) => {
        switch (bucket) {
            case '0-30 Days': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case '31-60 Days': return 'bg-blue-50 text-blue-700 border-blue-200';
            case '61-90 Days': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-rose-50 text-rose-700 border-rose-200';
        }
    };

    return (
        <AdminLayout>
            <Head title="Expense Category & Aging Report" />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span> Smart Financial Intelligence
                        </div>
                        <h1 className="text-[28px] font-extrabold text-[#202223] tracking-tight">Expense Breakdown & Aging Analysis</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1">
                            Analysis of office and project expenses by category, plus 30/60/90+ days aging reports for client and vendor dues.
                        </p>
                    </div>
                    <TableExportButtons
                        headers={exportConfig.headers}
                        rows={exportConfig.rows}
                        filename={exportConfig.filename}
                        title={exportConfig.title}
                    />
                </div>

                {/* Top Tab Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e1e3e5] bg-white p-4 shadow-sm">
                    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab('expense_category')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-black transition-all ${
                                activeTab === 'expense_category'
                                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="fa-solid fa-tags text-[12px]"></i>
                            <span>Category-wise Expenses ({categoryRows.length} {categoryRows.length === 1 ? 'Category' : 'Categories'})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('receivable_aging')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-black transition-all ${
                                activeTab === 'receivable_aging'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="fa-solid fa-hourglass-half text-[12px]"></i>
                            <span>Client Receivable Aging ({receivableAging.length} {receivableAging.length === 1 ? 'Invoice' : 'Invoices'})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('payable_aging')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-black transition-all ${
                                activeTab === 'payable_aging'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <i className="fa-solid fa-clock-rotate-left text-[12px]"></i>
                            <span>Vendor Payable Aging ({payableAging.length} {payableAging.length === 1 ? 'Bill' : 'Bills'})</span>
                        </button>
                    </div>

                    {activeTab === 'expense_category' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-slate-500">Date:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); applyDateFilter({ start_date: e.target.value }); }}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); applyDateFilter({ end_date: e.target.value }); }}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
                            />
                            {(startDate || endDate) && (
                                <button
                                    onClick={clearDates}
                                    className="h-9 w-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                    title="Clear Dates"
                                >
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* TAB 1: Category-wise Expense Breakdown */}
                {activeTab === 'expense_category' && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">Office Expenses</div>
                                <div className="text-[24px] font-black text-blue-900 tabular-nums">
                                    <Taka className="text-[18px]" />{Number(expenseSummary.office_total || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Sample Expenses</div>
                                <div className="text-[24px] font-black text-emerald-900 tabular-nums">
                                    <Taka className="text-[18px]" />{Number(expenseSummary.sample_total || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/50 p-5 shadow-sm">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">Project Expenses</div>
                                <div className="text-[24px] font-black text-amber-900 tabular-nums">
                                    <Taka className="text-[18px]" />{Number(expenseSummary.project_total || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/70 p-5 shadow-sm">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1">Combined Total Expense</div>
                                <div className="text-[24px] font-black text-indigo-900 tabular-nums">
                                    <Taka className="text-[18px]" />{Number(expenseSummary.grand_total || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table id="printable-analysis-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                        <tr>
                                            <th className="px-6 py-4 text-center text-[11px] font-extrabold text-[#64748B] uppercase w-16">SL</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#64748B] uppercase">Expense Category</th>
                                            <th className="px-6 py-4 text-center text-[11px] font-extrabold text-[#64748B] uppercase">Entries</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Office Expense</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Sample Expense</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Project Expense</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Total Amount</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-extrabold text-[#64748B] uppercase w-56">Share %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13.5px] divide-y divide-gray-100">
                                        {categoryRows.length > 0 ? (
                                            <>
                                                {categoryRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-900">
                                                            <i className="fa-solid fa-tag text-indigo-500 mr-2 text-xs"></i>
                                                            {row.category}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[12px]">
                                                                {row.entries_count} {row.entries_count === 1 ? 'entry' : 'entries'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-blue-700 tabular-nums">
                                                            {row.office_amount > 0 ? <><Taka />{Number(row.office_amount).toLocaleString('en-IN')}</> : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-emerald-700 tabular-nums">
                                                            {row.sample_amount > 0 ? <><Taka />{Number(row.sample_amount).toLocaleString('en-IN')}</> : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-amber-700 tabular-nums">
                                                            {row.project_amount > 0 ? <><Taka />{Number(row.project_amount).toLocaleString('en-IN')}</> : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums text-[15px]">
                                                            <Taka />{Number(row.total_amount).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full bg-indigo-600"
                                                                        style={{ width: `${Math.min(100, row.percentage)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[12px] font-black text-indigo-700 w-12 text-right tabular-nums">
                                                                    {row.percentage}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-900 text-white font-black">
                                                    <td colSpan="3" className="px-6 py-4 text-right uppercase">Grand Total:</td>
                                                    <td className="px-6 py-4 text-right text-blue-300 tabular-nums"><Taka />{Number(expenseSummary.office_total || 0).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-300 tabular-nums"><Taka />{Number(expenseSummary.sample_total || 0).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right text-amber-300 tabular-nums"><Taka />{Number(expenseSummary.project_total || 0).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-400 text-[16px] tabular-nums"><Taka />{Number(expenseSummary.grand_total || 0).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-right text-indigo-300">100%</td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-20 text-center text-gray-500 font-bold">No expense records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2 & TAB 3: Receivable & Payable Aging */}
                {(activeTab === 'receivable_aging' || activeTab === 'payable_aging') && (
                    <>
                        {(() => {
                            const buckets = activeTab === 'receivable_aging' ? receivableBuckets : payableBuckets;
                            const rows = activeTab === 'receivable_aging' ? receivableAging : payableAging;
                            return (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
                                            <div className="text-[11px] font-bold uppercase text-emerald-700">0 - 30 Days (Recent)</div>
                                            <div className="text-[20px] font-black text-emerald-900 mt-1 tabular-nums"><Taka />{Number(buckets['0_30'] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
                                            <div className="text-[11px] font-bold uppercase text-blue-700">31 - 60 Days (Moderate)</div>
                                            <div className="text-[20px] font-black text-blue-900 mt-1 tabular-nums"><Taka />{Number(buckets['31_60'] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
                                            <div className="text-[11px] font-bold uppercase text-amber-700">61 - 90 Days (Old)</div>
                                            <div className="text-[20px] font-black text-amber-900 mt-1 tabular-nums"><Taka />{Number(buckets['61_90'] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
                                            <div className="text-[11px] font-bold uppercase text-rose-700">90+ Days (Critical Overdue)</div>
                                            <div className="text-[20px] font-black text-rose-900 mt-1 tabular-nums"><Taka />{Number(buckets['90_plus'] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-800 bg-slate-900 text-white p-4 shadow-sm">
                                            <div className="text-[11px] font-bold uppercase text-slate-300">Total Due</div>
                                            <div className="text-[20px] font-black text-emerald-400 mt-1 tabular-nums"><Taka />{Number(buckets['total'] || 0).toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table id="printable-analysis-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                                                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                                    <tr>
                                                        <th className="px-5 py-4 text-[11px] font-extrabold text-[#64748B] uppercase">Ref / Invoice</th>
                                                        <th className="px-5 py-4 text-[11px] font-extrabold text-[#64748B] uppercase">
                                                            {activeTab === 'receivable_aging' ? 'Client Name & Phone' : 'Vendor & Project'}
                                                        </th>
                                                        <th className="px-5 py-4 text-[11px] font-extrabold text-[#64748B] uppercase">
                                                            {activeTab === 'receivable_aging' ? 'Due Date' : 'Bill Date'}
                                                        </th>
                                                        <th className="px-5 py-4 text-center text-[11px] font-extrabold text-[#64748B] uppercase">
                                                            {activeTab === 'receivable_aging' ? 'Overdue Age' : 'Age'}
                                                        </th>
                                                        <th className="px-5 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Total Bill</th>
                                                        <th className="px-5 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Paid</th>
                                                        <th className="px-5 py-4 text-right text-[11px] font-extrabold text-[#64748B] uppercase">Outstanding Due</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[13.5px] divide-y divide-gray-100">
                                                    {rows.length > 0 ? (
                                                        rows.map((r, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                                <td className="px-5 py-4 font-black text-indigo-700">
                                                                    {r.ref}
                                                                    {r.title && <div className="text-[11.5px] font-semibold text-slate-500">{r.title}</div>}
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <div className="font-bold text-slate-900">{r.party_name} {r.company_name ? `(${r.company_name})` : ''}</div>
                                                                    <div className="text-[12px] text-slate-500">
                                                                        {r.phone && <span><i className="fa-solid fa-phone text-[10px] mr-1"></i>{r.phone}</span>}
                                                                        {r.project && <span className="ml-2 text-indigo-600 font-semibold">• {r.project}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4 font-semibold text-slate-600">{r.date || 'N/A'}</td>
                                                                <td className="px-5 py-4 text-center">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-black border ${bucketColor(r.bucket)}`}>
                                                                        <i className="fa-regular fa-clock text-[10px]"></i>
                                                                        {r.days_old} {r.days_old === 1 ? 'day' : 'days'} ({r.bucket})
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-4 text-right font-semibold text-slate-700 tabular-nums">
                                                                    <Taka />{Number(r.total_bill).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="px-5 py-4 text-right font-semibold text-emerald-700 tabular-nums">
                                                                    <Taka />{Number(r.paid).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="px-5 py-4 text-right font-black text-rose-700 text-[15px] bg-rose-50/20 tabular-nums">
                                                                    <Taka />{Number(r.due).toLocaleString('en-IN')}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="7" className="px-6 py-20 text-center text-gray-500 font-bold">No overdue records found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
