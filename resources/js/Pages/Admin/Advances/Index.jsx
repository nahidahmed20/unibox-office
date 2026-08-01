import React, { useState, useEffect, useRef, useMemo } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';

import Swal from 'sweetalert2'; 
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ advances = [], filters = {}, accounts = [], employees = [], totalUnsettled = 0 }) {
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
    
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || filters.search || '');
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10');
    
    const isFirstRender = useRef(true);

    // Main Create/Edit Form
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        account_id: '',
        user_id: '', 
        amount: '', 
        date: new Date().toISOString().slice(0, 10), 
        purpose: 'Office Purpose', 
        status: 'unsettled',
        notes: ''
    });

    // Cash Return Form
    const { data: returnData, setData: setReturnData, post: postReturn, processing: returnProcessing, reset: returnReset, errors: returnErrors, clearErrors: clearReturnErrors } = useForm({
        return_amount: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.advances.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true, preserveScroll: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // Group advances by employee
    const groupedAdvances = useMemo(() => {
        const map = new Map();
        advanceList.forEach((adv) => {
            const key = adv.user_id;
            if (!map.has(key)) {
                map.set(key, {
                    user_id: adv.user_id,
                    user: adv.user,
                    records: [],
                    total_given: 0,
                    total_expensed: 0,
                    total_returned: 0,
                });
            }
            const group = map.get(key);
            group.records.push(adv);
            group.total_given += parseFloat(adv.amount || 0);
            group.total_expensed += parseFloat(adv.settled_amount || 0);
            group.total_returned += parseFloat(adv.returned_amount || 0);
        });
        return Array.from(map.values()).map((group) => ({
            ...group,
            total_due: group.total_given - group.total_expensed - group.total_returned,
        }));
    }, [advanceList]);

    // Calculate Grand Totals for Summary Cards
    const grandTotals = useMemo(() => {
        let given = 0;
        let expensed = 0;
        let returned = 0;

        groupedAdvances.forEach(g => {
            given += g.total_given;
            expensed += g.total_expensed;
            returned += g.total_returned;
        });

        return {
            given,
            expensed,
            returned,
            due: given - expensed - returned
        };
    }, [groupedAdvances]);

    const toggleExpand = (userId) => {
        setExpandedRows((prev) => ({ ...prev, [userId]: !prev[userId] }));
    };

    const formatTime = (dateTimeStr) => {
        if (!dateTimeStr) return '';
        const d = new Date(dateTimeStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // --- Export Utilities ---
    const handleCopy = () => {
        if (!advanceList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = advanceList
            .map((adv, idx) => `${idx + 1}\t${adv.date}\t${adv.account?.name || 'N/A'}\t${adv.user?.name}\t${adv.purpose}\t${adv.status}\tBDT ${parseFloat(adv.amount).toFixed(2)}`)
            .join("\n");
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
            const due = total - expensed - returned;
            return `"${idx + 1}","${adv.date}","${adv.account?.name || 'N/A'}","${adv.user?.name}","${adv.purpose}","${total}","${expensed}","${returned}","${due}","${adv.status}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
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
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; }
                        .actions-col, .expand-btn-col { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Advance Payments Directory</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modal Management ---
    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            account_id: '',
            user_id: '',
            amount: '',
            settled_amount: 0,
            returned_amount: 0,
            date: new Date().toISOString().slice(0, 10),
            purpose: 'Office Purpose',
            status: 'unsettled', 
            notes: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors(); 
        setData({
            id: adv.id,
            account_id: adv.account_id || '',
            user_id: adv.user_id || '', 
            amount: adv.amount,
            date: adv.date,
            purpose: adv.purpose || 'Office Purpose',
            status: adv.status || 'unsettled',
            notes: adv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openReturnModal = (adv) => {
        setSelectedAdvance(adv);
        returnReset();
        clearReturnErrors();
        const totalSettled = parseFloat(adv.settled_amount || 0) + parseFloat(adv.returned_amount || 0);
        const due = parseFloat(adv.amount) - totalSettled;
        setReturnData('return_amount', due > 0 ? due : '');
        setShowReturnModal(true);
    };

    const openViewModal = (adv) => {
        setSelectedAdvance(adv);
        setShowViewModal(true);
    };

    // --- Form Submits ---
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.user_id) return Swal.fire("Required", "Please select an employee.", "warning");
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        if (editMode) {
            put(route('admin.advances.update', data.id), { 
                preserveScroll: true,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Advance record updated successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.advances.store'), { 
                preserveScroll: true,
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Logged!', text: 'New advance payment logged.', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleReturnSubmit = (e) => {
        e.preventDefault();
        postReturn(route('admin.advances.returnMoney', selectedAdvance.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowReturnModal(false);
                Swal.fire({ icon: 'success', title: 'Refunded!', text: 'Leftover cash returned to account.', timer: 2000, showConfirmButton: false });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this transaction?',
            text: `Remaining money will be automatically refunded to the account!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    // React-Select Styles
    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "42px", 
            borderRadius: "0.5rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(200, 155, 60, 0.5)" : "none",
            "&:hover": { borderColor: "#9ca3af" },
            fontSize: "13.5px",
            background: "#fff",
            padding: "0px"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 10px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "13.5px" }),
        singleValue: (provided) => ({ ...provided, color: "#111827", fontSize: "13.5px" }),
        option: (provided, state) => ({
            ...provided, fontSize: "13.5px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            
            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Advance Payments</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage and track advance payments given to employees.</p>
                    </div>
                </div>

                {/* --- 4 PREMIUM SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Total Given */}
                    <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-money-bill-transfer text-blue-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-blue-600 tracking-wider">Total Given</span>
                        <div className="text-[22px] font-extrabold text-blue-900 z-10">
                            TK. {Number(grandTotals.given).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* Total Expensed */}
                    <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-file-invoice-dollar text-emerald-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-emerald-600 tracking-wider">Total Expensed</span>
                        <div className="text-[22px] font-extrabold text-emerald-900 z-10">
                            TK. {Number(grandTotals.expensed).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* Total Returned */}
                    <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-purple-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-hand-holding-dollar text-purple-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-purple-600 tracking-wider">Total Returned</span>
                        <div className="text-[22px] font-extrabold text-purple-900 z-10">
                            TK. {Number(grandTotals.returned).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* System Unsettled Due */}
                    <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-triangle-exclamation text-red-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-red-600 tracking-wider">Total Due Amount</span>
                        <div className="text-[22px] font-extrabold text-red-900 z-10">
                            TK. {Number(totalUnsettled).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-list-check text-[var(--accent)]"></i> Advance History Directory
                        </div>
                        {hasPermission('create_advance') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Log Advance
                            </button>
                        )}
                    </div>

                    {/* Toolbar Panel */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Dynamic Per Page Selector */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Action Tools */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> Excel
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search Component */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search employee..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Main Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-advance-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12 expand-btn-col"></th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4">Given To (Employee)</th>
                                    <th className="px-6 py-4 text-right">Given</th>
                                    <th className="px-6 py-4 text-right">Expensed</th>
                                    <th className="px-6 py-4 text-right">Returned</th>
                                    <th className="px-6 py-4 text-right">Due</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center actions-col">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {groupedAdvances.length > 0 ? (
                                    groupedAdvances.map((group) => {
                                        const isExpanded = !!expandedRows[group.user_id];
                                        const hasMultiple = group.records.length > 1;
                                        const single = group.records[0];

                                        return (
                                            <React.Fragment key={group.user_id}>
                                                {/* --- MAIN GROUP ROW --- */}
                                                <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/30 border-none' : 'border-b border-gray-100 hover:bg-gray-50/50'}`}>
                                                    <td className="px-6 py-4 text-center expand-btn-col">
                                                        {hasMultiple && (
                                                            <button 
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                className="flex h-7 w-7 items-center justify-center rounded-full border-none bg-gray-200 text-gray-500 transition-colors hover:bg-gray-300 focus:outline-none"
                                                            >
                                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-[10px]`}></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 font-medium">
                                                        {hasMultiple ? (
                                                            <span className="bg-gray-100 px-2.5 py-1 rounded text-gray-600 text-[12px] font-bold">{group.records.length} entries</span>
                                                        ) : (
                                                            <>
                                                                <div>{single.date}</div>
                                                                {single.created_at && (
                                                                    <div className="text-[11px] text-gray-400 mt-0.5 font-normal">
                                                                        {formatTime(single.created_at)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-teal-700">
                                                        {hasMultiple ? <span className="text-gray-400 italic">Multiple Accounts</span> : (single.account?.name || 'N/A')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={route('admin.advances.employeeLedger', group.user_id)} className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                                            {group.user?.name}
                                                        </Link>
                                                        {!hasMultiple && single.purpose && <div className="text-[12px] text-gray-500 mt-1">{single.purpose}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                        {group.total_given.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                        {group.total_expensed > 0 ? group.total_expensed.toLocaleString('en-IN') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                        {group.total_returned > 0 ? group.total_returned.toLocaleString('en-IN') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-red-600">
                                                        {group.total_due > 0 ? group.total_due.toLocaleString('en-IN') : '0'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${group.total_due > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                                            {group.total_due > 0 ? 'unsettled' : 'settled'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center actions-col">
                                                        {hasMultiple ? (
                                                            <button 
                                                                onClick={() => toggleExpand(group.user_id)}
                                                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-blue-600 transition-colors hover:bg-gray-200"
                                                            >
                                                                {isExpanded ? 'Hide' : 'View'} details
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {hasPermission('view_client_advance') && (
                                                                    <button onClick={() => openViewModal(single)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                                        <i className="fa-regular fa-eye text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('return_advance') && single.status !== 'settled' && group.total_due > 0 && (
                                                                    <button onClick={() => openReturnModal(single)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Refund Cash">
                                                                        <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('edit_advance') && (
                                                                    <button onClick={() => openEditModal(single)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('delete_advance') && (
                                                                    <button onClick={() => handleDelete(single.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* --- EXPANDED DETAILS ROWS --- */}
                                                {isExpanded && hasMultiple && (
                                                    <tr>
                                                        <td colSpan="10" className="px-8 py-6 bg-gray-50 border-b border-gray-200 shadow-inner">
                                                            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                                                <table className="w-full border-collapse">
                                                                    <thead className="bg-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-4 py-3 w-4 border-r border-gray-200"></th>
                                                                            <th className="px-4 py-3">Date</th>
                                                                            <th className="px-4 py-3">Account</th>
                                                                            <th className="px-4 py-3">Purpose</th>
                                                                            <th className="px-4 py-3 text-right">Given</th>
                                                                            <th className="px-4 py-3 text-right">Expensed</th>
                                                                            <th className="px-4 py-3 text-right">Returned</th>
                                                                            <th className="px-4 py-3 text-right">Due</th>
                                                                            <th className="px-4 py-3 text-center">Status</th>
                                                                            <th className="px-4 py-3 text-center actions-col">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[13px] text-gray-700">
                                                                        {group.records.map((adv) => {
                                                                            const expensed = parseFloat(adv.settled_amount || 0);
                                                                            const returned = parseFloat(adv.returned_amount || 0);
                                                                            const totalGiven = parseFloat(adv.amount || 0);
                                                                            const due = totalGiven - expensed - returned;

                                                                            return (
                                                                                <tr key={adv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                                                    <td className="px-4 py-3 border-r border-gray-100"></td>
                                                                                    <td className="px-4 py-3 font-medium text-gray-500">
                                                                                        <div><i className="fa-regular fa-calendar mr-1.5"></i>{adv.date}</div>
                                                                                        {adv.created_at && (
                                                                                            <div className="text-[11px] text-gray-400 mt-0.5 pl-4">
                                                                                                {formatTime(adv.created_at)}
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 font-semibold text-teal-700">
                                                                                        {adv.account?.name || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-gray-600">
                                                                                        {adv.purpose || '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                                        {totalGiven.toLocaleString('en-IN')}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                                                                        {expensed > 0 ? expensed.toLocaleString('en-IN') : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                                                                        {returned > 0 ? returned.toLocaleString('en-IN') : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                                                                        {due > 0 ? due.toLocaleString('en-IN') : '0'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center">
                                                                                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${adv.status === 'settled' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                                                            {adv.status}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-center actions-col">
                                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                                            {hasPermission('view_client_advance') && (
                                                                                                <button onClick={() => openViewModal(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                                                                    <i className="fa-regular fa-eye text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('return_advance') && adv.status !== 'settled' && due > 0 && (
                                                                                                <button onClick={() => openReturnModal(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Refund Cash">
                                                                                                    <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('edit_advance') && (
                                                                                                <button onClick={() => openEditModal(adv)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                                                    <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                                                                </button>
                                                                                            )}
                                                                                            {hasPermission('delete_advance') && (
                                                                                                <button onClick={() => handleDelete(adv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
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
                                        <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-hand-holding-dollar text-4xl text-gray-300 mb-3"></i>
                                                <p>No advance records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {advances.links && advances.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {advances.from || 0} to {advances.to || 0} of {advances.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {advances.links.map((link, i) => (
                                    link.url === null ? (
                                        <span key={i} className="flex min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[13px] text-gray-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    ) : (
                                        <Link key={i} href={link.url} preserveState className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN CREATE / EDIT FORM MODAL SECTION --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-[var(--accent)]"></i> Modify Advance Info</>
                                ) : (
                                    <><i className="fa-solid fa-hand-holding-dollar text-[var(--accent)]"></i> Log New Advance Payment</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                                {errors.error && (
                                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[13.5px] font-medium text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                        {errors.error}
                                    </div>
                                )}

                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-building-columns text-gray-400"></i> Payment Details
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Account <span className="text-red-500">*</span></label>
                                            <Select
                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Account --"
                                                isDisabled={editMode}
                                                isSearchable
                                                isClearable
                                                styles={selectStyles}
                                                menuPosition="fixed"
                                            />
                                            {errors.account_id && <p className="text-red-500 text-[12px] mt-1">{errors.account_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Employee <span className="text-red-500">*</span></label>
                                            <Select
                                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                                value={employees.map((e) => ({ value: e.id, label: e.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                                onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                                placeholder="-- Select Employee --"
                                                isSearchable
                                                isClearable
                                                styles={selectStyles}
                                                menuPosition="fixed"
                                            />
                                            {errors.user_id && <p className="text-red-500 text-[12px] mt-1">{errors.user_id}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-emerald-700 mb-1.5">Amount (BDT) <span className="text-red-500">*</span></label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={data.amount} 
                                                onChange={e => setData('amount', e.target.value)} 
                                                className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[15px] font-bold text-emerald-800 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" 
                                                placeholder="0.00" 
                                                required 
                                            />
                                            {errors.amount && <p className="text-red-500 text-[12px] mt-1">{errors.amount}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
                                            <input 
                                                type="date" 
                                                value={data.date} 
                                                onChange={e => setData('date', e.target.value)} 
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                required 
                                            />
                                            {errors.date && <p className="text-red-500 text-[12px] mt-1">{errors.date}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-list-check text-gray-400"></i> Purpose & Status
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Purpose</label>
                                            <CreatableSelect
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
                                                onCreateOption={(inputValue) => setData('purpose', inputValue)}
                                                placeholder="-- Select or type Purpose --"
                                                isClearable
                                                styles={selectStyles}
                                                menuPosition="fixed"
                                            />
                                            {errors.purpose && <p className="text-red-500 text-[12px] mt-1">{errors.purpose}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Status</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.status} 
                                                    onChange={e => setData('status', e.target.value)} 
                                                    className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                                >
                                                    <option value="unsettled">Unsettled (Not adjusted)</option>
                                                    <option value="settled">Settled (Bill Submitted)</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                            {errors.status && <p className="text-red-500 text-[12px] mt-1">{errors.status}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Notes / Description</label>
                                        <textarea 
                                            value={data.notes} 
                                            onChange={e => setData('notes', e.target.value)} 
                                            rows="3"
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none resize-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            placeholder="Optional additional details..." 
                                        ></textarea>
                                        {errors.notes && <p className="text-red-500 text-[12px] mt-1">{errors.notes}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Control */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Advance" : "Save Advance"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Transaction Details
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-2xl font-bold border border-[var(--accent)]/20 uppercase">
                                    {selectedAdvance.user?.name ? selectedAdvance.user.name.charAt(0) : 'U'}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Employee</span>
                                    <h2 className="text-[20px] font-bold text-gray-900 m-0">{selectedAdvance.user?.name || "N/A"}</h2>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Amount Given</span>
                                    <div className="text-[18px] font-bold text-gray-900">TK. {Number(selectedAdvance.amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Adjusted / Expensed</span>
                                    <div className="text-[18px] font-bold text-emerald-600">TK. {Number(selectedAdvance.settled_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Returned Cash</span>
                                    <div className="text-[18px] font-bold text-blue-600">TK. {Number(selectedAdvance.returned_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div className={`${(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount) > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} p-4 rounded-xl border shadow-sm text-center`}>
                                    <span className={`block text-[11px] font-bold uppercase tracking-wider ${(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount) > 0 ? 'text-red-600' : 'text-gray-500'} mb-1`}>Currently Due</span>
                                    <div className={`text-[18px] font-bold ${(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount) > 0 ? 'text-red-700' : 'text-gray-700'}`}>TK. {Number(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <i className="fa-solid fa-circle-info text-gray-400"></i> Additional Details
                                </h4>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Given Date</span>
                                        <div className="font-medium text-gray-800 flex items-center gap-2">
                                            <i className="fa-regular fa-calendar-days text-gray-400"></i> {selectedAdvance.date}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Note</span>
                                        <div className="text-[14px] text-gray-700 bg-gray-50 p-3.5 rounded-lg border border-gray-100 leading-relaxed">
                                            {selectedAdvance.notes || <span className="italic text-gray-400">No additional note provided.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CASH RETURN MODAL --- */}
            {showReturnModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-200 bg-emerald-50 shrink-0">
                            <div>
                                <h3 className="m-0 text-[17px] font-bold text-emerald-700 flex items-center gap-2">
                                    <i className="fa-solid fa-money-bill-transfer"></i> Refund Leftover Cash
                                </h3>
                                <p className="m-0 mt-1 text-[12.5px] text-emerald-600 font-medium">
                                    Return cash from <b>{selectedAdvance.user?.name || 'N/A'}</b> to Account.
                                </p>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="text-emerald-500 hover:text-emerald-700 transition-colors h-8 w-8 rounded-full hover:bg-white flex items-center justify-center">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleReturnSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                {returnErrors.error && (
                                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[13.5px] font-medium text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                        {returnErrors.error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Refund Amount (BDT) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={returnData.return_amount} 
                                        onChange={e => setReturnData('return_amount', e.target.value)} 
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[16px] font-bold text-gray-900 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 shadow-sm" 
                                        placeholder="0.00" 
                                        required
                                    />
                                    {returnErrors.return_amount && <p className="text-red-500 text-[12px] mt-1 font-bold">{returnErrors.return_amount}</p>}
                                    
                                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-[13px] text-blue-800 flex items-start gap-2 shadow-sm font-medium">
                                        <i className="fa-solid fa-circle-info mt-0.5 text-blue-600 shrink-0"></i>
                                        <p className="m-0 leading-relaxed">
                                            This refunded amount will be directly deposited back to the <b>{selectedAdvance.account?.name}</b> account.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={returnProcessing} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-70 flex items-center gap-2 shadow-sm">
                                    {returnProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-check"></i> Confirm Refund</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}