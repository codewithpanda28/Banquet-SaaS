'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, LayoutDashboard, Utensils, Zap, Globe, Smartphone, BarChart3,
  Star, Check, ArrowRight, Menu, X, CalendarCheck, Bell, ShieldCheck, TrendingUp,
  Users, Clock, Layers, Cpu, MessageSquare, ChevronDown, Award, Receipt, QrCode
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Dashboards', href: '#dashboards' },
  { label: 'How It Works', href: '#how-it-works' },
  // { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

const FEATURES = [
  {
    icon: <LayoutDashboard className="w-7 h-7 text-orange-500" />,
    title: 'Centralized HQ Dashboard',
    desc: 'Manage menus, staff, live orders, and analytics for your banquet halls from a single powerful control center.',
    color: 'orange',
  },
  {
    icon: <QrCode className="w-7 h-7 text-violet-500" />,
    title: 'Smart Guest QR Menus',
    desc: 'Generate dynamic QR codes for VIP tables or event areas. Guests scan, browse your menu, and place orders instantly.',
    color: 'violet',
  },
  {
    icon: <Smartphone className="w-7 h-7 text-emerald-500" />,
    title: 'Kitchen Display System',
    desc: 'Orders appear instantly on kitchen screens. Cook smarter, reduce paper token errors, and serve faster with real-time KDS.',
    color: 'emerald',
  },
  {
    icon: <Users className="w-7 h-7 text-amber-500" />,
    title: 'Captain & Staff App',
    desc: 'Waiters and Captains log in securely via PIN to take live orders from tables, add items to existing bills, and send directly to kitchen.',
    color: 'amber',
  },
  {
    icon: <Zap className="w-7 h-7 text-sky-500" />,
    title: 'n8n Automation Engine',
    desc: 'Auto-trigger WhatsApp messages and daily revenue reports via n8n webhooks without writing a single line of code.',
    color: 'sky',
  },
  {
    icon: <Globe className="w-7 h-7 text-rose-500" />,
    title: 'Custom Brand & Theme',
    desc: 'Your banquet gets its own custom URL and digital menu branding. Fully white-labeled to match your aesthetic.',
    color: 'rose',
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-indigo-500" />,
    title: 'Real-Time Analytics',
    desc: 'Data-driven decisions with live sales tracking, best-seller insights, and revenue forecasting across all your properties.',
    color: 'indigo',
  },
  {
    icon: <ShieldCheck className="w-7 h-7 text-teal-500" />,
    title: 'Multi-Tenant Security',
    desc: 'Built on Supabase with Row-Level Security (RLS). Every banquet tenant\'s data is strictly isolated and secure.',
    color: 'teal',
  },
  {
    icon: <Award className="w-7 h-7 text-pink-500" />,
    title: 'Fast Checkout & Billing',
    desc: 'Process payments rapidly, merge bills, and manage split payments from the admin panel to close events smoothly.',
    color: 'pink',
  },
];

const STEPS = [
  { num: '01', title: 'Setup Menus & Tables', desc: 'Add your banquet details, upload the food menu, and configure table or event area numbering.' },
  { num: '02', title: 'Deploy QR & KDS', desc: 'Place QR codes on guest tables and set up the Kitchen Display System (KDS) screen for your chefs.' },
  { num: '03', title: 'Take Live Orders', desc: 'Guests order via QR or Captains punch orders through their app. Orders flow instantly to the KDS.' },
  { num: '04', title: 'Track & Automate', desc: 'Admin monitors live revenue, approves checkouts, and gets daily WhatsApp reports via n8n.' },
];

const STATS = [
  { value: '500+', label: 'Banquet Halls Onboarded', icon: <Utensils className="w-6 h-6 text-orange-500" /> },
  { value: '1.2L+', label: 'Events Hosted Successfully', icon: <TrendingUp className="w-6 h-6 text-emerald-500" /> },
  { value: '99.9%', label: 'Platform Uptime Guarantee', icon: <ShieldCheck className="w-6 h-6 text-violet-500" /> },
  { value: '3x', label: 'Faster Quotation Process', icon: <Clock className="w-6 h-6 text-amber-500" /> },
];

