import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, router, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import CustomSelect from '@/Components/CustomSelect';
import TableExportButtons from '@/Components/TableExportButtons';

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

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
        return new URLSearchParams(window.location.search).get("per_page") || 25;
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
            params.per_page = perPage;

            router.get(route('admin.clients.index'), params, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, perPage]);

    const clientList = Array.isArray(clients) ? clients : (clients?.data || []);
    const exportHeaders = ['SL', 'Client Name', 'Company', 'Phone', 'Email', 'Total Billed (৳)', 'Total Paid (৳)', 'Net Due (৳)', 'Advance (৳)', 'Address'];
    const exportRows = useMemo(() => {
        return clientList.map((c, idx) => [
            idx + 1,
            c.name || '',
            c.company_name || 'N/A',
            c.phone || 'N/A',
            c.email || '',
            parseFloat(c.total_invoiced || 0).toFixed(2),
            parseFloat(c.total_paid || 0).toFixed(2),
            parseFloat(c.net_due || 0).toFixed(2),
            parseFloat(c.advance_balance || 0).toFixed(2),
            c.address || ''
        ]);
    }, [clientList]);

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
                                    <select value={perPage} onChange={(e) =>
 setPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 text-[13.5px] font-bold text-gray-800 outline-none cursor-pointer border-none focus:ring-0 w-[115px]"
                                    >
                                        <option value={10}>10 Rows</option>
                                        <option value={25}>25 Rows</option>
                                        <option value={50}>50 Rows</option>
                                        <option value={100}>100 Rows</option>
                                        <option value="all">All Data</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Export Buttons */}
                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename="Clients_Directory_Report"
                                title="Clients Directory"
                            />
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
                                                <div className="grid grid-cols-2 gap-1.5 w-[220px]">
                                                    <div className="flex flex-col bg-gray-50/80 border border-gray-100 px-2.5 py-1.5 rounded-lg">
                                                        <span className="text-[9.5px] uppercase font-bold text-gray-400">Billed</span>
                                                        <span className="text-[12px] font-bold text-gray-700 tabular-nums">৳ {Number(client.total_invoiced || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex flex-col bg-emerald-50/50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                                                        <span className="text-[9.5px] uppercase font-bold text-emerald-500">Paid</span>
                                                        <span className="text-[12px] font-bold text-emerald-700 tabular-nums">৳ {Number(client.total_paid || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    {/* <div className={`flex flex-col px-2.5 py-1.5 rounded-lg border ${client.net_due > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-gray-50/80 border-gray-100'}`}>
                                                        <span className={`text-[9.5px] uppercase font-bold ${client.net_due > 0 ? 'text-rose-500' : 'text-gray-400'}`}>Due</span>
                                                        <span className={`text-[12px] font-bold tabular-nums ${client.net_due > 0 ? 'text-rose-700' : 'text-gray-700'}`}>৳ {Number(client.net_due || 0).toLocaleString('en-IN')}</span>
                                                    </div> */}
                                                    {/* <div className={`flex flex-col px-2.5 py-1.5 rounded-lg border ${client.advance_balance > 0 ? 'bg-purple-50/50 border-purple-100' : 'bg-gray-50/80 border-gray-100'}`}>
                                                        <span className={`text-[9.5px] uppercase font-bold ${client.advance_balance > 0 ? 'text-purple-500' : 'text-gray-400'}`}>Adv Bal</span>
                                                        <span className={`text-[12px] font-bold tabular-nums ${client.advance_balance > 0 ? 'text-purple-700' : 'text-gray-700'}`}>৳ {Number(client.advance_balance || 0).toLocaleString('en-IN')}</span>
                                                    </div> */}
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

            {/* --- 💎 EXECUTIVE VIEW DETAILS MODAL --- */}
            {showViewModal && selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl lg:max-w-3xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">

                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-6 sm:px-8 text-white border-b border-slate-800 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                    <div className="h-16 w-16 sm:h-18 sm:w-18 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg ring-4 ring-white/10">
                                        {selectedClient.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-address-book"></i> Client Profile Overview
                                        </div>
                                        <h2 className="text-[20px] sm:text-[24px] font-black tracking-tight text-white leading-tight">
                                            {selectedClient.name}
                                        </h2>
                                        {selectedClient.company_name && (
                                            <div className="text-[13px] text-slate-300 font-medium mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                                                <i className="fa-regular fa-building text-indigo-400"></i> {selectedClient.company_name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0"
                                >
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50 flex-1">
                            {/* QUICK ACTION BUTTONS */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                {selectedClient.phone && (
                                    <a
                                        href={`tel:${selectedClient.phone}`}
                                        className="flex items-center gap-2 rounded-xl bg-white text-emerald-700 px-4 py-2.5 text-[12.5px] font-black hover:bg-emerald-50 border border-emerald-200 transition-all shadow-xs"
                                    >
                                        <i className="fa-solid fa-phone text-emerald-600"></i> Call Client
                                    </a>
                                )}
                                {selectedClient.email && (
                                    <a
                                        href={`mailto:${selectedClient.email}`}
                                        className="flex items-center gap-2 rounded-xl bg-white text-indigo-700 px-4 py-2.5 text-[12.5px] font-black hover:bg-indigo-50 border border-indigo-200 transition-all shadow-xs"
                                    >
                                        <i className="fa-regular fa-envelope text-indigo-600"></i> Send Email
                                    </a>
                                )}
                                <Link
                                    href={route('admin.reports.client-ledger', { client_id: selectedClient.id })}
                                    className="flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-[12.5px] font-black hover:bg-indigo-500 transition-all shadow-md ml-auto"
                                >
                                    <i className="fa-solid fa-file-invoice"></i> View Full Ledger
                                </Link>
                            </div>

                            {/* CONTACT DETAILS CARD */}
                            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                                    <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        <i className="fa-solid fa-address-card"></i>
                                    </div>
                                    <h4 className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider">
                                        Contact & Corporate Coordinates
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Email Address
                                        </span>
                                        <div className="font-bold text-slate-800 text-[13.5px] break-all">
                                            {selectedClient.email || <span className="italic text-slate-400 font-normal">Not Provided</span>}
                                        </div>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Phone Number
                                        </span>
                                        <div className="font-bold text-slate-800 text-[13.5px]">
                                            {selectedClient.phone || <span className="italic text-slate-400 font-normal">Not Provided</span>}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Official Website
                                        </span>
                                        <div className="font-bold text-indigo-600 text-[13.5px] break-all">
                                            {selectedClient.website ? (
                                                <a href={selectedClient.website} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5">
                                                    <i className="fa-solid fa-arrow-up-right-from-square text-[11px]"></i> {selectedClient.website}
                                                </a>
                                            ) : (
                                                <span className="italic text-slate-400 font-normal">Not Provided</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Office / Billing Address
                                        </span>
                                        <div className="text-slate-800 font-medium text-[13px] leading-relaxed">
                                            {selectedClient.address || <span className="italic text-slate-400 font-normal">No address provided.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FINANCIAL OVERVIEW CARD */}
                            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute right-0 top-0 h-32 w-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700/60 pb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <i className="fa-solid fa-chart-pie text-indigo-400"></i> Financial Standing & Receivables
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                                        Active Account
                                    </span>
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <span className="block text-[11px] font-bold text-slate-400 uppercase">Total Billed</span>
                                        <span className="text-[16px] sm:text-[18px] font-black text-white tabular-nums">
                                            ৳ {Number(selectedClient.total_invoiced || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold text-emerald-400 uppercase">Total Paid</span>
                                        <span className="text-[16px] sm:text-[18px] font-black text-emerald-300 tabular-nums">
                                            ৳ {Number(selectedClient.total_paid || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold text-rose-400 uppercase">Current Due</span>
                                        <span className="text-[16px] sm:text-[18px] font-black text-rose-300 tabular-nums">
                                            ৳ {Number(selectedClient.net_due || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] font-bold text-purple-300 uppercase">Advance Balance</span>
                                        <span className="text-[16px] sm:text-[18px] font-black text-purple-300 tabular-nums">
                                            ৳ {Number(selectedClient.advance_balance || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 💎 EXECUTIVE CREATE / EDIT CLIENT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-2xl lg:max-w-3xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[fadeIn_0.2s_ease-out]">
                        
                        {/* EXECUTIVE HEADER */}
                        <div className="relative overflow-hidden bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-800 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">৳</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editMode ? 'fa-pen-to-square' : 'fa-user-plus'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-users-gear"></i> {editMode ? 'Client Account Settings' : 'Client Onboarding'}
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {editMode ? 'Modify Client Profile' : 'Register New Client'}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            {editMode
                                                ? 'Update client corporate credentials, billing contact and office address'
                                                : 'Register an individual client or corporate account to issue invoices and track dues'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 bg-white/5 border border-white/10 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 shrink-0"
                                >
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto custom-table-scroll p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50">
                                
                                {/* 1. BASIC & CORPORATE IDENTITY */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                                        <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            <i className="fa-solid fa-building-user"></i>
                                        </div>
                                        <h4 className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider">
                                            Basic & Corporate Identity
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Client Full Name <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) => setData("name", e.target.value)}
                                                    placeholder="e.g. John Doe"
                                                    required
                                                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:ring-4 focus:ring-indigo-600/10 ${
                                                        errors.name
                                                            ? 'border-red-400 bg-red-50/20 focus:border-red-500'
                                                            : 'border-slate-300 bg-white focus:border-indigo-600'
                                                    }`}
                                                />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Company / Organization Name
                                            </label>
                                            <div className="relative">
                                                <i className="fa-regular fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.company_name}
                                                    onChange={(e) => setData("company_name", e.target.value)}
                                                    placeholder="e.g. ABC Corporation Ltd."
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.company_name && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.company_name}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. CONTACT & BILLING INFORMATION */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                                        <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            <i className="fa-solid fa-address-card"></i>
                                        </div>
                                        <h4 className="text-[12.5px] font-black text-slate-800 uppercase tracking-wider">
                                            Contact & Billing Coordinates
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) => setData("email", e.target.value)}
                                                    placeholder="client@example.com"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.email && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    value={data.phone}
                                                    onChange={(e) => setData("phone", e.target.value)}
                                                    placeholder="e.g. +88017..."
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.phone}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Website URL
                                            </label>
                                            <div className="relative">
                                                <i className="fa-solid fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                <input
                                                    type="url"
                                                    value={data.website}
                                                    onChange={(e) => setData("website", e.target.value)}
                                                    placeholder="https://www.example.com"
                                                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-[13.5px] font-bold text-indigo-600 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                                />
                                            </div>
                                            {errors.website && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.website}</p>}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[11.5px] font-black text-slate-700 uppercase tracking-widest mb-2">
                                                Physical / Billing Address
                                            </label>
                                            <div className="relative">
                                                <textarea
                                                    value={data.address}
                                                    onChange={(e) => setData("address", e.target.value)}
                                                    placeholder="Enter client's full office or billing address..."
                                                    rows="2"
                                                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-[13.5px] font-medium text-slate-900 outline-none transition-all shadow-xs focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 resize-none"
                                                ></textarea>
                                            </div>
                                            {errors.address && <p className="text-red-500 text-[11px] font-bold mt-1.5">{errors.address}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* HELPER ADVISORY NOTE */}
                                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
                                    <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm shadow-sm mt-0.5">
                                        <i className="fa-solid fa-circle-info"></i>
                                    </div>
                                    <div className="text-[12px] font-medium text-indigo-950 leading-relaxed">
                                        <p className="font-bold text-indigo-900 text-[12.5px] mb-0.5">Billing & Invoicing Integration</p>
                                        Invoices, advance receipts, project billing, and ledger statements will automatically sync under this client profile.
                                    </div>
                                </div>

                            </div>

                            {/* FOOTER */}
                            <div className="px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-8 py-3 text-[14px] font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
                                >
                                    {processing ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                                    ) : (
                                        <><i className="fa-solid fa-check"></i> {editMode ? "Update Client" : "Register Client"}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
