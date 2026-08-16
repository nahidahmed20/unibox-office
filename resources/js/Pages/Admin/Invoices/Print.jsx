import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';

const numberToWords = (num) => {
    if (num === null || num === undefined || isNaN(num) || num === 0) return 'Zero Taka Only.';

    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertInteger = (n) => {
        if (n === 0) return '';
        let str = '';
        let numStr = ('000000000' + n).slice(-9);
        let matches = numStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!matches) return '';

        str += (matches[1] != 0) ? (a[Number(matches[1])] || b[matches[1][0]] + ' ' + a[matches[1][1]]) + ' Crore ' : '';
        str += (matches[2] != 0) ? (a[Number(matches[2])] || b[matches[2][0]] + ' ' + a[matches[2][1]]) + ' Lakh ' : '';
        str += (matches[3] != 0) ? (a[Number(matches[3])] || b[matches[3][0]] + ' ' + a[matches[3][1]]) + ' Thousand ' : '';
        str += (matches[4] != 0) ? (a[Number(matches[4])] || b[matches[4][0]] + ' ' + a[matches[4][1]]) + ' Hundred ' : '';
        str += (matches[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(matches[5])] || b[matches[5][0]] + ' ' + a[matches[5][1]]) : '';
        return str.trim();
    };

    const [taka, paisa] = Number(num).toFixed(2).split('.');
    let takaWords = convertInteger(Number(taka));
    let paisaWords = convertInteger(Number(paisa));

    let result = takaWords ? `${takaWords} Taka` : 'Zero Taka';
    if (paisaWords && Number(paisa) > 0) {
        result += ` and ${paisaWords} Paisa`;
    }
    
    return result + ' Only.';
};