const PLANS = [
  {
    name: 'Starter Setup',
    price: '₹1,499',
    period: '/mo',
    tagline: 'Perfect for a single banquet hall',
    color: 'orange',
    features: [
      'Digital QR Menu Ordering',
      'Admin & Owner Dashboard',
      'Live Kitchen Display (KDS)',
      'Basic Sales Analytics',
      'Standard Email Support',
    ],
    missing: ['Captain/Waiter App', 'n8n WhatsApp Alerts', 'Multi-Branch Support'],
  },
  {
    name: 'Professional Ops',
    price: '₹3,999',
    period: '/mo',
    tagline: 'The standard for smooth event execution',
    color: 'violet',
    popular: true,
    features: [
      'Everything in Starter',
      'Captain/Waiter Ordering App',
      'n8n WhatsApp Automations',
      'Advanced Live Analytics',
      'Multi-Branch Support (Up to 3)',
      'Priority Phone Support',
    ],
    missing: [],
  },
  {
    name: 'Enterprise Chain',
    price: 'Custom',
    period: '',
    tagline: 'Bespoke infrastructure for large hospitality groups',
    color: 'sky',
    features: [
      'Unlimited Branches & Halls',
      'Custom Super Admin Controls',
      'White-Labeled Customer Portal',
      'Dedicated Success Manager',
      '24/7 SLA Concierge Support',
      'Custom API Integrations',
    ],
    missing: [],
  },
];

const TESTIMONIALS = [
  {
    name: 'Rajeev Malhotra',
    role: 'Owner, The Grand Crystal Banquets (Delhi)',
    text: 'BanquetSaaS completely eliminated our manual diary system. Double bookings are a thing of the past, and generating a quotation now takes 30 seconds.',
    rating: 5,
    avatar: 'RM',
    color: 'orange',
  },
  {
    name: 'Neha Kapoor',
    role: 'Sales Director, Royal Orchid Events (Mumbai)',
    text: 'The CRM is a lifesaver. We track every lead from inquiry to advance payment. Our conversion rate increased by 35% within the first two months.',
    rating: 5,
    avatar: 'NK',
    color: 'violet',
  },
  {
    name: 'Vikram Singh',
    role: 'Operations Head, Heritage Lawns (Jaipur)',
    text: 'Coordinating the kitchen and decorators used to be a nightmare. Now, the system automatically sends prep sheets and requirements to everyone involved.',
    rating: 5,
    avatar: 'VS',
    color: 'emerald',
  },
];

const FAQS = [
  { q: 'How does the QR menu system work?', a: 'You generate a unique QR code for each VIP table or event area. Guests scan it with their phone camera (no app needed) to view the menu and place orders directly to the kitchen.' },
  { q: 'What is the Kitchen Display System (KDS)?', a: 'The KDS is a digital screen for your chefs. Instead of paper tokens, orders appear instantly on the screen as "New", "Preparing", and "Ready", ensuring zero missed orders.' },
  { q: 'How do my Captains and Waiters use the system?', a: 'Staff members log in to the Waiter Dashboard using a secure 4-digit PIN. They can select a table, add items to the cart, and send orders to the kitchen while standing right next to the guest.' },
  { q: 'What is n8n automation and how does it help?', a: 'n8n allows us to connect your BanquetSaaS to WhatsApp and other tools. You can get automated daily revenue reports, order alerts, and more without manual work.' },
  { q: 'Is my data secure?', a: "Absolutely. We use Supabase with strict Row-Level Security (RLS). Each banquet's data is fully isolated, meaning no other tenant can ever access your menus or financial data." },
];

