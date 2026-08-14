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
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
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
        id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, net_pay: 0, status: 'unpaid', payment_date: '', payment_method: '', account_id: ''
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
                route('admin.salaries.index'), params,
                { preserveState: true, replace: true, preserveScroll: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterMonth, perPage]);

    const recordList = salaries.data || (Array.isArray(salaries) ? salaries : []);

    // Summary Calculations for current view
    const totalPayroll = recordList.reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);
    const totalPaid = recordList.filter(s => s.status === 'paid').reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);
    const totalUnpaid = recordList.filter(s => s.status === 'unpaid').reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);

    const getAccountName = (record) => {
        if (record?.transactions?.length > 0 && record.transactions[0].account) {
            return record.transactions[0].account.name;
        }
        return "N/A";
    };

    const formatCurrency = (val) => `৳ ${parseFloat(val || 0).toLocaleString('en-IN')}`;

    // --- Export Tools ---
    const handleCopy = () => { /* Same as before */ };
    const handleCSV = () => { /* Same as before */ };
    const handleExcel = () => { /* Same as before */ };
    const handlePDF = () => { /* Same as before */ };
    const handlePrint = () => { /* Same as before */ };

    // --- Modals & Actions ---
    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', user_id: '', month_year: defaultMonthYear, basic_salary: '', allowances: '', bonus: '', deductions: '', net_pay: 0, status: 'unpaid', account_id: '', payment_date: new Date().toISOString().slice(0, 10), payment_method: '' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors();
        const existingAccountId = sal.transactions?.length > 0 ? sal.transactions[0].account_id : '';
        setData({ id: sal.id, user_id: sal.user_id || '', month_year: sal.month_year || defaultMonthYear, basic_salary: sal.basic_salary || 0, allowances: sal.allowances || 0, bonus: sal.bonus || 0, deductions: sal.deductions || 0, net_pay: sal.net_pay || 0, status: sal.status || 'unpaid', payment_date: sal.payment_date || new Date().toISOString().slice(0, 10), account_id: existingAccountId });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (record) => { setSelectedRecord(record); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.status === 'paid' && (!data.account_id || !data.payment_date)) {
            return Swal.fire("Required", "Please provide Account and Payment Date for paid salaries.", "warning");
        }
        if (editMode) {
            put(route('admin.salaries.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false }); } });
        } else {
            post(route('admin.salaries.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Processed Successfully!', timer: 1500, showConfirmButton: false }); } });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Record?', text: 'This salary record will be permanently deleted!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete It' }).then((result) => {
            if (result.isConfirmed) destroy(route('admin.salaries.destroy', id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record deleted successfully.', timer: 1500, showConfirmButton: false }) });
        });
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, minHeight: "44px", borderRadius: "0.75rem", border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db", boxShadow: state.isFocused ? "0 0 0 3px rgba(200, 155, 60, 0.15)" : "none", "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "#9ca3af" }, fontSize: "14px", background: "#fff", cursor: "pointer"
        }),
        option: (provided, state) => ({ ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff", color: state.isSelected ? "#fff" : "#111827", cursor: "pointer" }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1500px] mx-auto pb-12">

                {/* 🟢 Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Human Resources
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Process employee salaries, track payments, and generate monthly payslips.
                        </p>
                    </div>
                </div>

                {/* 🟢 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
                                <i className="fa-solid fa-money-check-dollar text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Payroll (Current List)</p>
                                <h3 className="text-[26px] font-black text-gray-900 m-0 tabular-nums tracking-tight">৳ {totalPayroll.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
                                <i className="fa-solid fa-check-double text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-emerald-600/90">Cleared / Paid</p>
                                <h3 className="text-[26px] font-black text-emerald-700 m-0 tabular-nums tracking-tight">৳ {totalPaid.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/30 p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative flex items-center gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-200">
                                <i className="fa-solid fa-clock-rotate-left text-[20px]"></i>
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-rose-600/90">Pending / Unpaid</p>
                                <h3 className="text-[26px] font-black text-rose-700 m-0 tabular-nums tracking-tight">৳ {totalUnpaid.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 Main Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-[#202223] flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                                <i className="fa-solid fa-file-invoice text-[14px]"></i>
                            </div>
                            Payroll Records
                        </div>
                        {hasPermission('create_salary') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-[#b08630] shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-plus"></i> Process Salary
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2.5">
                                <span className="font-medium text-gray-500">Show</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="appearance-none text-center bg-white rounded-xl border border-gray-300 px-4 py-2.5 text-[13.5px] font-bold outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                                >
                                    <option value={10}>10 Rows</option>
                                    <option value={25}>25 Rows</option>
                                    <option value={50}>50 Rows</option>
                                    <option value={100}>100 Rows</option>
                                    <option value="all">All Data</option>
                                </select>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                                <button type="button" onClick={handlePDF} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-700 transition-all hover:bg-rose-100 shadow-sm">
                                    <i className="fas fa-file-pdf"></i> PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full sm:w-[160px]">
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm font-medium"
                                />
                                {filterMonth && (
                                    <button onClick={() => setFilterMonth('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white pl-2">
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>
                            <div className="relative w-full sm:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Salary Month</th>
                                    <th className="px-6 py-4.5">Employee Details</th>
                                    <th className="px-6 py-4.5 text-right">Net Pay</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center">Payment Date</th>
                                    <th className="px-6 py-4.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {recordList.length > 0 ? (
                                    recordList.map((sal, index) => {
                                        const accName = getAccountName(sal);
                                        const isPaid = sal.status === 'paid';

                                        return (
                                            <tr key={sal.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-400">
                                                    {salaries.from ? salaries.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-[12px] font-bold">
                                                        <i className="fa-regular fa-calendar-days mr-1.5 opacity-70"></i>{sal.month_year}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[13px] font-bold uppercase shadow-sm">
                                                            {(sal.user?.name || '?').charAt(0)}
                                                        </div>
                                                        <div className="font-bold text-gray-900 text-[14px]">{sal.user?.name || 'Unknown Employee'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900 text-[15px] tabular-nums">
                                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[13px] mr-1 opacity-60"></i>
                                                    {Number(sal.net_pay).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider border
                                                        ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                                                    `}>
                                                        {sal.status}
                                                    </span>
                                                    {isPaid && accName !== 'N/A' && (
                                                        <div className="text-[10.5px] text-gray-500 mt-1.5 font-bold flex items-center justify-center gap-1 opacity-80">
                                                            <i className="fa-solid fa-building-columns"></i> {accName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-center ${sal.payment_date ? 'text-gray-700 font-bold text-[13px]' : 'text-gray-400 italic font-medium'}`}>
                                                    {sal.payment_date || 'Pending'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {hasPermission('view_salary') && (
                                                            <button onClick={() => openViewModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Payslip">
                                                                <i className="fa-regular fa-file-lines text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_salary') && (
                                                            <button onClick={() => openEditModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_salary') && (
                                                            <button onClick={() => handleDelete(sal.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete">
                                                                <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-money-check-dollar text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No salary records found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or process a new salary.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {salaries.links && salaries.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {salaries.total > 0 && `Showing ${salaries.from || 0} to ${salaries.to || 0} of ${salaries.total || 0} records`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {salaries.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW PAYSLIP MODAL (Premium Receipt Design) --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Payslip Overview
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} className="h-8 w-8 rounded-full bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scroll relative">

                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-50 border-4 border-white shadow-md text-indigo-600 text-2xl font-black mb-3 uppercase">
                                    {(selectedRecord.user?.name || "?").charAt(0)}
                                </div>
                                <h2 className="text-[22px] font-black text-gray-900">{selectedRecord.user?.name || "Unknown"}</h2>
                                <p className="text-[13px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Salary For: <span className="text-indigo-600">{selectedRecord.month_year}</span></p>

                                <div className="mt-4">
                                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border
                                        ${selectedRecord.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                                    `}>
                                        {selectedRecord.status}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                                    <span className="text-[13px] font-bold text-gray-500">Basic Salary</span>
                                    <span className="text-[14px] font-black text-gray-800">{formatCurrency(selectedRecord.basic_salary)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                                    <span className="text-[13px] font-bold text-gray-500">Allowances</span>
                                    <span className="text-[14px] font-black text-emerald-600">+ {formatCurrency(selectedRecord.allowances)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                                    <span className="text-[13px] font-bold text-gray-500">Bonus</span>
                                    <span className="text-[14px] font-black text-emerald-600">+ {formatCurrency(selectedRecord.bonus)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[13px] font-bold text-gray-500">Deductions</span>
                                    <span className="text-[14px] font-black text-rose-600">- {formatCurrency(selectedRecord.deductions)}</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200 mb-6 text-white relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
                                <span className="text-[15px] font-black uppercase tracking-wider relative z-10">Net Pay</span>
                                <div className="text-[28px] font-black tracking-tight tabular-nums relative z-10">
                                    <i className="fa-solid fa-bangladeshi-taka-sign text-[20px] mr-1 opacity-80"></i>
                                    {Number(selectedRecord.net_pay).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {selectedRecord.status === 'paid' && (
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[12px]">
                                        <span className="font-bold text-gray-500 uppercase tracking-wider">Paid On:</span>
                                        <span className="font-black text-gray-800"><i className="fa-regular fa-calendar mr-1 text-gray-400"></i>{selectedRecord.payment_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[12px]">
                                        <span className="font-bold text-gray-500 uppercase tracking-wider">From Account:</span>
                                        <span className="font-black text-emerald-700"><i className="fa-solid fa-building-columns text-emerald-500 mr-1"></i>{getAccountName(selectedRecord)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-end shrink-0">
                            <button type="button" onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                Close Payslip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-money-check-dollar'} text-[var(--accent)]`}></i>
                                {editMode ? "Edit Payroll Record" : "Process New Salary"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form id="salary-form" onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-8 overflow-y-auto custom-scroll space-y-6">

                                {errors.month_year && (
                                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-bold text-red-700">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        {errors.month_year}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Employee *</label>
                                        <Select
                                            options={users.map((u) => ({ value: u.id, label: u.name }))}
                                            value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                            onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                            placeholder="Choose Employee..."
                                            isSearchable
                                            isDisabled={editMode}
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.user_id && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.user_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Month-Year *</label>
                                        <input
                                            type="text"
                                            value={data.month_year}
                                            onChange={e => setData('month_year', e.target.value)}
                                            className={`w-full rounded-xl border px-4 py-3 text-[14px] font-bold outline-none transition-shadow focus:ring-4 focus:ring-indigo-500/10 ${editMode ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-900 border-gray-300 focus:border-indigo-500'}`}
                                            placeholder="MM-YYYY (e.g. 07-2026)"
                                            required
                                            disabled={editMode}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Basic Salary (৳) *</label>
                                        <input
                                            type="number" step="0.01" value={data.basic_salary} onChange={e => setData('basic_salary', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] font-black text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-shadow"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Allowances (+ ৳)</label>
                                        <input
                                            type="number" step="0.01" value={data.allowances} onChange={e => setData('allowances', e.target.value)}
                                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-[15px] font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-2">Bonus (+ ৳)</label>
                                        <input
                                            type="number" step="0.01" value={data.bonus} onChange={e => setData('bonus', e.target.value)}
                                            className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-[15px] font-black text-blue-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-rose-600 uppercase tracking-wider mb-2">Deductions (- ৳)</label>
                                        <input
                                            type="number" step="0.01" value={data.deductions} onChange={e => setData('deductions', e.target.value)}
                                            className="w-full rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-[15px] font-black text-rose-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Total Net Pay (৳)</label>
                                        <input
                                            type="text" value={data.net_pay} readOnly
                                            className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-[18px] font-black text-indigo-800 outline-none cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Status *</label>
                                        <select
                                            value={data.status} onChange={e => setData('status', e.target.value)}
                                            className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14px] font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-shadow cursor-pointer"
                                            required
                                        >
                                            <option value="unpaid">⏳ Unpaid (Keep as Due)</option>
                                            <option value="paid">✅ Paid (Deduct from Bank/Cash)</option>
                                        </select>
                                    </div>
                                </div>

                                {data.status === 'paid' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl mt-4 animate-[fadeIn_0.3s_ease-out]">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">From Account *</label>
                                            <Select
                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                onChange={e => setData('account_id', e ? e.value : "")}
                                                placeholder="Choose Account..."
                                                isSearchable
                                                styles={selectStyles}
                                                required={data.status === 'paid'}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.account_id && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date *</label>
                                            <input
                                                type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-shadow"
                                                required={data.status === 'paid'}
                                            />
                                        </div>
                                    </div>
                                )}

                            </div>
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" form="salary-form" disabled={processing} className="rounded-xl bg-[var(--accent)] px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#b08630] shadow-md disabled:opacity-70 flex items-center gap-2">
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
