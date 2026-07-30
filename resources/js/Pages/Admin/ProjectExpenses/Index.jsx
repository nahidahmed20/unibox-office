import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

export default function Index({ project_expenses = { data: [], links: [] }, projects = [], categories = [], accounts = [], vendors = [], advances = [], totals = null, filters = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // --- Searchable Dropdown States ---
    const [projectSearch, setProjectSearch] = useState("");
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    const [categorySearch, setCategorySearch] = useState("");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const [accountSearch, setAccountSearch] = useState("");
    const [showAccountDropdown, setShowAccountDropdown] = useState(false);

    const [vendorSearch, setVendorSearch] = useState("");
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);

    const [advanceSearch, setAdvanceSearch] = useState("");
    const [showAdvanceDropdown, setShowAdvanceDropdown] = useState(false);

    // --- Return Account State (For Overpayment) ---
    const [showReturnAccountDropdown, setShowReturnAccountDropdown] = useState(false);

    // Toolbar Filters
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const queryVal = new URLSearchParams(window.location.search).get("per_page");
        return queryVal === "all" ? "all" : (Number(queryVal) || 10);
    });
    const [projectFilter, setProjectFilter] = useState(() => new URLSearchParams(window.location.search).get('project_id') || '');

    const [projectFilterSearch, setProjectFilterSearch] = useState("");
    const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);

    const [vendorList, setVendorList] = useState(vendors);
    useEffect(() => { setVendorList(vendors); }, [vendors]);

    const [showAddVendorForm, setShowAddVendorForm] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: '', company_name: '', phone: '' });
    const [creatingVendor, setCreatingVendor] = useState(false);

    const isFirstRender = useRef(true);
    const filterRef = useRef(null); // Click outside detection

    const [yearFilter, setYearFilter] = useState(() => new URLSearchParams(window.location.search).get('year') || '');
    const [dateFrom, setDateFrom] = useState(() => new URLSearchParams(window.location.search).get('date_from') || '');
    const [dateTo, setDateTo] = useState(() => new URLSearchParams(window.location.search).get('date_to') || '');
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        project_id: '',
        expense_category_id: '',
        account_id: '',
        return_account_id: '',
        advance_user_id: '',
        title: '',
        vendor_id: '',
        total_bill: '',
        paid_amount: 0,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        pay_type: 'account'
    });

    // Close all dropdowns when clicking outside
    const closeAllDropdowns = () => {
        setShowProjectDropdown(false);
        setShowCategoryDropdown(false);
        setShowAccountDropdown(false);
        setShowReturnAccountDropdown(false);
        setShowVendorDropdown(false);
        setShowAdvanceDropdown(false);
        setShowAddVendorForm(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowProjectFilterDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Overpayment Calculation ---
    const isOverpaid = (parseFloat(data.paid_amount) || 0) > (parseFloat(data.total_bill) || 0);
    const overpaymentAmount = isOverpaid ? (parseFloat(data.paid_amount) || 0) - (parseFloat(data.total_bill) || 0) : 0;

    const calculateDue = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        if (paid > bill) return "0.00"; 
        return (bill - paid).toFixed(2);
    };

    const calculateStatus = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
        if (bill > 0 && paid >= bill) return 'PAID';
        if (paid > 0 && paid < bill) return 'PARTIAL';
        return 'DUE';
    };

    // --- Live Search & Pagination ---
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            if (projectFilter) params.project_id = projectFilter;
            if (yearFilter) params.year = yearFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            router.get(
                route('admin.project-expenses.index'),
                params,
                { preserveState: true, replace: true }
            );
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage, projectFilter, yearFilter, dateFrom, dateTo]);

    const expList = project_expenses.data || project_expenses || [];

    const handleCopy = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = expList
            .map((e) => `${e.date}\t${e.title}\t${e.vendor?.name || "N/A"}\t${e.total_bill}\t${e.paid_amount}\t${e.payment_status?.toUpperCase()}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!expList.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Date,Project,Expense Title,Vendor,Account/Source,Total Bill,Paid,Due,Status\n"];
        const rows = expList.map(e => `"${e.date}","${e.project?.title || ''}","${e.title}","${e.vendor?.name || ''}","${e.account_id ? e.account?.name : (e.advance_user_id ? 'Advance' : 'Wallet')}","${e.total_bill}","${e.paid_amount}","${e.due_amount}","${e.payment_status}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Project Expenses Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Project Expenses & Payables</h2>
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
            id: '', project_id: '', expense_category_id: '', advance_id: '', advance_user_id: '', account_id: '', return_account_id: '', title: '', vendor_id: '', description: '', total_bill: 0, paid_amount: 0, due_amount: 0, amount: 0, discount_amount: 0, payment_status: 'due', date: new Date().toISOString().slice(0, 10), attachment: null, pay_type: 'account'
        });
        setEditMode(false);
        closeAllDropdowns();
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        clearErrors();
        let payType = 'wallet';
        if (expense.account_id) payType = 'account';
        else if (expense.advance_user_id) payType = 'advance';

        setData({
            id: expense.id, project_id: expense.project_id || '', expense_category_id: expense.expense_category_id || '', account_id: expense.account_id || '', return_account_id: '', advance_user_id: expense.advance_user_id || '', title: expense.title || '', vendor_id: expense.vendor_id || '', total_bill: expense.total_bill || '', paid_amount: expense.paid_amount || '', date: expense.date || '', description: expense.description || '', pay_type: payType
        });
        setEditMode(true);
        closeAllDropdowns();
        setShowModal(true);
    };

    const openViewModal = (expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!data.project_id) return Swal.fire("Required", "Please select a project.", "warning");
        if (!data.expense_category_id) return Swal.fire("Required", "Please select an expense category.", "warning");

        const paidAmount = parseFloat(data.paid_amount) || 0;
        if (paidAmount > 0) {
            if (data.pay_type === 'account' && !data.account_id) return Swal.fire("Required", "Please select a Bank/Cash Account.", "warning");
            if (data.pay_type === 'advance' && !data.advance_user_id) return Swal.fire("Required", "Please select an Advance User.", "warning");
            if (data.pay_type === 'wallet' && !data.vendor_id) return Swal.fire("Required", "Please select a Vendor to pay from Wallet.", "warning");
        }

        if (isOverpaid && !data.return_account_id && !data.vendor_id) {
            return Swal.fire(
                "Action Required",
                `You entered ${overpaymentAmount} BDT extra. You must select either a Vendor (to save as advance) or a Return Cash Box.`,
                "warning"
            );
        }

        if (editMode) {
            put(route('admin.project-expenses.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.project-expenses.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Logged Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete this record?',
            text: "Paid amount will be refunded to your account/advance balance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete It'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.project-expenses.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Deleted!", text: "Record removed and balance restored.", timer: 1500, showConfirmButton: false })
                });
            }
        });
    };

    const handleMoveToWallet = (exp) => {
        Swal.fire({
            title: 'Move to Vendor Wallet?',
            text: `This will remove the expense from the project and move BDT ${exp.paid_amount} to ${exp.vendor.name}'s Wallet for future use.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('admin.project-expenses.move-to-wallet', exp.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire({ icon: "success", title: "Moved!", text: "Amount added to Vendor Wallet.", timer: 1500, showConfirmButton: false }),
                    onError: (errors) => Swal.fire("Error", errors.error || "Something went wrong.", "error")
                });
            }
        });
    };

    const getPaymentStatusBadge = (status) => {
        if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
        if (status === 'partial') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    };

    const handleCreateVendor = async () => {
        if (!newVendor.name.trim()) {
            return Swal.fire("Required", "Vendor name is required.", "warning");
        }
        setCreatingVendor(true);
        try {
            const res = await axios.post(route('admin.vendors.store'), {
                name: newVendor.name.trim(),
                company_name: newVendor.company_name.trim() || null,
                phone: newVendor.phone.trim() || null,
            });

            const created = res.data.vendor;
            setVendorList(prev => [created, ...prev]);
            setData('vendor_id', created.id);
            setNewVendor({ name: '', company_name: '', phone: '' });
            setShowAddVendorForm(false);
            setShowVendorDropdown(false);
            setVendorSearch("");
            Swal.fire({ icon: "success", title: "Vendor Created & Selected!", timer: 1200, showConfirmButton: false });
        } catch (err) {
            const message = err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : "Could not create vendor.";
            Swal.fire("Error", message, "error");
        } finally {
            setCreatingVendor(false);
        }
    };

    const totalBilled = totals ? totals.total_bill : expList.reduce((sum, item) => sum + parseFloat(item.total_bill || 0), 0);
    const totalPaid = totals ? totals.paid_amount : expList.reduce((sum, item) => sum + parseFloat(item.paid_amount || 0), 0);
    const totalDue = totals ? totals.due_amount : expList.reduce((sum, item) => sum + parseFloat(item.due_amount || 0), 0);

    const filteredProject = projectFilter ? projects.find(p => p.id == projectFilter) : null;
    const filteredProjectTitle = filteredProject 
    ? `${filteredProject.title} (${filteredProject.client?.name || 'No Client'}${filteredProject.client?.company_name ? ` - ${filteredProject.client.company_name}` : ''})` 
    : null;

    return (
        <AdminLayout>
            <Head title="Project Expenses & Payables" />

            <div className="flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Project Accounts Payable</h1>
                        <p className="text-[14px] text-gray-500 mt-1">
                            {filteredProjectTitle ? (
                                <>Showing totals for <strong className="text-[var(--accent)]">{filteredProjectTitle}</strong></>
                            ) : (
                                "Manage vendor bills and track project costs."
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">Total Billed</span>
                            <span className="text-[16px] font-bold">BDT {totalBilled.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">Total Paid</span>
                            <span className="text-[16px] font-bold">BDT {totalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-0.5">Total Due</span>
                            <span className="text-[16px] font-bold">BDT {totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <h2 className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-wallet text-[var(--accent)]"></i> Vendor Bills & Project Cost
                        </h2>
                        {hasPermission('create_project_expenses') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Log Bill/Expense
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[100px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Year Filter */}
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-calendar text-[var(--accent)]"></i>
                                <select 
                                    value={yearFilter} 
                                    onChange={(e) => { setYearFilter(e.target.value); if (e.target.value) { setDateFrom(""); setDateTo(""); } }} 
                                    className="w-[100px] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                >
                                    <option value="">All Years</option>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                            {/* Date Range Filter */}
                            <div className="flex items-center gap-2">
                                <i className="fa-regular fa-calendar-days text-[var(--accent)]"></i>
                                <input 
                                    type="date" 
                                    value={dateFrom} 
                                    onChange={(e) => { setDateFrom(e.target.value); if (e.target.value) setYearFilter(""); }} 
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                />
                                <span className="text-gray-400">–</span>
                                <input 
                                    type="date" 
                                    value={dateTo} 
                                    onChange={(e) => { setDateTo(e.target.value); if (e.target.value) setYearFilter(""); }} 
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[13px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                />
                                {(dateFrom || dateTo) && (
                                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="ml-1 text-red-500 hover:text-red-700" title="Clear dates">
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {/* Project Filter (Custom Dropdown) */}
                            <div className="relative w-full sm:w-[240px]" ref={filterRef}>
                                <div 
                                    onClick={() => setShowProjectFilterDropdown(!showProjectFilterDropdown)}
                                    className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-colors hover:bg-gray-50 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                >
                                    <span className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-gray-700">
                                        <i className="fa-solid fa-folder-open text-[var(--accent)]"></i>
                                        {filteredProjectTitle || "All Projects (Total)"}
                                    </span>
                                    {projectFilter ? (
                                        <i className="fa-solid fa-times text-red-500 hover:text-red-700 p-1" onClick={(e) => { e.stopPropagation(); setProjectFilter(""); }}></i>
                                    ) : (
                                        <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
                                    )}
                                </div>
                                
                                {showProjectFilterDropdown && (
                                    <div className="absolute top-full left-0 mt-1 flex max-h-[250px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                        <div className="border-b border-gray-100 bg-gray-50 p-2">
                                            <input 
                                                type="text" 
                                                placeholder="Search project or client..." 
                                                value={projectFilterSearch}
                                                onChange={(e) => setProjectFilterSearch(e.target.value)}
                                                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="overflow-y-auto py-1">
                                            <div 
                                                onClick={() => { setProjectFilter(""); setShowProjectFilterDropdown(false); }}
                                                className="cursor-pointer px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                            >
                                                All Projects (Total)
                                            </div>
                                            {projects.filter(p => 
                                                p.title?.toLowerCase().includes(projectFilterSearch.toLowerCase()) || 
                                                p.client?.name?.toLowerCase().includes(projectFilterSearch.toLowerCase()) ||
                                                p.client?.company_name?.toLowerCase().includes(projectFilterSearch.toLowerCase())
                                            ).map(p => (
                                                <div 
                                                    key={p.id} 
                                                    onClick={() => { setProjectFilter(p.id); setShowProjectFilterDropdown(false); setProjectFilterSearch(""); }}
                                                    className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-gray-50 ${projectFilter == p.id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                >
                                                    <div className="font-semibold text-gray-800">{p.title}</div>
                                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                                        <i className="fa-solid fa-user mr-1"></i> {p.client?.name || 'No Client'} {p.client?.company_name ? <span className="ml-1 text-gray-400">({p.client.company_name})</span> : ''}
                                                        {p.status === 'completed' && <span className="ml-1 text-red-600">(Completed)</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

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

                            {/* Search */}
                            <div className="relative w-full sm:w-[220px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search title or vendor..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Project & Details</th>
                                    <th className="px-6 py-4">Vendor / Payee</th>
                                    <th className="px-6 py-4 text-right">Total Bill</th>
                                    <th className="px-6 py-4 text-right">Paid</th>
                                    <th className="px-6 py-4 text-right">Due</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => {
                                        const badgeClass = getPaymentStatusBadge(exp.payment_status);
                                        return (
                                            <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-500">
                                                    {project_expenses.from ? project_expenses.from + index : index + 1}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{exp.project?.title || 'N/A'}</div>
                                                    <div className="text-[12px] text-gray-500 mt-0.5">{exp.title}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-800">{exp.vendor?.name || '-'}</div>
                                                    <div className="text-[11.5px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                        {exp.account_id ? (
                                                            <><i className="fa-solid fa-building-columns text-blue-500"></i> {exp.account?.name || 'Account'}</>
                                                        ) : exp.advance_user_id ? (
                                                            <><i className="fa-solid fa-hand-holding-dollar text-emerald-500"></i> Advance</>
                                                        ) : (exp.paid_amount > 0 ? (
                                                            <><i className="fa-solid fa-wallet text-purple-500"></i> Vendor Wallet</>
                                                        ) : 'N/A')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-gray-900">{parseFloat(exp.total_bill).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{parseFloat(exp.paid_amount).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-rose-600">{parseFloat(exp.due_amount).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                                        {exp.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                            <button onClick={() => handleMoveToWallet(exp)} className="flex h-7 w-7 items-center justify-center rounded bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors" title="Move to Vendor Wallet">
                                                                <i className="fa-solid fa-money-bill-transfer text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('view_project_expense') && (
                                                            <button onClick={() => openViewModal(exp)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                                <i className="fa-regular fa-eye text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('edit_project_expense') && (
                                                            <button onClick={() => openEditModal(exp)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit">
                                                                <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                            </button>
                                                        )}
                                                        {hasPermission('delete_project_expense') && (
                                                            <button onClick={() => handleDelete(exp.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                                <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-3"></i>
                                                <p>No project expenses found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {project_expenses.from || 0} to {project_expenses.to || 0} of {project_expenses.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {project_expenses.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex min-w-[32px] items-center justify-center rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                                            ${link.active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : link.url ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'}
                                        `}
                                        preserveState
                                    >
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left text-[10px]"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right text-[10px]"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fas fa-file-invoice-dollar text-[var(--accent)]"></i> Expense Details
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div className="sm:col-span-2">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Expense Title</span>
                                    <div className="text-[18px] font-bold text-gray-900">{selectedExpense.title}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Project Name</span>
                                    <div className="font-medium text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-folder text-[var(--accent)]"></i> {selectedExpense.project?.title || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Vendor / Payee</span>
                                    <div className="font-medium text-gray-800 flex items-center gap-2">
                                        <i className="fa-solid fa-user-tie text-blue-500"></i> {selectedExpense.vendor?.name || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Payment Source</span>
                                    <div className="font-medium text-gray-800">
                                        {selectedExpense.account_id ? (
                                            <><i className="fa-solid fa-building-columns text-purple-500 mr-2"></i>{selectedExpense.account?.name}</>
                                        ) : selectedExpense.advance_user_id ? (
                                            <><i className="fa-solid fa-hand-holding-dollar text-emerald-500 mr-2"></i>Advance{selectedExpense.advance_user?.name ? ` (${selectedExpense.advance_user.name})` : ''}</>
                                        ) : (selectedExpense.paid_amount > 0 ? (
                                            <><i className="fa-solid fa-wallet text-purple-500 mr-2"></i>Vendor Wallet</>
                                        ) : "N/A")}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date</span>
                                    <div className="font-medium text-gray-800 flex items-center gap-2">
                                        <i className="fa-regular fa-calendar-days text-rose-500"></i> {selectedExpense.date || "-"}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Amounts Highlight Box */}
                            <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 border border-gray-200 rounded-xl mb-6">
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Bill</span>
                                    <div className="text-[18px] font-bold text-gray-900">TK. {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Paid Amount</span>
                                    <div className="text-[18px] font-bold text-emerald-600">TK. {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Due Amount</span>
                                    <div className="text-[18px] font-bold text-rose-600">TK. {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Remarks / Description</span>
                                <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 text-[14px] text-gray-700 leading-relaxed min-h-[80px] whitespace-pre-line">
                                    {selectedExpense.description || <span className="text-gray-400 italic">No remarks provided.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2 text-[14px] font-medium text-white transition-colors hover:bg-gray-900">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[95vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-[18px] font-semibold text-[#202223]">
                                {editMode ? "📝 Update Bill/Expense" : "✨ Log New Bill/Expense"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {errors.error && (
                            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[14px] text-red-700 shrink-0">
                                <i className="fa-solid fa-triangle-exclamation"></i> {errors.error}
                            </div>
                        )}
                        
                        {/* Body */}
                        <div onClick={closeAllDropdowns} className="p-6 overflow-y-auto flex-1 brass-scroll">
                            <form id="expenseForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {/* ROW 1: Project, Category, Payment Source */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    
                                    {/* 1. PROJECT DROPDOWN */}
                                    <div className="relative">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Project *</label>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowProjectDropdown(!showProjectDropdown); }} 
                                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:ring-1 focus:ring-[var(--accent)]/50 ${data.project_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                        >
                                            <span className="truncate flex-1">
                                                {data.project_id 
                                                    ? (() => {
                                                        const p = projects.find(x => x.id == data.project_id);
                                                        return p ? (
                                                            <>
                                                                {p.title} <span className="text-[12px] text-gray-500 font-normal ml-1">({p.client?.name || 'No Client'}{p.client?.company_name ? ` - ${p.client.company_name}` : ''})</span>
                                                            </>
                                                        ) : "Choose Project";
                                                    })()
                                                    : "Choose Project"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showProjectDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                        </div>
                                        {showProjectDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-1 flex max-h-[200px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                                <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                    <input type="text" placeholder="Search project or client/company..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                </div>
                                                <div className="overflow-y-auto py-1">
                                                    {projects.filter(p => (
                                                        p.title?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                        p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                                        p.client?.company_name?.toLowerCase().includes(projectSearch.toLowerCase())
                                                    ) && (editMode || p.status !== 'completed')).length > 0 ? (
                                                        projects.filter(p => (
                                                            p.title?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                            p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                                            p.client?.company_name?.toLowerCase().includes(projectSearch.toLowerCase())
                                                        ) && (editMode || p.status !== 'completed')).map(p => (
                                                            <div 
                                                                key={p.id} 
                                                                onClick={() => { setData("project_id", p.id); setShowProjectDropdown(false); setProjectSearch(""); }} 
                                                                className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.project_id == p.id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                            >
                                                                <div className="font-semibold text-gray-800">{p.title}</div>
                                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                                    <i className="fa-solid fa-user mr-1"></i> {p.client?.name || 'No Client'} {p.client?.company_name ? <span className="ml-1 text-gray-400">({p.client.company_name})</span> : ''}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (<div className="p-3 text-center text-[13px] text-gray-400">No active project found.</div>)}
                                                </div>
                                            </div>
                                        )}
                                        {errors.project_id && <p className="mt-1 text-[12px] text-red-500">{errors.project_id}</p>}
                                    </div>

                                    {/* 2. CATEGORY DROPDOWN */}
                                    <div className="relative">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Expense Category *</label>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowCategoryDropdown(!showCategoryDropdown); }} 
                                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:ring-1 focus:ring-[var(--accent)]/50 ${data.expense_category_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                        >
                                            <span className="truncate flex-1">
                                                {data.expense_category_id ? (categories.find(c => c.id == data.expense_category_id)?.name || "Unknown") : "Choose Category"}
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showCategoryDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                        </div>
                                        {showCategoryDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-1 flex max-h-[200px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                                <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                    <input type="text" placeholder="Search category..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                </div>
                                                <div className="overflow-y-auto py-1">
                                                    {categories.filter(c => c.name?.toLowerCase().includes(categorySearch.toLowerCase())).length > 0 ? (
                                                        categories.filter(c => c.name?.toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                                                            <div 
                                                                key={c.id} 
                                                                onClick={() => { setData("expense_category_id", c.id); setShowCategoryDropdown(false); setCategorySearch(""); }} 
                                                                className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.expense_category_id == c.id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                            >
                                                                {c.name}
                                                            </div>
                                                        ))
                                                    ) : (<div className="p-3 text-center text-[13px] text-gray-400">No category found.</div>)}
                                                </div>
                                            </div>
                                        )}
                                        {errors.expense_category_id && <p className="mt-1 text-[12px] text-red-500">{errors.expense_category_id}</p>}
                                    </div>

                                    {/* 3. PAYMENT SOURCE */}
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[13px] font-semibold text-gray-700">Payment Source</label>
                                            <div className="flex gap-2.5 text-[11px] font-medium">
                                                <label className="flex cursor-pointer items-center gap-1.5">
                                                    <input type="radio" name="payType" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} className="accent-[var(--accent)]" />
                                                    Bank/Cash
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-1.5">
                                                    <input type="radio" name="payType" checked={data.pay_type === 'advance'} onChange={() => { setData('pay_type', 'advance'); setData('account_id', ''); }} className="accent-[var(--accent)]" />
                                                    Advance
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-1.5 text-purple-700">
                                                    <input type="radio" name="payType" checked={data.pay_type === 'wallet'} onChange={() => { setData('pay_type', 'wallet'); setData('account_id', ''); setData('advance_user_id', ''); }} className="accent-purple-600" />
                                                    Wallet
                                                </label>
                                            </div>
                                        </div>

                                        {data.pay_type === 'account' && (
                                            <>
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowAccountDropdown(!showAccountDropdown); }} 
                                                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:ring-1 focus:ring-[var(--accent)]/50 ${data.account_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                                >
                                                    <span className="truncate flex-1">
                                                        {data.account_id ? (() => {
                                                            const acc = accounts.find(a => a.id == data.account_id);
                                                            return acc ? `${acc.name} (Bal: ${acc.current_balance})` : "Unknown";
                                                        })() : "Select Account"}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${showAccountDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                                </div>
                                                {showAccountDropdown && (
                                                    <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-1 flex max-h-[200px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                                        <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                            <input type="text" placeholder="Search account..." value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                        </div>
                                                        <div className="overflow-y-auto py-1">
                                                            {accounts.filter(a => a.name?.toLowerCase().includes(accountSearch.toLowerCase())).length > 0 ? (
                                                                accounts.filter(a => a.name?.toLowerCase().includes(accountSearch.toLowerCase())).map(a => (
                                                                    <div 
                                                                        key={a.id} 
                                                                        onClick={() => { setData("account_id", a.id); setShowAccountDropdown(false); setAccountSearch(""); }} 
                                                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.account_id == a.id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                                    >
                                                                        {a.name} <span className="text-[12px] text-gray-500 ml-1">(Bal: {a.current_balance})</span>
                                                                    </div>
                                                                ))
                                                            ) : (<div className="p-3 text-center text-[13px] text-gray-400">No account found.</div>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.account_id && <p className="mt-1 text-[12px] text-red-500">{errors.account_id}</p>}
                                            </>
                                        )}

                                        {data.pay_type === 'advance' && (
                                            <>
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowAdvanceDropdown(!showAdvanceDropdown); }} 
                                                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:ring-1 focus:ring-[var(--accent)]/50 ${data.advance_user_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                                >
                                                    <span className="truncate flex-1">
                                                        {data.advance_user_id ? (() => {
                                                            const adv = advances.find(a => a.user_id == data.advance_user_id);
                                                            return adv ? `${adv.user?.name} (Rem: ${adv.balance})` : "Unknown";
                                                        })() : "Select Advance"}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${showAdvanceDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                                </div>
                                                {showAdvanceDropdown && (
                                                    <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-1 flex max-h-[200px] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                                                        <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                            <input type="text" placeholder="Search advance..." value={advanceSearch} onChange={(e) => setAdvanceSearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                        </div>
                                                        <div className="overflow-y-auto py-1">
                                                            {advances.filter(a => a.user?.name?.toLowerCase().includes(advanceSearch.toLowerCase())).length > 0 ? (
                                                                advances.filter(a => a.user?.name?.toLowerCase().includes(advanceSearch.toLowerCase())).map(a => (
                                                                    <div 
                                                                        key={a.user_id} 
                                                                        onClick={() => { setData("advance_user_id", a.user_id); setShowAdvanceDropdown(false); setAdvanceSearch(""); }} 
                                                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.advance_user_id == a.user_id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                                    >
                                                                        {a.user?.name} <span className="text-[12px] text-gray-500 ml-1">(Rem: {a.balance})</span>
                                                                    </div>
                                                                ))
                                                            ) : (<div className="p-3 text-center text-[13px] text-gray-400">No active advance found.</div>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.advance_user_id && <p className="mt-1 text-[12px] text-red-500">{errors.advance_user_id}</p>}
                                            </>
                                        )}

                                        {data.pay_type === 'wallet' && (
                                            <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2.5 text-[13px] font-medium text-purple-700">
                                                <i className="fa-solid fa-wallet"></i>
                                                {data.vendor_id ? (
                                                    <span>Available Wallet: <strong>{vendorList.find(v => v.id == data.vendor_id)?.wallet_balance || 0} BDT</strong></span>
                                                ) : (
                                                    <span>Please select a vendor below first.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ROW 2: Title & Vendor */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Expense Title / Subject *</label>
                                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" placeholder="e.g., Domain Purchase" required />
                                    </div>
                                    
                                    {/* 4. VENDOR DROPDOWN */}
                                    <div className="relative">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Vendor / Contractor Name</label>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowVendorDropdown(!showVendorDropdown); }} 
                                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-shadow hover:bg-gray-50 focus:ring-1 focus:ring-[var(--accent)]/50 ${data.vendor_id ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-300 bg-white text-gray-500'}`}
                                        >
                                            <span className="truncate flex-1">
                                                {data.vendor_id 
                                                    ? (() => {
                                                        const v = vendorList.find(vd => vd.id == data.vendor_id);
                                                        return v ? `${v.name} ${v.company_name ? `(${v.company_name})` : ''}` : "Choose Vendor";
                                                    })()
                                                    : "Search & Select Vendor"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showVendorDropdown ? 'up' : 'down'} text-[10px] text-gray-400 shrink-0 ml-2`}></i>
                                        </div>
                                        {showVendorDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} className={`absolute top-full left-0 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg z-50 ${showAddVendorForm ? '' : 'max-h-[250px]'}`}>
                                                {!showAddVendorForm && (
                                                    <div className="border-b border-gray-100 bg-gray-50 p-2 shrink-0">
                                                        <input type="text" placeholder="Search vendor..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                    </div>
                                                )}

                                                {showAddVendorForm ? (
                                                    <div className="p-4 bg-gray-50/50">
                                                        <div className="mb-3 text-[13px] font-bold text-gray-700 flex items-center gap-2">
                                                            <i className="fa-solid fa-user-plus text-[var(--accent)]"></i> New Vendor
                                                        </div>
                                                        <input type="text" placeholder="Vendor name *" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]" autoFocus />
                                                        <input type="text" placeholder="Company name (optional)" value={newVendor.company_name} onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })} className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]" />
                                                        <input type="text" placeholder="Phone (optional)" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]" />
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={handleCreateVendor} disabled={creatingVendor} className="flex-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#b08630] disabled:opacity-70">
                                                                {creatingVendor ? "Saving..." : "Save & Select"}
                                                            </button>
                                                            <button type="button" onClick={() => { setShowAddVendorForm(false); setNewVendor({ name: '', company_name: '', phone: '' }); }} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div 
                                                            onClick={() => setShowAddVendorForm(true)}
                                                            className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3.5 py-2.5 text-[13px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-bg)]"
                                                        >
                                                            <i className="fa-solid fa-plus"></i> Create New Vendor
                                                        </div>
                                                        <div className="overflow-y-auto py-1">
                                                            <div onClick={() => { setData("vendor_id", ""); setShowVendorDropdown(false); }} className="cursor-pointer border-b border-gray-50 px-3.5 py-2 text-[13.5px] text-gray-400 hover:bg-gray-50">
                                                                -- No Vendor --
                                                            </div>
                                                            {vendorList.filter(v => v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) || v.company_name?.toLowerCase().includes(vendorSearch.toLowerCase())).length > 0 ? (
                                                                vendorList.filter(v => v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) || v.company_name?.toLowerCase().includes(vendorSearch.toLowerCase())).map(v => (
                                                                    <div 
                                                                        key={v.id} 
                                                                        onClick={() => { setData("vendor_id", v.id); setShowVendorDropdown(false); setVendorSearch(""); }} 
                                                                        className={`cursor-pointer px-3.5 py-2 text-[13.5px] hover:bg-gray-50 ${data.vendor_id == v.id ? 'bg-[var(--accent-bg)]' : ''}`}
                                                                    >
                                                                        {v.name} {v.company_name ? <span className="ml-1 text-[11px] text-gray-400">({v.company_name})</span> : ''}
                                                                    </div>
                                                                ))
                                                            ) : (<div className="p-3 text-center text-[13px] text-gray-400">No vendor found.</div>)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {errors.vendor_id && <p className="mt-1 text-[12px] text-red-500">{errors.vendor_id}</p>}
                                    </div>
                                </div>

                                {/* ROW 3: Financials */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-800 mb-1.5">Total Bill (BDT) *</label>
                                        <input type="number" step="0.01" value={data.total_bill} onChange={e => setData('total_bill', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] font-bold text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" required />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-emerald-600 mb-1.5">Paid Amount (BDT)</label>
                                        <input type="number" step="0.01" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} className="w-full rounded-lg border border-emerald-300 bg-white px-3.5 py-2.5 text-[15px] font-bold text-emerald-600 outline-none transition-shadow focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50" required />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-red-600 mb-1.5">Calculated Due</label>
                                        <input type="text" value={calculateDue()} disabled className="w-full rounded-lg border border-red-200 bg-red-50/50 px-3.5 py-2.5 text-[15px] font-bold text-red-600 outline-none" />
                                        <div className="mt-1.5 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Status: {calculateStatus()}</div>
                                    </div>
                                </div>

                                {/* RETURN CASH UI */}
                                {isOverpaid && data.pay_type === 'account' && (
                                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
                                        <div className="text-[14px] font-bold text-amber-800 flex items-center gap-2">
                                            <i className="fa-solid fa-coins"></i> Received Change: BDT {overpaymentAmount.toLocaleString('en-IN')}
                                        </div>
                                        <div className="text-[12.5px] text-amber-700">Where should this returned cash be deposited?</div>

                                        <div className="relative">
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowReturnAccountDropdown(!showReturnAccountDropdown); }} 
                                                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-amber-300 bg-white px-3.5 py-2.5 text-[14px] outline-none"
                                            >
                                                <span className="font-semibold text-amber-900">
                                                    {data.return_account_id ? accounts.find(a => a.id == data.return_account_id)?.name || "Select Cash Box" : "Select Cash Box *"}
                                                </span>
                                                <i className={`fa-solid fa-chevron-${showReturnAccountDropdown ? 'up' : 'down'} text-[10px] text-amber-600 shrink-0 ml-2`}></i>
                                            </div>
                                            {showReturnAccountDropdown && (
                                                <div onClick={(e) => e.stopPropagation()} className="absolute bottom-full left-0 mb-1 flex max-h-[200px] w-full flex-col overflow-y-auto rounded-lg border border-amber-300 bg-white shadow-lg z-50">
                                                    {accounts.map(a => (
                                                        <div 
                                                            key={a.id} 
                                                            onClick={() => { setData("return_account_id", a.id); setShowReturnAccountDropdown(false); }} 
                                                            className="cursor-pointer border-b border-amber-50 px-3.5 py-2 text-[13.5px] text-gray-700 hover:bg-amber-50"
                                                        >
                                                            {a.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ROW 4: Date & Description */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="md:col-span-1">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Date *</label>
                                        <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Remarks / Notes</label>
                                        <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" placeholder="Optional notes..." />
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                Dismiss
                            </button>
                            <button type="submit" form="expenseForm" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70">
                                {processing ? "Saving Changes..." : "Commit Expense"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}