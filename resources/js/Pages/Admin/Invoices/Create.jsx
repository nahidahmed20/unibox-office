import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import CustomSelect from '@/Components/CustomSelect';

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

// 🟢 Deeper Contrast Select Styles (Matches Projects)
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '48px',
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#4F46E5' : '#94A3B8', // slate-400 for Deep borders
        boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        '&:hover': { borderColor: state.isFocused ? '#4F46E5' : '#64748B' }, // hover effect slate-500
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
        color: state.isSelected ? '#FFFFFF' : '#0F172A',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: '#64748B', fontWeight: 700, fontSize: '14px' }),
    singleValue: (base) => ({ ...base, color: '#0F172A', fontWeight: 800, fontSize: '14px' }),
    input: (base) => ({ ...base, color: '#0F172A', fontWeight: 700, fontSize: '14px' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #94A3B8', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }),
};

export default function Create({ clients = [], projects = [], nextInvoiceNumber }) {

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const urlClientId = urlParams.get('client_id');
    const urlProjectId = urlParams.get('project_id');

    const initialProject = projects.find(p => p.id == urlProjectId) || null;
    const initialClient = clients.find(c => c.id == urlClientId) || null;

    const [availableAdvance, setAvailableAdvance] = useState(initialClient ? Number(initialClient.available_advance || 0) : 0);

    /* Sticky refs */
    const formRef = useRef(null);
    const leftColumnRef = useRef(null);
    const stickyWrapperRef = useRef(null);
    const stickyInnerRef = useRef(null);
    const [stickyStyle, setStickyStyle] = useState({});

    // Load ALL items from the project if opened via URL
    const initialItems = (initialProject && initialProject.items && initialProject.items.length > 0)
        ? initialProject.items.map(pi => ({
            project_id: initialProject.id,
            item_name: pi.item_name,
            description: pi.description || "",
            quantity: Number(pi.quantity) || 1,
            unit_type: pi.unit_type || "piece",
            unit_price: Number(pi.unit_price) || 0,
            total: Number(pi.total) || 0
        }))
        : [{
            project_id: initialProject ? initialProject.id : "",
            item_name: initialProject ? initialProject.title : "",
            description: initialProject ? (initialProject.description || "") : "",
            quantity: 1,
            unit_type: "piece",
            unit_price: initialProject ? (Number(initialProject.budget) || 0) : 0,
            total: initialProject ? (Number(initialProject.budget) || 0) : 0
        }];

    const { data, setData, post, processing, errors } = useForm({
        client_id: urlClientId ? Number(urlClientId) : "",
        invoice_number: nextInvoiceNumber || "",
        invoice_date: initialProject?.created_at ? initialProject.created_at.slice(0, 10) : new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        tax: 0,
        discount: 0,
        sub_total: 0,
        grand_total: 0,
        use_advance_amount: 0,
        status: "unpaid",
        notes: "",
        items: initialItems
    });

    const clientOptions = clients.map((c) => ({
        value: c.id,
        label: `${c.name} ${c.company_name ? `(${c.company_name})` : ''}`,
        advance: Number(c.available_advance || 0)
    }));

    const filteredProjects = data.client_id ? projects.filter((p) => p.client_id == data.client_id) : projects;
    const projectOptions = filteredProjects.map((p) => ({
        value: p.id,
        label: `${p.title} - (Date: ${new Date(p.created_at).toLocaleDateString()})`
    }));

    const getAvailableProjectOptions = (currentIndex) => {
        const otherSelectedIds = data.items
            .filter((_, idx) => idx !== currentIndex)
            .map((item) => item.project_id)
            .filter((id) => id !== null && id !== "");
        return projectOptions.filter((opt) => !otherSelectedIds.includes(opt.value));
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
        setData(prev => {
            const lastProjectId = prev.items.length > 0 ? prev.items[prev.items.length - 1].project_id : "";
            return {
                ...prev,
                items: [...prev.items, { project_id: lastProjectId, item_name: "", description: "", quantity: 1, unit_type: "piece", unit_price: 0, total: 0 }]
            };
        });
    };

    const removeItemRow = (index) => {
        setData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    useEffect(() => {
        let subtotal = 0;
        data.items.forEach((item) => { subtotal += Number(item.total) || 0; });

        const taxAmount = (subtotal * (Number(data.tax) || 0)) / 100;
        const grand = subtotal + taxAmount - (Number(data.discount) || 0);

        setData((prev) => {
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
        if (!data.client_id) return Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a client.', confirmButtonColor: '#4F46E5' });

        post(route("admin.invoices.store"), {
            onSuccess: () => Swal.fire({ icon: "success", title: "Invoice Created!", timer: 1500, showConfirmButton: false })
        });
    };

    // 🟢 Deeper Contrast Input Classes
    const inputClass = "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all";

    const portal = { menuPortalTarget: typeof document !== 'undefined' ? document.body : null, menuPosition: "fixed", styles: selectStyles };
    const payable = Math.max(0, Number(data.grand_total) - Number(data.use_advance_amount || 0));

    return (
        <AdminLayout>
            <Head title="Create Invoice" />

            <style dangerouslySetInnerHTML={{__html: `
                /* 🟢 Deeper Quill Editor Borders */
                .ql-editor { min-height: 100px; font-size: 14px; background: #FFFFFF; border-radius: 0 0 0.75rem 0.75rem; font-weight: 600; color: #0F172A; }
                .ql-editor.ql-blank::before { color: #64748B; font-style: normal; font-weight: 600; }
                .ql-editor:focus { background: #ffffff; }
                .ql-toolbar.ql-snow { border-radius: 0.75rem 0.75rem 0 0; background: #F8FAFC; border-color: #94A3B8 !important; border-width: 1px; }
                .ql-container.ql-snow { border-color: #94A3B8 !important; border-width: 1px; border-top: none !important; }
                .quill-wrapper { border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); transition: all 0.2s ease; }
                .quill-wrapper:focus-within { box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
                .quill-wrapper:focus-within .ql-toolbar.ql-snow,
                .quill-wrapper:focus-within .ql-container.ql-snow { border-color: #4F46E5 !important; }
                input[type=number]::-webkit-inner-spin-button { opacity: .4; }
            `}} />

            <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto pb-12 mt-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b-2 border-slate-300">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 text-[11px] font-black uppercase tracking-widest mb-3 shadow-sm">
                            <i className="fa-solid fa-file-invoice"></i> New billing
                        </div>
                        <h1 className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">Create Invoice</h1>
                        <p className="text-[14.5px] font-bold text-slate-500 mt-2 max-w-md">Pick a client, add the work you did, and send a clean bill.</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[12.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Invoice No.</p>
                            <p className="text-[20px] font-black text-indigo-700 tabular-nums">{data.invoice_number || "—"}</p>
                        </div>
                        <div className="h-10 w-[2px] bg-slate-200 hidden sm:block"></div>
                        <Link href={route("admin.invoices.index")} className="flex w-fit items-center justify-center gap-2 text-[14px] font-black text-slate-700 hover:text-indigo-700 transition-colors border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 px-5 py-2.5 rounded-xl bg-white shadow-sm">
                            <i className="fa-solid fa-arrow-left-long"></i> All Invoices
                        </Link>
                    </div>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="relative flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Column */}
                    <div ref={leftColumnRef} className="flex-1 w-full flex flex-col gap-8">

                        {/* Billing Details */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                                    <i className="fa-regular fa-address-card text-[16px]"></i>
                                </div>
                                <h3 className="text-[18px] font-black text-slate-900">Billing details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 🟢 Date moved to the very first place */}
                                <div>
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Invoice date <span className="text-red-600">*</span></label>
                                    <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className={`${inputClass} cursor-pointer`} required />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-black text-red-600 mb-2">Payment due date <span className="text-red-600">*</span></label>
                                    <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full rounded-xl border border-red-400 bg-red-50/50 px-4 py-3 text-[14px] font-extrabold text-red-700 outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 shadow-sm transition-colors cursor-pointer" required />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Select client <span className="text-red-600">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === data.client_id) || null}
                                        onChange={(opt) => {
                                            setData("client_id", opt ? opt.value : "");
                                            setAvailableAdvance(opt ? opt.advance : 0);
                                        }}
                                        styles={selectStyles}
                                        isClearable placeholder="Search client…" {...portal}
                                    />
                                    {errors.client_id && <span className="text-red-600 text-[12px] font-bold mt-2 block">{errors.client_id}</span>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Payment status <span className="text-red-600">*</span></label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-300 rounded-xl w-fit shadow-inner">
                                        {STATUS.map(s => {
                                            const isActive = data.status === s.value;
                                            return (
                                                <button
                                                    key={s.value} type="button"
                                                    onClick={() => setData("status", s.value)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-black transition-all border ${isActive ? "text-white shadow-md border-transparent" : "text-slate-700 bg-white hover:bg-slate-100 border-slate-300"}`}
                                                    style={{ backgroundColor: isActive ? s.color : undefined }}
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.9)" : s.color }}></span>
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex justify-between items-center mb-2 pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <i className="fa-solid fa-boxes-stacked text-[16px]"></i>
                                    </div>
                                    <h3 className="text-[18px] font-black text-slate-900 m-0">Services and items</h3>
                                </div>
                                <button type="button" onClick={addItemRow} className="border-2 border-slate-300 bg-white text-slate-800 px-5 py-2.5 rounded-xl text-[13.5px] font-black hover:border-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-2">
                                    <i className="fa-solid fa-plus text-[12px]"></i> Add item
                                </button>
                            </div>

                            <div className="divide-y divide-slate-300">
                                {data.items.map((item, index) => (
                                    <div key={index} className="py-6">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="font-mono text-[13px] font-black text-indigo-800 tracking-widest bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm">
                                                ITEM NO. {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <button type="button" onClick={() => removeItemRow(index)} disabled={data.items.length === 1} className="text-[13px] font-black text-slate-500 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 border border-slate-300 hover:border-red-300 px-4 py-2 rounded-lg shadow-sm">
                                                <i className="fa-solid fa-trash-can text-[12px]"></i> Remove
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Project <span className="text-slate-500 font-bold normal-case">(optional)</span></label>
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
                                                    <label className="block text-[13px] font-black text-slate-800 mb-2">Service title <span className="text-red-600">*</span></label>
                                                    <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="E.g. Web Development" className={inputClass} required />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[13px] font-black text-slate-800 mb-2">Description</label>
                                                <div className="quill-wrapper">
                                                    <ReactQuill theme="snow" value={item.description} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            {/* Math Row */}
                                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-2">
                                                <div className="w-24">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Qty</label>
                                                    <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                        className="w-full font-mono border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 text-[15px] font-black text-slate-900 bg-transparent focus:ring-0 transition-colors" placeholder="0" />
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Unit</label>
                                                    <CustomSelect value={item.unit_type} onChange={e => updateItem(index, "unit_type", e.target.value)}
                                                        className="w-full border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 bg-transparent text-[14px] font-black text-slate-900 cursor-pointer focus:ring-0 transition-colors">
                                                        <option value="piece">Pcs</option><option value="kg">Kg</option><option value="set">Set</option><option value="box">Box</option><option value="sqft">SqFt</option>
                                                    </CustomSelect>
                                                </div>
                                                <span className="font-mono text-[16px] font-black text-slate-400 pb-2">×</span>
                                                <div className="w-36">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Unit price</label>
                                                    <div className="relative">
                                                        <Taka className="absolute left-0 top-1/2 -translate-y-1/2 text-[14px] text-slate-500 font-black" />
                                                        <input type="number" step="any" min="0" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                            className="w-full font-mono border-0 border-b-2 border-slate-400 focus:border-indigo-600 outline-none py-1.5 pl-6 text-[15px] font-black text-slate-900 bg-transparent text-right focus:ring-0 transition-colors" placeholder="0" />
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[16px] font-black text-slate-400 pb-2">=</span>
                                                <div className="ml-auto text-right">
                                                    <label className="block text-[11.5px] font-black text-slate-600 uppercase tracking-widest mb-2">Line total</label>
                                                    <div className="font-mono text-[22px] font-black text-emerald-600 tabular-nums">
                                                        <Taka className="text-[15px] text-emerald-600" />{fmt(item.total)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Terms and Notes */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-400 shadow-md">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                                    <i className="fa-solid fa-file-contract text-[16px]"></i>
                                </div>
                                <h3 className="text-[18px] font-black text-slate-900">Terms and notes</h3>
                            </div>
                            <div className="quill-wrapper">
                                <ReactQuill theme="snow" value={data.notes || ''} onChange={(val) => setData("notes", val)} placeholder="Payment terms, bank details, or a thank-you note…" />
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div ref={stickyWrapperRef} className="w-full xl:w-[360px] shrink-0 relative">
                        <div ref={stickyInnerRef} style={stickyStyle} className="flex flex-col gap-6 z-20">
                            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white border border-slate-700">
                                {/* Decorative Taka */}
                                <span className="absolute -right-4 -top-10 text-[160px] leading-none font-mono text-white/[0.04] select-none pointer-events-none">৳</span>

                                <div className="relative">
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-5 mb-6">
                                        <i className="fa-solid fa-receipt text-indigo-400 text-lg"></i>
                                        <p className="text-[15px] font-black uppercase tracking-widest text-white">Invoice summary</p>
                                    </div>

                                    <div className="flex flex-col gap-5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[14px] font-bold text-slate-300">Subtotal</span>
                                            <span className="font-mono text-[16px] font-bold"><Taka className="text-[13px] text-slate-400"/>{fmt(data.sub_total)}</span>
                                        </div>

                                        <div className="flex justify-between items-center gap-4">
                                            <label htmlFor="tax" className="text-[14px] font-bold text-slate-300">Tax / VAT (%)</label>
                                            <input id="tax" type="number" min="0" value={data.tax} onChange={(e) => setData("tax", e.target.value)}
                                                className="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-right text-[14px] font-black tabular-nums text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50" />
                                        </div>

                                        <div className="flex justify-between items-center gap-4 pb-5 border-b border-white/10">
                                            <label htmlFor="discount" className="text-[14px] font-bold text-slate-300">Discount (৳)</label>
                                            <input id="discount" type="number" min="0" value={data.discount} onChange={(e) => setData("discount", e.target.value)}
                                                className="w-28 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-right text-[14px] font-black tabular-nums text-red-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/50" />
                                        </div>

                                        <div className="pt-2 pb-5">
                                            <span className="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-2">Grand total</span>
                                            <div className="flex items-baseline gap-1.5 font-mono text-[36px] font-black tracking-tight text-white tabular-nums">
                                                <Taka className="text-[22px] text-indigo-400" />
                                                <span>{fmt(data.grand_total)}</span>
                                            </div>
                                        </div>

                                        {/* Advance Usage Section */}
                                        {availableAdvance > 0 && (
                                            <div className="border-t border-white/10 pt-6 pb-2">
                                                <div className="mb-4 flex flex-col gap-2">
                                                    <span className="flex items-center gap-2 text-[14px] font-bold text-emerald-400">
                                                        <i className="fa-solid fa-piggy-bank"></i> Client advance
                                                    </span>
                                                    <span className="w-fit rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-bold text-emerald-300 border border-emerald-500/30">
                                                        Available Balance: ৳{fmt(availableAdvance)}
                                                    </span>
                                                </div>
                                                <div className="relative mb-5">
                                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">Use Amount</span>
                                                    <input type="number" min="0" max={availableAdvance} value={data.use_advance_amount} onChange={(e) => setData("use_advance_amount", e.target.value)}
                                                        className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 pl-24 pr-4 text-right text-[15px] font-black tabular-nums text-emerald-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 shadow-inner" />
                                                </div>
                                                <div className="flex items-center justify-between text-[14px] pt-2">
                                                    <span className="text-slate-300 font-bold">Due after advance</span>
                                                    <span className="font-mono font-black text-[18px] tabular-nums text-rose-400"><Taka className="text-[13px] text-rose-400"/>{fmt(payable)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={processing} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-[15px] font-extrabold transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                                            {processing ? <><i className="fa-solid fa-spinner fa-spin text-lg"></i> Creating Invoice…</> : <><i className="fa-solid fa-cloud-arrow-up text-lg"></i> Create Invoice</>}
                                        </button>
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
