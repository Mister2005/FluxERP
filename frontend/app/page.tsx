'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

/* ─── Animated counter hook ─── */
function useCounter(target: number, duration = 2000, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let raf: number;
        const t0 = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setCount(Math.floor(p * target));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [start, target, duration]);
    return count;
}

/* ─── Intersection observer hook ─── */
function useOnScreen(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

/* ═══════════════════════════════════════════
   Icons (inline SVG — no external deps)
   ═══════════════════════════════════════════ */
const Icons = {
    bolt: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    ),
    cube: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
    ),
    layers: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
    ),
    gitBranch: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
        </svg>
    ),
    clipboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 14l2 2 4-4" />
        </svg>
    ),
    truck: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    brain: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M12 2a5 5 0 015 5c0 1.1-.4 2.1-1 2.9A5 5 0 0119 15a5 5 0 01-3 4.6V22h-8v-2.4A5 5 0 015 15a5 5 0 013-5.1A5 5 0 017 7a5 5 0 015-5z" />
            <path d="M12 2v20M8.5 7.5h7M7 12h10M8.5 16.5h7" />
        </svg>
    ),
    barChart: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
    ),
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
    ),
    arrowRight: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    chevronDown: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-bounce">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
};

/* ═══════════════════════════════════════════
   Feature data
   ═══════════════════════════════════════════ */
const features = [
    {
        icon: Icons.cube,
        title: 'Product Management',
        desc: 'Centralized product repository with full lifecycle visibility. Manage SKUs, revisions, specifications, and compliance data across your entire catalog with real-time status tracking and powerful search.',
        color: 'from-amber-600 to-yellow-700',
        bg: 'bg-amber-50',
    },
    {
        icon: Icons.layers,
        title: 'Bill of Materials',
        desc: 'Multi-level BOM structures with interactive canvas visualization. Define component hierarchies, manage quantities and costs, track revision history, and ensure manufacturing accuracy at every level.',
        color: 'from-orange-600 to-red-700',
        bg: 'bg-orange-50',
    },
    {
        icon: Icons.gitBranch,
        title: 'Engineering Change Orders',
        desc: 'Structured change management with configurable approval workflows. Submit, review, approve, and apply engineering changes with full audit trails, impact analysis, and stakeholder notifications.',
        color: 'from-emerald-600 to-teal-700',
        bg: 'bg-emerald-50',
    },
    {
        icon: Icons.clipboard,
        title: 'Work Order Tracking',
        desc: 'Kanban-style production planning with drag-and-drop status management. Create, schedule, and monitor manufacturing work orders from planning through completion with real-time progress dashboards.',
        color: 'from-blue-600 to-indigo-700',
        bg: 'bg-blue-50',
    },
    {
        icon: Icons.truck,
        title: 'Supplier Quality Management',
        desc: 'Comprehensive supplier scorecards with defect tracking, on-time delivery metrics, and quality ratings. Monitor supply chain health, flag at-risk suppliers, and drive continuous improvement.',
        color: 'from-violet-600 to-purple-700',
        bg: 'bg-violet-50',
    },
    {
        icon: Icons.brain,
        title: 'AI-Powered Intelligence',
        desc: 'Gemini AI integration delivers risk scoring, demand forecasting, and intelligent recommendations. Ask natural-language questions about your data and receive actionable insights instantly.',
        color: 'from-rose-600 to-pink-700',
        bg: 'bg-rose-50',
    },
];

const capabilities = [
    'Role-based access control with granular permissions',
    'Real-time analytics dashboards with interactive charts',
    'CSV bulk import & export for products and BOMs',
    'Full audit trail logging for regulatory compliance',
    'RESTful API for seamless third-party integrations',
    'Multi-level BOM canvas with visual hierarchy',
];

