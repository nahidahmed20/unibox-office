import { useState } from 'react';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

/* All styling is plain CSS scoped with the "ub-" prefix, so it works
   without recompiling Tailwind. Font Awesome icons are still used. */
const css = `
.ub-page, .ub-page * { box-sizing: border-box; }

.ub-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    overflow: hidden;
    background: #0a0b0e;
    color: #f5f5f4;
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
}

.ub-glow { position: absolute; left: 50%; border-radius: 50%; pointer-events: none; transform: translateX(-50%); }
.ub-glow-top { top: -200px; width: 820px; height: 520px; background: rgba(217,194,154,.08); filter: blur(130px); }
.ub-glow-bottom { bottom: -220px; width: 760px; height: 420px; background: rgba(12,74,110,.28); filter: blur(140px); }

.ub-main { position: relative; z-index: 1; width: 100%; max-width: 420px; }

.ub-border {
    padding: 1px;
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.05) 55%, rgba(217,194,154,.28));
    box-shadow: 0 40px 80px -30px rgba(0,0,0,.9);
}

.ub-card {
    position: relative;
    border-radius: 27px;
    background: #0e0f13;
    padding: 48px 40px 36px;
}

.ub-head { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }

.ub-rings {
    position: absolute;
    left: 50%; top: 36px;
    width: 300px; height: 300px;
    transform: translate(-50%, -50%);
    pointer-events: none;
}
.ub-ring { animation: ub-draw 1.6s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes ub-draw { to { stroke-dashoffset: 0; } }

.ub-logo {
    position: relative;
    width: 72px; height: 72px;
    padding: 16px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(180deg, #1c1e24, #111217);
    box-shadow: 0 0 0 1px rgba(217,194,154,.35), 0 10px 30px -8px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08);
}
.ub-logo img { width: 100%; height: 100%; object-fit: contain; }
.ub-logo i { color: #d9c29a; font-size: 24px; display: none; }

.ub-title {
    margin: 26px 0 0;
    font-family: 'Instrument Serif', Georgia, serif;
    font-weight: 400;
    font-size: 42px;
    line-height: 1;
    letter-spacing: -.01em;
    color: #fafaf9;
}
.ub-sub { margin: 12px 0 0; font-size: 14px; color: #a8a29e; }

.ub-status {
    margin-top: 24px;
    display: flex; gap: 12px; align-items: flex-start;
    padding: 14px;
    border-radius: 12px;
    background: rgba(52,211,153,.1);
    border: 1px solid rgba(52,211,153,.22);
    color: #6ee7b7;
    font-size: 13px; font-weight: 500;
}
.ub-status i { margin-top: 2px; }
.ub-status p { margin: 0; }

.ub-form { margin-top: 32px; display: flex; flex-direction: column; gap: 20px; }

.ub-label { display: block; font-size: 13px; font-weight: 500; color: #d6d3d1; margin-bottom: 8px; }
.ub-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ub-label-row .ub-label { margin: 0; }

.ub-link { font-size: 13px; font-weight: 500; color: #d9c29a; text-decoration: none; transition: color .15s; }
.ub-link:hover { color: #ecdcb8; }

.ub-field { position: relative; }
.ub-field > .ub-ico {
    position: absolute; left: 16px; top: 0; bottom: 0;
    display: flex; align-items: center;
    color: #78716c; font-size: 14px;
    pointer-events: none;
}

.ub-input {
    display: block;
    width: 100%;
    height: 52px;
    padding: 0 16px 0 44px;
    border-radius: 12px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.1);
    color: #f5f5f4;
    font: inherit;
    font-size: 15px;
    outline: none;
    box-shadow: none;
    transition: border-color .2s, background .2s, box-shadow .2s;
}
.ub-input::placeholder { color: #78716c; }
.ub-input:hover { border-color: rgba(255,255,255,.2); }
.ub-input:focus {
    border-color: rgba(217,194,154,.7);
    background: rgba(255,255,255,.055);
    box-shadow: 0 0 0 4px rgba(217,194,154,.1);
}
.ub-input.is-error { border-color: rgba(239,68,68,.7); background: rgba(127,29,29,.2); }
.ub-input.has-toggle { padding-right: 48px; }

/* keep the dark look when the browser autofills */
.ub-input:-webkit-autofill,
.ub-input:-webkit-autofill:hover,
.ub-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #f5f5f4;
    caret-color: #f5f5f4;
    box-shadow: 0 0 0 1000px #17181d inset;
    border-color: rgba(255,255,255,.14);
    transition: background-color 9999s ease-out 0s;
}

.ub-eye {
    position: absolute; right: 0; top: 0; bottom: 0;
    width: 48px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: 0; cursor: pointer;
    color: #78716c; font-size: 14px;
    transition: color .15s;
}
.ub-eye:hover, .ub-eye:focus-visible { color: #d9c29a; outline: none; }

.ub-err { margin: 8px 0 0; font-size: 13px; font-weight: 500; color: #f87171 !important; }

.ub-remember {
    display: inline-flex; align-items: center; gap: 10px;
    cursor: pointer; user-select: none;
    font-size: 13px; font-weight: 500; color: #a8a29e;
    width: fit-content;
}
.ub-remember input { width: 16px; height: 16px; margin: 0; accent-color: #d9c29a; cursor: pointer; }

.ub-btn {
    width: 100%;
    height: 54px;
    margin-top: 4px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(180deg, #ecdcb8, #c9ad7c);
    color: #1a1409;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 12px 30px -10px rgba(217,194,154,.55), inset 0 1px 0 rgba(255,255,255,.55);
    transition: filter .2s, transform .08s;
}
.ub-btn:hover { filter: brightness(1.06); }
.ub-btn:active { transform: translateY(1px); }
.ub-btn:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(217,194,154,.3), 0 12px 30px -10px rgba(217,194,154,.55); }
.ub-btn[disabled] { opacity: .8; cursor: wait; }
.ub-btn i { font-size: 13px; }

.ub-note { margin: 28px 0 0; text-align: center; font-size: 12px; line-height: 1.6; color: #78716c; }

.ub-footer { position: relative; z-index: 1; margin-top: 32px; text-align: center; font-size: 12px; color: #57534e; }
.ub-footer p { margin: 0; }

@media (max-width: 480px) {
    .ub-card { padding: 44px 24px 30px; }
    .ub-title { font-size: 36px; }
}

@media (prefers-reduced-motion: reduce) {
    .ub-ring { animation: none; stroke-dashoffset: 0 !important; }
}
`;

