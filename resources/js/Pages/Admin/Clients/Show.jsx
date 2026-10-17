import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import TableExportButtons from '@/Components/TableExportButtons';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

export default function Show({ client }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');

    const [activeTab, setActiveTab] = useState('projects');

    // Extracting some data
    const financial = client.financial_summary || { total_invoiced: 0, total_paid: 0, net_due: 0 };
    const projects = client.projects || [];
    const invoices = client.invoices || [];

    const exportConfig = useMemo(() => {
        if (activeTab === 'projects') {
            return {
                headers: ['Project Title', 'Status', 'Priority', 'Deadline', 'Budget (Tk)'],
                rows: (projects || []).map(p => [
                    p.title || '—',
                    p.status || '—',
                    p.priority || '—',
                    p.deadline || '—',
                    Number(p.budget || 0)
                ]),
                filename: `client_projects_${client?.name || 'client'}`,
                title: `Client Projects - ${client?.name || ''}`
            };
        } else {
            return {
                headers: ['Invoice #', 'Date', 'Status', 'Grand Total (Tk)', 'Paid (Tk)', 'Due (Tk)'],
                rows: (invoices || []).map(i => [
                    i.invoice_number || '—',
                    i.invoice_date || '—',
                    i.status || '—',
                    Number(i.grand_total || 0),
                    Number(i.paid_amount || 0),
                    Number(i.due_amount || 0)
                ]),
                filename: `client_invoices_${client?.name || 'client'}`,
                title: `Client Invoices - ${client?.name || ''}`
            };
        }
    }, [activeTab, projects, invoices, client?.name]);

    return (
        <AdminLayout>
            <Head title={`${client.name} - Client Profile`} />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Back Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link href={route('admin.clients.index')} className="text-gray-600 hover:text-indigo-600 font-bold text-[13px] flex items-center gap-2 w-fit bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50">
                        <i className="fa-solid fa-arrow-left"></i> Back to Clients
                    </Link>
                </div>

                {/* 🟢 Premium Clean Profile Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    <div className="flex items-center gap-5 sm:gap-6">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl sm:text-4xl font-black border border-indigo-100 shadow-inner uppercase">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-[24px] sm:text-[30px] font-black text-gray-900 tracking-tight leading-tight">{client.name}</h1>
                            {client.company_name && (
                                <p className="text-gray-500 font-bold flex items-center gap-2 mt-1 text-[14px] sm:text-[15px]">
                                    <i className="fa-regular fa-building text-gray-400"></i> {client.company_name}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-[12.5px] sm:text-[13.5px] font-semibold text-gray-600">
                                {client.phone && <span className="flex items-center gap-1.5"><i className="fa-solid fa-phone text-gray-400"></i> {client.phone}</span>}
                                {client.email && <span className="flex items-center gap-1.5"><i className="fa-regular fa-envelope text-gray-400"></i> {client.email}</span>}
                                {client.website && <span className="flex items-center gap-1.5"><i className="fa-solid fa-globe text-gray-400"></i> {client.website}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-100 shrink-0 w-full xl:w-auto">
                        <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 sm:pr-6">
                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-money-check-dollar"></i> Net Due</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-rose-700">
                                <Taka className="text-lg sm:text-xl text-rose-500"/>{Number(financial.net_due || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex flex-col sm:pl-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-wallet"></i> Wallet (Advance)</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-purple-700">
                                <Taka className="text-lg sm:text-xl text-purple-500"/>{Number(client.advance_balance || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🟢 Additional Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Invoiced Amount</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-gray-900 tabular-nums"><Taka/>{Number(financial.total_invoiced || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl sm:text-2xl border border-blue-100"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Amount Paid</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-emerald-700 tabular-nums"><Taka/>{Number(financial.total_paid || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl sm:text-2xl border border-emerald-100"><i className="fa-solid fa-check-double"></i></div>
                    </div>
                </div>

                {/* 🟢 Tabs Area */}
                <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 bg-gray-50/80 p-3 gap-3 overflow-x-auto custom-table-scroll">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setActiveTab('projects')} className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                                <i className="fa-solid fa-rocket"></i> Recent Projects
                            </button>
                            <button onClick={() => setActiveTab('invoices')} className={`flex items-center gap-2 px-6 py-2.5 text-[13.5px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                                <i className="fa-solid fa-file-invoice"></i> Invoices History
                            </button>
                        </div>
                        <TableExportButtons
                            headers={exportConfig.headers}
                            rows={exportConfig.rows}
                            filename={exportConfig.filename}
                            title={exportConfig.title}
                        />
                    </div>

                    <div className="p-0 overflow-x-auto custom-table-scroll">

                        {/* 🟢 PROJECTS TAB */}
                        {activeTab === 'projects' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Project Title</th>
                                        <th className="px-6 py-4.5">Status</th>
                                        <th className="px-6 py-4.5">Priority</th>
                                        <th className="px-6 py-4.5">Deadline</th>
                                        <th className="px-6 py-4.5 text-right">Budget</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {projects.length > 0 ? projects.map(proj => (
                                        <tr key={proj.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800 align-top">
                                                {proj.title}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider ${
                                                    proj.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    proj.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                    proj.status === 'on_hold' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {proj.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider ${
                                                    proj.priority === 'high' || proj.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                                                    proj.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {proj.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top font-semibold text-gray-600">
                                                {proj.deadline}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-700 align-top tabular-nums">
                                                <Taka/>{Number(proj.budget).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-rocket text-4xl mb-4 block text-gray-200"></i>No projects found for this client.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 INVOICES TAB */}
                        {activeTab === 'invoices' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Invoice #</th>
                                        <th className="px-6 py-4.5">Date</th>
                                        <th className="px-6 py-4.5">Status</th>
                                        <th className="px-6 py-4.5 text-right">Grand Total</th>
                                        <th className="px-6 py-4.5 text-right">Paid</th>
                                        <th className="px-6 py-4.5 text-right">Due</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {invoices.length > 0 ? invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-indigo-600 align-top">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-600 align-top">
                                                {inv.invoice_date}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider ${
                                                    inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                    inv.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                                    inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-700 align-top tabular-nums">
                                                <Taka/>{Number(inv.grand_total).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 align-top tabular-nums bg-emerald-50/30">
                                                <Taka className="text-emerald-500"/>{Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 align-top tabular-nums bg-rose-50/30">
                                                <Taka className="text-rose-500"/>{Number(inv.due_amount).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-file-invoice text-4xl mb-4 block text-gray-200"></i>No invoices generated yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}