/* ═══════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════ */
export default function Home() {
    const [scrollY, setScrollY] = useState(0);
    const statsSection = useOnScreen(0.3);
    const c1 = useCounter(67, 1800, statsSection.visible);
    const c2 = useCounter(8, 1200, statsSection.visible);
    const c3 = useCounter(99.9, 2000, statsSection.visible);
    const c4 = useCounter(24, 1000, statsSection.visible);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#FAF8F6] text-[#3E2723] overflow-x-hidden">

            {/* ───── Sticky Navbar ───── */}
            <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrollY > 40 ? 'bg-white/90 backdrop-blur-lg shadow-md' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6D4C41] to-[#3E2723] flex items-center justify-center text-white">
                            {Icons.bolt}
                        </div>
                        <span className="text-xl font-bold tracking-tight">Flux<span className="text-[#8D6E63]">ERP</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6D4C41]">
                        <a href="#features" className="hover:text-[#3E2723] transition-colors">Features</a>
                        <a href="#modules" className="hover:text-[#3E2723] transition-colors">Modules</a>
                        <a href="#stats" className="hover:text-[#3E2723] transition-colors">Why FluxERP</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="px-5 py-2 text-sm font-semibold text-[#6D4C41] border border-[#D7CCC8] rounded-lg hover:bg-[#EFEBE9] transition-all">
                            Sign In
                        </Link>
                        <Link href="/signup" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#6D4C41] to-[#4E342E] rounded-lg hover:shadow-lg hover:shadow-[#8D6E63]/25 transition-all">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ───── Hero Section ───── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#EFEBE9] via-[#FAF8F6] to-[#D7CCC8]" />
                {/* Decorative grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%233E2723\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                {/* Floating orbs */}
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#8D6E63]/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#A1887F]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D7CCC8]/20 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EFEBE9] border border-[#D7CCC8] text-sm font-medium text-[#6D4C41] mb-8">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Enterprise-Grade PLM Platform
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
                        <span className="block">Intelligent Product</span>
                        <span className="block bg-gradient-to-r from-[#6D4C41] via-[#8D6E63] to-[#A1887F] bg-clip-text text-transparent">
                            Lifecycle Management
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg sm:text-xl text-[#6D4C41] leading-relaxed mb-10">
                        FluxERP unifies product data, engineering changes, manufacturing operations,
                        and supplier quality into a single AI-powered platform — giving your team
                        complete visibility from concept to delivery.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link href="/signup" className="group flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-[#6D4C41] to-[#3E2723] rounded-xl shadow-lg shadow-[#6D4C41]/20 hover:shadow-xl hover:shadow-[#6D4C41]/30 hover:-translate-y-0.5 transition-all duration-200">
                            Start Free Trial
                            <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                        </Link>
                        <Link href="/login" className="flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-[#6D4C41] bg-white/80 border border-[#D7CCC8] rounded-xl hover:bg-white hover:shadow-md transition-all duration-200">
                            Sign In to Dashboard
                        </Link>
                    </div>

                    {/* Hero visual — Stylized dashboard preview */}
                    <div className="relative mx-auto max-w-4xl">
                        <div className="absolute -inset-4 bg-gradient-to-b from-[#8D6E63]/10 to-transparent rounded-3xl blur-2xl" />
                        <div className="relative bg-white rounded-2xl shadow-2xl shadow-[#3E2723]/10 border border-[#E6DED8] overflow-hidden">
                            {/* Mock window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F0EB] border-b border-[#E6DED8]">
                                <span className="w-3 h-3 rounded-full bg-[#EF5350]" />
                                <span className="w-3 h-3 rounded-full bg-[#FFA726]" />
                                <span className="w-3 h-3 rounded-full bg-[#66BB6A]" />
                                <span className="ml-4 text-xs text-[#A1887F] font-mono">app.fluxerp.io/dashboard</span>
                            </div>
                            {/* Dashboard mockup */}
                            <div className="p-6 grid grid-cols-4 gap-4">
                                {/* Sidebar mock */}
                                <div className="col-span-1 space-y-3">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EFEBE9]">
                                        <div className="w-4 h-4 rounded bg-[#8D6E63]" />
                                        <div className="h-2.5 w-16 rounded bg-[#8D6E63]" />
                                    </div>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-2">
                                            <div className="w-4 h-4 rounded bg-[#D7CCC8]" />
                                            <div className="h-2 rounded bg-[#E6DED8]" style={{ width: `${50 + i * 8}%` }} />
                                        </div>
                                    ))}
                                </div>
                                {/* Content area */}
                                <div className="col-span-3 space-y-4">
                                    {/* Stats row */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {['#66BB6A', '#FFA726', '#8D6E63', '#EF5350'].map((c, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-[#FAF8F6] border border-[#E6DED8]">
                                                <div className="h-2 w-12 rounded mb-2" style={{ background: c, opacity: 0.6 }} />
                                                <div className="h-5 w-10 rounded bg-[#3E2723]/80" />
                                                <div className="h-1.5 w-16 rounded bg-[#E6DED8] mt-2" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Chart placeholder */}
                                    <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E6DED8]">
                                        <div className="h-2 w-24 rounded bg-[#D7CCC8] mb-4" />
                                        <div className="flex items-end gap-2 h-24">
                                            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50].map((h, i) => (
                                                <div key={i} className="flex-1 rounded-t transition-all duration-1000" style={{ height: `${h}%`, background: `linear-gradient(to top, #8D6E63, #D7CCC8)`, opacity: 0.7 + i * 0.02 }} />
                                            ))}
                                        </div>
                                    </div>
                                    {/* Table placeholder */}
                                    <div className="rounded-xl bg-[#FAF8F6] border border-[#E6DED8] overflow-hidden">
                                        <div className="grid grid-cols-5 gap-2 p-3 bg-[#F5F0EB] border-b border-[#E6DED8]">
                                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-2 rounded bg-[#BCAAA4]" />)}
                                        </div>
                                        {[1, 2, 3].map(r => (
                                            <div key={r} className="grid grid-cols-5 gap-2 p-3 border-b border-[#E6DED8]/50">
                                                {[1, 2, 3, 4, 5].map(c => <div key={c} className="h-2 rounded bg-[#E6DED8]" />)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    <div className="mt-12 text-[#A1887F]">
                        <a href="#features" className="inline-flex flex-col items-center gap-1 text-xs font-medium">
                            Explore Features
                            {Icons.chevronDown}
                        </a>
                    </div>
                </div>
            </section>

            {/* ───── Trusted By / Social Proof ───── */}
            <section className="py-16 bg-white border-y border-[#E6DED8]">
                <div className="max-w-6xl mx-auto px-6">
                    <p className="text-center text-sm font-medium text-[#A1887F] uppercase tracking-widest mb-8">
                        Built for Modern Manufacturing Teams
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { icon: Icons.shield, label: 'Enterprise Security', sub: 'Role-based access & audit logs' },
                            { icon: Icons.users, label: 'Team Collaboration', sub: 'Multi-role workflow approvals' },
                            { icon: Icons.brain, label: 'AI Intelligence', sub: 'Gemini-powered insights' },
                            { icon: Icons.barChart, label: 'Real-time Analytics', sub: 'Live dashboards & reports' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center text-center gap-2.5">
                                <div className="w-12 h-12 rounded-xl bg-[#EFEBE9] flex items-center justify-center text-[#8D6E63]">
                                    {item.icon}
                                </div>
                                <span className="text-sm font-semibold text-[#3E2723]">{item.label}</span>
                                <span className="text-xs text-[#A1887F]">{item.sub}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── Features Overview ───── */}
            <section id="features" className="py-24 bg-[#FAF8F6]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#EFEBE9] text-xs font-bold text-[#8D6E63] uppercase tracking-wider mb-4">
                            Platform Capabilities
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                            Everything You Need to Manage<br />
                            <span className="text-[#8D6E63]">Your Product Lifecycle</span>
                        </h2>
                        <p className="max-w-2xl mx-auto text-[#6D4C41]">
                            From raw material sourcing to final delivery, FluxERP provides end-to-end visibility and control over every stage of your product lifecycle.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        {capabilities.map((cap, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E6DED8] hover:shadow-md hover:border-[#D7CCC8] transition-all">
                                <div className="mt-0.5 w-6 h-6 rounded-full bg-[#66BB6A]/15 flex items-center justify-center text-[#66BB6A] flex-shrink-0">
                                    {Icons.check}
                                </div>
                                <span className="text-[15px] text-[#4E342E] font-medium">{cap}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── Core Modules (detailed) ───── */}
            <section id="modules" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#EFEBE9] text-xs font-bold text-[#8D6E63] uppercase tracking-wider mb-4">
                            Core Modules
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                            Six Powerful Modules,<br />
                            <span className="text-[#8D6E63]">One Unified Platform</span>
                        </h2>
                        <p className="max-w-2xl mx-auto text-[#6D4C41]">
                            Each module is designed to work independently or as part of the integrated FluxERP ecosystem, ensuring seamless data flow across your organization.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="group relative p-6 rounded-2xl bg-[#FAF8F6] border border-[#E6DED8] hover:border-[#D7CCC8] hover:shadow-xl hover:shadow-[#3E2723]/5 hover:-translate-y-1 transition-all duration-300">
                                <div className={`w-14 h-14 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                                    <div className={`bg-gradient-to-br ${f.color} bg-clip-text text-transparent`}>
                                        <div className="text-[#6D4C41]">{f.icon}</div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-[#3E2723] mb-2">{f.title}</h3>
                                <p className="text-sm text-[#6D4C41] leading-relaxed">{f.desc}</p>
                                {/* Hover accent line */}
                                <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${f.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── How It Works ───── */}
            <section className="py-24 bg-gradient-to-b from-[#FAF8F6] to-[#EFEBE9]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="inline-block px-3 py-1 rounded-full bg-white text-xs font-bold text-[#8D6E63] uppercase tracking-wider mb-4">
                            Workflow
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                            From Design to Delivery,<br />
                            <span className="text-[#8D6E63]">Streamlined with AI</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { step: '01', title: 'Define Products', desc: 'Create and catalog products with detailed specifications, SKUs, categories, and compliance metadata in a structured repository.' },
                            { step: '02', title: 'Build BOMs', desc: 'Assemble multi-level bill of materials with interactive canvas visualization, component costing, and revision control.' },
                            { step: '03', title: 'Manage Changes', desc: 'Submit, review, and approve engineering change orders with configurable workflows, impact analysis, and full traceability.' },
                            { step: '04', title: 'Execute & Monitor', desc: 'Launch work orders, track production on Kanban boards, monitor supplier quality, and leverage AI for predictive insights.' },
                        ].map((s, i) => (
                            <div key={i} className="relative">
                                {i < 3 && <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-[#D7CCC8] to-transparent z-0" />}
                                <div className="relative bg-white rounded-2xl p-6 border border-[#E6DED8] shadow-sm hover:shadow-lg transition-shadow duration-300 z-10">
                                    <div className="text-4xl font-black text-[#EFEBE9] mb-3">{s.step}</div>
                                    <h3 className="text-base font-bold text-[#3E2723] mb-2">{s.title}</h3>
                                    <p className="text-sm text-[#6D4C41] leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── Stats Section ───── */}
            <section id="stats" className="py-24 bg-gradient-to-r from-[#3E2723] to-[#4E342E] text-white" ref={statsSection.ref}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                            Trusted by Engineering Teams<br />
                            <span className="text-[#D7CCC8]">Building the Future</span>
                        </h2>
                        <p className="max-w-xl mx-auto text-[#BCAAA4]">
                            FluxERP powers product lifecycle management for manufacturing companies that demand precision, traceability, and speed.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: c1, suffix: '+', label: 'API Endpoints', sub: 'Fully documented REST API' },
                            { value: c2, suffix: '', label: 'Core Modules', sub: 'Integrated PLM ecosystem' },
                            { value: c3, suffix: '%', label: 'Uptime SLA', sub: 'Enterprise reliability' },
                            { value: c4, suffix: '/7', label: 'Support', sub: 'Dedicated assistance' },
                        ].map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="text-4xl sm:text-5xl font-black mb-1">
                                    {s.value}{s.suffix}
                                </div>
                                <div className="text-sm font-semibold text-[#D7CCC8] mb-1">{s.label}</div>
                                <div className="text-xs text-[#A1887F]">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── Architecture / Tech Stack ───── */}
            <section className="py-24 bg-[#FAF8F6]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-[#EFEBE9] text-xs font-bold text-[#8D6E63] uppercase tracking-wider mb-4">
                                Architecture
                            </span>
                            <h2 className="text-3xl font-extrabold mb-6 tracking-tight">
                                Built on Modern,<br />
                                <span className="text-[#8D6E63]">Battle-Tested Technology</span>
                            </h2>
                            <p className="text-[#6D4C41] mb-8 leading-relaxed">
                                FluxERP is engineered with a modern stack designed for performance, scalability, and developer experience. Every layer is carefully chosen to deliver enterprise-grade reliability.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { label: 'Frontend', tech: 'Next.js 16 + React 19 + Tailwind CSS' },
                                    { label: 'Backend', tech: 'Node.js + Express + TypeScript' },
                                    { label: 'Database', tech: 'PostgreSQL + Prisma ORM' },
                                    { label: 'AI Engine', tech: 'Google Gemini API Integration' },
                                    { label: 'Auth', tech: 'JWT + bcrypt + RBAC' },
                                ].map((t, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className="w-20 text-xs font-bold uppercase tracking-wider text-[#A1887F]">{t.label}</span>
                                        <div className="flex-1 h-px bg-[#E6DED8]" />
                                        <span className="text-sm font-semibold text-[#4E342E]">{t.tech}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual: Stacked layers illustration */}
                        <div className="relative">
                            <div className="absolute -inset-6 bg-gradient-to-br from-[#8D6E63]/5 to-transparent rounded-3xl" />
                            <div className="relative space-y-3">
                                {[
                                    { label: 'Presentation Layer', items: 'Next.js / React / Tailwind', color: 'from-blue-500 to-indigo-600', w: '100%' },
                                    { label: 'API Layer', items: 'Express REST + Auth Middleware', color: 'from-emerald-500 to-teal-600', w: '90%' },
                                    { label: 'Business Logic', items: 'Services + Validators + AI', color: 'from-amber-500 to-orange-600', w: '80%' },
                                    { label: 'Data Layer', items: 'Prisma ORM + PostgreSQL', color: 'from-violet-500 to-purple-600', w: '70%' },
                                    { label: 'Infrastructure', items: 'Docker + Redis + Queue', color: 'from-rose-500 to-pink-600', w: '60%' },
                                ].map((layer, i) => (
                                    <div key={i} className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ width: layer.w, marginLeft: 'auto', marginRight: 'auto' }}>
                                        <div className={`bg-gradient-to-r ${layer.color} rounded-xl px-5 py-4 text-white`}>
                                            <div className="text-xs font-bold uppercase tracking-wider opacity-80">{layer.label}</div>
                                            <div className="text-sm font-medium mt-0.5">{layer.items}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───── CTA Section ───── */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="relative">
                        <div className="absolute -inset-8 bg-gradient-to-r from-[#EFEBE9] via-[#FAF8F6] to-[#EFEBE9] rounded-3xl" />
                        <div className="relative bg-white border border-[#E6DED8] rounded-2xl p-12 shadow-lg">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6D4C41] to-[#3E2723] flex items-center justify-center text-white mx-auto mb-6">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                                Ready to Transform Your<br />
                                <span className="text-[#8D6E63]">Product Management?</span>
                            </h2>
                            <p className="max-w-xl mx-auto text-[#6D4C41] mb-8">
                                Join engineering teams who are already using FluxERP to streamline their product lifecycle,
                                reduce change management overhead, and deliver higher quality products faster.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/signup" className="group flex items-center gap-2.5 px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#6D4C41] to-[#3E2723] rounded-xl shadow-lg shadow-[#6D4C41]/20 hover:shadow-xl hover:shadow-[#6D4C41]/30 hover:-translate-y-0.5 transition-all duration-200">
                                    Create Free Account
                                    <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                                </Link>
                                <Link href="/login" className="px-10 py-4 text-base font-semibold text-[#6D4C41] bg-[#FAF8F6] border border-[#D7CCC8] rounded-xl hover:bg-[#EFEBE9] transition-all">
                                    Sign In
                                </Link>
                            </div>
                            <p className="mt-6 text-xs text-[#A1887F]">
                                No credit card required &middot; Full access to all modules &middot; Setup in under 2 minutes
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───── Footer ───── */}
            <footer className="bg-[#3E2723] text-[#D7CCC8] py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8D6E63] to-[#6D4C41] flex items-center justify-center text-white">
                                    {Icons.bolt}
                                </div>
                                <span className="text-xl font-bold text-white tracking-tight">Flux<span className="text-[#A1887F]">ERP</span></span>
                            </div>
                            <p className="text-sm text-[#A1887F] leading-relaxed">
                                AI-First Product Lifecycle Management for modern manufacturing enterprises.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><a href="#modules" className="hover:text-white transition-colors">Product Management</a></li>
                                <li><a href="#modules" className="hover:text-white transition-colors">Bill of Materials</a></li>
                                <li><a href="#modules" className="hover:text-white transition-colors">Change Orders</a></li>
                                <li><a href="#modules" className="hover:text-white transition-colors">Work Orders</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Solutions</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Supplier Quality</a></li>
                                <li><a href="#features" className="hover:text-white transition-colors">AI Analytics</a></li>
                                <li><a href="#features" className="hover:text-white transition-colors">Compliance & Audit</a></li>
                                <li><a href="#features" className="hover:text-white transition-colors">Role-Based Access</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Get Started</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
                                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                                <li><a href="#stats" className="hover:text-white transition-colors">Why FluxERP</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-[#4E342E] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-[#8D6E63]">&copy; {new Date().getFullYear()} FluxERP. All rights reserved.</p>
                        <p className="text-xs text-[#8D6E63]">Built with Next.js, TypeScript &amp; Gemini AI</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
