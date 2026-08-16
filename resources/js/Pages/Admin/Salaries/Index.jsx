import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Index({ salaries = { data: [], links: [] }, users = [], accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [filterMonth, setFilterMonth] = useState(() => new URLSearchParams(window.location.search).get('month') || '');
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        return raw === "all" ? "all" : (raw ? Number(raw) : 25);
    });
    const isFirstRender = useRef(true);

    const today = new Date();
    const defaultMonthYear = `${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    // Payslip Generator Form (Includes Payment Splits)
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10),
        payments: [{ account_id: '', amount: '' }]
    });

    // Pay Salary Form (For future installments)
    const paymentForm = useForm({
        account_id: '', amount: '', date: new Date().toISOString().slice(0, 10), note: ''
    });

    // Auto-Fetch Basic Salary
    const handleUserSelect = (selected) => {
        const userId = selected ? selected.value : "";
        if (!userId) {
            setData(prev => ({ ...prev, user_id: "", basic_salary: 0, allowances: 0, bonus: 0, deductions: 0 }));
            return;
        }
        const selectedUser = users.find(u => Number(u.id) === Number(userId));
        setData(prev => ({
            ...prev, user_id: userId,
            basic_salary: selectedUser?.employee_profile?.basic_salary || selectedUser?.basic_salary || 0,
            allowances: 0, bonus: 0, deductions: 0
        }));
    };

    // Auto Calculate Net Pay & Auto-fill Payment Amount
    useEffect(() => {
        const basic = parseFloat(data.basic_salary) || 0;
        const allow = parseFloat(data.allowances) || 0;
        const bns = parseFloat(data.bonus) || 0;
        const ded = parseFloat(data.deductions) || 0;
        const net = (basic + allow + bns - ded).toFixed(2);

        setData(prev => {
            const newData = { ...prev, net_pay: net };
            // Auto fill the first split if status is paid/partially_paid and only 1 split exists
            if (newData.payments.length === 1 && newData.status !== 'unpaid' && !editMode) {
                newData.payments[0].amount = net;
            }
            return newData;
        });
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions, data.status]);

    // Live Search
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (filterMonth.trim()) params.month = filterMonth;
            if (perPage !== 25) params.per_page = perPage;
            router.get(route('admin.salaries.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterMonth, perPage]);

    const recordList = salaries.data || (Array.isArray(salaries) ? salaries : []);
    const totalPayroll = recordList.reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);
    const totalPaid = recordList.reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0), 0);
    const totalUnpaid = recordList.reduce((acc, curr) => acc + parseFloat(curr.due_amount || 0), 0);

    const formatCurrency = (val) => `${parseFloat(val || 0).toLocaleString('en-IN')}`;

    const handleInputFocus = (field) => { if (data[field] == 0) setData(field, ''); };
    const handleInputBlur = (field) => { if (data[field] === '') setData(field, 0); };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Month,Employee,Net Pay,Paid,Due,Status\n"];
        const rows = recordList.map(s => `"${s.month_year}","${s.user?.name || ''}","${s.net_pay}","${s.paid_amount}","${s.due_amount}","${s.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Payroll_Report_${new Date().toISOString().slice(0, 10)}.csv`); link.click();
    };

    const handlePrint = () => window.print();

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10), payments: [{ account_id: '', amount: '' }] });
        setEditMode(false); setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors();
        let formattedPayments = sal.transactions?.length > 0 
            ? sal.transactions.map(t => ({ account_id: t.account_id, amount: t.amount }))
            : [{ account_id: '', amount: sal.net_pay }];
            
        setData({ id: sal.id, user_id: sal.user_id || '', month_year: sal.month_year || defaultMonthYear, basic_salary: sal.basic_salary || 0, allowances: sal.allowances || 0, bonus: sal.bonus || 0, deductions: sal.deductions || 0, net_pay: sal.net_pay || 0, status: sal.status || 'unpaid', payment_date: sal.payment_date || new Date().toISOString().slice(0, 10), payments: formattedPayments });
        setEditMode(true); setShowModal(true);
    };

    const openPaymentModal = (sal) => {
        setSelectedRecord(sal);
        paymentForm.reset();
        paymentForm.clearErrors();
        paymentForm.setData({ account_id: '', amount: sal.due_amount, date: new Date().toISOString().slice(0, 10), note: '' });
        setShowPaymentModal(true);
    };

    const openViewModal = (record) => { setSelectedRecord(record); setShowViewModal(true); };

    // --- Multi-Account Split Handlers ---
    const addPaymentRow = () => setData('payments', [...data.payments, { account_id: '', amount: '' }]);
    const removePaymentRow = (index) => setData('payments', data.payments.filter((_, i) => i !== index));
    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...data.payments];
        newPayments[index][field] = value;
        setData('payments', newPayments);
    };

    // --- Submit Logic ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.status !== 'unpaid') {
            const sumOfPayments = data.payments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
            if (sumOfPayments > data.net_pay) {
                return Swal.fire("Amount Exceeded!", `You cannot pay more than Net Pay (৳${data.net_pay}). Your splits total ৳${sumOfPayments}.`, "error");
            }
            const emptyAccount = data.payments.find(p => !p.account_id);
            if (emptyAccount) return Swal.fire("Required", "Please select an account for all payment splits.", "warning");
        }

        if (editMode) {
            put(route('admin.salaries.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); } });
        } else {
            post(route('admin.salaries.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Payslip Generated!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); } });
        }
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        if (parseFloat(paymentForm.data.amount) > parseFloat(selectedRecord.due_amount)) {
            return Swal.fire("Error", "Payment cannot exceed the due amount.", "error");
        }
        paymentForm.post(route('salaries.pay', selectedRecord.id), {
            onSuccess: () => {
                setShowPaymentModal(false);
                Swal.fire({ icon: 'success', title: 'Payment Added!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Payslip?', text: 'All linked payments will be refunded to your accounts.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete' }).then((res) => {
            if (res.isConfirmed) destroy(route('admin.salaries.destroy', id), { onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }) });
        });
    };

    const getStatusStyle = (status) => {
        const styles = { paid: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-600', label: 'Paid' }, unpaid: { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-600', label: 'Unpaid' }, partially_paid: { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-600', label: 'Partial' } };
        return styles[status] || { bg: 'bg-gray-50', text: 'text-gray-600', label: status };
    };

    const selectStyles = { 
        control: (provided, state) => ({ ...provided, minHeight: "44px", borderRadius: "0.75rem", border: state.isFocused ? "1px solid var(--accent, #6366f1)" : "1px solid #d1d5db", boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "none", fontSize: "14px", background: "#fff", cursor: "pointer" }), 
        option: (provided, state) => ({ ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "var(--accent, #4f46e5)" : state.isFocused ? "#f8fafc" : "#fff", color: state.isSelected ? "#fff" : "#111827", cursor: "pointer" }), 
        menuPortal: base => ({ ...base, zIndex: 9999 }) 
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-table, #printable-table * { visibility: visible; }
                    #printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">
                {/* Header & Cards */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Human Resources
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">Generate payslips, process partial or full salaries, and track multi-account payments.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 no-print">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center gap-5 transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white items-center justify-center shadow-lg"><i className="fa-solid fa-money-check-dollar text-[20px]"></i></div>
                        <div><p className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Total Payroll</p><h3 className="text-[26px] font-black text-gray-900 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{totalPayroll.toLocaleString('en-IN')}</h3></div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm flex items-center gap-5 transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white items-center justify-center shadow-lg"><i className="fa-solid fa-check-double text-[20px]"></i></div>
                        <div><p className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-600">Cleared / Paid</p><h3 className="text-[26px] font-black text-emerald-700 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{totalPaid.toLocaleString('en-IN')}</h3></div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm flex items-center gap-5 transition-shadow hover:shadow-md">
                        <div className="flex h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white items-center justify-center shadow-lg"><i className="fa-solid fa-clock-rotate-left text-[20px]"></i></div>
                        <div><p className="text-[11.5px] font-bold uppercase tracking-wider text-rose-600">Pending / Due</p><h3 className="text-[26px] font-black text-rose-700 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{totalUnpaid.toLocaleString('en-IN')}</h3></div>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden flex flex-col" id="printable-table">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-5 bg-gray-50/40 gap-4 no-print">
                        <div className="text-[16px] font-bold text-[#202223] flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fa-solid fa-file-invoice text-[14px]"></i></div>
                            Payslip Directory
                        </div>
                        {hasPermission('create_salary') && (
                            <button onClick={openCreateModal} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-700 shadow-sm transition-all hover:shadow-md"><i className="fa-solid fa-plus mr-1.5"></i> Process Salary</button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 no-print">
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400"><svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div>
                                </div>
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"><i className="fas fa-print text-gray-500"></i> Print</button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-[13.5px] font-bold text-gray-700 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm w-full sm:w-[160px] cursor-pointer" />
                            <div className="relative w-full sm:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-[13px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white font-medium" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-12">SL</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Month</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] w-[25%]">Employee</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Net Pay</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Paid</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] border-r border-gray-100">Due</th>
                                    <th className="px-6 py-4.5 text-center text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Status</th>
                                    <th className="px-6 py-4.5 text-left text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em]">Account Details (Splits)</th>
                                    <th className="px-6 py-4.5 text-right text-[11.5px] font-extrabold text-[#64748B] uppercase tracking-[0.06em] no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223] divide-y divide-gray-100">
                                {recordList.length > 0 ? recordList.map((sal, index) => {
                                    const statusStyle = getStatusStyle(sal.status);
                                    return (
                                    <tr key={sal.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-400 text-center">{salaries.from ? salaries.from + index : index + 1}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[11.5px] font-bold uppercase tracking-wider shadow-sm">
                                                <i className="fa-regular fa-calendar-days mr-1.5 opacity-70"></i>{sal.month_year}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[12px] font-black uppercase shadow-sm">{(sal.user?.name || '?').charAt(0)}</div>
                                                <div className="font-extrabold text-gray-900 text-[14px]">{sal.user?.name || 'Unknown Employee'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-600 text-[15px] tabular-nums">
                                            <Taka />{Number(sal.net_pay).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-[14.5px] tabular-nums bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                                            {sal.paid_amount > 0 ? <><Taka />{Number(sal.paid_amount).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-rose-600 text-[14.5px] tabular-nums bg-rose-50/10 group-hover:bg-rose-50/30 transition-colors border-r border-gray-100">
                                            {sal.due_amount > 0 ? <><Taka />{Number(sal.due_amount).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                                        </td>
                                        
                                        {/* Premium Split Details Display */}
                                        <td className="px-6 py-4">
                                            {sal.transactions?.length > 0 ? (
                                                <div className="flex flex-col gap-1.5">
                                                    {sal.transactions.map(t => (
                                                        <div key={t.id} className="flex items-center justify-between gap-3 bg-white border border-gray-200/70 rounded-md px-2.5 py-1.5 min-w-[180px] shadow-sm">
                                                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 truncate max-w-[150px]" title={t.account?.name}>
                                                                <i className="fa-solid fa-building-columns text-indigo-400"></i> {t.account?.name}
                                                            </span>
                                                            <span className="text-[11.5px] font-black text-emerald-600 tabular-nums"><Taka className="text-[10px]"/>{Number(t.amount).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic font-medium text-[12px]">Pending Payment</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right no-print">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {sal.status !== 'paid' && hasPermission('create_salary') && (
                                                    <button onClick={() => openPaymentModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm" title="Pay Installment">
                                                        <i className="fa-solid fa-hand-holding-dollar text-[13px]"></i>
                                                    </button>
                                                )}
                                                {hasPermission('view_salary') && <button onClick={() => openViewModal(sal)} className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="View Payslip"><i className="fa-regular fa-file-lines text-[13px]"></i></button>}
                                                {hasPermission('edit_salary') && <button onClick={() => openEditModal(sal)} className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit"><i className="fa-regular fa-pen-to-square text-[13px]"></i></button>}
                                                {hasPermission('delete_salary') && <button onClick={() => handleDelete(sal.id)} className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete"><i className="fa-regular fa-trash-can text-[13px]"></i></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )}) : <tr><td colSpan="9" className="text-center py-20 text-gray-500 font-bold"><i className="fa-solid fa-money-check-dollar text-4xl mb-3 block text-gray-300"></i>No records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {salaries.links && salaries.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-[#f6f6f7] px-6 py-4 no-print">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {salaries.total > 0 && `Showing ${salaries.from || 0} to ${salaries.to || 0} of ${salaries.total || 0} records`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {salaries.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'}`} preserveState dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 PAY SALARY MODAL (FOR INSTALLMENTS) --- */}
            {showPaymentModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-emerald-100">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> Process Payment
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Pay Salary Installment</h3>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Employee</span>
                                        <span className="text-[14.5px] font-black text-gray-900">{selectedRecord.user?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">Due Amount</span>
                                        <span className="text-[18px] font-black text-rose-600 tabular-nums"><Taka />{selectedRecord.due_amount}</span>
                                    </div>
                                </div>

                                <div className="relative z-[60]">
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Pay From Account <span className="text-red-500">*</span></label>
                                    <Select 
                                        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                        value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(paymentForm.data.account_id)) || null}
                                        onChange={e => paymentForm.setData('account_id', e ? e.value : "")}
                                        placeholder="Select Account..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                    />
                                    {paymentForm.errors.account_id && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{paymentForm.errors.account_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Amount to Pay <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-[16px]" />
                                        <input 
                                            type="number" step="0.01" min="1" max={selectedRecord.due_amount} 
                                            value={paymentForm.data.amount} onChange={e => paymentForm.setData('amount', e.target.value)} 
                                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 pl-10 pr-4 py-3 text-[16px] font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" placeholder="0.00" required 
                                        />
                                    </div>
                                    {paymentForm.errors.amount && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{paymentForm.errors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                    <input type="date" value={paymentForm.data.date} onChange={e => paymentForm.setData('date', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500 transition-all shadow-sm" required />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Note (Optional)</label>
                                    <input type="text" value={paymentForm.data.note} onChange={e => paymentForm.setData('note', e.target.value)} placeholder="e.g. Festival Advance" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-indigo-500 transition-all shadow-sm" />
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={paymentForm.processing} className="rounded-xl bg-emerald-600 px-8 py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-70 flex items-center gap-2"><i className="fa-solid fa-check"></i> Pay Now</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 STUNNING VIEW PAYSLIP MODAL --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-md bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-6 shrink-0 overflow-hidden">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-10 translate-x-10 -translate-y-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[18px] font-extrabold text-white flex items-center gap-2"><i className="fa-solid fa-receipt text-indigo-200"></i> Payslip Overview</h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto custom-table-scroll relative space-y-6">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg text-white text-2xl font-black mb-3 uppercase">{(selectedRecord.user?.name || "?").charAt(0)}</div>
                                <h2 className="text-[22px] font-black text-gray-900 tracking-tight">{selectedRecord.user?.name || "Unknown"}</h2>
                                <p className="text-[12px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Salary For: <span className="text-indigo-600">{selectedRecord.month_year}</span></p>
                                <div className="mt-3"><span className={`inline-flex px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedRecord.status).bg} ${getStatusStyle(selectedRecord.status).text}`}>{getStatusStyle(selectedRecord.status).label}</span></div>
                            </div>
                            
                            <div className="space-y-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-200"><span className="text-[12.5px] font-bold text-gray-500">Basic Salary</span><span className="text-[14.5px] font-black text-gray-800"><Taka />{parseFloat(selectedRecord.basic_salary).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-200"><span className="text-[12.5px] font-bold text-gray-500">Allowances</span><span className="text-[14.5px] font-black text-emerald-600">+ <Taka />{parseFloat(selectedRecord.allowances).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-200"><span className="text-[12.5px] font-bold text-gray-500">Bonus</span><span className="text-[14.5px] font-black text-emerald-600">+ <Taka />{parseFloat(selectedRecord.bonus).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-2.5"><span className="text-[12.5px] font-bold text-gray-500">Deductions</span><span className="text-[14.5px] font-black text-rose-600">- <Taka />{parseFloat(selectedRecord.deductions).toLocaleString('en-IN')}</span></div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200 text-white relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
                                <span className="text-[15px] font-black uppercase tracking-wider relative z-10">Net Pay</span>
                                <div className="text-[28px] font-black tracking-tight tabular-nums relative z-10"><Taka className="text-[20px] mr-1" />{Number(selectedRecord.net_pay).toLocaleString('en-IN')}</div>
                            </div>

                            {/* Payment Transactions List */}
                            {selectedRecord.transactions?.length > 0 && (
                                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col gap-3">
                                    <div className="text-[12px] font-black text-emerald-800 uppercase tracking-wider border-b border-emerald-200/50 pb-3 flex items-center gap-2">
                                        <i className="fa-solid fa-money-check-dollar"></i> Payment History
                                    </div>
                                    <div className="flex flex-col gap-2.5 mt-1">
                                        {selectedRecord.transactions.map(t => (
                                            <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 flex items-center gap-1.5 text-[12.5px]"><i className="fa-solid fa-building-columns text-indigo-400 text-[10px]"></i> {t.account?.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-semibold mt-0.5"><i className="fa-regular fa-calendar mr-1"></i>{t.transaction_date}</span>
                                                </div>
                                                <span className="font-black text-emerald-700 tabular-nums text-[15px]"><Taka />{Number(t.amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedRecord.status === 'partially_paid' && (
                                        <div className="flex justify-between items-center pt-3 border-t border-emerald-200/50 mt-1">
                                            <span className="text-[12px] font-bold text-rose-600">Remaining Due</span>
                                            <span className="text-[15px] font-black text-rose-600 tabular-nums"><Taka />{Number(selectedRecord.due_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">Close Payslip</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 ADD/EDIT PAYSLIP MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-file-invoice"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Modify Payslip Record" : "Generate New Payslip"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative z-[60]">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Employee <span className="text-red-500">*</span></label>
                                        <Select 
                                            options={users.map((u) => ({ value: u.id, label: u.name }))} 
                                            value={users.map((u) => ({ value: u.id, label: u.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null} 
                                            onChange={handleUserSelect} 
                                            isDisabled={editMode} 
                                            placeholder="-- Search Employee --"
                                            isSearchable isClearable
                                            styles={selectStyles} 
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null} 
                                        />
                                        {errors.user_id && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.user_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Month-Year <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.month_year} onChange={e => setData('month_year', e.target.value)} className={`w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none transition-shadow ${editMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm'}`} disabled={editMode} />
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-200 pb-2 mb-4">Salary Components</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Basic Salary</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input 
                                                    type="number" step="0.01" min="0"
                                                    value={data.basic_salary} 
                                                    onFocus={() => handleInputFocus('basic_salary')}
                                                    onBlur={() => handleInputBlur('basic_salary')}
                                                    onChange={e => setData('basic_salary', e.target.value)} 
                                                    className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-3 text-[14.5px] font-bold text-gray-900 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Allowances (+)</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                                                <input 
                                                    type="number" step="0.01" min="0"
                                                    value={data.allowances} 
                                                    onFocus={() => handleInputFocus('allowances')}
                                                    onBlur={() => handleInputBlur('allowances')}
                                                    onChange={e => setData('allowances', e.target.value)} 
                                                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 pl-9 pr-4 py-3 text-[14.5px] font-bold text-emerald-700 outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-2">Bonus (+)</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                                                <input 
                                                    type="number" step="0.01" min="0"
                                                    value={data.bonus} 
                                                    onFocus={() => handleInputFocus('bonus')}
                                                    onBlur={() => handleInputBlur('bonus')}
                                                    onChange={e => setData('bonus', e.target.value)} 
                                                    className="w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-9 pr-4 py-3 text-[14.5px] font-bold text-blue-700 outline-none transition-shadow focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-rose-600 uppercase tracking-wider mb-2">Deductions (-)</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" />
                                                <input 
                                                    type="number" step="0.01" min="0"
                                                    value={data.deductions} 
                                                    onFocus={() => handleInputFocus('deductions')}
                                                    onBlur={() => handleInputBlur('deductions')}
                                                    onChange={e => setData('deductions', e.target.value)} 
                                                    className="w-full rounded-xl border border-rose-200 bg-rose-50/50 pl-9 pr-4 py-3 text-[14.5px] font-bold text-rose-700 outline-none transition-shadow focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 shadow-sm" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Calculated Net Pay</label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-[18px]" />
                                            <input type="text" value={data.net_pay} readOnly className="w-full rounded-xl border border-indigo-200 bg-indigo-50 pl-10 pr-4 py-3 text-[18px] font-black text-indigo-800 cursor-not-allowed shadow-inner" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Status <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full appearance-none bg-none [background-image:none] rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                                <option value="unpaid">⏳ Unpaid (Keep as Due)</option>
                                                <option value="paid">✅ Paid (Deduct from Accounts)</option>
                                                <option value="partially_paid">⌛ Partially Paid (Installment)</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>

                                {/* 🟢 PREMIUM MULTI-ACCOUNT PAYMENT SECTION */}
                                {(data.status === 'paid' || data.status === 'partially_paid') && (
                                    <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                                        <div className="flex justify-between items-center mb-4 border-b border-emerald-200/60 pb-3">
                                            <label className="text-[13px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                                                <i className="fa-solid fa-code-branch"></i> Payment Split Breakdown
                                            </label>
                                            <label className="text-[12px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm"><Taka /> {data.net_pay}</label>
                                        </div>

                                        <div className="space-y-3 relative z-40">
                                            {data.payments.map((payment, index) => (
                                                <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                    <div className="w-full sm:flex-1 relative z-50">
                                                        <Select 
                                                            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                            value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(payment.account_id)) || null}
                                                            onChange={e => handlePaymentChange(index, 'account_id', e ? e.value : "")}
                                                            placeholder="Select Account..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                        />
                                                    </div>
                                                    <div className="w-full sm:w-[160px] relative shrink-0">
                                                        <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                                                        <input 
                                                            type="number" step="0.01" min="0" value={payment.amount} onChange={e => handlePaymentChange(index, 'amount', e.target.value)} 
                                                            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-[14px] font-bold text-gray-900 outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20" placeholder="0.00" 
                                                        />
                                                    </div>
                                                    {data.payments.length > 1 && (
                                                        <button type="button" onClick={() => removePaymentRow(index)} className="h-11 w-11 shrink-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-200 flex justify-center items-center shadow-sm">
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-emerald-200/60">
                                            <button type="button" onClick={addPaymentRow} className="text-[12px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
                                                <i className="fa-solid fa-plus"></i> Add Split
                                            </button>
                                            <div className="text-[14px] font-bold text-gray-700">
                                                Paying: <span className={`text-[16px] font-black ml-1 ${Math.round(data.payments.reduce((a,c)=>a+Number(c.amount||0),0)) <= Math.round(data.net_pay) ? 'text-emerald-600' : 'text-rose-600'}`}>৳ {data.payments.reduce((a,c)=>a+Number(c.amount||0),0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-5 border-t border-emerald-200/60">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                            <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-sm" required={data.status !== 'unpaid'} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Payslip" : "Save Payslip"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}