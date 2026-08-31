import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';

export default function Print({ challan, dbSettings }) {
    
    useEffect(() => {
        setTimeout(() => {
            window.print();
        }, 500);
    }, []);

    const settings = {
        company_name: dbSettings?.company_name || 'Your Company Name',
        company_address: dbSettings?.company_address || '123 Business Avenue, City, Country',
        company_phone: dbSettings?.company_phone || '',
        company_email: dbSettings?.company_email || '',
        terms_conditions: dbSettings?.terms_conditions || '',
        logo: dbSettings?.logo ? `/storage/${dbSettings.logo}` : null,
        signature: dbSettings?.authorized_signature ? `/storage/${dbSettings.authorized_signature}` : null,
    };

    return (
        <div className="bg-white min-h-screen font-sans text-gray-900 pb-12">
            <Head title={`Challan - ${challan.challan_number}`} />
            
            {/* 🟢 CSS for Print Optimization */}
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                body { font-family: 'Inter', sans-serif; background: #e5e7eb; }
                .challan-container { max-width: 210mm; min-height: 297mm; margin: 2rem auto; background: white; padding: 12mm 15mm; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                
                @media print {
                    body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .challan-container { box-shadow: none; margin: 0; max-width: 100%; width: 100%; padding: 10mm; }
                    .no-print { display: none !important; }
                    @page { margin: 5mm; size: A4 portrait; }
                }
            `}} />

            {/* Print Button (Visible only on screen) */}
            <div className="max-w-[210mm] mx-auto flex justify-end pt-6 no-print">
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-print"></i> Print Challan
                </button>
            </div>

            {/* A4 Page Container */}
            <div className="challan-container relative">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900 mb-8 mt-4">
                    {/* Left: Company Info */}
                    <div className="max-w-[50%]">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Company Logo" className="h-14 object-contain mb-4" />
                        ) : (
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2 uppercase">{settings.company_name}</h1>
                        )}
                        <p className="text-[12px] text-gray-600 whitespace-pre-line leading-relaxed font-medium">{settings.company_address}</p>
                        <div className="mt-2 text-[12px] text-gray-600 flex flex-col gap-0.5">
                            {settings.company_phone && <p><span className="font-bold text-gray-800">Phone:</span> {settings.company_phone}</p>}
                            {settings.company_email && <p><span className="font-bold text-gray-800">Email:</span> {settings.company_email}</p>}
                        </div>
                    </div>
                    
                    {/* Right: Challan Info */}
                    <div className="text-right flex flex-col items-end">
                        <h2 className="text-3xl font-black text-indigo-600 uppercase tracking-widest mb-3">Delivery Challan</h2>
                        <table className="text-[12.5px] text-left">
                            <tbody>
                                <tr>
                                    <td className="py-1 pr-4 text-gray-500 font-bold uppercase tracking-wider text-right">Challan No:</td>
                                    <td className="py-1 font-black text-gray-900 text-right">{challan.challan_number}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 pr-4 text-gray-500 font-bold uppercase tracking-wider text-right">Date:</td>
                                    <td className="py-1 font-bold text-gray-900 text-right">{new Date(challan.challan_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Deliver To (Client Details) */}
                <div className="mb-8">
                    <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-200 pb-1.5 mb-3 inline-block">Deliver To</h3>
                    <h4 className="text-[16px] font-bold text-gray-900">{challan.client?.name}</h4>
                    {challan.client?.company_name && <p className="text-[13px] font-bold text-indigo-600 mt-0.5">{challan.client.company_name}</p>}
                    
                    {challan.client?.address && <p className="text-[12px] text-gray-600 whitespace-pre-line mt-1.5 max-w-sm leading-relaxed">{challan.client.address}</p>}
                    {challan.client?.phone && <p className="text-[12px] text-gray-600 mt-1.5 font-medium"><i className="fa-solid fa-phone text-gray-400 mr-1.5"></i> {challan.client.phone}</p>}
                </div>

                {/* 3. Items Table (CHALLAN FORMAT - NO PRICES) */}
                <table className="w-full text-left mb-8 border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100 text-gray-900 border-b-2 border-gray-300">
                            <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider w-12 border-r border-gray-300 text-center">SL</th>
                            <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider border-r border-gray-300">Description of Goods / Services</th>
                            <th className="py-3 px-4 text-[11px] font-black uppercase tracking-wider text-center w-28 border-r border-gray-300">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {challan.items.map((item, index) => (
                            <tr key={item.id} className="even:bg-gray-50/50">
                                <td className="py-4 px-4 text-[13px] font-bold text-center border-r border-gray-200 align-top text-gray-600">{index + 1}</td>
                                <td className="py-4 px-4 border-r border-gray-200 align-top">
                                    <div className="font-bold text-[13px] text-gray-900">{item.item_name}</div>
                                    {item.description && (
                                        <div className="text-[12px] text-gray-600 mt-1 prose prose-sm max-w-none leading-snug" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-[14px] font-black text-center align-top border-r border-gray-200 text-indigo-700 bg-indigo-50/30">
                                    {item.quantity}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. Notes & Remarks */}
                {challan.notes && (
                    <div className="mb-12 bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h4 className="text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Special Notes / Remarks</h4>
                        <div className="text-[12px] text-gray-700 prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: challan.notes }}></div>
                    </div>
                )}

                {/* 5. Signatures (Bottom of Page) */}
                <div className="flex justify-between items-end mt-24 pt-8">
                    {/* Receiver Signature (Left) */}
                    <div className="text-center w-48">
                        <div className="border-t-2 border-gray-400 border-dashed mx-auto pt-2">
                            <p className="text-[13px] font-bold text-gray-900">Received By</p>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">Signature & Seal</p>
                        </div>
                    </div>

                    {/* Authorized Signature (Right) */}
                    <div className="text-center relative w-48">
                        {settings.signature && (
                            <img src={settings.signature} alt="Signature" className="h-16 object-contain absolute bottom-full left-1/2 -translate-x-1/2 mb-2" />
                        )}
                        <div className="border-t-2 border-gray-800 mx-auto pt-2">
                            <p className="text-[13px] font-bold text-gray-900">Authorized Signature</p>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">{settings.company_name}</p>
                        </div>
                    </div>
                </div>

                {/* 6. Footer Terms */}
                {settings.terms_conditions && (
                    <div className="mt-16 pt-4 border-t border-gray-200 text-center">
                        <div className="text-[10.5px] text-gray-500 inline-block prose prose-sm prose-p:my-0 text-center leading-relaxed" dangerouslySetInnerHTML={{ __html: settings.terms_conditions }}></div>
                    </div>
                )}
                
            </div>
        </div>
    );
}