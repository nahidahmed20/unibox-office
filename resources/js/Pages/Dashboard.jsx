import React, { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Head, Link, usePage } from "@inertiajs/react";

// Premium Stat Card Component
const StatCard = ({ label, subLabel, value, icon, gradient, note, noteColor, href }) => {
    const Wrapper = href ? Link : "div";
    const wrapperProps = href ? { href } : {};

    return (
        <Wrapper
            {...wrapperProps}
            className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group block"
        >
            <div
                className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${gradient}`}
            ></div>

            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-gray-500">
                        {label}
                    </p>
                    {subLabel && (
                        <span className="text-[11px] font-semibold text-gray-400 -mt-0.5">
                            {subLabel}
                        </span>
                    )}
                    <h3 className="text-[25px] font-black text-gray-900 tracking-tight tabular-nums mt-1">
                        {value}
                    </h3>
                    {note && (
                        <p
                            className={`text-[11.5px] font-bold mt-1 ${noteColor || "text-gray-400"}`}
                        >
                            {note}
                        </p>
                    )}
                </div>
                <div
                    className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${gradient}`}
                >
                    <i className={`fa-solid ${icon} text-[20px]`}></i>
                </div>
            </div>
        </Wrapper>
    );
};

// Straight Taka Symbol Component
const Taka = ({ className = "text-[18px]" }) => (
    <span
        style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold" }}
        className={`mr-1 opacity-75 ${className}`}
    >
        ৳
    </span>
);

