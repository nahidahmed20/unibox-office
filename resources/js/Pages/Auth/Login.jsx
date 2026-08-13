import InputError from '@/Components/InputError';
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
        <div
            className="relative min-h-screen flex items-center justify-center px-4 selection:bg-[#C9A961]/30 selection:text-[#F6EFDD]"
            style={{
                background: 'radial-gradient(circle at 50% -8%, #1B4332 0%, #0F2A1E 45%, #071510 100%)',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus,
                input:-webkit-autofill:active {
                    -webkit-text-fill-color: #F4EFE1 !important;
                    -webkit-box-shadow: 0 0 0px 1000px #12301F inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes emblemIn {
                    from { opacity: 0; transform: translate(-50%, -12px) scale(0.85); }
                    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }

                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>

            {/* Ambient botanical line-art texture */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cg fill='none' stroke='%23C9A961' stroke-width='1' stroke-linecap='round'%3E%3Cpath d='M0 130 Q55 90 110 130 T220 130'/%3E%3Cellipse cx='30' cy='118' rx='9' ry='4' transform='rotate(-35 30 118)'/%3E%3Cellipse cx='70' cy='105' rx='9' ry='4' transform='rotate(-35 70 105)'/%3E%3Cellipse cx='150' cy='105' rx='9' ry='4' transform='rotate(35 150 105)'/%3E%3Cellipse cx='190' cy='118' rx='9' ry='4' transform='rotate(35 190 118)'/%3E%3C/g%3E%3C/svg%3E\")",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '220px 220px',
                    mixBlendMode: 'soft-light',
                }}
            ></div>

            {/* Fine grain */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    mixBlendMode: 'overlay',
                }}
            ></div>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_220px_90px_rgba(0,0,0,0.55)]"></div>

            <Head title="Log in" />

            {/* Card */}
            <div
                className="relative z-10 w-full max-w-[360px] rounded-[28px] border border-[#C9A961]/25 bg-[#12301F]/85 backdrop-blur-xl pt-16 pb-9 px-8 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.85)]"
                style={{ animation: 'fadeInUp 0.7s ease-out' }}
            >
                {/* Ambient glow behind emblem */}
                <div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-[140px] h-[140px] rounded-full bg-[#C9A961]/25 blur-3xl pointer-events-none"
                ></div>

                {/* Emblem */}
                <div
                    className="absolute -top-[46px] left-1/2 w-[92px] h-[92px] rounded-full bg-gradient-to-b from-[#1B4332] to-[#0B1F17] border border-[#C9A961]/50 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]"
                    style={{ animation: 'emblemIn 0.8s ease-out', transform: 'translateX(-50%)' }}
                >
                    <svg viewBox="0 0 100 100" className="w-12 h-12">
                        <defs>
                            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F3DFA0" />
                                <stop offset="100%" stopColor="#C9A961" />
                            </linearGradient>
                        </defs>
                        <g fill="url(#goldGrad)" stroke="url(#goldGrad)" strokeWidth="1.2" strokeLinecap="round">
                            <path d="M38 78 C 30 74, 24 66, 22 56" fill="none" />
                            <ellipse cx="35" cy="74" rx="4" ry="2.1" transform="rotate(-40 35 74)" stroke="none" />
                            <ellipse cx="30" cy="67" rx="4" ry="2.1" transform="rotate(-55 30 67)" stroke="none" />
                            <ellipse cx="25.5" cy="59" rx="3.6" ry="1.9" transform="rotate(-70 25.5 59)" stroke="none" />

                            <path d="M62 78 C 70 74, 76 66, 78 56" fill="none" />
                            <ellipse cx="65" cy="74" rx="4" ry="2.1" transform="rotate(40 65 74)" stroke="none" />
                            <ellipse cx="70" cy="67" rx="4" ry="2.1" transform="rotate(55 70 67)" stroke="none" />
                            <ellipse cx="74.5" cy="59" rx="3.6" ry="1.9" transform="rotate(70 74.5 59)" stroke="none" />
                        </g>
                        <text
                            x="50"
                            y="53"
                            textAnchor="middle"
                            fontFamily="Fraunces, serif"
                            fontSize="30"
                            fontWeight="600"
                            fill="url(#goldGrad)"
                        >
                            U
                        </text>
                    </svg>
                </div>

                {/* Wordmark */}
                <div className="text-center">
                    <h1
                        className="text-[27px] tracking-[0.08em] font-medium bg-gradient-to-b from-[#F6EFDD] to-[#C9A961] bg-clip-text text-transparent"
                        style={{ fontFamily: "'Fraunces', serif" }}
                    >
                        UNIBOX
                    </h1>
                    <p className="mt-1.5 text-[9.5px] tracking-[0.35em] uppercase text-[#8FAF9B] font-medium">
                        School Management System
                    </p>
                </div>

                {/* Divider ornament */}
                <div className="flex items-center justify-center gap-2 my-6">
                    <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A961]/60"></span>
                    <span className="w-[5px] h-[5px] rotate-45 bg-[#C9A961]/70"></span>
                    <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A961]/60"></span>
                </div>

                {status && (
                    <div className="mb-5 text-[11.5px] text-[#8FD9A0] text-center tracking-wide font-medium">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col gap-6">
                    {/* Email */}
                    <div className="relative group">
                        <label
                            htmlFor="email"
                            className="block text-[9.5px] tracking-[0.2em] uppercase text-[#8FAF9B] mb-2 font-medium"
                        >
                            Email Address
                        </label>
                        <div className="flex items-center gap-3 pb-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.8"
                                stroke="currentColor"
                                className="w-[15px] h-[15px] text-[#C9A961]/70 group-focus-within:text-[#E8C874] transition-colors shrink-0"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                                />
                            </svg>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="you@school.edu"
                                className="flex-1 bg-transparent border-none text-[#F4EFE1] text-[13px] tracking-wide placeholder:text-[#F4EFE1]/25 focus:ring-0 outline-none p-0"
                                required
                            />
                        </div>
                        <div className="relative h-px bg-[#F4EFE1]/15 overflow-hidden">
                            <span className="absolute inset-0 bg-gradient-to-r from-[#C9A961] to-[#E8C874] scale-x-0 group-focus-within:scale-x-100 origin-left transition-transform duration-500 ease-out"></span>
                        </div>
                        <InputError message={errors.email} className="mt-2 text-[11px] text-[#E4756B] tracking-wide" />
                    </div>

                    {/* Password */}
                    <div className="relative group">
                        <label
                            htmlFor="password"
                            className="block text-[9.5px] tracking-[0.2em] uppercase text-[#8FAF9B] mb-2 font-medium"
                        >
                            Password
                        </label>
                        <div className="flex items-center gap-3 pb-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.8"
                                stroke="currentColor"
                                className="w-[15px] h-[15px] text-[#C9A961]/70 group-focus-within:text-[#E8C874] transition-colors shrink-0"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                />
                            </svg>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="flex-1 bg-transparent border-none text-[#F4EFE1] text-[14px] tracking-widest placeholder:text-[#F4EFE1]/25 focus:ring-0 outline-none p-0"
                                required
                            />
                        </div>
                        <div className="relative h-px bg-[#F4EFE1]/15 overflow-hidden">
                            <span className="absolute inset-0 bg-gradient-to-r from-[#C9A961] to-[#E8C874] scale-x-0 group-focus-within:scale-x-100 origin-left transition-transform duration-500 ease-out"></span>
                        </div>
                        <InputError message={errors.password} className="mt-2 text-[11px] text-[#E4756B] tracking-wide" />
                    </div>

                    {/* Options */}
                    <div className="flex items-center justify-between px-0.5 -mt-1">
                        <label className="flex items-center gap-2 cursor-pointer group/check">
                            <span className="relative flex items-center justify-center w-[15px] h-[15px] rounded-[3px] border border-[#C9A961]/50 overflow-hidden transition-colors group-hover/check:border-[#C9A961]">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="peer absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <span className="absolute inset-0 bg-[#C9A961] scale-0 peer-checked:scale-100 transition-transform duration-200"></span>
                                <svg
                                    className="relative w-[9px] h-[9px] text-[#0B1F17] opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
                                </svg>
                            </span>
                            <span className="text-[10.5px] tracking-wide text-[#D9D3C0]/80 group-hover/check:text-[#F4EFE1] transition-colors">
                                Remember Me
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-[10.5px] tracking-wide text-[#8FAF9B] hover:text-[#E8C874] underline-offset-2 hover:underline transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing}
                        className={`group relative mt-1 w-full h-[46px] overflow-hidden rounded-[4px] bg-gradient-to-r from-[#C9A961] to-[#E8C874] text-[#0B1F17] text-[11px] font-bold tracking-[0.3em] uppercase flex items-center justify-center transition-all duration-300 hover:shadow-[0_10px_32px_-8px_rgba(201,169,97,0.6)] ${
                            processing ? 'opacity-70 cursor-wait' : ''
                        }`}
                    >
                        <span className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"></span>
                        <span className="relative">{processing ? 'Signing in…' : 'Sign In'}</span>
                    </button>

                    {/* Register */}
                    <div className="text-center -mt-1">
                        <span className="text-[10.5px] tracking-wide text-[#8FAF9B]/70">New to Unibox? </span>
                        <Link
                            href={route('register')}
                            className="text-[10.5px] tracking-wide font-semibold text-[#E8C874] hover:text-[#F6EFDD] underline-offset-2 hover:underline transition-colors"
                        >
                            Create an account
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}