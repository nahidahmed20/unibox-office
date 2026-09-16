import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const totalPaidAmount = Number(invoice.payments_sum_amount || 0);
    const dueAmount = Math.max(Number(invoice.grand_total) - totalPaidAmount, 0);
    const [availableAdvance, setAvailableAdvance] = useState(0);

    /* Sticky Summary Refs */
    const formRef = useRef(null);
    const leftColumnRef = useRef(null);
    const stickyWrapperRef = useRef(null);
    const stickyInnerRef = useRef(null);
    const [stickyStyle, setStickyStyle] = useState({});

    const { data, setData, put, processing, errors } = useForm({
        id: invoice.id,
        client_id: invoice.client_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date.slice(0, 10),
        due_date: invoice.due_date.slice(0, 10),
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
            unit_price: i.unit_price || 0,
            total: i.total || 0
        })) : [{ project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]
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
        setData(
            "items",
            data.items.map((item, i) => {
                if (i !== index) return item;
                const updatedItem = { ...item, [field]: value };
                if (field === "quantity" || field === "unit_price") {
                    updatedItem.total = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.unit_price) || 0);
                }
                return updatedItem;
            })
        );
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

    /* Sticky Position Logic */
    const updateStickyPosition = useCallback(() => {
        const form = formRef.current;
        const leftColumn = leftColumnRef.current;
        const wrapper = stickyWrapperRef.current;
        const inner = stickyInnerRef.current;

        if (!form || !leftColumn || !wrapper || !inner) return;

        const BREAKPOINT = 1280;
        const TOP_OFFSET = 24;

        if (window.innerWidth < BREAKPOINT) {
            wrapper.style.minHeight = "";
            setStickyStyle({});
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        const innerHeight = inner.offsetHeight;

        wrapper.style.minHeight = `${leftColumn.offsetHeight}px`;

        if (wrapperRect.top > TOP_OFFSET) {
            setStickyStyle({ position: "absolute", top: 0, left: 0, width: "100%" });
            return;
        }

        if (wrapperRect.top <= TOP_OFFSET) {
            if (formRect.bottom > innerHeight + TOP_OFFSET) {
                setStickyStyle({ position: "fixed", top: `${TOP_OFFSET}px`, left: `${wrapperRect.left}px`, width: `${wrapperRect.width}px` });
                return;
            }
        }

        if (formRect.bottom <= innerHeight + TOP_OFFSET) {
            setStickyStyle({ position: "absolute", top: "auto", bottom: 0, left: 0, width: "100%" });
            return;
        }

        setStickyStyle({ position: "absolute", top: 0, left: 0, width: "100%" });
    }, []);

    useEffect(() => {
        let frameId = null;
        const handleScroll = () => {
            if (frameId) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => updateStickyPosition());
        };

        const handleResize = () => updateStickyPosition();

        window.addEventListener("scroll", handleScroll, { passive: true });
        document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
        window.addEventListener("resize", handleResize);

        updateStickyPosition();

        let resizeObserver = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => updateStickyPosition());
            if (leftColumnRef.current) resizeObserver.observe(leftColumnRef.current);
            if (stickyInnerRef.current) resizeObserver.observe(stickyInnerRef.current);
        }

        return () => {
            window.removeEventListener("scroll", handleScroll);
            document.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleResize);
            if (resizeObserver) resizeObserver.disconnect();
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [updateStickyPosition]);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.invoices.update', data.id), {
            onSuccess: () => Swal.fire({ icon: 'success', title: 'Invoice Updated!', timer: 1500, showConfirmButton: false })
        });
    };

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: "46px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid #6366f1" : "1px solid #e2e8f0",
            backgroundColor: state.isFocused ? "#ffffff" : "#f8fafc",
            boxShadow: state.isFocused ? "0 0 0 4px rgba(99, 102, 241, 0.1)" : "none",
            transition: "all 0.2s ease",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "600",
            "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#cbd5e1", backgroundColor: "#ffffff" }
        }),
        menu: (base) => ({ ...base, fontSize: "14px", borderRadius: "0.75rem", zIndex: 9999, padding: "4px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base,
            borderRadius: "0.5rem",
            backgroundColor: state.isSelected ? "#4f46e5" : state.isFocused ? "#f1f5f9" : "transparent",
            color: state.isSelected ? "white" : "#1e293b",
            cursor: "pointer",
            fontWeight: state.isSelected ? "700" : "500",
            margin: "2px 0"
        })
    };

    const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-sm";

    return (
        <AdminLayout>
            <Head title={`Edit Invoice #${invoice.invoice_number}`} />

            <style dangerouslySetInnerHTML={{__html: `
                .ql-editor { min-height: 120px; font-size: 14px; background: #f8fafc; border-radius: 0 0 0.75rem 0.75rem; border: none; font-weight: 500; color: #334155; }
                .ql-editor:focus { background: #ffffff; }
                .ql-toolbar { border-radius: 0.75rem 0.75rem 0 0; background: #ffffff; border: none !important; border-bottom: 1px solid #e2e8f0 !important; }
                .ql-container { border-radius: 0 0 0.75rem 0.75rem; border: none !important; }
                .quill-wrapper { border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; transition: all 0.2s; background: #f8fafc; }
                .quill-wrapper:focus-within { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); background: #ffffff; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12 mt-2">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-amber-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-widest mb-3 border border-amber-100/50">
                            <i className="fa-solid fa-pen-to-square"></i> Modification Mode
                        </div>
                        <h1 className="text-[26px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none">
                            Edit Invoice <span className="text-indigo-600">#{invoice.invoice_number}</span>
                        </h1>
                    </div>
                    <div className="relative z-10 mt-2 sm:mt-0">
                        <Link href={route('admin.invoices.index')} className="flex w-fit items-center justify-center gap-2 text-[14px] font-bold text-slate-700 hover:text-indigo-600 transition-all bg-white px-6 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow group">
                            <i className="fa-solid fa-arrow-left-long transition-transform group-hover:-translate-x-1"></i> Back to List
                        </Link>
                    </div>
                </div>

                {/* Premium Top Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm group hover:border-indigo-200 transition-colors">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-black uppercase tracking-wider text-slate-500">Grand Total</p>
                                <h3 className="text-[24px] font-black text-slate-900 tabular-nums tracking-tight"><Taka className="text-[18px] text-slate-400" />{Number(invoice.grand_total).toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md bg-gradient-to-br from-indigo-500 to-blue-600 border border-indigo-400/30">
                                <i className="fa-solid fa-file-invoice-dollar text-[20px]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[1.5rem] border border-emerald-200/60 bg-emerald-50/40 p-6 shadow-sm group hover:border-emerald-300/60 transition-colors">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-black uppercase tracking-wider text-emerald-600">Total Paid & Adjusted</p>
                                <h3 className="text-[24px] font-black text-emerald-700 tabular-nums tracking-tight"><Taka className="text-[18px] text-emerald-500/70" />{totalPaidAmount.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md bg-gradient-to-br from-emerald-400 to-teal-500 border border-emerald-400/30">
                                <i className="fa-solid fa-hand-holding-dollar text-[20px]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[1.5rem] border border-rose-200/60 bg-rose-50/40 p-6 shadow-sm group hover:border-rose-300/60 transition-colors">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[11.5px] font-black uppercase tracking-wider text-rose-600">Payable Due</p>
                                <h3 className="text-[24px] font-black text-rose-700 tabular-nums tracking-tight"><Taka className="text-[18px] text-rose-500/70" />{dueAmount.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md bg-gradient-to-br from-rose-500 to-red-600 border border-rose-400/30">
                                <i className="fa-solid fa-triangle-exclamation text-[20px]"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="relative flex flex-col xl:flex-row gap-8 items-start">

                    {/* Left Column */}
                    <div ref={leftColumnRef} className="flex-1 w-full flex flex-col gap-8">

                        {/* General Information */}
                        <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-sm relative group hover:border-indigo-200/60 transition-colors">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50">
                                    <i className="fa-solid fa-circle-info text-lg"></i>
                                </div>
                                <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">
                                    General Information
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                <div className="sm:col-span-2 relative">
                                    <label className="block text-[11.5px] font-black text-slate-500 uppercase tracking-wider mb-2.5">Select Client <span className="text-rose-500">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === data.client_id)}
                                        onChange={(opt) => {
                                            setData("client_id", opt ? opt.value : "");
                                            setAvailableAdvance(opt ? opt.advance : 0);
                                        }}
                                        isClearable placeholder="🔍 Search Client..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                    />
                                    {errors.client_id && <span className="text-rose-500 text-[12px] font-bold mt-2 block">{errors.client_id}</span>}
                                </div>

                                <div className="sm:col-span-1 xl:col-span-2">
                                    <label className="block text-[11.5px] font-black text-slate-500 uppercase tracking-wider mb-2.5">Invoice # <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600"><i className="fa-solid fa-hashtag text-[12px]"></i></div>
                                        <input type="text" value={data.invoice_number} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-100/50 pl-14 pr-4 py-3 text-[14px] font-black text-indigo-700 outline-none cursor-not-allowed shadow-inner" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11.5px] font-black text-slate-500 uppercase tracking-wider mb-2.5">Status <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <select value={data.status} onChange={(e) => setData("status", e.target.value)} className={`${inputClass} appearance-none pr-10 cursor-pointer`}>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partially_paid">Partially Paid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                        <i className="fa-solid fa-chevron-down text-[12px] text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11.5px] font-black text-slate-500 uppercase tracking-wider mb-2.5">Invoice Date</label>
                                    <input type="date" value={data.invoice_date} onChange={(e) => setData("invoice_date", e.target.value)} className={`${inputClass} cursor-pointer`} />
                                </div>

                                <div className="sm:col-span-2 xl:col-span-2">
                                    <label className="block text-[11.5px] font-black text-rose-500 uppercase tracking-wider mb-2.5">Due Date <span className="text-rose-500">*</span></label>
                                    <input type="date" value={data.due_date} onChange={(e) => setData("due_date", e.target.value)} className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 hover:bg-white px-4 py-3 text-[14px] font-bold text-rose-700 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 cursor-pointer transition-all shadow-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Line Items Section - Redesigned Cards */}
                        <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-sm relative group hover:border-emerald-200/60 transition-colors">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-100 gap-4">
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50 mt-1 sm:mt-0 shrink-0">
                                        <i className="fa-solid fa-boxes-stacked text-lg"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest m-0">
                                            Items / Services
                                        </h3>
                                        <p className="text-[12px] text-slate-500 mt-1 font-medium">Leave "Project" blank if you want to add a custom/extra charge.</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setData("items", [...data.items, { project_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }])} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 active:scale-95 w-full sm:w-auto justify-center">
                                    <i className="fa-solid fa-plus text-[11px]"></i> Add Extra Charge
                                </button>
                            </div>

                            <div className="space-y-6">
                                {data.items.map((item, index) => (
                                    <div key={index} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden transition-all hover:border-indigo-300 hover:shadow-md relative">

                                        {/* Card Header */}
                                        <div className="bg-slate-50/80 border-b border-slate-200/60 px-5 py-3 flex justify-between items-center">
                                            <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[11px] shadow-inner">{index + 1}</div>
                                                Item Detail
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => setData("items", data.items.filter((_, i) => i !== index))}
                                                disabled={data.items.length === 1}
                                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-trash-can"></i> <span className="hidden sm:inline">Remove</span>
                                            </button>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 flex flex-col gap-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Project (Optional)</label>
                                                    <Select
                                                        options={getAvailableProjectOptions(index)}
                                                        value={projectOptions.find(o => o.value === item.project_id) || null}
                                                        onChange={(opt) => {
                                                            const projId = opt ? opt.value : null;
                                                            const proj = projects.find((p) => p.id === projId);

                                                            setData((prev) => {
                                                                const newItems = prev.items.map((it, i) => {
                                                                    if (i !== index) return it;
                                                                    if (proj) {
                                                                        const qty = Number(proj.quantity) || 1;
                                                                        return {
                                                                            ...it,
                                                                            project_id: projId,
                                                                            item_name: proj.title,
                                                                            description: proj.description || "",
                                                                            quantity: qty,
                                                                            unit_price: (Number(proj.budget) || 0) / qty,
                                                                            total: Number(proj.budget) || 0
                                                                        };
                                                                    }
                                                                    return {
                                                                        ...it,
                                                                        project_id: null,
                                                                        item_name: "",
                                                                        description: "",
                                                                        unit_price: 0,
                                                                        total: 0
                                                                    };
                                                                });

                                                                return {
                                                                    ...prev,
                                                                    items: newItems
                                                                };
                                                            });
                                                        }}
                                                        isClearable placeholder="Search projects..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Item Name / Title <span className="text-rose-500">*</span></label>
                                                    <input type="text" value={item.item_name} onChange={(e) => updateItem(index, "item_name", e.target.value)} placeholder="e.g. Website Design" className={inputClass} required />
                                                    {errors[`items.${index}.item_name`] && <span className="text-rose-500 text-[11px] font-bold mt-1.5 block">{errors[`items.${index}.item_name`]}</span>}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Item Details / Description</label>
                                                <div className="quill-wrapper">
                                                    <ReactQuill theme="snow" value={item.description} onChange={(val) => updateItem(index, "description", val)} />
                                                </div>
                                            </div>

                                            {/* Bottom Row: Math / Pricing */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-slate-50/50 p-4 rounded-xl border border-slate-100 items-end">
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                                                    <input type="number" step="any" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" placeholder="Qty" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Unit Price</label>
                                                    <div className="relative">
                                                        <input type="number" step="any" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2.5 text-[14px] font-black text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-right" placeholder="Price" />
                                                        <Taka className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] m-0" />
                                                    </div>
                                                </div>
                                                <div className="sm:text-right pb-1">
                                                    <label className="block text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-1">Row Total</label>
                                                    <div className="text-[22px] font-black text-indigo-700 tracking-tight tabular-nums">
                                                        <Taka className="text-[16px] text-indigo-400" /> {Number(item.total).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-sm group hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-600 shadow-sm border border-slate-200/60">
                                    <i className="fa-solid fa-file-contract text-lg"></i>
                                </div>
                                <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">
                                    Terms & Conditions
                                </h3>
                            </div>
                            <div className="quill-wrapper">
                                <ReactQuill theme="snow" value={data.notes} onChange={(val) => setData("notes", val)} placeholder="Enter payment terms, bank details, or a thank you note..." />
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div ref={stickyWrapperRef} className="w-full xl:w-[380px] shrink-0 relative">
                        <div ref={stickyInnerRef} style={stickyStyle} className="flex flex-col gap-6 z-20">

                            <div className="bg-[#0B1120] rounded-[1.5rem] p-6 shadow-2xl relative overflow-hidden text-white border border-gray-800">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[70px] -mr-16 -mt-16 pointer-events-none opacity-40"></div>
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-500 rounded-full blur-[70px] -ml-16 -mb-16 pointer-events-none opacity-20"></div>

                                <h3 className="text-[11.5px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-gray-800 pb-3 relative z-10">
                                    <i className="fa-solid fa-receipt text-gray-500"></i> Financial Summary
                                </h3>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-bold text-gray-400">Sub Total</span>
                                        <span className="text-[15px] font-black text-white tabular-nums"><Taka />{Number(data.sub_total).toLocaleString('en-IN')}</span>
                                    </div>

                                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-xl border border-gray-700/50">
                                        <span className="text-[12px] font-bold text-gray-300 pl-2">Tax / VAT (%)</span>
                                        <div className="relative w-24">
                                            <input type="number" value={data.tax} onChange={(e) => setData("tax", e.target.value)} className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-1.5 text-[13px] font-black text-white text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-rose-900/20 p-2 rounded-xl border border-rose-900/30">
                                        <span className="text-[12px] font-bold text-rose-300 pl-2">Discount (TK)</span>
                                        <div className="relative w-28">
                                            <input type="number" value={data.discount} onChange={(e) => setData("discount", e.target.value)} className="w-full rounded-lg bg-rose-950/50 border border-rose-800 px-3 py-1.5 text-[13px] font-black text-rose-400 text-right outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all shadow-inner" />
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-700 pt-4 mt-2 flex justify-between items-end">
                                        <span className="text-[11.5px] font-black text-gray-300 uppercase tracking-widest">Grand Total</span>
                                        <span className="text-[32px] font-black text-white tracking-tight leading-none"><Taka className="text-[20px] text-indigo-400" />{Number(data.grand_total).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                {availableAdvance > 0 && (
                                    <div className="mt-6 pt-5 border-t border-gray-800 relative z-10">
                                        <div className="flex justify-between items-center mb-2.5">
                                            <span className="text-[10.5px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><i className="fa-solid fa-piggy-bank"></i> Client Advance</span>
                                            <span className="text-[11px] font-bold text-emerald-500 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">Bal: ৳{Number(availableAdvance).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 uppercase">Use:</span>
                                            <input type="number" min="0" max={availableAdvance} value={data.use_advance_amount} onChange={(e) => setData("use_advance_amount", e.target.value)} className="w-full rounded-xl bg-gray-800 border border-emerald-900/50 pl-12 pr-3 py-3 text-[15px] font-black text-emerald-400 text-right outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner" />
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-medium mt-2 text-center">Will be automatically deducted from final due.</p>
                                    </div>
                                )}

                                {/* Cancel and Save Buttons side-by-side */}
                                <div className="mt-6 relative z-10 flex gap-3">
                                    <Link href={route('admin.invoices.index')} className="w-[35%] flex items-center justify-center bg-gray-800/80 text-gray-300 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-wider hover:bg-gray-700 hover:text-white transition-all border border-gray-700/50">
                                        Cancel
                                    </Link>
                                    <button type="submit" disabled={processing} className="w-[65%] bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-3.5 rounded-xl text-[14px] font-black uppercase tracking-wider hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 border border-indigo-400/30">
                                        {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-file-invoice"></i> Save Changes</>}
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
