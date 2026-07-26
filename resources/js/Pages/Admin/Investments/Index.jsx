import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2'; 
import Select from 'react-select';

export default function Index({ investments = {}, accounts = [], filters = {}, totalAmount = 0 }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const investmentList = investments.data || [];
    
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || filters.search || '';
    });
    
    const [perPage, setPerPage] = useState(() => {
        return new URLSearchParams(window.location.search).get('per_page') || filters.per_page || '10';
    });
    
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', 
        account_id: '', 
        amount: '', 
        investor_name: '', 
        investment_date: '', 
        purpose: 'Office Purpose', 
        notes: ''
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            router.get(
                route('admin.investments.index'), 
                { search: searchTerm, per_page: perPage }, 
                { preserveState: true, replace: true }
            );
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const handleCopy = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = investmentList
            .map((inv, idx) => `${idx + 1}\t${inv.investor_name}\t${inv.investment_date}\t${inv.purpose}\t$${parseFloat(inv.amount).toFixed(2)}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1200, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!investmentList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["SL,Investor Name,Date,Purpose,Account,Amount\n"];
        const rows = investmentList.map((inv, idx) => {
            const accountName = inv.account ? inv.account.name : 'N/A';
            return `"${idx + 1}","${inv.investor_name}","${inv.investment_date}","${inv.purpose}","${accountName}","${inv.amount}"`;
        });
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Investment_Report_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-investment-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height}`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Capital & Investments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Capital & Investments Directory</h2>
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
            id: '',
            account_id: '',
            amount: '',
            investor_name: '',
            investment_date: new Date().toISOString().slice(0, 10),
            purpose: 'Office Purpose',
            notes: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (inv) => {
        clearErrors(); 
        setData({
            id: inv.id,
            account_id: inv.account_id || '',
            amount: inv.amount,
            investor_name: inv.investor_name,
            investment_date: inv.investment_date,
            purpose: inv.purpose || 'Office Purpose',
            notes: inv.notes || ''
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!data.account_id) return Swal.fire("Required", "Please select a deposit account.", "warning");

        if (editMode) {
            put(route('admin.investments.update', data.id), { 
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: 'success', title: 'Updated!', text: 'Investment updated successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.investments.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Logged!', text: 'New investment added successfully.', timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This investment record will be permanently deleted and account balance will be updated!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.investments.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record has been removed.', timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const totalInvestment = parseFloat(totalAmount || 0);

    // React-Select Custom Styles
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
            <Head title="Investments Management" />
            
            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Investments Management</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Track and manage asset allocations, seed funding, and corporate capitals.</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-2.5 text-teal-700 shadow-sm">
                        <i className="fa-solid fa-chart-line text-teal-600"></i>
                        <span className="text-[14px] font-bold uppercase tracking-wider text-teal-800">Page Total:</span>
                        <span className="text-[18px] font-bold">TK. {totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Main Card Container */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-money-bill-trend-up text-[var(--accent)]"></i> Capital & Investments Directory
                        </div>
                        {hasPermission('create_investment') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Log Investment
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : e.target.value)} 
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

                            {/* Export Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search investor or purpose..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-investment-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Investor Name</th>
                                    <th className="px-6 py-4">Investment Date</th>
                                    <th className="px-6 py-4">Purpose Target</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {investmentList.length > 0 ? (
                                    investmentList.map((inv, index) => (
                                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {(investments.current_page - 1) * investments.per_page + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{inv.investor_name}</div>
                                                {inv.account && (
                                                    <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-600">
                                                        <i className="fa-solid fa-building-columns text-[10px]"></i> {inv.account.name}
                                                    </div>
                                                )}
                                                {inv.notes && (
                                                    <div className="text-[12px] text-gray-500 mt-1.5 max-w-[220px] truncate">
                                                        {inv.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">
                                                {inv.investment_date}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                                    ${inv.purpose === 'Work Purpose' ? 'bg-sky-50 text-sky-600 border border-sky-200' : inv.purpose === 'Office Purpose' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}
                                                `}>
                                                    {inv.purpose}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-teal-600 text-[14.5px]">
                                                TK. {parseFloat(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('edit_investment') && (
                                                        <button onClick={() => openEditModal(inv)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Record">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Record">
                                                            <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-money-bill-trend-up text-4xl text-gray-300 mb-3"></i>
                                                <p>No investment records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {investments.links && investments.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {investments.from || 0} to {investments.to || 0} of {investments.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {investments.links.map((link, i) => (
                                    <Link 
                                        key={i} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label.includes("Previous") ? '<i class="fa-solid fa-chevron-left text-[10px]"></i>' : link.label.includes("Next") ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : link.label.replace("&laquo;", "").replace("&raquo;", "") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? '📝 Edit Investment Info' : '✨ Log New Investment'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto brass-scroll">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Investor Name *</label>
                                        <input 
                                            type="text" 
                                            value={data.investor_name} 
                                            onChange={e => setData('investor_name', e.target.value)} 
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            placeholder="e.g., John Doe" 
                                            required
                                        />
                                        {errors.investor_name && <p className="text-red-500 text-[12px] mt-1">{errors.investor_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Deposit To Account *</label>
                                        <Select
                                            options={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` }))}
                                            value={accounts.map((a) => ({ value: a.id, label: `${a.name} (Bal: TK. ${a.current_balance})` })).find((opt) => Number(opt.value) === Number(data.account_id)) || null}
                                            onChange={(selected) => setData("account_id", selected ? selected.value : "")}
                                            placeholder="-- Search & Choose Account --"
                                            isSearchable
                                            isClearable
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        />
                                        {errors.account_id && <p className="text-red-500 text-[12px] mt-1">{errors.account_id}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Amount (TK) *</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={data.amount} 
                                            onChange={e => setData('amount', e.target.value)} 
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] font-bold text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            placeholder="0.00" 
                                            required
                                        />
                                        {errors.amount && <p className="text-red-500 text-[12px] mt-1">{errors.amount}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Investment Date *</label>
                                        <input 
                                            type="date" 
                                            value={data.investment_date} 
                                            onChange={e => setData('investment_date', e.target.value)} 
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            required
                                        />
                                        {errors.investment_date && <p className="text-red-500 text-[12px] mt-1">{errors.investment_date}</p>}
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Purpose *</label>
                                    <select 
                                        value={data.purpose} 
                                        onChange={e => setData('purpose', e.target.value)} 
                                        className="w-full appearance-none bg-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                    >
                                        <option value="Office Purpose">Office Purpose</option>
                                        <option value="Work Purpose">Work Purpose</option>
                                        <option value="Other Purpose">Other Purpose</option>
                                    </select>
                                    {errors.purpose && <p className="text-red-500 text-[12px] mt-1">{errors.purpose}</p>}
                                </div>

                                <div className="border-t border-gray-100 pt-5">
                                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Notes</label>
                                    <textarea 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        rows="3"
                                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-y min-h-[80px] transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                        placeholder="Any additional funding details..." 
                                    ></textarea>
                                    {errors.notes && <p className="text-red-500 text-[12px] mt-1">{errors.notes}</p>}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                    {processing ? 'Saving...' : 'Save Investment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}