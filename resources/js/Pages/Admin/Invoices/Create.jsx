import React, { useState, useEffect } from 'react'; 
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react'; 
import Swal from 'sweetalert2'; 
import Select from 'react-select'; 
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Create({ clients = [], projects = [], nextInvoiceNumber }) {
    const [availableAdvance, setAvailableAdvance] = useState(0);

    const { data, setData, post, processing, errors } = useForm({
        client_id: "", invoice_number: nextInvoiceNumber || "",
        invoice_date: new Date().toISOString().split('T')[0], due_date: new Date().toISOString().split('T')[0],
        tax: 0, discount: 0, sub_total: 0, grand_total: 0, use_advance_amount: 0, status: "unpaid", notes: "",
        items: [{ project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
    });

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
        if (!data.client_id) return Swal.fire("Required", "Please select a client.", "warning");
        post(route('admin.invoices.store'), { 
            onSuccess: () => Swal.fire({ icon: 'success', title: 'Invoice Created!', timer: 1500, showConfirmButton: false }),
        });
    };

    return (
        <AdminLayout>
            <Head title="Create Invoice" />
            <style dangerouslySetInnerHTML={{__html: `.ql-editor { min-height: 100px; font-size: 14px; background: #fff; }`}} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-[22px] font-bold text-[#202223]">Generate New Invoice</h1>
                    <Link href={route('admin.invoices.index')} className="text-sm text-blue-600 hover:underline"><i className="fa-solid fa-arrow-left mr-1"></i> Back to Invoices</Link>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b pb-8">
                    <div className="lg:col-span-2">
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Select Client *</label>
                        <Select options={clientOptions} onChange={(opt) => {
                            setData("client_id", opt ? opt.value : ""); setAvailableAdvance(opt ? opt.advance : 0);
                        }} isClearable placeholder="Search Client..." />
                        {errors.client_id && <span className="text-red-500 text-xs">{errors.client_id}</span>}
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Invoice # *</label>
                        <input type="text" value={data.invoice_number} readOnly className="w-full rounded-md border-gray-300 bg-gray-100 px-3 py-2 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Status *</label>
                        <select value={data.status} onChange={(e) => setData("status", e.target.value)} className="w-full rounded-md border-gray-300 px-3 py-2 text-sm">
                            <option value="unpaid">Unpaid</option><option value="paid">Paid</option>
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Invoice Date</label>
                        <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className="w-full rounded-md border-gray-300 px-3 py-2 text-sm" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Due Date</label>
                        <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full rounded-md border-gray-300 px-3 py-2 text-sm" />
                    </div>
                </div>

                <div className="mb-6 flex justify-between items-center border-b pb-3">
                    <div>
                        <h4 className="text-[16px] font-bold">Items / Services</h4>
                        <p className="text-xs text-gray-500">Leave "Project" blank if you want to add a custom/extra charge.</p>
                    </div>
                    <button type="button" onClick={() => setData("items", [...data.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }])} className="bg-gray-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold"><i className="fa-solid fa-plus mr-1"></i> Add Extra Charge</button>
                </div>

                {data.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-4 relative">
                        <button type="button" onClick={() => { const rows=[...data.items]; rows.splice(index,1); setData("items", rows); }} disabled={data.items.length===1} className="absolute right-3 top-3 text-red-500 hover:bg-red-100 p-2 rounded"><i className="fa-solid fa-trash-can"></i></button>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 pr-8">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">Project (Optional)</label>
                                <Select 
                                    options={getAvailableProjectOptions(index)} 
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
                                            const projDate = proj.created_at ? proj.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
                                            setData(prev => ({ ...prev, items: rows, invoice_date: projDate, due_date: new Date().toISOString().slice(0, 10) }));
                                        } else {
                                            rows[index].item_name = ""; rows[index].description = ""; rows[index].unit_price = 0; rows[index].total = 0;
                                            setData("items", rows);
                                        }
                                    }} 
                                    isClearable 
                                    placeholder="Leave blank for Custom..." 
                                />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">Item Name / Title *</label>
                                <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="e.g., Domain Renew, Server Fee" className="w-full rounded-md border-gray-300" required />
                                {errors[`items.${index}.item_name`] && <span className="text-red-500 text-xs">{errors[`items.${index}.item_name`]}</span>}
                            </div>
                            <div className="lg:col-span-4">
                                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">Item Details / Description</label>
                                <ReactQuill theme="snow" value={item.description} onChange={(val) => updateItem(index, "description", val)} />
                            </div>
                            <div className="lg:col-span-2"></div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">Qty / Unit Price</label>
                                <div className="flex gap-2">
                                    <input type="number" step="any" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-1/3 rounded-md border-gray-300" placeholder="Qty" />
                                    <input type="number" step="any" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} className="w-2/3 rounded-md border-gray-300" placeholder="Price" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">Total</label>
                                <input type="number" readOnly value={item.total} className="w-full rounded-md border-gray-300 bg-gray-200 font-bold text-[var(--accent)]" />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 border-t pt-8">
                    <div>
                        <h4 className="text-[15px] font-bold mb-3">Terms & Conditions</h4>
                        <ReactQuill theme="snow" value={data.notes} onChange={(val) => setData("notes", val)} />
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <div className="flex justify-between mb-3"><span className="font-bold">Sub Total:</span> <strong>TK {data.sub_total}</strong></div>
                        <div className="flex justify-between mb-3 items-center"><span className="font-bold">Tax / VAT (%):</span> <input type="number" value={data.tax} onChange={(e) => setData("tax", e.target.value)} className="w-24 rounded border-gray-300 px-2 py-1 text-right" /></div>
                        <div className="flex justify-between mb-5 items-center"><span className="font-bold">Discount (TK):</span> <input type="number" value={data.discount} onChange={(e) => setData("discount", e.target.value)} className="w-24 rounded border-gray-300 px-2 py-1 text-right" /></div>
                        <div className="flex justify-between border-t-2 pt-4 text-xl font-black"><span>Grand Total:</span> <span className="text-[var(--accent)]">TK {data.grand_total}</span></div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 border-t pt-6">
                    <button type="submit" disabled={processing} className="bg-[var(--accent)] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#b08630]">{processing ? 'Saving...' : 'Save & Generate Invoice'}</button>
                </div>
            </form>
        </AdminLayout>
    );
}