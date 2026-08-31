import React, { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-1 opacity-80 ${className}`}>৳</span>
);

export default function Edit({ invoice, clients = [], projects = [] }) {
    const totalPaidAmount = Number(invoice.payments_sum_amount || 0) + Number(invoice.advance_used || 0);
    const dueAmount = Math.max(Number(invoice.grand_total) - totalPaidAmount, 0);
    const [availableAdvance, setAvailableAdvance] = useState(0);

    const { data, setData, put, processing, errors } = useForm({
        id: invoice.id, client_id: invoice.client_id, invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date.slice(0, 10), due_date: invoice.due_date.slice(0, 10),
        tax: invoice.tax, discount: invoice.discount, sub_total: invoice.sub_total, grand_total: invoice.grand_total,
        use_advance_amount: invoice.advance_used, status: invoice.status, notes: invoice.notes || "",
        items: invoice.items.length ? invoice.items.map(i => ({
            project_id: i.project_id || "", item_name: i.item_name || "", description: i.description || "", quantity: i.quantity || 1, unit_price: i.unit_price || 0, total: i.total || 0
        })) : [{ project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
    });

    useEffect(() => {
        const client = clients.find(c => c.id === invoice.client_id);
        if(client) setAvailableAdvance(Number(client.available_advance || 0) + Number(invoice.advance_used || 0));
    }, []);

    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`, advance: Number(c.available_advance || 0) }));
    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({ value: p.id, label: `${p.title} - (Date: ${new Date(p.created_at).toLocaleDateString()})` }));

    const getAvailableProjectOptions = (currentIndex) => {
        const otherSelectedIds = data.items
            .filter((_, idx) => idx !== currentIndex)
            .map(item => item.project_id)
            .filter(id => id !== null && id !== "");
        return projectOptions.filter(opt => !otherSelectedIds.includes(opt.value));
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
            return { ...prev, sub_total: subtotal, grand_total: grand, use_advance_amount: validAdvanceUsed };
        });
    }, [data.items, data.tax, data.discount]);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.invoices.update', data.id), { onSuccess: () => Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }) });
    };

    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '48px', borderRadius: '0.75rem',
            border: state.isFocused ? '1px solid var(--accent, #6366f1)' : '1px solid #d1d5db',
            backgroundColor: '#ffffff', boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
            transition: 'all 0.2s ease', fontSize: '14px', cursor: 'pointer',
            '&:hover': { borderColor: state.isFocused ? 'var(--accent, #6366f1)' : '#9ca3af' }
        }),
        menu: (base) => ({ ...base, fontSize: '14px', borderRadius: '0.75rem', zIndex: 9999 }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base, backgroundColor: state.isSelected ? 'var(--accent, #4f46e5)' : state.isFocused ? '#f8fafc' : 'white',
            color: state.isSelected ? 'white' : '#1e293b', cursor: 'pointer', fontWeight: state.isSelected ? '700' : '500',
        })
    };

    return (
        <AdminLayout>
            <Head title={`Edit Invoice #${invoice.invoice_number}`} />
            <style dangerouslySetInnerHTML={{__html: `.ql-editor { min-height: 120px; font-size: 14.5px; background: #fff; border-radius: 0 0 0.75rem 0.75rem; } .ql-toolbar { border-radius: 0.75rem 0.75rem 0 0; background: #f8fafc; } .ql-container { border-radius: 0 0 0.75rem 0.75rem; }`}} />

            <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-widest mb-3 border border-amber-100">
                            <i className="fa-solid fa-pen-to-square"></i> Modification Mode
                        </div>
                        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Edit Invoice <span className="text-indigo-600">#{invoice.invoice_number}</span></h1>
                    </div>
                    <Link href={route('admin.invoices.index')} className="flex items-center justify-center gap-2 text-[14px] font-bold text-gray-600 hover:text-indigo-600 transition-all bg-white px-5 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-200 shadow-sm group">
                        <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i> Back to Invoices
                    </Link>
                </div>

                {/* 🟢 Premium Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-indigo-50 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">Grand Total</p>
                                <h3 className="text-[26px] font-black text-gray-900 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{Number(invoice.grand_total).toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-to-br from-indigo-500 to-blue-600"><i className="fa-solid fa-file-invoice-dollar text-[22px]"></i></div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-sm group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-600/90">Total Paid & Adjusted</p>
                                <h3 className="text-[26px] font-black text-emerald-700 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{totalPaidAmount.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-to-br from-emerald-400 to-teal-500"><i className="fa-solid fa-hand-holding-dollar text-[22px]"></i></div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 p-6 shadow-sm group">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-100 opacity-40 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-bold uppercase tracking-wider text-rose-600/90">Payable Due</p>
                                <h3 className="text-[26px] font-black text-rose-700 tabular-nums tracking-tight mt-0.5"><Taka className="text-[20px]" />{dueAmount.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-to-br from-rose-500 to-red-600"><i className="fa-solid fa-triangle-exclamation text-[22px]"></i></div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* General Details Section */}
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50/50 to-white">
                        <h3 className="text-[16px] font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-circle-info text-indigo-500"></i> General Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2 relative z-50">
                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Select Client <span className="text-red-500">*</span></label>
                                <Select
                                    options={clientOptions}
                                    value={clientOptions.find(o => o.value === data.client_id)}
                                    onChange={(opt) => { setData("client_id", opt ? opt.value : ""); setAvailableAdvance(opt ? opt.advance : 0); }}
                                    isClearable placeholder="🔍 Search Client..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                />
                                {errors.client_id && <span className="text-red-500 text-xs font-bold mt-1.5 block">{errors.client_id}</span>}
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Invoice # <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <i className="fa-solid fa-hashtag absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                    <input type="text" value={data.invoice_number} readOnly className="w-full rounded-xl border-gray-300 bg-gray-100 pl-10 pr-4 py-3 text-[14px] font-extrabold text-indigo-700 outline-none cursor-not-allowed" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Status <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select value={data.status} onChange={(e) => setData("status", e.target.value)} className="w-full appearance-none rounded-xl border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm">
                                        <option value="unpaid">Unpaid</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option>
                                    </select>
                                    <i className="fa-solid fa-chevron-down text-[12px] text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Invoice Date</label>
                                <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[14px] font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-[12px] font-bold text-rose-600 uppercase tracking-wider mb-2">Due Date</label>
                                <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-[14px] font-bold text-rose-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 cursor-pointer shadow-sm hover:bg-rose-100 transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="p-8 border-b border-gray-100 bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-[16px] font-bold text-gray-800 flex items-center gap-2"><i className="fa-solid fa-list-check text-emerald-500"></i> Items / Services</h3>
                                <p className="text-[12.5px] text-gray-500 mt-1 font-medium">Leave "Project" blank if you want to add a custom/extra charge.</p>
                            </div>
                            <button type="button" onClick={() => setData("items", [...data.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }])} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-gray-800 transition-colors shadow-md flex items-center gap-2">
                                <i className="fa-solid fa-plus"></i> Add Extra Charge
                            </button>
                        </div>

                        <div className="space-y-5">
                            {data.items.map((item, index) => (
                                <div key={index} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative group transition-all hover:border-indigo-200 hover:shadow-sm">
                                    <button type="button" onClick={() => { const rows=[...data.items]; rows.splice(index,1); setData("items", rows); }} disabled={data.items.length===1} className="absolute right-4 top-4 text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pr-10 relative z-40">
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Project (Optional)</label>
                                            <Select
                                                options={getAvailableProjectOptions(index)}
                                                value={projectOptions.find(o => o.value === item.project_id)}
                                                onChange={(opt) => {
                                                    const projId = opt ? opt.value : null;
                                                    const proj = projects.find(p => p.id === projId);
                                                    const rows = [...data.items];
                                                    rows[index].project_id = projId;

                                                    if(proj) {
                                                        rows[index].item_name = proj.title;
                                                        rows[index].description = proj.description || '';
                                                        rows[index].quantity = Number(proj.quantity) || 1;
                                                        rows[index].unit_price = (Number(proj.budget) || 0) / rows[index].quantity;
                                                        rows[index].total = Number(proj.budget) || 0;
                                                        setData(prev => ({ ...prev, items: rows }));
                                                    } else {
                                                        rows[index].item_name = ""; rows[index].description = ""; rows[index].unit_price = 0; rows[index].total = 0;
                                                        setData("items", rows);
                                                    }
                                                }}
                                                isClearable placeholder="Link Project..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                            />
                                        </div>
                                        <div className="lg:col-span-3">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Item Name / Title <span className="text-red-500">*</span></label>
                                            <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="e.g., Domain Renew, Server Fee" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" required />
                                            {errors[`items.${index}.item_name`] && <span className="text-red-500 text-[11px] font-bold mt-1 block">{errors[`items.${index}.item_name`]}</span>}
                                        </div>
                                        <div className="lg:col-span-4">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Item Details / Description</label>
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                                <ReactQuill theme="snow" value={item.description} onChange={(val) => updateItem(index, "description", val)} />
                                            </div>
                                        </div>

                                        {/* 🟢 FIXED: Match exact layout of Create.jsx (hidden span-1 for alignment) */}
                                        <div className="hidden lg:block lg:col-span-1"></div>

                                        <div className="lg:col-span-2">
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Qty & Unit Price</label>
                                            <div className="flex w-full gap-3">
                                                {/* 🟢 FIXED: Widened to w-2/5 */}
                                                <input type="number" step="any" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-2/5 rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-500 shadow-sm text-center" placeholder="Qty" />

                                                {/* 🟢 FIXED: Widened to w-3/5 */}
                                                <div className="relative w-3/5">
                                                    <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[14px]" />
                                                    <input type="number" step="any" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 text-[14px] font-bold text-gray-900 outline-none focus:border-indigo-500 shadow-sm text-right" placeholder="Price" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-2">Total Value</label>
                                            <div className="relative">
                                                <Taka className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-700 text-[15px]" />
                                                <input type="number" readOnly value={item.total} className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 pl-8 pr-4 py-3 text-[15px] font-black text-indigo-700 outline-none text-right shadow-inner cursor-not-allowed" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer: Terms & Calculations */}
                    <div className="p-8 bg-gray-50/50 flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                            <h4 className="text-[14px] font-bold text-gray-800 uppercase tracking-wider mb-3"><i className="fa-solid fa-file-contract text-gray-400 mr-1.5"></i> Terms & Conditions</h4>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <ReactQuill theme="snow" value={data.notes} onChange={(val) => setData("notes", val)} />
                            </div>
                        </div>
                        <div className="w-full lg:w-[400px] shrink-0 bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-lg">
                            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-3">Financial Summary</h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-gray-600">Sub Total:</span>
                                    <span className="text-[15px] font-black text-gray-900"><Taka />{Number(data.sub_total).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-gray-600">Tax / VAT (%):</span>
                                    <input type="number" value={data.tax} onChange={(e) => setData("tax", e.target.value)} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-[14px] font-bold text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-gray-600">Discount (TK):</span>
                                    <input type="number" value={data.discount} onChange={(e) => setData("discount", e.target.value)} className="w-24 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[14px] font-bold text-rose-700 text-right outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm" />
                                </div>

                                <div className="border-t-2 border-dashed border-gray-200 pt-5 mt-3 flex justify-between items-end">
                                    <span className="text-[14px] font-bold text-gray-800 uppercase tracking-widest">Grand Total:</span>
                                    <span className="text-[26px] font-black text-indigo-700 tracking-tight"><Taka className="text-[20px]"/>{Number(data.grand_total).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end gap-3">
                        <Link href={route('admin.invoices.index')} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-[14px] font-bold text-gray-700 transition-colors hover:bg-gray-100 shadow-sm">
                            Cancel
                        </Link>
                        <button type="submit" disabled={processing} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-70">
                            {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-file-invoice"></i> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
