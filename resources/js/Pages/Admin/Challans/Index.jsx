import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import TableExportButtons from '@/Components/TableExportButtons';

export default function Index({ challans, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters?.challan_number || '');
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayFn = setTimeout(() => {
            router.get(route('admin.challans.index'), { challan_number: searchTerm }, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayFn);
    }, [searchTerm]);

    const exportHeaders = ['Challan #', 'Client', 'Date', 'Status'];
    const exportRows = useMemo(() => {
        return (challans?.data || []).map(ch => [
            ch.challan_number || '—',
            ch.client?.name || '—',
            ch.challan_date || '—',
            ch.status || '—'
        ]);
    }, [challans]);

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Challan?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete'
        }).then((res) => {
            if (res.isConfirmed) router.delete(route('admin.challans.destroy', id));
        });
    };
    const challanList = challans?.data || [];

    return (
        <AdminLayout>
            <Head title="Delivery Challans" />
            <div className="mx-auto mt-4 flex max-w-[1600px] flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
                <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl"></div>
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><i className="fa-solid fa-truck-fast text-[19px]"></i></div>
                        <div>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Delivery &amp; logistics</div>
                            <h1 className="text-[27px] font-black leading-none tracking-tight text-slate-900 sm:text-[32px]">Delivery Challans</h1>
                            <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-slate-500">Prepare and track items delivered to your clients.</p>
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Link href={route('admin.challan-settings.index')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] font-extrabold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                            <i className="fa-solid fa-gear"></i> Settings
                        </Link>
                        <Link href={route('admin.challans.create')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg">
                            <i className="fa-solid fa-plus"></i> Create challan
                        </Link>
                    </div>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fa-solid fa-list-check text-[15px]"></i></div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[16px] font-black text-slate-900">Challan directory</h2>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">{challans?.total ?? challanList.length} total</span>
                                </div>
                                <p className="mt-0.5 text-[12px] font-medium text-slate-500">Search, export, and manage delivery records</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-[300px]">
                                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"></i>
                                <input type="text" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search challan number…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-semibold text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                            </div>
                            <TableExportButtons
                                headers={exportHeaders}
                                rows={exportRows}
                                filename="challans_list"
                                title="Delivery Challans Directory"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] whitespace-nowrap border-collapse text-left">
                            <thead className="sticky top-0 z-10 border-b-2 border-slate-200 bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="w-14 px-6 py-4 text-center">SL</th>
                                    <th className="px-6 py-4">Challan information</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Delivery date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="w-36 px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13.5px] text-slate-800">
                                {challanList.length > 0 ? challanList.map((challan, index) => (
                                    <tr key={challan.id} className="group transition-colors hover:bg-indigo-50/30">
                                        <td className="px-6 py-4 text-center font-bold text-slate-400">{challans?.from ? challans.from + index : index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-extrabold text-indigo-600">{challan.challan_number || '—'}</div>
                                            <div className="mt-0.5 text-[11.5px] font-medium text-slate-400">Delivery document</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[12px] font-black uppercase text-slate-500 shadow-sm">{(challan.client?.company_name || challan.client?.name || '?').charAt(0)}</span>
                                                <span className="font-bold text-slate-800">{challan.client?.company_name || challan.client?.name || 'Unknown client'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-600"><i className="fa-regular fa-calendar text-indigo-400"></i>{challan.challan_date || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider ${challan.status === 'delivered' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : challan.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${challan.status === 'delivered' ? 'bg-emerald-500' : challan.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                                {challan.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <a href={route('admin.challans.print', challan.id)} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600" title="Print"><i className="fa-solid fa-print text-[13px]"></i></a>
                                                <Link href={route('admin.challans.edit', challan.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600" title="Edit"><i className="fa-regular fa-pen-to-square text-[13px]"></i></Link>
                                                <button onClick={() => handleDelete(challan.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" title="Delete"><i className="fa-solid fa-trash-can text-[13px]"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="px-6 py-14 text-center">
                                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-300"><i className="fa-solid fa-truck-fast text-xl"></i></span>
                                        <p className="text-[14px] font-bold text-slate-700">No delivery challans found</p>
                                        <p className="mt-1 text-[12.5px] font-medium text-slate-500">Try another challan number or create a new challan.</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
