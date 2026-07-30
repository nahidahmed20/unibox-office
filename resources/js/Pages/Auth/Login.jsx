import { useState } from 'react';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="flex min-h-screen font-['Inter',sans-serif] bg-white">
            <Head title="Log in">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            {/* Left Side: Login Form */}
            <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] 2xl:w-[640px] lg:px-20 xl:px-24 lg:shadow-[2px_0_24px_rgba(0,0,0,0.04)] z-10 bg-white">
                <div className="mx-auto w-full max-w-[400px]">
                    {/* Brand mark */}
                    <div className="flex items-center gap-2.5 mb-10">
                        <svg width="36" height="36" viewBox="0 0 40 40" className="shrink-0 shadow-sm rounded-lg">
                            <rect x="3" y="3" width="24" height="24" rx="7" fill="#111111" />
                            <rect x="13" y="13" width="24" height="24" rx="7" fill="#00A878" />
                        </svg>
                        <span className="text-[22px] font-bold text-gray-900 tracking-tight">Unibox</span>
                    </div>

                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Welcome back
                    </h1>
                    <p className="text-[14px] text-gray-500 mt-2 mb-8">
                        Enter your details to securely access your workspace.
                    </p>

                    {status && (
                        <div className="mb-6 flex items-start gap-3 bg-[#EBF9F4] border border-[#00A878]/20 rounded-xl p-4">
                            <svg className="h-5 w-5 shrink-0 text-[#00875A] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[13.5px] text-[#00875A] font-medium leading-relaxed">{status}</p>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-[13.5px] font-medium text-gray-700 mb-1.5">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                autoFocus
                                required
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="name@company.com"
                                className="block w-full rounded-xl border-gray-200 px-4 py-3 text-[14.5px] text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white border focus:border-[#00A878] focus:ring-4 focus:ring-[#00A878]/10 transition-all duration-200 outline-none"
                            />
                            <InputError message={errors.email} className="mt-2 text-[13px] text-red-500" />
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-[13.5px] font-medium text-gray-700">
                                    Password
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-[13px] font-medium text-[#00A878] hover:text-[#00875A] transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    required
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border-gray-200 px-4 py-3 pr-11 text-[14.5px] text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white border focus:border-[#00A878] focus:ring-4 focus:ring-[#00A878]/10 transition-all duration-200 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-1 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none rounded-lg"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-2 text-[13px] text-red-500" />
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center pt-1 pb-2">
                            <input
                                id="remember"
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#00A878] focus:ring-[#00A878] cursor-pointer transition-colors"
                            />
                            <label htmlFor="remember" className="ml-2.5 text-[13.5px] text-gray-600 cursor-pointer select-none">
                                Keep me logged in
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full flex justify-center items-center gap-2.5 rounded-xl bg-[#111111] py-3 px-4 text-[14.5px] font-semibold text-white hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10 focus:outline-none focus:ring-4 focus:ring-gray-900/10 transition-all duration-200 ${
                                processing ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                'Sign in to account'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <p className="text-center text-[13px] text-gray-500">
                            Don't have an account?{' '}
                            <a href="#" className="font-semibold text-[#00A878] hover:text-[#00875A] transition-colors">
                                Contact your admin
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Visual/Branding (Hidden on mobile, visible on lg screens) */}
            <div className="relative hidden w-0 flex-1 lg:block bg-slate-900 overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[500px] h-[500px] bg-[#00A878] rounded-full blur-[120px] opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[140px] opacity-20"></div>

                <div className="absolute inset-0 flex flex-col justify-between p-16 xl:p-24 z-10">
                    <div>
                        {/* Optional Top Badge or Text */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                            <span className="flex h-2 w-2 rounded-full bg-[#00A878]"></span>
                            <span className="text-xs font-medium text-white tracking-wide">Unibox OS 2.0 is live</span>
                        </div>
                    </div>

                    <div className="max-w-xl">
                        <h2 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-[1.15] mb-6">
                            Streamline your workflow with intelligent tools.
                        </h2>
                        <p className="text-lg text-slate-300 font-medium leading-relaxed">
                            "Unibox has completely transformed how our team collaborates. The intuitive interface and powerful features are unmatched."
                        </p>
                        <div className="mt-8 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00A878] to-blue-600 p-0.5">
                                <div className="h-full w-full rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-sm"></div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Sarah Jenkins</p>
                                <p className="text-xs text-slate-400">Operations Director, TechCorp</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}