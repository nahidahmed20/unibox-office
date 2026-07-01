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
            <Head title="Log in - Unibox" />

            <div className="unibox-header">
                <h1 className="unibox-logo">Unibox</h1>
                <h2 className="unibox-title">Welcome back</h2>
                <p className="unibox-subtitle">Please enter your details to sign in</p>
            </div>

            {status && (
                <div style={{ color: '#047857', background: '#d1fae5', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px' }}>
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div className="unibox-form-group">
                    <label htmlFor="email" className="unibox-label">Email address</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="unibox-input"
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="name@unibox.com"
                    />
                    <InputError message={errors.email} style={{ color: 'red', marginTop: '5px', fontSize: '13px' }} />
                </div>

                <div className="unibox-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label htmlFor="password" className="unibox-label" style={{ marginBottom: 0 }}>Password</label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none', fontWeight: '500' }}
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
                        className="unibox-input"
                        style={{ marginTop: '8px' }}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                    />
                    <InputError message={errors.password} style={{ color: 'red', marginTop: '5px', fontSize: '13px' }} />
                </div>

                <div className="unibox-form-group" style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        id="remember"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="remember" style={{ marginLeft: '8px', fontSize: '14px', color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}>
                        Remember me
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="unibox-btn"
                >
                    {processing ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
        </GuestLayout>
    );
}