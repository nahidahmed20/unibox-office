import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Swal from 'sweetalert2';

// 🟢 Custom Toggle Switch Component (Fixed & Improved)
// 🟢 Custom Toggle Switch Component (100% Guaranteed Slide Fix)
const ToggleSwitch = ({ label, checked, onChange }) => {
    const isChecked = checked === true || checked === 1 || checked === "1";

    return (
        <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group shadow-sm">
            <span className="text-[14px] font-bold text-gray-700 select-none">{label}</span>
            <div
                className="relative inline-block h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out"
                style={{ backgroundColor: isChecked ? 'var(--accent, #C89B3C)' : '#D1D5DB' }}
            >
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span
                    className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out"
                    style={{ left: isChecked ? '22px' : '2px' }}
                />
            </div>
        </label>
    );
};

export default function Index({ settings }) {
    // 🟢 Form Setup with default fallbacks
    const { data, setData, post, processing, errors } = useForm({
        show_logo: settings?.show_logo ?? true,
        show_watermark: settings?.show_watermark ?? true,
        show_client_info: settings?.show_client_info ?? true,
        show_invoice_meta: settings?.show_invoice_meta ?? true,
        show_notes: settings?.show_notes ?? true,
        show_bank_info: settings?.show_bank_info ?? true,
        show_signature: settings?.show_signature ?? true,
        show_seal: settings?.show_seal ?? false,
        show_footer: settings?.show_footer ?? true,
        bank_details: settings?.bank_details || '',
        footer_text: settings?.footer_text || '',
    });

    const submit = (e) => {
    e.preventDefault();
    post(route('admin.invoice-settings.update'), {
        preserveScroll: true,
        onSuccess: () => {
            Swal.fire({
                icon: 'success',
                title: 'Settings Saved!',
                text: 'Invoice settings updated successfully.',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true,
            });
        }
    });
};

    return (
        <AdminLayout>
            <Head title="Invoice Settings" />

            <div className="max-w-6xl mx-auto flex flex-col gap-6">

                {/* Header Section */}
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-bg)] text-[var(--accent)] shadow-sm">
                        <i className="fa-solid fa-file-invoice-dollar text-[20px]"></i>
                    </div>
                    <div>
                        <h1 className="text-[24px] font-extrabold text-gray-900 tracking-tight">Invoice Settings</h1>
                        <p className="text-[14px] text-gray-500 font-medium">Control what appears on your printed invoices and PDFs.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                        {/* 🟢 Toggle Controls (Left Column) */}
                        <div className="space-y-4">
                            <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-eye"></i> Visibility Controls
                            </h3>

                            <ToggleSwitch label="Show Company Logo" checked={data.show_logo} onChange={(val) => setData('show_logo', val)} />
                            <ToggleSwitch label="Show Background Watermark" checked={data.show_watermark} onChange={(val) => setData('show_watermark', val)} />
                            <ToggleSwitch label="Show Client Information" checked={data.show_client_info} onChange={(val) => setData('show_client_info', val)} />
                            <ToggleSwitch label="Show Invoice Date & Number" checked={data.show_invoice_meta} onChange={(val) => setData('show_invoice_meta', val)} />
                            <ToggleSwitch label="Show Terms & Notes" checked={data.show_notes} onChange={(val) => setData('show_notes', val)} />
                            <ToggleSwitch label="Show Bank Details" checked={data.show_bank_info} onChange={(val) => setData('show_bank_info', val)} />
                            <ToggleSwitch label="Show Signature Line" checked={data.show_signature} onChange={(val) => setData('show_signature', val)} />
                            <ToggleSwitch label="Show Signature Seal / Stamp" checked={data.show_seal} onChange={(val) => setData('show_seal', val)} />
                            <ToggleSwitch label="Show Page Footer" checked={data.show_footer} onChange={(val) => setData('show_footer', val)} />
                        </div>

                        {/* 🟢 Text Content (Right Column) */}
                        <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-8">
                            <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-pen-to-square"></i> Text Content
                            </h3>

                            <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-2">
                                    Bank Details (HTML Supported)
                                </label>
                                <textarea
                                    value={data.bank_details}
                                    onChange={(e) => setData('bank_details', e.target.value)}
                                    rows="8"
                                    className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-4 text-[14px] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 font-mono transition-all"
                                    placeholder="<p><strong>A/C No:</strong> 123456789</p>&#10;<p><strong>Bank:</strong> City Bank</p>"
                                ></textarea>
                                {errors.bank_details && <p className="text-red-500 text-[12px] font-bold mt-1.5">{errors.bank_details}</p>}
                                <p className="text-[12px] text-gray-400 mt-2 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <i className="fa-solid fa-circle-info text-blue-400 mr-1.5"></i>
                                    Use HTML tags like <code>&lt;p&gt;</code> and <code>&lt;strong&gt;</code> for formatting. This will appear at the bottom of the invoice.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-2">
                                    Footer Text (HTML Supported)
                                </label>
                                <textarea
                                    value={data.footer_text}
                                    onChange={(e) => setData('footer_text', e.target.value)}
                                    rows="5"
                                    className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-4 text-[14px] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 font-mono transition-all"
                                    placeholder="<p>Address: ...</p>&#10;<p>Email: info@example.com</p>"
                                ></textarea>
                                {errors.footer_text && <p className="text-red-500 text-[12px] font-bold mt-1.5">{errors.footer_text}</p>}
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 border-t border-gray-100 px-8 py-5 flex items-center justify-end gap-4 shrink-0">
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-[var(--accent)] text-white px-8 py-3 rounded-xl font-bold text-[14px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {processing ? (
                                <><i className="fa-solid fa-spinner fa-spin"></i> Saving Settings...</>
                            ) : (
                                <><i className="fa-solid fa-check"></i> Save Invoice Settings</>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