function Logo() {
    return (
        <div className="ub-logo">
            <img
                src="/images/logo.png"
                alt="Unibox Logo"
                onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
            />
            <i className="fa-solid fa-shield-halved"></i>
        </div>
    );
}

/* Fine concentric rings behind the logo. They draw in once on load. */
function Rings() {
    const rings = [48, 66, 86, 108, 132];
    return (
        <svg aria-hidden="true" viewBox="-150 -150 300 300" className="ub-rings">
            <defs>
                <radialGradient id="ubRingFade" cx="50%" cy="50%" r="50%">
                    <stop offset="55%" stopColor="#fff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="ubRingMask">
                    <circle r="150" fill="url(#ubRingFade)" />
                </mask>
            </defs>
            <g mask="url(#ubRingMask)" fill="none" stroke="#d9c29a">
                {rings.map((r, i) => (
                    <circle
                        key={r}
                        r={r}
                        strokeWidth="0.8"
                        strokeOpacity={0.55 - i * 0.08}
                        className="ub-ring"
                        style={{
                            strokeDasharray: 2 * Math.PI * r,
                            strokeDashoffset: 2 * Math.PI * r,
                            animationDelay: `${0.15 + i * 0.12}s`,
                        }}
                    />
                ))}
            </g>
        </svg>
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

    return (
        <div className="ub-page">
            <Head title="Admin - Unibox">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <style>{css}</style>

            <div className="ub-glow ub-glow-top"></div>
            <div className="ub-glow ub-glow-bottom"></div>

            <main className="ub-main">
                <div className="ub-border">
                    <div className="ub-card">
                        <div className="ub-head">
                            <Rings />
                            <Logo />
                            <h1 className="ub-title">Unibox</h1>
                            <p className="ub-sub">Sign in with your administrator account.</p>
                        </div>

                        {status && (
                            <div className="ub-status" role="status">
                                <i className="fa-solid fa-circle-check"></i>
                                <p>{status}</p>
                            </div>
                        )}

                        <form className="ub-form" onSubmit={submit}>
                            <div>
                                <label htmlFor="email" className="ub-label">Email address</label>
                                <div className="ub-field">
                                    <span className="ub-ico"><i className="fa-regular fa-envelope"></i></span>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`ub-input ${errors.email ? 'is-error' : ''}`}
                                        placeholder="admin@unibox.com"
                                    />
                                </div>
                                <InputError message={errors.email} className="ub-err" />
                            </div>

                            <div>
                                <div className="ub-label-row">
                                    <label htmlFor="password" className="ub-label">Password</label>
                                    {canResetPassword && (
                                        <Link href={route('password.request')} className="ub-link">
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <div className="ub-field">
                                    <span className="ub-ico"><i className="fa-solid fa-lock"></i></span>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`ub-input has-toggle ${errors.password ? 'is-error' : ''}`}
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        className="ub-eye"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                                    </button>
                                </div>
                                <InputError message={errors.password} className="ub-err" />
                            </div>

                            <label className="ub-remember">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                                Remember this terminal
                            </label>

                            <button type="submit" disabled={processing} className="ub-btn">
                                {processing ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-shield-halved"></i>
                                        Sign in
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="ub-note">Failed sign-in attempts are logged with the IP address.</p>
                    </div>
                </div>
            </main>

            <footer className="ub-footer">
                <p>&copy; {new Date().getFullYear()} Unibox Core Security. All rights reserved.</p>
            </footer>
        </div>
    );
}