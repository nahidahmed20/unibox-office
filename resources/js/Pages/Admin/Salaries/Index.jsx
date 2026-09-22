import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Index({ salaries = { data: [], links: [] }, users = [], accounts = [], totals = null }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
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

    // Payslip Form
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, advance_deduction: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10),
        payments: [{ account_id: '', amount: '', bank_charge: 0 }]
    });

    // Payment Installment Form
    const paymentForm = useForm({
        account_id: '', amount: '', bank_charge: 0, date: new Date().toISOString().slice(0, 10), note: ''
    });

    const handleUserSelect = (selected) => {
        const userId = selected ? selected.value : "";
        if (!userId) {
            setData(prev => ({ ...prev, user_id: "", basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, advance_deduction: 0 }));
            return;
        }
        const selectedUser = users.find(u => Number(u.id) === Number(userId));
        setData(prev => ({
            ...prev, user_id: userId,
            basic_salary: selectedUser?.employee_profile?.basic_salary || selectedUser?.basic_salary || 0,
            allowances: 0, bonus: 0, deductions: 0,
            advance_deduction: 0
        }));
    };

    useEffect(() => {
        const basic = parseFloat(data.basic_salary) || 0;
        const allow = parseFloat(data.allowances) || 0;
        const bns = parseFloat(data.bonus) || 0;
        const ded = parseFloat(data.deductions) || 0;
        const net = (basic + allow + bns - ded - (Number(data.advance_deduction) || 0)).toFixed(2);

        setData(prev => {
            const newData = { ...prev, net_pay: net };
            if (newData.payments.length === 1 && newData.status === 'paid' && !editMode) {
                newData.payments = [{ ...newData.payments[0], amount: net }];
            }
            return newData;
        });
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions, data.advance_deduction, data.status]);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (filterMonth.trim()) params.month = filterMonth;
            params.per_page = perPage;
            router.get(route('admin.salaries.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filterMonth, perPage]);

    const recordList = salaries.data || (Array.isArray(salaries) ? salaries : []);
    const totalPayroll = totals ? Number(totals.net_pay) : recordList.reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);
    const totalPaid = totals ? Number(totals.paid_amount) : recordList.reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0), 0);
    const totalUnpaid = totals ? Number(totals.due_amount) : recordList.reduce((acc, curr) => acc + parseFloat(curr.due_amount || 0), 0);

    const selectedStaff = users.find(u => Number(u.id) === Number(data.user_id));
    const editedSalary = recordList.find(s => s.id === data.id);
    const availableAdvance = Number(selectedStaff?.advance_balance || 0) + (editMode && Number(editedSalary?.user_id) === Number(data.user_id) ? Number(editedSalary?.advance_deduction || 0) : 0);
    const grossBeforeAdvance = Number(data.basic_salary) + Number(data.allowances) + Number(data.bonus) - Number(data.deductions);

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

    // 🟢 MAGIC: Smart Display Status
    const renderStatus = (sal) => {
        if (sal.status === 'paid') return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Paid</span>;
        if (Number(sal.paid_amount) > 0) return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Partial</span>;
        return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">Unpaid</span>;
    };

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, advance_deduction: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10), payments: [{ account_id: '', amount: '', bank_charge: 0 }] });
        setEditMode(false); setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors();
        let formattedPayments = sal.transactions?.length > 0
            ? sal.transactions.map(t => ({ account_id: t.account_id, amount: Number(t.amount) - Number(t.bank_charge || 0), bank_charge: Number(t.bank_charge || 0) }))
            : [{ account_id: '', amount: sal.net_pay }];

        setData({ id: sal.id, user_id: sal.user_id || '', month_year: sal.month_year || defaultMonthYear, basic_salary: sal.basic_salary || 0, allowances: sal.allowances || 0, bonus: sal.bonus || 0, deductions: sal.deductions || 0, advance_deduction: sal.advance_deduction || 0, net_pay: sal.net_pay || 0, status: Number(sal.paid_amount) > 0 ? 'paid' : (sal.status || 'unpaid'), payment_date: sal.payment_date || new Date().toISOString().slice(0, 10), payments: formattedPayments });
        setEditMode(true); setShowModal(true);
    };

    const openPaymentModal = (sal) => {
        setSelectedRecord(sal);
        paymentForm.reset(); paymentForm.clearErrors();
        paymentForm.setData({ account_id: '', amount: sal.due_amount, bank_charge: 0, date: new Date().toISOString().slice(0, 10), note: '' });
        setShowPaymentModal(true);
    };

    const openViewModal = (record) => { setSelectedRecord(record); setShowViewModal(true); };

    const addPaymentRow = () => setData('payments', [...data.payments, { account_id: '', amount: '', bank_charge: 0 }]);
    const removePaymentRow = (index) => setData('payments', data.payments.filter((_, i) => i !== index));
    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...data.payments];
        newPayments[index][field] = value;
        setData('payments', newPayments);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.status === 'paid') {
            const sumOfPayments = data.payments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
            if (sumOfPayments > data.net_pay) {
                return Swal.fire("Amount Exceeded!", `You cannot pay more than Net Pay (৳${data.net_pay}). Your splits total ৳${sumOfPayments}.`, "error");
            }
            const emptyAccount = data.payments.find(p => Number(p.amount) > 0 && !p.account_id);
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
        if (parseFloat(paymentForm.data.amount) > parseFloat(selectedRecord.due_amount)) return Swal.fire("Error", "Payment cannot exceed the due amount.", "error");
        paymentForm.post(route('admin.salaries.add-payment', selectedRecord.id), {
            onSuccess: () => { setShowPaymentModal(false); Swal.fire({ icon: 'success', title: 'Payment Added!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Payslip?', text: 'All linked payments will be refunded to your accounts.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete' }).then((res) => {
            if (res.isConfirmed) destroy(route('admin.salaries.destroy', id), { onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }) });
        });
    };

    const selectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "48px", borderRadius: "0.75rem", border: state.isFocused ? "1px solid var(--accent, #6366f1)" : "1px solid #e5e7eb", boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "none", fontSize: "14px", backgroundColor: state.isDisabled ? "#f3f4f6" : "#f9fafb", cursor: state.isDisabled ? "not-allowed" : "pointer" }),
        option: (provided, state) => ({ ...provided, fontSize: "14px", backgroundColor: state.isSelected ? "var(--accent, #4f46e5)" : state.isFocused ? "#f1f5f9" : "#fff", color: state.isSelected ? "#fff" : "#1e293b", cursor: "pointer" }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Payroll Management" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 6px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
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
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10.5px] font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-users-gear"></i> Human Resources
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1 max-w-lg leading-relaxed font-medium">Generate payslips, process partial or full salaries, and track multi-account payments efficiently.</p>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
                    <div className="relative overflow-hidden rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:shadow-lg">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50 opacity-50"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><i className="fa-solid fa-money-check-dollar text-[22px]"></i></div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Total Payroll</p>
                                <h3 className="text-[24px] font-black text-gray-900 tabular-nums tracking-tight"><Taka className="text-[18px]" />{totalPayroll.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[20px] border border-emerald-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] transition-all hover:shadow-lg">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-50 opacity-50"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><i className="fa-solid fa-check-double text-[22px]"></i></div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 mb-0.5">Cleared / Paid</p>
                                <h3 className="text-[24px] font-black text-gray-900 tabular-nums tracking-tight"><Taka className="text-[18px]" />{totalPaid.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[20px] border border-rose-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(244,63,94,0.1)] transition-all hover:shadow-lg">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-50 opacity-50"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><i className="fa-solid fa-clock-rotate-left text-[22px]"></i></div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-0.5">Pending / Due</p>
                                <h3 className="text-[24px] font-black text-gray-900 tabular-nums tracking-tight"><Taka className="text-[18px]" />{totalUnpaid.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table Card */}
                <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" id="printable-table">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 bg-white gap-4 no-print">
                        <div className="text-[16.5px] font-extrabold text-gray-900 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gray-50 border border-gray-100 text-indigo-600"><i className="fa-solid fa-file-invoice text-[15px]"></i></div>
                            Payslip Directory
                        </div>
                        {hasPermission('create_salary') && (
                            <button onClick={openCreateModal} className="rounded-xl bg-gray-900 px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-600 shadow-sm transition-all hover:shadow-md flex items-center gap-2">
                                <i className="fa-solid fa-plus text-[12px]"></i> Process Salary
                            </button>
                        )}
                    </div>

                    {/* Filters Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50 no-print">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <span className="bg-gray-50 px-4 py-2.5 text-[12px] font-bold text-gray-500 border-r border-gray-200">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="appearance-none bg-none bg-transparent pl-4 pr-9 py-2.5 text-[13.5px] font-semibold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[110px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"><i className="fa-solid fa-chevron-down text-[10px]"></i></div>
                                </div>
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                                <button onClick={handlePrint} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"><i className="fas fa-print"></i> Print</button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full sm:w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer" />
                            <div className="relative w-full sm:w-[260px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-medium text-gray-800 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-12">SL</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Month</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider w-[25%]">Employee Info</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Net Pay</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Paid</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider border-r border-gray-100">Due</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Payment Accounts</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-500 uppercase tracking-wider no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-50">
                                {recordList.length > 0 ? recordList.map((sal, index) => (
                                    <tr key={sal.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-400 text-center">{salaries.from ? salaries.from + index : index + 1}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-max">
                                                <i className="fa-regular fa-calendar-days text-indigo-400"></i>{sal.month_year}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-[13px] font-black uppercase shadow-sm border border-indigo-100">{(sal.user?.name || '?').charAt(0)}</div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-[14px]">{sal.user?.name || 'Unknown Employee'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-600 text-[15px] tabular-nums">
                                            <Taka />{Number(sal.net_pay).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-[14.5px] tabular-nums bg-emerald-50/20 group-hover:bg-emerald-50/50 transition-colors">
                                            {sal.paid_amount > 0 ? <><Taka />{Number(sal.paid_amount).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-rose-600 text-[14.5px] tabular-nums bg-rose-50/20 group-hover:bg-rose-50/50 transition-colors border-r border-gray-100">
                                            {sal.due_amount > 0 ? <><Taka />{Number(sal.due_amount).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {renderStatus(sal)}
                                        </td>

                                        <td className="px-6 py-4">
                                            {sal.transactions?.length > 0 ? (
                                                <div className="flex flex-col gap-1.5">
                                                    {sal.transactions.map(t => (
                                                        <div key={t.id} className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-lg px-3 py-1.5 min-w-[180px] shadow-sm">
                                                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 truncate max-w-[140px]" title={t.account?.name}>
                                                                <i className="fa-solid fa-building-columns text-indigo-400"></i> {t.account?.name}
                                                            </span>
                                                            <span className="text-[12px] font-black text-emerald-600 tabular-nums">
                                                                <Taka className="text-[10px] mr-0.5"/>{Number(t.amount).toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic font-medium text-[12px] flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> Pending Payment</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right no-print">
                                            <div className="flex items-center justify-end gap-2">
                                                {Number(sal.due_amount) > 0 && hasPermission('create_salary') && (
                                                    <button onClick={() => openPaymentModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Pay Installment">
                                                        <i className="fa-solid fa-hand-holding-dollar text-[13px]"></i>
                                                    </button>
                                                )}
                                                {hasPermission('view_salary') && <button onClick={() => openViewModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="View Payslip"><i className="fa-regular fa-file-lines text-[13px]"></i></button>}
                                                {hasPermission('edit_salary') && <button onClick={() => openEditModal(sal)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm" title="Edit"><i className="fa-regular fa-pen-to-square text-[13px]"></i></button>}
                                                {hasPermission('delete_salary') && <button onClick={() => handleDelete(sal.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Delete"><i className="fa-regular fa-trash-can text-[13px]"></i></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="9" className="text-center py-20 text-gray-500 font-medium"><div className="flex flex-col items-center"><i className="fa-solid fa-folder-open text-4xl mb-3 text-gray-300"></i><p>No payroll records found.</p></div></td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {salaries.links && salaries.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4 no-print">
                            <div className="text-[13px] font-semibold text-gray-500">
                                {salaries.total > 0 && `Showing ${salaries.from || 0} to ${salaries.to || 0} of ${salaries.total || 0} records`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {salaries.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : link.url ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300' : 'border-gray-100 bg-transparent text-gray-400 pointer-events-none'}`} preserveState dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 PAY SALARY MODAL (FOR INSTALLMENTS) --- */}
            {showPaymentModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
                            <div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i className="fa-solid fa-hand-holding-dollar text-[13px]"></i></div>
                                    Process Installment
                                </h3>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">
                                <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
                                    <div>
                                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Employee</span>
                                        <span className="text-[15px] font-black text-gray-900">{selectedRecord.user?.name}</span>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Amount to Pay <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01" min="1" max={selectedRecord.due_amount}
                                                value={paymentForm.data.amount} onChange={e => paymentForm.setData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 pl-10 pr-4 py-3 text-[16px] font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm" placeholder="0.00" required
                                            />
                                        </div>
                                        <label className="block mt-3 text-[11px] font-bold text-gray-500 uppercase">Bank charge (extra)
                                            <input type="number" min="0" step="0.01" value={paymentForm.data.bank_charge || 0} onChange={e => paymentForm.setData('bank_charge', e.target.value)} className="block w-full rounded-lg border-gray-300 mt-1 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                                        </label>
                                        {paymentForm.errors.amount && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{paymentForm.errors.amount}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                        <input type="date" value={paymentForm.data.date} onChange={e => paymentForm.setData('date', e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm cursor-pointer" required />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Note (Optional)</label>
                                    <input type="text" value={paymentForm.data.note} onChange={e => paymentForm.setData('note', e.target.value)} placeholder="e.g. Due cleared" className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />
                                </div>
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0 rounded-b-3xl">
                                <div className="text-[12px] font-bold text-gray-500">
                                    Total Deduction: <span className="text-gray-900 font-black text-[14px] ml-1">৳{Number(paymentForm.data.amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[13.5px] font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={paymentForm.processing} className="rounded-xl bg-emerald-600 px-7 py-2.5 text-[13.5px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-70 flex items-center gap-2"><i className="fa-solid fa-check"></i> Pay Now</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 STUNNING VIEW PAYSLIP MODAL --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Receipt Header Style */}
                        <div className="relative bg-gray-900 px-8 py-6 shrink-0 overflow-hidden text-center flex flex-col items-center">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white opacity-5 translate-x-10 -translate-y-10"></div>
                            <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-indigo-500 opacity-10 -translate-x-10 translate-y-10"></div>

                            <button onClick={() => setShowViewModal(false)} className="absolute right-4 top-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors z-20"><i className="fa-solid fa-xmark"></i></button>

                            <div className="relative z-10 w-16 h-16 rounded-full bg-white text-gray-900 font-black text-2xl flex items-center justify-center shadow-lg border-4 border-gray-800 uppercase mb-3">
                                {(selectedRecord.user?.name || "?").charAt(0)}
                            </div>
                            <h2 className="relative z-10 text-[20px] font-extrabold text-white tracking-tight leading-none mb-1">{selectedRecord.user?.name || "Unknown"}</h2>
                            <p className="relative z-10 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Salary Payslip</p>
                        </div>

                        <div className="p-8 overflow-y-auto custom-table-scroll relative bg-[#f8fafc]">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Month/Year</span>
                                    <span className="text-[14px] font-black text-gray-800">{selectedRecord.month_year}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</span>
                                    {renderStatus(selectedRecord)}
                                </div>
                            </div>

                            <div className="space-y-0.5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                                <div className="flex justify-between items-center py-3.5 px-5 bg-gray-50/50 border-b border-gray-100"><span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Basic Salary</span><span className="text-[14.5px] font-black text-gray-800"><Taka />{parseFloat(selectedRecord.basic_salary).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-3.5 px-5 border-b border-gray-100"><span className="text-[12px] font-bold text-emerald-600/70 uppercase tracking-wider">Allowances</span><span className="text-[14.5px] font-black text-emerald-600">+ <Taka />{parseFloat(selectedRecord.allowances).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-3.5 px-5 border-b border-gray-100"><span className="text-[12px] font-bold text-blue-600/70 uppercase tracking-wider">Bonus</span><span className="text-[14.5px] font-black text-blue-600">+ <Taka />{parseFloat(selectedRecord.bonus).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-3.5 px-5 border-b border-gray-100"><span className="text-[12px] font-bold text-rose-500/70 uppercase tracking-wider">Deductions</span><span className="text-[14.5px] font-black text-rose-500">- <Taka />{parseFloat(selectedRecord.deductions).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between items-center py-3.5 px-5"><span className="text-[12px] font-bold text-amber-600/70 uppercase tracking-wider">Advance Cut</span><span className="text-[14.5px] font-black text-amber-600">- <Taka />{parseFloat(selectedRecord.advance_deduction).toLocaleString('en-IN')}</span></div>
                            </div>

                            <div className="bg-gray-900 p-6 rounded-2xl flex justify-between items-center shadow-lg relative overflow-hidden mb-6">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-10 translate-x-10 pointer-events-none"></div>
                                <span className="text-[14px] font-bold uppercase tracking-widest text-gray-300 relative z-10">Net Pay</span>
                                <div className="text-[28px] font-black tracking-tight tabular-nums text-white relative z-10"><Taka className="text-[20px] mr-1 text-emerald-400" />{Number(selectedRecord.net_pay).toLocaleString('en-IN')}</div>
                            </div>

                            {selectedRecord.transactions?.length > 0 && (
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2">
                                        <i className="fa-solid fa-money-check-dollar"></i> Payment Tracking
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        {selectedRecord.transactions.map(t => (
                                            <div key={t.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 flex items-center gap-1.5 text-[12px]"><i className="fa-solid fa-building-columns text-indigo-400 text-[10px]"></i> {t.account?.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-semibold mt-0.5"><i className="fa-regular fa-calendar mr-1"></i>{t.transaction_date}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-black text-emerald-600 tabular-nums text-[14px]"><Taka />{Number(t.amount).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedRecord.status === 'unpaid' && Number(selectedRecord.paid_amount) > 0 && (
                                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 mt-1">
                                            <span className="text-[12px] font-bold text-rose-500 uppercase tracking-wider">Remaining Due</span>
                                            <span className="text-[16px] font-black text-rose-600 tabular-nums"><Taka />{Number(selectedRecord.due_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-center shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-[13.5px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm w-full">Close Receipt</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 ADD/EDIT PAYSLIP MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0 shadow-sm z-10">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-1.5 border border-indigo-100">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-file-invoice'}`}></i> {editMode ? 'Update Record' : 'New Payroll Entry'}
                                </div>
                                <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Modify Employee Payslip" : "Generate Employee Payslip"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-10 w-10 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-8 relative">

                                {/* Basic Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative z-[60]">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Employee <span className="text-red-500">*</span></label>
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
                                        {errors.user_id && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.user_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Month & Year <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.month_year} onChange={e => setData('month_year', e.target.value)} className={`w-full rounded-xl border border-gray-200 px-4 py-[11.5px] text-[14px] font-bold outline-none transition-all ${editMode ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 shadow-sm'}`} disabled={editMode} />
                                    </div>
                                </div>

                                {/* Calculation Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* EARNINGS COLUMN */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-5">
                                            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><i className="fa-solid fa-arrow-trend-up"></i></div>
                                            <h4 className="text-[13px] font-black uppercase tracking-widest text-gray-800">Earnings</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Basic Salary</label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]" />
                                                    <input type="number" step="0.01" min="0" value={data.basic_salary} onFocus={() => handleInputFocus('basic_salary')} onBlur={() => handleInputBlur('basic_salary')} onChange={e => setData('basic_salary', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-[14.5px] font-bold text-gray-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-emerald-600/70 uppercase tracking-wider mb-1.5">Allowances</label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-[15px]" />
                                                    <input type="number" step="0.01" min="0" value={data.allowances} onFocus={() => handleInputFocus('allowances')} onBlur={() => handleInputBlur('allowances')} onChange={e => setData('allowances', e.target.value)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 pl-10 pr-4 py-3 text-[14.5px] font-bold text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-blue-600/70 uppercase tracking-wider mb-1.5">Bonus</label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-[15px]" />
                                                    <input type="number" step="0.01" min="0" value={data.bonus} onFocus={() => handleInputFocus('bonus')} onBlur={() => handleInputBlur('bonus')} onChange={e => setData('bonus', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-10 pr-4 py-3 text-[14.5px] font-bold text-blue-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DEDUCTIONS COLUMN */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-5">
                                                <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"><i className="fa-solid fa-arrow-trend-down"></i></div>
                                                <h4 className="text-[13px] font-black uppercase tracking-widest text-gray-800">Deductions</h4>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-rose-500/70 uppercase tracking-wider mb-1.5">Other Penalties / Deduct</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 text-[15px]" />
                                                        <input type="number" step="0.01" min="0" value={data.deductions} onFocus={() => handleInputFocus('deductions')} onBlur={() => handleInputBlur('deductions')} onChange={e => setData('deductions', e.target.value)} className="w-full rounded-xl border border-rose-200 bg-rose-50/50 pl-10 pr-4 py-3 text-[14.5px] font-bold text-rose-700 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm" />
                                                    </div>
                                                    {errors.deductions && <p className="text-rose-500 text-[11px] mt-1 font-bold">{errors.deductions}</p>}
                                                </div>

                                                {(availableAdvance > 0 || Number(data.advance_deduction) > 0) ? (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 mt-2">
                                                        <div className="flex justify-between items-center mb-2.5">
                                                            <label className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                                                <i className="fa-solid fa-wallet"></i> Cut From Advance
                                                            </label>
                                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                                                Avail: ৳ {availableAdvance.toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                        <div className="relative">
                                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 text-[15px]" />
                                                            <input type="number" min="0" max={availableAdvance} step="0.01" value={data.advance_deduction} onFocus={() => handleInputFocus('advance_deduction')} onBlur={() => handleInputBlur('advance_deduction')} onChange={e => setData('advance_deduction', e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2.5 text-[14px] font-black text-amber-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm" placeholder="0.00" />
                                                        </div>
                                                        <button type="button" className="mt-2 text-[10px] font-bold text-amber-700 hover:text-amber-800 underline decoration-amber-300 underline-offset-2 transition-colors" onClick={() => setData('advance_deduction', Math.max(0, Math.min(availableAdvance, grossBeforeAdvance)))}>
                                                            Apply Maximum Advance
                                                        </button>
                                                        {errors.advance_deduction && <p className="text-rose-500 text-[11px] mt-1 font-bold">{errors.advance_deduction}</p>}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mt-2 flex items-center justify-center text-[11px] font-bold text-gray-400">
                                                        <i className="fa-solid fa-info-circle mr-1.5"></i> No advance available
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay Banner */}
                                <div className="bg-gray-900 rounded-[20px] p-6 flex flex-col md:flex-row justify-between items-center shadow-xl shadow-gray-900/10 relative overflow-hidden">
                                    <div className="absolute left-0 bottom-0 h-32 w-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-x-10 translate-y-10 pointer-events-none"></div>
                                    <div className="relative z-10 text-center md:text-left mb-2 md:mb-0">
                                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Calculated Net Pay</h4>
                                        <p className="text-[12px] text-gray-500 font-medium">Final amount to be transferred</p>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-1.5 text-[36px] font-black tabular-nums tracking-tight text-white">
                                        <Taka className="text-[24px] text-emerald-400" /> {Number(data.net_pay).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                {/* Payment Actions Section */}
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                    <h4 className="text-[13px] font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
                                        <i className="fa-solid fa-credit-card text-indigo-400"></i> Payment Details
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Action <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full appearance-none bg-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[13px] font-bold text-gray-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm">
                                                    <option value="unpaid">⏳ Keep Pending (Unpaid)</option>
                                                    <option value="paid">✅ Pay Immediately (Cash/Bank)</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[11px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        {data.status === 'paid' && (
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                                <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] font-bold text-gray-800 outline-none transition-all focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm" required />
                                            </div>
                                        )}
                                    </div>

                                    {/* Multi-Account Splits */}
                                    {data.status === 'paid' && (
                                        <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <i className="fa-solid fa-code-branch"></i> Fund Split / Source Accounts
                                                </label>
                                            </div>

                                            <div className="space-y-3">
                                                {data.payments.map((payment, index) => (
                                                    <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm relative z-30">
                                                        <div className="w-full md:flex-1 relative z-40">
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Account</label>
                                                            <Select
                                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(payment.account_id)) || null}
                                                                onChange={e => handlePaymentChange(index, 'account_id', e ? e.value : "")}
                                                                placeholder="Select..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                            />
                                                        </div>
                                                        <div className="w-full md:w-[150px] shrink-0">
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Salary Amount</label>
                                                            <div className="relative">
                                                                <Taka className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-[13px]" />
                                                                <input type="number" step="0.01" min="0" value={payment.amount} onChange={e => handlePaymentChange(index, 'amount', e.target.value)} className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-[11px] text-[13.5px] font-bold text-gray-900 outline-none focus:border-emerald-500 shadow-sm" placeholder="0.00" />
                                                            </div>
                                                        </div>
                                                        <div className="w-full md:w-[110px] shrink-0">
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Chrg</label>
                                                            <input type="number" min="0" step="0.01" value={payment.bank_charge || 0} onChange={e => handlePaymentChange(index, 'bank_charge', e.target.value)} className="block w-full rounded-xl border-gray-200 py-[11px] text-[13.5px] font-medium shadow-sm focus:border-indigo-500" />
                                                        </div>
                                                        {data.payments.length > 1 && (
                                                            <div className="pt-4 shrink-0">
                                                                <button type="button" onClick={() => removePaymentRow(index)} className="h-[42px] w-[42px] rounded-xl bg-white text-rose-400 hover:bg-rose-500 hover:text-white transition-colors border border-rose-100 flex justify-center items-center shadow-sm">
                                                                    <i className="fa-solid fa-trash-can"></i>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-emerald-200/50 gap-3">
                                                <button type="button" onClick={addPaymentRow} className="text-[11.5px] font-bold text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-all border border-emerald-200 shadow-sm flex items-center gap-1.5">
                                                    <i className="fa-solid fa-plus"></i> Add Account Split
                                                </button>

                                                <div className="flex flex-col items-end">
                                                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        Total Deduct from Bank: <span className="text-gray-900 ml-1">৳ {(data.payments.reduce((a,c)=>a+Number(c.amount||0)+Number(c.bank_charge||0),0)).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="text-[13px] font-bold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                                        Allocated: <span className={`text-[15px] font-black ml-1 ${Math.round(data.payments.reduce((a,c)=>a+Number(c.amount||0),0)) === Math.round(data.net_pay) ? 'text-emerald-600' : 'text-rose-600'}`}>৳ {data.payments.reduce((a,c)=>a+Number(c.amount||0),0).toLocaleString('en-IN')}</span> <span className="text-gray-400 font-medium">/ ৳{data.net_pay}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {Object.keys(errors).length > 0 && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 text-[12.5px] font-bold flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i> Please fix the highlighted errors above.</div>}
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 bg-white px-7 py-2.5 text-[13.5px] font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[13.5px] font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Payslip" : "Confirm Payslip"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
