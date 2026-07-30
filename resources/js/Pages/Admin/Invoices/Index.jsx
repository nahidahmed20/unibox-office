import React, { useState, useEffect, useRef } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select'; 
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Index({ invoices = { data: [], links: [] }, clients = [], projects = [], nextInvoiceNumber }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);

    const [availableAdvance, setAvailableAdvance] = useState(0);

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(() => {
        const raw = new URLSearchParams(window.location.search).get("per_page");
        if (raw === "all") return "all";
        return raw ? Number(raw) : 10;
    });
    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: "",
        client_id: "",
        invoice_number: nextInvoiceNumber || "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        tax: 0,
        discount: 0,
        sub_total: 0,
        grand_total: 0,
        use_advance_amount: 0,
        status: "unpaid",
        notes: "",
        items: [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
    });

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
        singleValue: (provided) => ({ ...provided, color: "#111827", fontSize: "13.5px", fontWeight: "500" }),
        option: (provided, state) => ({
            ...provided, fontSize: "13.5px",
            backgroundColor: state.isSelected ? "var(--accent)" : state.isFocused ? "var(--accent-bg)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827", cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    const quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ],
    };

    // Updated Client Options to support searching by both Name and Company Name
    const clientOptions = clients.map(c => ({
        value: c.id,
        label: `${c.name} ${c.company_name || ''}`, // Hidden search string
        clientName: c.name,
        companyName: c.company_name,
        advance: Number(c.available_advance || 0)
    }));

    // Custom formatting for the Client Dropdown UI
    const formatClientLabel = (option, { context }) => {
        if (context === 'menu') {
            return (
                <div className="flex flex-col py-0.5">
                    <span className="font-bold text-gray-900">{option.clientName}</span>
                    {option.companyName && (
                        <span className="text-[11px] text-gray-500 mt-0.5">
                            <i className="fa-regular fa-building mr-1 text-[var(--accent)]"></i> {option.companyName}
                        </span>
                    )}
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900">{option.clientName}</span>
                {option.companyName && <span className="text-[12px] text-gray-500 font-normal">({option.companyName})</span>}
            </div>
        );
    };

    const statusOptions = [
        { value: "unpaid", label: "Unpaid" },
        { value: "partially_paid", label: "Partially Paid" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" }
    ];

    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({
        value: p.id,
        label: p.title
    }));

    const addItem = () => {
        setData("items", [...data.items, { project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
    };

    const removeItem = (index) => {
        const rows = [...data.items];
        rows.splice(index, 1);
        setData("items", rows);
    };

    const updateItem = (index, field, value) => {
        const rows = [...data.items];
        rows[index][field] = value;
        if (field === "quantity" || field === "unit_price") {
            rows[index].total = (Number(rows[index].quantity) || 0) * (Number(rows[index].unit_price) || 0);
        }
        setData("items", rows);
    };

    useEffect(() => {
        let subtotal = 0;
        data.items.forEach(item => { subtotal += Number(item.total); });
        
        const taxAmount = (subtotal * Number(data.tax)) / 100;
        const grand = subtotal + taxAmount - Number(data.discount);

        setData(prev => {
            let validAdvanceUsed = Number(prev.use_advance_amount) || 0;
            if (validAdvanceUsed > grand) validAdvanceUsed = grand;
            
            if (prev.sub_total !== subtotal || prev.grand_total !== grand || prev.use_advance_amount !== validAdvanceUsed) {
                return {
                    ...prev,
                    sub_total: subtotal,
                    grand_total: grand,
                    use_advance_amount: validAdvanceUsed
                };
            }
            return prev;
        });
    }, [data.items, data.tax, data.discount]); 

    const handleAdvanceChange = (e) => {
        let val = Number(e.target.value);
        if (val > data.grand_total) val = data.grand_total;
        if (val > availableAdvance) val = availableAdvance;
        setData("use_advance_amount", val);
    };

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delay = setTimeout(() => { 
            const params = {};
            if (searchTerm.trim()) params.search = searchTerm;
            if (perPage !== 10) params.per_page = perPage;
            router.get(route('admin.invoices.index'), params, { preserveState: true, replace: true }); 
        }, 400);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const openCreateModal = () => {
        clearErrors();
        setData({
            id: '',
            client_id: '',
            invoice_number: nextInvoiceNumber || '',
            invoice_date: new Date().toISOString().slice(0, 10),
            due_date: '', 
            sub_total: 0,
            tax: 0,
            discount: 0,
            grand_total: 0,
            use_advance_amount: 0,
            status: 'unpaid', 
            notes: '',
            items: [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
        });
        setAvailableAdvance(0);
        setEditMode(false);
        setShowModal(true);
    };
    
    const openEditModal = (inv) => {
        clearErrors(); 
        setEditingInvoice(inv);
        
        const advanceUsedByThisInvoice = Number(inv.advance_used) || 0;
        const selectedClient = clients.find(c => c.id === inv.client_id);
        const currentAvailable = selectedClient ? Number(selectedClient.available_advance || 0) : 0;
        
        setAvailableAdvance(currentAvailable + advanceUsedByThisInvoice);
        
        setData({ 
            id: inv.id,
            client_id: inv.client_id || '',
            invoice_number: inv.invoice_number || '',
            invoice_date: inv.invoice_date ? inv.invoice_date.slice(0, 10) : '',
            due_date: inv.due_date ? inv.due_date.slice(0, 10) : '',
            sub_total: inv.sub_total || 0,
            tax: inv.tax || 0,
            discount: inv.discount || 0,
            grand_total: inv.grand_total || 0,
            use_advance_amount: advanceUsedByThisInvoice,
            status: inv.status || 'unpaid',
            notes: inv.notes || '',
            items: inv.items?.length > 0
                ? inv.items.map(item => ({
                    project_id: item.project_id || "",
                    description: item.description || "",
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || 0,
                    total: item.total || 0,
                }))
                : [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
        });
        setEditMode(true); 
        setShowModal(true);
    };

    const openViewModal = (inv) => { 
        setSelectedInvoice(inv); 
        setShowViewModal(true); 
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.client_id) {
            return Swal.fire("Required", "Please select a client.", "warning");
        }

        const handleErrors = (errs) => {
            const firstError = Object.values(errs)[0];
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: firstError || 'Please check the form for errors.',
                confirmButtonColor: '#ef4444'
            });
        };

        if (editMode) {
            put(route('admin.invoices.update', data.id), { 
                onSuccess: () => { 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Updated Successfully!', timer: 1500, showConfirmButton: false }); 
                },
                onError: handleErrors
            });
        } else {
            post(route('admin.invoices.store'), { 
                onSuccess: () => { 
                    reset(); 
                    setShowModal(false); 
                    Swal.fire({ icon: 'success', title: 'Generated Successfully!', timer: 1500, showConfirmButton: false }); 
                },
                onError: handleErrors
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ 
            title: 'Delete Invoice?', 
            text: 'This will also restore any applied advance back to the client!', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete' 
        }).then((res) => { 
            if (res.isConfirmed) destroy(route('admin.invoices.destroy', id), { 
                preserveScroll: true,
                onSuccess: () => Swal.fire({ icon: "success", title: "Deleted & Refunded!", timer: 1500, showConfirmButton: false })
            }); 
        });
    };

    const getStatusStyle = (status) => {
        const styles = { 
            paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
            unpaid: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unpaid' },
            partially_paid: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partially Paid' },
            overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' }
        };
        return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    };

    const invList = invoices.data || [];

    return (
        <AdminLayout>
            <Head title="Invoices & Billing" />
            
            <style dangerouslySetInnerHTML={{__html: `
                .ql-editor { min-height: 120px; font-size: 14px; background: #fff; }
                .ql-toolbar { background: #f8fafc; border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
                .ql-container { border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
                
                /* Render HTML nicely in View Modal */
                .html-content-view ul { list-style-type: disc; padding-left: 20px; margin-bottom: 10px; }
                .html-content-view ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 10px; }
                .html-content-view p { margin-bottom: 8px; }
                .html-content-view p:last-child { margin-bottom: 0; }
            `}} />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Billing & Invoices</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage client invoices, monitor dues, and record payments.</p>
                    </div>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-file-invoice-dollar text-[var(--accent)]"></i> All Invoices
                        </div>
                        {hasPermission('create_invoice') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 shadow-sm">
                                <i className="fa-solid fa-plus"></i> Generate Invoice
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30">
                        <div className="flex items-center gap-3 text-[13.5px] text-gray-600">
                            <div className="flex items-center gap-2.5">
                                <span className="font-medium">Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[100px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer text-center"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value="all">All</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-[280px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input 
                                type="text" 
                                placeholder="Search INV # or Client/Company..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">INV #</th>
                                    <th className="px-6 py-4">Bill To (Client / Company)</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {invList.length > 0 ? invList.map((inv, index) => {
                                    const status = getStatusStyle(inv.status);
                                    return (
                                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {invoices.from ? invoices.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[var(--accent)]">{inv.invoice_number}</td>
                                            <td className="px-6 py-4">
                                                {inv.client?.company_name ? (
                                                    <div>
                                                        <span className="font-bold text-gray-900">{inv.client.company_name}</span>
                                                        <span className="block text-xs text-gray-500">Attn: {inv.client.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-semibold text-gray-900">{inv.client?.name || 'N/A'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{inv.invoice_date}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                TK. {parseFloat(inv.grand_total).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_invoices') && (
                                                        <button onClick={() => openViewModal(inv)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    <a 
                                                        href={route('admin.invoices.print', inv.id)} 
                                                        className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors" 
                                                        title="Print" 
                                                        target="_blank"
                                                    >
                                                        <i className="fa-solid fa-print text-[12px]"></i>
                                                    </a>
                                                    {hasPermission('edit_invoice') && (
                                                        <button onClick={() => openEditModal(inv)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Edit">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_invoice') && (
                                                        <button onClick={() => handleDelete(inv.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                                                            <i className="fa-regular fa-trash-can text-[12px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <i className="fa-solid fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                                                <p>No invoices found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {invoices.links && invoices.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {invoices.from || 0} to {invoices.to || 0} of {invoices.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {invoices.links.map((link, index) => (
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

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-[18px] font-semibold text-[#202223] flex items-center gap-2">
                                <i className="fa-solid fa-file-invoice text-[var(--accent)]"></i> Invoice Overview
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto brass-scroll bg-[#fafafa]">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-center mb-6">
                                    <div className="text-[36px] font-black text-gray-900">
                                        TK. {parseFloat(selectedInvoice.grand_total).toLocaleString('en-IN')}
                                    </div>
                                    <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[12px] font-bold uppercase tracking-wider mt-2 ${getStatusStyle(selectedInvoice.status).bg} ${getStatusStyle(selectedInvoice.status).text}`}>
                                        {getStatusStyle(selectedInvoice.status).label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-5 mb-8 bg-blue-50/50 p-5 rounded-xl border border-blue-100/50">
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Invoice Details</span>
                                        <div className="text-[16px] font-bold text-[var(--accent)]"># {selectedInvoice.invoice_number}</div>
                                        <div className="text-[13px] text-gray-600 mt-1">Issue: {selectedInvoice.invoice_date}</div>
                                        <div className="text-[13px] text-red-500 font-medium">Due: {selectedInvoice.due_date}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Billed To</span>
                                        <div className="font-bold text-gray-800 text-[15px]">
                                            {selectedInvoice.client?.company_name || selectedInvoice.client?.name || "N/A"}
                                        </div>
                                        {selectedInvoice.client?.company_name && (
                                            <div className="text-[13px] text-gray-500 mt-0.5">Attn: {selectedInvoice.client?.name}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-[15px] font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Line Items</h4>
                                    <div className="flex flex-col gap-4">
                                        {selectedInvoice.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start pb-4 border-b border-dashed border-gray-200 last:border-0 last:pb-0">
                                                <div className="flex-1 pr-6">
                                                    <div className="html-content-view text-[14px] text-gray-800" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                                    
                                                    {item.project && (
                                                        <span className="inline-block bg-gray-100 rounded px-2 py-1 text-[11px] text-gray-600 mt-2 font-medium">
                                                            <i className="fa-solid fa-briefcase mr-1"></i> {item.project.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="text-[13px] text-gray-500 mb-1">{item.quantity} x TK {item.unit_price}</div>
                                                    <strong className="text-[15px] text-gray-900 font-black">TK {item.total}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-5 border-t-2 border-gray-100">
                                    <div className="w-full sm:w-[320px] flex flex-col gap-3 text-[14px] text-gray-600">
                                        <div className="flex justify-between"><span>Sub Total:</span> <span className="font-semibold text-gray-900">TK {selectedInvoice.sub_total}</span></div>
                                        <div className="flex justify-between"><span>Tax:</span> <span className="font-semibold text-gray-900">{selectedInvoice.tax}%</span></div>
                                        <div className="flex justify-between"><span>Discount:</span> <span className="font-semibold text-red-500">- TK {selectedInvoice.discount}</span></div>
                                        
                                        <div className="flex justify-between border-t-2 border-gray-800 pt-3 mt-1 text-[18px] font-black text-gray-900">
                                            <span>Grand Total:</span> <span>TK {selectedInvoice.grand_total}</span>
                                        </div>
                                        
                                        {(Number(selectedInvoice.advance_used) > 0) && (
                                            <>
                                                <div className="flex justify-between text-[14px] font-bold text-emerald-600 mt-2 bg-emerald-50 px-3 py-2 rounded-lg">
                                                    <span>Advance Applied:</span> <span>- TK {Number(selectedInvoice.advance_used)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-dashed border-gray-300 pt-3 mt-1 text-[18px] font-black text-rose-600">
                                                    <span>Payable Due:</span> <span>TK {Number(selectedInvoice.grand_total) - Number(selectedInvoice.advance_used)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-gray-900 shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-[1200px] bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden border border-gray-200">
                        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
                            <h3 className="text-[20px] font-extrabold text-gray-800 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                                    <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-file-circle-plus'} text-lg`}></i>
                                </div>
                                {editMode ? "Update Invoice Details" : "Generate New Invoice"}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto brass-scroll flex-1 p-6 lg:p-8">
                            
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                                <h4 className="text-[15px] font-bold text-gray-800 mb-5 border-b pb-2">General Information</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div className="lg:col-span-2">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Bill To (Client / Company) *</label>
                                        <Select
                                            options={clientOptions}
                                            value={clientOptions.find(opt => opt.value === data.client_id) || null}
                                            formatOptionLabel={formatClientLabel} // <-- Added custom label formatter
                                            onChange={(selected) => {
                                                const clientId = selected ? selected.value : "";
                                                let advance = selected ? Number(selected.advance) : 0;
                                                let prevUsedAdvance = 0;
                                                if (editMode && editingInvoice && clientId === editingInvoice.client_id) {
                                                    prevUsedAdvance = Number(editingInvoice.advance_used || 0);
                                                    advance += prevUsedAdvance;
                                                }
                                                setAvailableAdvance(advance);
                                                setData(prev => ({
                                                    ...prev,
                                                    client_id: clientId,
                                                    use_advance_amount: prevUsedAdvance,
                                                    items: [{ project_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
                                                }));
                                            }}
                                            placeholder="Search by Client or Company Name..."
                                            isSearchable
                                            isClearable
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                        />
                                        {errors.client_id && <span className="mt-1 block text-[12px] text-red-500">{errors.client_id}</span>}
                                        
                                        {availableAdvance > 0 && (
                                            <div className="mt-2 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] text-emerald-700 font-medium">
                                                <i className="fa-solid fa-wallet mr-2"></i> Client Advance Balance: 
                                                <strong className="ml-1 text-[13px]">TK. {availableAdvance.toLocaleString('en-IN')}</strong>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Invoice Number *</label>
                                        <input 
                                            type="text" 
                                            value={data.invoice_number} 
                                            onChange={(e) => setData("invoice_number", e.target.value)} 
                                            readOnly={!editMode} 
                                            className={`w-full h-[42px] rounded-lg border border-gray-300 px-3.5 text-[14px] font-bold outline-none transition-shadow ${!editMode ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50'}`} 
                                        />
                                        {errors.invoice_number && <span className="mt-1 block text-[12px] text-red-500">{errors.invoice_number}</span>}
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Status *</label>
                                        <Select
                                            options={statusOptions}
                                            value={statusOptions.find(opt => opt.value === data.status) || null}
                                            onChange={(selected) => setData("status", selected ? selected.value : "")}
                                            isSearchable={false}
                                            styles={selectStyles}
                                            menuPosition="fixed"
                                        />
                                        {errors.status && <span className="mt-1 block text-[12px] text-red-500">{errors.status}</span>}
                                    </div>

                                    <div className="lg:col-span-2">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Invoice Date *</label>
                                        <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className="w-full h-[42px] rounded-lg border border-gray-300 bg-white px-3.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" required />
                                        {errors.invoice_date && <span className="mt-1 block text-[12px] text-red-500">{errors.invoice_date}</span>}
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Due Date *</label>
                                        <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full h-[42px] rounded-lg border border-gray-300 bg-white px-3.5 text-[14px] text-gray-900 outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" required />
                                        {errors.due_date && <span className="mt-1 block text-[12px] text-red-500">{errors.due_date}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                                <div className="flex items-center justify-between mb-5 border-b pb-2">
                                    <h4 className="text-[15px] font-bold text-gray-800">Line Items / Services</h4>
                                    <button type="button" onClick={addItem} className="flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                        <i className="fa-solid fa-plus"></i> Add Item
                                    </button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    {data.items.map((item, index) => (
                                        <div key={index} className="relative bg-gray-50/50 p-5 rounded-xl border border-gray-200 shadow-sm group">
                                            <button 
                                                type="button" 
                                                onClick={() => removeItem(index)} 
                                                disabled={data.items.length === 1} 
                                                className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg transition-all ${data.items.length === 1 ? 'text-gray-300 cursor-not-allowed bg-transparent' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white shadow-sm'}`}
                                                title="Remove Item"
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>

                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pr-10">
                                                <div className="lg:col-span-3">
                                                    <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-2">Select Project</label>
                                                    <Select
                                                        options={projectOptions}
                                                        value={projectOptions.find(opt => opt.value === item.project_id) || null}
                                                        onChange={(selected) => {
                                                            const projectId = selected ? selected.value : null; 
                                                            const selectedProject = projects.find(p => p.id === projectId);
                                                            
                                                            const rows = [...data.items];
                                                            rows[index].project_id = projectId;
                                                            
                                                            if (selectedProject) {
                                                                const unit = selectedProject.unit_type ? `(${selectedProject.unit_type})` : '';
                                                                const projTitle = `<strong>${selectedProject.title}</strong> ${unit}`.trim();
                                                                const projDesc = selectedProject.description ? `<br/>${selectedProject.description}` : '';
                                                                
                                                                rows[index].description = `${projTitle}${projDesc}`; 
                                                                
                                                                const qty = Number(selectedProject.quantity) || 1;
                                                                const budget = Number(selectedProject.budget) || 0;
                                                                
                                                                rows[index].quantity = qty;
                                                                rows[index].unit_price = budget > 0 ? Number((budget / qty).toFixed(2)) : 0; 
                                                                rows[index].total = budget;
                                                            } else {
                                                                rows[index].description = "";
                                                                rows[index].quantity = 1;
                                                                rows[index].unit_price = 0;
                                                                rows[index].total = 0;
                                                            }
                                                            setData("items", rows);
                                                        }}
                                                        placeholder="Optional..."
                                                        isSearchable
                                                        isClearable
                                                        styles={selectStyles}
                                                        menuPosition="fixed"
                                                    />
                                                    {errors[`items.${index}.project_id`] && <span className="mt-1 block text-[11px] text-red-500">{errors[`items.${index}.project_id`]}</span>}
                                                </div>

                                                <div className="lg:col-span-9">
                                                    <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-2">Item Description *</label>
                                                    <div className="rounded-lg border border-gray-300 overflow-hidden">
                                                        <ReactQuill 
                                                            theme="snow"
                                                            value={item.description}
                                                            onChange={(val) => updateItem(index, "description", val)}
                                                            modules={quillModules}
                                                            placeholder="Describe the service or product..."
                                                        />
                                                    </div>
                                                    {errors[`items.${index}.description`] && <span className="mt-1 block text-[11px] text-red-500">{errors[`items.${index}.description`]}</span>}
                                                </div>

                                                <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dashed border-gray-200 pt-4 mt-2">
                                                    <div>
                                                        <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Quantity</label>
                                                        <input 
                                                            type="number" min="1" step="any"
                                                            value={item.quantity} 
                                                            onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                                                            className="h-[42px] w-full rounded-lg border border-gray-300 px-3 text-[14px] font-medium outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 bg-white" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unit Price (TK)</label>
                                                        <input 
                                                            type="number" step="any" 
                                                            value={item.unit_price}  
                                                            onChange={(e) => updateItem(index, "unit_price", e.target.value)} 
                                                            className="h-[42px] w-full rounded-lg border border-gray-300 px-3 text-[14px] font-medium outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 bg-white" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col justify-center bg-white rounded-lg border border-gray-200 px-4">
                                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Price</label>
                                                        <div className="text-[18px] font-black text-[var(--accent)] mt-0.5">
                                                            TK. {(Number(item.total) || 0).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {errors.items && <span className="mt-2 block text-[13px] font-bold text-red-500">{errors.items}</span>}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                                    <h4 className="text-[15px] font-bold text-gray-800 mb-4 border-b pb-2">Terms & Conditions</h4>
                                    <div className="flex-1 rounded-lg border border-gray-300 overflow-hidden bg-white">
                                        <ReactQuill 
                                            theme="snow"
                                            value={data.notes}
                                            onChange={(val) => setData("notes", val)}
                                            modules={quillModules}
                                            placeholder="Bank details, payment terms, etc."
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h4 className="text-[15px] font-bold text-gray-800 mb-4 border-b pb-2">Payment Calculation</h4>
                                    
                                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-bold text-gray-600">Sub Total:</span> 
                                            <strong className="text-[16px] text-gray-800">TK. {(data.sub_total || 0).toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-bold text-gray-600">Tax / VAT (%):</span> 
                                            <input 
                                                type="number" 
                                                value={data.tax} 
                                                onChange={(e) => setData("tax", e.target.value)} 
                                                className="w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-right font-bold outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] bg-white" 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mb-5">
                                            <span className="font-bold text-gray-600">Discount (TK):</span> 
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={data.discount} 
                                                onChange={(e) => setData("discount", e.target.value)} 
                                                className="w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-right font-bold outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white" 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between border-t-2 border-dashed border-gray-300 pt-5 text-[20px] font-black text-gray-900">
                                            <span>Grand Total:</span> 
                                            <span className="text-[var(--accent)]">TK. {(data.grand_total || 0).toLocaleString('en-IN')}</span>
                                        </div>

                                        {availableAdvance > 0 && (
                                            <div className="mt-6 border-t-2 border-emerald-200 pt-5">
                                                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-200 mb-3">
                                                    <span className="text-[13px] font-bold text-emerald-800"><i className="fa-solid fa-wallet mr-1"></i> Apply Advance:</span>
                                                    <input 
                                                        type="number" min="0" 
                                                        max={Math.min(availableAdvance, data.grand_total)}
                                                        value={data.use_advance_amount} 
                                                        onChange={handleAdvanceChange} 
                                                        className="w-[120px] rounded-md border-2 border-emerald-400 bg-white px-3 py-1.5 text-right text-[14px] font-bold text-emerald-700 outline-none focus:border-emerald-600" 
                                                    />
                                                </div>
                                                {data.use_advance_amount > 0 && (
                                                    <div className="flex items-center justify-between text-[18px] font-black text-rose-600 px-2">
                                                        <span>Net Payable:</span>
                                                        <span>TK. {(data.grand_total - data.use_advance_amount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="flex items-center justify-end gap-4 bg-white border-t border-gray-200 px-6 py-5 shrink-0 shadow-sm z-10">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                Cancel
                            </button>
                            <button type="submit" onClick={handleSubmit} disabled={processing} className="rounded-xl bg-[var(--accent)] px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#b08630] shadow-md disabled:opacity-70">
                                {processing ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Processing...</> : (editMode ? "Update Invoice" : "Generate Invoice")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}