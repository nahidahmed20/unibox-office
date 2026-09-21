import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/* ---------- Constants & Helpers ---------- */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const STATUS = [
    { value: 'unpaid', label: 'Unpaid', color: '#EF4444' },         // Red 500
    { value: 'partially_paid', label: 'Partially paid', color: '#F59E0B' }, // Amber 500
    { value: 'paid', label: 'Paid', color: '#10B981' },           // Emerald 500
];

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 ${className}`}>৳</span>
);

const Stat = ({ icon, label, value, toneClass }) => (
    <div className="flex items-center gap-4 px-6 py-5 sm:px-8">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[18px] border border-white/10 ${toneClass}`}>
            <i className={icon}></i>
        </span>
        <div>
            <p className="text-[12.5px] font-semibold text-slate-400 mb-1">{label}</p>
            <p className="text-[22px] font-extrabold leading-none tracking-tight tabular-nums text-white">
                <Taka className={`text-[15px] ${toneClass}`} />{fmt(value)}
            </p>
        </div>
    </div>
);

// Modernized Select Styles matching Projects & Create Invoice
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '48px',
        borderRadius: '10px',
        borderColor: state.isFocused ? '#4F46E5' : '#E2E8F0',
        boxShadow: state.isFocused ? '0 0 0 4px rgba(79, 70, 229, 0.15)' : 'none',
        backgroundColor: '#F8FAFC',
        '&:hover': { borderColor: '#4F46E5' },
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#1E293B',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#94A3B8', fontWeight: 600, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#1E293B', fontWeight: 700, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#1E293B', fontWeight: 600, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0' }),
};

