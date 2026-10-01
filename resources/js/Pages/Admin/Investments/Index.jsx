import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import CustomSelect from '@/Components/CustomSelect';

const INVESTOR_TYPE_META = {
    lender: { label: 'Lender', bn: 'ধার', chip: 'border-amber-500 bg-amber-50 text-amber-700', avatar: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    partner: { label: 'Partner', bn: 'অংশীদার', chip: 'border-indigo-500 bg-indigo-50 text-indigo-700', avatar: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    owner: { label: 'Owner', bn: 'মালিক', chip: 'border-emerald-500 bg-emerald-50 text-emerald-700', avatar: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};
const INVESTMENT_TYPE_META = {
    loan: { label: 'Loan', bn: 'ধার বা ঋণ হিসেবে গ্রহণ', chip: 'border-slate-500 bg-slate-50 text-slate-700', icon: 'fa-hand-holding-dollar' },
    equity: { label: 'Equity', bn: 'স্থায়ী মূলধন হিসেবে গ্রহণ', chip: 'border-violet-500 bg-violet-50 text-violet-700', icon: 'fa-chart-pie' },
};

const inputCls = "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-sm";
const labelCls = "block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2";

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const StatCard = ({ label, value, icon, gradient, textColor, iconColor }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-lg border border-white/10 group`}>
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/10 opacity-40 transition-transform duration-500 group-hover:scale-110 blur-xl"></div>
        <div className="relative z-10 flex items-center gap-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md text-[20px] shadow-sm border border-white/20 ${iconColor}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <p className={`text-[11.5px] font-bold uppercase tracking-widest mb-0.5 ${textColor}`}>{label}</p>
                <h3 className="text-[26px] font-black tracking-tight tabular-nums text-white leading-none">{value}</h3>
            </div>
        </div>
    </div>
);

// 🟢 Deeper Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '48px', borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8', // slate-400 for Deep borders
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }, // hover effect slate-500
    }),
    option: (base, state) => ({
        ...base, backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#0F172A', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#0F172A', fontWeight: 700, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
};

export default function Index({ investments = {}, accounts = [], existingInvestors = [], filters = {}, totalAmount = 0, totalReturned = 0, totalProfitPaid = 0 }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Return Money Modal State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState(null);

    const investmentList = investments.data || [];

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || filters.search || '');
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '25');
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', amount: '',
        investor_name: '', investor_phone: '', investor_type: 'lender', investment_type: 'loan',
        date: new Date().toISOString().slice(0, 10), purpose: 'Business Capital', note: ''
    });

    const returnForm = useForm({
        account_id: '', principal_amount: 0, profit_amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: ''
    });

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            router.get(route('admin.investments.index'), { search: searchTerm, per_page: perPage }, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', account_id: '', amount: '', investor_name: '', investor_phone: '', investor_type: 'lender', investment_type: 'loan', date: new Date().toISOString().slice(0, 10), purpose: 'Business Capital', note: '' });
        setEditMode(false); setShowModal(true);
    };

    const openEditModal = (inv) => {
        clearErrors();
        setData({
            id: inv.id,
            account_id: inv.account_id || '',
            amount: inv.amount,
            investor_name: inv.investor?.name || '',
            investor_phone: inv.investor?.phone || '',
            investor_type: inv.investor?.type || 'lender',
            investment_type: inv.investment_type || 'loan',
            date: inv.date,
            purpose: inv.purpose || 'Business Capital',
            note: inv.note || ''
        });
        setEditMode(true); setShowModal(true);
    };

    const openReturnModal = (inv) => {
        setSelectedInvestment(inv);
        returnForm.reset();
        returnForm.setData({ account_id: '', principal_amount: inv.due_amount, profit_amount: 0, payment_date: new Date().toISOString().slice(0, 10), note: '' });
        returnForm.clearErrors();
        setShowReturnModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.investments.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false }); } });
        } else {
            if (!data.account_id) return Swal.fire("Required", "Please select a deposit account.", "warning");
            post(route('admin.investments.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Logged Successfully!', timer: 1500, showConfirmButton: false }); } });
        }
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        if (!returnForm.data.account_id) return Swal.fire("Required", "Please select an account to pay from.", "warning");
        if (Number(returnForm.data.principal_amount) > selectedInvestment.due_amount) {
            return Swal.fire("Error", "Principal return cannot exceed the remaining due amount.", "error");
        }

        returnForm.post(route('admin.investments.return', selectedInvestment.id), {
            onSuccess: () => {
                setShowReturnModal(false);
                Swal.fire({ icon: 'success', title: 'Payment Processed!', text: 'Money returned successfully.', timer: 1500, showConfirmButton: false });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This record will be permanently deleted and account balance updated!', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, delete', confirmButtonColor: '#ef4444' }).then((result) => {
            if (result.isConfirmed) destroy(route('admin.investments.destroy', id), { preserveScroll: true, onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false }), onError: (err) => Swal.fire('Error', err.error || 'Cannot delete record with existing payments.', 'error') });
        });
    };

    // Export Tools
    const handleCopy = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = investmentList.map(inv => `${inv.investor?.name}\t${inv.date}\t${inv.amount}\t${inv.due_amount}\t${inv.status}`).join("\n");
        navigator.clipboard.writeText("Investor\tDate\tAmount\tDue\tStatus\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Investor,Type,Investment Type,Date,Amount,Due,Status\n"];
        const rows = investmentList.map(inv => `"${inv.investor?.name}","${inv.investor?.type}","${inv.investment_type}","${inv.date}","${inv.amount}","${inv.due_amount}","${inv.status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Investments_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => window.print();

    const accountOptions = accounts.map(a => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }));

    const handleInvestorNameChange = (e) => {
        const val = e.target.value;
        setData('investor_name', val);
        const exists = existingInvestors.find(inv => inv.name.toLowerCase() === val.toLowerCase());
        if (exists) setData(prev => ({ ...prev, investor_phone: exists.phone || '', investor_type: exists.type }));
    };

    return (
        <AdminLayout>
            <Head title="Investments & Loans" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-chart-line"></i> Capital Ledger
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Investments & Loans</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Track business capital, loans, and manage principal & profit returns.</p>
                    </div>
                </div>

                {/* 🟢 Premium Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard
                        label="Total Received"
                        value={<><Taka className="text-[18px] mr-1 text-emerald-200" />{parseFloat(totalAmount || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-down-to-bracket"
                        gradient="from-emerald-600 to-teal-700"
                        textColor="text-emerald-200"
                        iconColor="text-emerald-100"
                    />
                    <StatCard
                        label="Due Principal"
                        value={<><Taka className="text-[18px] mr-1 text-rose-200" />{parseFloat((totalAmount || 0) - (totalReturned || 0)).toLocaleString('en-IN')}</>}
                        icon="fa-triangle-exclamation"
                        gradient="from-rose-500 to-red-600"
                        textColor="text-rose-200"
                        iconColor="text-rose-100"
                    />
                    <StatCard
                        label="Profit Paid"
                        value={<><Taka className="text-[18px] mr-1 text-indigo-200" />{parseFloat(totalProfitPaid || 0).toLocaleString('en-IN')}</>}
                        icon="fa-chart-line"
                        gradient="from-indigo-600 to-blue-700"
                        textColor="text-indigo-200"
                        iconColor="text-indigo-100"
                    />
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden flex flex-col" id="printable-area">

                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
                                <i className="fa-solid fa-building-columns text-[15px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[16px] font-black text-slate-900 leading-tight">Capital Directory</h2>
                                <p className="text-[12px] text-slate-500 font-bold mt-0.5">{investments.total ?? investmentList.length} total records</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            {hasPermission('create_investment') && (
                                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[13.5px] font-black text-white transition-all hover:bg-indigo-700 shadow-md hover:-translate-y-0.5 ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add Investment
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 bg-white border-b border-slate-200 no-print">
                        <div className="flex flex-wrap items-center gap-4 w-full justify-between">

                            {/* Premium Show Rows Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all">
                                <span className="bg-slate-100 px-4 py-2.5 text-[12.5px] font-black text-slate-600 border-r border-slate-300 uppercase tracking-widest">
                                    Show
                                </span>
                                <div className="relative">
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none cursor-pointer border-none focus:ring-0 w-[120px]"
                                    >
                                        <option value="10">10 Rows</option>
                                        <option value="25">25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="relative w-full sm:w-[320px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]"></i>
                                <input
                                    type="text"
                                    placeholder="Search investor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-[13.5px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table className="w-full text-left whitespace-nowrap min-w-[1100px] border-collapse">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10 text-[11.5px] font-black text-slate-600 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4.5 w-12 text-center">SL</th>
                                    <th className="px-6 py-4.5 w-[25%]">Investor Info</th>
                                    <th className="px-6 py-4.5 w-[20%]">Date & Purpose</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/50 border-l border-slate-200">Received</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/50 border-x border-slate-200">Principal Paid</th>
                                    <th className="px-6 py-4.5 text-right bg-purple-50/50 border-r border-slate-200">Profit Paid</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/50 border-r border-slate-200">Due Base</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center no-print w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {investmentList.length > 0 ? investmentList.map((inv, index) => {
                                    const typeMeta = INVESTOR_TYPE_META[inv.investor?.type] || { avatar: 'bg-slate-100 text-slate-500' };
                                    return (
                                        <tr key={inv.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 text-slate-500 font-bold text-center tabular-nums">{(investments.current_page - 1) * investments.per_page + index + 1}</td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-black uppercase ${typeMeta.avatar} shadow-sm border border-black/5`}>
                                                        {(inv.investor?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 text-[14.5px] mb-1">{inv.investor?.name}</div>
                                                        <div className="text-[11.5px] text-slate-500 font-bold flex items-center gap-1.5">
                                                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-sm uppercase tracking-wider text-[9.5px] text-slate-600">{typeMeta.label || inv.investor?.type}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-indigo-600 font-bold">{INVESTMENT_TYPE_META[inv.investment_type]?.label || inv.investment_type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-2.5 py-1.5 rounded-lg w-max text-[12px] font-bold text-slate-700 mb-1.5">
                                                    <i className="fa-regular fa-calendar text-[11px] text-slate-400"></i>{inv.date}
                                                </div>
                                                <div className="text-[12px] font-bold text-slate-500 max-w-[180px] truncate" title={inv.purpose}>{inv.purpose}</div>
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-emerald-700 tabular-nums bg-emerald-50/20 border-l border-slate-100 group-hover:bg-emerald-50/50 transition-colors text-[15px]">
                                                <Taka className="text-[13px] mr-0.5 opacity-70"/>{parseFloat(inv.amount).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-blue-700 tabular-nums bg-blue-50/20 border-x border-slate-100 group-hover:bg-blue-50/50 transition-colors text-[14.5px]">
                                                <Taka className="text-[12px] mr-0.5 opacity-70"/>{parseFloat(inv.returned_principal || 0).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-purple-700 tabular-nums bg-purple-50/20 border-r border-slate-100 group-hover:bg-purple-50/50 transition-colors text-[14.5px]">
                                                <Taka className="text-[12px] mr-0.5 opacity-70"/>{parseFloat(inv.returned_profit || 0).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-right font-black text-rose-600 tabular-nums bg-rose-50/20 border-r border-slate-100 group-hover:bg-rose-50/50 transition-colors text-[15px]">
                                                <Taka className="text-[13px] mr-0.5 opacity-70"/>{parseFloat(inv.due_amount).toLocaleString('en-IN')}
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border shadow-sm ${inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'fully_paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {inv.status !== 'fully_paid' && (
                                                        <button onClick={() => openReturnModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors shadow-sm" title="Return Money & Profit">
                                                            <i className="fa-solid fa-hand-holding-dollar text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_investment') && (
                                                        <button onClick={() => openEditModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-colors shadow-sm" title="Edit Info">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_client') && inv.due_amount === parseFloat(inv.amount) && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 border border-slate-200 shadow-sm"><i className="fa-solid fa-vault text-2xl"></i></div>
                                                <p className="text-slate-800 font-black text-[16px]">No records found</p>
                                                <p className="text-slate-500 font-bold text-[13.5px]">Try a different search term, or add a new investment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {investments.links && investments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
                            <div className="text-[13.5px] text-slate-600 font-bold">Showing <strong className="text-slate-900 font-black">{investments.from || 0}</strong> to <strong className="text-slate-900 font-black">{investments.to || 0}</strong> of <strong className="text-slate-900 font-black">{investments.total || 0}</strong> records</div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {investments.links.map((link, i) => (
                                    <Link key={i} href={link.url || "#"} preserveState className={`min-w-[34px] flex items-center justify-center rounded-lg border px-3 py-1.5 text-[13px] font-black transition-colors shadow-sm ${link.active ? 'bg-indigo-600 text-white border-indigo-600' : link.url ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400' : 'bg-slate-50 text-slate-400 border-slate-200 pointer-events-none'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 MODERN CREATE / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-sm">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-hand-holding-dollar'}`}></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">
                                    {editMode ? "Edit Record Info" : "Log New Investment / Loan"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white/5 border border-white/10 relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Investor/Lender Name <span className="text-red-600">*</span></label>
                                        <input type="text" list="investors" value={data.investor_name} onChange={handleInvestorNameChange} className={inputCls} placeholder="Start typing name..." required />
                                        <datalist id="investors">{existingInvestors.map((i, x) => <option key={x} value={i.name} />)}</datalist>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Phone <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                        <input type="text" value={data.investor_phone} onChange={e => setData('investor_phone', e.target.value)} className={inputCls} placeholder="01XXXXXXXXX" />
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Person Type <span className="text-red-600">*</span></label>
                                        <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                            {Object.entries(INVESTOR_TYPE_META).map(([value, meta]) => (
                                                <button key={value} type="button" onClick={() => setData('investor_type', value)} className={`rounded-lg border-2 px-2 py-2.5 text-center transition-all ${data.investor_type === value ? meta.chip + ' shadow-sm' : 'border-transparent bg-white text-slate-500 hover:border-slate-300'}`}>
                                                    <span className="block text-[12.5px] font-black">{meta.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Investment Type <span className="text-red-600">*</span></label>
                                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                            {Object.entries(INVESTMENT_TYPE_META).map(([value, meta]) => (
                                                <button key={value} type="button" onClick={() => setData('investment_type', value)} className={`flex items-center justify-center gap-2 rounded-lg border-2 px-2 py-2.5 text-center transition-all ${data.investment_type === value ? meta.chip + ' shadow-sm' : 'border-transparent bg-white text-slate-500 hover:border-slate-300'}`}>
                                                    <i className={`fa-solid ${meta.icon} text-[13px]`}></i>
                                                    <span className="text-[12.5px] font-black">{meta.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div className="col-span-2">
                                        <label className={labelCls}>Deposit To Account <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Select options={accountOptions} value={accountOptions.find(opt => opt.value === data.account_id) || null} onChange={s => setData("account_id", s ? s.value : "")} placeholder="Search account..." isClearable styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed" />
                                            {errors.account_id && <p className="text-red-600 text-xs mt-1.5 font-bold">{errors.account_id}</p>}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`${labelCls} !text-emerald-700`}>Amount (৳) <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 text-[18px]" />
                                            <input type="number" step="any" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-10 pr-4 py-3.5 text-[18px] font-black text-emerald-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all shadow-sm tabular-nums" placeholder="0.00" required />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Date <span className="text-red-600">*</span></label>
                                        <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className={`${inputCls} cursor-pointer`} required />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelCls}>Purpose</label>
                                        <input type="text" value={data.purpose} onChange={e => setData('purpose', e.target.value)} className={inputCls} placeholder="e.g. Business Expansion" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Notes <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                        <textarea value={data.note} onChange={e => setData('note', e.target.value)} rows="2" className={`${inputCls} resize-none`} placeholder="Any agreements/details..."></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-10 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> Save Record</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 RETURN MONEY MODAL --- */}
            {showReturnModal && selectedInvestment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-xl bg-gray-50 rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-sm">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> Settle Payment
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">Pay Return / Profit</h3>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="text-white hover:bg-white/10 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white/5 relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleReturnSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                                <div className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
                                    <div>
                                        <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1"><i className="fa-solid fa-user-tie mr-1 text-slate-300"></i> Investor</span>
                                        <strong className="text-slate-900 text-[18px] font-black">{selectedInvestment.investor?.name}</strong>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11.5px] font-black uppercase tracking-widest text-rose-500 mb-1">Base Due</span>
                                        <strong className="text-rose-600 text-[24px] font-black tabular-nums leading-none"><Taka className="text-[16px] mr-0.5 opacity-80" />{parseFloat(selectedInvestment.due_amount).toLocaleString('en-IN')}</strong>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md space-y-6">
                                    <div>
                                        <label className={labelCls}>Pay From Account <span className="text-red-600">*</span></label>
                                        <Select options={accountOptions} onChange={s => returnForm.setData("account_id", s ? s.value : "")} placeholder="Search account..." isClearable styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} menuPosition="fixed" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Return Principal (৳) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]" />
                                                <input type="number" step="any" max={selectedInvestment.due_amount} value={returnForm.data.principal_amount} onChange={e => returnForm.setData('principal_amount', e.target.value)} className={`${inputCls} pl-10 text-[16px] font-black tabular-nums border-slate-400 focus:border-indigo-600`} required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={`${labelCls} !text-indigo-700`}>Add Profit/Interest (৳)</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-[18px]" />
                                                <input type="number" step="any" value={returnForm.data.profit_amount} onChange={e => returnForm.setData('profit_amount', e.target.value)} className={`${inputCls} pl-10 text-[16px] font-black tabular-nums bg-indigo-50/50 border-indigo-300 focus:border-indigo-600 text-indigo-800`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Payment Date <span className="text-red-600">*</span></label>
                                        <input type="date" value={returnForm.data.payment_date} onChange={e => returnForm.setData('payment_date', e.target.value)} className={`${inputCls} border-slate-400 cursor-pointer`} required />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5 shadow-sm">
                                    <span className="text-[13px] font-black uppercase tracking-widest text-indigo-600">Total Bank Deduction</span>
                                    <strong className="text-[26px] font-black text-indigo-900 tabular-nums leading-none"><Taka className="text-[18px] mr-1 opacity-80" />{(Number(returnForm.data.principal_amount) + Number(returnForm.data.profit_amount)).toLocaleString('en-IN')}</strong>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={returnForm.processing} className="rounded-xl bg-emerald-600 px-10 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-emerald-700 shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">
                                    {returnForm.processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> Process Payment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