export default function Print({ invoice }) {
    const [showSeal, setShowSeal] = useState(false);
    const [showLogo, setShowLogo] = useState(true);
    const [showFooter, setShowFooter] = useState(true);

    const { hasTax, hasDiscount, hasAdvance, advanceAmount, payableAmount, grandTotalWords, rowSpanCount } = useMemo(() => {
        if (!invoice) return {};
        const tax = parseFloat(invoice.tax) || 0;
        const discount = parseFloat(invoice.discount) || 0;
        const advance = Number(invoice.advance_used) || 0;
        const grandTotal = Number(invoice.grand_total) || 0;
        
        const hasTax = tax > 0;
        const hasDiscount = discount > 0;
        const hasAdvance = advance > 0;
        
        const payable = hasAdvance ? (grandTotal - advance) : grandTotal;
        const words = numberToWords(payable);
        
        const rows = 2 + (hasTax ? 1 : 0) + (hasDiscount ? 1 : 0) + (hasAdvance ? 2 : 0);
        
        return { hasTax, hasDiscount, hasAdvance, advanceAmount: advance, payableAmount: payable, grandTotalWords: words, rowSpanCount: rows };
    }, [invoice]);

    if (!invoice) return <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px', color: '#555' }}>Loading Invoice...</div>;

    const customCss = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-container { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 15mm; position: relative; background: #fff; font-size: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 160px; font-weight: 900; color: rgba(20, 122, 91, 0.04); z-index: 0; pointer-events: none; text-transform: uppercase; white-space: nowrap; }
        .paid-stamp { position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 80px; font-weight: 900; color: rgba(220, 38, 38, 0.15); border: 8px solid rgba(220, 38, 38, 0.15); padding: 15px 30px; border-radius: 15px; z-index: 2; pointer-events: none; text-transform: uppercase; white-space: nowrap; }
        .vertical-text { position: absolute; top: 115mm; left: 4mm; transform: rotate(-90deg); transform-origin: top left; color: #2cb34a; font-size: 42px; font-weight: bold; text-transform: uppercase; letter-spacing: 5px; z-index: 1; opacity: 0.8; }
        .invoice-content { padding-left: 25px; padding-top: 20px; position: relative; z-index: 1; }
        img.invoice-logo { height: 55px; margin-bottom: 30px; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; line-height: 1.6; }
        .invoice-table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; margin-bottom: 30px; background-color: transparent; }
        .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 10px 12px; }
        .invoice-table th { text-align: center; background-color: #f8fafc; font-weight: bold; color: #1e293b; }
        .text-center { text-align: center; } .text-right { text-align: right; }
        .align-top { vertical-align: top; } .align-middle { vertical-align: middle; }
        .html-text-box { font-size: 14px; line-height: 1.5; color: #333; }
        
        /* Removed background and styling from bank info */
        .bank-info { line-height: 1.6; font-size: 13px; margin-bottom: 60px; }
        
        .signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 80px; padding: 0 10px; }
        .sign-box { width: 180px; text-align: center; position: relative; height: 100px; }
        .sign-line { border-top: 1px solid #333; padding-top: 5px; font-weight: bold; position: absolute; bottom: 0; width: 100%; z-index: 2; }
        .signature-image { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); height: 90px; width: auto; z-index: 1; mix-blend-mode: multiply; }
        .invoice-footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 40px; padding-top: 15px; border-top: 1px dashed #cbd5e1; line-height: 1.6; }
        
        .print-toolbar { padding: 15px; background: #fff; text-align: center; border-bottom: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .print-toolbar button { margin: 0 10px; padding: 10px 20px; cursor: pointer; font-weight: 600; font-size: 14px; border-radius: 6px; border: none; transition: all 0.2s ease-in-out; }
        .print-toolbar button:hover { opacity: 0.9; transform: translateY(-1px); }
        
        @media print {
            body { margin: 0; background: #fff; } 
            @page { size: A4 portrait; margin: 0; }
            .invoice-container { margin: 0; border: none; box-shadow: none; padding-top: 15mm; min-height: 100vh; }
            .print-toolbar { display: none !important; }
        }
    `;

    return (
        <>
            <style>{customCss}</style>
            
            <div className="print-toolbar">
                <button onClick={() => setShowLogo(!showLogo)} style={{ background: showLogo ? '#ef4444' : '#3b82f6', color: 'white' }}>
                    {showLogo ? "❌ Remove Logo" : "✅ Add Logo"}
                </button>
                <button onClick={() => setShowFooter(!showFooter)} style={{ background: showFooter ? '#ef4444' : '#3b82f6', color: 'white' }}>
                    {showFooter ? "❌ Remove Footer" : "✅ Add Footer"}
                </button>
                <button onClick={() => setShowSeal(!showSeal)} style={{ background: showSeal ? '#ef4444' : '#3b82f6', color: 'white' }}>
                    {showSeal ? "❌ Remove Signature Seal" : "✅ Add Signature Seal"}
                </button>
                <button onClick={() => window.print()} style={{ background: '#10b981', color: 'white' }}>
                    🖨️ Print / Save PDF
                </button>
            </div>

            <div className="invoice-container">
                <Head title={`Invoice - ${invoice.invoice_number}`} />

                <div className="watermark">UNIBOX</div>
                {invoice.status === 'paid' && <div className="paid-stamp">PAID</div>}
                <div className="vertical-text">Invoice</div>

                <div className="invoice-content">
                    <img
                        src="/images/logo.png"
                        alt="UNIBOX Logo"
                        className="invoice-logo"
                        style={{ visibility: showLogo ? 'visible' : 'hidden' }}
                    />

                    <div className="info-section">
                        <div>
                            <p style={{ marginBottom: "5px", color: "#64748b" }}><strong>To:</strong></p>
                            <p className="font-bold" style={{ fontSize: "16px", color: "#147a5b" }}>
                                {invoice.client?.company_name || invoice.client?.name || 'Unknown Client'}
                            </p>
                            <p style={{ maxWidth: "250px" }}>{invoice.client?.address || 'Address not provided'}</p>
                        </div>
                        <div className="text-right">
                            <p><strong>Invoice No:</strong> <span style={{ color: "#147a5b", fontWeight: "bold" }}>{invoice.invoice_number}</span></p>
                            <p><strong>Issue Date:</strong> {invoice.invoice_date}</p>
                            <p><strong>Due Date:</strong> {invoice.due_date}</p>
                        </div>
                    </div>

                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Description</th>
                                <th style={{ width: '15%' }}>Quantity</th>
                                <th style={{ width: '20%' }}>Unit Price</th>
                                <th style={{ width: '25%' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items && invoice.items.length > 0 ? invoice.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="align-top">
                                        <div className="html-text-box" dangerouslySetInnerHTML={{ __html: item.description || 'No description' }}></div>
                                    </td>
                                    <td className="text-center align-middle font-bold">{item.quantity}</td>
                                    <td className="text-center align-middle">{Number(item.unit_price).toFixed(2)}</td>
                                    <td className="text-center align-middle font-bold">{Number(item.total).toFixed(2)}/-</td>
                                </tr>
                            )) : <tr><td colSpan="4" className="text-center" style={{ padding: '30px', color: '#94a3b8' }}>No items found in this invoice.</td></tr>}

                            {invoice.items && invoice.items.length > 0 && (
                                <>
                                    <tr>
                                        <td rowSpan={rowSpanCount} colSpan="2" className="align-top">
                                            <p style={{ marginBottom: "10px" }}><strong>Amount In words:</strong> <br/>{grandTotalWords}</p>
                                            
                                            {invoice.notes && invoice.notes !== '<p><br></p>' && (
                                                <div style={{ marginTop: '20px' }}>
                                                    <strong>Notes / Terms & Conditions:</strong>
                                                    <div className="html-text-box" style={{ marginTop: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }} dangerouslySetInnerHTML={{ __html: invoice.notes }}></div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right align-middle" style={{ paddingRight: '15px', fontWeight: 'bold' }}>Sub-total</td>
                                        <td className="text-center align-middle font-bold">{Number(invoice.sub_total).toFixed(2)}/-</td>
                                    </tr>
                                    
                                    {hasTax && (
                                        <tr>
                                            <td className="text-right" style={{ paddingRight: '15px' }}>@Vat ({invoice.tax}%)</td>
                                            <td className="text-center">{(((invoice.sub_total || 0) * invoice.tax) / 100).toFixed(2)}/-</td>
                                        </tr>
                                    )}
                                    
                                    {hasDiscount && (
                                        <tr>
                                            <td className="text-right" style={{ paddingRight: '15px' }}>Discount</td>
                                            <td className="text-center text-red-600">- {Number(invoice.discount).toFixed(2)}/-</td>
                                        </tr>
                                    )}
                                    
                                    <tr>
                                        <td className="text-right font-bold" style={{ paddingRight: '15px', backgroundColor: '#f8fafc' }}>Grand Total</td>
                                        <td className="text-center font-bold" style={{ backgroundColor: '#f8fafc' }}>{Number(invoice.grand_total).toFixed(2)}/-</td>
                                    </tr>
                                    
                                    {hasAdvance && (
                                        <>
                                            <tr>
                                                <td className="text-right" style={{ paddingRight: '15px' }}>Advance Adjusted</td>
                                                <td className="text-center">- {advanceAmount.toFixed(2)}/-</td>
                                            </tr>
                                            <tr>
                                                <td className="text-right font-bold" style={{ paddingRight: '15px', color: "#d93025", fontSize: '15px' }}>Payable Due</td>
                                                <td className="text-center font-bold" style={{ color: "#d93025", fontSize: '15px' }}>{payableAmount.toFixed(2)}/-</td>
                                            </tr>
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>

                    <div className="bank-info">
                        <p><strong>A/C No:</strong> 20502150201847805</p>
                        <p><strong>Name:</strong> Md. Moudud Islam</p>
                        <p><strong>Routing No:</strong> 125261337</p>
                        <p>Elephant Road Branch, Dhaka</p>
                        <p><strong>Islami Bank Bangladesh PLC</strong></p>
                    </div>

                    <div className="signature-section">
                        <div className="sign-box">
                            <div className="sign-line">Received by</div>
                        </div>
                        
                        <div className="sign-box">
                            {showSeal && <img src="/paid_sill.png" alt="Signature Seal" className="signature-image" />}
                            <div className="sign-line">Authorized Signature</div>
                        </div>
                    </div>

                    <div className="invoice-footer" style={{ visibility: showFooter ? 'visible' : 'hidden' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2cb34a' }}>Thank you for your business!</p>
                        <p>Address: 278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205</p>
                        <p>Email: uniboxbd4u@gmail.com, Phone: +880 1979 997 027</p>
                    </div>
                </div>
            </div>
        </>
    );
}