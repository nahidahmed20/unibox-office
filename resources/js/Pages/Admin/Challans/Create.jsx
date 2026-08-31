import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Create({ clients = [], projects = [], nextChallanNumber }) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: "", challan_number: nextChallanNumber || "",
        challan_date: new Date().toISOString().split('T')[0], status: "pending", notes: "",
        items: [{ project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
    });

    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }));
    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({ value: p.id, label: p.title }));

    const updateItem = (index, field, value) => {
        const rows = [...data.items];
        rows[index][field] = value;
        if (field === "quantity" || field === "unit_price") {
            rows[index].total = (Number(rows[index].quantity) || 0) * (Number(rows[index].unit_price) || 0);
        }
        setData("items", rows);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.challans.store'), { onSuccess: () => Swal.fire({ icon: 'success', title: 'Challan Created!', timer: 1500, showConfirmButton: false }) });
    };

    const selectStyles = { control: (base, state) => ({ ...base, minHeight: '48px', borderRadius: '0.75rem', borderColor: state.isFocused ? '#6366f1' : '#d1d5db', fontSize: '14px', cursor: 'pointer' }) };

    return (
        <AdminLayout>
            <Head title="Create Challan" />
            <style dangerouslySetInnerHTML={{__html: `.ql-editor { min-height: 120px; font-size: 14.5px; border-radius: 0 0 0.75rem 0.75rem; }`}} />

            <div className="max-w-[1200px] mx-auto pb-12 mt-2 px-4 sm:px-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-[28px] font-extrabold text-gray-900">New Delivery Challan</h1>
                    </div>
                    <Link href={route('admin.challans.index')} className="bg-white border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-[13.5px] shadow-sm"><i className="fa-solid fa-arrow-left"></i> Back</Link>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Select Client *</label>
                            <Select options={clientOptions} onChange={(opt) => setData("client_id", opt ? opt.value : "")} isClearable styles={selectStyles} />
                            {errors.client_id && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.client_id}</span>}
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Challan #</label>
                            <input type="text" value={data.challan_number} readOnly className="w-full rounded-xl bg-gray-100 border-gray-300 py-3 px-4 font-bold outline-none cursor-not-allowed text-indigo-700" />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Status</label>
                            <select value={data.status} onChange={(e) => setData("status", e.target.value)} className="w-full rounded-xl border-gray-300 py-3 px-4 font-bold outline-none focus:border-indigo-500 bg-white cursor-pointer shadow-sm">
                                <option value="pending">Pending</option><option value="delivered">Delivered</option><option value="canceled">Canceled</option>
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Challan Date</label>
                            <input type="date" value={data.challan_date} onChange={(e) => setData("challan_date", e.target.value)} className="w-full rounded-xl border-gray-300 py-3 px-4 font-bold outline-none focus:border-indigo-500 shadow-sm" />
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-[16px] font-bold text-gray-800"><i className="fa-solid fa-boxes-stacked text-indigo-500"></i> Items to Deliver</h3>
                            <button type="button" onClick={() => setData("items", [...data.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }])} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-[12px] font-bold shadow-sm"><i className="fa-solid fa-plus"></i> Add Item</button>
                        </div>

                        <div className="space-y-4">
                            {data.items.map((item, index) => (
                                <div key={index} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative group">
                                    <button type="button" onClick={() => { const rows=[...data.items]; rows.splice(index,1); setData("items", rows); }} disabled={data.items.length===1} className="absolute right-4 top-4 text-red-400 hover:text-red-600 disabled:opacity-30"><i className="fa-solid fa-trash-can text-lg"></i></button>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pr-8">
                                        <div className="lg:col-span-1">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Project</label>
                                            <Select options={projectOptions} onChange={(opt) => {
                                                const proj = projects.find(p => p.id === (opt?.value));
                                                updateItem(index, 'project_id', opt?.value);
                                                if(proj) { updateItem(index, 'item_name', proj.title); updateItem(index, 'quantity', proj.quantity || 1); }
                                            }} styles={selectStyles} isClearable placeholder="Link..." />
                                        </div>
                                        <div className="lg:col-span-3">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Item Name *</label>
                                            <input type="text" value={item.item_name} onChange={e => updateItem(index, "item_name", e.target.value)} className="w-full rounded-xl border-gray-300 py-3 px-4 font-bold outline-none focus:border-indigo-500" required />
                                        </div>
                                        <div className="lg:col-span-4">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Description</label>
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-200"><ReactQuill theme="snow" value={item.description} onChange={val => updateItem(index, "description", val)} /></div>
                                        </div>
                                        <div className="lg:col-span-1"></div>
                                        <div className="lg:col-span-3 flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Qty</label>
                                                <input type="number" step="any" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} className="w-full rounded-xl border-gray-300 py-3 px-4 font-bold text-center outline-none" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Unit Price (Opt)</label>
                                                <input type="number" step="any" value={item.unit_price} onChange={e => updateItem(index, "unit_price", e.target.value)} className="w-full rounded-xl border-gray-300 py-3 px-4 font-bold text-center outline-none" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Total</label>
                                                <input type="number" readOnly value={item.total} className="w-full rounded-xl border-gray-300 bg-gray-100 py-3 px-4 font-bold text-center outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 border-t border-gray-100">
                        <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Notes / Remark</label>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200"><ReactQuill theme="snow" value={data.notes} onChange={val => setData("notes", val)} /></div>
                    </div>

                    <div className="px-8 py-5 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
                        <button type="submit" disabled={processing} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all"><i className="fa-solid fa-save mr-2"></i> Save Challan</button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
