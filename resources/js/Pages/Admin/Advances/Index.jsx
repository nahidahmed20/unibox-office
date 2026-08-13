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
    const [perPage, setPerPage] = useState(() => new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '50');
    
    const isFirstRender = useRef(true);

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

    const grandTotals = useMemo(() => {
        let given = 0; let expensed = 0; let returned = 0;
        groupedAdvances.forEach(g => {
            given += g.total_given;
            expensed += g.total_expensed;
            returned += g.total_returned;
        });
        return { given, expensed, returned, due: given - expensed - returned };
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

    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '', account_id: '', user_id: '', amount: '', settled_amount: 0, returned_amount: 0,
            date: new Date().toISOString().slice(0, 10), purpose: 'Office Purpose', status: 'unsettled', notes: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (adv) => {
        clearErrors(); 
        setData({
            id: adv.id, account_id: adv.account_id || '', user_id: adv.user_id || '', amount: adv.amount,
            date: adv.date, purpose: adv.purpose || 'Office Purpose', status: adv.status || 'unsettled', notes: adv.notes || ''
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
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.advances.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "44px", 
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #e5e7eb",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(200, 155, 60, 0.15)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "#d1d5db" },
            fontSize: "14px",
            background: state.isFocused ? "#fff" : "#f9fafb",
            cursor: "pointer"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#1f2937", fontSize: "14px", fontWeight: "500" }),
        option: (provided, state) => ({
            ...provided, fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#1f2937", cursor: "pointer",
            padding: "10px 12px"
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    return (
        <AdminLayout>
            <Head title="Advance Payments" />
            
            <div className="flex flex-col gap-6 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Advance Payments</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage and track advance payments given to employees.</p>
                    </div>
                </div>

                {/* --- 4 PREMIUM SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-money-bill-transfer text-blue-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-blue-600 tracking-wider">Total Given</span>
                        <div className="text-[22px] font-extrabold text-blue-900 z-10 flex items-center gap-1.5">
                            <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] text-blue-400"></i>
                            {Number(grandTotals.given).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-file-invoice-dollar text-emerald-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-emerald-600 tracking-wider">Total Expensed</span>
                        <div className="text-[22px] font-extrabold text-emerald-900 z-10 flex items-center gap-1.5">
                            <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] text-emerald-400"></i>
                            {Number(grandTotals.expensed).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-purple-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-hand-holding-dollar text-purple-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-purple-600 tracking-wider">Total Returned</span>
                        <div className="text-[22px] font-extrabold text-purple-900 z-10 flex items-center gap-1.5">
                            <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] text-purple-400"></i>
                            {Number(grandTotals.returned).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-bl-full flex items-start justify-end p-3 transition-transform group-hover:scale-110">
                            <i className="fa-solid fa-triangle-exclamation text-red-300 text-xl"></i>
                        </div>
                        <span className="block text-[11px] uppercase font-bold text-red-600 tracking-wider">Total Due Amount</span>
                        <div className="text-[22px] font-extrabold text-red-900 z-10 flex items-center gap-1.5">
                            <i className="fa-solid fa-bangladeshi-taka-sign text-[18px] text-red-400"></i>
                            {Number(totalUnsettled).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden mb-20">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-list-check text-[var(--accent)]"></i> Advance History Directory
                        </div>
                        {hasPermission('create_advance') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-[#b08630] shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
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
                                    className="w-[100px] appearance-none text-center bg-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
                                    <option value={1000}>1000 Entries</option>
                                    <option value="all">All Entries</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Export Action Tools */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search Component */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search employee..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
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
                            <tbody className="text-[14px] text-gray-700">
                                {groupedAdvances.length > 0 ? (
                                    groupedAdvances.map((group) => {
                                        const isExpanded = !!expandedRows[group.user_id];
                                        const hasMultiple = group.records.length > 1;
                                        const single = group.records[0];

                                        return (
                                            <React.Fragment key={group.user_id}>
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
                                                            <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 text-[12px] font-bold border border-gray-200">{group.records.length} entries</span>
                                                        ) : (
                                                            <>
                                                                <div>{single.date}</div>
                                                                {single.created_at && (
                                                                    <div className="text-[11.5px] text-gray-400 mt-0.5 font-normal">
                                                                        {formatTime(single.created_at)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-teal-700">
                                                        {hasMultiple ? <span className="text-gray-400 italic font-normal">Multiple Accounts</span> : (single.account?.name || 'N/A')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={route('admin.advances.employeeLedger', group.user_id)} className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                                            {group.user?.name}
                                                        </Link>
                                                        {!hasMultiple && single.purpose && <div className="text-[12px] text-gray-500 mt-1">{single.purpose}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1 text-gray-400"></i>
                                                        {group.total_given.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                        {group.total_expensed > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1 text-emerald-400"></i>{group.total_expensed.toLocaleString('en-IN')}</> : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                        {group.total_returned > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1 text-blue-400"></i>{group.total_returned.toLocaleString('en-IN')}</> : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-red-600">
                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-1 text-red-400"></i>
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
                                                                    <button onClick={() => openViewModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                                        <i className="fa-regular fa-eye text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('return_advance') && single.status !== 'settled' && group.total_due > 0 && (
                                                                    <button onClick={() => openReturnModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Refund Cash">
                                                                        <i className="fa-solid fa-money-bill-transfer text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('edit_advance') && (
                                                                    <button onClick={() => openEditModal(single)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                    </button>
                                                                )}
                                                                {hasPermission('delete_advance') && (
                                                                    <button onClick={() => handleDelete(single.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
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
                                                                                    </td>
                                                                                    <td className="px-4 py-3 font-semibold text-teal-700">
                                                                                        {adv.account?.name || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-gray-600">
                                                                                        <div>{adv.purpose || '-'}</div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 text-gray-400"></i>{totalGiven.toLocaleString('en-IN')}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                                                                        {expensed > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 text-emerald-400"></i>{expensed.toLocaleString('en-IN')}</> : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                                                                        {returned > 0 ? <><i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 text-blue-400"></i>{returned.toLocaleString('en-IN')}</> : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                                                                        <i className="fa-solid fa-bangladeshi-taka-sign text-[11px] mr-1 text-red-400"></i>{due > 0 ? due.toLocaleString('en-IN') : '0'}
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
                                        <td colSpan="10" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                    <i className="fa-solid fa-hand-holding-dollar text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-medium text-gray-600">No advance records found.</p>
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
                            <div className="text-[13px] text-gray-500 font-medium">
                                Showing {advances.from || 0} to {advances.to || 0} of {advances.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {advances.links.map((link, i) => (
                                    link.url === null ? (
                                        <span key={i} className="flex min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[13px] text-gray-400 cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    ) : (
                                        <Link key={i} href={link.url} preserveState className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`} dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- WIDE & MODERN VIEW MODAL --- */}
            {showViewModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col relative my-auto animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Status Ribbon */}
                        <div className={`absolute top-6 -left-2 px-4 py-1.5 text-white text-[12px] font-black tracking-widest uppercase rounded-r-lg shadow-md ${selectedAdvance.status === 'settled' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {selectedAdvance.status}
                        </div>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-3xl pl-32">
                            <div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">Advance Payment Details</h3>
                                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Reference: #{String(selectedAdvance.id).padStart(5, '0')}</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            
                            {/* Left Side: Info */}
                            <div className="flex-1 space-y-6">
                                <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-2xl font-black border border-[var(--accent)]/20 uppercase">
                                        {selectedAdvance.user?.name ? selectedAdvance.user.name.charAt(0) : 'U'}
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Employee / Issued To</span>
                                        <h2 className="text-[20px] font-bold text-gray-900 m-0">{selectedAdvance.user?.name || "N/A"}</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Payment Account</span>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <i className="fa-solid fa-building-columns text-blue-500"></i>
                                            {selectedAdvance.account?.name || "N/A"}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Given Date</span>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <i className="fa-regular fa-calendar-days text-rose-500"></i>
                                            {selectedAdvance.date || "-"}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Purpose</span>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <i className="fa-solid fa-bullseye text-[var(--accent)]"></i>
                                            {selectedAdvance.purpose || "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <span className="block text-[12px] font-bold uppercase tracking-wider text-gray-800 mb-3"><i className="fa-solid fa-align-left text-gray-400 mr-2"></i> Notes & Details</span>
                                    <div className="bg-white p-5 rounded-2xl border border-gray-200 text-gray-600 text-[14.5px] leading-relaxed min-h-[80px] whitespace-pre-line shadow-sm">
                                        {selectedAdvance.notes || <span className="italic text-gray-400">No additional note provided.</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Financial Box */}
                            <div className="w-full md:w-[320px] shrink-0 bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
                                
                                <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-6">Financial Status</h4>
                                
                                <div className="space-y-5 flex-1">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[14px] text-gray-300">Total Given</span>
                                        <span className="text-[18px] font-bold text-white"><i className="fa-solid fa-bangladeshi-taka-sign text-[14px] mr-1 text-gray-400"></i>{Number(selectedAdvance.amount).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[14px] text-emerald-400">Expensed / Adjusted</span>
                                        <span className="text-[18px] font-bold text-emerald-400"><i className="fa-solid fa-bangladeshi-taka-sign text-[14px] mr-1"></i>{Number(selectedAdvance.settled_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[14px] text-blue-400">Cash Returned</span>
                                        <span className="text-[18px] font-bold text-blue-400"><i className="fa-solid fa-bangladeshi-taka-sign text-[14px] mr-1"></i>{Number(selectedAdvance.returned_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <div className="pt-5 border-t border-gray-700/50 mt-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[14px] text-rose-300 font-medium">Currently Due</span>
                                        <span className="text-[26px] font-black text-rose-400"><i className="fa-solid fa-bangladeshi-taka-sign text-[20px] mr-1"></i>{Number(selectedAdvance.amount - selectedAdvance.settled_amount - selectedAdvance.returned_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* --- WIDE & MODERN CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto max-h-[95vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                    <i className="fa-solid fa-hand-holding-dollar"></i> {editMode ? 'Update' : 'New Entry'}
                                </div>
                                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                                    {editMode ? "Modify Advance Info" : "Log New Advance Payment"}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Form wrapper */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                                
                                {/* Left Column: Inputs */}
                                <div className="flex-1 p-8 overflow-y-auto brass-scroll bg-gray-50/30">
                                    
                                    {errors.error && (
                                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-semibold text-red-700 shadow-sm">
                                            <i className="fa-solid fa-circle-exclamation mt-0.5 text-lg"></i> 
                                            {errors.error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Select Account <span className="text-rose-500">*</span></label>
                                            <Select
                                                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` }))}
                                                value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: ${Number(a.current_balance).toLocaleString('en-IN')})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                                onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                                placeholder="-- Choose Account --"
                                                isDisabled={editMode}
                                                isSearchable
                                                isClearable
                                                styles={selectStyles}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.account_id && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.account_id}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Employee <span className="text-rose-500">*</span></label>
                                            <Select
                                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                                value={employees.map((e) => ({ value: e.id, label: e.name })).find((opt) => Number(opt.value) === Number(data.user_id)) || null}
                                                onChange={(selected) => setData("user_id", selected ? selected.value : "")}
                                                placeholder="-- Select Employee --"
                                                isSearchable
                                                isClearable
                                                styles={selectStyles}
                                                menuPosition="fixed"
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.user_id && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.user_id}</p>}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Purpose</label>
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
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            />
                                            {errors.purpose && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.purpose}</p>}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2.5">Notes / Description</label>
                                            <textarea 
                                                value={data.notes} 
                                                onChange={e => setData('notes', e.target.value)} 
                                                rows="4"
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900 outline-none resize-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                                                placeholder="Optional additional details or conditions..." 
                                            ></textarea>
                                            {errors.notes && <p className="text-rose-500 text-[12px] mt-1.5 font-medium">{errors.notes}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Financial & Status (Dark) */}
                                <div className="w-full lg:w-[340px] shrink-0 bg-[#111827] p-8 text-white flex flex-col relative overflow-y-auto">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
                                    
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-800 pb-3">Transaction Details</h3>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[13px] font-medium text-emerald-400 mb-2">Amount (BDT) <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <i className="fa-solid fa-bangladeshi-taka-sign absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"></i>
                                                <input 
                                                    type="number" step="0.01" min="1"
                                                    value={data.amount} 
                                                    onChange={e => setData('amount', e.target.value)} 
                                                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-900/20 pl-9 pr-4 py-4 text-[18px] font-bold text-emerald-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all" 
                                                    placeholder="0.00" 
                                                    required 
                                                />
                                            </div>
                                            {errors.amount && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.amount}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-medium text-gray-300 mb-2">Date <span className="text-rose-400">*</span></label>
                                            <input 
                                                type="date" 
                                                value={data.date} 
                                                onChange={e => setData('date', e.target.value)} 
                                                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 text-[15px] font-semibold text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all" 
                                                required 
                                                style={{ colorScheme: 'dark' }}
                                            />
                                            {errors.date && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.date}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-medium text-gray-300 mb-2">Status</label>
                                            <div className="relative">
                                                <select 
                                                    value={data.status} 
                                                    onChange={e => setData('status', e.target.value)} 
                                                    className="w-full appearance-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 text-[14px] font-semibold text-white outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                                                >
                                                    <option value="unsettled">Unsettled (Not adjusted)</option>
                                                    <option value="settled">Settled (Fully Adjusted)</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                            {errors.status && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.status}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-[14.5px] font-bold text-gray-700 transition-all hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-[14.5px] font-bold text-white transition-all shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:opacity-70">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-save"></i> {editMode ? "Update Advance" : "Save Advance"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- SLEEK CASH RETURN MODAL --- */}
            {showReturnModal && selectedAdvance && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        
                        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100 bg-emerald-50 shrink-0">
                            <div>
                                <h3 className="text-[18px] font-extrabold text-emerald-800 flex items-center gap-2 tracking-tight">
                                    <i className="fa-solid fa-money-bill-transfer text-emerald-600"></i> Refund Leftover Cash
                                </h3>
                                <p className="text-[12.5px] text-emerald-600 font-medium mt-1">
                                    Returning cash from <b>{selectedAdvance.user?.name || 'N/A'}</b>
                                </p>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-white transition-colors shadow-sm">
                                <i className="fa-solid fa-xmark text-[15px]"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleReturnSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                {returnErrors.error && (
                                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-medium text-red-700 shadow-sm">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                                        {returnErrors.error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-2.5">Refund Amount <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <i className="fa-solid fa-bangladeshi-taka-sign absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[15px]"></i>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={returnData.return_amount} 
                                            onChange={e => setReturnData('return_amount', e.target.value)} 
                                            className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-4 py-3.5 text-[18px] font-bold text-emerald-700 outline-none transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm" 
                                            placeholder="0.00" 
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    {returnErrors.return_amount && <p className="text-rose-500 text-[12px] mt-1.5 font-bold">{returnErrors.return_amount}</p>}
                                    
                                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[13px] text-blue-800 flex items-start gap-2.5 shadow-sm font-medium">
                                        <i className="fa-solid fa-circle-info mt-0.5 text-blue-500 shrink-0 text-lg"></i>
                                        <p className="m-0 leading-relaxed">
                                            This amount will be directly deposited back into the <b>{selectedAdvance.account?.name}</b> account balance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={returnProcessing} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg shadow-md disabled:opacity-70 flex items-center gap-2">
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