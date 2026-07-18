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

    // Toolbar Filters
    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => Number(new URLSearchParams(window.location.search).get("per_page")) || 10);
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
        advance_user_id: '', 
        title: '', 
        vendor_id: '', 
        total_bill: '',
        paid_amount: 0,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        pay_type: 'account' // Added Pay Type state for Vendor Wallet handling
    });

    // Close all dropdowns when clicking outside
    const closeAllDropdowns = () => {
        setShowProjectDropdown(false);
        setShowCategoryDropdown(false);
        setShowAccountDropdown(false);
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

    // --- Auto Calculate Due & Status in UI ---
    const calculateDue = () => {
        const bill = parseFloat(data.total_bill) || 0;
        const paid = parseFloat(data.paid_amount) || 0;
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

    // --- Export Tools ---
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
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; }
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

    // --- Modals ---
    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            project_id: '',
            expense_category_id: '',
            advance_id: '',
            advance_user_id: '',
            account_id: '',
            title: '',
            vendor_id: '',
            description: '',
            total_bill: 0,
            paid_amount: 0,        
            due_amount: 0,
            amount: 0,
            discount_amount: 0,
            payment_status: 'due', 
            date: new Date().toISOString().slice(0, 10), 
            attachment: null,
            pay_type: 'account' // Default 
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
            id: expense.id, 
            project_id: expense.project_id || '',
            expense_category_id: expense.expense_category_id || '',
            account_id: expense.account_id || '', 
            advance_user_id: expense.advance_user_id || '',
            title: expense.title || '', 
            vendor_id: expense.vendor_id || '',
            total_bill: expense.total_bill || '',
            paid_amount: expense.paid_amount || '',
            date: expense.date || '',
            description: expense.description || '',
            pay_type: payType
        });
        setEditMode(true); 
        closeAllDropdowns();
        setShowModal(true);
    };

    const openViewModal = (expense) => {
        setSelectedExpense(expense);
        setShowViewModal(true);
    };

    // --- Actions ---
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!data.project_id) return Swal.fire("Required", "Please select a project.", "warning");
        if (!data.expense_category_id) return Swal.fire("Required", "Please select an expense category.", "warning");
        
        // Added Validation for Vendor Wallet
        const paidAmount = parseFloat(data.paid_amount) || 0;
        if (paidAmount > 0) {
            if (data.pay_type === 'account' && !data.account_id) return Swal.fire("Required", "Please select a Bank/Cash Account.", "warning");
            if (data.pay_type === 'advance' && !data.advance_user_id) return Swal.fire("Required", "Please select an Advance User.", "warning");
            if (data.pay_type === 'wallet' && !data.vendor_id) return Swal.fire("Required", "Please select a Vendor to pay from Wallet.", "warning");
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

    // --- Move to Vendor Wallet Feature ---
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
        if (status === 'paid') return { bg: '#dcfce7', text: '#15803d' };
        if (status === 'partial') return { bg: '#fef08a', text: '#a16207' };
        return { bg: '#fee2e2', text: '#b91c1c' };
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
    const filteredProjectTitle = filteredProject ? `${filteredProject.title} (${filteredProject.client?.name || 'No Client'})` : null;

    return (
        <AdminLayout>
            <Head title="Project Expenses & Payables" />
            
            <div className="slider-page-wrapper" style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
                
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>Project Accounts Payable</h1>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
                            {filteredProjectTitle
                                ? <>Showing totals for <strong style={{color: '#3b82f6'}}>{filteredProjectTitle}</strong></>
                                : "Manage vendor bills and track project costs."}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', padding: '10px 16px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            Total Billed: <span style={{ fontSize: '16px' }}>BDT {totalBilled.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8', padding: '10px 16px', background: '#dbeafe', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                            Total Paid: <span style={{ fontSize: '16px' }}>BDT {totalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#b91c1c', padding: '10px 16px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            Total Due: <span style={{ fontSize: '16px' }}>BDT {totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div className="card-container" style={{ background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", border: "1px solid #e2e8f0" }}>
                    
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                        <div className="card-title" style={{ fontSize: "1.125rem", fontWeight: "600", color: "#334155" }}>
                            <i className="fa-solid fa-wallet" style={{ marginRight: "8px", color: "#3b82f6" }}></i> Vendor Bills & Project Cost
                        </div>
                        {hasPermission('create_project_expenses') && (
                        <button onClick={openCreateModal} className="add-btn" style={{ background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="fa-solid fa-plus"></i> Log Bill/Expense
                        </button>
                        )}
                    </div>

                    <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 24px", background: "#f8fafc" }}>
                        <div className="show-entries" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            Show 
                            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                            </select>
                        </div>

                        {/* --- Year Filter --- */}
                        <div className="year-filter" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.875rem" }}>
                            <i className="fa-solid fa-calendar" style={{ color: "#3b82f6" }}></i>
                            <select 
                                value={yearFilter} 
                                onChange={(e) => { setYearFilter(e.target.value); if (e.target.value) { setDateFrom(""); setDateTo(""); } }} 
                                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "0.875rem", color: "#334155" }}
                            >
                                <option value="">All Years</option>
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* --- Date Range Filter --- */}
                        <div className="date-range-filter" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontSize: "0.875rem" }}>
                            <i className="fa-regular fa-calendar-days" style={{ color: "#3b82f6" }}></i>
                            <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={(e) => { setDateFrom(e.target.value); if (e.target.value) setYearFilter(""); }} 
                                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", color: "#334155" }} 
                            />
                            <span style={{ color: "#94a3b8" }}>–</span>
                            <input 
                                type="date" 
                                value={dateTo} 
                                onChange={(e) => { setDateTo(e.target.value); if (e.target.value) setYearFilter(""); }} 
                                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", color: "#334155" }} 
                            />
                            {(dateFrom || dateTo) && (
                                <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} title="Clear date range" style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

                        {/* --- Table Searchable Project Filter --- */}
                        <div className="project-filter" style={{ position: "relative", width: "280px" }} ref={filterRef}>
                            <div 
                                onClick={() => setShowProjectFilterDropdown(!showProjectFilterDropdown)}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "0.875rem", color: projectFilter ? "#0f172a" : "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    <i className="fa-solid fa-folder-open" style={{ color: "#3b82f6" }}></i>
                                    {filteredProjectTitle || "All Projects (Total)"}
                                </span>
                                {projectFilter ? (
                                    <i className="fa-solid fa-times" style={{ color: "#ef4444" }} onClick={(e) => { e.stopPropagation(); setProjectFilter(""); }}></i>
                                ) : (
                                    <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.75rem" }}></i>
                                )}
                            </div>
                            
                            {showProjectFilterDropdown && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxHeight: "250px", display: "flex", flexDirection: "column" }}>
                                    <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search project or client..." 
                                            value={projectFilterSearch}
                                            onChange={(e) => setProjectFilterSearch(e.target.value)}
                                            style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }}
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                        <div 
                                            onClick={() => { setProjectFilter(""); setShowProjectFilterDropdown(false); }}
                                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem", color: "#334155" }}
                                            onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                                            onMouseLeave={(e) => e.target.style.background = "transparent"}
                                        >
                                            All Projects (Total)
                                        </div>
                                        {projects.filter(p => p.title?.toLowerCase().includes(projectFilterSearch.toLowerCase()) || p.client?.name?.toLowerCase().includes(projectFilterSearch.toLowerCase())).map(p => (
                                            <div 
                                                key={p.id} 
                                                onClick={() => { setProjectFilter(p.id); setShowProjectFilterDropdown(false); setProjectFilterSearch(""); }}
                                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem", color: "#334155", background: projectFilter == p.id ? "#f0fdf4" : "transparent" }}
                                                onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                                                onMouseLeave={(e) => e.target.style.background = projectFilter == p.id ? "#f0fdf4" : "transparent"}
                                            >
                                                <div style={{ fontWeight: '600' }}>{p.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    <i className="fa-solid fa-user me-1"></i> {p.client?.name || 'No Client'}
                                                    {p.status === 'completed' && <span style={{ color: '#dc2626', marginLeft: '4px' }}>(Completed)</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="export-buttons" style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={handleCopy} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-copy text-blue-500"></i> Copy
                            </button>
                            <button type="button" onClick={handleExportCSV} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-file-excel text-emerald-500"></i> CSV
                            </button>
                            <button type="button" onClick={handlePrint} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                                <i className="fas fa-print text-slate-500"></i> Print
                            </button>
                        </div>

                        <div className="search-box" style={{ position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                            <input type="text" placeholder="Search title or vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px 12px 8px 36px", width: "260px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.875rem" }} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table id="printable-table" className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", width: "60px" }}>SL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>DATE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>PROJECT & DETAILS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>VENDOR / PAYEE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>TOTAL BILL</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>PAID</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>DUE</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "center" }}>STATUS</th>
                                    <th style={{ padding: "14px 24px", fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: "#334155", fontSize: "0.915rem" }}>
                                {expList.length > 0 ? (
                                    expList.map((exp, index) => {
                                        const badge = getPaymentStatusBadge(exp.payment_status);
                                        return (
                                            <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 24px", color: "#64748b", fontWeight: "500" }}>
                                                    {project_expenses.from ? project_expenses.from + index : index + 1}
                                                </td>
                                                <td style={{ padding: "16px 24px", fontSize: '0.875rem', color: "#475569" }}>{exp.date}</td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{exp.project?.title || 'N/A'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{exp.title}</div>
                                                </td>
                                                <td style={{ padding: "16px 24px" }}>
                                                    <div style={{ fontWeight: '500', color: '#334155' }}>{exp.vendor?.name || '-'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                        {exp.account_id ? (
                                                            <><i className="fa-solid fa-building-columns me-1"></i> {exp.account?.name || 'Account'}</>
                                                        ) : exp.advance_user_id ? (
                                                            <><i className="fa-solid fa-hand-holding-dollar me-1"></i> Advance</>
                                                        ) : (exp.paid_amount > 0 ? (
                                                            <><i className="fa-solid fa-wallet text-purple-500 me-1"></i> Vendor Wallet</>
                                                        ) : 'N/A')}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{parseFloat(exp.total_bill).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>{parseFloat(exp.paid_amount).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>{parseFloat(exp.due_amount).toLocaleString('en-IN')}</td>
                                                <td style={{ padding: "16px 24px", textAlign: 'center' }}>
                                                    <span style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        {exp.payment_status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                                        {hasPermission('edit_project_expense') && exp.vendor_id && parseFloat(exp.paid_amount) > 0 && (
                                                            <button onClick={() => handleMoveToWallet(exp)} style={{ background: "#f3e8ff", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#7e22ce" }} title="Move to Vendor Wallet"><i className="fa-solid fa-money-bill-transfer"></i></button>
                                                        )}
                                                        {hasPermission('view_project_expense') && (
                                                        <button onClick={() => openViewModal(exp)} style={{ background: "#f0fdf4", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#16a34a" }} title="View"><i className="fa-regular fa-eye"></i></button>
                                                        )}
                                                        {hasPermission('edit_project_expense') && (
                                                        <button onClick={() => openEditModal(exp)} style={{ background: "#f1f5f9", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#0f172a" }} title="Edit"><i className="fa-regular fa-pen-to-square"></i></button>
                                                        )}
                                                        {hasPermission('delete_project_expense') && (
                                                        <button onClick={() => handleDelete(exp.id)} style={{ background: "#fee2e2", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", color: "#ef4444" }} title="Delete"><i className="fa-regular fa-trash-can"></i></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No project expenses found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {project_expenses.links && project_expenses.links.length > 3 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Showing {project_expenses.from || 0} to {project_expenses.to || 0} of {project_expenses.total || 0} entries</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {project_expenses.links.map((link, index) => (
                                    <Link key={index} href={link.url || "#"} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", color: link.active ? "#fff" : (link.url ? "#334155" : "#94a3b8"), backgroundColor: link.active ? "#2563eb" : (link.url ? "#fff" : "#f1f5f9"), pointerEvents: link.url ? "auto" : "none", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px" }} preserveState>
                                        {link.label.includes("Previous") ? <i className="fa-solid fa-chevron-left"></i> : link.label.includes("Next") ? <i className="fa-solid fa-chevron-right"></i> : link.label.replace("&laquo;", "").replace("&raquo;", "")}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedExpense && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "650px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                <i className="fas fa-file-invoice-dollar"></i> Expense Details
                            </h3>
                            <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                                <div style={{ gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Expense Title</span>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedExpense.title}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Project Name</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-folder text-blue-500" style={{ marginRight: "6px" }}></i>{selectedExpense.project?.title || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Vendor / Payee</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}><i className="fa-solid fa-user-tie text-amber-500" style={{ marginRight: "6px" }}></i>{selectedExpense.vendor?.name || "N/A"}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Payment Source</span>
                                    <div style={{ fontWeight: "600", color: "#334155" }}>
                                        {selectedExpense.account_id ? (
                                            <><i className="fa-solid fa-building-columns text-purple-500" style={{ marginRight: "6px" }}></i>{selectedExpense.account?.name}</>
                                        ) : selectedExpense.advance_user_id ? (
                                            <><i className="fa-solid fa-hand-holding-dollar text-teal-500" style={{ marginRight: "6px" }}></i>Paid via Advance{selectedExpense.advance_user?.name ? ` (${selectedExpense.advance_user.name})` : ''}</>
                                        ) : (selectedExpense.paid_amount > 0 ? (
                                            <><i className="fa-solid fa-wallet text-purple-500" style={{ marginRight: "6px" }}></i>Paid via Vendor Wallet</>
                                        ) : "N/A")}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Date</span>
                                    <div style={{ color: "#475569", fontWeight: "500" }}><i className="fa-regular fa-calendar-days text-rose-500" style={{ marginRight: "6px" }}></i>{selectedExpense.date || "-"}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Total Bill</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>TK. {parseFloat(selectedExpense.total_bill).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Paid Amount</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>TK. {parseFloat(selectedExpense.paid_amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Due Amount</span>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>TK. {parseFloat(selectedExpense.due_amount).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Remarks / Description</span>
                                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", minHeight: "60px", whiteSpace: "pre-line" }}>
                                    {selectedExpense.description || "No remarks provided."}
                                </div>
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                <button type="button" onClick={() => setShowViewModal(false)} style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div style={{ background: "#fff", width: "100%", maxWidth: "1000px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "95vh" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "18px 24px", background: "#f8fafc" }}>
                            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "600", color: "#1e293b" }}>
                                {editMode ? "📝 Update Bill/Expense" : "✨ Log New Bill/Expense"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        {errors.error && (
                            <div style={{ margin: "16px 24px 0", padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "6px" }}></i> {errors.error}
                            </div>
                        )}
                        
                        <div onClick={closeAllDropdowns} style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                                    
                                    {/* --- 1. PROJECT DROPDOWN --- */}
                                    <div style={{ gridColumn: "span 1", position: "relative", minWidth: 0 }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Select Project *</label>
                                        <div onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowProjectDropdown(!showProjectDropdown); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                            <span style={{ color: data.project_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, display: "block" }}>
                                                {data.project_id 
                                                    ? (() => {
                                                        const p = projects.find(x => x.id == data.project_id);
                                                        return p ? `${p.title} (${p.client?.name || 'No Client'})` : "Choose Project";
                                                    })()
                                                    : "Choose Project"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showProjectDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem", marginLeft: "5px", flexShrink: 0 }}></i>
                                        </div>
                                        {showProjectDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "200px", display: "flex", flexDirection: "column" }}>
                                                <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                    <input type="text" placeholder="Search project or client..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }} autoFocus />
                                                </div>
                                                <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                    {projects.filter(p => 
                                                        (p.title?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                         p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase())) &&
                                                        (editMode || p.status !== 'completed') 
                                                    ).length > 0 ? (
                                                        projects.filter(p => 
                                                            (p.title?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                             p.client?.name?.toLowerCase().includes(projectSearch.toLowerCase())) &&
                                                            (editMode || p.status !== 'completed')
                                                        ).map(p => (
                                                            <div key={p.id} onClick={() => { setData("project_id", p.id); setShowProjectDropdown(false); setProjectSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", background: data.project_id == p.id ? "#f0fdf4" : "transparent" }} onMouseEnter={(e) => e.target.style.background = "#f1f5f9"} onMouseLeave={(e) => e.target.style.background = data.project_id == p.id ? "#f0fdf4" : "transparent"}>
                                                                <div style={{ fontWeight: '600' }}>{p.title}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                    <i className="fa-solid fa-user me-1"></i> {p.client?.name || 'No Client'}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No active project found.</div>)}
                                                </div>
                                            </div>
                                        )}
                                        {errors.project_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.project_id}</p>}
                                    </div>

                                    {/* --- 2. CATEGORY DROPDOWN --- */}
                                    <div style={{ gridColumn: "span 1", position: "relative", minWidth: 0 }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Expense Category *</label>
                                        <div onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowCategoryDropdown(!showCategoryDropdown); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                            <span style={{ color: data.expense_category_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, display: "block" }}>
                                                {data.expense_category_id ? (categories.find(c => c.id == data.expense_category_id)?.name || "Unknown") : "Choose Category"}
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showCategoryDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }}></i>
                                        </div>
                                        {showCategoryDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "200px", display: "flex", flexDirection: "column" }}>
                                                <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                    <input type="text" placeholder="Search category..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }} autoFocus />
                                                </div>
                                                <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                    {categories.filter(c => c.name?.toLowerCase().includes(categorySearch.toLowerCase())).length > 0 ? (
                                                        categories.filter(c => c.name?.toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                                                            <div key={c.id} onClick={() => { setData("expense_category_id", c.id); setShowCategoryDropdown(false); setCategorySearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", background: data.expense_category_id == c.id ? "#f0fdf4" : "transparent" }} onMouseEnter={(e) => e.target.style.background = "#f1f5f9"} onMouseLeave={(e) => e.target.style.background = data.expense_category_id == c.id ? "#f0fdf4" : "transparent"}>
                                                                {c.name}
                                                            </div>
                                                        ))
                                                    ) : (<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No category found.</div>)}
                                                </div>
                                            </div>
                                        )}
                                        {errors.expense_category_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.expense_category_id}</p>}
                                    </div>

                                    {/* --- 3. PAYMENT SOURCE (Account vs Advance vs Wallet) --- */}
                                    <div style={{ gridColumn: "span 1", position: "relative", minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "6px" }}>
                                            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", margin: 0 }}>Payment Source</label>
                                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem' }}>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <input type="radio" name="payType" checked={data.pay_type === 'account'} onChange={() => { setData('pay_type', 'account'); setData('advance_user_id', ''); }} />
                                                    Bank/Cash
                                                </label>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <input type="radio" name="payType" checked={data.pay_type === 'advance'} onChange={() => { setData('pay_type', 'advance'); setData('account_id', ''); }} />
                                                    Advance
                                                </label>
                                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', color: '#7e22ce', fontWeight: 'bold' }}>
                                                    <input type="radio" name="payType" checked={data.pay_type === 'wallet'} onChange={() => { setData('pay_type', 'wallet'); setData('account_id', ''); setData('advance_user_id', ''); }} />
                                                    Wallet
                                                </label>
                                            </div>
                                        </div>

                                        {/* Dropdown for Main Account */}
                                        {data.pay_type === 'account' && (
                                            <>
                                                <div onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowAccountDropdown(!showAccountDropdown); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                                    <span style={{ color: data.account_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, display: "block" }}>
                                                        {data.account_id ? (() => {
                                                            const acc = accounts.find(a => a.id == data.account_id);
                                                            return acc ? `${acc.name} (Bal: ${acc.current_balance})` : "Unknown";
                                                        })() : "Select Account"}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${showAccountDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }}></i>
                                                </div>
                                                {showAccountDropdown && (
                                                    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "200px", display: "flex", flexDirection: "column" }}>
                                                        <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                            <input type="text" placeholder="Search account..." value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }} autoFocus />
                                                        </div>
                                                        <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                            {accounts.filter(a => a.name?.toLowerCase().includes(accountSearch.toLowerCase())).length > 0 ? (
                                                                accounts.filter(a => a.name?.toLowerCase().includes(accountSearch.toLowerCase())).map(a => (
                                                                    <div key={a.id} onClick={() => { setData("account_id", a.id); setShowAccountDropdown(false); setAccountSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", background: data.account_id == a.id ? "#f0fdf4" : "transparent" }} onMouseEnter={(e) => e.target.style.background = "#f1f5f9"} onMouseLeave={(e) => e.target.style.background = data.account_id == a.id ? "#f0fdf4" : "transparent"}>
                                                                        {a.name} <span style={{color: '#64748b', fontSize: '0.8rem'}}>(Bal: {a.current_balance})</span>
                                                                    </div>
                                                                ))
                                                            ) : (<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No account found.</div>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.account_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.account_id}</p>}
                                            </>
                                        )}

                                        {/* Dropdown for Staff Advance */}
                                        {data.pay_type === 'advance' && (
                                            <>
                                                <div onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowAdvanceDropdown(!showAdvanceDropdown); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                                    <span style={{ color: data.advance_user_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, display: "block" }}>
                                                        {data.advance_user_id ? (() => {
                                                            const adv = advances.find(a => a.user_id == data.advance_user_id);
                                                            return adv ? `${adv.user?.name} (Rem: ${adv.balance})` : "Unknown";
                                                        })() : "Select Advance"}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${showAdvanceDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }}></i>
                                                </div>
                                                {showAdvanceDropdown && (
                                                    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: "200px", display: "flex", flexDirection: "column" }}>
                                                        <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                            <input type="text" placeholder="Search advance..." value={advanceSearch} onChange={(e) => setAdvanceSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }} autoFocus />
                                                        </div>
                                                        <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                            {advances.filter(a => a.user?.name?.toLowerCase().includes(advanceSearch.toLowerCase())).length > 0 ? (
                                                                advances.filter(a => a.user?.name?.toLowerCase().includes(advanceSearch.toLowerCase())).map(a => (
                                                                    <div key={a.user_id} onClick={() => { setData("advance_user_id", a.user_id); setShowAdvanceDropdown(false); setAdvanceSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", background: data.advance_user_id == a.user_id ? "#f0fdf4" : "transparent" }} onMouseEnter={(e) => e.target.style.background = "#f1f5f9"} onMouseLeave={(e) => e.target.style.background = data.advance_user_id == a.user_id ? "#f0fdf4" : "transparent"}>
                                                                        {a.user?.name} <span style={{color: '#64748b', fontSize: '0.8rem'}}>(Rem: {a.balance})</span>
                                                                    </div>
                                                                ))
                                                            ) : (<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No active advance found.</div>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.advance_user_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.advance_user_id}</p>}
                                            </>
                                        )}

                                        {/* Vendor Wallet Alert Box */}
                                        {data.pay_type === 'wallet' && (
                                            <div style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d8b4fe", background: "#faf5ff", color: "#7e22ce", fontSize: "0.8rem", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
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

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                                    <div style={{ gridColumn: "span 1" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Expense Title / Subject *</label>
                                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="e.g., Domain Purchase" required />
                                    </div>
                                    
                                    {/* --- 4. VENDOR DROPDOWN --- */}
                                    <div style={{ gridColumn: "span 1", position: "relative", minWidth: 0 }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Vendor / Contractor Name</label>
                                        <div onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowVendorDropdown(!showVendorDropdown); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                                            <span style={{ color: data.vendor_id ? "#0f172a" : "#94a3b8", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, display: "block" }}>
                                                {data.vendor_id 
                                                    ? (() => {
                                                        const v = vendorList.find(vd => vd.id == data.vendor_id);
                                                        return v ? `${v.name} ${v.company_name ? `(${v.company_name})` : ''}` : "Choose Vendor";
                                                    })()
                                                    : "Search & Select Vendor"
                                                }
                                            </span>
                                            <i className={`fa-solid fa-chevron-${showVendorDropdown ? 'up' : 'down'}`} style={{ color: "#94a3b8", fontSize: "0.8rem", flexShrink: 0 }}></i>
                                        </div>
                                        {showVendorDropdown && (
                                            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", maxHeight: showAddVendorForm ? "none" : "200px", display: "flex", flexDirection: "column" }}>
                                                {!showAddVendorForm && (
                                                    <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 }}>
                                                        <input type="text" placeholder="Search vendor..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem" }} autoFocus />
                                                    </div>
                                                )}

                                                {showAddVendorForm ? (
                                                    <div style={{ padding: "12px" }}>
                                                        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                                                            <i className="fa-solid fa-user-plus" style={{ marginRight: "6px", color: "#2563eb" }}></i> New Vendor
                                                        </div>
                                                        <input type="text" placeholder="Vendor name *" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem", marginBottom: "6px" }} autoFocus />
                                                        <input type="text" placeholder="Company name (optional)" value={newVendor.company_name} onChange={(e) => setNewVendor({ ...newVendor, company_name: e.target.value })} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem", marginBottom: "6px" }} />
                                                        <input type="text" placeholder="Phone (optional)" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.85rem", marginBottom: "10px" }} />
                                                        <div style={{ display: "flex", gap: "8px" }}>
                                                            <button type="button" onClick={handleCreateVendor} disabled={creatingVendor} style={{ flex: 1, background: "#2563eb", color: "#fff", border: "none", padding: "7px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "500", opacity: creatingVendor ? 0.7 : 1 }}>
                                                                {creatingVendor ? "Saving..." : "Save & Select"}
                                                            </button>
                                                            <button type="button" onClick={() => { setShowAddVendorForm(false); setNewVendor({ name: '', company_name: '', phone: '' }); }} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "7px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "0.8rem" }}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            onClick={() => setShowAddVendorForm(true)}
                                                            style={{ padding: "9px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#2563eb", fontWeight: "600", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "6px" }}
                                                            onMouseEnter={(e) => e.target.style.background = "#eff6ff"}
                                                            onMouseLeave={(e) => e.target.style.background = "transparent"}
                                                        >
                                                            <i className="fa-solid fa-plus"></i> Create New Vendor
                                                        </div>
                                                        <div style={{ overflowY: "auto", padding: "4px 0" }}>
                                                            <div onClick={() => { setData("vendor_id", ""); setShowVendorDropdown(false); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>
                                                                -- No Vendor --
                                                            </div>
                                                            {vendorList.filter(v => v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) || v.company_name?.toLowerCase().includes(vendorSearch.toLowerCase())).length > 0 ? (
                                                                vendorList.filter(v => v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) || v.company_name?.toLowerCase().includes(vendorSearch.toLowerCase())).map(v => (
                                                                    <div key={v.id} onClick={() => { setData("vendor_id", v.id); setShowVendorDropdown(false); setVendorSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", background: data.vendor_id == v.id ? "#f0fdf4" : "transparent" }} onMouseEnter={(e) => e.target.style.background = "#f1f5f9"} onMouseLeave={(e) => e.target.style.background = data.vendor_id == v.id ? "#f0fdf4" : "transparent"}>
                                                                        {v.name} {v.company_name ? <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({v.company_name})</span> : ''}
                                                                    </div>
                                                                ))
                                                            ) : (<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No vendor found.</div>)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {errors.vendor_id && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.vendor_id}</p>}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>Total Bill (BDT) *</label>
                                        <input type="number" step="0.01" value={data.total_bill} onChange={e => setData('total_bill', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontWeight: '600' }} required />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#16a34a", marginBottom: "6px" }}>
                                            Paid Amount (BDT)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.paid_amount}
                                            onChange={e => setData('paid_amount', e.target.value)}
                                            style={{
                                                width: "100%", 
                                                padding: "8px 12px", 
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1", 
                                                outline: "none", 
                                                fontWeight: '600',
                                                color: '#16a34a', 
                                                background: '#fff', 
                                                cursor: 'text' 
                                            }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#dc2626", marginBottom: "6px" }}>Calculated Due</label>
                                        <input type="text" value={calculateDue()} disabled style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: '#f1f5f9', fontWeight: 'bold', color: '#dc2626' }} />
                                        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.5px' }}>STATUS: {calculateStatus()}</div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginTop: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Date *</label>
                                        <input type="date" value={data.date} onChange={e => setData('date', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} required />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Remarks / Notes</label>
                                        <input type="text" value={data.description} onChange={e => setData('description', e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }} placeholder="Optional notes..." />
                                    </div>
                                </div>

                                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "500" }}>Dismiss</button>
                                    <button type="submit" disabled={processing} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", opacity: processing ? 0.7 : 1 }}>
                                        {processing ? "Saving Changes..." : "Commit Expense"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}