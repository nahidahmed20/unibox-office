import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
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
        <GuestLayout>
            <Head title="Admin Login" />

            {/* Header Section */}
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mb-5 border border-gray-200">
                    {/* Admin Briefcase Icon (Neutral) */}
                    <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Welcome Back
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                    Sign in to your admin dashboard
                </p>
            </div>

            {/* Status Message */}
            {status && (
                <div className="mb-6 bg-green-50 border border-green-200 p-3 rounded-md">
                    <p className="text-sm text-green-700 font-medium text-center">{status}</p>
                </div>
            )}

            {/* Form Section */}
            <form onSubmit={submit} className="space-y-5">
                
                {/* Email Field */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address
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
                        placeholder="admin@unibox.com"
                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm transition duration-150"
                    />
                    <InputError message={errors.email} className="mt-1.5 text-xs text-red-600" />
                </div>

                {/* Password Field */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 underline transition duration-150"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        required
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                        className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm transition duration-150"
                    />
                    <InputError message={errors.password} className="mt-1.5 text-xs text-red-600" />
                </div>

                {/* Remember Me */}
                <div className="flex items-center pt-1">
                    <input
                        id="remember"
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer transition duration-150"
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
                        Remember for 30 days
                    </label>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 shadow-sm transition duration-150 ${
                            processing ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                    >
                        {processing ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}