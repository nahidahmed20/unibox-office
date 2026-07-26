import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: `${window.location.origin}/images/logo.png`,
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ salaries = { data: [], links: [] }, users = [], accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Details Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [filterMonth, setFilterMonth] = useState(() => new URLSearchParams(window.location.search).get('month') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    const today = new Date();
    const defaultMonthYear = `${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        user_id: '',
        month_year: defaultMonthYear,
        basic_salary: 0,
        allowances: 0,
        bonus: 0,
        deductions: 0,
        net_pay: 0,
        status: 'unpaid',
        payment_date: '',
        payment_method: '',
        account_id: ''
    });

    // Auto calculate Net Pay whenever values change
    useEffect(() => {
        const basic = parseFloat(data.basic_salary) || 0;
        const allow = parseFloat(data.allowances) || 0;
        const bns = parseFloat(data.bonus) || 0;
        const ded = parseFloat(data.deductions) || 0;
        setData('net_pay', (basic + allow + bns - ded).toFixed(2));
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions]);

    // --- Live Search, Filter & Pagination Sync ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (filterMonth.trim()) params.month = filterMonth;
            if (perPage !== 25) params.per_page = perPage;

            router.get(
                route('admin.salaries.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterMonth, perPage]);

    const recordList = salaries.data || (Array.isArray(salaries) ? salaries : []);

    // Helper to get Account Name
    const getAccountName = (record) => {
        if (record?.transactions?.length > 0 && record.transactions[0].account) {
            return record.transactions[0].account.name;
        }
        return "N/A";
    };

    // --- Export Tools ---
    const formatCurrency = (val) => `BDT ${parseFloat(val || 0).toLocaleString('en-IN')}`;

    const handleCopy = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = recordList
            .map((s) => `${s.month_year}\t${s.user?.name || "Unknown"}\t${s.basic_salary}\t${s.net_pay}\t${s.status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const rows = [
            ['Month', 'Employee Name', 'Basic Salary', 'Net Pay', 'Status', 'Payment Date'],
            ...recordList.map(s => [
                `"${s.month_year}"`,
                `"${s.user?.name ?? 'Unknown'}"`,
                s.basic_salary || 0,
                s.net_pay || 0,
                s.status?.toUpperCase(),
                s.payment_date || '-'
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Payroll_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExcel = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const ws = XLSX.utils.json_to_sheet(
            recordList.map(s => ({
                "Month": s.month_year,
                "Employee Name": s.user?.name ?? 'Unknown',
                "Basic Salary": s.basic_salary || 0,
                "Allowances": s.allowances || 0,
                "Bonus": s.bonus || 0,
                "Deductions": s.deductions || 0,
                "Net Pay": s.net_pay || 0,
                "Status": s.status?.toUpperCase(),
                "Payment Date": s.payment_date || '-'
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Payroll_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePDF = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Month', 'Employee Name', 'Basic', 'Net Pay', 'Status']],
            body: recordList.map(s => [
                s.month_year,
                s.user?.name ?? 'Unknown',
                formatCurrency(s.basic_salary),
                formatCurrency(s.net_pay),
                s.status?.toUpperCase()
            ])
        });
        doc.save(`Payroll_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Payroll Report</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        h2.report-title { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                        p.report-date { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <h2 class="report-title">Company Payroll Report ${filterMonth ? `(${filterMonth})` : ''}</h2>
                    <p class="report-date">Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();

        setData({
            id: '',
            user_id: '',
            month_year: defaultMonthYear,
            basic_salary: 0,
            allowances: 0,
            bonus: 0,
            deductions: 0,
            net_pay: 0,
            status: 'unpaid',
            account_id: '',
            payment_date: new Date().toISOString().slice(0, 10),
            payment_method: ''
        });

        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors();
        const existingAccountId = sal.transactions?.length > 0 ? sal.transactions[0].account_id : '';
        setData({
            id: sal.id,
            user_id: sal.user_id || '',
            month_year: sal.month_year || defaultMonthYear,
            basic_salary: sal.basic_salary || 0,
            allowances: sal.allowances || 0,
            bonus: sal.bonus || 0,
            deductions: sal.deductions || 0,
            net_pay: sal.net_pay || 0,
            status: sal.status || 'unpaid',
            payment_date: sal.payment_date || new Date().toISOString().slice(0, 10),
            account_id: existingAccountId
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (record) => {
        setSelectedRecord(record);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.status === 'paid' && (!data.account_id || !data.payment_date)) {
            return Swal.fire("Required", "Please provide Account and Payment Date for paid salaries.", "warning");
        }

        if (editMode) {
            put(route('admin.salaries.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.salaries.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Processed Successfully!', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Record?',
            text: 'This salary record will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.salaries.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "42px",
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" },
            fontSize: "14px",
            background: "#fff",
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
            cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />

            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Employee Salaries</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage payroll records, view reports, and process payments.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-money-check-dollar text-[var(--accent)]"></i> Payroll Records
                        </div>
                        {hasPermission('create_salary') && (
                        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                            <i className="fa-solid fa-plus"></i> Process Salary
                        </button>
                        )}
                    </div>

                    {/* Toolbar / Filters */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">

                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button type="button" onClick={handleExcel} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> Excel
                                </button>
                                <button type="button" onClick={handleCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-csv text-teal-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePDF} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-pdf text-rose-500"></i> PDF
                                </button>
                                <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {/* Month Filter */}
                            <div className="relative w-full sm:w-[160px]">
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                    title="Filter by Month"
                                />
                                {filterMonth && (
                                    <button
                                        onClick={() => setFilterMonth('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>

                            {/* Search Box */}
                            <div className="relative w-full sm:w-[220px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto brass-scroll">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-right">Net Pay</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Pay Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {recordList.length > 0 ? (
                                    recordList.map((sal, index) => {
                                        const accName = getAccountName(sal);
                                        const isPaid = sal.status === 'paid';

                                        return (
                                            <tr key={sal.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {salaries.from ? salaries.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{sal.month_year}</td>
                                                <td className="px-6 py-4 font-medium text-gray-700">{sal.user?.name || 'Unknown Employee'}</td>
                                                <td className="px-6 py-4 text-right font-extrabold text-teal-700 text-[14.5px]">
                                                    {formatCurrency(sal.net_pay)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                                        ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}
                                                    `}>
                                                        {sal.status}
                                                    </span>
                                                    {isPaid && accName !== 'N/A' && (
                                                        <div className="text-[11px] text-gray-500 mt-1.5 font-medium flex items-center justify-center gap-1">
                                                            <i className="fa-solid fa-building-columns text-gray-400"></i> {accName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-center ${sal.payment_date ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                                                    {sal.payment_date || 'Pending'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('view_salary') && (
                                                            <button onClick={() => openViewModal(sal)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Payslip">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_salary') && (
                                                            <button onClick={() => openEditModal(sal)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_salary') && (
                                                            <button onClick={() => handleDelete(sal.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-money-check-dollar text-4xl text-gray-300 mb-3"></i>
                                                <p>No salary records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {salaries.links && salaries.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                {salaries.total > 0 && `Showing ${salaries.from || 0} to ${salaries.to || 0} of ${salaries.total || 0} entries`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {salaries.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> Payslip Summary
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto brass-scroll">

                            <div className="text-center mb-6">
                                <div className="text-[20px] font-extrabold text-gray-900">
                                    {selectedRecord.user?.name || "N/A"}
                                </div>
                                <div className="text-[13.5px] font-medium text-gray-500 mt-1">
                                    Salary Month: <span className="text-blue-600 font-bold">{selectedRecord.month_year}</span>
                                </div>
                                <span className={`inline-flex mt-3 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border
                                    ${selectedRecord.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}
                                `}>
                                    {selectedRecord.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Basic Salary</span>
                                    <div className="text-[15px] font-bold text-gray-800">{formatCurrency(selectedRecord.basic_salary)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Allowances</span>
                                    <div className="text-[15px] font-bold text-emerald-600">+ {formatCurrency(selectedRecord.allowances)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Bonus</span>
                                    <div className="text-[15px] font-bold text-emerald-600">+ {formatCurrency(selectedRecord.bonus)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Deductions</span>
                                    <div className="text-[15px] font-bold text-red-600">- {formatCurrency(selectedRecord.deductions)}</div>
                                </div>
                            </div>

                            <div className="bg-sky-50 p-5 rounded-xl border border-sky-200 flex justify-between items-center mb-5">
                                <span className="text-[14px] font-bold uppercase tracking-wider text-sky-800">Total Net Pay</span>
                                <div className="text-[22px] font-extrabold text-sky-900">
                                    {formatCurrency(selectedRecord.net_pay)}
                                </div>
                            </div>

                            {selectedRecord.status === 'paid' && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-3">
                                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                        <span className="text-[13px] font-semibold text-gray-600">Paid On:</span>
                                        <span className="text-[13px] font-bold text-gray-900"><i className="fa-regular fa-calendar text-gray-400 mr-1.5"></i>{selectedRecord.payment_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-semibold text-gray-600">Paid From Account:</span>
                                        <span className="text-[13px] font-bold text-teal-700"><i className="fa-solid fa-building-columns text-teal-500 mr-1.5"></i>{getAccountName(selectedRecord)}</span>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button type="button" onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Edit Salary Record" : "✨ Process New Salary"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form id="salary-form" onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">

                                {errors.month_year && (
                                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[13.5px] font-medium text-red-700">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                        {errors.month_year}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Employee *</label>
                                        <Select
                                            options={users.map((u) => ({ value: u.id, label: u.name }))}
                                            value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                            onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                            placeholder="-- Choose Employee --"
                                            isSearchable
                                            isClearable
                                            isDisabled={editMode}
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.user_id && <p className="text-red-500 text-[12px] mt-1">{errors.user_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Month-Year (MM-YYYY) *</label>
                                        <input
                                            type="text"
                                            value={data.month_year}
                                            onChange={e => setData('month_year', e.target.value)}
                                            className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 ${editMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}`}
                                            placeholder="e.g., 07-2026"
                                            required
                                            disabled={editMode}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Basic Salary *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.basic_salary}
                                            onChange={e => setData('basic_salary', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                            required
                                        />
                                        {errors.basic_salary && <p className="text-red-500 text-[12px] mt-1">{errors.basic_salary}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Allowances</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.allowances}
                                            onChange={e => setData('allowances', e.target.value)}
                                            className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[14px] font-medium text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Bonus</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.bonus}
                                            onChange={e => setData('bonus', e.target.value)}
                                            className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[14px] font-medium text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Deductions</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.deductions}
                                            onChange={e => setData('deductions', e.target.value)}
                                            className="w-full rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-[14px] font-medium text-red-800 outline-none transition-shadow focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-2">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-teal-700 mb-1.5">Net Pay (Auto-Calculated)</label>
                                        <input
                                            type="text"
                                            value={data.net_pay}
                                            className="w-full rounded-lg border border-teal-300 bg-teal-50 px-3.5 py-2.5 text-[15px] font-bold text-teal-800 outline-none cursor-not-allowed"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Payment Status *</label>
                                        <select
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                            className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                            required
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Paid Details Conditional Block */}
                                {data.status === 'paid' && (
                                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-gray-50 border border-gray-200 rounded-xl mt-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Account *</label>
                                            <Select
                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                onChange={e => setData('account_id', e ? e.value : "")}
                                                placeholder="-- Choose Account --"
                                                isSearchable
                                                isClearable
                                                styles={selectStyles}
                                                required={data.status === 'paid'}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.account_id && <p className="text-red-500 text-[12px] mt-1">{errors.account_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Payment Date *</label>
                                            <input
                                                type="date"
                                                value={data.payment_date}
                                                onChange={e => setData('payment_date', e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                                required={data.status === 'paid'}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" form="salary-form" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? "Saving..." : (editMode ? "Update Record" : "Save Payroll")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
