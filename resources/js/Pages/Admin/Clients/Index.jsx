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
                replace: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    // --- Copy Data ---
    const handleCopy = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to copy", "warning");
        const text = clients.data
            .map((c) => `${c.name}\t${c.company_name || "N/A"}\t${c.email || "N/A"}\t${c.phone || "N/A"}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false });
    };

    // --- Export CSV ---
    const handleExportCSV = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Client Name,Company,Email,Phone,Website,Address\n"];
        const rows = clients.data.map(c => `"${c.name}","${c.company_name || ''}","${c.email || ''}","${c.phone || ''}","${c.website || ''}","${c.address || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Clients_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    // --- Custom Full Screen Print ---
    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Clients Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #334155; }
                        h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; }
                        th, td { padding: 12px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; }
                        /* Hide Actions Column */
                        th:last-child, td:last-child { display: none !important; }
                    </style>
                </head>
                <body>
                    <h2>Clients Directory Report</h2>
                    ${tableContent.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // --- Modals ---
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
            cancelButtonColor: '#6b7280'
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

            <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">Client Workspace</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage, track and communicate with your clients.</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 sm:px-6 border-b border-slate-100 gap-4 bg-white">
                        <div className="text-lg font-semibold text-slate-700 flex items-center">
                            <i className="fa-solid fa-users mr-2 text-blue-500"></i> Client Directory
                        </div>
                        {hasPermission('create_client') && (
                            <button onClick={openCreateModal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                                <i className="fa-solid fa-plus"></i> Add New Client
                            </button>
                        )}
                    </div>

                    {/* Toolbar (Search, Filter, Export) */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100">
                        
                        {/* Show Entries */}
                        <div className="flex items-center gap-2 text-sm text-slate-600 w-full lg:w-auto">
                            <span>Show</span>
                            <select 
                                value={perPage} 
                                onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                            >
                                <option value={10}>10 Entries</option>
                                <option value={25}>25 Entries</option>
                                <option value={50}>50 Entries</option>
                                <option value={100}>100 Entries</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        {/* Actions (Export & Search) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full lg:w-auto ml-auto">
                            <div className="flex gap-2 w-full md:w-auto">
                                <button type="button" onClick={handleCopy} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button type="button" onClick={handleExportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                                    <i className="fas fa-file-excel text-emerald-500"></i> CSV
                                </button>
                                <button type="button" onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                                    <i className="fas fa-print text-slate-500"></i> Print
                                </button>
                            </div>

                            <div className="relative w-full md:w-64">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search clients..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table Area (Responsive Horizontal Scroll) */}
                    <div className="overflow-x-auto w-full">
                        <table id="printable-table" className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-200 text-xs uppercase font-bold text-slate-600 tracking-wider">
                                    <th className="py-3.5 px-6 w-16">SL</th>
                                    <th className="py-3.5 px-6">Client Details</th>
                                    <th className="py-3.5 px-6">Contact Info</th>
                                    <th className="py-3.5 px-6">Address</th>
                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                {clients.data && clients.data.length > 0 ? (
                                    clients.data.map((client, index) => (
                                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6 text-slate-500 font-medium">
                                                {clients.from ? clients.from + index : index + 1}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-semibold text-slate-900">{client.name}</div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center">
                                                    <i className="fa-regular fa-building mr-1.5"></i> 
                                                    {client.company_name || "No Company"}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-sky-600 font-medium">{client.email || "-"}</div>
                                                <div className="text-slate-500 mt-1 text-xs">{client.phone || "-"}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-slate-500 text-xs whitespace-normal max-w-[250px] leading-relaxed">
                                                    {client.address ? (client.address.length > 40 ? client.address.substring(0, 40) + '...' : client.address) : "-"}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-end gap-2">
                                                    {hasPermission('view_clients') && (
                                                        <button onClick={() => openViewModal(client)} className="p-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition" title="View Details">
                                                            <i className="fa-regular fa-eye"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_client') && (
                                                        <button onClick={() => openEditModal(client)} className="p-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition" title="Edit Client">
                                                            <i className="fa-regular fa-pen-to-square"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                        <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition" title="Delete Client">
                                                            <i className="fa-regular fa-trash-can"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-10 text-slate-400">No clients found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Links */}
                    {clients.links && clients.links.length > 3 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 sm:p-6 border-t border-slate-200 bg-slate-50/50">
                            <div className="text-sm text-slate-500 text-center md:text-left">
                                Showing <span className="font-medium text-slate-700">{clients.from || 0}</span> to <span className="font-medium text-slate-700">{clients.to || 0}</span> of <span className="font-medium text-slate-700">{clients.total || 0}</span> entries
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {clients.links.map((link, index) => (
                                    <Link 
                                        key={index} 
                                        href={link.url || "#"} 
                                        className={`flex items-center justify-center px-3 py-1.5 min-w-[32px] rounded-md border text-sm transition-colors ${
                                            link.active 
                                                ? "bg-blue-600 text-white border-blue-600" 
                                                : link.url 
                                                    ? "bg-white text-slate-600 border-slate-300 hover:bg-slate-100" 
                                                    : "bg-slate-100 text-slate-400 border-slate-200 pointer-events-none"
                                        }`}
                                        preserveState
                                    >
                                        {link.label.includes("Previous") ? (
                                            <i className="fa-solid fa-chevron-left text-xs"></i>
                                        ) : link.label.includes("Next") ? (
                                            <i className="fa-solid fa-chevron-right text-xs"></i>
                                        ) : (
                                            link.label.replace("&laquo;", "").replace("&raquo;", "")
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- VIEW DETAILS MODAL --- */}
            {showViewModal && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 sm:p-6">
                    <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center border-b border-slate-200 p-5 bg-slate-50 shrink-0">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                                <i className="fa-regular fa-address-card mr-2 text-blue-600"></i> Client Profile
                            </h3>
                            <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 transition text-xl">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Client Name</span>
                                    <div className="text-lg font-bold text-slate-900">{selectedClient.name}</div>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Company Name</span>
                                    <div className="font-semibold text-slate-700 flex items-center">
                                        <i className="fa-regular fa-building text-amber-500 mr-2"></i>
                                        {selectedClient.company_name || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Email Address</span>
                                    <div className="font-semibold text-sky-600 flex items-center">
                                        <i className="fa-regular fa-envelope mr-2"></i>
                                        {selectedClient.email || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Phone Number</span>
                                    <div className="font-medium text-slate-600 flex items-center">
                                        <i className="fa-solid fa-phone text-emerald-500 mr-2"></i>
                                        {selectedClient.phone || "N/A"}
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Website</span>
                                    <div className="font-medium text-blue-600 break-all flex items-center">
                                        <i className="fa-solid fa-globe mr-2"></i>
                                        {selectedClient.website ? (
                                            <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline">{selectedClient.website}</a>
                                        ) : "N/A"}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                                <span className="text-xs uppercase font-bold text-slate-400 block mb-2">Physical Address</span>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-600 text-sm leading-relaxed min-h-[60px] whitespace-pre-line flex items-start">
                                    <i className="fa-solid fa-location-dot text-rose-500 mr-2 mt-1 shrink-0"></i>
                                    <span>{selectedClient.address || "No address provided."}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 sm:p-6">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center border-b border-slate-200 p-5 bg-slate-50 shrink-0">
                            <h3 className="text-lg font-semibold text-slate-800">
                                {editMode ? "📝 Update Client Details" : "✨ Register New Client"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition text-xl">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        {/* Modal Body & Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name *</label>
                                        <input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="e.g. John Doe" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
                                        <input type="text" value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} placeholder="e.g. ABC Corp" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                                        {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                        <input type="email" value={data.email} onChange={(e) => setData("email", e.target.value)} placeholder="john@example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                                        <input type="text" value={data.phone} onChange={(e) => setData("phone", e.target.value)} placeholder="+8801..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
                                        <input type="url" value={data.website} onChange={(e) => setData("website", e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
                                        {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Address</label>
                                        <textarea value={data.address} onChange={(e) => setData("address", e.target.value)} placeholder="Client's physical address" rows="3" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700"></textarea>
                                        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition">
                                    Dismiss
                                </button>
                                <button type="submit" disabled={processing} className={`w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition hover:bg-blue-700 ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                    {processing ? "Saving..." : "Save Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}