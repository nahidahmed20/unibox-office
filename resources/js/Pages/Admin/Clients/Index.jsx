import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ clients = { data: [], links: [] } }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin'); 
    const permissions = auth?.permissions || [];
    const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission);

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [perPage, setPerPage] = useState(() => {
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 10;
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        name: '',
        company_name: '',
        email: '',
        phone: '',
        address: '',
        website: ''
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
            if (perPage !== 10) params.per_page = perPage;

            router.get(route('admin.clients.index'), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Actions ---
    const handleCopy = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = clients.data
            .map((c) => `${c.name}\t${c.company_name || "N/A"}\t${c.phone || "N/A"}\tBilled: ${c.total_invoiced || 0}\tPaid: ${c.total_paid || 0}\tDue: ${c.net_due || 0}\tAdv: ${c.advance_balance || 0}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    const handleExportCSV = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Client Name,Company,Email,Phone,Total Billed,Total Paid,Current Due,Advance Balance,Address\n"];
        const rows = clients.data.map(c => `"${c.name}","${c.company_name || ''}","${c.email || ''}","${c.phone || ''}","${c.total_invoiced || 0}","${c.total_paid || 0}","${c.net_due || 0}","${c.advance_balance || 0}","${c.address || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Clients_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Clients Financial Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; color: #334155; }
                        h2 { text-align: center; color: #0f172a; margin-bottom: 5px; }
                        p { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 12px 16px; border: 1px solid #cbd5e1; font-size: 13px; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; }
                        th:last-child, td:last-child { display: none !important; }
                        .financial-list { display: flex; flex-direction: column; gap: 4px; }
                        .text-red { color: #dc2626; font-weight: bold; }
                        .text-green { color: #16a34a; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>Clients Directory & Financials</h2>
                    <p>Generated Report Date: ${new Date().toLocaleDateString()}</p>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    // --- Modals Logic ---
    const openCreateModal = () => {
        clearErrors();
        setData({ id: '', name: '', company_name: '', email: '', phone: '', address: '', website: '' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEditModal = (client) => {
        clearErrors();
        setData({
            id: client?.id || '',
            name: client?.name || '',
            company_name: client?.company_name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || '',
            website: client?.website || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const openViewModal = (client) => {
        setSelectedClient(client);
        setShowViewModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('admin.clients.update', data.id), {
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        } else {
            post(route('admin.clients.store'), {
                onSuccess: () => {
                    reset();
                    setShowModal(false);
                    Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false });
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This client will be deleted permanently!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.clients.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: "success", title: "Deleted!", text: "Client removed successfully.", timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Clients Management" />

            <div className="flex flex-col gap-6">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#202223]">Client Workspace</h1>
                        <p className="text-[14px] text-gray-500 mt-1">Manage, track and communicate with your clients.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm overflow-hidden">
                    
                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#e1e3e5] px-6 py-4 gap-4 bg-gray-50/50">
                        <div className="text-[16px] font-semibold text-[#202223] flex items-center gap-2.5">
                            <i className="fa-solid fa-users text-[var(--accent)]"></i> Client Directory
                        </div>
                        {hasPermission('create_client') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
                                <i className="fa-solid fa-plus"></i> Add New Client
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-gray-50/30 border-b border-gray-100">
                        
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            {/* Show Entries */}
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select 
                                    value={perPage} 
                                    onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                    className="w-[110px] appearance-none bg-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
                                >
                                    <option value={10}>10 Entries</option>
                                    <option value={25}>25 Entries</option>
                                    <option value={50}>50 Entries</option>
                                    <option value={100}>100 Entries</option>
                                    <option value={500}>500 Entries</option>
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
                                placeholder="Search clients..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-[13.5px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto brass-scroll border-t border-[#e1e3e5]">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                            <thead className="bg-[#f6f6f7] text-[11px] font-bold uppercase tracking-wider text-[#4E5771] border-b border-[#e1e3e5]">
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Client Details</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Financial Data</th>
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-[#202223]">
                                {clients.data && clients.data.length > 0 ? (
                                    clients.data.map((client, index) => (
                                        <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {clients.from ? clients.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 text-[14.5px]">{client.name}</div>
                                                <div className="text-[12px] text-gray-500 mt-1 flex items-center">
                                                    <i className="fa-regular fa-building mr-1.5"></i> 
                                                    {client.company_name || "No Company"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-blue-600 font-medium flex items-center gap-1.5"><i className="fa-regular fa-envelope text-gray-400"></i> {client.email || "-"}</div>
                                                <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5"><i className="fa-solid fa-phone text-gray-400"></i> {client.phone || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* Premium Financial Block Layout */}
                                                <div className="flex flex-col gap-1.5 w-[200px] financial-list">
                                                    <div className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-[12px] font-bold text-gray-700">
                                                        <span className="text-gray-400 font-medium">Billed:</span>
                                                        <span>TK. {Number(client.total_invoiced || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-emerald-50 px-2 py-1 rounded text-[12px] font-bold text-emerald-700">
                                                        <span className="text-emerald-500 font-medium">Paid:</span>
                                                        <span>TK. {Number(client.total_paid || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className={`flex justify-between items-center px-2 py-1 rounded text-[12px] font-bold ${client.net_due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-gray-500'}`}>
                                                        <span className={`${client.net_due > 0 ? 'text-rose-500' : 'text-gray-400'} font-medium`}>Due:</span>
                                                        <span>TK. {Number(client.net_due || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    {client.advance_balance > 0 && (
                                                        <div className="flex justify-between items-center bg-purple-50 px-2 py-1 rounded text-[12px] font-bold text-purple-700 mt-1 border border-purple-100">
                                                            <span className="text-purple-500 font-medium">Adv Bal:</span>
                                                            <span>TK. {Number(client.advance_balance || 0).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-500 whitespace-normal max-w-[200px] leading-relaxed">
                                                    {client.address ? (client.address.length > 40 ? client.address.substring(0, 40) + '...' : client.address) : "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {hasPermission('view_clients') && (
                                                        <button onClick={() => openViewModal(client)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View Details">
                                                            <i className="fa-regular fa-eye text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_client') && (
                                                        <button onClick={() => openEditModal(client)} className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Edit Client">
                                                            <i className="fa-regular fa-pen-to-square text-[12px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                        <button onClick={() => handleDelete(client.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Delete Client">
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
                                                <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-3"></i>
                                                <p>No clients found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clients.links && clients.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e1e3e5] bg-[#f6f6f7] px-6 py-4">
                            <div className="text-[13px] text-gray-500">
                                Showing {clients.from || 0} to {clients.to || 0} of {clients.total || 0} entries
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {clients.links.map((link, index) => (
                                    <Link 
                                        key={index} 
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

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                <i className="fa-regular fa-address-card text-[var(--accent)]"></i> Client Profile
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                            
                            {/* Profile Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-2xl font-bold border border-[var(--accent)]/20">
                                        {selectedClient.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-[20px] font-bold text-gray-900">{selectedClient.name}</h2>
                                        {selectedClient.company_name && (
                                            <div className="text-[13px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                <i className="fa-regular fa-building"></i> {selectedClient.company_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedClient.phone && (
                                        <a href={`tel:${selectedClient.phone}`} className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 border border-emerald-100 transition-colors" title="Call Client">
                                            <i className="fa-solid fa-phone"></i>
                                        </a>
                                    )}
                                    {selectedClient.email && (
                                        <a href={`mailto:${selectedClient.email}`} className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 border border-blue-100 transition-colors" title="Email Client">
                                            <i className="fa-solid fa-envelope"></i>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <i className="fa-solid fa-address-book text-gray-400"></i> Contact Information
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</span>
                                        <div className="font-medium text-gray-800 break-all">{selectedClient.email || "N/A"}</div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Phone Number</span>
                                        <div className="font-medium text-gray-800">{selectedClient.phone || "N/A"}</div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Website URL</span>
                                        <div className="font-medium text-blue-600 break-all">
                                            {selectedClient.website ? (
                                                <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline">{selectedClient.website}</a>
                                            ) : "N/A"}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Physical Address</span>
                                        <div className="text-gray-700 text-[14px] leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            {selectedClient.address || <span className="italic text-gray-400">No address provided.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- FINANCIAL OVERVIEW LEDGER --- */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <i className="fa-solid fa-chart-pie text-[var(--accent)]"></i> Financial Overview
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center shadow-sm">
                                        <span className="block text-[10px] uppercase font-bold text-blue-600 mb-1">Total Billed</span>
                                        <span className="block text-[16px] font-extrabold text-blue-800">
                                            TK. {Number(selectedClient.total_invoiced || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center shadow-sm">
                                        <span className="block text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Paid</span>
                                        <span className="block text-[16px] font-extrabold text-emerald-800">
                                            TK. {Number(selectedClient.total_paid || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className={`${selectedClient.net_due > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'} border p-4 rounded-xl text-center shadow-sm`}>
                                        <span className={`block text-[10px] uppercase font-bold ${selectedClient.net_due > 0 ? 'text-rose-600' : 'text-gray-500'} mb-1`}>Current Due</span>
                                        <span className={`block text-[16px] font-extrabold ${selectedClient.net_due > 0 ? 'text-rose-800' : 'text-gray-700'}`}>
                                            TK. {Number(selectedClient.net_due || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center shadow-sm">
                                        <span className="block text-[10px] uppercase font-bold text-purple-600 mb-1">Advance Bal.</span>
                                        <span className="block text-[16px] font-extrabold text-purple-800">
                                            TK. {Number(selectedClient.advance_balance || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-lg bg-gray-800 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/50">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL (IMPROVED UI) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-3xl bg-[#f8fafc] rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                            <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-[var(--accent)]"></i> Modify Client</>
                                ) : (
                                    <><i className="fa-solid fa-user-plus text-[var(--accent)]"></i> Register New Client</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 overflow-y-auto brass-scroll space-y-6">
                                
                                {/* Section 1: Basic Information */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-regular fa-user text-gray-400"></i> Basic Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Client Full Name <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                value={data.name} 
                                                onChange={(e) => setData("name", e.target.value)} 
                                                placeholder="e.g. John Doe" 
                                                required 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Company / Business Name</label>
                                            <input 
                                                type="text" 
                                                value={data.company_name} 
                                                onChange={(e) => setData("company_name", e.target.value)} 
                                                placeholder="e.g. ABC Corporation" 
                                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                            />
                                            {errors.company_name && <p className="text-red-500 text-[12px] mt-1">{errors.company_name}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contact Information */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-address-book text-gray-400"></i> Contact Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email Address</label>
                                            <div className="relative">
                                                <i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                <input 
                                                    type="email" 
                                                    value={data.email} 
                                                    onChange={(e) => setData("email", e.target.value)} 
                                                    placeholder="john@example.com" 
                                                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                            {errors.email && <p className="text-red-500 text-[12px] mt-1">{errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Phone Number</label>
                                            <div className="relative">
                                                <i className="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                <input 
                                                    type="text" 
                                                    value={data.phone} 
                                                    onChange={(e) => setData("phone", e.target.value)} 
                                                    placeholder="+8801..." 
                                                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-[12px] mt-1">{errors.phone}</p>}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Website URL</label>
                                            <div className="relative">
                                                <i className="fa-solid fa-globe absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                                <input 
                                                    type="url" 
                                                    value={data.website} 
                                                    onChange={(e) => setData("website", e.target.value)} 
                                                    placeholder="https://www.example.com" 
                                                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3.5 py-2.5 text-[14px] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50" 
                                                />
                                            </div>
                                            {errors.website && <p className="text-red-500 text-[12px] mt-1">{errors.website}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Location */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <i className="fa-solid fa-location-dot text-gray-400"></i> Location details
                                    </h4>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Physical Address / Office Location</label>
                                        <textarea 
                                            value={data.address} 
                                            onChange={(e) => setData("address", e.target.value)} 
                                            placeholder="Enter full address here..." 
                                            rows="3" 
                                            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[14px] outline-none resize-none transition-shadow focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
                                        ></textarea>
                                        {errors.address && <p className="text-red-500 text-[12px] mt-1">{errors.address}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#b08630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-70 flex items-center gap-2">
                                    {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> {editMode ? "Update Client" : "Register Client"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}