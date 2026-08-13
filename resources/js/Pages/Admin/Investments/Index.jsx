import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

// Color system: investor type is the one piece of information that repeats everywhere
// (avatar, chip, table caption), so it gets a consistent color mapping instead of a
// decorative one. Kept as static class strings (not template-built) so Tailwind's
// scanner picks them up.
const INVESTOR_TYPE_META = {
    lender: { label: 'Lender', bn: 'ধার', chip: 'border-amber-500 bg-amber-50 text-amber-700', avatar: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    partner: { label: 'Partner', bn: 'অংশীদার', chip: 'border-indigo-500 bg-indigo-50 text-indigo-700', avatar: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
    owner: { label: 'Owner', bn: 'মালিক', chip: 'border-emerald-500 bg-emerald-50 text-emerald-700', avatar: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};
const INVESTMENT_TYPE_META = {
    loan: { label: 'Loan', bn: 'ধার বা ঋণ হিসেবে গ্রহণ', chip: 'border-slate-500 bg-slate-50 text-slate-700', icon: 'fa-hand-holding-dollar' },
    equity: { label: 'Equity', bn: 'স্থায়ী মূলধন হিসেবে গ্রহণ', chip: 'border-violet-500 bg-violet-50 text-violet-700', icon: 'fa-chart-pie' },
};

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13.5px] font-medium text-gray-900 outline-none focus:bg-white focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all";
const labelCls = "block text-[12px] font-bold text-gray-600 uppercase tracking-wide mb-2";

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
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10');
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
            put(route('admin.investments.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }); } });
        } else {
            if (!data.account_id) return Swal.fire("Required", "Please select a deposit account.", "warning");
            post(route('admin.investments.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Logged!', timer: 1500, showConfirmButton: false }); } });
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

    const selectStyles = {
        control: (provided, state) => ({ ...provided, minHeight: "46px", borderRadius: "0.75rem", border: state.isFocused ? "1px solid var(--accent)" : "1px solid #e5e7eb", backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc', boxShadow: state.isFocused ? "0 0 0 4px rgba(200, 155, 60, 0.12)" : "none", fontSize: "13.5px", cursor: 'pointer' }),
        menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', fontSize: '13.5px', zIndex: 50 }),
        option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? 'var(--accent)' : state.isFocused ? '#f8fafc' : 'white', color: state.isSelected ? 'white' : '#334155', cursor: 'pointer' }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };
    const accountOptions = accounts.map(a => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString()})` }));

    // Auto complete for existing investors
    const handleInvestorNameChange = (e) => {
        const val = e.target.value;
        setData('investor_name', val);
        const exists = existingInvestors.find(inv => inv.name.toLowerCase() === val.toLowerCase());
        if (exists) setData(prev => ({ ...prev, investor_phone: exists.phone || '', investor_type: exists.type }));
    };

    return (
        <AdminLayout>
            <Head title="Investments & Loans" />

            <div className="flex flex-col gap-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span> Capital Ledger
                        </div>
                        <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight">Investments & Loans</h1>
                        <p className="text-[14px] text-gray-500 mt-1.5 max-w-md">Track business capital, loans, and manage principal & profit returns.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><i className="fa-solid fa-arrow-down-to-bracket text-[13px]"></i></div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Received</div>
                                <div className="text-[16px] font-extrabold text-gray-900 tabular-nums">৳{parseFloat(totalAmount || 0).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><i className="fa-solid fa-triangle-exclamation text-[13px]"></i></div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Due Principal</div>
                                <div className="text-[16px] font-extrabold text-gray-900 tabular-nums">৳{parseFloat((totalAmount || 0) - (totalReturned || 0)).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fa-solid fa-chart-line text-[13px]"></i></div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Profit Paid</div>
                                <div className="text-[16px] font-extrabold text-gray-900 tabular-nums">৳{parseFloat(totalProfitPaid || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><i className="fa-solid fa-building-columns text-[14px]"></i></div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">Directory</h2>
                                <p className="text-[12px] text-gray-400">{investments.total ?? investmentList.length} total records</p>
                            </div>
                        </div>
                        {hasPermission('create_investment') && (
                            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-sm hover:bg-[#b08630] transition-colors">
                                <i className="fa-solid fa-plus text-[12px]"></i> Add Investment
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 bg-gray-50/60 border-b border-gray-100">
                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[12.5px]"></i>
                            <input type="text" placeholder="Search investor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-[13.5px] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all" />
                        </div>
                        <select value={perPage} onChange={(e) => setPerPage(e.target.value)} className="w-full sm:w-[130px] rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-600 outline-none focus:border-[var(--accent)] transition-all">
                            <option value={10}>10 Entries</option><option value={25}>25 Entries</option><option value="all">All</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-gray-50/70 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 w-12">SL</th>
                                    <th className="px-6 py-3.5">Investor Info</th>
                                    <th className="px-6 py-3.5">Date & Purpose</th>
                                    <th className="px-6 py-3.5 text-right">Received</th>
                                    <th className="px-6 py-3.5 text-right">Principal Paid</th>
                                    <th className="px-6 py-3.5 text-right">Profit Paid</th>
                                    <th className="px-6 py-3.5 text-right">Due Base</th>
                                    <th className="px-6 py-3.5 text-center">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {investmentList.length > 0 ? investmentList.map((inv, index) => {
                                    const typeMeta = INVESTOR_TYPE_META[inv.investor?.type] || { avatar: 'bg-gray-100 text-gray-500' };
                                    return (
                                        <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-medium">{(investments.current_page - 1) * investments.per_page + index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold uppercase ${typeMeta.avatar}`}>
                                                        {(inv.investor?.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[13.5px]">{inv.investor?.name}</div>
                                                        <div className="text-[11px] text-gray-400 font-medium mt-0.5">{typeMeta.label || inv.investor?.type} · {INVESTMENT_TYPE_META[inv.investment_type]?.label || inv.investment_type}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-800">{inv.date}</div>
                                                <div className="text-[11.5px] text-gray-400 max-w-[180px] truncate">{inv.purpose}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 tabular-nums">৳{parseFloat(inv.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">৳{parseFloat(inv.returned_principal || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-indigo-500 tabular-nums">৳{parseFloat(inv.returned_profit || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-rose-600 tabular-nums">৳{parseFloat(inv.due_amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'fully_paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {inv.status !== 'fully_paid' && (
                                                        <button onClick={() => openReturnModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Return Money & Profit">
                                                            <i className="fa-solid fa-hand-holding-dollar text-[12.5px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_investment') && (
                                                        <button onClick={() => openEditModal(inv)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit Info"><i className="fa-regular fa-pen-to-square text-[12.5px]"></i></button>
                                                    )}
                                                    {hasPermission('delete_client') && inv.due_amount === parseFloat(inv.amount) && ( // Allow delete only if no returns are made yet
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete"><i className="fa-regular fa-trash-can text-[12.5px]"></i></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><i className="fa-solid fa-inbox text-lg"></i></div>
                                                <p className="text-gray-600 font-semibold text-[13.5px]">No records found</p>
                                                <p className="text-gray-400 text-[12px]">Try a different search term, or add a new investment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {investments.links && investments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                            <div className="text-[12.5px] text-gray-500">Showing <strong className="text-gray-700">{investments.from || 0}</strong> to <strong className="text-gray-700">{investments.to || 0}</strong> of <strong className="text-gray-700">{investments.total || 0}</strong></div>
                            <div className="flex gap-1">
                                {investments.links.map((link, i) => (
                                    <Link key={i} href={link.url || "#"} preserveState className={`min-w-[34px] text-center px-2.5 py-1.5 rounded-lg border text-[12.5px] font-semibold transition-colors ${link.active ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm' : link.url ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300' : 'bg-transparent text-gray-300 border-transparent pointer-events-none'}`} dangerouslySetInnerHTML={{ __html: link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CREATE / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[92vh]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><i className="fa-solid fa-file-signature text-[15px]"></i></div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-gray-900">{editMode ? 'Edit Record Info' : 'Log New Investment / Loan'}</h3>
                                    <p className="text-[12px] text-gray-400">{editMode ? 'Update investor and transaction details' : 'Capture a new investor deposit'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-5 mb-5">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className={labelCls}>Investor/Lender Name *</label>
                                    <input type="text" list="investors" value={data.investor_name} onChange={handleInvestorNameChange} className={inputCls} placeholder="Start typing name..." required />
                                    <datalist id="investors">{existingInvestors.map((i, x) => <option key={x} value={i.name} />)}</datalist>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className={labelCls}>Phone</label>
                                    <input type="text" value={data.investor_phone} onChange={e => setData('investor_phone', e.target.value)} className={inputCls} placeholder="01XXXXXXXXX" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className={labelCls}>Person Type *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(INVESTOR_TYPE_META).map(([value, meta]) => (
                                            <button key={value} type="button" onClick={() => setData('investor_type', value)} className={`rounded-xl border-2 px-2 py-2.5 text-center transition-all ${data.investor_type === value ? meta.chip : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                                <span className="block text-[12px] font-bold">{meta.label}</span>
                                                <span className="block text-[10px] mt-0.5 opacity-75">{meta.bn}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className={labelCls}>Investment Type *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(INVESTMENT_TYPE_META).map(([value, meta]) => (
                                            <button key={value} type="button" onClick={() => setData('investment_type', value)} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2.5 text-center transition-all ${data.investment_type === value ? meta.chip : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                                <i className={`fa-solid ${meta.icon} text-[13px]`}></i>
                                                <span className="text-[12px] font-bold">{meta.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Deposit To Account *</label>
                                    <Select options={accountOptions} value={accountOptions.find(opt => opt.value === data.account_id) || null} onChange={s => setData("account_id", s ? s.value : "")} placeholder="Search account..." isClearable styles={selectStyles} menuPortalTarget={document.body} />
                                    {errors.account_id && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.account_id}</p>}
                                </div>
                                <div>
                                    <label className={`${labelCls} text-emerald-600`}>Amount (৳) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[15px]">৳</span>
                                        <input type="number" step="any" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/60 pl-8 pr-3.5 py-3 text-[16px] font-extrabold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" required />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Date *</label>
                                    <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className={inputCls} required />
                                </div>
                                <div>
                                    <label className={labelCls}>Purpose</label>
                                    <input type="text" value={data.purpose} onChange={e => setData('purpose', e.target.value)} className={inputCls} placeholder="e.g. Business Expansion" />
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-5">
                                <label className={labelCls}>Notes</label>
                                <textarea value={data.note} onChange={e => setData('note', e.target.value)} rows="2" className={inputCls} placeholder="Any agreements/details..."></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 mt-5">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-[13.5px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={processing} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[13.5px] font-bold hover:bg-[#b08630] transition-colors disabled:opacity-60">{processing ? 'Processing...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- RETURN MONEY MODAL --- */}
            {showReturnModal && selectedInvestment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[92vh]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><i className="fa-solid fa-hand-holding-dollar text-[15px]"></i></div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-gray-900">Pay Return / Profit</h3>
                                    <p className="text-[12px] text-gray-400">Settle principal and optional profit in one payment</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="p-6 overflow-y-auto">
                            <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">Investor</span>
                                    <strong className="text-gray-900 text-[14px]">{selectedInvestment.investor?.name}</strong>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[11px] font-bold uppercase tracking-wide text-rose-400">Base Due</span>
                                    <strong className="text-rose-600 text-[19px] tabular-nums">৳{parseFloat(selectedInvestment.due_amount).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className={labelCls}>Pay From Account *</label>
                                    <Select options={accountOptions} onChange={s => returnForm.setData("account_id", s ? s.value : "")} placeholder="Search account..." isClearable styles={selectStyles} menuPortalTarget={document.body} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Return Principal (৳) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-[15px]">৳</span>
                                            <input type="number" step="any" max={selectedInvestment.due_amount} value={returnForm.data.principal_amount} onChange={e => returnForm.setData('principal_amount', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3.5 py-3 text-[15px] font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-500/10 transition-all" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`${labelCls} text-indigo-600`}>Add Profit/Interest (৳)</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-bold text-[15px]">৳</span>
                                            <input type="number" step="any" value={returnForm.data.profit_amount} onChange={e => returnForm.setData('profit_amount', e.target.value)} className="w-full rounded-xl border border-indigo-200 bg-indigo-50/60 pl-8 pr-3.5 py-3 text-[15px] font-bold text-indigo-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Payment Date *</label>
                                    <input type="date" value={returnForm.data.payment_date} onChange={e => returnForm.setData('payment_date', e.target.value)} className={inputCls} required />
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 mt-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Total Bank Deduction</span>
                                    <strong className="text-[20px] font-extrabold text-slate-800 tabular-nums">৳{(Number(returnForm.data.principal_amount) + Number(returnForm.data.profit_amount)).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-[13.5px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={returnForm.processing} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[13.5px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60">{returnForm.processing ? 'Processing...' : 'Process Payment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}