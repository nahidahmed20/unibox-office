import React, { useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
            <style dangerouslySetInnerHTML={{__html: `.ql-editor { min-height: 120px; font-size: 14px; border-radius: 0 0 0.75rem 0.75rem; } .ql-toolbar { border-radius: 0.75rem 0.75rem 0 0; background: #f8fafc; }`}} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <i className="fa-solid fa-cogs text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Challan Settings</h1>
                        <p className="text-[13px] text-gray-500 font-medium">Configure prefixes, branding, and default terms for your delivery challans.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Challan Prefix</label>
                            <input type="text" value={data.prefix} onChange={e => setData('prefix', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500" placeholder="e.g. CHL-" />
                            {errors.prefix && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.prefix}</p>}
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Company Name</label>
                            <input type="text" value={data.company_name} onChange={e => setData('company_name', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500" placeholder="Your Company Name" />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Company Phone</label>
                            <input type="text" value={data.company_phone} onChange={e => setData('company_phone', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500" placeholder="+880..." />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Company Email</label>
                            <input type="email" value={data.company_email} onChange={e => setData('company_email', e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500" placeholder="info@company.com" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Company Address</label>
                            <textarea value={data.company_address} onChange={e => setData('company_address', e.target.value)} rows="2" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[14px] font-medium outline-none focus:border-indigo-500"></textarea>
                        </div>

                        <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Default Terms & Conditions</label>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <ReactQuill theme="snow" value={data.terms_conditions} onChange={val => setData('terms_conditions', val)} />
                            </div>
                        </div>

                        <div className="p-5 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Company Logo</label>
                            <input type="file" accept="image/*" onChange={e => setData('logo', e.target.files[0])} className="text-[13px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                            {settings?.logo && <img src={`/storage/${settings.logo}`} alt="Logo" className="h-12 object-contain mt-3 rounded border border-gray-200 bg-white p-1" />}
                        </div>

                        <div className="p-5 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                            <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">Authorized Signature</label>
                            <input type="file" accept="image/*" onChange={e => setData('authorized_signature', e.target.files[0])} className="text-[13px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                            {settings?.authorized_signature && <img src={`/storage/${settings.authorized_signature}`} alt="Signature" className="h-12 object-contain mt-3 rounded border border-gray-200 bg-white p-1" />}
                        </div>
                    </div>
                    <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button type="submit" disabled={processing} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-70">
                            {processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-save"></i> Save Settings</>}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
