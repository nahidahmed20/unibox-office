import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import CustomSelect from '@/Components/CustomSelect';

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
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors, transform } = useForm({
        id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, advance_deduction: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10),
        payments: [{ account_id: '', amount: '', bank_charge: 0 }]
    });

    // Installment Form
    const paymentForm = useForm({
        date: new Date().toISOString().slice(0, 10), note: '',
        advance_deduction: 0,
        payments: []
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
        const advDed = parseFloat(data.advance_deduction) || 0;
        const net = (basic + allow + bns - ded - advDed).toFixed(2);

        if (data.net_pay !== net) {
            setData('net_pay', net);
        }
    }, [data.basic_salary, data.allowances, data.bonus, data.deductions, data.advance_deduction]);

    // 🟢 FIX: Auto-fill Payment Amount separately (Fixed Array Mutation)
    useEffect(() => {
        if (!editMode && data.status === 'paid' && data.payments?.length === 1) {
            if (data.payments[0].amount !== data.net_pay) {
                const newPayments = [...data.payments];
                newPayments[0] = { ...newPayments[0], amount: data.net_pay };
                setData('payments', newPayments);
            }
        }
    }, [data.status, data.net_pay, editMode]);

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
    const totalPayroll = totals ? Number(totals.net_pay || 0) : recordList.reduce((acc, curr) => acc + parseFloat(curr.net_pay || 0), 0);
    const totalPaid = totals ? Number(totals.paid_amount || 0) : recordList.reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0), 0);
    const totalUnpaid = totals ? Number(totals.due_amount || 0) : recordList.reduce((acc, curr) => acc + parseFloat(curr.due_amount || 0), 0);

    const selectedStaff = users.find(u => Number(u.id) === Number(data.user_id));
    const editedSalary = recordList.find(s => s.id === data.id);
    
    const availableAdvance = Number(selectedStaff?.advance_balance || 0) + (editMode && Number(editedSalary?.user_id) === Number(data.user_id) ? Number(editedSalary?.advance_deduction || 0) : 0);

    const paymentUser = users.find(u => Number(u.id) === Number(selectedRecord?.user_id));
    const paymentAvailableAdvance = Number(paymentUser?.advance_balance || 0);

    const handleInputFocus = (field) => { if (data[field] == 0) setData(field, ''); };
    const handleInputBlur = (field) => { if (data[field] === '') setData(field, 0); };
    const handlePaymentInputFocus = (field) => { if (paymentForm.data[field] == 0) paymentForm.setData(field, ''); };
    const handlePaymentInputBlur = (field) => { if (paymentForm.data[field] === '') paymentForm.setData(field, 0); };

    const handleExportCSV = () => {
        if (!recordList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Month,Employee,Net Pay,Paid,Due,Status\n"];
        const rows = recordList.map(s => `"${s.month_year}","${s.user?.name || ''}","${s.net_pay}","${s.paid_amount}","${s.due_amount}","${s.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Payroll_Report_${new Date().toISOString().slice(0, 10)}.csv`); link.click();
    };
    const handlePrint = () => window.print();

    const renderStatus = (sal) => {
        if (sal.status === 'paid') return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Paid</span>;
        if (Number(sal.paid_amount) > 0 || Number(sal.advance_deduction) > 0) return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Partial</span>;
        return <span className="inline-flex px-3 py-1 rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">Unpaid</span>;
    };

    const openCreateModal = () => {
        clearErrors();
        setData({ 
            id: '', user_id: '', month_year: defaultMonthYear, basic_salary: 0, allowances: 0, bonus: 0, deductions: 0, advance_deduction: 0, net_pay: 0, status: 'unpaid', payment_date: new Date().toISOString().slice(0, 10), 
            payments: [{ account_id: '', amount: '', bank_charge: 0 }] 
        });
        setEditMode(false); 
        setShowModal(true);
    };

    const openEditModal = (sal) => {
        clearErrors();
        let formattedPayments = sal.transactions?.length > 0
            ? sal.transactions.map(t => ({ account_id: t.account_id, amount: Number(t.amount) - Number(t.bank_charge || 0), bank_charge: Number(t.bank_charge || 0) }))
            : [{ account_id: '', amount: sal.net_pay }];

        setData({ 
            id: sal.id, user_id: sal.user_id || '', month_year: sal.month_year || defaultMonthYear, basic_salary: sal.basic_salary || 0, allowances: sal.allowances || 0, bonus: sal.bonus || 0, deductions: sal.deductions || 0, advance_deduction: sal.advance_deduction || 0, net_pay: sal.net_pay || 0, status: Number(sal.paid_amount) > 0 ? 'paid' : (sal.status || 'unpaid'), payment_date: sal.payment_date || new Date().toISOString().slice(0, 10), 
            payments: formattedPayments 
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openPaymentModal = (sal) => {
        setSelectedRecord(sal);
        paymentForm.reset(); 
        paymentForm.clearErrors();
        paymentForm.setData({ 
            date: new Date().toISOString().slice(0, 10), 
            note: '',
            advance_deduction: 0,
            payments: [{ account_id: '', amount: '', bank_charge: 0 }] 
        });
        setShowPaymentModal(true);
    };

    const openViewModal = (record) => { setSelectedRecord(record); setShowViewModal(true); };

    const addPaymentRow = () => setData('payments', [...(data.payments || []), { account_id: '', amount: '', bank_charge: 0 }]);
    const removePaymentRow = (index) => setData('payments', data.payments.filter((_, i) => i !== index));
    
    // 🟢 FIX: Safe Array Mutation
    const handlePaymentChange = (index, field, value) => {
        const newPayments = data.payments.map((p, i) => i === index ? { ...p, [field]: value } : p);
        setData('payments', newPayments);
    };

    const addInstallmentRow = () => paymentForm.setData('payments', [...(paymentForm.data.payments || []), { account_id: '', amount: '', bank_charge: 0 }]);
    const removeInstallmentRow = (index) => paymentForm.setData('payments', paymentForm.data.payments.filter((_, i) => i !== index));
    
    // 🟢 FIX: Safe Array Mutation
    const handleInstallmentChange = (index, field, value) => {
        const newPayments = paymentForm.data.payments.map((p, i) => i === index ? { ...p, [field]: value } : p);
        paymentForm.setData('payments', newPayments);
    };

    // 🟢 Main Create/Edit Salary Form Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const isPaid = data.status === 'paid';
        const validPayments = isPaid ? (data.payments?.filter(p => Number(p.amount) > 0) || []) : [];

        if (isPaid) {
            const sumOfPayments = validPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
            if (sumOfPayments > data.net_pay) {
                return Swal.fire("Amount Exceeded!", `You cannot pay more than Net Pay (৳${data.net_pay}). Your splits total ৳${sumOfPayments}.`, "error");
            }
            const missingAccount = validPayments.find(p => !p.account_id);
            if (missingAccount) return Swal.fire("Required", "Please select an account for all payment splits.", "warning");
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => { 
                reset(); setShowModal(false); 
                Swal.fire({ icon: 'success', title: editMode ? 'Updated Successfully!' : 'Payslip Generated!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); 
            },
            onError: (err) => {
                const msg = err.error || Object.values(err)[0] || "Something went wrong!";
                Swal.fire({ icon: "error", title: "Action Failed", text: msg, confirmButtonColor: "#ef4444" });
            }
        };

        transform((currentData) => ({
            ...currentData,
            payments: validPayments
        }));

        if (editMode) put(route('admin.salaries.update', data.id), options);
        else post(route('admin.salaries.store'), options);
    };

    // 🟢 Pay Due (Installment) Form Submit
    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        
        const validPayments = paymentForm.data.payments?.filter(p => Number(p.amount) > 0) || [];
        
        const totalBankPayment = validPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
        const totalAdvancePayment = parseFloat(paymentForm.data.advance_deduction || 0);
        const overallPayment = totalBankPayment + totalAdvancePayment;
        
        if (overallPayment <= 0) {
            return Swal.fire("Required", "Please enter an advance deduction or add a bank payment.", "warning");
        }

        if (overallPayment > parseFloat(selectedRecord.due_amount)) {
            return Swal.fire("Error", `Total payment (৳${overallPayment}) cannot exceed due amount (৳${selectedRecord.due_amount}).`, "error");
        }
        
        const missingAccount = validPayments.find(p => !p.account_id);
        if (missingAccount) return Swal.fire("Required", "Please select an account for all entered bank amounts.", "warning");

        // 🟢 FIX: Transform এবং post কে আলাদা করা হয়েছে
        paymentForm.transform((formData) => ({
            ...formData,
            payments: validPayments
        }));

        paymentForm.post(route('admin.salaries.add-payment', selectedRecord.id), {
            preserveScroll: true,
            onSuccess: () => { 
                setShowPaymentModal(false); 
                Swal.fire({ icon: 'success', title: 'Payment Added!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); 
            },
            onError: (err) => {
                const msg = err.error || err.payments || Object.values(err)[0] || "Failed to add payment.";
                Swal.fire({ icon: "error", title: "Payment Failed", text: msg, confirmButtonColor: "#ef4444" });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Delete Payslip?', text: 'All linked payments will be refunded to your accounts.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete' }).then((res) => {
            if (res.isConfirmed) destroy(route('admin.salaries.destroy', id), { 
                onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }),
                onError: (err) => Swal.fire({ icon: "error", title: "Delete Failed", text: err.error || "Cannot delete record.", confirmButtonColor: "#ef4444" })
            });
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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
                    <div>
                        <div className="inline-flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10.5px] font-bold uppercase tracking-widest text-indigo-600 shadow-sm">
                            <i className="fa-solid fa-users-gear"></i> Human Resources
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1 max-w-lg leading-relaxed font-medium">Generate payslips, process partial or full salaries, and track multi-account payments efficiently.</p>
                    </div>
                </div>

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

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/50 no-print">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <span className="bg-gray-50 px-4 py-2.5 text-[12px] font-bold text-gray-500 border-r border-gray-200">Show</span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-transparent pl-4 pr-9 py-2.5 text-[13.5px] font-semibold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[110px]">
                                        <option value={10}>10 Rows</option><option value={25}>25 Rows</option><option value={50}>50 Rows</option><option value={100}>100 Rows</option><option value="all">All Data</option>
                                    </select>
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
                                            {(Number(sal.paid_amount) > 0 || Number(sal.advance_deduction) > 0) ? <><Taka />{Number(Number(sal.paid_amount)).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-rose-600 text-[14.5px] tabular-nums bg-rose-50/20 group-hover:bg-rose-50/50 transition-colors border-r border-gray-100">
                                            {sal.due_amount > 0 ? <><Taka />{Number(sal.due_amount).toLocaleString('en-IN')}</> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {renderStatus(sal)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                {Number(sal.advance_deduction) > 0 && (
                                                    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 min-w-[180px] shadow-sm">
                                                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 truncate max-w-[140px]">
                                                            <i className="fa-solid fa-wallet text-amber-500"></i> Adv. Deduction
                                                        </span>
                                                        <span className="text-[12px] font-black text-amber-600 tabular-nums">
                                                            <Taka className="text-[10px] mr-0.5"/>{Number(sal.advance_deduction).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                )}
                                                {sal.transactions?.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-lg px-3 py-1.5 min-w-[180px] shadow-sm">
                                                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 truncate max-w-[140px]" title={t.account?.name}>
                                                            <i className="fa-solid fa-building-columns text-indigo-400"></i> {t.account?.name}
                                                        </span>
                                                        <span className="text-[12px] font-black text-emerald-600 tabular-nums">
                                                            <Taka className="text-[10px] mr-0.5"/>{Number(t.amount).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                ))}
                                                {(!sal.transactions?.length && Number(sal.advance_deduction) === 0) && (
                                                    <span className="text-gray-400 italic font-medium text-[12px] flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> Pending Payment</span>
                                                )}
                                            </div>
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

            {/* --- 🟢 CREATE / EDIT PAYSLIP MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0 shadow-sm z-10">
                            <div>
                                <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? 'Edit Payslip' : 'Process Salary'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-10 w-10 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 relative">
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Employee <span className="text-red-500">*</span></label>
                                        <Select
                                            options={users.map(u => ({ value: u.id, label: u.name }))}
                                            value={users.map(u => ({ value: u.id, label: u.name })).find(opt => Number(opt.value) === Number(data.user_id)) || null}
                                            onChange={handleUserSelect}
                                            placeholder="Select Employee..."
                                            styles={selectStyles}
                                            isDisabled={editMode}
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        />
                                        {errors.user_id && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.user_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Month & Year <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.month_year} onChange={e => setData('month_year', e.target.value)} placeholder="MM-YYYY" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-[11.5px] text-[14px] font-bold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm" required />
                                        {errors.month_year && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{errors.month_year}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Basic Salary</label>
                                        <input type="number" min="0" value={data.basic_salary} onFocus={() => handleInputFocus('basic_salary')} onBlur={() => handleInputBlur('basic_salary')} onChange={e => setData('basic_salary', e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[14px] font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Allowances</label>
                                        <input type="number" min="0" value={data.allowances} onFocus={() => handleInputFocus('allowances')} onBlur={() => handleInputBlur('allowances')} onChange={e => setData('allowances', e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[14px] font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Bonus</label>
                                        <input type="number" min="0" value={data.bonus} onFocus={() => handleInputFocus('bonus')} onBlur={() => handleInputBlur('bonus')} onChange={e => setData('bonus', e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[14px] font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Deductions</label>
                                        <input type="number" min="0" value={data.deductions} onFocus={() => handleInputFocus('deductions')} onBlur={() => handleInputBlur('deductions')} onChange={e => setData('deductions', e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[14px] font-bold text-rose-500 outline-none focus:border-rose-500" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-amber-600 uppercase mb-2">Advance Deduction (Avail: ৳{availableAdvance})</label>
                                        <input type="number" min="0" max={availableAdvance} value={data.advance_deduction} onFocus={() => handleInputFocus('advance_deduction')} onBlur={() => handleInputBlur('advance_deduction')} onChange={e => setData('advance_deduction', e.target.value)} className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-4 py-2 text-[14px] font-bold text-amber-700 outline-none focus:border-amber-500" disabled={!data.user_id || availableAdvance <= 0} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-600 uppercase mb-2">Net Pay (Calculated)</label>
                                        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[16px] font-black text-emerald-700">
                                            <Taka /> {data.net_pay}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Status</label>
                                        <CustomSelect value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-[11.5px] text-[14px] font-bold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </CustomSelect>
                                    </div>
                                    {data.status === 'paid' && (
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Date</label>
                                            <input type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-[11.5px] text-[14px] font-bold outline-none focus:bg-white focus:border-indigo-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Bank Payment Splits (Only visible if status is paid) */}
                                {data.status === 'paid' && (
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-[13px] font-black text-gray-800 uppercase">Bank / Cash Accounts</h4>
                                            <button type="button" onClick={addPaymentRow} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                                <i className="fa-solid fa-plus"></i> Add Account
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {data.payments?.map((payment, index) => (
                                                <div key={index} className="flex flex-col md:flex-row items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                    <div className="w-full md:flex-1">
                                                        <Select
                                                            options={accounts.map(a => ({ value: a.id, label: `${a.name} (৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                            value={accounts.map(a => ({ value: a.id, label: `${a.name} (৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find(opt => Number(opt.value) === Number(payment.account_id)) || null}
                                                            onChange={e => handlePaymentChange(index, 'account_id', e ? e.value : "")}
                                                            placeholder="Select Account" 
                                                            styles={selectStyles}
                                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                        />
                                                    </div>
                                                    <div className="w-full md:w-[150px]">
                                                        <input type="number" step="0.01" value={payment.amount} onChange={e => handlePaymentChange(index, 'amount', e.target.value)} className="w-full rounded-xl border-gray-300 py-[9px] text-[13px] font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="Amount" />
                                                    </div>
                                                    <button type="button" onClick={() => removePaymentRow(index)} className="h-[42px] w-[42px] shrink-0 rounded-xl bg-white text-rose-500 border border-rose-200 flex justify-center items-center hover:bg-rose-500 hover:text-white transition-colors">
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-[24px]">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 bg-white px-7 py-2.5 text-[13.5px] font-bold text-gray-700 transition-all hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2 shadow-md">
                                    {processing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                    {editMode ? 'Update Payslip' : 'Generate Payslip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 PAY DUE MODAL --- */}
            {showPaymentModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-[#f8fafc] rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0 shadow-sm z-10">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-1.5 border border-emerald-100">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> Installment Payment
                                </div>
                                <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                                    Process Due Salary
                                </h3>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-10 w-10 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 relative">
                                
                                <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between shadow-sm relative overflow-hidden gap-4">
                                    <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500 rounded-full blur-3xl opacity-10 -translate-y-10 translate-x-10 pointer-events-none"></div>
                                    <div className="relative z-10 text-center sm:text-left">
                                        <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Paying To</span>
                                        <span className="text-[18px] font-black text-gray-900">{selectedRecord.user?.name}</span>
                                        <span className="block text-[12px] font-bold text-gray-400 mt-0.5"><i className="fa-regular fa-calendar-days"></i> {selectedRecord.month_year}</span>
                                    </div>
                                    <div className="text-center sm:text-right relative z-10">
                                        <span className="block text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">Total Due Amount</span>
                                        <span className="text-[28px] font-black text-rose-600 tabular-nums tracking-tight"><Taka className="text-[20px]" />{Number(selectedRecord.due_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Date <span className="text-red-500">*</span></label>
                                        <input type="date" value={paymentForm.data.date} onChange={e => paymentForm.setData('date', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-[11.5px] text-[14px] font-bold text-gray-800 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer" required />
                                        {paymentForm.errors.date && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{paymentForm.errors.date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Note (Optional)</label>
                                        <input type="text" value={paymentForm.data.note} onChange={e => paymentForm.setData('note', e.target.value)} placeholder="e.g. Cleared remaining due" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-[11.5px] text-[14px] font-medium text-gray-800 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                                    </div>
                                </div>

                                {/* Advance Settlement Split */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                        <h4 className="text-[13px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                            <i className="fa-solid fa-wallet"></i> Settle via Advance
                                        </h4>
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                            Avail. Adv: ৳ {paymentAvailableAdvance.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="relative w-full max-w-sm">
                                        <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 text-[15px]" />
                                        <input type="number" min="0" max={paymentAvailableAdvance} step="0.01" value={paymentForm.data.advance_deduction} onFocus={() => handlePaymentInputFocus('advance_deduction')} onBlur={() => handlePaymentInputBlur('advance_deduction')} onChange={e => paymentForm.setData('advance_deduction', e.target.value)} className="w-full rounded-xl border border-amber-200 bg-amber-50/30 pl-10 pr-4 py-3 text-[14px] font-black text-amber-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all" placeholder="0.00" disabled={paymentAvailableAdvance <= 0} />
                                    </div>
                                    {paymentAvailableAdvance > 0 && (
                                        <button type="button" className="mt-2.5 text-[11px] font-bold text-amber-700 hover:text-amber-800 transition-colors" onClick={() => paymentForm.setData('advance_deduction', Math.max(0, Math.min(paymentAvailableAdvance, selectedRecord.due_amount)))}>
                                            <i className="fa-solid fa-arrow-turn-down mr-1"></i> Use Maximum Advance Amount
                                        </button>
                                    )}
                                    {paymentForm.errors.advance_deduction && <p className="text-rose-500 text-[11px] font-bold mt-1.5">{paymentForm.errors.advance_deduction}</p>}
                                </div>

                                {/* Bank/Cash Accounts Split */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                        <h4 className="text-[13px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                            <i className="fa-solid fa-code-branch text-indigo-400"></i> Cash / Bank Payment
                                        </h4>
                                    </div>

                                    <div className="space-y-3">
                                        {(!paymentForm.data.payments || paymentForm.data.payments.length === 0) && (
                                            <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-[12px] font-bold">
                                                No bank payment added. Click below to add an account.
                                            </div>
                                        )}
                                        {paymentForm.data.payments?.map((payment, index) => (
                                            <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200 relative z-30">
                                                <div className="w-full md:flex-1 relative z-40">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank / Account</label>
                                                    <Select
                                                        options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                        value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳ ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(payment.account_id)) || null}
                                                        onChange={e => handleInstallmentChange(index, 'account_id', e ? e.value : "")}
                                                        placeholder="Select Account..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    />
                                                </div>
                                                <div className="w-full md:w-[160px] shrink-0">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pay Amount</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-[13px]" />
                                                        <input type="number" step="0.01" min="0" value={payment.amount} onChange={e => handleInstallmentChange(index, 'amount', e.target.value)} className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-[11px] text-[13.5px] font-bold text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm" placeholder="0.00" />
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-[120px] shrink-0">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank Chrg</label>
                                                    <input type="number" min="0" step="0.01" value={payment.bank_charge || 0} onChange={e => handleInstallmentChange(index, 'bank_charge', e.target.value)} className="block w-full rounded-xl border-gray-300 py-[11px] text-[13.5px] font-medium shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                                </div>
                                                <div className="pt-4 shrink-0">
                                                    <button type="button" onClick={() => removeInstallmentRow(index)} className="h-[42px] w-[42px] rounded-xl bg-white text-rose-400 hover:bg-rose-500 hover:text-white transition-colors border border-rose-200 flex justify-center items-center shadow-sm">
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-gray-100 gap-3">
                                        <button type="button" onClick={addInstallmentRow} className="text-[11.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-all border border-emerald-200 shadow-sm flex items-center gap-1.5">
                                            <i className="fa-solid fa-plus"></i> Add Account Split
                                        </button>
                                    </div>
                                </div>
                                {Object.keys(paymentForm.errors).length > 0 && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 text-[12.5px] font-bold flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i> Please fix the highlighted errors above.</div>}
                            </div>

                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0 rounded-b-[24px]">
                                <div className="flex flex-col items-start">
                                    <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex gap-4">
                                        <span>Bank Split: ৳ {(paymentForm.data.payments?.reduce((a,c)=>a+Number(c.amount||0),0) || 0).toLocaleString('en-IN')}</span>
                                        <span>Adv Cut: ৳ {Number(paymentForm.data.advance_deduction || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-[14px] font-bold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                        Total Paid: <span className={`text-[16px] font-black ml-1 ${(Math.round(paymentForm.data.payments?.reduce((a,c)=>a+Number(c.amount||0),0) || 0) + Math.round(paymentForm.data.advance_deduction||0)) === Math.round(selectedRecord.due_amount) ? 'text-emerald-600' : 'text-rose-600'}`}>৳ {((paymentForm.data.payments?.reduce((a,c)=>a+Number(c.amount||0),0) || 0) + Number(paymentForm.data.advance_deduction||0)).toLocaleString('en-IN')}</span> <span className="text-gray-400 font-medium">/ ৳{selectedRecord.due_amount}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-xl border border-gray-200 bg-white px-7 py-2.5 text-[13.5px] font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-100 hidden sm:block">Cancel</button>
                                    <button type="submit" disabled={paymentForm.processing} className="rounded-xl bg-emerald-600 px-8 py-2.5 text-[13.5px] font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg disabled:opacity-70 flex items-center gap-2">
                                        {paymentForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i></> : <><i className="fa-solid fa-check-double"></i> Confirm Payment</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 VIEW PAYSLIP MODAL --- */}
            {showViewModal && selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
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

                            {(selectedRecord.transactions?.length > 0 || Number(selectedRecord.advance_deduction) > 0) && (
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2.5 flex items-center gap-2">
                                        <i className="fa-solid fa-money-check-dollar"></i> Payment Tracking
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        {Number(selectedRecord.advance_deduction) > 0 && (
                                            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-100">
                                                <span className="font-bold text-amber-700 flex items-center gap-1.5 text-[12px]"><i className="fa-solid fa-wallet text-amber-500 text-[10px]"></i> Adv. Deduction</span>
                                                <div className="text-right"><span className="block font-black text-amber-600 tabular-nums text-[14px]"><Taka />{Number(selectedRecord.advance_deduction).toLocaleString('en-IN')}</span></div>
                                            </div>
                                        )}
                                        {selectedRecord.transactions?.map(t => (
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
                                    {selectedRecord.status === 'unpaid' && Number(selectedRecord.due_amount) > 0 && (
                                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 mt-1">
                                            <span className="text-[12px] font-bold text-rose-500 uppercase tracking-wider">Remaining Due</span>
                                            <span className="text-[16px] font-black text-rose-600 tabular-nums"><Taka />{Number(selectedRecord.due_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-center shrink-0 rounded-b-[24px]">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-[13.5px] font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm w-full">Close Receipt</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}