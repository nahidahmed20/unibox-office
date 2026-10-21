import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 font-sans relative overflow-hidden">
            <Head title="Forgot Password - Unibox" />

            {/* Decorative background shapes */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/20 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-500/20 blur-3xl pointer-events-none"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center">
                    <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-900/50 p-2">
                        <img
                            src="/images/logo.png"
                            alt="Unibox Logo"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <i className="fa-solid fa-cube text-blue-600 text-4xl hidden"></i>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                    Password Recovery
                </h2>
                <p className="mt-2 text-center text-[15px] font-medium text-indigo-100 drop-shadow px-4">
                    Forgot your password? No problem. Just let us know your email address.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border border-white/50 rounded-3xl sm:px-10">
                    {status && (
                        <div className="mb-6 rounded-xl bg-emerald-50 p-4 border border-emerald-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-circle-check text-emerald-500 text-lg"></i>
                                <p className="text-sm font-semibold text-emerald-800">{status}</p>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={submit}>
                        <div>
                            <label htmlFor="email" className="block text-[13px] font-bold text-slate-700">
                                Email address
                            </label>
                            <div className="mt-1.5 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fa-regular fa-envelope text-slate-400"></i>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm outline-none"
                                    placeholder="admin@unibox.com"
                                />
                            </div>
                            <InputError message={errors.email} className="mt-2 text-[13px] text-red-500" />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/30 text-[15px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:-translate-y-0.5 ${processing ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {processing ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                        Sending Link...
                                    </>
                                ) : (
                                    <>
                                        Email Reset Link
                                        <i className="fa-regular fa-paper-plane"></i>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="text-center mt-6">
                            <Link href={route('login')} className="text-[14px] font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                <i className="fa-solid fa-arrow-left text-[12px]"></i>
                                Back to Login
                            </Link>
                        </div>
                    </form>
                </div>

                <div className="mt-8 text-center text-sm font-medium text-indigo-200 drop-shadow-sm relative z-10">
                    &copy; {new Date().getFullYear()} Unibox. All rights reserved.
                </div>
            </div>
        </div>
    );
}
