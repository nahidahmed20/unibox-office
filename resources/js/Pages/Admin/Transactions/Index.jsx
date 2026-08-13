import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Index({ transactions = { data: [], links: [] }, accounts = [] }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTrx, setSelectedTrx] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 25);
    const isFirstRender = useRef(true);

    // Main Manual Entry Form
    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        account_id: '',
        type: 'credit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: ''
    });

    // Fund Transfer Form
    const { data: transferData, setData: setTransferData, post: postTransfer, processing: transferProcessing, reset: resetTransfer, errors: transferErrors, clearErrors: clearTransferErrors } = useForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: ''
    });

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 25) params.per_page = perPage;

            router.get(
                route('admin.transactions.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const trxList = transactions.data || [];

    const handleCopy = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = trxList
            .map((t) => `${t.transaction_date}\t${t.account?.name || "N/A"}\t${t.description}\t${t.type?.toUpperCase()}\t${t.amount}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!trxList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Account,Description,Reference,Type,Amount\n"];
        const rows = trxList.map(t => `"${t.transaction_date}","${t.account?.name || ''}","${t.description}","${t.reference_number || ''}","${t.type}","${t.amount}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
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
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        h2.report-title { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                        p.report-date { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12.5px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <h2 class="report-title">Transaction Ledger</h2>
                    <p class="report-date">Generated on: ${new Date().toLocaleString()}</p>
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
            id: '', account_id: '', type: 'credit', amount: '',
            transaction_date: new Date().toISOString().slice(0, 10), reference_number: '', description: ''
        });
        setEditMode(false);
        setShowModal(true);
    };

    const openTransferModal = () => {
        clearTransferErrors();
        resetTransfer();
        setShowTransferModal(true);
    };

    const openEditModal = (trx) => {
        clearErrors();
        setData({
            id: trx.id,
            account_id: trx.account_id || '',
            type: trx.type || 'credit',
            amount: trx.amount || '',
            transaction_date: trx.transaction_date || '',
            description: trx.description || '',
            reference_number: trx.reference_number || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (trx) => {
        setSelectedTrx(trx);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.account_id) return Swal.fire("Required", "Please select an account.", "warning");

        if (editMode) {
            put(route('admin.transactions.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.transactions.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Logged Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleTransferSubmit = (e) => {
        e.preventDefault();
        if (!transferData.from_account_id || !transferData.to_account_id) {
            return Swal.fire("Required", "Please select both source and destination accounts.", "warning");
        }
        if (transferData.from_account_id === transferData.to_account_id) {
            return Swal.fire("Error", "Source and destination accounts cannot be the same.", "error");
        }

        postTransfer(route('admin.transactions.transfer'), {
            onSuccess: () => {
                setShowTransferModal(false);
                resetTransfer();
                Swal.fire({ icon: "success", title: "Transferred Successfully!", timer: 1500, showConfirmButton: false });
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: "This will reverse the amount in your account balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.transactions.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Transaction removed and balance restored.", timer: 1500, showConfirmButton: false }),
                    onError: (err) => Swal.fire({ icon: "error", title: "Error!", text: err.error || "Cannot delete system-generated transactions.", confirmButtonColor: '#3b82f6' })
                });
            }
        });
    };

    const selectStyles = {
        control: (provided, state) => ({
            ...provided, 
            minHeight: "44px", 
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(200, 155, 60, 0.15)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "#9ca3af" }, 
            fontSize: "14px", 
            background: "#fff",
            cursor: "pointer"
        }),
        valueContainer: (provided) => ({ ...provided, padding: "2px 12px" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af", fontSize: "14px" }),
        singleValue: (provided) => ({ ...provided, color: "#111827", fontSize: "14px" }),
        option: (provided, state) => ({
            ...provided, fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
            padding: "10px 12px"
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" })
    };

    const accountOptions = accounts.map((a) => ({ 
        value: a.id, 
        label: `${a.name} (Bal: ৳${Number(a.current_balance).toLocaleString('en-IN')})` 
    }));

    return (
        <AdminLayout>
            <Head title="Transactions Ledger" />

            <div className="flex flex-col gap-6 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-32">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Transaction Ledger</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Monitor all cash inflows and outflows across your accounts.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-bold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-money-bill-transfer text-[var(--accent)]"></i> All Transactions
                        </div>
                        <div className="flex items-center gap-3">
                            {hasPermission('create_requisition') && (
                                <>
                                    <button onClick={openTransferModal} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-purple-700 shadow-sm">
                                        <i className="fa-solid fa-right-left"></i> Transfer Funds
                                    </button>
                                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#b08630] shadow-sm">
                                        <i className="fa-solid fa-plus"></i> Manual Entry
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                    className="w-[120px] appearance-none text-center bg-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

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

                        <div className="relative w-full sm:w-[260px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Search description/ref..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4 w-[35%]">Description & Ref</th>
                                    <th className="px-6 py-4 text-center">Type</th>
                                    <th className="px-6 py-4 text-right">Amount (In/Out)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {trxList.length > 0 ? (
                                    trxList.map((trx, index) => (
                                        <tr key={trx.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {transactions.from ? transactions.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                                                <i className="fa-regular fa-calendar mr-1.5 text-gray-400"></i>{trx.transaction_date}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">
                                                {trx.account?.name || 'Deleted Account'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-800 font-medium whitespace-normal leading-relaxed">{trx.description}</div>
                                                {trx.reference_number && (
                                                    <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                        <i className="fa-solid fa-hashtag"></i> {trx.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border
                                                    ${trx.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}
                                                `}>
                                                    {trx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold text-[14.5px] whitespace-nowrap ${trx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {trx.type === 'credit' ? '+' : '-'}<i className="fa-solid fa-bangladeshi-taka-sign text-[12px] mr-0.5"></i>{parseFloat(trx.amount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_transaction') && (
                                                        <button onClick={() => openViewModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                            <i className="fa-regular fa-eye text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {!trx.transactionable_id ? (
                                                        <>
                                                            {hasPermission('edit_transaction') && (
                                                                <button onClick={() => openEditModal(trx)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                    <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                                </button>
                                                            )}
                                                            {hasPermission('delete_transaction') && (
                                                                <button onClick={() => handleDelete(trx.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                    <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-200" title="Auto-generated transaction">
                                                            System
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-money-bill-transfer text-4xl text-gray-300 mb-3"></i>
                                                <p className="text-[15px] font-medium text-gray-600">No transactions found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500 font-medium">
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
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

            {/* --- FUND TRANSFER MODAL --- */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-right-left text-purple-600"></i> Transfer Funds Between Accounts
                            </h3>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleTransferSubmit} className="flex flex-col">
                            <div className="p-8 space-y-5">
                                {transferErrors.error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-medium text-red-700">
                                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i> {transferErrors.error}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">From Account (Source) *</label>
                                    <Select
                                        options={accountOptions}
                                        value={accountOptions.find(o => o.value === transferData.from_account_id) || null}
                                        onChange={opt => setTransferData('from_account_id', opt ? opt.value : '')}
                                        placeholder="Select source account..."
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {transferErrors.from_account_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{transferErrors.from_account_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">To Account (Destination) *</label>
                                    <Select
                                        options={accountOptions}
                                        value={accountOptions.find(o => o.value === transferData.to_account_id) || null}
                                        onChange={opt => setTransferData('to_account_id', opt ? opt.value : '')}
                                        placeholder="Select destination account..."
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {transferErrors.to_account_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{transferErrors.to_account_id}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Transfer Amount (BDT) *</label>
                                        <input
                                            type="number" step="0.01" min="0.01"
                                            value={transferData.amount}
                                            onChange={e => setTransferData('amount', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] font-bold text-gray-900 outline-none focus:border-purple-500"
                                            placeholder="0.00"
                                            required
                                        />
                                        {transferErrors.amount && <p className="text-rose-500 text-xs mt-1.5 font-medium">{transferErrors.amount}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Date *</label>
                                        <input
                                            type="date"
                                            value={transferData.transaction_date}
                                            onChange={e => setTransferData('transaction_date', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description / Notes</label>
                                    <input
                                        type="text"
                                        value={transferData.description}
                                        onChange={e => setTransferData('description', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-purple-500"
                                        placeholder="e.g. Bank to Cash transfer"
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" disabled={transferProcessing} className="rounded-xl bg-purple-600 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-purple-700 shadow-md disabled:opacity-70">
                                    {transferProcessing ? "Transferring..." : "Complete Transfer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- VIEW RECEIPT MODAL --- */}
            {showViewModal && selectedTrx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-receipt text-[var(--accent)]"></i> Transaction Receipt
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className={`inline-block mb-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${selectedTrx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {selectedTrx.type === 'credit' ? 'Deposit / In' : 'Withdrawal / Out'}
                                </span>
                                <div className={`text-[34px] font-black ${selectedTrx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTrx.type === 'credit' ? '+' : '-'}<i className="fa-solid fa-bangladeshi-taka-sign text-[24px] mr-0.5"></i>{parseFloat(selectedTrx.amount).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Account</span>
                                    <div className="font-bold text-gray-900">{selectedTrx.account?.name || "N/A"}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Date</span>
                                    <div className="font-bold text-gray-900">{selectedTrx.transaction_date}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</span>
                                    <div className="text-gray-800 font-medium">{selectedTrx.description}</div>
                                </div>
                                {selectedTrx.reference_number && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Reference No</span>
                                        <div className="font-bold text-gray-800">{selectedTrx.reference_number}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 rounded-b-3xl">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-gray-800 shadow-sm">
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-pen-to-square text-[var(--accent)]"></i> {editMode ? "Edit Transaction" : "Manual Transaction Entry"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col">
                            <div className="p-8 space-y-5">
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Account *</label>
                                    <Select
                                        options={accountOptions}
                                        value={accountOptions.find(o => o.value === data.account_id) || null}
                                        onChange={opt => setData('account_id', opt ? opt.value : '')}
                                        placeholder="Choose account..."
                                        styles={selectStyles}
                                        menuPosition="fixed"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    />
                                    {errors.account_id && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.account_id}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Transaction Type *</label>
                                        <select
                                            value={data.type}
                                            onChange={e => setData('type', e.target.value)}
                                            className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-semibold text-gray-900 outline-none focus:border-indigo-500 cursor-pointer"
                                            required
                                        >
                                            <option value="credit">Deposit / In (Credit)</option>
                                            <option value="debit">Withdrawal / Out (Debit)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Amount (TK) *</label>
                                        <div className="relative">
                                            <i className="fa-solid fa-bangladeshi-taka-sign absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                            <input
                                                type="number" step="0.01" min="0.01"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 text-[15px] font-bold text-gray-900 outline-none focus:border-indigo-500"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {errors.amount && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.amount}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Date *</label>
                                    <input
                                        type="date"
                                        value={data.transaction_date}
                                        onChange={e => setData('transaction_date', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Description / Reason *</label>
                                    <input
                                        type="text"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-indigo-500"
                                        placeholder="e.g. Added capital, Bank charge"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Reference Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={data.reference_number}
                                        onChange={e => setData('reference_number', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] outline-none focus:border-indigo-500"
                                        placeholder="Cheque No, Txn ID, etc."
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-gray-900 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-gray-800 shadow-md disabled:opacity-70">
                                    {processing ? "Processing..." : (editMode ? "Update Entry" : "Submit Entry")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}