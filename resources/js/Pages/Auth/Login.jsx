import { useState } from 'react';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

function Logo({ className = '' }) {
    return (
        <div className={`flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-3 ${className}`}>
            <img
                src="/images/logo.png"
                alt="Unibox Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
            />
            <i className="fa-solid fa-shield-halved text-indigo-500 text-2xl hidden"></i>
        </div>
    );
}

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        admin_key: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password', 'admin_key'),
        });
    };

    const inputClass =
        'block w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 shadow-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-indigo-500/10';

    return (
        <div className="relative min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 font-sans bg-[#0B0F17] text-slate-100 overflow-hidden selection:bg-indigo-600 selection:text-white">
            <Head title="Super Admin Portal - Unibox" />

            {/* Background Ambient Glows & Grid Pattern */}
            <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-violet-600/15 blur-[140px] pointer-events-none"></div>

            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                }}
            ></div>

            <div className="w-full"></div>

            {/* Centered Restricted Card */}
            <main className="relative z-10 w-full max-w-md my-auto">
                <div className="bg-slate-950/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-indigo-950/40 p-8 sm:p-10">

                    {/* Header with Security Badge */}
                    <div className="flex flex-col items-center text-center">
                        <Logo className="h-14 w-14 mb-4 shadow-indigo-500/10" />

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3">
                            <i className="fa-solid fa-lock text-[10px]"></i>
                            Restricted Access
                        </div>
                    </div>

                    {/* Status Message */}
                    {status && (
                        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-left">
                            <i className="fa-solid fa-circle-check mt-0.5 text-emerald-400"></i>
                            <p className="text-xs font-medium text-emerald-300">{status}</p>
                        </div>
                    )}

                    {/* Admin Credentials Form */}
                    <form className="mt-8 space-y-4" onSubmit={submit} noValidate={false}>
                        {/* Email Address */}
                        <div>
                            <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                Admin Email
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <i className="fa-regular fa-envelope text-slate-500 text-sm"></i>
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`${inputClass} ${errors.email ? '!border-red-500/80 !bg-red-950/10' : ''}`}
                                    placeholder="admin@unibox.com"
                                />
                            </div>
                            <InputError message={errors.email} className="mt-1.5 text-xs font-medium text-red-400" />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    Password
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        Forgot?
                                    </Link>
                                )}
                            </div>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <i className="fa-solid fa-lock text-slate-500 text-sm"></i>
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`${inputClass} pr-12 ${errors.password ? '!border-red-500/80 !bg-red-950/10' : ''}`}
                                    placeholder="••••••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    <i className={showPassword ? 'fa-regular fa-eye-slash text-sm' : 'fa-regular fa-eye text-sm'}></i>
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-1.5 text-xs font-medium text-red-400" />
                        </div>

                        {/* Remember Session Option */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-400">Remember this terminal</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.99] ${
                                processing ? 'opacity-75 cursor-wait' : ''
                            }`}
                        >
                            {processing ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-shield-halved text-xs"></i>
                                    Authenticate Admin
                                </>
                            )}
                        </button>
                    </form>

                    {/* Admin Warning Note */}
                    <p className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
                        Unauthorized access attempts are logged and monitored with IP tracing.
                    </p>
                </div>
            </main>

            {/* Bottom Footer */}
            <footer className="relative z-10 my-auto pt-6 text-center text-xs text-slate-600">
                <p>&copy; {new Date().getFullYear()} Unibox Core Security. All rights reserved.</p>
            </footer>
        </div>
    );
}
