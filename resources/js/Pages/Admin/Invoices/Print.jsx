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
        // Auto open print dialog
        setTimeout(() => { window.print(); }, 500);
    }, []);

    // Calculate dynamic words based on grand total
    const grandTotalWords = numberToWords(invoice.grand_total);

    // Pure CSS Styling
    const customCss = `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            background-color: #fff;
            font-family: Arial, sans-serif;
            color: #000;
        }
        .invoice-container {
            width: 210mm;
            min-height: 297mm;
            margin: auto;
            padding: 15mm;
            position: relative;
            background: #fff;
            font-size: 14px;
        }
        .vertical-text {
            position: absolute;
            top: 115mm;
            left: 13mm;
            transform: rotate(-90deg);
            transform-origin: top left;
            color: #2cb34a;
            font-size: 42px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 5px;
        }
        .invoice-content {
            padding-left: 50px;
        }
        .logo {
            font-size: 36px;
            font-weight: bold;
            color: #147a5b;
            letter-spacing: 2px;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        .info-section {
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            margin-bottom: 30px;
        }
        .invoice-table th, .invoice-table td {
            border: 1px solid #000;
            padding: 10px;
        }
        .invoice-table th {
            border: 2px solid #000;
            text-align: center;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .align-top { vertical-align: top; }
        .align-middle { vertical-align: middle; }
        .font-bold { font-weight: bold; }
        
        .item-list {
            margin-left: 20px;
            display: block;
            line-height: 1.5;
        }
        .bank-info {
            line-height: 1.6;
            font-size: 13px;
            margin-bottom: 60px;
        }
        
        /* Signature Section */
        .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 80px;
            padding: 0 10px;
        }
        .sign-box {
            width: 160px;
            text-align: center;
            position: relative;
        }
        .sign-line {
            border-top: 1px solid #000;
            padding-top: 5px;
        }
        
        /* Fake CSS Seal */
        .fake-seal {
            position: absolute;
            top: -70px;
            left: -15px;
            width: 90px;
            height: 90px;
            border: 2px solid #003366;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #003366;
            opacity: 0.6;
            transform: rotate(-15deg);
            pointer-events: none;
            background: transparent;
        }
        .fake-seal-text-top { font-size: 10px; font-weight: bold; letter-spacing: 2px; }
        .fake-seal-mid { border-top: 1px solid #003366; border-bottom: 1px solid #003366; width: 100%; text-align: center; margin: 4px 0; padding: 2px 0; }
        .fake-seal-text-mid { font-size: 12px; font-weight: bold; }
        .fake-seal-text-bottom { font-size: 8px; text-transform: uppercase; }
        
        .fake-signature {
            position: absolute;
            top: -25px;
            left: 20px;
            font-family: 'Brush Script MT', cursive;
            font-size: 22px;
            color: #333;
        }

        /* Footer */
        .footer {
            position: absolute;
            bottom: 15mm;
            left: 15mm;
            right: 15mm;
            text-align: center;
        }
        .footer-msg {
            color: #2cb34a;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 15px;
        }
        .footer-divider {
            border: 0;
            border-top: 2px solid rgba(44, 179, 74, 0.5);
            margin-bottom: 8px;
        }
        .footer-text {
            font-size: 12px;
            line-height: 1.5;
        }
        img.invoice-logo{
            height: 55px;
            padding-bottom: 5px;
        }

        /* Print Specific Styles */
        @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; }
            @page { size: A4 portrait; margin: 0; }
            .invoice-container { margin: 0; border: none; box-shadow: none; }
        }
    `;

    return (
        <div className="invoice-container">
            <Head title={`Invoice - ${invoice.invoice_number}`} />
            
            {/* Inject Pure CSS */}
            <style>{customCss}</style>

            {/* Vertically Aligned "Invoice" Text */}
            <div className="vertical-text">
                Invoice
            </div>

            <div className="invoice-content">
                <div className="logo-container">
                    {/* public/images folder-e apnar logo chobiti rakhben */}
                    <img src="/images/logo.png" alt="UNIBOX Logo" className="invoice-logo" />
                </div>

                {/* To & Date Section */}
                <div className="info-section">
                    <p>Date: {invoice.invoice_date}</p>
                    <p>To</p>
                    <p className="font-bold">{invoice.client?.name || 'Client Name'}</p>
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
                        {/* Row 1: Main Items */}
                        <tr>
                            <td className="align-top">
                                <strong>1. Custom Design Service</strong><br/>
                                <span className="item-list">
                                    Size: Standard<br/>
                                    Paper: 150 gsm Mat<br/>
                                    Print: 4 Color<br/>
                                    Notes: {invoice.notes || 'N/A'}
                                </span>
                            </td>
                            <td className="text-center align-middle">1</td>
                            <td className="text-center align-middle">{invoice.sub_total}</td>
                            <td className="text-center align-middle">{invoice.sub_total}/-</td>
                        </tr>

                        {/* Row 2: Empty space row to mimic the image */}
                        <tr>
                            <td className="font-bold">2. Design Charge</td>
                            <td></td>
                            <td></td>
                            <td className="text-center">0/-</td>
                        </tr>

                        {/* Calculations */}
                        <tr>
                            <td rowSpan="3" className="align-top">
                                <strong>In words:</strong> {grandTotalWords}
                            </td>
                            <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>Sub-total</td>
                            <td className="text-center font-bold">{invoice.sub_total}/-</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="text-right" style={{ paddingRight: '15px' }}>@Vat</td>
                            <td className="text-center">{invoice.tax > 0 ? invoice.tax : '-'}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="text-right font-bold" style={{ paddingRight: '15px' }}>Grand Total</td>
                            <td className="text-center font-bold">{invoice.grand_total}/-</td>
                        </tr>
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
                        {/* Fake Seal */}
                        <div className="fake-seal">
                            <span className="fake-seal-text-top">UNIBOX</span>
                            <div className="fake-seal-mid">
                                <span className="fake-seal-text-mid">UNIBOX</span>
                            </div>
                            <span className="fake-seal-text-bottom">Dhaka, Bangladesh</span>
                        </div>
                        
                        {/* Fake Signature */}
                        <div className="fake-signature">
                            Moudud
                        </div>

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