export default function Edit({ invoice, clients = [], projects = [] }) {
    const totalPaidAmount = Number(invoice.payments_sum_amount || 0);
    const dueAmount = Math.max(Number(invoice.grand_total) - totalPaidAmount, 0);
    const [availableAdvance, setAvailableAdvance] = useState(0);

    /* Sticky summary refs */
    const formRef = useRef(null);
    const leftColumnRef = useRef(null);
    const stickyWrapperRef = useRef(null);
    const stickyInnerRef = useRef(null);
    const [stickyStyle, setStickyStyle] = useState({});

    const { data, setData, put, processing, errors } = useForm({
        id: invoice.id,
        client_id: invoice.client_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date ? invoice.invoice_date.slice(0, 10) : "",
        due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : "",
        tax: invoice.tax || 0,
        discount: invoice.discount || 0,
        sub_total: invoice.sub_total || 0,
        grand_total: invoice.grand_total || 0,
        use_advance_amount: invoice.advance_used || 0,
        status: invoice.status || "unpaid",
        notes: invoice.notes || "",
        items: invoice.items.length ? invoice.items.map(i => ({
            project_id: i.project_id || "",
            item_name: i.item_name || "",
            description: i.description || "",
            quantity: i.quantity || 1,
            unit_type: i.unit_type || "piece",
            unit_price: i.unit_price || 0,
            total: i.total || 0
        })) : [{ project_id: "", item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]
    });

    useEffect(() => {
        const client = clients.find(c => c.id === invoice.client_id);
        if (client) {
            setAvailableAdvance(Number(client.available_advance || 0) + Number(invoice.advance_used || 0));
        }
    }, [clients, invoice]);

    const clientOptions = clients.map(c => ({
        value: c.id,
        label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`,
        advance: Number(c.available_advance || 0)
    }));

    const filteredProjects = data.client_id ? projects.filter(p => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map(p => ({
        value: p.id,
        label: `${p.title} - (Date: ${new Date(p.created_at).toLocaleDateString()})`
    }));

    const getAvailableProjectOptions = (currentIndex) => {
        const otherSelectedIds = data.items
            .filter((_, idx) => idx !== currentIndex)
            .map(item => item.project_id)
            .filter(id => id !== null && id !== "");
        return projectOptions.filter(opt => !otherSelectedIds.includes(opt.value));
    };

    const updateItem = (index, field, value) => {
        setData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => {
                if (i !== index) return item;
                const updatedItem = { ...item, [field]: value };
                if (field === "quantity" || field === "unit_price") {
                    updatedItem.total = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.unit_price) || 0);
                }
                return updatedItem;
            })
        }));
    };

    const addItemRow = () => {
        setData(prev => ({
            ...prev,
            items: [...prev.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]
        }));
    };

    const removeItemRow = (index) => {
        setData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    useEffect(() => {
        let subtotal = 0;
        data.items.forEach(item => { subtotal += Number(item.total) || 0; });
        const taxAmount = (subtotal * (Number(data.tax) || 0)) / 100;
        const grand = subtotal + taxAmount - (Number(data.discount) || 0);

        setData(prev => {
            let validAdvanceUsed = Number(prev.use_advance_amount) || 0;
            if (validAdvanceUsed > grand) validAdvanceUsed = grand;
            if (validAdvanceUsed > availableAdvance) validAdvanceUsed = availableAdvance;

            if (prev.sub_total !== subtotal || prev.grand_total !== grand || prev.use_advance_amount !== validAdvanceUsed) {
                return { ...prev, sub_total: subtotal, grand_total: grand, use_advance_amount: validAdvanceUsed };
            }
            return prev;
        });
    }, [data.items, data.tax, data.discount, availableAdvance]);

    /* Sticky Logic */
    const updateStickyPosition = useCallback(() => {
        const form = formRef.current;
        const leftColumn = leftColumnRef.current;
        const wrapper = stickyWrapperRef.current;
        const inner = stickyInnerRef.current;

        if (!form || !leftColumn || !wrapper || !inner) return;

        if (window.innerWidth < 1280) {
            wrapper.style.minHeight = "";
            setStickyStyle({});
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        const innerHeight = inner.offsetHeight;
        const TOP_OFFSET = 24;

        wrapper.style.minHeight = `${leftColumn.offsetHeight}px`;

        if (wrapperRect.top > TOP_OFFSET) {
            setStickyStyle({ position: "absolute", top: 0, left: 0, width: "100%" });
        } else if (formRect.bottom > innerHeight + TOP_OFFSET) {
            setStickyStyle({ position: "fixed", top: `${TOP_OFFSET}px`, left: `${wrapperRect.left}px`, width: `${wrapperRect.width}px` });
        } else {
            setStickyStyle({ position: "absolute", top: "auto", bottom: 0, left: 0, width: "100%" });
        }
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", updateStickyPosition, { passive: true });
        window.addEventListener("resize", updateStickyPosition);
        updateStickyPosition();
        return () => {
            window.removeEventListener("scroll", updateStickyPosition);
            window.removeEventListener("resize", updateStickyPosition);
        };
    }, [updateStickyPosition]);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.invoices.update', data.id), {
            onSuccess: () => Swal.fire({ icon: 'success', title: 'Invoice Updated!', timer: 1500, showConfirmButton: false })
        });
    };

    // Modernized general input classes
    const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/15 transition-colors";

    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, menuPosition: "fixed", styles: selectStyles };
    const payable = Math.max(0, Number(data.grand_total) - Number(data.use_advance_amount || 0));

    return (
        <AdminLayout>
            <Head title={`Edit Invoice #${invoice.invoice_number}`} />

            <style dangerouslySetInnerHTML={{__html: `
                .ql-editor { min-height: 100px; font-size: 14px; background: #F8FAFC; border-radius: 0 0 0.5rem 0.5rem; font-weight: 500; color: #1E293B; }
                .ql-editor.ql-blank::before { color: #94A3B8; font-style: normal; font-weight: 500; }
                .ql-editor:focus { background: #ffffff; }
                .ql-toolbar.ql-snow { border-radius: 0.5rem 0.5rem 0 0; background: #ffffff; border-color: #E2E8F0 !important; }
                .ql-container.ql-snow { border-color: #E2E8F0 !important; }
                .quill-wrapper { border-radius: 0.5rem; overflow: hidden; transition: box-shadow 0.15s ease; }
                .quill-wrapper:focus-within .ql-toolbar.ql-snow,
                .quill-wrapper:focus-within .ql-container.ql-snow { border-color: #4F46E5 !important; }
                input[type=number]::-webkit-inner-spin-button { opacity: .4; }
            `}} />

            <div className="mx-auto mt-4 flex w-full max-w-[1400px] flex-col gap-8 pb-12">

                {/* Header with payment totals */}
                <div className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800">
                    <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8 border-b border-white/10 relative">
                        {/* Decorative Taka Background */}
                        <span className="absolute right-10 top-0 text-[180px] leading-none font-mono text-white/[0.02] select-none pointer-events-none">৳</span>

                        <div className="relative z-10">
                            <Link href={route('admin.invoices.index')} className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-400 transition hover:text-white bg-white/5 px-3 py-1.5 rounded-md border border-white/10">
                                <i className="fa-solid fa-arrow-left text-[11px]"></i> All invoices
                            </Link>
                            <h1 className="text-[28px] font-bold leading-none tracking-tight sm:text-[32px] mt-3">Edit invoice</h1>
                            <p className="mt-2 text-[14px] text-slate-400">Update the details, items or payment status of this invoice.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-6 py-4 sm:text-right relative z-10">
                            <p className="text-[12.5px] font-medium text-slate-400">Invoice number</p>
                            <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-indigo-400">#{invoice.invoice_number}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 bg-white/[0.02]">
                        <Stat icon="fa-solid fa-file-invoice-dollar" label="Grand total" value={data.grand_total} toneClass="text-indigo-400" />
                        <Stat icon="fa-solid fa-hand-holding-dollar" label="Paid and adjusted" value={totalPaidAmount} toneClass="text-emerald-400" />
                        <Stat icon="fa-solid fa-triangle-exclamation" label="Payable due" value={dueAmount} toneClass="text-rose-400" />
                    </div>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="relative flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Column */}
                    <div ref={leftColumnRef} className="flex-1 w-full flex flex-col gap-8">

                        {/* Billing Details */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
                                    <i className="fa-regular fa-address-card text-[15px]"></i>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">Billing details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Select client <span className="text-red-500">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === data.client_id) || null}
                                        onChange={(opt) => {
                                            setData("client_id", opt ? opt.value : "");
                                            if (opt && opt.value === invoice.client_id) {
                                                setAvailableAdvance(Number(opt.advance) + Number(invoice.advance_used || 0));
                                            } else {
                                                setAvailableAdvance(opt ? opt.advance : 0);
                                                setData("use_advance_amount", 0);
                                            }
                                        }}
                                        styles={selectStyles}
                                        isClearable placeholder="Search client…" {...portal}
                                    />
                                    {errors.client_id && <span className="text-red-500 text-[12px] font-semibold mt-2 block">{errors.client_id}</span>}
                                </div>

                                <div>
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Invoice date <span className="text-red-500">*</span></label>
                                    <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className={inputClass} required />
                                </div>

                                <div>
                                    <label className="block text-[12.5px] font-semibold text-red-600 mb-2.5">Payment due date <span className="text-red-500">*</span></label>
                                    <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700 outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-colors cursor-pointer" required />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Payment status <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                                        {STATUS.map(s => {
                                            const isActive = data.status === s.value;
                                            return (
                                                <button
                                                    key={s.value} type="button"
                                                    onClick={() => setData("status", s.value)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${isActive ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/50"}`}
                                                    style={{ backgroundColor: isActive ? s.color : "transparent" }}
                                                >
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : s.color }}></span>
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600">
                                        <i className="fa-solid fa-boxes-stacked text-[15px]"></i>
                                    </div>
                                    <h3 className="text-[15px] font-semibold text-slate-900 m-0">Services and items</h3>
                                </div>
                                <button type="button" onClick={addItemRow} className="border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:border-indigo-600 hover:text-indigo-600 shadow-sm transition-colors flex items-center gap-2">
                                    <i className="fa-solid fa-plus text-[11px]"></i> Add item
                                </button>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {data.items.map((item, index) => (
                                    <div key={index} className="py-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-mono text-[12px] font-semibold text-indigo-600 tracking-wide bg-indigo-50 px-2.5 py-1 rounded-md">
                                                No. {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} className="text-[12px] font-semibold text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
                                                <i className="fa-solid fa-trash-can text-[11px]"></i> Remove
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Project (optional)</label>
                                                    <Select
                                                        options={getAvailableProjectOptions(index)}
                                                        value={projectOptions.find(o => o.value === item.project_id) || null}
                                                        onChange={(opt) => {
                                                            const projId = opt ? opt.value : null;
                                                            const proj = projects.find((p) => p.id === projId);

                                                            setData((prev) => {
                                                                let newItems = [...prev.items];
                                                                if (proj && proj.items && proj.items.length > 0) {
                                                                    const mappedItems = proj.items.map(pi => ({
                                                                        project_id: projId,
                                                                        item_name: pi.item_name,
                                                                        description: pi.description || "",
                                                                        quantity: Number(pi.quantity) || 1,
                                                                        unit_type: pi.unit_type || "piece",
                                                                        unit_price: Number(pi.unit_price) || 0,
                                                                        total: Number(pi.total) || 0
                                                                    }));
                                                                    newItems.splice(index, 1, ...mappedItems);
                                                                } else if (proj) {
                                                                    newItems[index] = {
                                                                        ...newItems[index], project_id: projId, item_name: proj.title,
                                                                        description: "", quantity: 1, unit_type: "piece",
                                                                        unit_price: Number(proj.budget) || 0, total: Number(proj.budget) || 0
                                                                    };
                                                                } else {
                                                                    newItems[index] = { ...newItems[index], project_id: null, item_name: "", description: "", unit_type: "piece", unit_price: 0, total: 0 };
                                                                }
                                                                const projDate = proj && proj.created_at ? proj.created_at.slice(0, 10) : prev.invoice_date;
                                                                return { ...prev, items: newItems, invoice_date: projDate };
                                                            });
                                                        }}
                                                        isClearable placeholder="Link to project…" {...portal}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Service title <span className="text-red-500">*</span></label>
                                                    <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="E.g. Web Development" className={inputClass} required />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[12.5px] font-semibold text-slate-600 mb-2.5">Description</label>
                                                <div className="quill-wrapper">
                                                    <ReactQuill theme="snow" value={item.description || ''} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            {/* Math Row */}
                                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-2">
                                                <div className="w-20">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Qty</label>
                                                    <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                        className="w-full font-mono border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 text-[14px] font-semibold text-slate-800 bg-transparent focus:ring-0 transition-colors" placeholder="0" />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
                                                    <select value={item.unit_type} onChange={e => updateItem(index, "unit_type", e.target.value)}
                                                        className="w-full border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 bg-transparent text-[13px] font-semibold text-slate-800 cursor-pointer focus:ring-0 transition-colors">
                                                        <option value="piece">Pcs</option><option value="kg">Kg</option><option value="set">Set</option><option value="box">Box</option><option value="sqft">SqFt</option>
                                                    </select>
                                                </div>
                                                <span className="font-mono text-[15px] text-slate-300 pb-2">×</span>
                                                <div className="w-32">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit price</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-0 top-1/2 -translate-y-1/2 text-[13px] text-slate-400" />
                                                        <input type="number" step="any" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                            className="w-full font-mono border-0 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1.5 pl-5 text-[14px] font-semibold text-slate-800 bg-transparent text-right focus:ring-0 transition-colors" placeholder="0" />
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[15px] text-slate-300 pb-2">=</span>
                                                <div className="ml-auto text-right">
                                                    <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Line total</label>
                                                    <div className="font-mono text-[19px] font-bold text-emerald-600 tabular-nums">
                                                        <Taka className="text-[13px] text-emerald-600" />{fmt(item.total)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Terms and Notes */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600">
                                    <i className="fa-solid fa-file-contract text-[15px]"></i>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">Terms and notes</h3>
                            </div>
                            <div className="quill-wrapper">
                                <ReactQuill theme="snow" value={data.notes || ''} onChange={(val) => setData("notes", val)} placeholder="Payment terms, bank details, or a thank-you note…" />
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div ref={stickyWrapperRef} className="w-full xl:w-[340px] shrink-0 relative">
                        <div ref={stickyInnerRef} style={stickyStyle} className="flex flex-col gap-6 z-20">
                            <div className="bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden text-white border border-slate-800">
                                {/* Decorative Taka */}
                                <span className="absolute -right-3 -top-8 text-[130px] leading-none font-mono text-white/[0.03] select-none pointer-events-none">৳</span>

                                <div className="relative">
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-5">
                                        <i className="fa-solid fa-receipt text-indigo-400"></i>
                                        <p className="text-[14px] font-bold text-white">Invoice summary</p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[13px] text-slate-400">Subtotal</span>
                                            <span className="font-mono text-[14px] font-semibold"><Taka className="text-[12px] text-slate-400"/>{fmt(data.sub_total)}</span>
                                        </div>

                                        <div className="flex justify-between items-center gap-4">
                                            <label htmlFor="tax" className="text-[13px] text-slate-400">Tax / VAT (%)</label>
                                            <input id="tax" type="number" min="0" value={data.tax} onChange={(e) => setData("tax", e.target.value)}
                                                className="w-20 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-[13px] font-bold tabular-nums text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
                                        </div>

                                        <div className="flex justify-between items-center gap-4 pb-4 border-b border-white/10">
                                            <label htmlFor="discount" className="text-[13px] text-slate-400">Discount (৳)</label>
                                            <input id="discount" type="number" min="0" value={data.discount} onChange={(e) => setData("discount", e.target.value)}
                                                className="w-24 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-[13px] font-bold tabular-nums text-red-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
                                        </div>

                                        <div className="pt-2 pb-4">
                                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Grand total</span>
                                            <div className="flex items-baseline gap-1 font-mono text-[32px] font-bold tracking-tight">
                                                <Taka className="text-[18px] text-indigo-400" />
                                                <span>{fmt(data.grand_total)}</span>
                                            </div>
                                        </div>

                                        {/* Advance Usage Section */}
                                        {availableAdvance > 0 && (
                                            <div className="border-t border-white/10 pt-5 pb-2">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-400">
                                                        <i className="fa-solid fa-piggy-bank"></i> Client advance
                                                    </span>
                                                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20">
                                                        Balance: ৳{fmt(availableAdvance)}
                                                    </span>
                                                </div>
                                                <div className="relative mb-3">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">Use</span>
                                                    <input type="number" min="0" max={availableAdvance} value={data.use_advance_amount} onChange={(e) => setData("use_advance_amount", e.target.value)}
                                                        className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-2 pl-10 pr-3 text-right text-[14px] font-bold tabular-nums text-emerald-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" />
                                                </div>
                                                <div className="flex items-center justify-between text-[13px] pt-1">
                                                    <span className="text-slate-400">Due after advance</span>
                                                    <span className="font-mono font-bold tabular-nums text-white"><Taka className="text-[12px] text-slate-400"/>{fmt(payable)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={processing} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg text-[14px] font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
                                            {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-cloud-arrow-up"></i> Update invoice</>}
                                        </button>
                                        <Link href={route('admin.invoices.index')} className="w-full text-slate-400 py-3 rounded-lg text-[13px] font-semibold hover:text-white transition-colors border border-white/10 hover:border-white/20 flex items-center justify-center mt-1">
                                            Cancel &amp; go back
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
