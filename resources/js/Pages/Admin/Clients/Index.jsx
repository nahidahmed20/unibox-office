import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

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
        return Number(new URLSearchParams(window.location.search).get("per_page")) || 25;
    });

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '', name: '', company_name: '', email: '', phone: '', address: '', website: ''
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
        navigator.clipboard.writeText("Name\tCompany\tPhone\tTotal Billed\tTotal Paid\tNet Due\tAdvance\n" + text);
        Swal.fire({ icon: "success", title: "Copied to Clipboard!", timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    const handleExportCSV = () => {
        if (!clients.data || !clients.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const headers = ["Client Name,Company,Email,Phone,Total Billed,Total Paid,Current Due,Advance Balance,Address\n"];
        const rows = clients.data.map(c => `"${c.name}","${c.company_name || ''}","${c.email || ''}","${c.phone || ''}","${c.total_invoiced || 0}","${c.total_paid || 0}","${c.net_due || 0}","${c.advance_balance || 0}","${c.address || ''}"`);
        const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Clients_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const handlePrint = () => {
        const tableContent = document.getElementById("printable-table");
        if (!tableContent) return;

        const printWindow = window.open('', '_blank', `width=${window.screen.width},height=${window.screen.height},top=0,left=0`);
        printWindow.document.write(`
            <html>
                <head>
                    <title>Clients Directory Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px 40px; color: #1e293b; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        h2.report-title { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
                        p.report-date { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
                        th, td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 12px; }
                        th { background-color: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; }
                        .no-print { display: none !important; }
                        .text-right { text-align: right; }
                        .financial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; }
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
                    <h2 class="report-title">Clients Directory & Financials</h2>
                    <p class="report-date">Generated on: ${new Date().toLocaleString()}</p>
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
        setData({ id: client?.id || '', name: client?.name || '', company_name: client?.company_name || '', email: client?.email || '', phone: client?.phone || '', address: client?.address || '', website: client?.website || '' });
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
            put(route('admin.clients.update', data.id), { onSuccess: () => { setShowModal(false); Swal.fire({ icon: "success", title: "Updated Successfully!", timer: 1500, showConfirmButton: false }); } });
        } else {
            post(route('admin.clients.store'), { onSuccess: () => { reset(); setShowModal(false); Swal.fire({ icon: "success", title: "Created Successfully!", timer: 1500, showConfirmButton: false }); } });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({ title: 'Are you sure?', text: 'This client will be deleted permanently!', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Delete It', cancelButtonText: 'Cancel', confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b' }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admin.clients.destroy', id), { preserveScroll: true, onSuccess: () => { Swal.fire({ icon: "success", title: "Deleted!", text: "Client removed successfully.", timer: 1500, showConfirmButton: false }); } });
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Client Management" />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">

                {/* Premium Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span> Client Relations
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Client Directory</h1>
                        <p className="text-[14.5px] text-gray-500 mt-1.5 max-w-lg leading-relaxed">
                            Manage your client list, view their full profiles, and track financial statuses in one place.
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">

                    {/* Card Header & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 px-6 py-5 gap-4 bg-gray-50/40">
                        <div className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-users text-[14px]"></i>
                            </div>
                            All Clients
                        </div>
                        {hasPermission('create_client') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-indigo-700 shadow-sm hover:shadow-md">
                                <i className="fa-solid fa-user-plus"></i> Add New Client
                            </button>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-gray-600">
                            <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <span className="bg-gray-50/80 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-500 border-r border-gray-200 uppercase tracking-wide">
                                    Show
                                </span>
                                <div className="relative">
                                    <select 
                                        value={perPage} 
                                        onChange={(e) => setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))} 
                                        className="appearance-none bg-none [background-image:none] bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                    <i className="fas fa-copy text-blue-500"></i> Copy
                                </button>
                                <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 shadow-sm">
                                    <i className="fas fa-file-csv"></i> CSV
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-sm">
                                    <i className="fas fa-print text-gray-500"></i> Print
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-[320px]">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13.5px]"></i>
                            <input
                                type="text"
                                placeholder="Search by name, company, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-[13.5px] outline-none transition-shadow focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm bg-white"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto custom-table-scroll pb-2">
                        <table id="printable-table" className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4.5 w-12">SL</th>
                                    <th className="px-6 py-4.5">Client Profile</th>
                                    <th className="px-6 py-4.5">Contact Methods</th>
                                    <th className="px-6 py-4.5">Financial Synopsis</th>
                                    <th className="px-6 py-4.5">Location</th>
                                    <th className="px-6 py-4.5 text-center no-print w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                {clients.data && clients.data.length > 0 ? (
                                    clients.data.map((client, index) => (
                                        <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-400">
                                                {clients.from ? clients.from + index : index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[14px] font-extrabold uppercase shadow-sm">
                                                        {(client.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-[14.5px]">{client.name}</div>
                                                        <div className="text-[12px] font-medium text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                            <i className="fa-regular fa-building opacity-70"></i>
                                                            {client.company_name || <span className="italic text-gray-400">Individual</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700 font-medium flex items-center gap-2 mb-1.5">
                                                    <div className="w-5 flex justify-center text-gray-400"><i className="fa-regular fa-envelope text-[12px]"></i></div>
                                                    {client.email || <span className="text-gray-400">-</span>}
                                                </div>
                                                <div className="text-[12.5px] text-gray-600 flex items-center gap-2">
                                                    <div className="w-5 flex justify-center text-gray-400"><i className="fa-solid fa-phone text-[11px]"></i></div>
                                                    {client.phone || <span className="text-gray-400">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="grid grid-cols-2 gap-1.5 w-[220px] financial-grid">
                                                    <div className="flex flex-col bg-gray-50/80 border border-gray-100 px-2.5 py-1.5 rounded-lg">
                                                        <span className="text-[9.5px] uppercase font-bold text-gray-400">Billed</span>
                                                        <span className="text-[12px] font-bold text-gray-700 tabular-nums">৳ {Number(client.total_invoiced || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex flex-col bg-emerald-50/50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                                                        <span className="text-[9.5px] uppercase font-bold text-emerald-500">Paid</span>
                                                        <span className="text-[12px] font-bold text-emerald-700 tabular-nums">৳ {Number(client.total_paid || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className={`flex flex-col px-2.5 py-1.5 rounded-lg border ${client.net_due > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-gray-50/80 border-gray-100'}`}>
                                                        <span className={`text-[9.5px] uppercase font-bold ${client.net_due > 0 ? 'text-rose-500' : 'text-gray-400'}`}>Due</span>
                                                        <span className={`text-[12px] font-bold tabular-nums ${client.net_due > 0 ? 'text-rose-700' : 'text-gray-700'}`}>৳ {Number(client.net_due || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className={`flex flex-col px-2.5 py-1.5 rounded-lg border ${client.advance_balance > 0 ? 'bg-purple-50/50 border-purple-100' : 'bg-gray-50/80 border-gray-100'}`}>
                                                        <span className={`text-[9.5px] uppercase font-bold ${client.advance_balance > 0 ? 'text-purple-500' : 'text-gray-400'}`}>Adv Bal</span>
                                                        <span className={`text-[12px] font-bold tabular-nums ${client.advance_balance > 0 ? 'text-purple-700' : 'text-gray-700'}`}>৳ {Number(client.advance_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-600 text-[12.5px] whitespace-normal max-w-[220px] leading-relaxed">
                                                    {client.address ? (client.address.length > 50 ? client.address.substring(0, 50) + '...' : client.address) : <span className="italic text-gray-400">No address provided.</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    {hasPermission('view_clients') && (
                                                        <button onClick={() => openViewModal(client)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm" title="View Profile">
                                                            <i className="fa-regular fa-address-card text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('edit_client') && (
                                                        <button onClick={() => openEditModal(client)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm" title="Edit Client">
                                                            <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_client') && (
                                                        <button onClick={() => handleDelete(client.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm" title="Delete Client">
                                                            <i className="fa-regular fa-trash-can text-[13px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                    <i className="fa-solid fa-users-slash text-2xl text-gray-400"></i>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700">No clients found.</p>
                                                <p className="text-[13px] text-gray-400 mt-1">Try adjusting your search or add a new client.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clients.links && clients.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-[13.5px] font-medium text-gray-500">
                                {clients.total > 0 && `Showing ${clients.from || 0} to ${clients.to || 0} of ${clients.total || 0} clients`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {clients.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || "#"}
                                        className={`flex min-w-[36px] items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-bold transition-all
                                            ${link.active
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                                                : link.url
                                                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 pointer-events-none'
                                            }
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

            {/* --- STUNNING VIEW DETAILS MODAL --- */}
            {showViewModal && selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-2xl bg-[#f8fafc] rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* 🟢 Premium Profile Header with Background */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white h-8 w-8 rounded-full flex items-center justify-center transition-colors backdrop-blur-md">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
                                <div className="h-20 w-20 shrink-0 rounded-2xl bg-white flex items-center justify-center text-indigo-600 text-3xl font-black shadow-lg ring-4 ring-white/20">
                                    {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-white mt-1">
                                    <h2 className="text-[24px] font-black tracking-tight">{selectedClient.name}</h2>
                                    {selectedClient.company_name && (
                                        <div className="text-[14px] text-indigo-100 font-medium mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                            <i className="fa-regular fa-building"></i> {selectedClient.company_name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6">

                            {/* Action Buttons */}
                            <div className="flex justify-center sm:justify-start gap-3 -mt-2 mb-2">
                                {selectedClient.phone && (
                                    <a href={`tel:${selectedClient.phone}`} className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-2 text-[13px] font-bold hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm">
                                        <i className="fa-solid fa-phone"></i> Call
                                    </a>
                                )}
                                {selectedClient.email && (
                                    <a href={`mailto:${selectedClient.email}`} className="flex items-center gap-2 rounded-xl bg-blue-50 text-blue-700 px-4 py-2 text-[13px] font-bold hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm">
                                        <i className="fa-solid fa-envelope"></i> Email
                                    </a>
                                )}
                                <Link href={route('admin.reports.client-ledger', { client_id: selectedClient.id })} className="flex items-center gap-2 rounded-xl bg-purple-50 text-purple-700 px-4 py-2 text-[13px] font-bold hover:bg-purple-100 border border-purple-200 transition-colors shadow-sm ml-auto">
                                    <i className="fa-solid fa-file-invoice"></i> View Ledger
                                </Link>
                            </div>

                            {/* Contact Details Grid */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <i className="fa-solid fa-address-book text-indigo-500"></i> Contact Information
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Email Address</span>
                                        <div className="font-semibold text-gray-800 break-all">{selectedClient.email || "N/A"}</div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Phone Number</span>
                                        <div className="font-semibold text-gray-800">{selectedClient.phone || "N/A"}</div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Website URL</span>
                                        <div className="font-bold text-indigo-600 break-all">
                                            {selectedClient.website ? (
                                                <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5"><i className="fa-solid fa-link text-[10px]"></i> {selectedClient.website}</a>
                                            ) : "N/A"}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Physical Address</span>
                                        <div className="text-gray-700 text-[13.5px] leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                            {selectedClient.address || <span className="italic text-gray-400">No address provided.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- FINANCIAL OVERVIEW --- */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h4 className="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <i className="fa-solid fa-chart-pie text-emerald-500"></i> Financial Overview
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-center">
                                        <span className="block text-[10px] uppercase font-bold text-blue-600/80 mb-1">Total Billed</span>
                                        <span className="block text-[16px] font-black text-blue-800 tabular-nums">
                                            ৳ {Number(selectedClient.total_invoiced || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center">
                                        <span className="block text-[10px] uppercase font-bold text-emerald-600/80 mb-1">Total Paid</span>
                                        <span className="block text-[16px] font-black text-emerald-800 tabular-nums">
                                            ৳ {Number(selectedClient.total_paid || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className={`${selectedClient.net_due > 0 ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-gray-50 border-gray-200'} p-4 rounded-xl text-center`}>
                                        <span className={`block text-[10px] uppercase font-bold ${selectedClient.net_due > 0 ? 'text-rose-600' : 'text-gray-500'} mb-1`}>Current Due</span>
                                        <span className={`block text-[16px] font-black tabular-nums ${selectedClient.net_due > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
                                            ৳ {Number(selectedClient.net_due || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl text-center">
                                        <span className="block text-[10px] uppercase font-bold text-purple-600/80 mb-1">Advance Bal.</span>
                                        <span className="block text-[16px] font-black text-purple-800 tabular-nums">
                                            ৳ {Number(selectedClient.advance_balance || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="rounded-xl bg-gray-900 px-8 py-3 text-[14px] font-bold text-white transition-colors hover:bg-gray-800 shadow-md">
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/60 backdrop-blur-sm p-4 md:p-6">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shrink-0">
                            <h3 className="text-[18px] font-extrabold text-gray-900 flex items-center gap-2">
                                {editMode ? (
                                    <><i className="fa-regular fa-pen-to-square text-indigo-600"></i> Modify Client Profile</>
                                ) : (
                                    <><i className="fa-solid fa-user-plus text-indigo-600"></i> Register New Client</>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-8 overflow-y-auto custom-table-scroll space-y-6">

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Client Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.name}
                                                onChange={(e) => setData("name", e.target.value)}
                                                placeholder="e.g. John Doe"
                                                required
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-semibold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                            />
                                        </div>
                                        {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Company Name</label>
                                        <div className="relative">
                                            <i className="fa-regular fa-building absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.company_name}
                                                onChange={(e) => setData("company_name", e.target.value)}
                                                placeholder="e.g. ABC Corporation"
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-semibold text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                            />
                                        </div>
                                        {errors.company_name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.company_name}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
                                        <div className="relative">
                                            <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData("email", e.target.value)}
                                                placeholder="john@example.com"
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-medium text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
                                            />
                                        </div>
                                        {errors.email && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
                                        <div className="relative">
                                            <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="text"
                                                value={data.phone}
                                                onChange={(e) => setData("phone", e.target.value)}
                                                placeholder="+880..."
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-medium text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
                                            />
                                        </div>
                                        {errors.phone && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.phone}</p>}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Website URL</label>
                                        <div className="relative">
                                            <i className="fa-solid fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input
                                                type="url"
                                                value={data.website}
                                                onChange={(e) => setData("website", e.target.value)}
                                                placeholder="https://www.example.com"
                                                className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-[14px] font-medium text-blue-600 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white"
                                            />
                                        </div>
                                        {errors.website && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.website}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Physical Address</label>
                                    <textarea
                                        value={data.address}
                                        onChange={(e) => setData("address", e.target.value)}
                                        placeholder="Enter full office or billing address here..."
                                        rows="3"
                                        className="w-full rounded-xl border border-gray-300 p-4 text-[14px] font-medium text-gray-900 outline-none resize-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    ></textarea>
                                    {errors.address && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.address}</p>}
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing} className="rounded-xl bg-indigo-600 px-8 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-indigo-700 shadow-md disabled:opacity-70 flex items-center gap-2">
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
