import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, router, Link, usePage } from "@inertiajs/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";

const Taka = ({ className = "text-[14px]" }) => (
    <span style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }} className={`mr-0.5 opacity-80 ${className}`}>TK. </span>
);

export default function VendorPayments({ payments = { data: [], links: [] }, filters }) {
    const { auth } = usePage().props;
    const [searchTerm, setSearchTerm] = useState(filters?.search || "");
    const [perPage, setPerPage] = useState(filters?.per_page || 25);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const delay = setTimeout(() => {
            router.get(route("admin.vendor-payments"), { search: searchTerm, per_page: perPage }, { preserveState: true, replace: true });
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, perPage]);

    const handlePDF = () => {
        if (!payments.data.length) return Swal.fire("Empty!", "No data to export", "warning");
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Date', 'Vendor Name', 'Type', 'Amount Paid', 'Discount']],
            body: payments.data.map(p => [
                new Date(p.date).toLocaleDateString('en-GB'),
                p.vendor_name,
                p.type,
                Number(p.amount).toLocaleString('en-IN'),
                Number(p.discount).toLocaleString('en-IN')
            ]),
        });
        doc.save(`Vendor_Payments_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <AdminLayout>
            <Head title="Vendor Payments Report" />
            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 mt-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vendor Payments Report</h1>
                        <p className="text-[14px] text-gray-500 mt-1 font-medium">All cash outflows and discounts given to vendors</p>
                    </div>
                    <button onClick={handlePDF} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-100 transition-colors">
                        <i className="fa-solid fa-file-pdf mr-2"></i> Export PDF
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex gap-4 bg-gray-50/50">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search vendor..." className="flex-1 rounded-xl border border-gray-300 py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20" />
                        <select value={perPage} onChange={e => setPerPage(e.target.value)} className="rounded-xl border border-gray-300 py-2.5 px-4 text-sm bg-white font-medium">
                            <option value="10">10 Rows</option>
                            <option value="25">25 Rows</option>
                            <option value="50">50 Rows</option>
                            <option value="100">100 Rows</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase">Vendor Name</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase text-right">Amount Paid</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-gray-500 uppercase text-right">Discount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.data.map(p => (
                                    <tr key={`${p.type}-${p.id}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.vendor_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${p.type === 'Voucher' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{p.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right"><Taka/>{Number(p.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-orange-500 text-right"><Taka/>{Number(p.discount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {payments.links?.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
                            <p className="text-[13.5px] font-semibold text-gray-500">Showing {payments.from || 0} to {payments.to || 0} of {payments.total} entries</p>
                            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-sm">
                                {payments.links.map((link, i) => (
                                    link.url ? (
                                        <Link key={i} href={link.url} preserveScroll preserveState
                                            className={`px-3 py-1.5 text-[13px] font-extrabold rounded-lg transition-all ${
                                                link.active ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600/30" : 
                                                "bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 hover:border-gray-300"
                                            }`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ) : (
                                        <span key={i} className="px-3 py-1.5 text-[13px] font-extrabold rounded-lg text-gray-400 cursor-not-allowed opacity-50" dangerouslySetInnerHTML={{ __html: link.label }} />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
