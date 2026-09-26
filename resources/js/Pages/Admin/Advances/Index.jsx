import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

// 🟢 Custom Straight Taka Component
const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

// 🟢 Deeper Contrast Select Styles
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '48px', borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8', // slate-400 for Deep borders
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }
    }),
    option: (base, state) => ({
        ...base, backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#0F172A', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#0F172A', fontWeight: 700, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 99999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
};

const inputClass = "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";

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

    // Filter States
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [userFilter, setUserFilter] = useState(filters.user_id ? Number(filters.user_id) : '');
    const [accountFilter, setAccountFilter] = useState(filters.account_id ? Number(filters.account_id) : '');
    const [perPage, setPerPage] = useState(String(filters.per_page || '50'));

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', user_id: '', amount: '', date: new Date().toISOString().slice(0, 10), purpose: 'Office Purpose', status: 'unsettled', notes: ''
    });

    const { data: returnData, setData: setReturnData, post: postReturn, processing: returnProcessing, reset: returnReset, errors: returnErrors, clearErrors: clearReturnErrors } = useForm({
        return_amount: '', return_account_id: ''
    });

    // Deep Search & Filter Trigger
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => {
            setExpandedRows({}); // Clear expansions on search
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (userFilter) params.user_id = userFilter;
            if (accountFilter) params.account_id = accountFilter;
            if (perPage) params.per_page = perPage;

            router.get(route('admin.advances.index'), params, { preserveState: true, replace: true, preserveScroll: true });
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, userFilter, accountFilter, perPage]);

    const clearAllFilters = () => {
        setSearchTerm("");
        setUserFilter("");
        setAccountFilter("");
        setPerPage("50");
    };

    const groupedAdvances = useMemo(() => {
        const map = new Map();
        advanceList.forEach((adv) => {
            const key = adv.user_id;
            if (!map.has(key)) {
                map.set(key, { user_id: adv.user_id, user: adv.user, records: [], total_given: 0, total_expensed: 0, total_returned: 0 });
            }
            const group = map.get(key);
            group.records.push(adv);
            group.total_given += parseFloat(adv.amount || 0);
            group.total_expensed += parseFloat(adv.settled_amount || 0);
            group.total_returned += parseFloat(adv.returned_amount || 0);
        });
        return Array.from(map.values()).map((group) => ({
            ...group, total_due: group.total_given - group.total_expensed - group.total_returned,
        }));
    }, [advanceList]);

    const toggleExpand = (userId) => setExpandedRows((prev) => ({ ...prev, [userId]: !prev[userId] }));

    const formatTime = (dateTimeStr) => {
        if (!dateTimeStr) return '';
        const d = new Date(dateTimeStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleCopy = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = advanceList.map((adv, idx) => `${idx + 1}\t${adv.date}\t${adv.account?.name || 'N/A'}\t${adv.user?.name}\t${adv.purpose}\t${adv.status}\tBDT ${parseFloat(adv.amount).toFixed(2)}`).join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Date,Account,Given To,Purpose,Total Given,Expensed,Returned,Due,Status\n"];
        const rows = advanceList.map((adv, idx) => {
            const expensed = parseFloat(adv.settled_amount || 0);
            const returned = parseFloat(adv.returned_amount || 0);
            const total = parseFloat(adv.amount || 0);
            return `"${idx + 1}","${adv.date}","${adv.account?.name || 'N/A'}","${adv.user?.name}","${adv.purpose}","${total}","${expensed}","${returned}","${total - expensed - returned}","${adv.status}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Advance_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-advance-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Advance Payments Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .actions-col, .expand-btn-col { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Advance Payments Directory</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', account_id: '', user_id: '', amount: '', settled_amount: 0, returned_amount: 0, date: new Date().toISOString().slice(0, 10), purpose: 'Office Purpose', status: 'unsettled', notes: '' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors();
        setData({ id: adv.id, account_id: adv.account_id || '', user_id: adv.user_id || '', amount: adv.amount, date: adv.date, purpose: adv.purpose || 'Office Purpose', status: adv.status || 'unsettled', notes: adv.notes || '' });
        setEditMode(true);
        setShowModal(true);
    };

    const openReturnModal = (adv) => {
        setSelectedAdvance(adv); returnReset(); clearReturnErrors();
        const totalSettled = parseFloat(adv.settled_amount || 0) + parseFloat(adv.returned_amount || 0);
        const due = parseFloat(adv.amount) - totalSettled;
        setReturnData({ return_amount: due > 0 ? due : '', return_account_id: adv.account_id || '' });
        setShowReturnModal(true);
    };

    const openViewModal = (adv) => { setSelectedAdvance(adv); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.user_id) return Swal.fire("Required", "Please select an employee.", "warning");
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        if (editMode) {
            put(route('admin.advances.update', data.id), {
                preserveScroll: true,
                onSuccess: () => { setShowModal(false); Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }); }
            });
        } else {
            post(route('admin.advances.store'), {
                preserveScroll: true,
                onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: 'success', title: 'Logged!', timer: 1500, showConfirmButton: false }); }
            });
        }
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        if (!returnData.return_account_id) return Swal.fire("Required", "Select return account.", "warning");
        postReturn(route('admin.advances.returnMoney', selectedAdvance.id), {
            preserveScroll: true,
            onSuccess: () => { setShowReturnModal(false); Swal.fire({ icon: 'success', title: 'Refunded!', timer: 2000, showConfirmButton: false }); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this transaction?', text: `Remaining money will be refunded to the account!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748B', confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true, onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-advance-table, #printable-advance-table * { visibility: visible; }
                    #printable-advance-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                @media (max-width: 1024px) { .modal-scroll-container { overflow-y: auto !important; max-height: calc(95vh - 140px); } }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 px-4 sm:px-6 lg:px-8 mt-4">

                {/* 🟢 PREMIUM OUTSTANDING ADVANCES CAROUSEL */}
                {employeeBalances && employeeBalances.length > 0 && (
                    <div className="w-full bg-slate-900 rounded-3xl border border-slate-700 shadow-xl p-5 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <i className="fa-solid fa-hand-holding-dollar text-9xl text-white"></i>
                        </div>
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl pointer-events-none"></div>

                        <div className="flex items-center gap-3 mb-4 sm:mb-5 relative z-10">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
                                <i className="fa-solid fa-sack-dollar text-[15px]"></i>
                            </div>
                            <h3 className="text-[16px] sm:text-[18px] font-black text-white tracking-tight uppercase">Outstanding Advances <span className="text-slate-400 text-[12px] normal-case tracking-normal ml-1 font-bold">(To be Collected/Adjusted)</span></h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-table-scroll relative z-10 snap-x">
                            {employeeBalances.map(emp => (
                                <div key={emp.user_id} className="snap-start shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col min-w-[200px] shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20">
                                    <span className="text-[13px] font-bold text-slate-300 truncate mb-1.5 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] text-white"><i className="fa-solid fa-user"></i></div>
                                        {emp.name || 'Unknown'}
                                    </span>
                                    <span className="text-[20px] font-black text-rose-400 tabular-nums">
                                        <Taka className="text-[14px]" />{Number(emp.total_due).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-money-bill-transfer"></i> Financial Management
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Advance Payments</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Manage and track advance payments given to employees, track settlements, and handle refunds.</p>
                    </div>
                </div>

                {/* 🟢 PREMIUM SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 px-6 py-6 shadow-md border border-indigo-500 text-white min-w-[220px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100">
                                <i className="fa-solid fa-money-bill-transfer text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-indigo-200">Total Given</p>
                                <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[16px] text-indigo-200 mr-1" />{Number(totals.total_given || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 shadow-md border border-emerald-500 text-white min-w-[220px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-100">
                                <i className="fa-solid fa-file-invoice-dollar text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-emerald-200">Total Expensed</p>
                                <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[16px] text-emerald-200 mr-1" />{Number(totals.total_expensed || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-6 shadow-md border border-violet-500 text-white min-w-[220px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-violet-100">
                                <i className="fa-solid fa-hand-holding-dollar text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-violet-200">Total Returned</p>
                                <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[16px] text-violet-200 mr-1" />{Number(totals.total_returned || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-6 shadow-md border border-rose-400 text-white min-w-[220px] group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-rose-100">
                                <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                            </div>
                            <div>
                                <p className="text-[11.5px] font-bold uppercase tracking-widest text-rose-200">Total Due Amount</p>
                                <h3 className="text-[26px] font-black tracking-tight mt-0.5 tabular-nums flex items-center">
                                    <Taka className="text-[16px] text-rose-200 mr-1" />{Number(totals.total_due || 0).toLocaleString('en-IN')}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 MAIN DATA CARD */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden flex flex-col">

                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-sm">
                                <i className="fa-solid fa-list-check text-[15px]"></i>
                            </div>
                            Advance History Directory
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fas fa-file-csv"></i> CSV
                            </button>
                            {hasPermission('create_advance') && (
                                <button onClick={openCreateModal} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md hover:-translate-y-0.5 ml-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Log Advance
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-6 py-5 bg-white border-b border-slate-200">

                        <div className="relative w-full">
                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Search</label>
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-[38px] text-slate-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search here..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-[13.5px] font-bold text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm bg-white"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute bottom-3.5 right-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors">
                                    <i className="fa-solid fa-circle-xmark text-[14px]"></i>
                                </button>
                            )}
                        </div>

                        <div className="w-full relative z-30">
                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Employee</label>
                            <Select
                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                value={employees.map((e) => ({ value: e.id, label: e.name })).find(opt => opt.value === userFilter) || null}
                                onChange={(selected) => setUserFilter(selected ? selected.value : '')}
                                placeholder="All Employees"
                                isClearable
                                styles={selectStyles}
                            />
                        </div>

                        <div className="w-full relative z-20">
                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Account</label>
                            <Select
                                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                                value={accounts.map((a) => ({ value: a.id, label: a.name })).find(opt => opt.value === accountFilter) || null}
                                onChange={(selected) => setAccountFilter(selected ? selected.value : '')}
                                placeholder="All Accounts"
                                isClearable
                                styles={selectStyles}
                            />
                        </div>

                        <div className="w-full">
                            <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Show Rows</label>
                            <div className="relative w-full">
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-[13.5px] font-bold text-slate-900 outline-none cursor-pointer focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="10">10 Rows</option>
                                    <option value="25">25 Rows</option>
                                    <option value="50">50 Rows</option>
                                    <option value="100">100 Rows</option>
                                    <option value="all">All Data</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                    <i className="fa-solid fa-chevron-down text-[12px]"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <div>
                            {(searchTerm || userFilter || accountFilter) && (
                                <button onClick={clearAllFilters} className="text-[12.5px] font-bold text-rose-600 hover:text-rose-700 bg-rose-100/50 border border-rose-200 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors">
                                    <i className="fa-solid fa-rotate-left"></i> Reset Filters
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 shadow-sm">
                                <i className="fa-regular fa-copy text-blue-500"></i> <span className="hidden sm:inline">Copy</span>
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                <i className="fa-solid fa-file-csv"></i> <span className="hidden sm:inline">CSV</span>
                            </button>
                            <button onClick={handlePrint} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-100 shadow-sm">
                                <i className="fa-solid fa-print text-slate-500"></i> <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-3">
                        <table id="printable-advance-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-100 text-[11.5px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-300 sticky top-0 z-0">
                                <tr>
                                    <th className="px-6 py-4.5 w-12 expand-btn-col text-center"></th>
                                    <th className="px-6 py-4.5">Date</th>
                                    <th className="px-6 py-4.5">Account</th>
                                    <th className="px-6 py-4.5">Employee Profile</th>
                                    <th className="px-6 py-4.5 text-right bg-indigo-50/50 border-l border-slate-200">Given</th>
                                    <th className="px-6 py-4.5 text-right bg-emerald-50/50 border-x border-slate-200">Expensed</th>
                                    <th className="px-6 py-4.5 text-right bg-blue-50/50">Returned</th>
                                    <th className="px-6 py-4.5 text-right bg-rose-50/50 border-x border-slate-200">Due</th>
                                    <th className="px-6 py-4.5 text-center">Status</th>
                                    <th className="px-6 py-4.5 text-center actions-col w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {groupedAdvances.length > 0 ? (
                                    groupedAdvances.map((group) => {
                                        const isExpanded = !!expandedRows[group.user_id];
                                        const hasMultiple = group.records.length > 1;
                                        const single = group.records[0];

                                        return (
                                            <React.Fragment key={group.user_id}>
                                                <tr className={`transition-colors group ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'}`}>
                                                    <td className="px-6 py-4 text-center expand-btn-col">
                                                        {hasMultiple && (
                                                            <button
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm"
                                                            >
                                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[11px]`}></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-600">
                                                        {hasMultiple ? (
                                                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border border-indigo-200 shadow-sm">{group.records.length} entries</span>
                                                        ) : (
                                                            <>
                                                                <div className="font-extrabold text-slate-800">{single.date}</div>
                                                                {single.created_at && (
                                                                    <div className="text-[11.5px] text-slate-400 mt-1 font-bold">
                                                                        {formatTime(single.created_at)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-slate-700">
                                                        {hasMultiple ? <span className="text-slate-400 italic font-medium text-[12.5px]">Multiple Accounts</span> : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-black text-slate-700 shadow-sm">
                                                                <i className="fa-solid fa-building-columns text-indigo-500"></i> {single.account?.name || 'N/A'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[13px] font-black uppercase shadow-sm">
                                                                {(group.user?.name || '?').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <Link href={route('admin.advances.employeeLedger', group.user_id)} className="font-black text-slate-900 hover:text-indigo-600 transition-colors text-[14.5px]">
                                                                    {group.user?.name}
                                                                </Link>
                                                                {!hasMultiple && single.purpose && <div className="text-[12px] font-bold text-slate-500 mt-1 truncate max-w-[200px]" title={single.purpose}><i className="fa-solid fa-bullseye text-[10px] mr-1.5 text-slate-400"></i>{single.purpose}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-indigo-700 tabular-nums bg-indigo-50/20 border-l border-slate-100 text-[15px]">
                                                        <Taka className="text-[13px] mr-1 opacity-70"/>{group.total_given.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-emerald-600 tabular-nums bg-emerald-50/20 border-x border-slate-100 text-[14.5px]">
                                                        {group.total_expensed > 0 ? <><Taka className="text-[12px] mr-1 opacity-70"/>{group.total_expensed.toLocaleString('en-IN')}</> : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums bg-blue-50/20 text-[14.5px]">
                                                        {group.total_returned > 0 ? <><Taka className="text-[12px] mr-1 opacity-70"/>{group.total_returned.toLocaleString('en-IN')}</> : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-rose-600 text-[15px] tabular-nums bg-rose-50/20 border-x border-slate-100">
                                                        {group.total_due > 0 ? <><Taka className="text-[13px] mr-1 opacity-80"/>{group.total_due.toLocaleString('en-IN')}</> : <span className="text-slate-300 font-bold">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${group.total_due > 0 ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                                                            {group.total_due > 0 ? 'unsettled' : 'settled'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center actions-col no-print">
                                                        {hasMultiple ? (
                                                            <button
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                className="rounded-xl bg-white border border-slate-300 px-4 py-2 text-[12px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm"
                                                            >
                                                                {isExpanded ? 'Hide' : 'View'} ({group.records.length})
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                {hasPermission('view_client_advance') && (
                                                                    <button onClick={() => openViewModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm" title="View">
                                                                        <i className="fa-regular fa-eye text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('return_advance') && single.status !== 'settled' && group.total_due > 0 && (
                                                                    <button onClick={() => openReturnModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors shadow-sm" title="Refund Cash">
                                                                        <i className="fa-solid fa-money-bill-transfer text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('edit_advance') && (
                                                                    <button onClick={() => openEditModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors shadow-sm" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('delete_advance') && (
                                                                    <button onClick={() => handleDelete(single.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-sm" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Transactions Row */}
                                                {isExpanded && hasMultiple && (
                                                    <tr>
                                                        <td colSpan="10" className="px-6 py-8 bg-slate-100 border-b border-slate-300 shadow-inner">
                                                            <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-md">
                                                                <table className="w-full border-collapse">
                                                                    <thead className="bg-slate-50 text-[10.5px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                                                                        <tr>
                                                                            <th className="px-5 py-4 w-4 border-r border-slate-200"></th>
                                                                            <th className="px-5 py-4">Date</th>
                                                                            <th className="px-5 py-4">Account</th>
                                                                            <th className="px-5 py-4 w-[25%]">Purpose & Notes</th>
                                                                            <th className="px-5 py-4 text-right bg-indigo-50/50">Given</th>
                                                                            <th className="px-5 py-4 text-right bg-emerald-50/50 border-l border-slate-200">Expensed</th>
                                                                            <th className="px-5 py-4 text-right bg-blue-50/50">Returned</th>
                                                                            <th className="px-5 py-4 text-right bg-rose-50/50 border-x border-slate-200">Due</th>
                                                                            <th className="px-5 py-4 text-center">Status</th>
                                                                            <th className="px-5 py-4 text-center actions-col no-print">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[13px] text-slate-800 divide-y divide-slate-100">
                                                                        {group.records.map((adv) => {
                                                                            const expensed = parseFloat(adv.settled_amount || 0);
                                                                            const returned = parseFloat(adv.returned_amount || 0);
                                                                            const totalGiven = parseFloat(adv.amount || 0);
                                                                            const due = totalGiven - expensed - returned;

                                                                            return (
                                                                                <tr key={adv.id} className="hover:bg-slate-50 transition-colors group/sub">
                                                                                    <td className="px-5 py-4 border-r border-slate-100 bg-slate-50/50"></td>
                                                                                    <td className="px-5 py-4 font-bold text-slate-600 whitespace-nowrap">
                                                                                        <div>{adv.date}</div>
                                                                                    </td>
                                                                                    <td className="px-5 py-4 font-black text-slate-700 whitespace-nowrap">
                                                                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-black text-slate-700 shadow-sm">
                                                                                            <i className="fa-solid fa-building-columns text-indigo-500"></i> {adv.account?.name || 'N/A'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-5 py-4">
                                                                                        <div className="font-extrabold text-slate-900 truncate max-w-[200px]" title={adv.purpose}>{adv.purpose || '-'}</div>
                                                                                        {adv.notes && <div className="text-[11.5px] text-slate-500 font-bold mt-1 truncate max-w-[200px] italic" title={adv.notes}>{adv.notes}</div>}
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-right font-black text-indigo-700 tabular-nums bg-indigo-50/20">
                                                                                        <Taka className="text-[12px] mr-0.5 opacity-70"/>{totalGiven.toLocaleString('en-IN')}
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-right font-bold text-emerald-600 tabular-nums bg-emerald-50/20 border-l border-slate-100">
                                                                                        {expensed > 0 ? <><Taka className="text-[11px] mr-0.5 opacity-70"/>{expensed.toLocaleString('en-IN')}</> : <span className="text-slate-300">-</span>}
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-right font-bold text-blue-600 tabular-nums bg-blue-50/20">
                                                                                        {returned > 0 ? <><Taka className="text-[11px] mr-0.5 opacity-70"/>{returned.toLocaleString('en-IN')}</> : <span className="text-slate-300">-</span>}
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-right font-black text-rose-600 tabular-nums bg-rose-50/20 border-x border-slate-100">
                                                                                        {due > 0 ? <><Taka className="text-[12px] mr-0.5 opacity-80"/>{due.toLocaleString('en-IN')}</> : '0'}
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-center">
                                                                                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[9.5px] font-black uppercase tracking-widest border shadow-sm ${adv.status === 'settled' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                                                                            {adv.status}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-5 py-4 text-right actions-col no-print">
                                                                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/sub:opacity-100 transition-opacity duration-200">
                                                                                            {hasPermission('view_client_advance') && (
                                                                                                <button onClick={() => openViewModal(adv)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm" title="View">
                                                                                                    <i className="fa-regular fa-eye text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('return_advance') && adv.status !== 'settled' && due > 0 && (
                                                                                                <button onClick={() => openReturnModal(adv)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm" title="Refund Cash">
                                                                                                    <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('edit_advance') && (
                                                                                                <button onClick={() => openEditModal(adv)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors shadow-sm" title="Edit">
                                                                                                    <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('delete_advance') && (
                                                                                                <button onClick={() => handleDelete(adv.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-sm" title="Delete">
                                                                                                    <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm text-slate-300">
                                                    <i className="fa-solid fa-hand-holding-dollar text-2xl"></i>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800">No advance records found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your filters or log a new advance.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {advances.links && advances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 no-print">
                            <div className="text-[13.5px] font-bold text-slate-600">
                                Showing <strong className="text-slate-900 font-black">{advances.from || 0}</strong> to <strong className="text-slate-900 font-black">{advances.to || 0}</strong> of <strong className="text-slate-900 font-black">{advances.total || 0}</strong> entries
                            </div>
                            <div className="flex flex-wrap justify-center items-center gap-1.5">
                                {advances.links.map((link, i) => (
                                    link.url === null ? (
                                        <span key={i} className="flex min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    ) : (
                                        <Link key={i} href={link.url} preserveState className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-black transition-all ${link.active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "«").replace("&raquo;", "»") }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 🟢 1. VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-gray-50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col relative my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="absolute top-6 left-0 z-20 hidden sm:block">
                            <span className={`inline-flex items-center px-4 py-2 rounded-r-xl text-[11px] font-black uppercase tracking-widest shadow-lg ${selectedAdvance.status === 'settled' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {selectedAdvance.status}
                            </span>
                        </div>

                        <div className="relative bg-slate-900 px-8 py-8 shrink-0 overflow-hidden border-b border-slate-700 sm:pl-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <span className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 opacity-50 translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></span>

                            <div className="sm:hidden mb-2 relative z-10">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border border-white/20 ${selectedAdvance.status === 'settled' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {selectedAdvance.status}
                                </span>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-[22px] sm:text-[26px] font-black text-white tracking-tight leading-tight">Advance Payment Details</h3>
                                <p className="text-[13px] sm:text-[14px] text-slate-400 font-bold mt-1">Reference: #{String(selectedAdvance.id).padStart(5, '0')}</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="absolute top-6 right-6 sm:static flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500 transition-colors shadow-sm border border-white/10 z-20">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 bg-slate-50 overflow-y-auto custom-table-scroll">
                            <div className="flex-1 space-y-5 sm:space-y-6">
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-md flex items-center gap-4">
                                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 text-2xl sm:text-3xl font-black border border-indigo-200 uppercase shadow-inner shrink-0">
                                        {selectedAdvance.user?.name ? selectedAdvance.user.name.charAt(0) : 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <span className="block text-[11px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1">Employee / Issued To</span>
                                        <h2 className="text-[18px] sm:text-[22px] font-black text-slate-900 m-0 truncate">{selectedAdvance.user?.name || "N/A"}</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md">
                                        <span className="block text-[11px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-solid fa-building-columns mr-1 text-slate-300"></i> Payment Account</span>
                                        <div className="font-black text-slate-900 text-[14px] sm:text-[15px] truncate">
                                            {selectedAdvance.account?.name || "N/A"}
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md">
                                        <span className="block text-[11px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-regular fa-calendar-days mr-1 text-slate-300"></i> Given Date</span>
                                        <div className="font-black text-slate-900 text-[14px] sm:text-[15px]">
                                            {selectedAdvance.date || "-"}
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md sm:col-span-2">
                                        <span className="block text-[11px] sm:text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5"><i className="fa-solid fa-bullseye mr-1 text-slate-300"></i> Purpose</span>
                                        <div className="font-black text-slate-900 text-[14px] sm:text-[15px] break-words">
                                            {selectedAdvance.purpose || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <span className="block text-[12px] sm:text-[13px] font-black uppercase tracking-widest text-slate-800 mb-3 pb-2 border-b border-slate-200"><i className="fa-solid fa-align-left text-slate-400 mr-2"></i> Notes & Details</span>
                                    <div className="text-slate-700 text-[14px] sm:text-[15px] font-bold leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        {selectedAdvance.notes || <span className="italic text-slate-400 font-medium">No additional note provided.</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-[320px] lg:w-[340px] shrink-0 bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-slate-700">
                                <span className="absolute -right-4 -top-10 text-[160px] leading-none font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                                <div className="relative z-10">
                                    <h4 className="text-[12px] sm:text-[13px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-700 pb-3"><i className="fa-solid fa-chart-pie mr-1.5 text-slate-500"></i> Financial Status</h4>
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-end"><span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-300">Total Given</span><span className="text-[18px] sm:text-[20px] font-black text-white tabular-nums">৳ {Number(selectedAdvance.amount).toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between items-end"><span className="text-[13.5px] sm:text-[14.5px] font-bold text-emerald-400">Expensed / Adjusted</span><span className="text-[18px] sm:text-[20px] font-black text-emerald-400 tabular-nums">৳ {Number(selectedAdvance.settled_amount).toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between items-end"><span className="text-[13.5px] sm:text-[14.5px] font-bold text-blue-400">Cash Returned</span><span className="text-[18px] sm:text-[20px] font-black text-blue-400 tabular-nums">৳ {Number(selectedAdvance.returned_amount).toLocaleString('en-IN')}</span></div>
                                    </div>
                                </div>
                                <div className="pt-6 sm:pt-8 border-t border-slate-800 mt-6 sm:mt-8 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[13px] sm:text-[14px] text-rose-400 font-black uppercase tracking-widest">Currently Due</span>
                                        <span className="text-[26px] sm:text-[30px] font-black text-rose-500 tabular-nums tracking-tight">৳ {Number(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 🟢 2. CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-2 shadow-sm border border-white/10">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] sm:text-[24px] font-black text-white tracking-tight relative z-10">
                                    {editMode ? "Modify Advance Info" : "Log New Advance Payment"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-red-500 transition-colors border border-white/10 shadow-sm relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
                            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto custom-table-scroll bg-slate-50">

                                <div className="flex-1 p-6 sm:p-8 space-y-6">
                                    {errors.error && (
                                        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm">
                                            <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg"></i> {errors.error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                        <div className="relative z-[60] md:col-span-2">
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2"><i className="fa-solid fa-building-columns mr-1.5 text-indigo-500"></i> Select Account <span className="text-red-600">*</span></label>
                                            <Select
                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                placeholder="Search Account..."
                                                isDisabled={editMode}
                                                isSearchable isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                            {errors.account_id && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.account_id}</p>}
                                        </div>

                                        <div className="relative z-[50]">
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2"><i className="fa-solid fa-user-tie mr-1.5 text-indigo-500"></i> Employee <span className="text-red-600">*</span></label>
                                            <Select
                                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                                value={employees.map((e) => ({ value: e.id, label: e.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                                onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                                placeholder="Search Employee..."
                                                isSearchable isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                            {errors.user_id && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.user_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-black text-emerald-700 uppercase tracking-widest mb-2">Amount (৳) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 text-[18px]" />
                                                <input type="number" step="any" value={data.amount} onChange={e => setData('amount', e.target.value)} className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-10 pr-4 py-3 text-[16px] font-black text-emerald-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-sm transition-all tabular-nums" placeholder="0.00" required />
                                            </div>
                                            {errors.amount && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.amount}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                        <div className="relative z-[40] md:col-span-2">
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Purpose</label>
                                            <Select
                                                options={[
                                                    { value: 'Office Work', label: 'Office Work' },
                                                    { value: 'Vehicle Maintenance', label: 'Vehicle Maintenance' },
                                                    { value: 'Staff Advance', label: 'Staff Advance' },
                                                    { value: 'Travel Expense', label: 'Travel Expense' },
                                                    { value: 'Utility Bill', label: 'Utility Bill' },
                                                    { value: 'Other', label: 'Other' },
                                                ]}
                                                value={data.purpose ? { value: data.purpose, label: data.purpose } : null}
                                                onChange={(selected) => setData('purpose', selected ? selected.value : '')}
                                                placeholder="Select Purpose..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                            {errors.purpose && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.purpose}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Date <span className="text-red-600">*</span></label>
                                            <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className={`${inputClass} cursor-pointer`} required />
                                            {errors.date && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.date}</p>}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Notes / Description <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                            <textarea
                                                value={data.notes}
                                                onChange={e => setData('notes', e.target.value)}
                                                rows="2"
                                                className="w-full rounded-xl border border-slate-400 bg-white p-4 text-[14px] font-bold text-slate-900 outline-none resize-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all min-h-[90px]"
                                                placeholder="Optional additional details..."
                                            ></textarea>
                                            {errors.notes && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{errors.notes}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 transition-colors hover:bg-slate-50 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-10 py-3.5 text-[14px] font-bold text-white transition-all shadow-md hover:bg-indigo-700 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> {editMode ? "Update" : "Save Advance"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 3. CASH RETURN MODAL --- */}
            {showReturnModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest mb-2 shadow-sm">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> Settle Payment
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">Refund Cash</h3>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-red-500 transition-colors shadow-sm border border-white/10 relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleReturnSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">
                                {returnErrors.error && (
                                    <div className="mb-2 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg"></i> {returnErrors.error}
                                    </div>
                                )}

                                <div className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white p-6 shadow-md">
                                    <div>
                                        <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1"><i className="fa-solid fa-user-tie mr-1 text-slate-300"></i> Employee</span>
                                        <strong className="text-slate-900 text-[18px] font-black">{selectedAdvance.user?.name}</strong>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11.5px] font-black uppercase tracking-widest text-rose-500 mb-1">Base Due</span>
                                        <strong className="text-rose-600 text-[24px] font-black tabular-nums leading-none"><Taka className="text-[16px] mr-0.5 opacity-80" />{parseFloat(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</strong>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md space-y-6">
                                    <div className="relative z-[60]">
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Return To Account <span className="text-red-600">*</span></label>
                                        <Select
                                            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                            value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(returnData.return_account_id)) || null}
                                            onChange={(selected) => setReturnData("return_account_id", selected ? selected.value : "")}
                                            placeholder="-- Select Cash/Bank Box --"
                                            isSearchable isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            menuPosition="fixed"
                                        />
                                        {returnErrors.return_account_id && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{returnErrors.return_account_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-black text-emerald-700 uppercase tracking-widest mb-2">Refund Amount (৳) <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 text-[18px]" />
                                            <input
                                                type="number" step="any" max={selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount}
                                                value={returnData.return_amount} onChange={e => setReturnData('return_amount', e.target.value)}
                                                className="w-full rounded-xl border border-emerald-400 bg-emerald-50/50 pl-10 pr-4 py-3.5 text-[18px] font-black text-emerald-800 outline-none transition-all focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-sm tabular-nums"
                                                placeholder="0.00" required autoFocus
                                            />
                                        </div>
                                        {returnErrors.return_amount && <p className="text-red-600 text-[12px] mt-1.5 font-bold">{returnErrors.return_amount}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                                <button type="submit" disabled={returnProcessing} className="rounded-xl bg-emerald-600 px-10 py-3.5 text-[14px] font-bold text-white hover:bg-emerald-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">
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
