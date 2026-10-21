import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import TableExportButtons from '@/Components/TableExportButtons';

// Custom Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

// 🟢 Custom Premium Dropdown (Fixes z-index issues perfectly matching your design)
function SearchableSelect({ options, value, onChange, placeholder, getLabel, getValue, error, disabled, isClearable = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setOpen(false); setSearch(""); } }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    const selected = options.find((opt) => String(getValue(opt)) === String(value));
    const filtered = options.filter((opt) => getLabel(opt).toLowerCase().includes(search.toLowerCase()));

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
        setSearch("");
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-[60]">
            <div onClick={() => !disabled && setOpen((o) => !o)} className={`flex w-full cursor-pointer items-center justify-between rounded-[0.875rem] min-h-[52px] border bg-white px-4 py-3 outline-none transition-all duration-200 ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-70 border-slate-200 text-slate-400' : 'hover:border-indigo-600'} ${error ? 'border-red-400 focus:ring-red-500/50' : 'border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-sm'} ${selected && !disabled ? 'text-slate-900 font-[800] text-[14.5px]' : 'text-[#94A3B8] font-[700] text-[14px]'}`}>
                <span className="truncate flex-1">{selected ? getLabel(selected) : placeholder}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {isClearable && selected && !disabled && (
                        <i onClick={handleClear} className="fa-solid fa-xmark text-[13px] text-slate-400 hover:text-rose-500 transition-colors h-6 w-6 flex items-center justify-center rounded-full hover:bg-rose-50"></i>
                    )}
                    <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
                </div>
            </div>
            {open && !disabled && (
                <div className="absolute top-[calc(100%+6px)] left-0 flex max-h-[300px] w-full flex-col overflow-hidden rounded-[0.875rem] border border-slate-300 bg-white shadow-2xl z-[99999] animate-[fadeIn_0.15s_ease-out]">
                    <div className="border-b border-slate-200 bg-slate-50 p-3 shrink-0 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                        <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search here..." className="w-full rounded-[0.5rem] border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[14px] font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm" />
                    </div>
                    <div className="overflow-y-auto py-1.5 custom-table-scroll">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-slate-400 font-bold">No results found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isActive = String(getValue(opt)) === String(value);
                                return (
                                    <div key={getValue(opt)} onClick={() => { onChange(String(getValue(opt))); setOpen(false); setSearch(""); }} className={`cursor-pointer px-4 py-2.5 text-[14.5px] font-[700] transition-colors border-b border-slate-50 last:border-0 ${isActive ? 'bg-[#4F46E5] text-white' : 'text-[#0F172A] hover:bg-[#EEF2FF]'}`}>
                                        {getLabel(opt)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const inputClass = "w-full rounded-[0.875rem] border border-slate-300 bg-white px-5 py-3.5 text-[14.5px] font-bold text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-sm";

export default function Index({ advances = [], filters = {}, accounts = [], employees = [], totals = {}, employeeBalances = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});

    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const advanceList = Array.isArray(advances) ? advances : (advances.data || []);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [userFilter, setUserFilter] = useState(filters.user_id ? Number(filters.user_id) : '');
    const [accountFilter, setAccountFilter] = useState(filters.account_id ? Number(filters.account_id) : '');
    const [perPage, setPerPage] = useState(String(filters.per_page || '50'));
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', user_id: '', amount: '', bank_charge: '', date: new Date().toISOString().slice(0, 10), purpose: 'Office Purpose', status: 'unsettled', notes: ''
    });

    const { data: returnData, setData: setReturnData, post: postReturn, processing: returnProcessing, reset: returnReset, errors: returnErrors, clearErrors: clearReturnErrors } = useForm({
        return_amount: '', return_account_id: ''
    });

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            setExpandedRows({});
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (userFilter) params.user_id = userFilter;
            if (accountFilter) params.account_id = accountFilter;
            if (perPage) params.per_page = perPage;

            router.get(route('admin.advances.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, userFilter, accountFilter, perPage]);

    const groupedAdvances = useMemo(() => {
        const map = new Map();
        advanceList.forEach((adv) => {
            const key = adv.user_id;
            if (!map.has(key)) map.set(key, { user_id: adv.user_id, user: adv.user, records: [], total_given: 0, total_expensed: 0, total_returned: 0 });
            const group = map.get(key);
            group.records.push(adv);
            group.total_given += parseFloat(adv.amount || 0);
            group.total_expensed += parseFloat(adv.settled_amount || 0);
            group.total_returned += parseFloat(adv.returned_amount || 0);
        });
        return Array.from(map.values()).map((group) => ({ ...group, total_due: group.total_given - group.total_expensed - group.total_returned }));
    }, [advanceList]);

    const toggleExpand = (userId) => setExpandedRows((prev) => ({ ...prev, [userId]: !prev[userId] }));

    const exportHeaders = ['SL', 'Date', 'Account', 'Given To', 'Purpose', 'Total Given (৳)', 'Bank Charge (৳)', 'Expensed (৳)', 'Returned (৳)', 'Due (৳)', 'Status'];
    const exportRows = useMemo(() => {
        return advanceList.map((adv, idx) => {
            const expensed = parseFloat(adv.settled_amount || 0);
            const returned = parseFloat(adv.returned_amount || 0);
            const total = parseFloat(adv.amount || 0);
            const charge = parseFloat(adv.bank_charge || 0);
            const due = total - expensed - returned;
            return [
                idx + 1,
                adv.date || '',
                adv.account?.name || 'N/A',
                adv.user?.name || 'N/A',
                adv.purpose || 'Office Work',
                total.toFixed(2),
                charge.toFixed(2),
                expensed.toFixed(2),
                returned.toFixed(2),
                due.toFixed(2),
                adv.status || 'unsettled'
            ];
        });
    }, [advanceList]);

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', account_id: '', user_id: '', amount: '', bank_charge: '', settled_amount: 0, returned_amount: 0, date: new Date().toISOString().slice(0, 10), purpose: 'Office Work', status: 'unsettled', notes: '' });
        setEditMode(false); setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors();
        setData({ id: adv.id, account_id: adv.account_id || '', user_id: adv.user_id || '', amount: adv.amount, bank_charge: adv.bank_charge || '', date: adv.date, purpose: adv.purpose || 'Office Work', status: adv.status || 'unsettled', notes: adv.notes || '' });
        setEditMode(true); setShowModal(true);
    };

    const openReturnModal = (adv) => {
        setSelectedAdvance(adv); returnReset(); clearReturnErrors();
        const due = parseFloat(adv.amount) - parseFloat(adv.settled_amount || 0) - parseFloat(adv.returned_amount || 0);
        setReturnData({ return_amount: due > 0 ? due : '', return_account_id: adv.account_id || '' });
        setShowReturnModal(true);
    };

    const openViewModal = (adv) => { setSelectedAdvance(adv); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.user_id) return Swal.fire("Required", "Please select an employee.", "warning");
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        const action = editMode ? put : post;
        const routeName = editMode ? route('admin.advances.update', data.id) : route('admin.advances.store');

        action(routeName, {
            preserveScroll: true,
            onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: editMode ? 'Updated!' : 'Logged!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); }
        });
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        if (!returnData.return_account_id) return Swal.fire("Required", "Select return account.", "warning");
        postReturn(route('admin.advances.returnMoney', selectedAdvance.id), {
            preserveScroll: true,
            onSuccess: () => { setShowReturnModal(false); Swal.fire({ icon: 'success', title: 'Refunded!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?', text: `Remaining money + bank charge will be refunded to the account!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true, onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                @media print { body * { visibility: hidden; } #printable-advance-table, #printable-advance-table * { visibility: visible; } #printable-advance-table { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8 mt-4">

                {/* 🌟 Outstanding Advances Showcase */}
                {employeeBalances && employeeBalances.length > 0 && (
                    <div className="w-full bg-slate-900 rounded-3xl border border-slate-700 shadow-xl p-5 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><i className="fa-solid fa-hand-holding-dollar text-9xl text-white"></i></div>
                        <div className="flex items-center gap-3 mb-4 sm:mb-5 relative z-10">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner"><i className="fa-solid fa-sack-dollar text-[15px]"></i></div>
                            <h3 className="text-[16px] sm:text-[18px] font-black text-white tracking-tight uppercase">Outstanding Advances</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-table-scroll relative z-10 snap-x">
                            {employeeBalances.map(emp => (
                                <div key={emp.user_id} className="snap-start shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col min-w-[200px] shadow-sm backdrop-blur-sm transition-all hover:bg-white/10">
                                    <div className="text-[13px] font-bold text-slate-300 truncate mb-1.5 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] text-white"><i className="fa-solid fa-user"></i></div>
                                        {emp.name || 'Unknown'}
                                    </div>
                                    <span className="text-[20px] font-black text-rose-400 tabular-nums"><Taka className="text-[14px]" />{Number(emp.total_due).toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🌟 Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm"><i className="fa-solid fa-money-bill-transfer"></i> Financial Management</div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Advance Payments</h1>
                    </div>
                </div>

                {/* 🌟 Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-md border border-indigo-500 text-white min-w-[220px]">
                        <p className="text-[11.5px] font-bold uppercase tracking-widest text-indigo-200">Total Given</p>
                        <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center"><Taka className="text-[16px] text-indigo-200 mr-1" />{Number(totals.total_given || 0).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-md border border-emerald-500 text-white min-w-[220px]">
                        <p className="text-[11.5px] font-bold uppercase tracking-widest text-emerald-200">Total Expensed</p>
                        <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center"><Taka className="text-[16px] text-emerald-200 mr-1" />{Number(totals.total_expensed || 0).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-6 shadow-md border border-violet-500 text-white min-w-[220px]">
                        <p className="text-[11.5px] font-bold uppercase tracking-widest text-violet-200">Total Returned</p>
                        <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center"><Taka className="text-[16px] text-violet-200 mr-1" />{Number(totals.total_returned || 0).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-6 shadow-md border border-rose-400 text-white min-w-[220px]">
                        <p className="text-[11.5px] font-bold uppercase tracking-widest text-rose-200">Total Due Amount</p>
                        <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center"><Taka className="text-[16px] text-rose-200 mr-1" />{Number(totals.total_due || 0).toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                {/* 🌟 Main Card */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Header Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 px-6 py-5 gap-4 bg-slate-50/50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm"><i className="fa-solid fa-list-check text-[15px]"></i></div>
                            Advance History
                        </div>

                        <div className="flex items-center gap-3">
                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename="Employee_Advances_Report"
                                title="Employee Advance Payments Directory"
                            />

                            {hasPermission('create_advance') && (
                                <button onClick={openCreateModal} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-[10.5px] text-[13.5px] font-black text-white transition-all shadow-md active:scale-[0.98] ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Log Advance
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Premium Filters Area */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5 bg-white border-b border-slate-100">
                        <div className="relative w-full z-[40]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Search Records</label>
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-[36px] text-slate-400 text-[13px]"></i>
                            <input type="text" placeholder="Search here..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-[0.875rem] border border-slate-300 py-[11px] pl-10 pr-4 text-[14px] font-bold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white" />
                        </div>
                        <div className="w-full relative z-[50]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter Employee</label>
                            <SearchableSelect
                                options={employees}
                                value={userFilter}
                                onChange={(val) => setUserFilter(val)}
                                getLabel={(e) => e.name}
                                getValue={(e) => e.id}
                                placeholder="All Employees"
                                isClearable
                            />
                        </div>
                        <div className="w-full relative z-[45]">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Filter Account</label>
                            <SearchableSelect
                                options={accounts}
                                value={accountFilter}
                                onChange={(val) => setAccountFilter(val)}
                                getLabel={(a) => a.name}
                                getValue={(a) => a.id}
                                placeholder="All Accounts"
                                isClearable
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Show Rows</label>
                            <div className="relative">
                                <select value={perPage} onChange={(e) => setPerPage(e.target.value)} className="w-full appearance-none rounded-[0.875rem] border border-slate-300 bg-white py-[11.5px] pl-4 pr-10 text-[14px] font-bold text-slate-800 outline-none cursor-pointer shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all">
                                    <option value="10">10 Rows</option><option value="25">25 Rows</option><option value="50">50 Rows</option><option value="100">100 Rows</option><option value="all">All Data</option>
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table id="printable-advance-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 w-12 expand-btn-col"></th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Account Source</th>
                                    <th className="px-6 py-4">Employee Profile</th>
                                    <th className="px-6 py-4 text-right bg-indigo-50/50">Given (Out)</th>
                                    <th className="px-6 py-4 text-right bg-emerald-50/50">Expensed</th>
                                    <th className="px-6 py-4 text-right bg-blue-50/50">Returned</th>
                                    <th className="px-6 py-4 text-right bg-rose-50/50">Due Balance</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center actions-col w-36">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-100">
                                {groupedAdvances.length > 0 ? groupedAdvances.map((group) => {
                                    const isExpanded = !!expandedRows[group.user_id];
                                    const hasMultiple = group.records.length > 1;
                                    const single = group.records[0];

                                    return (
                                        <React.Fragment key={group.user_id}>
                                            <tr className={`transition-colors group/row ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'}`}>
                                                <td className="px-6 py-4 text-center expand-btn-col">
                                                    {hasMultiple && (
                                                        <button onClick={() => toggleExpand(group.user_id)} className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all shadow-sm ${isExpanded ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}>
                                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[11px]`}></i>
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-600">
                                                    {hasMultiple ? <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase shadow-sm">{group.records.length} Entries</span> : <div>{single.date}</div>}
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-800">
                                                    {hasMultiple ? <span className="text-slate-400 italic font-semibold text-[12px]"><i className="fa-solid fa-layer-group mr-1.5"></i>Multiple Accounts</span> : <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm text-[12.5px]"><i className="fa-solid fa-building-columns text-indigo-500"></i> {single.account?.name || 'N/A'}</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-[14px] shadow-sm">{(group.user?.name || '?').charAt(0)}</div>
                                                        <div>
                                                            <Link href={route('admin.advances.employeeLedger', group.user_id)} className="font-extrabold text-slate-900 hover:text-indigo-600 text-[14.5px] transition-colors">{group.user?.name}</Link>
                                                            {!hasMultiple && single.purpose && <div className="text-[11.5px] font-bold text-slate-500 truncate max-w-[180px] mt-0.5"><i className="fa-solid fa-bullseye text-[10px] mr-1 text-indigo-300"></i>{single.purpose}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-700 tabular-nums bg-indigo-50/30 text-[15px]"><Taka className="text-[13px] mr-1 opacity-70"/>{group.total_given.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600 tabular-nums bg-emerald-50/30 text-[14px]">{group.total_expensed > 0 ? <><Taka className="text-[12px] mr-1 opacity-70"/>{group.total_expensed.toLocaleString('en-IN')}</> : '-'}</td>
                                                <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums bg-blue-50/30 text-[14px]">{group.total_returned > 0 ? <><Taka className="text-[12px] mr-1 opacity-70"/>{group.total_returned.toLocaleString('en-IN')}</> : '-'}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-600 text-[15.5px] tabular-nums bg-rose-50/40">{group.total_due > 0 ? <><Taka className="text-[13px] mr-1 opacity-80"/>{group.total_due.toLocaleString('en-IN')}</> : '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${group.total_due > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                        {group.total_due > 0 ? 'Unsettled' : 'Settled'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center actions-col">
                                                    {hasMultiple ? (
                                                        <button onClick={() => toggleExpand(group.user_id)} className="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm w-full">
                                                            {isExpanded ? 'Hide Details' : 'View Details'}
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1.5 transition-opacity">
                                                            {hasPermission('view_client_advance') && <button onClick={() => openViewModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:-translate-y-0.5 transition-all shadow-sm" title="View"><i className="fa-regular fa-eye text-[12.5px]"></i></button>}
                                                            {hasPermission('return_advance') && single.status !== 'settled' && group.total_due > 0 && <button onClick={() => openReturnModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:-translate-y-0.5 transition-all shadow-sm" title="Refund/Return"><i className="fa-solid fa-money-bill-transfer text-[12.5px]"></i></button>}
                                                            {hasPermission('edit_advance') && <button onClick={() => openEditModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:-translate-y-0.5 transition-all shadow-sm" title="Edit"><i className="fa-regular fa-pen-to-square text-[12.5px]"></i></button>}
                                                            {hasPermission('delete_advance') && <button onClick={() => handleDelete(single.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:-translate-y-0.5 transition-all shadow-sm" title="Delete"><i className="fa-regular fa-trash-can text-[12.5px]"></i></button>}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Sub Table for Multiple Records */}
                                            {isExpanded && hasMultiple && (
                                                <tr>
                                                    <td colSpan="10" className="px-8 py-6 bg-slate-100/80 border-b border-slate-200 shadow-inner">
                                                        <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-lg animate-[fadeIn_0.2s_ease-out]">
                                                            <table className="w-full border-collapse">
                                                                <thead className="bg-slate-50 text-[10.5px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-5 py-3.5">Date & Ref</th>
                                                                        <th className="px-5 py-3.5">Account Source</th>
                                                                        <th className="px-5 py-3.5 text-right bg-indigo-50/30">Given</th>
                                                                        <th className="px-5 py-3.5 text-right bg-rose-50/30">Bank Charge</th>
                                                                        <th className="px-5 py-3.5 text-right bg-emerald-50/30">Settled</th>
                                                                        <th className="px-5 py-3.5 text-right">Remaining Due</th>
                                                                        <th className="px-5 py-3.5 text-center actions-col w-36">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="text-[13px] text-slate-700 divide-y divide-slate-100">
                                                                    {group.records.map((adv) => (
                                                                        <tr key={adv.id} className="hover:bg-slate-50 group/sub transition-colors">
                                                                            <td className="px-5 py-4">
                                                                                <div className="font-bold text-slate-800">{adv.date}</div>
                                                                                <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">#{String(adv.id).padStart(5, '0')}</div>
                                                                            </td>
                                                                            <td className="px-5 py-4 font-bold text-slate-700"><i className="fa-solid fa-building-columns text-indigo-400 mr-1.5"></i> {adv.account?.name || 'N/A'}</td>
                                                                            <td className="px-5 py-4 text-right font-black text-indigo-700 bg-indigo-50/20">{parseFloat(adv.amount).toLocaleString('en-IN')}</td>
                                                                            <td className="px-5 py-4 text-right font-bold text-rose-500 bg-rose-50/20">{parseFloat(adv.bank_charge || 0).toLocaleString('en-IN')}</td>
                                                                            <td className="px-5 py-4 text-right font-black text-emerald-600 bg-emerald-50/20">{parseFloat((adv.settled_amount || 0) + (adv.returned_amount || 0)).toLocaleString('en-IN')}</td>
                                                                            <td className="px-5 py-4 text-right font-black text-rose-600">{parseFloat(adv.amount - adv.settled_amount - adv.returned_amount).toLocaleString('en-IN')}</td>
                                                                            <td className="px-5 py-4 text-center actions-col">
                                                                                <div className="flex items-center justify-end gap-1.5 transition-opacity">
                                                                                    {hasPermission('view_client_advance') && <button onClick={() => openViewModal(adv)} className="flex h-7 w-7 rounded-lg border border-blue-200 bg-blue-50 items-center justify-center text-blue-600 hover:text-white hover:bg-blue-500 hover:border-blue-500 transition-all shadow-sm"><i className="fa-regular fa-eye text-[11px]"></i></button>}
                                                                                    {hasPermission('return_advance') && adv.status !== 'settled' && parseFloat(adv.amount - adv.settled_amount - adv.returned_amount) > 0 && <button onClick={() => openReturnModal(adv)} className="flex h-7 w-7 rounded-lg border border-emerald-200 bg-emerald-50 items-center justify-center text-emerald-600 hover:text-white hover:bg-emerald-500 hover:border-emerald-500 transition-all shadow-sm" title="Refund"><i className="fa-solid fa-money-bill-transfer text-[11px]"></i></button>}
                                                                                    {hasPermission('edit_advance') && <button onClick={() => openEditModal(adv)} className="flex h-7 w-7 rounded-lg border border-amber-200 bg-amber-50 items-center justify-center text-amber-600 hover:text-white hover:bg-amber-500 hover:border-amber-500 transition-all shadow-sm"><i className="fa-regular fa-pen-to-square text-[11px]"></i></button>}
                                                                                    {hasPermission('delete_advance') && <button onClick={() => handleDelete(adv.id)} className="flex h-7 w-7 rounded-lg border border-rose-200 bg-rose-50 items-center justify-center text-rose-600 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-all shadow-sm"><i className="fa-regular fa-trash-can text-[11px]"></i></button>}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 shadow-sm"><i className="fa-solid fa-hand-holding-dollar text-2xl text-slate-400"></i></div>
                                                <p className="text-[16px] font-black text-slate-800">No advance records found.</p>
                                                <p className="text-[13px] font-medium mt-1 text-slate-400">Try adjusting your search filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {advances.links && advances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 no-print">
                            <div className="text-[13px] font-bold text-slate-500">Showing <strong className="text-slate-900 font-black">{advances.from || 0}</strong> to <strong className="text-slate-900 font-black">{advances.to || 0}</strong> of <strong className="text-slate-900 font-black">{advances.total || 0}</strong> entries</div>
                            <div className="flex flex-wrap justify-center items-center gap-1.5">
                                {advances.links.map((link, i) => (
                                    link.url === null ? <span key={i} className="flex min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    : <Link key={i} href={link.url} preserveState className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all shadow-sm ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 1. VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-3xl bg-white rounded-[1.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden border border-white/20 animate-[scaleIn_0.2s_ease-out]">
                        <div className="relative bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-5 sm:px-8 sm:py-6 flex justify-between items-center border-b border-indigo-900/50 shadow-sm gap-3">
                            <div>
                                <h3 className="text-[17px] sm:text-[20px] font-black text-white flex items-center gap-2"><i className="fa-solid fa-receipt text-indigo-400"></i> Advance Details</h3>
                                <p className="text-indigo-200/70 text-[10px] sm:text-[11px] font-bold mt-1 tracking-widest uppercase">Ref: #{String(selectedAdvance.id).padStart(5, '0')}</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="h-9 w-9 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all backdrop-blur-md border border-white/10 shadow-sm active:scale-[0.95]"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="p-5 sm:p-8 bg-slate-50/50 overflow-y-auto custom-table-scroll space-y-6">

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shadow-inner border border-indigo-100/50">{selectedAdvance.user?.name?.charAt(0)}</div>
                                    <div>
                                        <span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Employee Profile</span>
                                        <h2 className="text-[17px] sm:text-[19px] font-black text-slate-900 leading-none">{selectedAdvance.user?.name}</h2>
                                    </div>
                                </div>
                                <div className="sm:text-right">
                                    <span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Issue Date</span>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg text-[13px] font-bold text-slate-700 border border-slate-200">
                                        <i className="fa-regular fa-calendar text-slate-400"></i> {selectedAdvance.date}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <span className="block text-[12px] font-black uppercase text-slate-800 tracking-widest mb-4 pb-3 border-b border-slate-100"><i className="fa-solid fa-bullseye text-indigo-500 mr-1.5"></i> Purpose & Details</span>
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <span className="block text-[11px] font-black uppercase text-slate-500">Category:</span>
                                    <strong className="text-[13.5px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md self-start">{selectedAdvance.purpose || "Office Work"}</strong>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-black uppercase text-slate-500 mb-2">Extra Notes:</span>
                                    <div className="text-slate-700 text-[13px] sm:text-[14px] font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        {selectedAdvance.notes || <span className="italic text-slate-400">No additional details provided.</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5"><i className="fa-solid fa-building-columns mr-1"></i> Account</span><strong className="text-[14px] text-slate-800">{selectedAdvance.account?.name}</strong></div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Base Given</span><strong className="text-[16px] text-indigo-600"><Taka className="text-[13px] opacity-70" />{Number(selectedAdvance.amount).toLocaleString('en-IN')}</strong></div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Bank Charge</span><strong className="text-[16px] text-slate-600"><Taka className="text-[13px] opacity-70" />{Number(selectedAdvance.bank_charge || 0).toLocaleString('en-IN')}</strong></div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Current Due</span><strong className="text-[18px] text-rose-600 leading-none"><Taka className="text-[14px] opacity-70" />{Number(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 2. NEW/EDIT PREMIUM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-5xl bg-white rounded-[1.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh] overflow-hidden border border-white/20 animate-[scaleIn_0.2s_ease-out]">
                        <div className="flex items-start sm:items-center justify-between px-5 py-5 sm:px-8 sm:py-6 border-b border-slate-800 bg-slate-900 shrink-0 relative overflow-hidden gap-3">
                            <div className="absolute right-0 top-0 h-48 w-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none translate-x-10 -translate-y-10"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-2 border border-indigo-500/30 shadow-sm"><i className="fa-solid fa-hand-holding-dollar"></i> {editMode ? 'Update Record' : 'New Advance Entry'}</div>
                                <h3 className="text-[18px] sm:text-[24px] font-black text-white relative z-10">{editMode ? "Modify Advance Info" : "Log Advance Payment"}</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-9 w-9 sm:h-10 sm:w-10 bg-white/10 text-white rounded-full flex shrink-0 items-center justify-center hover:bg-rose-500 transition-colors z-10 backdrop-blur-md border border-white/10 active:scale-[0.95]"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
                            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden bg-slate-50">
                                <div className="flex-1 p-5 sm:p-7 lg:p-8 space-y-5 sm:space-y-6 lg:overflow-y-auto custom-table-scroll">
                                    {errors.error && <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 font-bold shadow-sm"><i className="fa-solid fa-triangle-exclamation"></i> {errors.error}</div>}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 bg-white p-5 sm:p-7 rounded-[1.25rem] border border-slate-200 shadow-sm relative z-[60]">
                                        <div className="relative z-[60]">
                                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5"><i className="fa-solid fa-user-tie text-indigo-500 mr-1.5"></i> Select Employee <span className="text-red-500">*</span></label>
                                            <SearchableSelect
                                                options={employees}
                                                value={data.user_id}
                                                onChange={(val) => setData("user_id", val)}
                                                placeholder="-- Click to search employee --"
                                                getLabel={(e) => e.name}
                                                getValue={(e) => e.id}
                                                error={errors.user_id}
                                                isClearable
                                            />
                                            {errors.user_id && <p className="text-red-500 text-[12px] mt-1.5 font-bold">{errors.user_id}</p>}
                                        </div>
                                        <div className="relative z-[50]">
                                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5"><i className="fa-solid fa-building-columns text-emerald-500 mr-1.5"></i> Pay From Account <span className="text-red-500">*</span></label>
                                            <SearchableSelect
                                                options={accounts}
                                                value={data.account_id}
                                                onChange={(val) => setData("account_id", val)}
                                                placeholder="-- Click to search account --"
                                                getLabel={(a) => `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})`}
                                                getValue={(a) => a.id}
                                                error={errors.account_id}
                                                isClearable
                                            />
                                            {errors.account_id && <p className="text-red-500 text-[12px] mt-1.5 font-bold">{errors.account_id}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 bg-white p-5 sm:p-7 rounded-[1.25rem] border border-slate-200 shadow-sm relative z-[40]">
                                        <div className="md:col-span-2 relative z-[40]">
                                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5">Purpose Category</label>
                                            <SearchableSelect
                                                options={[{ id: 'Office Work', name: 'Office Work' }, { id: 'Vehicle Maintenance', name: 'Vehicle Maintenance' }, { id: 'Staff Advance', name: 'Staff Advance' }, { id: 'Travel Expense', name: 'Travel Expense' }, { id: 'Utility Bill', name: 'Utility Bill' }, { id: 'Other', name: 'Other' }]}
                                                value={data.purpose}
                                                onChange={(val) => setData('purpose', val)}
                                                placeholder="-- Select Purpose --"
                                                getLabel={(o) => o.name}
                                                getValue={(o) => o.id}
                                                error={errors.purpose}
                                                isClearable
                                            />
                                        </div>
                                        <div><label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5">Issue Date <span className="text-red-500">*</span></label><input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className={inputClass} required /></div>
                                        <div className="md:col-span-2"><label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5">Extra Notes <span className="text-slate-400 font-bold normal-case">(Optional)</span></label><textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows="2" className="w-full rounded-[0.875rem] border border-slate-300 p-4 text-[14.5px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 shadow-sm transition-all resize-none" placeholder="Additional details..."></textarea></div>
                                    </div>
                                </div>

                                {/* PREMIUM RIGHT SIDEBAR (FINANCIAL SUMMARY) */}
                                <div className="w-full lg:w-[330px] xl:w-[370px] bg-slate-900 p-5 sm:p-6 lg:p-7 relative flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 text-white shrink-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.3)] z-10 lg:overflow-y-auto custom-table-scroll">
                                    <span className="absolute -right-4 -top-8 text-[140px] sm:text-[160px] font-mono text-white/[0.03] pointer-events-none select-none">৳</span>
                                    
                                    <div className="relative z-10">
                                        <h4 className="text-[11.5px] font-black text-slate-400 uppercase tracking-widest mb-5 border-b border-slate-800 pb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><i className="fa-solid fa-calculator text-indigo-400"></i> Financial Summary</span>
                                            <span className="text-[10px] text-slate-500 font-mono tracking-normal">ADVANCE</span>
                                        </h4>

                                        <div className="space-y-4 sm:space-y-5">
                                            <div>
                                                <label className="block text-[12px] sm:text-[12.5px] font-bold text-slate-300 mb-2">Advance Amount <span className="text-rose-500">*</span></label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-[16px] sm:text-[18px]" />
                                                    <input 
                                                        type="number" 
                                                        step="any" 
                                                        value={data.amount} 
                                                        onChange={e => setData('amount', e.target.value)} 
                                                        className="w-full rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-emerald-950/20 pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 text-[16px] sm:text-[18px] font-black tabular-nums text-emerald-400 outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all shadow-inner" 
                                                        placeholder="0.00" 
                                                        required 
                                                    />
                                                </div>
                                                {errors.amount && <p className="text-red-500 text-[11.5px] mt-1.5 font-bold">{errors.amount}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-[12px] sm:text-[12.5px] font-bold text-slate-300 mb-2">Bank Charge <span className="text-[10.5px] font-medium text-slate-500">(extra)</span></label>
                                                <div className="relative">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] sm:text-[16px]" />
                                                    <input 
                                                        type="number" 
                                                        step="any" 
                                                        value={data.bank_charge} 
                                                        onChange={e => setData('bank_charge', e.target.value)} 
                                                        className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/50 pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-[15px] sm:text-[16px] font-black tabular-nums text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-inner" 
                                                        placeholder="0.00" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* TOTAL OFFICE CUT CARD */}
                                        <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/20 p-4 sm:p-5 mt-5 shadow-inner">
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="text-[11px] sm:text-[12px] text-indigo-300 font-black uppercase tracking-wider">Total Office Cut</span>
                                                <span className="text-[9.5px] font-bold text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Final Amount</span>
                                            </div>
                                            <div className="text-[22px] sm:text-[25px] xl:text-[28px] font-black text-indigo-400 tabular-nums leading-tight tracking-tight break-words flex items-baseline">
                                                <Taka className="text-[15px] sm:text-[17px] mr-1 opacity-70 shrink-0" />
                                                <span className="break-all">{Number((parseFloat(data.amount||0) + parseFloat(data.bank_charge||0))).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BUTTONS */}
                                    <div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:gap-3 shrink-0 relative z-10">
                                        <button 
                                            type="submit" 
                                            disabled={processing} 
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[14px] sm:text-[14.5px] font-black transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            {processing ? (
                                                <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                                            ) : (
                                                <><i className="fa-solid fa-check text-base"></i> {editMode ? "Confirm Update" : "Save Advance"}</>
                                            )}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowModal(false)} 
                                            className="w-full text-slate-400 hover:text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[13.5px] sm:text-[14px] font-bold border border-slate-700 hover:bg-slate-800 transition-colors active:scale-[0.98]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 3. CASH RETURN PREMIUM MODAL --- */}
            {showReturnModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-xl bg-white rounded-[1.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-white/20">
                        <div className="flex items-start sm:items-center justify-between px-5 py-5 sm:px-8 sm:py-6 border-b border-slate-800 bg-slate-900 shrink-0 relative overflow-hidden gap-3">
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none translate-x-5 -translate-y-5"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest mb-2 shadow-sm"><i className="fa-solid fa-money-bill-transfer"></i> Receive Money</div>
                                <h3 className="text-[18px] sm:text-[24px] font-black text-white relative z-10">Refund Advance Cash</h3>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500 transition-colors shadow-sm relative z-10 backdrop-blur-md border border-white/10 active:scale-[0.95]"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-5 sm:p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">
                                {returnErrors.error && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm"><i className="fa-solid fa-triangle-exclamation"></i> {returnErrors.error}</div>}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm gap-4">
                                    <div><span className="block text-[10.5px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Employee</span><strong className="text-slate-900 text-[19px] font-black leading-none">{selectedAdvance.user?.name}</strong></div>
                                    <div className="sm:text-right"><span className="block text-[10.5px] font-black uppercase text-rose-500 tracking-widest mb-1.5">Base Due</span><strong className="text-rose-600 text-[24px] font-black tabular-nums leading-none"><Taka className="text-[16px] mr-0.5 opacity-80" />{parseFloat(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</strong></div>
                                </div>

                                <div className="bg-white p-5 sm:p-7 rounded-[1.25rem] border border-slate-200 shadow-sm space-y-6 relative z-[60]">
                                    <div className="relative z-[60]">
                                        <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2.5">Deposit To Account <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={accounts}
                                            value={returnData.return_account_id}
                                            onChange={(val) => setReturnData("return_account_id", val)}
                                            placeholder="-- Click to search account --"
                                            getLabel={(a) => `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})`}
                                            getValue={(a) => a.id}
                                            error={returnErrors.return_account_id}
                                            isClearable
                                        />
                                        {returnErrors.return_account_id && <p className="text-red-500 text-[11.5px] mt-1.5 font-bold">{returnErrors.return_account_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11.5px] font-black text-emerald-600 uppercase tracking-widest mb-2.5">Refund Amount (৳) <span className="text-red-500">*</span></label>
                                        <div className="relative"><Taka className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 text-[18px]" /><input type="number" step="any" max={selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount} value={returnData.return_amount} onChange={e => setReturnData('return_amount', e.target.value)} className="w-full rounded-[0.875rem] border border-emerald-400 bg-emerald-50/50 pl-11 pr-5 py-4 text-[20px] font-black text-emerald-800 outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 shadow-inner tabular-nums transition-all" placeholder="0.00" required autoFocus /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 sm:px-8 py-5 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]">Cancel</button>
                                <button type="submit" disabled={returnProcessing} className="w-full sm:w-auto justify-center rounded-xl bg-emerald-600 px-8 py-2.5 text-[14px] font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 disabled:opacity-70 transition-all flex items-center gap-2 active:scale-[0.98]">
                                    {returnProcessing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> Confirm Refund</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
