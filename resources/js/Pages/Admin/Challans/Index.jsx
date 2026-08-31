import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({ challans, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters.challan_number || '');
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const delayFn = setTimeout(() => {
            router.get(route('admin.challans.index'), { challan_number: searchTerm }, { preserveState: true, replace: true });
        }, 400);
        return () => clearTimeout(delayFn);
    }, [searchTerm]);

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Challan?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete'
        }).then((res) => {
            if (res.isConfirmed) router.delete(route('admin.challans.destroy', id));
        });
    };

    return (
        <AdminLayout>
            <Head title="Delivery Challans" />
            <div className="max-w-[1400px] mx-auto pb-12 mt-2 px-4 sm:px-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest mb-2 border border-emerald-100">
                            <i className="fa-solid fa-truck-fast"></i> Logistics
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Delivery Challans</h1>
                    </div>
                    <div className="flex gap-3">
                        <Link href={route('admin.challan-settings.index')} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[13.5px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2">
                            <i className="fa-solid fa-gear"></i> Settings
                        </Link>
                        <Link href={route('admin.challans.create')} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-700 shadow-md flex items-center gap-2">
                            <i className="fa-solid fa-plus"></i> Create Challan
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center">
                        <div className="relative w-full max-w-sm">
                            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by Challan Number..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-[13.5px] outline-none focus:border-indigo-500 focus:bg-white" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Challan #</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13.5px] divide-y divide-gray-100">
                                {challans.data.length > 0 ? challans.data.map(challan => (
                                    <tr key={challan.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-indigo-600">{challan.challan_number}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{challan.client?.name}</td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{challan.challan_date}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${challan.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : challan.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {challan.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <a href={route('admin.challans.print', challan.id)} target="_blank" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Print"><i className="fa-solid fa-print text-[13px]"></i></a>
                                            <Link href={route('admin.challans.edit', challan.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Edit"><i className="fa-solid fa-pen-to-square text-[13px]"></i></Link>
                                            <button onClick={() => handleDelete(challan.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="Delete"><i className="fa-solid fa-trash-can text-[13px]"></i></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="text-center py-10 text-gray-400 font-medium">No challans found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
