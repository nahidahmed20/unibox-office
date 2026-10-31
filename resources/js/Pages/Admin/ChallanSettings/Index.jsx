import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function Index({ settings }) {
    const { data, setData, post, processing, errors } = useForm({
        prefix: settings?.prefix || 'CHL-',
        company_name: settings?.company_name || '',
        company_address: settings?.company_address || '',
        company_phone: settings?.company_phone || '',
        company_email: settings?.company_email || '',
        terms_conditions: settings?.terms_conditions || '',
        logo: null,
        authorized_signature: null,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.challan-settings.update'), {
            preserveScroll: true,
            onSuccess: () => Swal.fire({ icon: 'success', title: 'Settings Updated!', timer: 1500, showConfirmButton: false }),
        });
    };

    return (
        <AdminLayout>
            <Head title="Challan Settings" />
            <style dangerouslySetInnerHTML={{__html: `
                .challan-settings-editor .ql-editor { min-height: 140px; font-size: 14px; background: #fff; border-radius: 0 0 .75rem .75rem; font-weight: 500; color: #0f172a; }
                .challan-settings-editor .ql-editor.ql-blank::before { color: #94a3b8; font-style: normal; }
                .challan-settings-editor .ql-toolbar.ql-snow { border-radius: .75rem .75rem 0 0; background: #f8fafc; border-color: #cbd5e1 !important; }
                .challan-settings-editor .ql-container.ql-snow { border-color: #cbd5e1 !important; border-top: 0 !important; }
                .challan-settings-editor:focus-within .ql-toolbar.ql-snow, .challan-settings-editor:focus-within .ql-container.ql-snow { border-color: #6366f1 !important; }
            `}} />

            <div className="mx-auto mt-4 flex max-w-[1200px] flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
                <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl"></div>
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><i className="fa-solid fa-truck-fast text-[19px]"></i></div>
                        <div>
                            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Delivery &amp; logistics</div>
                            <h1 className="text-[27px] font-black leading-none tracking-tight text-slate-900 sm:text-[32px]">Challan Settings</h1>
                            <p className="mt-2 max-w-xl text-[13.5px] font-medium leading-relaxed text-slate-500">Set up your document numbering, company identity, and default delivery terms.</p>
                        </div>
                    </div>
                    <Link href={route('admin.challans.index')} className="relative inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-extrabold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                        <i className="fa-solid fa-arrow-left"></i> All Challans
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600"><i className="fa-solid fa-building"></i></div>
                            <div><h2 className="text-[16px] font-black text-slate-900">Company identity</h2><p className="mt-0.5 text-[12px] font-medium text-slate-500">These details appear on your delivery challans.</p></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 bg-slate-50/50 px-5 py-5 sm:grid-cols-2 sm:px-6">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Company name</label>
                                <input type="text" value={data.company_name} onChange={event => setData('company_name', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="Your company name" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Challan prefix</label>
                                <input type="text" value={data.prefix} onChange={event => setData('prefix', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="e.g. CHL-" />
                                <p className="mt-1.5 text-[11px] font-medium text-slate-400">Used at the start of generated challan numbers.</p>
                                {errors.prefix && <p className="mt-1 text-xs font-bold text-rose-600">{errors.prefix}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Phone number</label>
                                <input type="text" value={data.company_phone} onChange={event => setData('company_phone', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="+880..." />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Email address</label>
                                <input type="email" value={data.company_email} onChange={event => setData('company_email', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="info@company.com" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600">Company address</label>
                                <textarea value={data.company_address} onChange={event => setData('company_address', event.target.value)} rows="3" className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-[13.5px] font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="Street, city, postal code…" />
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600"><i className="fa-solid fa-image"></i></div>
                            <div><h2 className="text-[16px] font-black text-slate-900">Challan branding</h2><p className="mt-0.5 text-[12px] font-medium text-slate-500">Upload your company logo and authorized signature.</p></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 bg-slate-50/50 px-5 py-5 md:grid-cols-2 sm:px-6">
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                                <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-600">Company logo</label>
                                <p className="mb-3 text-[11.5px] font-medium text-slate-400">Use a clear image for the document header.</p>
                                <input type="file" accept="image/*" onChange={event => setData('logo', event.target.files?.[0] || null)} className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-[11px] file:font-extrabold file:text-indigo-700 hover:file:bg-indigo-100" />
                                {settings?.logo && <div className="mt-4 flex h-20 items-center rounded-lg border border-slate-100 bg-slate-50 px-3"><img src={`/storage/${settings.logo}`} alt="Company logo" className="max-h-14 max-w-full object-contain" /></div>}
                            </div>
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                                <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-600">Authorized signature</label>
                                <p className="mb-3 text-[11.5px] font-medium text-slate-400">Shown in the signature area of your challan.</p>
                                <input type="file" accept="image/*" onChange={event => setData('authorized_signature', event.target.files?.[0] || null)} className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-[11px] file:font-extrabold file:text-emerald-700 hover:file:bg-emerald-100" />
                                {settings?.authorized_signature && <div className="mt-4 flex h-20 items-center rounded-lg border border-slate-100 bg-slate-50 px-3"><img src={`/storage/${settings.authorized_signature}`} alt="Authorized signature" className="max-h-14 max-w-full object-contain" /></div>}
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600"><i className="fa-solid fa-file-contract"></i></div>
                            <div><h2 className="text-[16px] font-black text-slate-900">Default terms &amp; conditions</h2><p className="mt-0.5 text-[12px] font-medium text-slate-500">Add the delivery terms to include on your challans.</p></div>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="challan-settings-editor overflow-hidden rounded-xl shadow-sm">
                                <ReactQuill theme="snow" value={data.terms_conditions} onChange={value => setData('terms_conditions', value)} placeholder="Enter default delivery terms and conditions…" />
                            </div>
                        </div>
                    </section>

                    <div className="sticky bottom-3 z-20 flex flex-col-reverse items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:px-5">
                        <p className="px-2 text-[12px] font-medium text-slate-500"><i className="fa-solid fa-circle-info mr-1.5 text-indigo-500"></i>Settings are used on new delivery challans.</p>
                        <button type="submit" disabled={processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-[13px] font-extrabold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                            <i className={`fa-solid ${processing ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>{processing ? 'Saving…' : 'Save settings'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
