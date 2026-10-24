import React, { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import TableExportButtons from '@/Components/TableExportButtons';

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>৳</span>
);

function BankChargeEditor({ payment, onSuccess }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({ pay_amount: payment.pay_amount, bank_charge: payment.bank_charge || 0 });

    if (payment.payment_source !== 'account' || payment.status !== 'completed' || Number(payment.pay_amount) <= 0) {
        return (
            <div className="mt-2 text-[12px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit border border-gray-100">
                Bank charge: <Taka className="text-[10px]" />{Number(payment.bank_charge || 0).toLocaleString('en-IN')}
            </div>
        );
    }

    return (
        <div className="mt-2">
            {!editing ? (
                <div className="flex items-center gap-3">
                    <div className="text-[12px] font-bold text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
                        Bank charge: <Taka className="text-[11px]" />{Number(payment.bank_charge || 0).toLocaleString('en-IN')}
                    </div>
                    <button onClick={() => { form.setData({ pay_amount: payment.pay_amount, bank_charge: payment.bank_charge || 0 }); form.clearErrors(); setEditing(true); }} className="text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                        <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                </div>
            ) : (
                <form className="mt-2.5 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm animate-[fadeIn_0.2s_ease-out] w-full max-w-sm" onSubmit={event => {
                    event.preventDefault();
                    form.patch(route('admin.vendors.payments.bank-charge', payment.id), {
                        preserveScroll: true,
                        onSuccess: () => { setEditing(false); if(onSuccess) onSuccess(); Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' }); }
                    });
                }}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-indigo-100">
                        <span className="text-[12px] font-black text-indigo-800 uppercase tracking-wider"><i className="fa-solid fa-pen-clip mr-1"></i> Edit Bank Payment</span>
                        <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Pay Amount <span className="text-red-500">*</span></label>
                            <input type="number" min="0.01" step="0.01" required value={form.data.pay_amount} onChange={e => form.setData('pay_amount', e.target.value)} className="w-full rounded-lg border-gray-300 px-3 py-2 text-[13px] font-bold text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                            {form.errors.pay_amount && <p className="text-[10px] text-red-600 font-bold mt-1">{form.errors.pay_amount}</p>}
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Bank Charge <span className="text-red-500">*</span></label>
                            <input type="number" min="0" step="0.01" required value={form.data.bank_charge} onChange={e => form.setData('bank_charge', e.target.value)} className="w-full rounded-lg border-gray-300 px-3 py-2 text-[13px] font-bold text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                            {form.errors.bank_charge && <p className="text-[10px] text-red-600 font-bold mt-1">{form.errors.bank_charge}</p>}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-[11.5px] font-bold text-indigo-900 bg-white px-2.5 py-1 rounded border border-indigo-100">
                            Bank Debit: <Taka className="text-[10px]" />{(Number(form.data.pay_amount || 0) + Number(form.data.bank_charge || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </div>
                        <button disabled={form.processing} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold px-4 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                            {form.processing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const COMPANY = {
    name: 'UNIBOX',
    tagline: "Let's Create Together",
    logo: typeof window !== 'undefined' ? `${window.location.origin}/images/logo.png` : '',
    phone: '+8801627188836',
    email: 'uniboxbd4u@gmail.com',
    website: 'www.uniboxbd4u.com',
    address: '278/3/A, Sardar Villa, 5th Floor, Kataban Dhal, Kataban, Dhaka-1205',
};

export default function Show({ vendor, payments = [], ledgers = [], bills = [], statement = [], directPayments = [], dateWisePayments = [], stats = {} }) {
    const { auth } = usePage().props;
    const isSuperAdmin = auth?.roles?.includes('Super Admin') || auth?.roles?.includes('super-admin');

    const [activeTab, setActiveTab] = useState('statement');

    // Void Modal State
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [paymentToVoid, setPaymentToVoid] = useState(null);
    const voidForm = useForm({ void_reason: '' });

    const openVoidModal = (payment) => {
        setPaymentToVoid(payment);
        voidForm.reset();
        voidForm.clearErrors();
        setShowVoidModal(true);
    };

    const handleVoidSubmit = (e) => {
        e.preventDefault();
        voidForm.post(route('admin.vendors.payments.void', paymentToVoid.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowVoidModal(false);
                setPaymentToVoid(null);
                Swal.fire({ icon: "success", title: "Payment voided successfully!", timer: 1500, showConfirmButton: false });
            },
            onError: (err) => {
                if (err.error) Swal.fire("Error", err.error, "error");
            }
        });
    };

    const grandTotalDateWise = dateWisePayments.reduce((sum, g) => sum + Number(g.total_amount || 0), 0);

    const exportConfig = useMemo(() => {
        if (activeTab === 'date_wise') {
            return {
                headers: ['Date', 'Payment Sources', 'Entries Count', 'Breakdown', 'Discount (Tk)', 'Total Paid on Date (Tk)'],
                rows: (dateWisePayments || []).map(g => [
                    g.date || '—',
                    (g.methods || []).join(', ') || '—',
                    g.items?.length || 0,
                    (g.items || []).map(i => `${i.ref} (${i.title}): ${i.amount}`).join(" | "),
                    Number(g.total_discount || 0),
                    Number(g.total_amount || 0)
                ]),
                filename: `vendor_datewise_payments_${vendor?.name || 'vendor'}`,
                title: `Vendor Date-wise Payment Summary - ${vendor?.name || ''}`
            };
        } else {
            return {
                headers: ['Date', 'Type', 'Ref', 'Particulars', 'Project', 'Billed (Cr) (Tk)', 'Paid (Dr) (Tk)', 'Discount (Tk)', 'Running Due Balance (Tk)'],
                rows: (statement || []).map(ev => [
                    ev.date || '—',
                    ev.type || '—',
                    ev.ref || '—',
                    ev.title || '—',
                    ev.project || '—',
                    Number(ev.billed || 0),
                    Number(ev.paid || 0),
                    Number(ev.discount || 0),
                    Number(ev.balance || 0)
                ]),
                filename: `vendor_statement_${vendor?.name || 'vendor'}`,
                title: `Vendor Statement of Account - ${vendor?.name || ''}`
            };
        }
    }, [activeTab, dateWisePayments, statement, vendor?.name]);

    const handlePrint = () => {
        const tableEl = document.getElementById("printable-vendor-table");
        if (!tableEl) return Swal.fire("Info", "Please select Full Statement or Date-wise Payments tab to print.", "info");

        const reportTitle = activeTab === 'date_wise'
            ? 'Vendor Date-wise Payment Summary'
            : 'Vendor Statement of Account';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportTitle} - ${vendor.name}</title>
                    <style>
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px 40px; color: #1e293b; background: #fff; margin: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #147a5b; padding-bottom: 15px; margin-bottom: 20px; }
                        .logo { height: 45px; width: auto; }
                        .company-details { text-align: right; font-size: 11px; line-height: 1.5; color: #475569; }
                        .company-details h2 { margin: 0 0 3px 0; font-size: 18px; color: #147a5b; text-transform: uppercase; letter-spacing: 1px; }
                        .report-title { text-align: center; font-size: 17px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #0f172a; margin-bottom: 20px; }
                        .top-panel { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12.5px; line-height: 1.6; }
                        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; width: 320px; }
                        .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .summary-row.total { border-top: 2px dashed #cbd5e1; padding-top: 6px; margin-top: 6px; font-weight: bold; font-size: 14px; color: #dc2626; }
                        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
                        th, td { padding: 9px 11px; border: 1px solid #cbd5e1; }
                        th { background-color: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; font-size: 11px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><img src="${COMPANY.logo}" class="logo" alt="Logo" /></div>
                        <div class="company-details">
                            <h2>${COMPANY.name}</h2>
                            ${COMPANY.address}<br/>
                            Phone: ${COMPANY.phone} | Email: ${COMPANY.email}
                        </div>
                    </div>
                    <div class="report-title">${reportTitle}</div>
                    <div class="top-panel">
                        <div>
                            <strong>Vendor Profile:</strong><br/>
                            Name: ${vendor.name} ${vendor.company_name ? `(${vendor.company_name})` : ''}<br/>
                            Phone: ${vendor.phone || 'N/A'}<br/>
                            Address: ${vendor.address || 'N/A'}
                        </div>
                        <div class="summary-box">
                            <div class="summary-row"><span>Total Billed:</span> <span>TK. ${Number(stats.totalBilled || 0).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Total Settled / Paid:</span> <span>TK. ${Number(stats.totalPaid || 0).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Wallet Advance:</span> <span>TK. ${Number(vendor.wallet_balance || 0).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row"><span>Gross Payable Due:</span> <span>TK. ${Number(vendor.total_due || 0).toLocaleString('en-IN')}</span></div>
                            <div class="summary-row total"><span>Net Payable after Advance:</span> <span>TK. ${Number(vendor.net_due || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                    ${tableEl.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    return (
        <AdminLayout>
            <Head title={`${vendor.name} - Vendor Profile`} />

            <style dangerouslySetInnerHTML={{__html: `
                .custom-table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-table-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
                .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
            `}} />

            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">

                {/* Back Button & Print/Export Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link href={route('admin.vendors.index')} className="text-gray-600 hover:text-indigo-600 font-bold text-[13px] flex items-center gap-2 w-fit bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50">
                        <i className="fa-solid fa-arrow-left"></i> Back to Vendors
                    </Link>

                    {(activeTab === 'statement' || activeTab === 'date_wise') && (
                        <TableExportButtons
                            headers={exportConfig.headers}
                            rows={exportConfig.rows}
                            filename={exportConfig.filename}
                            title={exportConfig.title}
                        />
                    )}
                </div>

                {/* 🟢 Premium Clean Profile Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    <div className="flex items-center gap-5 sm:gap-6">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl sm:text-4xl font-black border border-indigo-100 shadow-inner uppercase">
                            {vendor.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-[24px] sm:text-[30px] font-black text-gray-900 tracking-tight leading-tight">{vendor.name}</h1>
                            {vendor.company_name && (
                                <p className="text-gray-500 font-bold flex items-center gap-2 mt-1 text-[14px] sm:text-[15px]">
                                    <i className="fa-regular fa-building text-gray-400"></i> {vendor.company_name}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-[12.5px] sm:text-[13.5px] font-semibold text-gray-600">
                                {vendor.phone && <span className="flex items-center gap-1.5"><i className="fa-solid fa-phone text-gray-400"></i> {vendor.phone}</span>}
                                {vendor.address && <span className="flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-gray-400"></i> {vendor.address}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-100 shrink-0 w-full xl:w-auto">
                        <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 sm:pr-6">
                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-money-check-dollar"></i> Total Payable (Due)</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-rose-700">
                                <Taka className="text-lg sm:text-xl text-rose-500"/>{Number(vendor.total_due || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex flex-col sm:pl-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-500 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-wallet"></i> Wallet (Advance)</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-purple-700">
                                <Taka className="text-lg sm:text-xl text-purple-500"/>{Number(vendor.wallet_balance || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex flex-col sm:pl-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1.5"><i className="fa-solid fa-scale-balanced"></i> Net Payable</span>
                            <span className="text-[22px] sm:text-[26px] font-black tabular-nums text-emerald-700">
                                <Taka className="text-lg sm:text-xl text-emerald-500"/>{Number(vendor.net_due || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🟢 Additional Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Billed by Vendor</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-gray-900 tabular-nums"><Taka/>{Number(stats.totalBilled || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl sm:text-2xl border border-blue-100"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Total Bill Settled / Paid</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-emerald-700 tabular-nums"><Taka/>{Number(stats.totalPaid || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl sm:text-2xl border border-emerald-100"><i className="fa-solid fa-check-double"></i></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Discount / Adjustment</p>
                            <h3 className="text-[20px] sm:text-[24px] font-black text-amber-600 tabular-nums"><Taka/>{Number(stats.totalDiscount || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xl sm:text-2xl border border-amber-100"><i className="fa-solid fa-tags"></i></div>
                    </div>
                </div>

                {/* 🟢 Tabs Area */}
                <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex border-b border-gray-200 bg-gray-50/80 p-3 gap-2 overflow-x-auto custom-table-scroll">
                        <button onClick={() => setActiveTab('statement')} className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'statement' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-book-open"></i> Full Statement
                        </button>
                        <button onClick={() => setActiveTab('date_wise')} className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'date_wise' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-calendar-check"></i> Date-wise Payments ({dateWisePayments.length} {dateWisePayments.length === 1 ? 'Day' : 'Days'})
                        </button>
                        <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-money-bill-transfer"></i> Payment Vouchers ({payments.length})
                        </button>
                        <button onClick={() => setActiveTab('bills')} className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'bills' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-list-check"></i> Project Bills ({bills.length})
                        </button>
                        <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200 border border-transparent'}`}>
                            <i className="fa-solid fa-wallet"></i> Wallet Ledger ({ledgers.length})
                        </button>
                    </div>

                    <div className="p-0 overflow-x-auto custom-table-scroll">

                        {/* 🟢 FULL CHRONOLOGICAL STATEMENT TAB */}
                        {activeTab === 'statement' && (
                            <table id="printable-vendor-table" className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type & Ref</th>
                                        <th className="px-6 py-4">Particulars / Project</th>
                                        <th className="px-6 py-4 text-right">Billed (Cr)</th>
                                        <th className="px-6 py-4 text-right">Paid (Dr)</th>
                                        <th className="px-6 py-4 text-right">Discount</th>
                                        <th className="px-6 py-4 text-right">Running Payable</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {statement.length > 0 ? statement.map((ev, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <i className="fa-regular fa-calendar-days text-gray-400 text-[11px]"></i> {ev.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10.5px] font-black uppercase tracking-wider border ${
                                                    ev.type === 'bill' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    ev.type === 'opening_balance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {ev.type === 'bill' ? 'Bill' : ev.type === 'opening_balance' ? 'Opening' : ev.type === 'direct_payment' ? 'Direct Paid' : 'Voucher'}
                                                </span>
                                                <div className="text-[11px] font-bold text-gray-400 mt-1">{ev.ref}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[260px]">
                                                <div className="font-bold text-gray-900">{ev.title}</div>
                                                {ev.project && (
                                                    <div className="text-[11.5px] font-bold text-indigo-600 mt-0.5">
                                                        <i className="fa-solid fa-folder-open text-[10px] mr-1"></i>
                                                        {ev.project} {ev.client ? `(${ev.client})` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 bg-rose-50/10 tabular-nums">
                                                {ev.billed > 0 ? <><Taka />{Number(ev.billed).toLocaleString('en-IN')}</> : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/10 tabular-nums">
                                                {ev.paid > 0 ? <><Taka />{Number(ev.paid).toLocaleString('en-IN')}</> : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-amber-600 tabular-nums">
                                                {ev.discount > 0 ? <><Taka />{Number(ev.discount).toLocaleString('en-IN')}</> : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black bg-slate-50/60 tabular-nums">
                                                <span className={ev.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                                                    <Taka />{Number(Math.abs(ev.balance)).toLocaleString('en-IN')}
                                                    <span className="text-[10px] ml-1 uppercase">{ev.balance > 0 ? '(Due)' : ''}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="7" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]">No statement records found for this vendor.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 DATE-WISE PAYMENTS SUMMARY TAB */}
                        {activeTab === 'date_wise' && (
                            <table id="printable-vendor-table" className="w-full text-left whitespace-nowrap">
                                <thead className="bg-emerald-50/70 border-b border-emerald-200 text-[11.5px] font-extrabold uppercase text-emerald-900 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-16">SL</th>
                                        <th className="px-6 py-4 w-44">Payment Date</th>
                                        <th className="px-6 py-4 w-56">Payment Source</th>
                                        <th className="px-6 py-4">Bills / Vouchers Breakdown</th>
                                        <th className="px-6 py-4 text-right w-40">Discount</th>
                                        <th className="px-6 py-4 text-right w-52">Date Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {dateWisePayments.length > 0 ? (
                                        <>
                                            {dateWisePayments.map((group, idx) => (
                                                <tr key={group.date} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400 tabular-nums">{idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-2 font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                            <i className="fa-regular fa-calendar-check text-emerald-600"></i>
                                                            <span>{group.date}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {group.methods.map((m, i) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-2xs">
                                                                    <i className="fa-solid fa-building-columns text-slate-400 text-[10px]"></i>
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-normal min-w-[320px]">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                <i className="fa-solid fa-layer-group text-[10px]"></i>
                                                                Total {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {group.items.map((item, i) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-2xs">
                                                                    <span className="text-indigo-600 font-black">{item.ref}</span>
                                                                    <span className="text-slate-500">({item.title})</span>
                                                                    <span className="text-slate-300">:</span>
                                                                    <span className="text-emerald-700 font-black tabular-nums">৳{Number(item.amount).toLocaleString('en-IN')}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-amber-600 tabular-nums">
                                                        {Number(group.total_discount || 0) > 0 ? <><Taka />{Number(group.total_discount).toLocaleString('en-IN')}</> : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right bg-emerald-50/20">
                                                        <div className="font-black text-emerald-700 text-[16.5px] tabular-nums">
                                                            <Taka />{Number(group.total_amount).toLocaleString('en-IN')}
                                                        </div>
                                                        <span className="block text-[10.5px] font-bold text-emerald-600">
                                                            Total paid on date
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-900 text-white font-black">
                                                <td colSpan="5" className="px-6 py-4 text-right text-[14px] uppercase tracking-wider">
                                                    Grand Total Paid across {dateWisePayments.length} Dates:
                                                </td>
                                                <td className="px-6 py-4 text-right text-[18px] text-emerald-400 tabular-nums">
                                                    <Taka className="text-[16px]" />{Number(grandTotalDateWise).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]">No payment records found for this vendor.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 PAYMENTS TAB */}
                        {activeTab === 'payments' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date & Details</th>
                                        <th className="px-6 py-4.5">Source / Account</th>
                                        <th className="px-6 py-4.5">Purpose / Settled Bills</th>
                                        <th className="px-6 py-4.5 text-right">Amount Paid</th>
                                        <th className="px-6 py-4.5 text-center border-l border-gray-100">Status / Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {payments.length > 0 ? payments.map(pay => (
                                        <tr key={pay.id} className={`hover:bg-gray-50/80 transition-colors ${pay.status === 'voided' ? 'bg-red-50/40' : ''}`}>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                                    <i className="fa-regular fa-calendar-days text-gray-400 text-[12px]"></i> {pay.date}
                                                </div>
                                                <div className="text-[11.5px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                                    Ref: #{String(pay.id).padStart(5, '0')}
                                                </div>
                                                {pay.status !== 'voided' && <BankChargeEditor payment={pay} />}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-bold text-indigo-700 flex items-center gap-2 bg-indigo-50 px-3 py-1.5 w-fit rounded-lg border border-indigo-100">
                                                    <i className={`fa-solid ${pay.payment_source === 'account' ? 'fa-building-columns' : 'fa-user-tie'}`}></i>
                                                    {pay.payment_source === 'account' ? (pay.account?.name || 'Bank/Cash') : pay.payment_source === 'wallet' ? 'Vendor Advance (Wallet)' : 'Employee Advance'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[300px] max-w-lg align-top">
                                                <div className="flex flex-col gap-2.5">
                                                    {pay.note && (
                                                        <div className="text-[12.5px] text-gray-600 bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg font-medium">
                                                            <span className="font-bold text-amber-700 block mb-0.5"><i className="fa-solid fa-note-sticky mr-1"></i> Note:</span>
                                                            {pay.note}
                                                        </div>
                                                    )}

                                                    {pay.details?.length > 0 ? pay.details.map(d => (
                                                        <div key={d.id} className="bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-sm">
                                                            <div className="font-bold text-gray-800 leading-snug">
                                                                {d.expense?.title || 'Unknown Expense / Bill'}
                                                            </div>
                                                            {d.expense?.project && (
                                                                <div className="text-indigo-600 font-bold mt-1 text-[11.5px] flex items-center gap-1.5">
                                                                    <i className="fa-solid fa-folder-open text-indigo-400"></i> {d.expense.project.title}
                                                                </div>
                                                            )}
                                                            <div className="text-[11.5px] text-gray-500 font-medium mt-1.5 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-1.5">
                                                                <span>
                                                                    Bill Settled: <strong className="text-gray-800 tabular-nums">৳{Number(d.amount).toLocaleString('en-IN')}</strong>
                                                                </span>
                                                                {d.expense && (
                                                                    <span className="border-l border-gray-300 pl-4">
                                                                        Current Due: <strong className={`${Number(d.expense.due_amount) > 0 ? 'text-rose-600' : 'text-emerald-600'} tabular-nums`}>
                                                                            ৳{Number(d.expense.due_amount).toLocaleString('en-IN')}
                                                                        </strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <span className="text-gray-400 italic text-[12px] font-medium">Advance deposit (No specific bill attached)</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className={`font-black text-[18px] ${pay.status === 'voided' ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>
                                                    <Taka/>{Number(pay.pay_amount).toLocaleString('en-IN')}
                                                </div>
                                                {Number(pay.wallet_credit_amount) > 0 && (
                                                    <div className="text-[11.5px] font-bold text-purple-600 mt-1 flex justify-end items-center gap-1 bg-purple-50 w-fit ml-auto px-2 py-0.5 rounded border border-purple-100">
                                                        <i className="fa-solid fa-arrow-turn-down"></i> Sent to Wallet: ৳{Number(pay.wallet_credit_amount).toLocaleString('en-IN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center align-top border-l border-gray-100">
                                                {pay.status === 'voided' ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-200">VOIDED</span>
                                                        {pay.void_reason && <span className="text-[10px] text-red-500 font-bold max-w-[120px] truncate" title={pay.void_reason}>{pay.void_reason}</span>}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200">COMPLETED</span>
                                                        {/* 🟢 Void Button Added Here */}
                                                        {isSuperAdmin && (
                                                            <button onClick={() => openVoidModal(pay)} className="text-[10.5px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-100 transition-colors flex items-center gap-1">
                                                                <i className="fa-solid fa-ban"></i> Void
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-receipt text-4xl mb-4 block text-gray-200"></i>No payment history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 PROJECT BILLS TAB */}
                        {activeTab === 'bills' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date</th>
                                        <th className="px-6 py-4.5">Project & Client</th>
                                        <th className="px-6 py-4.5">Bill Details & Description</th>
                                        <th className="px-6 py-4.5 text-right">Total Bill</th>
                                        <th className="px-6 py-4.5 text-right">Paid Amount</th>
                                        <th className="px-6 py-4.5 text-right bg-rose-50/50 text-rose-500">Due Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {bills.length > 0 ? bills.map(bill => (
                                        <tr key={bill.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-600 align-top">
                                                {bill.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[200px] max-w-[250px] align-top">
                                                {bill.project ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-extrabold text-indigo-700 leading-snug">{bill.project.title}</span>
                                                        {bill.project.client && (
                                                            <span className="text-[11.5px] font-bold text-gray-500 flex items-center gap-1.5">
                                                                <i className="fa-regular fa-building opacity-70"></i> {bill.project.client.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400 italic">General (No Project)</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[250px] max-w-[350px] align-top">
                                                <div className="font-extrabold text-gray-900 text-[14.5px] leading-snug">{bill.title}</div>
                                                {bill.category && (
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit mt-1.5">
                                                        {bill.category.name}
                                                    </div>
                                                )}
                                                {bill.description && (
                                                    <div className="text-[12.5px] text-gray-500 mt-2 italic border-l-2 border-gray-200 pl-2 line-clamp-2" title={bill.description}>
                                                        {bill.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-700 bg-gray-50/50 align-top"><Taka/>{Number(bill.total_bill).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/30 align-top"><Taka/>{Number(bill.paid_amount).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right font-black text-rose-600 bg-rose-50/40 align-top"><Taka/>{Number(bill.due_amount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-folder-open text-4xl mb-4 block text-gray-200"></i>No bills found for this vendor.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 🟢 WALLET LEDGER TAB */}
                        {activeTab === 'ledger' && (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-200 text-[11.5px] font-extrabold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4.5">Date</th>
                                        <th className="px-6 py-4.5">Transaction Type</th>
                                        <th className="px-6 py-4.5">Wallet Description / Context</th>
                                        <th className="px-6 py-4.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-800 divide-y divide-gray-100">
                                    {ledgers.length > 0 ? ledgers.map(l => (
                                        <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-600 align-top">{new Date(l.date || l.created_at).toLocaleDateString('en-GB')}</td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${l.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    <i className={`fa-solid mr-1.5 ${l.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                                                    {l.type === 'credit' ? 'DEPOSIT (IN)' : 'WITHDRAW (OUT)'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-normal min-w-[300px] align-top">
                                                <div className="font-bold text-gray-800 leading-relaxed bg-gray-50 border border-gray-100 p-3 rounded-xl shadow-sm">
                                                    {l.description}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-[18px] align-top tabular-nums ${l.type === 'credit' ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'}`}>
                                                {l.type === 'credit' ? '+' : '-'} <Taka className="ml-0.5 text-sm"/> {Number(l.amount).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-bold text-[15px]"><i className="fa-solid fa-wallet text-4xl mb-4 block text-gray-200"></i>No wallet transactions found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* --- 🚨 PREMIUM VOID PAYMENT CONFIRMATION MODAL --- */}
            {showVoidModal && paymentToVoid && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-md bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[scaleIn_0.2s_ease-out]">

                        {/* Executive Header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">⚠️</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-400/10 border border-rose-400/20 text-rose-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-shield-halved"></i> Transaction Reversal
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            Void Payment
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            Revert bill dues, balances & vendor advance
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowVoidModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-800/80 border border-slate-700 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleVoidSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 overflow-y-auto custom-table-scroll space-y-6 bg-slate-50">

                                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-[13px] sm:text-[13.5px] text-rose-900 leading-relaxed shadow-xs font-semibold flex gap-3 items-start">
                                    <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-500 text-lg shrink-0"></i>
                                    <div>
                                        Voiding this payment will revert bill dues, account balances, and advance wallets to their previous state. This action cannot be directly <span className="font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded uppercase">Undone</span>.
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-5 text-[14px] text-slate-700 flex flex-col gap-4 shadow-sm">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Payment Amount</span>
                                        <span className="text-rose-600 text-[18px] sm:text-[22px] font-black bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 tabular-nums shadow-xs">
                                            ৳ {Number(paymentToVoid.pay_amount).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    {Number(paymentToVoid.adjustment_amount) > 0 && (
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                            <span className="font-bold text-amber-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                                <i className="fa-solid fa-tag text-amber-500"></i> Discount / Adjust
                                            </span>
                                            <span className="text-amber-800 text-[16px] font-black bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 tabular-nums shadow-xs">
                                                ৳ {Number(paymentToVoid.adjustment_amount).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Payment Date</span>
                                        <span className="font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-[13px]">{paymentToVoid.date}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Reason for Voiding <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        value={voidForm.data.void_reason}
                                        onChange={(e) => voidForm.setData("void_reason", e.target.value)}
                                        placeholder="e.g. Wrong account selected, amount incorrect..."
                                        rows="3"
                                        className="w-full rounded-xl border border-slate-300 bg-white p-4 text-[14px] font-medium text-slate-900 outline-none transition-shadow focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 resize-none shadow-sm"
                                        required
                                    ></textarea>
                                    {voidForm.errors.void_reason && <p className="mt-1.5 block text-[12px] font-bold text-rose-500">{voidForm.errors.void_reason}</p>}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button type="button" onClick={() => setShowVoidModal(false)} className="rounded-xl border border-slate-300 bg-white px-5 sm:px-6 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={voidForm.processing} className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-6 py-2.5 text-[13.5px] font-bold text-white transition-all shadow-md shadow-rose-600/20 disabled:opacity-70 flex items-center gap-2 cursor-pointer">
                                    {voidForm.processing ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : <><i className="fa-solid fa-rotate-left"></i> Confirm Void</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
