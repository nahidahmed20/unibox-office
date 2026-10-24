import React, { useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from '@/Components/PortalSelect';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import CustomSelect from '@/Components/CustomSelect';

export default function Edit({ challan, clients = [], projects = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        id: challan.id, client_id: challan.client_id, challan_number: challan.challan_number,
        challan_date: challan.challan_date.slice(0, 10), status: challan.status, notes: challan.notes || "",
        items: challan.items.map(i => ({ project_id: i.project_id || "", item_name: i.item_name, description: i.description || "", quantity: i.quantity, unit_price: i.unit_price, total: i.total }))
    });
    const itemRefs = useRef([]);
    const pendingItemFocus = useRef(false);

    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` }));
    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({ value: p.id, label: p.title }));

    const updateItem = (index, field, value) => {
        setData(prev => ({
            ...prev,
            items: prev.items.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                const updatedItem = { ...item, [field]: value };
                if (field === "quantity" || field === "unit_price") {
                    updatedItem.total = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.unit_price) || 0);
                }
                return updatedItem;
            })
        }));
    };

    const addItemRow = () => {
        pendingItemFocus.current = true;
        setData(prev => ({
            ...prev,
            items: [...prev.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
        }));
    };

    const removeItemRow = (index) => {
        setData(prev => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
    };

    useEffect(() => {
        if (!pendingItemFocus.current) return;

        const newItemIndex = data.items.length - 1;
        const frame = window.requestAnimationFrame(() => {
            const newItem = itemRefs.current[newItemIndex];
            newItem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newItem?.querySelector('[data-item-name]')?.focus({ preventScroll: true });
            pendingItemFocus.current = false;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [data.items.length]);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.challans.update', data.id), { onSuccess: () => Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false }) });
    };

    const selectStyles = {
        control: (base, state) => ({
            ...base, minHeight: '44px', borderRadius: '0.75rem',
            borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
            boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            backgroundColor: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
            '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#94a3b8' }
        }),
        placeholder: base => ({ ...base, color: '#94a3b8', fontWeight: 600 }),
        singleValue: base => ({ ...base, color: '#1e293b', fontWeight: 700 }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };
    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, styles: selectStyles };
    const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-800 outline-none transition-all hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm";
    const totalQuantity = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalValue = data.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    return (
        <AdminLayout>
            <Head title="Edit Challan" />
            <style dangerouslySetInnerHTML={{__html: `
                .ql-editor { min-height: 96px; font-size: 14px; background: #fff; border-radius: 0 0 0.75rem 0.75rem; font-weight: 600; color: #0f172a; }
                .ql-editor.ql-blank::before { color: #64748b; font-style: normal; font-weight: 600; }
                .ql-toolbar.ql-snow { border-radius: 0.75rem 0.75rem 0 0; background: #f8fafc; border-color: #cbd5e1 !important; }
                .ql-container.ql-snow { border-color: #cbd5e1 !important; border-top: none !important; }
                .quill-wrapper { overflow: hidden; border-radius: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); transition: box-shadow .2s ease; }
                .quill-wrapper:focus-within { box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
                .quill-wrapper:focus-within .ql-toolbar.ql-snow, .quill-wrapper:focus-within .ql-container.ql-snow { border-color: #6366f1 !important; }
                .challan-item-description .ql-toolbar.ql-snow { padding: 5px 8px; }
                .challan-item-description .ql-editor { min-height: 56px; max-height: 120px; overflow-y: auto; }
            `}} />

            <div className="mx-auto mt-4 flex max-w-[1600px] flex-col gap-6 pb-12 animate-fade-in-up">
                <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl"></div>
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><i className="fa-solid fa-truck-fast text-[19px]"></i></div>
                        <div>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Delivery &amp; logistics</div>
                            <h1 className="text-[27px] font-black leading-none tracking-tight text-slate-900 sm:text-[32px]">Edit Delivery Challan</h1>
                            <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-slate-500">Update delivery details and the items on this challan.</p>
                        </div>
                    </div>
                    <div className="relative flex items-center justify-between gap-4 sm:justify-end">
                        <div className="sm:text-right"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Challan number</p><p className="mt-1 text-[18px] font-black tabular-nums text-indigo-700">{data.challan_number || '—'}</p></div>
                        <Link href={route('admin.challans.index')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-extrabold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><i className="fa-solid fa-arrow-left"></i> All Challans</Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col items-start gap-6 xl:flex-row">
                    <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600"><i className="fa-regular fa-address-card"></i></div>
                                <div><h2 className="text-[16px] font-black text-slate-900">Challan details</h2><p className="mt-0.5 text-[12px] font-medium text-slate-500">Client, delivery date, and status</p></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Client <span className="text-rose-600">*</span></label>
                                    <Select options={clientOptions} value={clientOptions.find(option => String(option.value) === String(data.client_id)) || null} onChange={option => setData('client_id', option ? option.value : '')} isClearable placeholder="Search client…" {...portal} />
                                    {errors.client_id && <span className="mt-1.5 block text-[12px] font-bold text-rose-600">{errors.client_id}</span>}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Challan date</label>
                                    <input type="date" value={data.challan_date} onChange={event => setData('challan_date', event.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Delivery status</label>
                                    <CustomSelect value={data.status} onChange={event => setData('status', event.target.value)} className="w-full">
                                        <option value="pending">Pending</option><option value="delivered">Delivered</option><option value="canceled">Canceled</option>
                                    </CustomSelect>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                            <div className="sticky top-2 z-30 -mx-2 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-md backdrop-blur sm:mx-0 sm:px-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"><i className="fa-solid fa-boxes-stacked"></i></div>
                                    <div><h2 className="text-[16px] font-black text-slate-900">Items to deliver</h2><p className="mt-0.5 text-[12px] font-semibold text-slate-500">{data.items.length} {data.items.length === 1 ? 'item' : 'items'}</p></div>
                                </div>
                                <button type="button" onClick={addItemRow} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><i className="fa-solid fa-plus"></i> Add item</button>
                            </div>
                            <div className="space-y-3">
                                {data.items.map((item, index) => (
                                    <div key={index} ref={node => { itemRefs.current[index] = node; }} className="overflow-visible rounded-xl border border-slate-200 bg-slate-50/70 shadow-sm transition-colors hover:border-indigo-200">
                                        <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-slate-200 bg-white px-4 py-3">
                                            <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-[11px] font-black text-indigo-700">{String(index + 1).padStart(2, '0')}</span><span className="truncate text-[13px] font-extrabold text-slate-800">{item.item_name || `Item ${index + 1}`}</span></div>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} aria-label={`Remove item ${index + 1}`} title="Remove item" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"><i className="fa-solid fa-trash-can text-[12px]"></i></button>
                                        </div>
                                        <div className="flex flex-col gap-4 p-4">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Project <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label>
                                                    <Select options={projectOptions} value={projectOptions.find(option => String(option.value) === String(item.project_id)) || null} onChange={option => {
                                                        const projectId = option ? option.value : '';
                                                        const project = projects.find(candidate => String(candidate.id) === String(projectId));
                                                        updateItem(index, 'project_id', projectId);
                                                        if (project) { updateItem(index, 'item_name', project.title); updateItem(index, 'quantity', project.quantity || 1); }
                                                    }} isClearable placeholder="Link to project…" {...portal} />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Item name <span className="text-rose-600">*</span></label>
                                                    <input data-item-name type="text" value={item.item_name} onChange={event => updateItem(index, 'item_name', event.target.value)} placeholder="e.g. Office chairs" className={inputClass} required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Description <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label>
                                                <div className="quill-wrapper challan-item-description"><ReactQuill theme="snow" value={item.description || ''} onChange={value => updateItem(index, 'description', value)} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                                                <div><label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Quantity</label><input type="number" step="any" min="0" value={item.quantity} onChange={event => updateItem(index, 'quantity', event.target.value)} className={`${inputClass} text-right font-mono`} /></div>
                                                <div><label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Unit price <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label><input type="number" step="any" min="0" value={item.unit_price} onChange={event => updateItem(index, 'unit_price', event.target.value)} className={`${inputClass} text-right font-mono`} /></div>
                                                <div className="col-span-2 sm:col-span-1"><label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Line total</label><input type="number" readOnly value={item.total} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-right font-mono text-[13.5px] font-black text-emerald-700 outline-none" /></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                                <p className="m-0 text-[12.5px] font-semibold text-slate-600">{data.items.length} {data.items.length === 1 ? 'item' : 'items'} added. Add another whenever you need.</p>
                                <button type="button" onClick={addItemRow} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition hover:bg-indigo-700"><i className="fa-solid fa-plus"></i> Add item</button>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600"><i className="fa-solid fa-file-lines"></i></div>
                                <div><h2 className="text-[16px] font-black text-slate-900">Notes and remarks</h2><p className="mt-0.5 text-[12px] font-medium text-slate-500">Optional delivery instructions</p></div>
                            </div>
                            <div className="quill-wrapper"><ReactQuill theme="snow" value={data.notes || ''} onChange={value => setData('notes', value)} placeholder="Add delivery notes or instructions…" /></div>
                        </section>
                    </div>

                    <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[340px]">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fa-solid fa-clipboard-list"></i></div><div><h2 className="text-[15px] font-black text-slate-900">Delivery summary</h2><p className="text-[11.5px] font-medium text-slate-500">Review before saving</p></div></div></div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-slate-500">Challan number</span><span className="font-black text-slate-800">{data.challan_number || '—'}</span></div>
                                <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-slate-500">Items</span><span className="font-black text-slate-800">{data.items.length}</span></div>
                                <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-slate-500">Total quantity</span><span className="font-black text-slate-800 tabular-nums">{totalQuantity.toLocaleString('en-IN')}</span></div>
                                <div className="border-t border-dashed border-slate-200 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Estimated item value</p><p className="mt-1 text-[26px] font-black tracking-tight text-slate-900 tabular-nums"><span className="mr-1 text-[18px] text-indigo-500">৳</span>{totalValue.toLocaleString('en-IN')}</p><p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">For reference only. A delivery challan does not create an invoice.</p></div>
                                <button type="submit" disabled={processing} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-[13px] font-extrabold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"><i className={`fa-solid ${processing ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>{processing ? 'Saving…' : 'Update challan'}</button>
                            </div>
                        </div>
                    </aside>
                </form>
            </div>
        </AdminLayout>
    );
}
