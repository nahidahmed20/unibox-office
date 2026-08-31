import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import axios from 'axios';

export default function Create({ projects = [], categories = [], accounts = [], vendors = [], advances = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        project_id: '',
        expense_category_id: '',
        account_id: '',
        return_account_id: '',
        advance_user_id: '',
        title: '',
        vendor_id: '',
        total_bill: '',
        paid_amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        pay_type: 'account'
    });

    const [vendorList, setVendorList] = useState(vendors);
    const [showAddVendorForm, setShowAddVendorForm] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: '', company_name: '', phone: '' });
    const [creatingVendor, setCreatingVendor] = useState(false);

    // 🟢 Calculations for Auto-Split
    const bill = parseFloat(data.total_bill) || 0;
    const paid = parseFloat(data.paid_amount) || 0;

    const selectedVendor = useMemo(() => vendorList.find(v => v.id === data.vendor_id), [vendorList, data.vendor_id]);
    const vendorWallet = selectedVendor ? Number(selectedVendor.wallet_balance || 0) : 0;

    const actualExpensePaid = Math.min(paid, bill);
    const overpaymentAmount = Math.max(paid - bill, 0);
    const due = Math.max(bill - paid, 0);

    // Auto Deductions logic
    const walletDeduction = Math.min(actualExpensePaid, vendorWallet);
    const cashDeduction = paid - walletDeduction;

    const getStatus = () => {
        if (bill > 0 && paid >= bill) return { label: 'PAID', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
        if (paid > 0 && paid < bill) return { label: 'PARTIAL', color: 'text-amber-700 bg-amber-100 border-amber-200' };
        return { label: 'DUE', color: 'text-rose-700 bg-rose-100 border-rose-200' };
    };
    const status = getStatus();

    const projectOptions = useMemo(() => projects.filter(p => p.status !== 'completed').map(p => ({ value: p.id, label: `${p.title} ${p.client?.name ? `(${p.client.name})` : ''}` })), [projects]);
    const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);
    const vendorOptions = useMemo(() => vendorList.map(v => ({ value: v.id, label: `${v.name} ${v.company_name ? `(${v.company_name})` : ''}` })), [vendorList]);
    const accountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` })), [accounts]);
    const returnAccountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: a.name })), [accounts]);
    const advanceOptions = useMemo(() => advances.map(a => ({ value: a.user_id, label: `${a.user?.name} (Rem: ${Number(a.balance).toLocaleString('en-IN')})` })), [advances]);

    const selectStyles = {
        control: (base, state) => ({ ...base, minHeight: '48px', borderRadius: '0.75rem', border: state.isFocused ? '1px solid var(--accent, #6366f1)' : '1px solid #e5e7eb', backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc', boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none', fontSize: '14.5px', cursor: 'pointer' }),
        menu: (base) => ({ ...base, fontSize: '14.5px', borderRadius: '0.75rem', zIndex: 50, overflow: 'hidden' }),
        option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? 'var(--accent)' : state.isFocused ? '#f1f5f9' : 'white', color: state.isSelected ? 'white' : '#334155', cursor: 'pointer' }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };
    const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : null;

    const handleCreateVendor = async () => {
        if (!newVendor.name.trim()) return Swal.fire("Required", "Vendor name is required.", "warning");
        setCreatingVendor(true);
        try {
            const res = await axios.post(route('admin.vendors.store'), { name: newVendor.name.trim(), company_name: newVendor.company_name.trim() || null, phone: newVendor.phone.trim() || null });
            const created = res.data.vendor;
            setVendorList([created, ...vendorList]);
            setData('vendor_id', created.id);
            setNewVendor({ name: '', company_name: '', phone: '' });
            setShowAddVendorForm(false);
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
        if (overpaymentAmount > 0 && !data.vendor_id && !data.return_account_id) {
            return Swal.fire("Return Cash Box Required", "Please select a Cash Box to return the extra money.", "warning");
        }

        post(route('admin.project-expenses.store'));
    };

    return (
        <AdminLayout>
            <Head title="Log Project Expense" />
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-32">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider mb-3"><i className="fa-solid fa-file-invoice-dollar"></i> New Entry</div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Log Project Expense</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5">Accurately track project costs, vendor bills, and payments.</p>
                    </div>
                    <Link href={route('admin.project-expenses.index')} className="flex items-center justify-center gap-2 text-[14px] font-semibold text-gray-600 hover:text-indigo-600 transition-all bg-gray-50 hover:bg-indigo-50 px-5 py-2.5 rounded-xl border border-gray-200">
                        <i className="fa-solid fa-arrow-left"></i> Back
                    </Link>
                </div>

                <form onSubmit={handleSubmit} >
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* Left Column: Main Details */}
                        <div className="flex-1 space-y-6">
                            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50"><h2 className="text-[16px] font-bold text-gray-900"><i className="fa-solid fa-circle-info text-indigo-500 mr-2"></i>Basic Information</h2></div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Expense Title / Subject <span className="text-rose-500">*</span></label>
                                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. Domain & Hosting Purchase" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] font-semibold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none" required />
                                        {errors.title && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.title}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Select Project <span className="text-rose-500">*</span></label>
                                        <Select options={projectOptions} value={projectOptions.find(o => o.value === data.project_id) || null} onChange={opt => setData('project_id', opt ? opt.value : '')} placeholder="Search Project..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                        {errors.project_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.project_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Expense Category <span className="text-rose-500">*</span></label>
                                        <Select options={categoryOptions} value={categoryOptions.find(o => o.value === data.expense_category_id) || null} onChange={opt => setData('expense_category_id', opt ? opt.value : '')} placeholder="Select Category..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                        {errors.expense_category_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.expense_category_id}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between mb-2.5">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider">Vendor / Payee <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                                            {!showAddVendorForm && <button type="button" onClick={() => setShowAddVendorForm(true)} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800"><i className="fa-solid fa-plus"></i> New Vendor</button>}
                                        </div>
                                        {showAddVendorForm ? (
                                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                    <input type="text" placeholder="Vendor Name *" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="rounded-lg border border-gray-300 px-3 py-2 text-[13.5px] outline-none focus:border-indigo-500" />
                                                    <input type="text" placeholder="Company Name" value={newVendor.company_name} onChange={e => setNewVendor({...newVendor, company_name: e.target.value})} className="rounded-lg border border-gray-300 px-3 py-2 text-[13.5px] outline-none focus:border-indigo-500" />
                                                    <input type="text" placeholder="Phone Number" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} className="rounded-lg border border-gray-300 px-3 py-2 text-[13.5px] outline-none focus:border-indigo-500" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={handleCreateVendor} disabled={creatingVendor} className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-indigo-700">{creatingVendor ? 'Saving...' : 'Save & Select'}</button>
                                                    <button type="button" onClick={() => setShowAddVendorForm(false)} className="rounded-lg bg-white border border-gray-300 px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Select options={vendorOptions} value={vendorOptions.find(o => o.value === data.vendor_id) || null} onChange={opt => setData('vendor_id', opt ? opt.value : '')} placeholder="Search and select vendor..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                        )}

                                        {/* Show Wallet Balance Notification if vendor has balance */}
                                        {vendorWallet > 0 && (
                                            <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-2.5">
                                                <i className="fa-solid fa-wallet text-purple-500 mt-0.5"></i>
                                                <p className="text-[13px] text-purple-800 leading-tight">
                                                    This vendor has an advance wallet balance of <strong>৳{vendorWallet.toLocaleString('en-IN')}</strong>. <br />
                                                    <span className="text-[11.5px] text-purple-600 opacity-80">This balance will automatically be used first before asking for a Bank/Cash Account.</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Transaction Date <span className="text-rose-500">*</span></label>
                                        <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[14.5px] font-semibold text-gray-900 outline-none focus:border-indigo-500" required />
                                        {errors.date && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Remarks / Notes</label>
                                        <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Optional note..." className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[14.5px] font-medium text-gray-900 outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                            </section>

                            {/* 🟢 DYNAMIC PAYMENT SOURCE SECTION */}
                            {cashDeduction > 0 && (
                                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                                    <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/30 flex items-center justify-between">
                                        <h2 className="text-[16px] font-bold text-gray-900"><i className="fa-solid fa-wallet text-emerald-500 mr-2"></i>Payment Source</h2>
                                        <span className="text-[12px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg">Pay ৳{cashDeduction.toLocaleString('en-IN')} From</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex gap-4 mb-6">
                                            <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${data.pay_type === 'account' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}>
                                                <input type="radio" name="pay_type" className="sr-only" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                                <i className={`fa-solid fa-building-columns text-xl mb-2 block ${data.pay_type === 'account' ? 'text-emerald-600' : 'text-gray-400'}`}></i><span className={`block text-[14px] font-bold ${data.pay_type === 'account' ? 'text-emerald-800' : 'text-gray-600'}`}>Bank / Cash Box</span>
                                            </label>
                                            <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${data.pay_type === 'advance' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                                                <input type="radio" name="pay_type" className="sr-only" checked={data.pay_type === 'advance'} onChange={() => { setData('pay_type', 'advance'); setData('account_id', ''); }} />
                                                <i className={`fa-solid fa-hand-holding-dollar text-xl mb-2 block ${data.pay_type === 'advance' ? 'text-blue-600' : 'text-gray-400'}`}></i><span className={`block text-[14px] font-bold ${data.pay_type === 'advance' ? 'text-blue-800' : 'text-gray-600'}`}>Employee Advance</span>
                                            </label>
                                        </div>

                                        {data.pay_type === 'account' && (
                                            <div>
                                                <Select options={accountOptions} value={accountOptions.find(o => o.value === data.account_id) || null} onChange={opt => setData('account_id', opt ? opt.value : '')} placeholder="Select Bank/Cash Account..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                                {errors.account_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.account_id}</p>}
                                            </div>
                                        )}
                                        {data.pay_type === 'advance' && (
                                            <div>
                                                <Select options={advanceOptions} value={advanceOptions.find(o => o.value === data.advance_user_id) || null} onChange={opt => setData('advance_user_id', opt ? opt.value : '')} placeholder="Select Employee Advance..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                                {errors.advance_user_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.advance_user_id}</p>}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                        </div>

                        {/* Right Column: Financials & Submit */}
                        <div className="w-full lg:w-[380px] shrink-0 space-y-6">
                            <section className="bg-gray-900 rounded-2xl shadow-lg border border-gray-800 p-6 text-white sticky top-24">
                                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-5">Financial Summary</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[13px] font-medium text-gray-300 mb-2">Total Bill Amount <span className="text-rose-400">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                                            <input type="number" step="0.01" min="0" value={data.total_bill} onChange={e => setData('total_bill', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 pl-9 pr-4 py-3.5 text-[16px] font-bold text-white outline-none focus:border-indigo-500" placeholder="0.00" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-emerald-400 mb-2">Actually Paid Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                                            <input type="number" step="0.01" min="0" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-900/20 pl-9 pr-4 py-3.5 text-[16px] font-bold text-emerald-400 outline-none focus:border-emerald-500" placeholder="0.00" />
                                        </div>
                                    </div>

                                    {walletDeduction > 0 && (
                                        <div className="flex justify-between items-center bg-purple-900/40 p-3 rounded-xl border border-purple-500/30">
                                            <span className="text-[13px] text-purple-300">From Vendor Wallet:</span>
                                            <span className="text-[14px] font-bold text-purple-400">৳{Number(walletDeduction).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {cashDeduction > 0 && (
                                        <div className="flex justify-between items-center bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/30">
                                            <span className="text-[13px] text-indigo-300">From Cash/Advance:</span>
                                            <span className="text-[14px] font-bold text-indigo-400">৳{Number(cashDeduction).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[13px] text-gray-400">Current Due:</span>
                                            <span className="text-[16px] font-bold text-white">৳{Number(due).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[13px] text-gray-400">Payment Status:</span>
                                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${status.color}`}>{status.label}</span>
                                        </div>
                                    </div>

                                    {overpaymentAmount > 0 && (
                                        <div className="mt-6 pt-5 border-t border-dashed border-amber-500/50">
                                            <p className="text-[13px] font-bold text-amber-400 mb-2"><i className="fa-solid fa-triangle-exclamation mr-1.5"></i>Overpayment: ৳{overpaymentAmount.toLocaleString()}</p>

                                            {data.vendor_id ? (
                                                <p className="text-[12px] text-gray-300">Excess amount will be added to the vendor's wallet.</p>
                                            ) : (
                                                <div>
                                                    <p className="text-[12px] text-gray-300 mb-2">Select an account to return the excess cash:</p>
                                                    <Select options={returnAccountOptions} value={returnAccountOptions.find(o => o.value === data.return_account_id) || null} onChange={opt => setData('return_account_id', opt ? opt.value : '')} placeholder="Select Return Cash Box..." isClearable styles={selectStyles} menuPortalTarget={selectMenuPortalTarget} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 md:left-[270px] right-0 z-[999] bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
                            <div className="hidden sm:block text-[13px] text-gray-500">Ensure all details are correct before saving.</div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Link href={route('admin.project-expenses.index')} className="px-6 py-3 rounded-xl border border-gray-300 font-bold text-[14.5px] hover:bg-gray-50">Cancel</Link>
                                <button type="submit" disabled={processing} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-[14.5px] hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-save"></i> Save Expense</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