export default function SaaSLandingPage({ realStats }: {
  realStats?: {
    totalBanquets?: number;
    totalOrders?: number;
    totalCustomers?: number;
    totalRevenue?: number;
    totalStaff?: number;
  }
}) {
  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr+';
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L+';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
    return num.toString() + (num > 0 ? '+' : '');
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-gray-900 overflow-x-hidden font-sans">

      {/* ─── Global Styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-delay { animation: float 4s ease-in-out 1s infinite; }
        .animate-fadeUp { animation: fadeUp 0.7s ease forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, #f97316 0%, #7c3aed 30%, #0ea5e9 60%, #f97316 90%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px -12px rgba(0,0,0,0.12);
        }
        .btn-primary {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px -8px rgba(249, 115, 22, 0.5);
        }
        .btn-primary:active { transform: translateY(0); }
        .hero-blob {
          border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
        }
        .feature-icon-wrap {
          transition: all 0.3s ease;
        }
        .feature-card:hover .feature-icon-wrap {
          transform: scale(1.15) rotate(-5deg);
        }
      `}</style>

      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-lg">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Banquet<span className="text-orange-500">SaaS</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* <Link href="#pricing" className="px-5 py-2.5 text-sm font-semibold text-orange-600 border-2 border-orange-200 rounded-xl hover:bg-orange-50 transition-all">
              View Plans
            </Link> */}
            <Link href="#contact" className="px-5 py-2.5 text-sm font-bold text-white btn-primary rounded-xl shadow-lg">
              Get Started Free →
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="block text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="#pricing" className="block w-full text-center px-5 py-3 text-sm font-bold text-white btn-primary rounded-xl">
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-orange-100 hero-blob opacity-50 -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-100 hero-blob opacity-40 -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-50 rounded-full opacity-30 -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="animate-fadeUp">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-600 mb-6">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                India's #1 Banquet Management System
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] mb-6 tracking-tight text-gray-900">
                Host Perfect Events.<br />
                <span className="shimmer-text">Scale Your Venues.</span>
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                The all-in-one software for banquet halls, event venues, and resorts. Manage bookings, automate quotations, plan catering, and track every lead from a single, powerful dashboard.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="#pricing">
                  <button className="h-14 px-8 text-white font-bold btn-primary rounded-2xl text-base flex items-center gap-2 shadow-xl">
                    Start Free Trial <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link href="#how-it-works">
                  <button className="h-14 px-8 text-gray-700 font-bold bg-white border-2 border-gray-200 rounded-2xl text-base hover:border-orange-300 hover:text-orange-600 transition-all">
                    See How It Works
                  </button>
                </Link>
              </div>

              {/* Trust Signals */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex -space-x-2">
                  {['RM', 'NK', 'VS', 'AG'].map((init, i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md"
                      style={{ background: ['#f97316', '#7c3aed', '#10b981', '#0ea5e9'][i] }}>
                      {init}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    <span className="text-sm font-bold text-gray-900 ml-1">4.9/5</span>
                  </div>
                  <p className="text-xs text-gray-500">Trusted by 500+ Top Venues</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>ISO 27001 Certified</span>
                </div>
              </div>
            </div>

            {/* Right — Dashboard Mockup Cards */}
            <div className="relative hidden lg:block">
              {/* Main Card */}
              <div className="animate-float bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Monthly Event Revenue</p>
                    <p className="text-3xl font-black text-gray-900">₹45,50,000</p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +15.2%
                  </div>
                </div>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1.5 h-16 mb-4">
                  {[40, 65, 45, 80, 60, 90, 75, 95, 70, 85, 92, 78].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md transition-all" style={{ height: `${h}%`, background: i === 10 ? '#f97316' : '#f3f4f6' }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Upcoming', val: '24 Events', color: 'orange' },
                    { label: 'Leads', val: '142 Active', color: 'violet' },
                    { label: 'Halls', val: '3/4 Booked', color: 'emerald' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-black text-gray-900">{item.val}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Booking Card */}
              <div className="animate-float-delay absolute -left-14 top-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-52 z-20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">New Booking Confirmed!</p>
                    <p className="text-[10px] text-gray-400">Sharma Wedding · 500 Pax</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-gray-600 flex justify-between">
                    <span>Advance Received</span>
                    <span className="text-emerald-500 font-semibold">₹1,50,000</span>
                  </div>
                  <div className="text-[11px] text-gray-600 flex justify-between">
                    <span>Grand Ballroom</span>
                    <span className="text-gray-400 font-medium">15 Nov</span>
                  </div>
                </div>
              </div>

              {/* Floating Lead Card */}
              <div className="absolute -right-10 bottom-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Hot Lead Assigned</p>
                    <p className="text-[10px] font-medium text-violet-600">Corporate Seminar · 200 Pax</p>
                  </div>
                </div>
              </div>

              {/* Background decorative circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-violet-50 rounded-[3rem] -z-10 transform translate-x-4 translate-y-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      {/* <section className="py-12 px-6 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { value: realStats?.totalBanquets ? formatNumber(Math.max(1, realStats.totalBanquets)) : '500+', label: 'Venues Managed', icon: <LayoutDashboard className="w-6 h-6 text-orange-500" />, bg: 'bg-orange-50' },
              { value: realStats?.totalOrders ? formatNumber(Math.max(1, realStats.totalOrders)) : '1.2L+', label: 'Events Hosted', icon: <CalendarCheck className="w-6 h-6 text-emerald-500" />, bg: 'bg-emerald-50' },
              { value: '₹500Cr+', label: 'Transactions Tracked', icon: <Receipt className="w-6 h-6 text-violet-500" />, bg: 'bg-violet-50' },
              { value: realStats?.totalCustomers ? formatNumber(Math.max(1, realStats.totalCustomers)) : '2M+', label: 'Happy Guests', icon: <Users className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50' },
              { value: '3x', label: 'Quotation Speed', icon: <Zap className="w-6 h-6 text-sky-500" />, bg: 'bg-sky-50' },
              { value: 'Zero', label: 'Double Bookings', icon: <ShieldCheck className="w-6 h-6 text-rose-500" />, bg: 'bg-rose-50' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-1`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ─── Features Section ─── */}
      <section id="features" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-full text-xs font-bold text-violet-600 mb-5">
              <Layers className="w-3.5 h-3.5" /> Core Modules
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Purpose-Built for <span className="shimmer-text">Banquet Operations</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Replace outdated diaries and messy spreadsheets with a unified system that handles everything from the first customer inquiry to the final event settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card card-hover bg-white rounded-[1.75rem] border border-gray-100 p-7 shadow-sm">
                <div className={`feature-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-${f.color}-50`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dashboard Showcase ─── */}
      <section id="dashboards" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-600 mb-5">
              <LayoutDashboard className="w-3.5 h-3.5" /> 4 Powerful Dashboards
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Perfect Tools for <span className="shimmer-text">Every Role</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From the Admin checking revenue, to the Captain taking orders, to the Chef viewing the KDS screen — everyone gets exactly what they need.
            </p>
          </div>

          <div className="space-y-8">

            {/* ── Management Dashboard ── */}
            <div className="card-hover bg-gradient-to-br from-orange-50 to-amber-50 rounded-[2rem] border border-orange-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">For Owners & Admins</p>
                      <h3 className="text-2xl font-black text-gray-900">Admin Control Center</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">The heart of your banquet operations. Monitor live revenue, manage your digital menu, track staff activity, and oversee all active orders in real-time.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Live Revenue Tracking',
                      'Menu & Category Management',
                      'Active Order Monitoring',
                      'Staff PIN & Role Management',
                      'QR Code Generator',
                      'Daily Analytics Reports',
                      'WhatsApp Integration (n8n)',
                      'Split Payment Tracking',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-orange-500" />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-[1.5rem] border border-orange-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Admin Overview</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-600 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Revenue Today', val: '₹1,24,500', color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Active Orders', val: '14', color: 'text-violet-600', bg: 'bg-violet-50' },
                      { label: 'Total Guests', val: '320', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Avg. Ticket', val: '₹4,500', color: 'text-sky-600', bg: 'bg-sky-50' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                        <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Customer QR Experience ── */}
            <div className="card-hover bg-gradient-to-br from-violet-50 to-purple-50 rounded-[2rem] border border-violet-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div className="order-2 lg:order-1 bg-white rounded-[1.5rem] border border-violet-100 p-6 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer QR Scan Experience</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-violet-50 rounded-2xl p-3">
                      <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Scan QR → Instant Menu</p>
                        <p className="text-[11px] text-gray-500">No app download. Just scan & order.</p>
                      </div>
                    </div>
                    {[
                      { emoji: '🛒', title: 'Smart Menu', sub: 'Category filter, search, bestseller tags' },
                      { emoji: '💳', title: 'Direct Checkout', sub: 'Easy split payments and tips' },
                      { emoji: '📍', title: 'Live Order Tracking', sub: 'Pending → Preparing → Ready → Served' },
                      { emoji: '⭐', title: 'Instant Reviews', sub: 'Feedback collected immediately' },
                    ].map(item => (
                      <div key={item.title} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{item.title}</p>
                          <p className="text-[11px] text-gray-500">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">For Diners & Guests</p>
                      <h3 className="text-2xl font-black text-gray-900">Customer Dashboard</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">Guests scan your QR code and get a beautiful, branded digital menu. They order, pay, and track progress — all from their phone browser. No app needed.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Instant QR Menu Access',
                      'No App Download Required',
                      'Live Order Status Tracking',
                      'Digital Waiter Calling',
                      'Pay Bills from Phone',
                      'Post-Order Star Ratings',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-violet-500" />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Kitchen Dashboard (KDS) ── */}
            <div className="card-hover bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] border border-emerald-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Utensils className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">For Chefs & Kitchen</p>
                      <h3 className="text-2xl font-black text-gray-900">Kitchen Display System (KDS)</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">Eliminate paper tickets. The KDS shows incoming orders instantly. Move items from 'New' to 'Preparing' to 'Ready' with a single tap.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Real-Time Order Sync',
                      '3-Column Kanban Board',
                      'Status Tracking per Item',
                      'Auto-hide Cancelled Orders',
                      'Visual Priority Markers',
                      'Zero Paper Wastage',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-500" />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-[1.5rem] border border-emerald-100 p-6 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Live KDS View</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { col: 'New', count: 4, color: 'bg-orange-500', items: ['Paneer Tikka', 'Masala Tea'] },
                      { col: 'Prep', count: 2, color: 'bg-amber-500', items: ['Spring Rolls'] },
                      { col: 'Ready', count: 1, color: 'bg-emerald-500', items: ['Cold Coffee'] },
                    ].map(c => (
                      <div key={c.col} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-500">{c.col}</span>
                          <span className={`w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center ${c.color}`}>{c.count}</span>
                        </div>
                        <div className="space-y-1">
                          {c.items.map(item => (
                            <div key={item} className="bg-white rounded p-1.5 text-[9px] font-medium text-gray-700 border border-gray-200">{item}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 rounded-full text-xs font-bold text-sky-600 mb-5">
              <Cpu className="w-3.5 h-3.5" /> Workflow
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Flawless Execution in <span className="shimmer-text">4 Steps</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From the first phone call to the final farewell, BanquetSaaS streamlines every touchpoint of your hospitality business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%-0px)] w-full h-px border-t-2 border-dashed border-sky-200 z-0" style={{ left: '50%', width: '100%' }} />
                )}
                <div className="card-hover bg-gradient-to-b from-sky-50 to-white rounded-[1.75rem] border border-sky-100 p-7 text-center relative z-10">
                  <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-200">
                    <span className="text-2xl font-black text-white">{step.num}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {/* <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">

            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Plans for <span className="shimmer-text">Every Venue Size</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Transparent pricing. No hidden implementation fees. Scale your hospitality business with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PLANS.map((plan, i) => (
              <div key={i} className={`relative rounded-[2rem] p-8 flex flex-col transition-all duration-300
                ${plan.popular
                  ? 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-2xl shadow-violet-200 scale-105'
                  : 'bg-white border border-gray-100 shadow-sm card-hover'
                }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-amber-400 text-amber-900 text-xs font-black rounded-full uppercase tracking-wider shadow-lg">
                    ⭐ Most Popular
                  </div>
                )}

                <div className="mb-7">
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${plan.popular ? 'text-violet-200' : 'text-gray-400'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-5xl font-black ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.popular ? 'text-violet-300' : 'text-gray-400'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm italic ${plan.popular ? 'text-violet-200' : 'text-gray-400'}`}>{plan.tagline}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-white/20' : 'bg-emerald-50'}`}>
                        <Check className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-emerald-500'}`} />
                      </div>
                      <span className={plan.popular ? 'text-violet-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f, j) => (
                    <li key={`x-${j}`} className="flex items-start gap-3 text-sm opacity-40">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100">
                        <X className="w-3 h-3 text-gray-400" />
                      </div>
                      <span className="text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full h-13 py-3.5 rounded-2xl font-bold text-sm transition-all
                  ${plan.popular
                    ? 'bg-white text-violet-700 hover:bg-violet-50 hover:scale-105 shadow-lg'
                    : 'btn-primary text-white shadow-md'
                  }`}>
                  {plan.price === 'Custom' ? 'Contact Sales →' : 'Start Free Trial →'}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            All plans include a <strong className="text-gray-600">14-day free trial</strong>. No credit card required. Cancel anytime.
          </p>
        </div>
      </section> */}

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-600 mb-5">
              <Star className="w-3.5 h-3.5 fill-amber-500" /> Success Stories
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Trusted by Top <span className="shimmer-text">Banquet Owners</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-hover bg-white rounded-[1.75rem] border border-gray-100 p-7 shadow-sm">
                <div className="flex items-center gap-1 mb-5">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 leading-relaxed text-sm mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                    style={{ background: { orange: '#f97316', violet: '#7c3aed', emerald: '#10b981' }[t.color as string] }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 rounded-full text-xs font-bold text-sky-600 mb-5">
              <MessageSquare className="w-3.5 h-3.5" /> FAQ
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
              Questions? <span className="shimmer-text">We've Got Answers.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-[#FAFAF8] rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section id="contact" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden p-12 md:p-20 text-center" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #ede9fe 100%)' }}>
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full opacity-30 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-200 rounded-full opacity-30 translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-orange-200 rounded-full text-xs font-bold text-orange-600 mb-6 shadow-sm">
                <Zap className="w-3.5 h-3.5" /> Start Digitizing Your Venue Today
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-5 tracking-tight">
                Ready to Transform<br />Your Banquet Operations?
              </h2>
              <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
                Join 500+ banquet owners who are closing more bookings, eliminating errors, and scaling effortlessly with BanquetSaaS.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* <Link href="#pricing">
                  <button className="h-14 px-10 text-white font-bold btn-primary rounded-2xl text-base shadow-xl flex items-center gap-2">
                    Launch Your Banquet <ChevronRight className="w-5 h-5" />
                  </button>
                </Link> */}
                <a href="https://wa.me/918252472186?text=Hi%2C%20I%20would%20like%20to%20book%20a%20free%20demo%20for%20BanquetSaaS." target="_blank" rel="noopener noreferrer">
                  <button className="h-14 px-10 text-gray-700 font-bold bg-white border-2 border-gray-200 rounded-2xl text-base hover:border-orange-300 transition-all shadow-sm">
                    Book a Free Demo
                  </button>
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-6">Setup in under 2 hours · Dedicated Onboarding Manager · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 btn-primary rounded-xl flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black text-white">Banquet<span className="text-orange-400">SaaS</span></span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                The complete venue management software for modern banquet halls, resorts, and event spaces.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm">
                {['Event Calendar', 'Quotations & Invoicing', 'CRM & Leads', 'Catering Management', 'Vendor Tracking'].map(item => (
                  <li key={item}><Link href="#features" className="hover:text-orange-400 transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm">
                {['About Us', 'Success Stories', 'Partner Program', 'Careers', 'Contact'].map(item => (
                  <li key={item}><button className="hover:text-orange-400 transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm">
                {['Terms of Service', 'Privacy Policy', 'Data Security', 'Refund Policy', 'SLA'].map(item => (
                  <li key={item}><button className="hover:text-orange-400 transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">© 2026 BanquetSaaS · Advanced Multi-Property Event Infrastructure.</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational · 99.9% uptime
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
