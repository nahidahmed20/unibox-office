import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

const StatCard = ({ label, value, icon, gradient, textColor, iconColor, ringColor }) => (
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

export default function Index({ transactions = { data: [], links: [] }, accounts = [], totalCredit = 0, totalDebit = 0, netBalance = 0, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [perPage, setPerPage] = useState(() => Number(filters.per_page) || 25);

    const isFirstRender = useRef(true);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        id: '', account_id: '', type: 'credit', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const { data: transferData, setData: setTransferData, post: postTransfer, processing: transferProcessing, reset: resetTransfer, errors: transferErrors, clearErrors: clearTransferErrors } = useForm({
        from_account_id: '', to_account_id: '', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().split('T')[0], description: '', reference_number: ''
    });

    const applyFilters = (overrides = {}) => {
        router.get(
            route("admin.transactions.index"),
            {
                search: overrides.search ?? searchTerm,
                per_page: overrides.per_page ?? perPage,
                account_id: overrides.account_id ?? accountId,
                type: overrides.type ?? typeFilter,
                date_from: overrides.date_from ?? dateFrom,
                date_to: overrides.date_to ?? dateTo,
                page: 1,
            },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayDebounceFn = setTimeout(() => applyFilters(), 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, dateFrom, dateTo]);

    const handleFilterChange = (field, value) => {
        if (field === 'per_page') setPerPage(value);
        if (field === 'account_id') setAccountId(value);
        if (field === 'type') setTypeFilter(value);
        if (field === 'date_from') setDateFrom(value);
        if (field === 'date_to') setDateTo(value);

        applyFilters({ [field]: value });
    };

    const clearAllFilters = () => {
        setSearchTerm(""); setAccountId(""); setTypeFilter(""); setDateFrom(""); setDateTo("");
        router.get(route("admin.transactions.index"), { per_page: perPage }, { preserveState: true, replace: true });
    };

    const trxList = transactions.data || [];

    const handleCopy = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = trxList.map((t) => `${t.transaction_date}\t${t.account?.name || "N/A"}\t${t.party_name || 'Manual'}\t${t.description}\t${t.type?.toUpperCase()}\t${t.amount}`).join("\n");
        navigator.clipboard.writeText("Date\tAccount\tParty/Context\tDescription\tType\tAmount\n" + text);
        Swal.fire({ icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Party Context,Description,Reference,Type,Amount\n"];
        const rows = trxList.map(t => `"${t.transaction_date}","${t.account?.name || ''}","${t.party_name || 'Manual Entry'} (${t.context_label || ''})","${t.description}","${t.reference_number || ''}","${t.type}","${t.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;
        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction Ledger Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Transaction Ledger</h2>
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
        setData({ id: '', account_id: '', type: 'credit', amount: '', bank_charge: 0, transaction_date: new Date().toISOString().slice(0, 10), reference_number: '', description: '' });
        setEditMode(false); setShowModal(true);
    };

    const openTransferModal = () => {
        clearTransferErrors(); resetTransfer(); setShowTransferModal(true);
    };

    const openEditModal = (trx) => {
        clearErrors();
        setData({ id: trx.id, account_id: trx.account_id || '', type: trx.type || 'credit', amount: Number(trx.amount || 0) - Number(trx.bank_charge || 0), bank_charge: trx.bank_charge || 0, transaction_date: trx.transaction_date || '', description: trx.description || '', reference_number: trx.reference_number || '' });
        setEditMode(true); setShowModal(true);
    };

    const openViewModal = (trx) => { setSelectedTrx(trx); setShowViewModal(true); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        const action = editMode ? put : post;
        const routeName = editMode ? 'admin.transactions.update' : 'admin.transactions.store';
        const param = editMode ? data.id : null;

        action(route(routeName, param), {
            onSuccess: () => {
                setShowModal(false); reset();
                Swal.fire({ icon: "success", title: editMode ? "Updated Successfully!" : "Logged Successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => { if(err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        if (!transferData.from_account_id || !transferData.to_account_id) return Swal.fire("Required", "Please select both accounts.", "warning");
        if (transferData.from_account_id === transferData.to_account_id) return Swal.fire("Error", "Accounts cannot be the same.", "error");

        postTransfer(route('admin.transactions.transfer'), {
            onSuccess: () => {
                setShowTransferModal(false); resetTransfer();
                Swal.fire({ icon: "success", title: "Transferred Successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => { if(err.error) Swal.fire("Error", err.error, "error"); }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This will reverse the amount in your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.transactions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({
                        icon: "success",
                        title: "Deleted!",
                        text: "Transaction removed and balance restored.",
                        timer: 1500,
                        showConfirmButton: false
                    }),
                    onError: (err) => Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: err.error || "Cannot delete system-generated transactions."
                    })
                });
            }
        });
    };

    const inputClass = "w-full rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-[13.5px] font-bold text-slate-900 outline-none transition-shadow focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";
    const inputClassFilter = "w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13.5px] font-bold text-slate-800 outline-none transition hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm";

    return (
        <AdminLayout>
            <Head title="Transactions Ledger" />
            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-800 shadow-sm">
                            <i className="fa-solid fa-book-open"></i> Financial Ledger
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Transactions Directory</h1>
                        <p className="text-[14.5px] font-bold text-slate-600 mt-2 max-w-lg">Monitor all cash inflows, outflows, and bank transfers across accounts.</p>
                    </div>
                </div>

                {/* 🟢 Premium Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard
                        label="Total Deposit (In)"
                        value={<><Taka className="text-[18px] mr-1 text-emerald-200" />{parseFloat(totalCredit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-down-to-bracket"
                        gradient="from-emerald-600 to-teal-700"
                        textColor="text-emerald-200"
                        iconColor="text-emerald-100"
                    />
                    <StatCard
                        label="Total Withdrawal (Out)"
                        value={<><Taka className="text-[18px] mr-1 text-rose-200" />{parseFloat(totalDebit || 0).toLocaleString('en-IN')}</>}
                        icon="fa-arrow-right-from-bracket"
                        gradient="from-rose-500 to-red-600"
                        textColor="text-rose-200"
                        iconColor="text-rose-100"
                    />
                    <StatCard
                        label="Net Balance"
                        value={<>{netBalance < 0 ? '-' : ''}<Taka className={`text-[18px] mr-1 ${netBalance >= 0 ? 'text-indigo-200' : 'text-white'}`} />{Math.abs(parseFloat(netBalance || 0)).toLocaleString('en-IN')}</>}
                        icon="fa-scale-balanced"
                        gradient={netBalance >= 0 ? "from-indigo-600 to-blue-700" : "from-slate-700 to-slate-900"}
                        textColor={netBalance >= 0 ? "text-indigo-200" : "text-slate-300"}
                        iconColor={netBalance >= 0 ? "text-indigo-100" : "text-slate-100"}
                    />
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-6 py-5 gap-4 bg-slate-50">
                        <div className="text-[16px] font-black text-slate-900 flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
                                <i className="fa-solid fa-money-bill-transfer text-[15px]"></i>
                            </div>
                            <div>
                                <h2 className="text-[16px] font-black text-slate-900 leading-tight">All Transactions</h2>
                                <p className="text-[12px] text-slate-500 font-bold mt-0.5">{transactions.total ?? trxList.length} total records</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {hasPermission('create_transaction') && (
                                <>
                                    <button onClick={openTransferModal} className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-purple-700 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                        <i className="fa-solid fa-right-left"></i> Transfer Funds
                                    </button>
                                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                        <i className="fa-solid fa-plus"></i> Manual Entry
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 🟢 Premium Toolbar 1: Show Rows & Export */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Premium SVG Show Dropdown */}
                            <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all z-20">
                                <span className="bg-slate-100 px-4 py-2.5 text-[12.5px] font-black text-slate-600 border-r border-slate-300 uppercase tracking-widest">
                                    Show
                                </span>
                                <div className="relative">
                                    <select
                                        value={perPage}
                                        onChange={(e) => handleFilterChange('per_page', e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-slate-900 outline-none cursor-pointer border-none focus:ring-0 w-[120px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-[11px]"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-slate-300 mx-1 hidden md:block"></div>

                            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-sm"><i className="fas fa-copy text-blue-500"></i> Copy</button>
                            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 shadow-sm"><i className="fas fa-file-csv"></i> CSV</button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-sm"><i className="fas fa-print text-slate-500"></i> Print</button>
                        </div>

                        {/* 🟢 REDESIGNED: Advanced Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 items-center w-full lg:w-auto">
                            <div className="relative w-full lg:w-[220px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                                <input type="text" placeholder="Search ref, desc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputClassFilter}`} />
                            </div>

                            <div className="relative w-full lg:w-[160px]">
                                <select value={accountId} onChange={(e) => handleFilterChange('account_id', e.target.value)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3 pr-8 py-2.5 text-[13px] font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer shadow-sm focus:ring-2 focus:ring-indigo-600/20 transition-all">
                                    <option value="">All Accounts</option>
                                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                            </div>

                            <div className="relative w-full lg:w-[150px]">
                                <select value={typeFilter} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3 pr-8 py-2.5 text-[13px] font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer shadow-sm focus:ring-2 focus:ring-indigo-600/20 transition-all">
                                    <option value="">All Types</option>
                                    <option value="credit">Deposit (In)</option>
                                    <option value="debit">Withdrawal (Out)</option>
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] pointer-events-none"></i>
                            </div>

                            {(searchTerm || accountId || typeFilter || dateFrom || dateTo) && (
                                <button onClick={clearAllFilters} className="w-full lg:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-[13px] font-bold text-rose-600 hover:bg-rose-100 shadow-sm transition-colors">
                                    <i className="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2 min-h-[400px]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0 z-10 text-[11.5px] font-black uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">SL</th>
                                    <th className="px-6 py-4 w-32">Date</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4 w-[20%]">Context / Party</th>
                                    <th className="px-6 py-4 w-[25%]">Description & Ref</th>
                                    <th className="px-6 py-4 text-center">Type</th>
                                    <th className="px-6 py-4 text-right">Amount (In/Out)</th>
                                    <th className="px-6 py-4 text-center no-print w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-slate-800 divide-y divide-slate-200">
                                {trxList.length > 0 ? (
                                    trxList.map((trx, index) => (
                                        <tr key={trx.id} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-500 text-center tabular-nums">
                                                {transactions.from ? transactions.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-2.5 py-1.5 rounded-lg w-max text-[12px]"><i className="fa-regular fa-calendar text-[11px] text-slate-400"></i>{trx.transaction_date}</div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-indigo-700 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm">
                                                        <i className="fa-solid fa-building-columns text-[12px]"></i>
                                                    </div>
                                                    {trx.account?.name || <span className="text-slate-400 italic">Deleted Account</span>}
                                                </div>
                                            </td>

                                            {/* 🟢 Context / Related Party Column */}
                                            <td className="px-6 py-4">
                                                {trx.party_name ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[14px] font-black text-slate-900 truncate max-w-[200px]">{trx.party_name}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9.5px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-sm w-max">{trx.party_type}</span>
                                                            <span className="text-[9.5px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded shadow-sm w-max">{trx.context_label}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[13px] font-bold text-slate-500 italic">Direct Entry / System</span>
                                                        {trx.context_label !== 'Manual Entry' && (
                                                            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-sm w-max">{trx.context_label}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-slate-800 font-bold whitespace-normal leading-snug">{trx.description}</div>
                                                {trx.reference_number && (
                                                    <div className="text-[10.5px] font-black text-slate-500 mt-1.5 flex items-center gap-1 bg-white border border-slate-300 w-max px-2.5 py-1 rounded-md shadow-sm uppercase tracking-widest">
                                                        <i className="fa-solid fa-hashtag text-[10px] opacity-70"></i> Ref: {trx.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap border shadow-sm ${trx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                                    {trx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[15px] whitespace-nowrap tabular-nums transition-colors ${trx.type === 'credit' ? 'text-emerald-700 bg-emerald-50/30 border-l border-emerald-100' : 'text-rose-700 bg-rose-50/30 border-l border-rose-100'}`}>
                                                {trx.type === 'credit' ? '+' : '-'} <Taka className="text-[13px] ml-0.5" /> {parseFloat(trx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {hasPermission('view_transaction') && (
                                                        <button onClick={() => openViewModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm" title="View Details">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {!trx.transactionable_id ? (
                                                        <>
                                                            {hasPermission('edit_transaction') && (
                                                                <button onClick={() => openEditModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors shadow-sm" title="Edit">
                                                                    <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                </button>
                                                            )}
                                                            {hasPermission('delete_transaction') && (
                                                                <button onClick={() => handleDelete(trx.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-sm" title="Delete">
                                                                    <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 cursor-not-allowed shadow-sm" title="System generated transaction">
                                                            System
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm border border-slate-200">
                                                    <i className="fa-solid fa-money-bill-transfer text-2xl"></i>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800">No transactions found.</p>
                                                <p className="text-[13.5px] font-bold text-slate-500 mt-1">Try adjusting your filters or record a new entry.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-300 bg-slate-100 px-6 py-4 no-print">
                            <div className="text-[13.5px] text-slate-600 font-bold">
                                Showing <strong className="text-slate-900 font-black">{transactions.from || 0}</strong> to <strong className="text-slate-900 font-black">{transactions.to || 0}</strong> of <strong className="text-slate-900 font-black">{transactions.total || 0}</strong> records
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[34px] items-center justify-center rounded-lg border px-3 py-1.5 text-[13px] font-black transition-all shadow-sm
                                            ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : link.url ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400' : 'border-slate-200 bg-slate-50 text-slate-400 pointer-events-none'}
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

            {/* --- 🟢 FUND TRANSFER MODAL --- */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-purple-300 text-[10px] font-black uppercase tracking-widest mb-1.5 border border-white/10 shadow-sm">
                                    <i className="fa-solid fa-right-left"></i> Bank / Cash
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">Transfer Funds</h3>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors bg-white/5 border border-white/10 shadow-sm relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">
                                {transferErrors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-[13.5px] font-bold text-red-700 shadow-sm">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5 text-lg"></i> {transferErrors.error}
                                    </div>
                                )}

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md relative">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">From Account (Source) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <select
                                                    value={transferData.from_account_id}
                                                    onChange={(e) => setTransferData('from_account_id', e.target.value)}
                                                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                                    style={{ backgroundImage: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select source account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] pointer-events-none"></i>
                                            </div>
                                            {transferErrors.from_account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.from_account_id}</p>}
                                        </div>

                                        <div className="flex justify-center -my-7 relative z-10 pointer-events-none">
                                            <div className="bg-purple-100 text-purple-600 h-10 w-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                                                <i className="fa-solid fa-arrow-down text-[15px]"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">To Account (Destination) <span className="text-red-600">*</span></label>
                                            <div className="relative">
                                                <select
                                                    value={transferData.to_account_id}
                                                    onChange={(e) => setTransferData('to_account_id', e.target.value)}
                                                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                                    style={{ backgroundImage: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select destination account...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] pointer-events-none"></i>
                                            </div>
                                            {transferErrors.to_account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.to_account_id}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Transfer Amount <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]" />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={transferData.amount}
                                                onChange={e => setTransferData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-slate-400 pl-10 pr-4 py-3 text-[16px] font-black text-purple-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 shadow-sm transition-all bg-purple-50/50"
                                                placeholder="0.00" required
                                            />
                                        </div>
                                        {transferErrors.amount && <p className="text-red-600 text-[11px] font-bold mt-1.5">{transferErrors.amount}</p>}
                                        <label className="block text-[12.5px] font-bold mt-3 text-slate-700">Bank charge (extra)<input type="number" min="0" step="0.01" value={transferData.bank_charge} onChange={e => setTransferData('bank_charge', e.target.value)} className={`${inputClass} mt-2`} /></label>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Date <span className="text-red-600">*</span></label>
                                        <input
                                            type="date"
                                            value={transferData.transaction_date}
                                            onChange={e => setTransferData('transaction_date', e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Description / Notes</label>
                                    <input
                                        type="text"
                                        value={transferData.description}
                                        onChange={e => setTransferData('description', e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. Bank to Cash transfer for petty expenses"
                                    />
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={transferProcessing} className="rounded-xl bg-purple-600 px-10 py-3.5 text-[14px] font-bold text-white hover:bg-purple-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1">
                                    {transferProcessing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> Complete Transfer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 MANUAL ENTRY FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/10 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-sm">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[22px] font-black text-white tracking-tight relative z-10">
                                    {editMode ? "Edit Transaction" : "Manual Transaction Entry"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors bg-white/5 shadow-sm relative z-10">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Select Account <span className="text-red-600">*</span></label>
                                    <div className="relative">
                                        <select
                                            value={data.account_id}
                                            onChange={(e) => setData('account_id', e.target.value)}
                                            className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                            style={{ backgroundImage: 'none' }}
                                            required
                                        >
                                            <option value="">Choose an account...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Bal: ৳{parseFloat(a.current_balance).toLocaleString('en-IN')})</option>)}
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[12px] pointer-events-none"></i>
                                    </div>
                                    {errors.account_id && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.account_id}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Transaction Type <span className="text-red-600">*</span></label>
                                        <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setData(prev => ({...prev, type: 'credit', bank_charge: 0}))}
                                                className={`flex-1 py-2 text-[14px] font-black rounded-lg transition-all border ${data.type === 'credit' ? 'bg-white text-emerald-700 shadow-sm border-emerald-200' : 'text-slate-500 hover:text-slate-700 border-transparent'}`}
                                            >
                                                Deposit (In)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('type', 'debit')}
                                                className={`flex-1 py-2 text-[14px] font-black rounded-lg transition-all border ${data.type === 'debit' ? 'bg-white text-rose-700 shadow-sm border-rose-200' : 'text-slate-500 hover:text-slate-700 border-transparent'}`}
                                            >
                                                Withdrawal (Out)
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[12px] font-black uppercase tracking-widest mb-2 ${data.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>Amount <span className="text-red-600">*</span></label>
                                        <div className="relative">
                                            <Taka className={`absolute left-4 top-1/2 -translate-y-1/2 text-[16px] ${data.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[16px] font-black outline-none transition-all shadow-sm
                                                    ${data.type === 'credit' ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20' : 'bg-rose-50/50 border-rose-300 text-rose-800 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20'}
                                                `}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {data.type === 'debit' && <label className="block text-[13px] font-bold mt-3 text-slate-700">Bank charge (extra)<input type="number" min="0" step="0.01" value={data.bank_charge} onChange={e => setData('bank_charge', e.target.value)} className={`${inputClass} mt-2`} /><span className="block text-xs mt-2 text-slate-500">Total account debit: {(Number(data.amount || 0) + Number(data.bank_charge || 0)).toFixed(2)}</span></label>}
                                        {errors.amount && <p className="text-red-600 text-[11px] font-bold mt-1.5">{errors.amount}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Date <span className="text-red-600">*</span></label>
                                        <input
                                            type="date"
                                            value={data.transaction_date}
                                            onChange={e => setData('transaction_date', e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Reference No <span className="text-slate-400 font-bold normal-case tracking-normal">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={data.reference_number}
                                            onChange={e => setData('reference_number', e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Check #, Trx ID"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-black text-slate-800 uppercase tracking-widest mb-2">Description / Reason <span className="text-red-600">*</span></label>
                                        <input
                                            type="text"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Added capital, Bank charge"
                                            required
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end gap-4 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-400 bg-white px-8 py-3.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-10 py-3.5 text-[14px] font-bold text-white hover:bg-indigo-700 shadow-md disabled:opacity-70 transition-all flex items-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Processing...</> : <><i className="fa-solid fa-check text-lg"></i> {editMode ? "Update Entry" : "Save Entry"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 🟢 VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-gray-50 rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-slate-700/30">

                        <div className="relative bg-slate-900 px-8 py-6 shrink-0 overflow-hidden border-b border-slate-700">
                            <span className="absolute -right-6 -top-10 text-[160px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>
                            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 opacity-50 translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="text-[20px] font-black text-white flex items-center gap-2.5">
                                    <i className="fa-solid fa-receipt text-indigo-400 text-xl"></i> Transaction Receipt
                                </h3>
                                <button onClick={() => setShowViewModal(false)} className="text-white hover:bg-white/10 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm">
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-table-scroll bg-slate-50">
                            <div className={`text-center py-8 bg-white rounded-3xl border ${selectedTrx.type === 'credit' ? 'border-emerald-300' : 'border-rose-300'} shadow-md relative overflow-hidden`}>
                                <div className={`absolute top-0 left-0 w-full h-2 ${selectedTrx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                                <span className={`inline-block mb-3 px-4 py-1.5 rounded-lg text-[11.5px] font-black uppercase tracking-widest border shadow-sm ${selectedTrx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / Cash In' : 'Withdrawal / Cash Out'}
                                </span>

                                <div className={`text-[40px] font-black tabular-nums tracking-tight leading-none ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<Taka className="text-[26px] mr-1" />{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* 🟢 Context Party in View Modal */}
                            {selectedTrx.party_name && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md flex items-center justify-between gap-4">
                                    <div className="overflow-hidden">
                                        <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Related To ({selectedTrx.party_type})</span>
                                        <div className="font-black text-slate-900 text-[18px] truncate">
                                            {selectedTrx.party_name}
                                        </div>
                                    </div>
                                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-widest whitespace-nowrap shadow-sm">
                                        {selectedTrx.context_label}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-2"><i className="fa-solid fa-building-columns mr-1 text-slate-300"></i> Account</span>
                                    <div className="font-black text-slate-900 text-[15px]">
                                        {selectedTrx.account?.name || "N/A"}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-2"><i className="fa-regular fa-calendar-days mr-1 text-slate-300"></i> Transaction Date</span>
                                    <div className="font-black text-slate-900 text-[15px]">
                                        {selectedTrx.transaction_date}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md col-span-2">
                                    <span className="block text-[11.5px] font-black uppercase tracking-widest text-slate-400 mb-2"><i className="fa-solid fa-align-left mr-1 text-slate-300"></i> Description & Notes</span>
                                    <div className="text-slate-800 font-bold text-[15.5px] leading-relaxed">{selectedTrx.description}</div>
                                </div>
                                {selectedTrx.reference_number && (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-md col-span-2 flex justify-between items-center">
                                        <span className="text-[11.5px] font-black uppercase tracking-widest text-slate-500">Reference Number</span>
                                        <div className="font-black text-slate-900 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[14px]">
                                            <i className="fa-solid fa-hashtag text-slate-400"></i> {selectedTrx.reference_number}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-300 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-slate-900 px-8 py-3.5 text-[14px] font-bold text-white hover:bg-black shadow-md transition-colors w-full sm:w-auto">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