const money = (n) => (
    <div className="flex items-center">
        <Taka />
        {(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
    </div>
);

export default function Dashboard({
    stats = {},
    accountsList = [],
    todayStats = {},
    sixMonthTrend = [],
    topVendorDues = [],
    recentPendingInvoices = [],
    recentNotices = [],
    recentTasks = [],
    recentTransactions = [],
}) {
    const { auth } = usePage().props;
    const [duesTab, setDuesTab] = useState("client_dues"); // 'client_dues' | 'vendor_dues'

    const totalSpentThisMonth =
        (Number(stats.monthlyExpensesOnly) || 0) +
        (Number(stats.monthlySalaryPaid) || 0);

    const collectionRate =
        Number(stats.totalBilledRevenue) > 0
            ? Math.min(
                  100,
                  Math.round(
                      (Number(stats.totalCollectedRevenue) /
                          Number(stats.totalBilledRevenue)) *
                          100
                  )
              )
            : 0;

    const maxChartVal = Math.max(
        ...sixMonthTrend.map((m) => Math.max(Number(m.cash_in || 0), Number(m.cash_out || 0))),
        1
    );

    const accountTypeIcon = (type) => {
        if (type === "cash") return { icon: "fa-money-bill-wave", color: "bg-emerald-500/15 text-emerald-600 border-emerald-200" };
        if (type === "mobile_banking") return { icon: "fa-mobile-screen-button", color: "bg-pink-500/15 text-pink-600 border-pink-200" };
        return { icon: "fa-building-columns", color: "bg-indigo-500/15 text-indigo-600 border-indigo-200" };
    };

    return (
        <AdminLayout>
            <Head title="Dashboard Overview" />

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `,
                }}
            />

            <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-7 pb-12 mt-1 px-1 sm:px-2">
                {/* 🟢 EXECUTIVE HERO COMMAND BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070b15] via-[#0f172a] to-[#1e1b4b] p-6 sm:p-8 text-white shadow-xl border border-white/10">
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#C89B3C]/15 blur-3xl pointer-events-none"></div>
                    <div className="absolute left-1/3 -bottom-20 h-60 w-60 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E7C572] border border-white/10 mb-3">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Executive Command Center
                            </div>
                            <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight text-white">
                                স্বাগতম, {auth?.user?.name || "Admin"}!
                            </h1>
                            <p className="text-[13.5px] sm:text-[14.5px] text-slate-300 mt-1 font-medium">
                                আজকের লাইভ ক্যাশফ্লো, ব্যাংক ব্যালেন্স, বকেয়া এবং প্রজেক্টের সার্বিক চিত্র এক নজরে দেখুন।
                            </p>

                            {/* Quick Action Pills */}
                            <div className="flex flex-wrap items-center gap-2.5 mt-5">
                                <Link
                                    href={route("admin.invoices.create")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#C89B3C] hover:bg-[#b88b2e] text-slate-950 px-4 py-2 text-[12.5px] font-black transition-all shadow-md"
                                >
                                    <i className="fa-solid fa-plus text-[11px]"></i> নতুন ইনভয়েস
                                </Link>
                                <Link
                                    href={route("admin.reports.daybook")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-2 text-[12.5px] font-bold transition-all"
                                >
                                    <i className="fa-solid fa-book-open text-[#E7C572]"></i> আজকের ডে-বুক
                                </Link>
                                <Link
                                    href={route("admin.reports.project-profit")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-2 text-[12.5px] font-bold transition-all"
                                >
                                    <i className="fa-solid fa-sack-dollar text-emerald-400"></i> প্রজেক্ট লাভ-ক্ষতি
                                </Link>
                                <Link
                                    href={route("admin.reports.client-ledger")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-2 text-[12.5px] font-bold transition-all"
                                >
                                    <i className="fa-solid fa-book-journal-whills text-indigo-300"></i> ক্লায়েন্ট লেজার
                                </Link>
                                <Link
                                    href={route("admin.reports.vendor-ledger")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-2 text-[12.5px] font-bold transition-all"
                                >
                                    <i className="fa-solid fa-book-bookmark text-amber-300"></i> ভেন্ডর লেজার
                                </Link>
                            </div>
                        </div>

                        {/* Today's Live Pulse Box */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl p-4 shrink-0">
                            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                    <i className="fa-solid fa-arrow-down-long"></i> আজকের জমা (Today In)
                                </div>
                                <div className="text-[19px] font-black text-emerald-400 tabular-nums mt-1">
                                    ৳{(Number(todayStats.cash_in) || 0).toLocaleString("en-IN")}
                                </div>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/20">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                                    <i className="fa-solid fa-arrow-up-long"></i> আজকের খরচ (Today Out)
                                </div>
                                <div className="text-[19px] font-black text-rose-400 tabular-nums mt-1">
                                    ৳{(Number(todayStats.cash_out) || 0).toLocaleString("en-IN")}
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex flex-col justify-between">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-200 flex items-center justify-between">
                                    <span>আজকের লেনদেন</span>
                                    <span className="bg-indigo-500/30 px-2 py-0.5 rounded text-[10px]">{todayStats.trx_count || 0}টি</span>
                                </div>
                                <div className="text-[12px] font-bold text-slate-300 mt-1.5 flex items-center gap-1.5">
                                    <i className="fa-regular fa-calendar text-[#E7C572]"></i>
                                    {new Date().toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 MASTER FINANCIAL POSITION BLOCK */}
                <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden relative">
                    <div className="p-6 md:p-8 flex flex-col xl:flex-row xl:items-stretch justify-between gap-8">
                        {/* Net Worth & Collection Rate */}
                        <div className="xl:w-5/12 border-b xl:border-b-0 xl:border-r border-gray-100 pb-6 xl:pb-0 xl:pr-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[12.5px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                        <i className="fa-solid fa-crown text-amber-500"></i>
                                        Overall Net Worth (নিজস্ব নিট সম্পদ)
                                    </h3>
                                    <Link
                                        href={route("admin.reports.position")}
                                        className="text-[11.5px] font-bold text-indigo-600 hover:underline"
                                    >
                                        বিস্তারিত পজিশন &rarr;
                                    </Link>
                                </div>
                                <h1
                                    className={`text-[38px] md:text-[46px] font-black tracking-tight tabular-nums leading-none ${stats.overallNetWorth >= 0 ? "text-indigo-900" : "text-red-600"}`}
                                >
                                    {stats.overallNetWorth > 0 ? "+" : ""}৳{" "}
                                    {(Number(stats.overallNetWorth) || 0).toLocaleString("en-IN")}
                                </h1>

                                {/* Formula Pills */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-3.5 text-[11px] font-bold">
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        ক্যাশ ও অ্যাসেট: ৳{(Number(stats.totalBalance) + Number(stats.totalAssets)).toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-gray-400">+</span>
                                    <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                                        পাওনা: ৳{(Number(stats.totalReceivables) || 0).toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-gray-400">-</span>
                                    <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                        দেনা: ৳{(Number(stats.totalPayables) || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            </div>

                            {/* Revenue & Collection Progress */}
                            <div className="mt-6 pt-5 border-t border-gray-100">
                                <div className="flex items-center justify-between text-[12px] font-bold mb-2">
                                    <span className="text-slate-600">ইনভয়েস বিল আদায়ের হার (Collection Rate)</span>
                                    <span className="text-emerald-700 font-black">{collectionRate}% আদায় সম্পন্ন</span>
                                </div>
                                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                                        style={{ width: `${collectionRate}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
                                        <span className="block text-[10.5px] uppercase font-bold text-emerald-700">
                                            আদায়কৃত আয় (Collected)
                                        </span>
                                        <span className="block text-[18px] font-black text-emerald-900 mt-0.5 tabular-nums">
                                            ৳{(Number(stats.totalCollectedRevenue) || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5">
                                        <span className="block text-[10.5px] uppercase font-bold text-indigo-700">
                                            মোট ইনভয়েস বিল (Total Billed)
                                        </span>
                                        <span className="block text-[18px] font-black text-indigo-900 mt-0.5 tabular-nums">
                                            ৳{(Number(stats.totalBilledRevenue) || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Receivables & Payables Breakdown */}
                        <div className="xl:w-7/12 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Total Receivables */}
                            <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                                <i className="fa-solid fa-hand-holding-dollar absolute -right-4 -bottom-4 text-[75px] text-emerald-500/10 pointer-events-none"></i>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-700">
                                            Total Receivables (মার্কেটে পাওনা)
                                        </h4>
                                        <span className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm">
                                            <i className="fa-solid fa-arrow-trend-up"></i>
                                        </span>
                                    </div>
                                    <h2 className="text-[30px] font-black text-emerald-900 tracking-tight tabular-nums mt-1">
                                        ৳{(Number(stats.totalReceivables) || 0).toLocaleString("en-IN")}
                                    </h2>
                                </div>

                                <div className="space-y-2 mt-5 relative z-10">
                                    <Link
                                        href={route("admin.client-dues")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-emerald-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-user-tie text-emerald-600 mr-2"></i>ক্লায়েন্ট বকেয়া (Client Dues)</span>
                                        <span className="font-black text-emerald-800 tabular-nums">৳{Number(stats.totalClientDue || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                    <Link
                                        href={route("admin.vendors.index")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-emerald-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-wallet text-teal-600 mr-2"></i>ভেন্ডর অ্যাডভান্স (Vendor Wallet)</span>
                                        <span className="font-black text-teal-800 tabular-nums">৳{Number(stats.vendorAdvance || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                    <Link
                                        href={route("admin.advances.index")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-emerald-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-id-badge text-blue-600 mr-2"></i>স্টাফ অ্যাডভান্স (Staff Advance)</span>
                                        <span className="font-black text-blue-800 tabular-nums">৳{Number(stats.employeeAdvance || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Total Payables */}
                            <div className="bg-gradient-to-br from-rose-50/90 to-orange-50/40 border border-rose-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                                <i className="fa-solid fa-Scale-unbalanced-flip absolute -right-4 -bottom-4 text-[75px] text-rose-500/10 pointer-events-none"></i>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-rose-700">
                                            Total Payables (মার্কেটে দেনা)
                                        </h4>
                                        <span className="h-8 w-8 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xs shadow-sm">
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </span>
                                    </div>
                                    <h2 className="text-[30px] font-black text-rose-900 tracking-tight tabular-nums mt-1">
                                        ৳{(Number(stats.totalPayables) || 0).toLocaleString("en-IN")}
                                    </h2>
                                </div>

                                <div className="space-y-2 mt-5 relative z-10">
                                    <Link
                                        href={route("admin.vendor-dues")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-rose-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-truck-field text-rose-600 mr-2"></i>ভেন্ডর বকেয়া (Vendor Dues)</span>
                                        <span className="font-black text-rose-800 tabular-nums">৳{Number(stats.vendorDue || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                    <Link
                                        href={route("admin.salaries.index")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-rose-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-money-check-dollar text-amber-600 mr-2"></i>বকেয়া বেতন (Unpaid Salary)</span>
                                        <span className="font-black text-amber-800 tabular-nums">৳{Number(stats.unpaidSalaries || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                    <Link
                                        href={route("admin.client-advances.index")}
                                        className="flex items-center justify-between bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-rose-100 text-[12.5px] font-bold text-slate-700 transition-all shadow-2xs"
                                    >
                                        <span><i className="fa-solid fa-sack-dollar text-purple-600 mr-2"></i>ক্লায়েন্ট অ্যাডভান্স জমা</span>
                                        <span className="font-black text-purple-800 tabular-nums">৳{Number(stats.clientAdvance || 0).toLocaleString("en-IN")}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 LIVE BANK & CASH ACCOUNTS + 6-MONTH CASHFLOW CHART */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left: Live Bank & Cash Balances */}
                    <div className="xl:col-span-5 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2">
                                        <i className="fa-solid fa-building-columns text-indigo-600"></i>
                                        ব্যাংক ও ক্যাশ ব্যালেন্স (Live Accounts)
                                    </h3>
                                    <p className="text-[12px] text-gray-500 mt-0.5">সকল সক্রিয় ব্যাংক, ক্যাশ ও মোবাইল ব্যাংকিং অ্যাকাউন্ট</p>
                                </div>
                                <Link
                                    href={route("admin.accounts.index")}
                                    className="text-[12px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                                >
                                    Manage &rarr;
                                </Link>
                            </div>

                            <div className="space-y-2.5 max-h-[260px] overflow-y-auto custom-scroll pr-1">
                                {accountsList.length > 0 ? (
                                    accountsList.map((acc) => {
                                        const style = accountTypeIcon(acc.type);
                                        const share =
                                            Number(stats.totalBalance) > 0
                                                ? Math.max(
                                                      0,
                                                      Math.round(
                                                          (Number(acc.current_balance) /
                                                              Number(stats.totalBalance)) *
                                                              100
                                                      )
                                                  )
                                                : 0;
                                        return (
                                            <Link
                                                key={acc.id}
                                                href={route("admin.account.transactions", { account_id: acc.id })}
                                                className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-slate-50/70 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${style.color}`}>
                                                        <i className={`fa-solid ${style.icon} text-[15px]`}></i>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-[13.5px] group-hover:text-indigo-700 transition-colors">
                                                            {acc.name}
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-gray-400">
                                                            {acc.account_number ? `A/C: ${acc.account_number}` : acc.type.toUpperCase()} • {share}%
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-black text-[15px] tabular-nums ${Number(acc.current_balance) < 0 ? "text-rose-600" : "text-slate-900"}`}>
                                                        ৳{Number(acc.current_balance || 0).toLocaleString("en-IN")}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        স্টেটমেন্ট দেখুন &rarr;
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center text-gray-400 text-sm font-bold">
                                        কোনো সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি।
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-[13px] font-black text-slate-800">
                            <span>সর্বমোট তারল্য (Total Liquid Cash):</span>
                            <span className="text-indigo-700 text-[16px] tabular-nums">
                                ৳{Number(stats.totalBalance || 0).toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    {/* Right: 6-Month Cashflow Visual Chart */}
                    <div className="xl:col-span-7 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-chart-column text-emerald-600"></i>
                                    বিগত ৬ মাসের ক্যাশফ্লো চিত্র (6-Month Cashflow Trend)
                                </h3>
                                <p className="text-[12px] text-gray-500 mt-0.5">প্রতি মাসের মোট নগদ জমা (Cash In) বনাম নগদ খরচ (Cash Out)</p>
                            </div>
                            <div className="flex items-center gap-4 text-[12px] font-bold">
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                    <span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block"></span> জমা (Cash In)
                                </span>
                                <span className="flex items-center gap-1.5 text-rose-700">
                                    <span className="h-3 w-3 rounded-sm bg-rose-500 inline-block"></span> খরচ (Cash Out)
                                </span>
                            </div>
                        </div>

                        {/* Bar Chart Container */}
                        <div className="grid grid-cols-6 gap-3 sm:gap-5 items-end h-[210px] pt-6 px-2 border-b border-gray-100">
                            {sixMonthTrend.map((m, idx) => {
                                const inHeight = Math.max(6, Math.round((Number(m.cash_in || 0) / maxChartVal) * 155));
                                const outHeight = Math.max(6, Math.round((Number(m.cash_out || 0) / maxChartVal) * 155));
                                return (
                                    <div key={idx} className="flex flex-col items-center group">
                                        <div className="flex items-end justify-center gap-1.5 sm:gap-2 w-full h-[165px]">
                                            {/* Cash In Bar */}
                                            <div className="relative flex flex-col items-center">
                                                <div
                                                    style={{ height: `${inHeight}px` }}
                                                    className="w-4 sm:w-6 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 group-hover:brightness-110 shadow-xs"
                                                    title={`${m.label} জমা: ৳${Number(m.cash_in).toLocaleString("en-IN")}`}
                                                />
                                            </div>
                                            {/* Cash Out Bar */}
                                            <div className="relative flex flex-col items-center">
                                                <div
                                                    style={{ height: `${outHeight}px` }}
                                                    className="w-4 sm:w-6 rounded-t-lg bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-500 group-hover:brightness-110 shadow-xs"
                                                    title={`${m.label} খরচ: ৳${Number(m.cash_out).toLocaleString("en-IN")}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-[11.5px] font-extrabold text-slate-700 mt-2.5">{m.short_label}</div>
                                        <div className="text-[10px] font-bold text-slate-400 hidden sm:block">
                                            +৳{Math.round(Number(m.cash_in || 0) / 1000)}k / -৳{Math.round(Number(m.cash_out || 0) / 1000)}k
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-slate-600">
                            <span>
                                চলতি মাসে জমা: <strong className="text-emerald-700">৳{Number(stats.monthlyCashIn || 0).toLocaleString("en-IN")}</strong> | খরচ: <strong className="text-rose-700">৳{Number(stats.monthlyCashOut || 0).toLocaleString("en-IN")}</strong>
                            </span>
                            <Link href={route("admin.reports.monthly-balance")} className="text-indigo-600 hover:underline font-extrabold">
                                মাসিক ব্যালেন্স রিপোর্ট &rarr;
                            </Link>
                        </div>
                    </div>
                </div>

                {/* --- Row 1 & 2: 8 Key Financials --- */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Available Liquid Cash"
                        subLabel="হাতে ও ব্যাংকে মোট জমা"
                        value={money(stats.totalBalance)}
                        icon="fa-wallet"
                        gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                        note={`Cash: ৳ ${(Number(stats.cashBalance) || 0).toLocaleString()} | Bank: ৳ ${(Number(stats.bankBalance) || 0).toLocaleString()}`}
                        noteColor="text-indigo-600"
                        href={route("admin.accounts.index")}
                    />

                    <StatCard
                        label="Cash In (This Month)"
                        subLabel="চলতি মাসে মোট নগদ আদায়"
                        value={money(stats.monthlyCashIn)}
                        icon="fa-arrow-down-to-bracket"
                        gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                        note="ইনভয়েস আদায় + ক্লায়েন্ট অ্যাডভান্স"
                        noteColor="text-emerald-600"
                        href={route("invoice-payments.index")}
                    />
                    <StatCard
                        label="Cash Out (This Month)"
                        subLabel="চলতি মাসে সর্বমোট নগদ খরচ"
                        value={money(stats.monthlyCashOut)}
                        icon="fa-arrow-right-from-bracket"
                        gradient="bg-gradient-to-br from-rose-400 to-red-500"
                        note="প্রজেক্ট বিল + অফিস খরচ + বেতন"
                        noteColor="text-rose-600"
                        href={route("admin.transactions.index")}
                    />

                    <StatCard
                        label="Total Investment"
                        subLabel="চলমান বিনিয়োগ মূলধন"
                        value={money(stats.totalInvestment)}
                        icon="fa-chart-line"
                        gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
                        note="কোম্পানির মোট বিনিয়োগ ব্যালেন্স"
                        noteColor="text-purple-600"
                        href={route("admin.investments.index")}
                    />
                    <StatCard
                        label="Total Asset Value"
                        subLabel="অফিসের স্থায়ী সম্পদের মূল্য"
                        value={money(stats.totalAssets)}
                        icon="fa-couch"
                        gradient="bg-gradient-to-br from-cyan-400 to-emerald-500"
                        note="সকল নিবন্ধিত অফিস অ্যাসেট"
                        noteColor="text-cyan-700"
                        href={route("admin.assets.index")}
                    />
                    <StatCard
                        label="Employee Advance"
                        subLabel="স্টাফদের কাছে থাকা অ্যাডভান্স"
                        value={money(stats.employeeAdvance)}
                        icon="fa-user-tie"
                        gradient="bg-gradient-to-br from-blue-400 to-cyan-500"
                        note="সমন্বয়হীন স্টাফ অ্যাডভান্স"
                        noteColor="text-blue-600"
                        href={route("admin.advances.index")}
                    />
                    <StatCard
                        label="Office Spent (This Month)"
                        subLabel="অফিস খরচ ও বেতন (চলতি মাস)"
                        value={money(totalSpentThisMonth)}
                        icon="fa-calculator"
                        gradient="bg-gradient-to-br from-fuchsia-500 to-pink-600"
                        note={`Exp: ৳ ${(Number(stats.monthlyExpensesOnly) || 0).toLocaleString()} | Salary: ৳ ${(Number(stats.monthlySalaryPaid) || 0).toLocaleString()}`}
                        noteColor="text-fuchsia-600"
                        href={route("admin.expenses.index")}
                    />
                    <StatCard
                        label="Project Exp. (This Month)"
                        subLabel="চলতি মাসে প্রজেক্টে নগদ পরিশোধ"
                        value={money(stats.monthlyProjectExpense)}
                        icon="fa-diagram-project"
                        gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                        note="ভেন্ডর ও প্রজেক্ট বিলে পরিশোধিত"
                        noteColor="text-amber-600"
                        href={route("admin.project-expenses.index")}
                    />
                </div>

                {/* --- Row 3: Operational Stats --- */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <Link
                        href={route("admin.projects.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <i className="fa-solid fa-layer-group text-blue-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-2xl font-black text-gray-800">
                            {stats.activeProjects}
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">
                            চলমান প্রজেক্ট
                        </p>
                    </Link>

                    <Link
                        href={route("admin.salaries.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-rose-200 transition-all group"
                    >
                        <i className="fa-solid fa-money-check-dollar text-rose-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-[18px] font-black text-gray-800 tabular-nums">
                            ৳{(Number(stats.unpaidSalaries) || 0).toLocaleString("en-IN")}
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-rose-500 mt-1">
                            বকেয়া বেতন
                        </p>
                    </Link>

                    <Link
                        href={route("admin.invoices.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-200 transition-all group"
                    >
                        <i className="fa-solid fa-file-invoice text-emerald-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-[18px] font-black text-gray-800 tabular-nums">
                            ৳{(Number(stats.monthlyRevenue) || 0).toLocaleString("en-IN")}
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">
                            এই মাসের বিল
                        </p>
                    </Link>

                    <Link
                        href={route("admin.tasks.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-amber-200 transition-all group"
                    >
                        <div className="relative">
                            <i className="fa-solid fa-list-check text-amber-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                            {stats.pendingTasks > 0 && (
                                <span className="absolute -top-1 -right-2 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping"></span>
                            )}
                        </div>
                        <h4 className="text-2xl font-black text-gray-800">
                            {stats.pendingTasks}
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">
                            অসম্পূর্ণ টাস্ক
                        </p>
                    </Link>

                    <Link
                        href={route("admin.attendances.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-emerald-200 transition-all group"
                    >
                        <i className="fa-solid fa-user-check text-emerald-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                        <h4 className="text-2xl font-black text-gray-800">
                            {stats.presentToday}{" "}
                            <span className="text-sm text-gray-400">
                                / {stats.totalEmployees}
                            </span>
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">
                            আজকের উপস্থিতি
                        </p>
                    </Link>

                    <Link
                        href={route("admin.leaves.index")}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-purple-200 transition-all group"
                    >
                        <div className="relative">
                            <i className="fa-solid fa-calendar-minus text-purple-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                            {(stats.pendingLeaves > 0 ||
                                stats.pendingRequisitions > 0) && (
                                <span className="absolute -top-1 -right-2 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </div>
                        <h4 className="text-2xl font-black text-gray-800">
                            {stats.pendingLeaves + stats.pendingRequisitions}
                        </h4>
                        <p className="text-[11px] font-bold uppercase text-gray-500 mt-1">
                            পেন্ডিং রিকোয়েস্ট
                        </p>
                    </Link>
                </div>

                {/* --- Row 4: Tabbed Dues Watchlist (Client & Vendor) + Recent Transactions --- */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Left: Pending Client Invoices & Top Vendor Dues */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50/70 to-white">
                            <div className="inline-flex items-center rounded-xl bg-slate-200/70 p-1 border border-slate-300/80">
                                <button
                                    type="button"
                                    onClick={() => setDuesTab("client_dues")}
                                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-black transition-all ${
                                        duesTab === "client_dues"
                                            ? "bg-white text-emerald-700 shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <i className="fa-solid fa-file-invoice-dollar text-[11px]"></i>
                                    <span>ক্লায়েন্ট বকেয়া ({recentPendingInvoices.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDuesTab("vendor_dues")}
                                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-black transition-all ${
                                        duesTab === "vendor_dues"
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <i className="fa-solid fa-truck-field text-[11px]"></i>
                                    <span>ভেন্ডর বকেয়া ({topVendorDues.length})</span>
                                </button>
                            </div>

                            <Link
                                href={duesTab === "client_dues" ? route("admin.client-dues") : route("admin.vendor-dues")}
                                className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                সব দেখুন &rarr;
                            </Link>
                        </div>

                        <div className="overflow-x-auto custom-scroll">
                            {duesTab === "client_dues" ? (
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-white border-b border-gray-50 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5">Client & Invoice</th>
                                            <th className="px-6 py-3.5">Project / Work</th>
                                            <th className="px-6 py-3.5 text-right">Due Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13.5px] text-gray-700 divide-y divide-gray-50/80">
                                        {recentPendingInvoices.length > 0 ? (
                                            recentPendingInvoices.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-bold text-gray-900 text-[14px]">
                                                            {inv.client?.name}
                                                        </div>
                                                        <div className="text-[11px] text-indigo-600 font-bold mt-0.5 bg-indigo-50 px-2 py-0.5 rounded w-fit">
                                                            #{inv.invoice_number}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2 max-w-[220px] truncate" title={inv.work_details}>
                                                            <i className="fa-solid fa-briefcase text-gray-400 text-[11px]"></i>
                                                            <span className="font-medium text-gray-600">{inv.work_details}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <div className="font-black text-rose-600 tabular-nums text-[15px] flex items-center justify-end gap-1">
                                                            <Taka className="text-[14px]" />
                                                            {Number(inv.due_amount).toLocaleString("en-IN")}
                                                        </div>
                                                        <Link
                                                            href={route("invoice-payments.index", { search: inv.invoice_number })}
                                                            className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md transition-colors shadow-2xs"
                                                        >
                                                            Collect Payment
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                    <p className="font-bold text-[14px] text-gray-500">সকল ইনভয়েস পরিশোধিত!</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-white border-b border-gray-50 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5">Vendor Name</th>
                                            <th className="px-6 py-3.5">Wallet Advance</th>
                                            <th className="px-6 py-3.5 text-right">Payable Due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13.5px] text-gray-700 divide-y divide-gray-50/80">
                                        {topVendorDues.length > 0 ? (
                                            topVendorDues.map((v) => (
                                                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-bold text-gray-900 text-[14px]">{v.name}</div>
                                                        <div className="text-[11.5px] text-gray-400">{v.company_name || v.phone || "Vendor"}</div>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        {Number(v.wallet_balance) > 0 ? (
                                                            <span className="text-[12px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                                                                অ্যাডভান্স: ৳{Number(v.wallet_balance).toLocaleString("en-IN")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <div className="font-black text-rose-600 tabular-nums text-[15px]">
                                                            ৳{Number(v.total_due).toLocaleString("en-IN")}
                                                        </div>
                                                        <Link
                                                            href={route("admin.vendors.show", v.id)}
                                                            className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md transition-colors"
                                                        >
                                                            খতিয়ান দেখুন &rarr;
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                    <p className="font-bold text-[14px] text-gray-500">কোনো ভেন্ডর বকেয়া নেই!</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Right: Recent Transactions Table */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4 bg-gradient-to-r from-gray-50/70 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                                    <i className="fa-solid fa-money-bill-transfer"></i>
                                </div>
                                সাম্প্রতিক লেনদেন (Recent Transactions)
                            </h3>
                            <Link
                                href={route("admin.transactions.index")}
                                className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                সকল লেনদেন &rarr;
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-white border-b border-gray-50 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Account & Details</th>
                                        <th className="px-6 py-3.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13.5px] text-gray-700 divide-y divide-gray-50/80">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3.5 font-bold text-gray-500 text-[12.5px] bg-gray-50/30">
                                                    {new Date(trx.transaction_date).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="font-bold text-gray-900 flex items-center gap-2 text-[14px]">
                                                        <i className="fa-solid fa-building-columns text-[11px] text-indigo-400"></i>
                                                        {trx.account?.name || "-"}
                                                    </div>
                                                    <div className="text-[12px] text-gray-500 mt-0.5 max-w-[260px] truncate" title={trx.description}>
                                                        {trx.description}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <div
                                                        className={`font-black tabular-nums text-[15px] flex items-center justify-end gap-1 ${
                                                            trx.type === "credit" ? "text-emerald-600" : "text-rose-600"
                                                        }`}
                                                    >
                                                        {trx.type === "credit" ? "+" : "-"} <Taka className="text-[14px]" />
                                                        {Number(trx.amount).toLocaleString("en-IN")}
                                                    </div>
                                                    <span
                                                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                            trx.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        }`}
                                                    >
                                                        {trx.type === "credit" ? "Cash In" : "Cash Out"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                                <p className="font-bold text-[14px] text-gray-500">কোনো সাম্প্রতিক লেনদেন নেই।</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- Row 5: Tasks & Notices --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Tasks */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                                    <i className="fa-solid fa-list-check"></i>
                                </div>
                                চলমান টাস্কসমূহ (Active Tasks)
                            </h3>
                            <Link
                                href={route("admin.tasks.index")}
                                className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                View Board &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50/80">
                            {recentTasks.length > 0 ? (
                                recentTasks.map((task) => (
                                    <li key={task.id} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">{task.title}</p>
                                            <div className="mt-1.5 flex gap-2">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                                                        task.priority === "high" || task.priority === "urgent"
                                                            ? "bg-red-50 text-red-600 border-red-100"
                                                            : "bg-blue-50 text-blue-600 border-blue-100"
                                                    }`}
                                                >
                                                    {task.priority} Priority
                                                </span>
                                            </div>
                                        </div>
                                        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-[10.5px] font-bold text-gray-600 border border-gray-200 uppercase tracking-wider shadow-sm">
                                            {task.status.replace("_", " ")}
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="p-10 text-center text-gray-500 font-bold">কোনো চলমান টাস্ক নেই।</li>
                            )}
                        </ul>
                    </div>

                    {/* Notice Board */}
                    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
                            <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
                                    <i className="fa-solid fa-bullhorn"></i>
                                </div>
                                নোটিশ বোর্ড (Notice Board)
                            </h3>
                            <Link
                                href={route("admin.notices.index")}
                                className="text-[12.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                All Notices &rarr;
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-50/80">
                            {recentNotices.length > 0 ? (
                                recentNotices.map((notice) => (
                                    <li key={notice.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[14px] font-bold text-gray-900">{notice.title}</span>
                                            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                                {new Date(notice.created_at).toLocaleDateString("en-GB")}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{notice.content}</p>
                                    </li>
                                ))
                            ) : (
                                <li className="p-10 text-center text-gray-500 font-bold">কোনো সক্রিয় নোটিশ নেই।</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
