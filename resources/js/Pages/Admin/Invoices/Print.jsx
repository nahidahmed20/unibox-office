import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';

// Number to Words Converter (Bangladeshi/Indian Format)
const numberToWords = (num) => {
    if (!num || isNaN(num) || num == 0) return 'Zero taka only.';
    
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    
    let numberString = Math.floor(num).toString();
    if (numberString.length > 9) return 'Amount too large';
    
    let n = ('000000000' + numberString).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1) + ' taka only.';
};

export default function Print({ invoice }) {
    useEffect(() => {
        // Auto open print dialog in the new tab
        const timer = setTimeout(() => { window.print(); }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (!invoice) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Invoice...</div>;

    // Calculations based on actual data
    const hasTax = invoice.tax && parseFloat(invoice.tax) > 0;
    const hasDiscount = invoice.discount && parseFloat(invoice.discount) > 0;
    const advanceAmount = Number(invoice.advance_used) || 0; // ব্যাকএন্ড থেকে আসা ডাটা
    const hasAdvance = advanceAmount > 0;
    
    const rowSpanCount = 2 + (hasTax ? 1 : 0) + (hasDiscount ? 1 : 0) + (hasAdvance ? 2 : 0);

    // Calculate dynamic words based on grand total (or payable due if advance is used)
    const payableAmount = hasAdvance ? (Number(invoice.grand_total) - advanceAmount) : Number(invoice.grand_total);
    const grandTotalWords = numberToWords(payableAmount);

    const customCss = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #fff; font-family: Arial, sans-serif; color: #000; }
        .invoice-container {
            width: 210mm; min-height: 297mm; margin: auto; padding: 15mm;
            position: relative; background: #fff; font-size: 14px;
        }
        .vertical-text {
            position: absolute; top: 115mm; left: 13mm;
            transform: rotate(-90deg); transform-origin: top left;
            color: #2cb34a; font-size: 42px; font-weight: bold;
            text-transform: uppercase; letter-spacing: 5px;
        }
        .invoice-content { padding-left: 50px; }
        .logo { font-size: 36px; font-weight: bold; color: #147a5b; letter-spacing: 2px; margin-bottom: 30px; text-transform: uppercase; }
        
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; line-height: 1.6; }
        
        .invoice-table { width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 30px; }
        .invoice-table th, .invoice-table td { border: 1px solid #333; padding: 10px; }
        .invoice-table th { text-align: center; background-color: #f9fafb; font-weight: bold; }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .align-top { vertical-align: top; }
        .align-middle { vertical-align: middle; }
        .font-bold { font-weight: bold; }
        .item-description { white-space: pre-wrap; font-size: 13px; margin-top: 4px; color: #333; }
        .bank-info { line-height: 1.6; font-size: 13px; margin-bottom: 60px; }
        
        .signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 100px; padding: 0 10px; }
        .sign-box { width: 160px; text-align: center; }
        .sign-line { border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
        
        .footer { position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; }
        .footer-msg { color: #2cb34a; font-weight: bold; margin-bottom: 5px; font-size: 15px; }
        .footer-divider { border: 0; border-top: 1px solid rgba(44, 179, 74, 0.5); margin-bottom: 8px; }
        .footer-text { font-size: 12px; line-height: 1.5; }
        img.invoice-logo{ height: 55px; padding-bottom: 5px; }
        
        @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; }
            @page { size: A4 portrait; margin: 0; }
            .invoice-container { margin: 0; border: none; box-shadow: none; }
        }
    `;

    return (
        <div className="invoice-container">
            <Head title={`Invoice - ${invoice.invoice_number}`} />
            <style>{customCss}</style>

            <div className="vertical-text">Invoice</div>

            <div className="invoice-content">
                <div className="logo-container">
                    <img src="/images/logo.png" alt="UNIBOX Logo" className="invoice-logo" />
                </div>

                {/* To & Date Section */}
                <div className="info-section">
                    <div>
                        <p style={{ marginBottom: "5px" }}><strong>To:</strong></p>
                        {invoice.client?.name && <p className="font-bold">{invoice.client.name}</p>}
                        {invoice.client?.company_name && <p>{invoice.client.company_name}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <p><strong>Invoice No:</strong> {invoice.invoice_number}</p>
                        <p><strong>Date:</strong> {invoice.invoice_date}</p>
                    </div>
                </div>

                {/* Main Table */}
                <table className="invoice-table">
                    <thead>
                        <tr>
                            <th style={{ width: '55%' }}>Description</th>
                            <th style={{ width: '15%' }}>Quantity</th>
                            <th style={{ width: '15%' }}>Unit<br/>Price</th>
                            <th style={{ width: '15%' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items && invoice.items.length > 0 ? (
                            invoice.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="align-top">
                                        <strong>{index + 1}. {item.description}</strong>
                                        {item.project && (
                                            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                                                Project: {item.project.title}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center align-middle">{item.quantity}</td>
                                    <td className="text-center align-middle">{item.unit_price}</td>
                                    <td className="text-center align-middle">{item.total}/-</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center" style={{ padding: '20px', color: '#666' }}>
                                    No items found in this invoice.
                                </td>
                            </tr>
                        )}

                        {/* Calculations Section */}
                        {invoice.items && invoice.items.length > 0 && (
                            <>
                                <tr>
                                    <td rowSpan={rowSpanCount} className="align-top">
                                        <strong>In words:</strong> {grandTotalWords}
                                        
                                        {invoice.notes && (
                                            <div style={{ marginTop: '20px' }}>
                                                <strong>Notes / Terms:</strong><br/>
                                                <div className="item-description">{invoice.notes}</div>
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>Sub-total</td>
                                    <td className="text-center font-bold">{invoice.sub_total}/-</td>
                                </tr>

                                {hasTax && (
                                    <tr>
                                        <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>@Vat ({invoice.tax}%)</td>
                                        <td className="text-center">{(((invoice.sub_total || 0) * invoice.tax) / 100).toFixed(2)}/-</td>
                                    </tr>
                                )}

                                {hasDiscount && (
                                    <tr>
                                        <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>Discount</td>
                                        <td className="text-center">- {invoice.discount}/-</td>
                                    </tr>
                                )}

                                <tr>
                                    <td colSpan="2" className="text-right font-bold" style={{ paddingRight: '15px' }}>Grand Total</td>
                                    <td className="text-center font-bold">{invoice.grand_total}/-</td>
                                </tr>

                                {hasAdvance && (
                                    <>
                                        <tr>
                                            <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>Advance Adjusted</td>
                                            <td className="text-center">- {advanceAmount.toFixed(2)}/-</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="2" className="text-right font-bold" style={{ paddingRight: '15px' }}>Payable Due</td>
                                            <td className="text-center font-bold">{payableAmount.toFixed(2)}/-</td>
                                        </tr>
                                    </>
                                )}
                            </>
                        )}
                    </tbody>
                </table>

                {/* Bank Info */}
                <div className="bank-info">
                    <p><strong>A/C No:</strong> 20502150201847805</p>
                    <p><strong>Name:</strong> Md. Moudud Islam</p>
                    <p><strong>Routing No:</strong> 125261337</p>
                    <p>Elephant Road Branch, Dhaka</p>
                    <p><strong>Islami Bank Bangladesh PLC</strong></p>
                </div>

                {/* Signature Section */}
                <div className="signature-section">
                    <div className="sign-box">
                        <div className="sign-line">Received by</div>
                    </div>
                    
                    <div className="sign-box">
                        <div className="sign-line">Signature</div>
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="footer">
                <p className="footer-msg">Thank you for your business!</p>
                <hr className="footer-divider" />
                <p className="footer-text">
                    <strong>Address:</strong> 278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205<br/>
                    <strong>Email:</strong> uniboxbd4u@gmail.com, <strong>Phone:</strong> +880 1979 997 027
                </p>
            </div>
        </div>
    );
}