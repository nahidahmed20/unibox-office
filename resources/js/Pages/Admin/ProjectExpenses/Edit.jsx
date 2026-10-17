import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import axios from 'axios';

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-90 ${className}`}>৳</span>
);

export default function Edit({ expense, projects = [], categories = [], accounts = [], vendors = [], advances = [] }) {
    // Initial Pay Type logic
    let initialPayType = 'account';
    if (expense.account_id) initialPayType = 'account';
    else if (expense.advance_user_id) initialPayType = 'advance';
    else initialPayType = 'wallet';

    const { data, setData, put, processing, errors } = useForm({
        id: expense.id,
        project_id: expense.project_id || '',
        expense_category_id: expense.expense_category_id || '',
        account_id: expense.account_id || '',
        return_account_id: '',
        advance_user_id: expense.advance_user_id || '',
        title: expense.title || '',
        vendor_id: expense.vendor_id || '',
        payee_name: expense.payee_name || '',
        bank_charge: expense.bank_charge || 0,
        total_bill: expense.total_bill || '',
        paid_amount: expense.paid_amount || '',
        date: expense.date || new Date().toISOString().slice(0, 10),
        description: expense.description || '',
        pay_type: initialPayType
    });

    const [vendorList, setVendorList] = useState(vendors);
    const [showAddVendorForm, setShowAddVendorForm] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: '', company_name: '', phone: '' });
    const [creatingVendor, setCreatingVendor] = useState(false);

    // Sticky sidebar overflow fix for layout containers
    useEffect(() => {
        let parent = document.querySelector('.sticky-summary-box')?.parentElement;
        while (parent && parent.tagName !== 'BODY') {
            const style = window.getComputedStyle(parent);
            if (style.overflow === 'hidden' || style.overflowX === 'hidden') {
                parent.style.setProperty('overflow-x', 'clip', 'important');
                if (style.overflowY === 'hidden') parent.style.setProperty('overflow-y', 'visible', 'important');
            }
            parent = parent.parentElement;
        }
    }, []);

    // 🟢 Calculations for Live Settlement & Due
    const bill = parseFloat(data.total_bill) || 0;
    const paid = parseFloat(data.paid_amount) || 0;
    const isOverpaid = paid > bill;
    const overpaymentAmount = isOverpaid ? paid - bill : 0;
    const due = isOverpaid ? 0 : bill - paid;

    const selectedVendor = useMemo(() => vendorList.find(v => Number(v.id) === Number(data.vendor_id)), [vendorList, data.vendor_id]);
    const vendorWallet = selectedVendor ? Number(selectedVendor.wallet_balance || 0) : 0;

    const actualExpensePaid = Math.min(paid, bill);
    const walletDeduction = data.pay_type === 'wallet' ? actualExpensePaid : Math.min(actualExpensePaid, vendorWallet);
    const cashDeduction = data.pay_type === 'wallet' ? 0 : Math.max(paid - walletDeduction, 0);

    const getStatus = () => {
        if (bill > 0 && paid >= bill) return { label: 'PAID', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' };
        if (paid > 0 && paid < bill) return { label: 'PARTIAL', bg: 'bg-amber-500/10 text-amber-700 border-amber-300' };
        return { label: 'DUE', bg: 'bg-rose-500/10 text-rose-700 border-rose-300' };
    };
    const status = getStatus();

    // Option Mappers
    const projectOptions = useMemo(() => projects.map(p => ({
        value: p.id,
        label: `${p.title} ${p.client?.name ? `(${p.client.name}${p.client.company_name ? ` / ${p.client.company_name}` : ''})` : ''}`
    })), [projects]);

    const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);
    const vendorOptions = useMemo(() => vendorList.map(v => ({
        value: v.id,
        label: `${v.name} ${v.company_name ? `(${v.company_name})` : ''} ${Number(v.wallet_balance || 0) > 0 ? `[Wallet: ৳${Number(v.wallet_balance).toLocaleString('en-IN')}]` : ''}`
    })), [vendorList]);
    const accountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })), [accounts]);
    const returnAccountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: a.name })), [accounts]);
    const advanceOptions = useMemo(() => advances.map(a => ({ value: a.user_id, label: `${a.user?.name} (Rem: ৳${Number(a.balance).toLocaleString('en-IN')})` })), [advances]);

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '46px',
            borderRadius: '0.75rem',
            border: state.isFocused ? '2px solid #6366f1' : '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            fontSize: '13.5px',
            fontWeight: '600',
            color: '#0f172a',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
        }),
        singleValue: (base) => ({ ...base, color: '#0f172a', fontWeight: '700' }),
        placeholder: (base) => ({ ...base, color: '#94a3b8', fontWeight: '500' }),
        menu: (base) => ({
            ...base,
            fontSize: '13.5px',
            borderRadius: '0.875rem',
            zIndex: 9999,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#eef2ff' : 'white',
            color: state.isSelected ? 'white' : '#1e293b',
            fontWeight: state.isSelected ? '700' : '600',
            cursor: 'pointer',
            padding: '10px 14px'
        }),
        menuPortal: (base) => ({ ...base, zIndex: 99999 })
    };

    const darkSelectStyles = {
        ...selectStyles,
        control: (base, state) => ({
            ...base,
            minHeight: '44px',
            borderRadius: '0.75rem',
            border: state.isFocused ? '2px solid #818cf8' : '1px solid #475569',
            backgroundColor: '#1e293b',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(129, 140, 248, 0.15)' : 'none',
            fontSize: '13.5px',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer'
        }),
        singleValue: (base) => ({ ...base, color: '#f8fafc', fontWeight: '700' }),
        placeholder: (base) => ({ ...base, color: '#94a3b8' }),
        menu: (base) => ({
            ...base,
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '0.875rem',
            overflow: 'hidden',
            zIndex: 99999
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#334155' : '#1e293b',
            color: 'white',
            fontWeight: state.isSelected ? '700' : '500',
            cursor: 'pointer',
            padding: '10px 14px'
        })
    };

    const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : null;

    const handleCreateVendor = async () => {
        if (!newVendor.name.trim()) return Swal.fire("Required", "Vendor name is required.", "warning");
        setCreatingVendor(true);
        try {
            const res = await axios.post(route('admin.vendors.store'), {
                name: newVendor.name.trim(),
                company_name: newVendor.company_name.trim() || null,
                phone: newVendor.phone.trim() || null
            });
            const created = res.data.vendor;
            setVendorList([created, ...vendorList]);
            setData('vendor_id', created.id);
            setNewVendor({ name: '', company_name: '', phone: '' });
            setShowAddVendorForm(false);
            Swal.fire({ icon: "success", title: "Vendor Created!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (err) {
            Swal.fire("Error", "Could not create vendor.", "error");
        } finally {
            setCreatingVendor(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (bill <= 0) return Swal.fire("Required", "Enter a valid total bill amount.", "warning");
        if (cashDeduction > 0) {
            if (data.pay_type === 'account' && !data.account_id) return Swal.fire("Account Required", "Select an account to pay from.", "warning");
            if (data.pay_type === 'advance' && !data.advance_user_id) return Swal.fire("User Required", "Select whose advance balance this should be paid from.", "warning");
        }
        if (isOverpaid && !data.return_account_id && !data.vendor_id) {
            return Swal.fire("Action Required", `You entered ${overpaymentAmount} BDT extra. You must select either a Vendor (to save as advance) or a Return Cash Box.`, "warning");
        }

        put(route('admin.project-expenses.update', data.id), {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: "success",
                    title: "Updated Successfully!",
                    text: "Project expense has been updated.",
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            },
            onError: (err) => {
                const errorMessage = err.error || Object.values(err)[0] || "Something went wrong! Please check the form.";
                Swal.fire({
                    icon: "error",
                    title: "Update Failed",
                    text: errorMessage,
                    confirmButtonColor: "#ef4444"
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title={`Edit Project Expense #${expense.id}`} />
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-36">

                {/* --- 🟢 EXECUTIVE HEADER --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[11px] font-black uppercase tracking-widest shadow-xs">
                                <i className="fa-solid fa-pen-to-square text-[10px]"></i> Edit Entry
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[12px] font-black text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md">#EXP-{expense.id}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                            Edit Project Expense
                        </h1>
                        <p className="text-[13.5px] sm:text-[14px] text-slate-500 mt-1 font-medium">
                            Update tracked project costs, vendor bills, and payment settlements.
                        </p>
                    </div>

                    <Link
                        href={route('admin.project-expenses.index')}
                        className="inline-flex items-center justify-center gap-2 text-[13.5px] font-bold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/60 px-5 py-2.5 rounded-xl border border-slate-200 transition-all shadow-xs self-start sm:self-center"
                    >
                        <i className="fa-solid fa-arrow-left text-[12px]"></i> Back to Expenses
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col lg:flex-row gap-7 items-start relative">

                        {/* --- 🟢 LEFT COLUMN: INPUT SECTIONS --- */}
                        <div className="flex-1 space-y-6 w-full">

                            {/* Section 1: Project & Basic Information */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
                                            <i className="fa-solid fa-circle-info text-[14px]"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-[14.5px] font-black text-slate-900 uppercase tracking-wide">Basic Information</h2>
                                            <p className="text-[11.5px] text-slate-500 font-semibold">Transaction date, project, and expense categorization</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">Step 1</span>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Transaction Date <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.date}
                                            onChange={e => setData('date', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs transition-all cursor-pointer"
                                            required
                                        />
                                        {errors.date && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.date}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Assign Project <span className="text-rose-600">*</span>
                                        </label>
                                        <Select
                                            options={projectOptions}
                                            value={projectOptions.find(o => o.value === data.project_id) || null}
                                            onChange={opt => setData('project_id', opt ? opt.value : '')}
                                            placeholder="Search Project..."
                                            isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={selectMenuPortalTarget}
                                        />
                                        {errors.project_id && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.project_id}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Expense Title / Subject <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={e => setData('title', e.target.value)}
                                            placeholder="e.g. Domain & Hosting renewal for client site"
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none shadow-xs transition-all"
                                            required
                                        />
                                        {errors.title && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.title}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Expense Category <span className="text-rose-600">*</span>
                                        </label>
                                        <Select
                                            options={categoryOptions}
                                            value={categoryOptions.find(o => o.value === data.expense_category_id) || null}
                                            onChange={opt => setData('expense_category_id', opt ? opt.value : '')}
                                            placeholder="Select Category..."
                                            isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={selectMenuPortalTarget}
                                        />
                                        {errors.expense_category_id && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.expense_category_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Remarks / Notes <span className="text-slate-400 font-semibold normal-case">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Brief note or voucher number..."
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-xs transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Vendor & Payee Details */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-purple-100/80 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                                            <i className="fa-solid fa-store text-[14px]"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-[14.5px] font-black text-slate-900 uppercase tracking-wide">Vendor & Payee Details</h2>
                                            <p className="text-[11.5px] text-slate-500 font-semibold">Associate a vendor or enter a custom payee name</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">Step 2</span>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider">
                                                    Select Registered Vendor
                                                </label>
                                                {!showAddVendorForm && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewVendor(prev => ({ ...prev, name: data.payee_name || prev.name }));
                                                            setShowAddVendorForm(true);
                                                        }}
                                                        className="text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200/70 transition-all flex items-center gap-1"
                                                    >
                                                        <i className="fa-solid fa-plus text-[10px]"></i> New Vendor
                                                    </button>
                                                )}
                                            </div>
                                            <Select
                                                options={vendorOptions}
                                                value={vendorOptions.find(o => o.value === data.vendor_id) || null}
                                                onChange={opt => setData('vendor_id', opt ? opt.value : '')}
                                                placeholder="Search vendor by name..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={selectMenuPortalTarget}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                                Payee Name <span className="text-slate-400 font-semibold normal-case">(If not registered)</span>
                                            </label>
                                            <input
                                                type="text"
                                                maxLength="255"
                                                value={data.payee_name}
                                                onChange={e => setData('payee_name', e.target.value)}
                                                placeholder="Who received this payment?"
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-bold text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Inline Add New Vendor Form */}
                                    {showAddVendorForm && (
                                        <div className="bg-indigo-50/60 border border-indigo-200/80 shadow-xs rounded-2xl p-5 animate-[fadeIn_0.2s_ease-out]">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[13px] font-black text-indigo-900 flex items-center gap-2">
                                                    <i className="fa-solid fa-user-plus text-indigo-600"></i> Quick Add New Vendor
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddVendorForm(false)}
                                                    className="text-slate-400 hover:text-slate-600 text-sm"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                                <div>
                                                    <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-1">Vendor Name *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        value={newVendor.name}
                                                        onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-bold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-1">Company</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Business Name"
                                                        value={newVendor.company_name}
                                                        onChange={e => setNewVendor({ ...newVendor, company_name: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-bold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-1">Phone</label>
                                                    <input
                                                        type="text"
                                                        placeholder="01XXXXXXXXX"
                                                        value={newVendor.phone}
                                                        onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-bold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={handleCreateVendor}
                                                    disabled={creatingVendor}
                                                    className="rounded-xl bg-indigo-600 px-5 py-2 text-[12.5px] font-black text-white hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                                                >
                                                    {creatingVendor ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> Save & Select</>}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddVendorForm(false)}
                                                    className="rounded-xl bg-white border border-slate-300 px-4 py-2 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Vendor Wallet Alert Banner */}
                                    {vendorWallet > 0 && (
                                        <div className="p-4 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 rounded-2xl flex items-start gap-3.5 animate-[fadeIn_0.3s_ease-out]">
                                            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <i className="fa-solid fa-wallet text-[16px]"></i>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13.5px] font-black text-purple-900">Available Vendor Advance Balance:</span>
                                                    <span className="text-[15px] font-black text-purple-700 flex items-center">
                                                        <Taka className="text-[13px]" />{vendorWallet.toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-purple-700 font-semibold mt-0.5 leading-relaxed">
                                                    This balance includes any amounts restored from this expense. It can be used to cover this bill.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Section 3: Payment Source Section */}
                            <section className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
                                            <i className="fa-solid fa-money-bill-transfer text-[14px]"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-[14.5px] font-black text-slate-900 uppercase tracking-wide">Payment Source</h2>
                                            <p className="text-[11.5px] text-slate-500 font-semibold">Select where this payment was made from</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Step 3</span>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <label className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all flex items-center gap-3 shadow-xs ${data.pay_type === 'account' ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 ring-4 ring-indigo-600/10' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}>
                                            <input
                                                type="radio"
                                                name="pay_type"
                                                className="sr-only"
                                                checked={data.pay_type === 'account'}
                                                onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }}
                                            />
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${data.pay_type === 'account' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                <i className="fa-solid fa-building-columns text-[15px]"></i>
                                            </div>
                                            <div className="text-left min-w-0">
                                                <span className="block text-[13px] font-black tracking-tight">Bank / Cash Box</span>
                                                <span className="block text-[10.5px] font-semibold opacity-70">Company fund</span>
                                            </div>
                                        </label>

                                        <label className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all flex items-center gap-3 shadow-xs ${data.pay_type === 'advance' ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-4 ring-emerald-600/10' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}>
                                            <input
                                                type="radio"
                                                name="pay_type"
                                                className="sr-only"
                                                checked={data.pay_type === 'advance'}
                                                onChange={() => { setData('pay_type', 'advance'); setData('bank_charge', 0); setData('account_id', ''); }}
                                            />
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${data.pay_type === 'advance' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                <i className="fa-solid fa-hand-holding-dollar text-[15px]"></i>
                                            </div>
                                            <div className="text-left min-w-0">
                                                <span className="block text-[13px] font-black tracking-tight">Staff Advance</span>
                                                <span className="block text-[10.5px] font-semibold opacity-70">Staff balance</span>
                                            </div>
                                        </label>

                                        <label className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all flex items-center gap-3 shadow-xs ${data.pay_type === 'wallet' ? 'border-purple-600 bg-purple-50/40 text-purple-950 ring-4 ring-purple-600/10' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}>
                                            <input
                                                type="radio"
                                                name="pay_type"
                                                className="sr-only"
                                                checked={data.pay_type === 'wallet'}
                                                onChange={() => { setData('pay_type', 'wallet'); setData('bank_charge', 0); setData('account_id', ''); setData('advance_user_id', ''); }}
                                            />
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${data.pay_type === 'wallet' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                <i className="fa-solid fa-piggy-bank text-[15px]"></i>
                                            </div>
                                            <div className="text-left min-w-0">
                                                <span className="block text-[13px] font-black tracking-tight">Vendor Wallet</span>
                                                <span className="block text-[10.5px] font-semibold opacity-70">Vendor advance</span>
                                            </div>
                                        </label>
                                    </div>

                                    {data.pay_type === 'account' && (
                                        <div className="pt-2">
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                                Select Bank or Cash Box <span className="text-rose-600">*</span>
                                            </label>
                                            <Select
                                                options={accountOptions}
                                                value={accountOptions.find(o => o.value === data.account_id) || null}
                                                onChange={opt => setData('account_id', opt ? opt.value : '')}
                                                placeholder="Choose company account..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={selectMenuPortalTarget}
                                            />
                                            {errors.account_id && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.account_id}</p>}
                                        </div>
                                    )}

                                    {data.pay_type === 'advance' && (
                                        <div className="pt-2">
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-wider mb-2">
                                                Select Employee <span className="text-rose-600">*</span>
                                            </label>
                                            <Select
                                                options={advanceOptions}
                                                value={advanceOptions.find(o => o.value === data.advance_user_id) || null}
                                                onChange={opt => setData('advance_user_id', opt ? opt.value : '')}
                                                placeholder="Search employee with advance balance..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={selectMenuPortalTarget}
                                            />
                                            {errors.advance_user_id && <p className="text-rose-600 text-xs mt-1.5 font-bold">{errors.advance_user_id}</p>}
                                        </div>
                                    )}

                                    {data.pay_type === 'wallet' && (
                                        <div className="pt-2">
                                            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-center shadow-xs">
                                                {data.vendor_id ? (
                                                    <div>
                                                        <span className="text-[12px] font-bold text-purple-700 uppercase tracking-wider block mb-1">
                                                            Available Vendor Wallet Credit
                                                        </span>
                                                        <h3 className="text-2xl font-black text-purple-900 flex items-center justify-center">
                                                            <Taka className="text-[20px] text-purple-700" />
                                                            {Number(vendorList.find(v => Number(v.id) === Number(data.vendor_id))?.wallet_balance || 0).toLocaleString('en-IN')}
                                                        </h3>
                                                    </div>
                                                ) : (
                                                    <p className="text-purple-600 font-bold text-[13px]">
                                                        Please select a registered vendor in Step 2 first.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* --- 🟢 RIGHT COLUMN: STICKY FINANCIAL SUMMARY --- */}
                        <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-20 space-y-6 sticky-summary-box">
                            <section className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-6 sm:p-7 text-white relative overflow-hidden">
                                <span className="absolute -right-4 -top-8 text-[140px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
                                        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <i className="fa-solid fa-calculator text-indigo-400"></i> Financial Summary
                                        </h3>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-xs ${status.bg}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    {Object.keys(errors).length > 0 && (
                                        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-start gap-2">
                                            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-rose-400"></i>
                                            <div>{Object.values(errors).join(' ')}</div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {/* Total Bill Input */}
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-300 mb-2">
                                                Total Bill Amount <span className="text-rose-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={data.total_bill}
                                                    onChange={e => setData('total_bill', e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 pl-10 pr-4 py-3 text-[17px] font-black tabular-nums text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-inner transition-all"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            {errors.total_bill && <p className="text-rose-400 text-xs mt-1 font-bold">{errors.total_bill}</p>}
                                        </div>

                                        {/* Actually Paid Amount */}
                                        <div>
                                            <label className="block text-[12px] font-bold text-emerald-400 mb-2">
                                                Actually Paid Amount
                                            </label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-lg" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={data.paid_amount}
                                                    onChange={e => setData('paid_amount', e.target.value)}
                                                    className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-950/20 pl-10 pr-4 py-3 text-[17px] font-black tabular-nums text-emerald-300 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition-all"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            {errors.paid_amount && <p className="text-rose-400 text-xs mt-1 font-bold">{errors.paid_amount}</p>}
                                        </div>

                                        {/* Bank Charge Input */}
                                        {data.pay_type === 'account' && (
                                            <div>
                                                <label className="block text-[11.5px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                                                    <span>Bank Charge <span className="text-slate-500 font-normal">(extra debit)</span></span>
                                                </label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm" />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={data.bank_charge}
                                                        onChange={e => setData('bank_charge', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3 py-2 text-[13.5px] font-bold tabular-nums text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Auto Deduction Pill Blocks */}
                                        {walletDeduction > 0 && (
                                            <div className="flex justify-between items-center bg-purple-950/40 p-3 rounded-xl border border-purple-500/30 shadow-xs">
                                                <span className="text-[12.5px] font-bold text-purple-300 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-wallet text-xs"></i> Vendor Wallet:
                                                </span>
                                                <span className="text-[14px] font-black text-purple-300 tabular-nums flex items-center">
                                                    <Taka className="text-[12px]" />{Number(walletDeduction).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        )}

                                        {cashDeduction + Number(data.bank_charge || 0) > 0 && (
                                            <div className="flex justify-between items-center bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/30 shadow-xs">
                                                <span className="text-[12.5px] font-bold text-indigo-300 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-credit-card text-xs"></i> Cash / Advance:
                                                </span>
                                                <span className="text-[14px] font-black text-indigo-300 tabular-nums flex items-center">
                                                    <Taka className="text-[12px]" />{Number(cashDeduction + Number(data.bank_charge || 0)).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Total Due & Summary */}
                                        <div className="pt-4 border-t border-slate-800">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[13px] font-bold text-slate-400">Outstanding Due:</span>
                                                <span className="text-[20px] font-black text-white tabular-nums tracking-tight flex items-center">
                                                    <Taka className="text-[16px] text-slate-400" />{Number(due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Overpayment Section */}
                                        {isOverpaid && (
                                            <div className="mt-4 pt-4 border-t border-dashed border-amber-500/40">
                                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-3">
                                                    <div className="flex items-center gap-1.5 text-amber-400 text-[12.5px] font-black">
                                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                                        <span>Overpayment: ৳{Number(overpaymentAmount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <p className="text-[11.5px] text-slate-300 mt-1 font-medium">
                                                        {data.vendor_id
                                                            ? "Excess payment will automatically be credited to the vendor's wallet balance."
                                                            : "Please choose which cash box receives the return."
                                                        }
                                                    </p>
                                                </div>

                                                {!data.vendor_id && (
                                                    <div>
                                                        <label className="block text-[11px] font-black uppercase text-slate-300 mb-1.5">
                                                            Return Cash Box <span className="text-rose-400">*</span>
                                                        </label>
                                                        <Select
                                                            options={returnAccountOptions}
                                                            value={returnAccountOptions.find(o => o.value === data.return_account_id) || null}
                                                            onChange={opt => setData('return_account_id', opt ? opt.value : '')}
                                                            placeholder="Select Return Cash Box..."
                                                            isClearable
                                                            styles={darkSelectStyles}
                                                            menuPortalTarget={selectMenuPortalTarget}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>

                    {/* --- 🟢 FIXED BOTTOM ACTION BAR --- */}
                    <div className="fixed bottom-0 left-0 md:left-[270px] right-0 z-[90] bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_35px_rgba(0,0,0,0.06)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 text-[13px] font-bold text-slate-500">
                                <i className="fa-solid fa-pen-nib text-indigo-500"></i>
                                <span>Editing Expense #EXP-{expense.id}. Changes will adjust balances safely.</span>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Link
                                    href={route('admin.project-expenses.index')}
                                    className="flex-1 sm:flex-none text-center px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-[13.5px] text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-xs"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 sm:flex-none justify-center bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-7 py-2.5 rounded-xl font-black text-[13.5px] shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 active:scale-95"
                                >
                                    {processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin text-sm"></i> Updating...</>
                                    ) : (
                                        <><i className="fa-solid fa-check text-sm"></i> Update Project Expense</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
