'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, LayoutDashboard, Utensils, Zap, Globe, Smartphone, BarChart3,
  Star, Check, ArrowRight, Menu, X, QrCode, Bell, ShieldCheck, TrendingUp,
  Users, Clock, Layers, Cpu, MessageSquare, ChevronDown, Award, Package
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Dashboards', href: '#dashboards' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

const FEATURES = [
  {
    icon: <LayoutDashboard className="w-7 h-7 text-orange-500" />,
    title: 'Centralized HQ Dashboard',
    desc: 'Manage menus, staff, orders, and analytics for all your restaurant branches from a single powerful control center.',
    color: 'orange',
  },
  {
    icon: <QrCode className="w-7 h-7 text-violet-500" />,
    title: 'Smart QR Menu System',
    desc: 'Generate dynamic QR codes for each table. Customers scan, browse your menu, and place orders instantly — no app needed.',
    color: 'violet',
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-emerald-500" />,
    title: 'Real-Time Analytics',
    desc: 'Data-driven decisions with live sales tracking, best-seller insights, and revenue forecasting across all locations.',
    color: 'emerald',
  },
  {
    icon: <Zap className="w-7 h-7 text-amber-500" />,
    title: 'n8n Automation Engine',
    desc: 'Auto-trigger WhatsApp messages, email alerts, stock reorder requests, and marketing campaigns via n8n workflows.',
    color: 'amber',
  },
  {
    icon: <Smartphone className="w-7 h-7 text-sky-500" />,
    title: 'Kitchen Display System',
    desc: 'Orders appear instantly on kitchen screens. Cook smarter, reduce errors, and serve faster with real-time KDS integration.',
    color: 'sky',
  },
  {
    icon: <Globe className="w-7 h-7 text-rose-500" />,
    title: 'Custom Domain & Branding',
    desc: 'Each restaurant gets its own domain (e.g., kfc.yourchain.com), custom theme, logo, and brand colors — fully white-labeled.',
    color: 'rose',
  },
  {
    icon: <Package className="w-7 h-7 text-indigo-500" />,
    title: 'Smart Inventory Alerts',
    desc: 'Real-time stock tracking with intelligent low-stock alerts, auto-reorder triggers, and supplier management tools.',
    color: 'indigo',
  },
  {
    icon: <Users className="w-7 h-7 text-teal-500" />,
    title: 'Staff & Role Management',
    desc: 'Set up Admin, Waiter, Kitchen, and Super Admin roles. Control access, shifts, and responsibilities effortlessly.',
    color: 'teal',
  },
  {
    icon: <Award className="w-7 h-7 text-pink-500" />,
    title: 'Loyalty & Referral Engine',
    desc: 'Reward repeat customers with loyalty points, digital coupons, and a viral referral system to grow your customer base.',
    color: 'pink',
  },
];

const STEPS = [
  { num: '01', title: 'Sign Up & Configure', desc: 'Create your account, set up your restaurant profile, upload your menu, and customize your brand colors in minutes.' },
  { num: '02', title: 'Generate QR Codes', desc: 'Print your smart QR codes for each table. Customers scan to access your live digital menu instantly on their phone.' },
  { num: '03', title: 'Manage Orders Live', desc: 'Orders flow directly to your kitchen display. Waiters get notified. Admins track everything in real-time.' },
  { num: '04', title: 'Grow with Insights', desc: 'Analyze trends, automate marketing, issue loyalty points, and scale to multiple branches from one dashboard.' },
];

const STATS = [
  { value: '100+', label: 'Restaurants Onboarded', icon: <Utensils className="w-6 h-6 text-orange-500" /> },
  { value: '50K+', label: 'Orders Processed Daily', icon: <TrendingUp className="w-6 h-6 text-emerald-500" /> },
  { value: '99.9%', label: 'Uptime Guarantee', icon: <ShieldCheck className="w-6 h-6 text-violet-500" /> },
  { value: '3x', label: 'Faster Service Time', icon: <Clock className="w-6 h-6 text-amber-500" /> },
];

const PLANS = [
  {
    name: 'Starter Nucleus',
    price: '₹1,499',
    period: '/mo',
    tagline: 'Perfect for a single modern outlet',
    color: 'orange',
    features: [
      'Professional QR Menu (Unlimited Items)',
      'Admin & Waiter Role Dashboards',
      'Kitchen Display System (KDS)',
      'WhatsApp Order Notifications',
      'Basic Analytics & Reports',
      'Email Support',
    ],
    missing: ['Custom Domain', 'Multi-Branch', 'n8n Automation', 'Loyalty Engine'],
  },
  {
    name: 'Professional HQ',
    price: '₹3,999',
    period: '/mo',
    tagline: 'The industry standard for scale',
    color: 'violet',
    popular: true,
    features: [
      'Everything in Starter',
      'Custom Domain (e.g. yourbrand.com)',
      'Multi-Branch Management (up to 5)',
      'Advanced Real-Time Analytics',
      'n8n Automation Workflows',
      'Loyalty & Referral Engine',
      'Smart Inventory Alerts',
      'Priority Support (24h response)',
    ],
    missing: [],
  },
  {
    name: 'Empire Node',
    price: 'Custom',
    period: '',
    tagline: 'Bespoke infra for large restaurant groups',
    color: 'sky',
    features: [
      'Unlimited Branches & Users',
      'White-Label Partner Panel',
      'Custom SIEM Security Setup',
      'Dedicated Success Manager',
      '24/7 SLA Concierge Support',
      'Custom API Integrations',
      'On-Premise Deployment Option',
      'Quarterly Business Reviews',
    ],
    missing: [],
  },
];

const TESTIMONIALS = [
  {
    name: 'Arjun Mehta',
    role: 'Owner, The Spice Route (Mumbai)',
    text: 'RestroSaaS completely transformed how we operate. Our order accuracy went up 40% and we saved 2 hours of manual work every day.',
    rating: 5,
    avatar: 'AM',
    color: 'orange',
  },
  {
    name: 'Priya Sharma',
    role: 'Operations Head, Curry Kingdom (Delhi)',
    text: 'The multi-branch dashboard is a game changer. I can monitor all 4 locations in real-time from one screen. Absolutely love it.',
    rating: 5,
    avatar: 'PS',
    color: 'violet',
  },
  {
    name: 'Rahul Verma',
    role: 'F&B Director, CloudBite Group (Bangalore)',
    text: 'n8n automation saved us ₹80,000/month in manual operations. The QR menu system alone paid for itself in the first week.',
    rating: 5,
    avatar: 'RV',
    color: 'emerald',
  },
];

const FAQS = [
  { q: 'Do I need technical knowledge to set up RestroSaaS?', a: 'Not at all! Our onboarding wizard guides you step-by-step. Most restaurants go live within 2 hours of signing up.' },
  { q: 'Can I manage multiple restaurant branches?', a: 'Yes! The Professional HQ plan supports up to 5 branches. For larger groups, our Empire Node plan offers unlimited branches with dedicated support.' },
  { q: 'How does the QR menu system work?', a: 'You generate a unique QR code for each table via the dashboard. Customers scan it with their phone camera (no app download needed) and a beautifully designed digital menu opens instantly.' },
  { q: 'What is n8n automation and how does it help?', a: 'n8n is a workflow automation tool we integrate with. It lets you auto-send WhatsApp messages for order confirmations, trigger low-stock alerts, run marketing campaigns and more — without any coding.' },
  { q: 'Is my data secure?', a: "Absolutely. We use bank-grade encryption, RLS (Row-Level Security) via Supabase, and each restaurant's data is fully isolated. Your data is never shared across tenants." },
];

export default function SaaSLandingPage({ realStats }: { realStats?: {
  totalRestaurants: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  totalStaff: number;
} }) {
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
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Restro<span className="text-orange-500">SaaS</span>
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
            <Link href="#pricing" className="px-5 py-2.5 text-sm font-semibold text-orange-600 border-2 border-orange-200 rounded-xl hover:bg-orange-50 transition-all">
              View Plans
            </Link>
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
                100+ Restaurants Growing on RestroSaaS
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] mb-6 tracking-tight text-gray-900">
                One Dashboard to{' '}
                <span className="shimmer-text">Scale Every</span>{' '}
                Restaurant.
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                The all-in-one restaurant management platform with smart QR menus, real-time kitchen display, multi-branch analytics, and powerful n8n automation — designed for serious restaurateurs.
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
                  {['AM', 'PS', 'RV', 'KT'].map((init, i) => (
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
                  <p className="text-xs text-gray-500">Trusted by 100+ restaurants</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            {/* Right — Dashboard Mockup Cards */}
            <div className="relative hidden lg:block">
              {/* Main Card */}
              <div className="animate-float bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Today's Revenue</p>
                    <p className="text-3xl font-black text-gray-900">₹1,24,580</p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +23.4%
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
                    { label: 'Orders', val: '347', color: 'orange' },
                    { label: 'Tables', val: '28/32', color: 'violet' },
                    { label: 'Staff', val: '12', color: 'emerald' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-black text-gray-900">{item.val}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Order Card */}
              <div className="animate-float-delay absolute -left-14 top-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-52 z-20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                    <Bell className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">New Order!</p>
                    <p className="text-[10px] text-gray-400">Table 7 · Just now</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {['Butter Chicken', 'Garlic Naan x2', 'Mango Lassi'].map(item => (
                    <div key={item} className="text-[11px] text-gray-600 flex justify-between">
                      <span>{item}</span>
                      <span className="text-emerald-500 font-semibold">✓</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating QR Card */}
              <div className="absolute -right-10 bottom-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">QR Scans Today</p>
                    <p className="text-lg font-black text-violet-600">1,247</p>
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
      <section className="py-12 px-6 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { value: realStats?.totalRestaurants ? formatNumber(Math.max(1, realStats.totalRestaurants)) : '100+', label: 'Restaurants Onboarded', icon: <Utensils className="w-6 h-6 text-orange-500" />, bg: 'bg-orange-50' },
              { value: realStats?.totalOrders ? formatNumber(Math.max(1, realStats.totalOrders)) : '50K+', label: 'Orders Processed', icon: <TrendingUp className="w-6 h-6 text-emerald-500" />, bg: 'bg-emerald-50' },
              { value: '99.9%', label: 'Platform Uptime', icon: <ShieldCheck className="w-6 h-6 text-violet-500" />, bg: 'bg-violet-50' },
              { value: realStats?.totalCustomers ? formatNumber(Math.max(1, realStats.totalCustomers)) : '1.2L+', label: 'Happy Customers', icon: <Users className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50' },
              { value: realStats?.totalStaff ? formatNumber(Math.max(1, realStats.totalStaff)) : '500+', label: 'Staff Managed', icon: <Award className="w-6 h-6 text-sky-500" />, bg: 'bg-sky-50' },
              { value: '₹' + (realStats?.totalRevenue ? formatNumber(Math.max(10, realStats.totalRevenue)) : '2Cr+'), label: 'Revenue Processed', icon: <BarChart3 className="w-6 h-6 text-rose-500" />, bg: 'bg-rose-50' },
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
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-full text-xs font-bold text-violet-600 mb-5">
              <Layers className="w-3.5 h-3.5" /> Everything You Need
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Built for Modern <span className="shimmer-text">Restaurant Operations</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Every feature designed to save time, reduce costs, and delight your customers — from first scan to final bill.
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
              <LayoutDashboard className="w-3.5 h-3.5" /> 5 Powerful Dashboards
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Every Role Gets Their <span className="shimmer-text">Perfect Workspace</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From the kitchen chef to the super admin — every team member has a dedicated, optimized interface built for their exact needs.
            </p>
          </div>

          <div className="space-y-8">

            {/* ── Admin Dashboard ── */}
            <div className="card-hover bg-gradient-to-br from-orange-50 to-amber-50 rounded-[2rem] border border-orange-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                      <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">For Restaurant Owners</p>
                      <h3 className="text-2xl font-black text-gray-900">Admin Dashboard</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">The complete command center. Monitor live revenue, approve orders, manage your entire menu, run flash sales, and download reports — all from one screen.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Live Revenue Tracking (Today / Week / Month)',
                      'Order Approval with Sound Alert',
                      'Menu & Category Management',
                      'Flash Sale Broadcast via WhatsApp',
                      'Customer Wallet & Loyalty Rules',
                      'Split Payment (Cash + UPI)',
                      'Kitchen Status Monitor',
                      'Daily Report via WhatsApp',
                      'Staff Management & Passcodes',
                      'QR Code Generator per Table',
                      'Inventory Low-Stock Alerts',
                      'Coupon & Discount Engine',
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Dashboard Preview</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-600 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Revenue Today', val: '₹1,24,580', color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Active Orders', val: '23', color: 'text-violet-600', bg: 'bg-violet-50' },
                      { label: 'Total Customers', val: '1,847', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Avg. Ticket', val: '₹485', color: 'text-sky-600', bg: 'bg-sky-50' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                        <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { bill: 'BILL240001', table: 'T-7', status: 'Preparing', statusColor: 'bg-amber-100 text-amber-700', total: '₹680' },
                      { bill: 'BILL240002', table: 'T-3', status: 'Ready', statusColor: 'bg-emerald-100 text-emerald-700', total: '₹1,250' },
                      { bill: 'BILL240003', table: 'T-11', status: 'Pending', statusColor: 'bg-orange-100 text-orange-700', total: '₹340' },
                    ].map(o => (
                      <div key={o.bill} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500">#{o.bill}</span>
                          <span className="text-xs font-medium text-gray-700">{o.table}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${o.statusColor}`}>{o.status}</span>
                          <span className="text-xs font-black text-gray-900">{o.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Kitchen Dashboard ── */}
            <div className="card-hover bg-gradient-to-br from-rose-50 to-red-50 rounded-[2rem] border border-rose-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div className="order-2 lg:order-1 bg-white rounded-[1.5rem] border border-rose-100 p-6 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Kitchen Display System</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { col: 'New Orders', count: 4, color: 'bg-orange-500', items: ['Butter Chicken', 'Garlic Naan x2', 'Masala Tea'] },
                      { col: 'Preparing', count: 7, color: 'bg-amber-500', items: ['Biryani (Veg)', 'Paneer Tikka', 'Dal Makhani'] },
                      { col: 'Ready', count: 2, color: 'bg-emerald-500', items: ['Caesar Salad', 'Cold Coffee'] },
                    ].map(c => (
                      <div key={c.col} className="bg-gray-50 rounded-2xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{c.col}</span>
                          <span className={`w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center ${c.color}`}>{c.count}</span>
                        </div>
                        <div className="space-y-1.5">
                          {c.items.map(item => (
                            <div key={item} className="bg-white rounded-lg px-2.5 py-2 text-[10px] font-medium text-gray-700 border border-gray-100">{item}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 bg-rose-50 rounded-2xl px-4 py-3">
                    <Bell className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-rose-700">Auto-refreshes every 2 seconds — Zero missed orders!</span>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                      <Utensils className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">For Chefs & Kitchen Staff</p>
                      <h3 className="text-2xl font-black text-gray-900">Kitchen Dashboard (KDS)</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">A focused, distraction-free kitchen display system with 3-column order flow. No paperwork, no shouting — just fast, accurate cooking.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      '3-Column Flow: New → Preparing → Ready',
                      'Real-Time Order Sync (2s Heartbeat)',
                      'Per-Item Status Tracking',
                      'Dine-In / Takeaway / Delivery Filter',
                      'Smart Order Visibility Rules',
                      'Auto-hides Cancelled Orders',
                      'Order Priority Queue',
                      'Customer Update Approvals',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-rose-500" />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Waiter Dashboard ── */}
            <div className="card-hover bg-gradient-to-br from-violet-50 to-purple-50 rounded-[2rem] border border-violet-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">For Floor Staff</p>
                      <h3 className="text-2xl font-black text-gray-900">Waiter Dashboard</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">Waiters log in with a 4-digit PIN, select their table, browse the menu, build the cart, and send orders to the kitchen — in under 30 seconds.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      '4-Digit PIN Secure Login',
                      'Live Table Status Grid (Available / Occupied / Reserved)',
                      'Full Menu Browse & Cart Builder',
                      'Search & Category Filter',
                      'Add Items to Existing Bills',
                      'Customer Name & Phone Capture',
                      'New Order Approval Pop-up',
                      'Order Accept / Reject with Sound Alert',
                      'Auto Bill Merge (Same Table)',
                      'WhatsApp Webhook Trigger on Order',
                      'Real-Time Table Status Sync',
                      'Staff Login Activity Tracking',
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
                <div className="bg-white rounded-[1.5rem] border border-violet-100 p-6 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Table Status Overview</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Available', count: 12, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Occupied', count: 16, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Reserved', count: 3, color: 'text-rose-600', bg: 'bg-rose-50' },
                      { label: 'Total Tables', count: 32, color: 'text-violet-600', bg: 'bg-violet-50' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                        <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div key={i} className={`rounded-xl py-2 text-center text-[10px] font-black ${[1, 3, 5, 8, 10, 13].includes(i) ? 'bg-orange-100 text-orange-700' :
                        [2, 11].includes(i) ? 'bg-rose-100 text-rose-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>T-{i + 1}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Customer Dashboard ── */}
            <div className="card-hover bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] border border-emerald-100 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div className="order-2 lg:order-1 bg-white rounded-[1.5rem] border border-emerald-100 p-6 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer QR Scan Experience</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Scan QR → Instant Menu</p>
                        <p className="text-[11px] text-gray-500">No app download. Just scan & order.</p>
                      </div>
                    </div>
                    {[
                      { emoji: '🛒', title: 'Smart Cart with Veg/Non-Veg badges', sub: 'Category filter, search, bestseller tags' },
                      { emoji: '💳', title: 'Checkout: Dine-In / Takeaway / Delivery', sub: 'Razorpay, UPI, Cash on delivery' },
                      { emoji: '📍', title: 'Live Order Tracking', sub: 'Pending → Preparing → Ready → Served' },
                      { emoji: '🏆', title: 'Loyalty Points & Referral', sub: 'Earn points every order, redeem rewards' },
                      { emoji: '⭐', title: 'Review & Rating System', sub: 'Per-dish ratings after order completes' },
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
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">For Diners</p>
                      <h3 className="text-2xl font-black text-gray-900">Customer Dashboard</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">Customers scan your QR code and get a beautiful, branded digital menu. They order, pay, and track progress — all from their phone browser. No app needed.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'QR Menu (No App Needed)',
                      'Dine-In · Takeaway · Delivery Modes',
                      'Veg / Non-Veg Filter',
                      'Bestseller & Featured Badges',
                      'Search & Category Navigation',
                      'Razorpay Online Payment',
                      'Live Order Status Tracking',
                      'Order History Page',
                      'Loyalty Points Wallet',
                      'Refer & Earn (Viral Referral)',
                      'Post-Order Star Ratings',
                      'Upsell Suggestions at Checkout',
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
              </div>
            </div>

            {/* ── Super Admin ── */}
            <div className="card-hover bg-gradient-to-br from-slate-800 to-gray-900 rounded-[2rem] border border-slate-700 p-8 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Platform Owner</p>
                      <h3 className="text-2xl font-black text-white">Super Admin Command Center</h3>
                    </div>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-6">The top-level control panel for the SaaS platform owner. Monitor all restaurants, manage tenants, resolve support tickets, and control platform-wide settings.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Multi-Tenant Restaurant Management',
                      'Onboard New Restaurant in Minutes',
                      'Custom Domain Assignment',
                      'Platform-wide Analytics',
                      'Support Ticket (SOS) System',
                      'Coin Balance per Restaurant',
                      'Plan & Billing Management',
                      'Global Webhook & n8n Control',
                    ].map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-[1.5rem] border border-slate-600 p-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Platform Overview</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Live Restaurants', val: '47', color: 'text-amber-400' },
                      { label: 'Total Orders Today', val: '12,840', color: 'text-emerald-400' },
                      { label: 'Open SOS Tickets', val: '3', color: 'text-rose-400' },
                      { label: 'Platform Revenue', val: '₹3.2L', color: 'text-sky-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-800/80 rounded-2xl p-4">
                        <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Spice Route Mumbai', domain: 'spiceroute.in', status: 'Active', coins: 240 },
                      { name: 'Curry Kingdom Delhi', domain: 'currykingdom.co', status: 'Active', coins: 118 },
                      { name: 'CloudBite Bangalore', domain: 'cloudbite.com', status: 'Trial', coins: 45 },
                    ].map(r => (
                      <div key={r.name} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-2.5">
                        <div>
                          <p className="text-xs font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-slate-400">{r.domain}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${r.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status}</span>
                          <span className="text-[10px] font-bold text-amber-400">🪙 {r.coins}</span>
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
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-600 mb-5">
              <Cpu className="w-3.5 h-3.5" /> Simple Setup
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Go Live in <span className="shimmer-text">4 Simple Steps</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No technical expertise needed. Most restaurants are fully operational within 2 hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%-0px)] w-full h-px border-t-2 border-dashed border-orange-200 z-0" style={{ left: '50%', width: '100%' }} />
                )}
                <div className="card-hover bg-gradient-to-b from-orange-50 to-white rounded-[1.75rem] border border-orange-100 p-7 text-center relative z-10">
                  <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-200">
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

      {/* ─── Highlight Banner ─── */}
      <section className="py-20 px-6 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">
              ⚡ Automate Your Entire Restaurant with n8n
            </h2>
            <p className="text-orange-100 text-lg max-w-2xl mx-auto">
              Connect WhatsApp, email, Slack, Razorpay, and 400+ apps. Every order, review, and alert — fully automated. Zero coding required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { emoji: '📱', title: 'WhatsApp Alerts', desc: 'Order confirmed, ready for pickup, delivery updates — all auto-sent via WhatsApp.' },
              { emoji: '📦', title: 'Stock Auto-Reorder', desc: 'When stock drops below threshold, auto-generate purchase orders to suppliers.' },
              { emoji: '🎯', title: 'Marketing Engine', desc: 'New customer joins? Auto-send welcome offer. Inactive for 7 days? Auto re-engage.' },
              { emoji: '📊', title: 'Daily Reports', desc: 'Every night at 10PM, get revenue, orders & kitchen stats on WhatsApp/Slack/Email.' },
            ].map(item => (
              <div key={item.title} className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
                <div className="text-2xl mb-2">{item.emoji}</div>
                <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-orange-100 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              'Order Confirmed → WhatsApp',
              'Low Stock → Auto Reorder',
              'New Customer → Welcome Email',
              'Daily Sales → Slack Report',
              'Review Posted → Thank You SMS',
              'Flash Sale → Bulk WhatsApp Blast',
              'Bill Paid → Loyalty Points Added',
              'Staff Login → Activity Logged',
            ].map(tag => (
              <div key={tag} className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-xs text-white font-semibold">
                {tag}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {/* <section id="pricing" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">

            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Plans for <span className="shimmer-text">Every Stage</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No hidden fees. No surprise charges. Scale your restaurant group with confidence.
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
      {/* <section id="testimonials" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-600 mb-5">
              <Star className="w-3.5 h-3.5 fill-amber-500" /> Real Stories
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Loved by <span className="shimmer-text">Restaurant Owners</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-hover bg-[#FAFAF8] rounded-[1.75rem] border border-gray-100 p-7">
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
      </section> */}

      {/* ─── FAQ ─── */}
      <section className="py-24 px-6 bg-[#FAFAF8]">
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
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
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
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden p-12 md:p-20 text-center" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #ede9fe 100%)' }}>
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full opacity-30 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-200 rounded-full opacity-30 translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-orange-200 rounded-full text-xs font-bold text-orange-600 mb-6 shadow-sm">
                <Zap className="w-3.5 h-3.5" /> 14-Day Free Trial — No Card Needed
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-5 tracking-tight">
                Ready to Transform<br />Your Restaurant?
              </h2>
              <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
                Join 100+ restaurant owners who are serving faster, earning more, and scaling effortlessly with RestroSaaS.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="#pricing">
                  <button className="h-14 px-10 text-white font-bold btn-primary rounded-2xl text-base shadow-xl flex items-center gap-2">
                    Launch Your Restaurant <ChevronRight className="w-5 h-5" />
                  </button>
                </Link>
                <button className="h-14 px-10 text-gray-700 font-bold bg-white border-2 border-gray-200 rounded-2xl text-base hover:border-orange-300 transition-all shadow-sm">
                  Book a Free Demo
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-6">Setup in under 2 hours · No technical skills needed · Cancel anytime</p>
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
                  <Utensils className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black text-white">Restro<span className="text-orange-400">SaaS</span></span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                The complete restaurant management SaaS platform for modern restaurateurs.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm">
                {['Features', 'Pricing', 'QR Menu System', 'Analytics', 'Automation'].map(item => (
                  <li key={item}><Link href="#features" className="hover:text-orange-400 transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm">
                {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map(item => (
                  <li key={item}><button className="hover:text-orange-400 transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Security', 'SLA'].map(item => (
                  <li key={item}><button className="hover:text-orange-400 transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">© 2026 RestroSaaS · Advanced Multi-Tenant Restaurant Infrastructure.</p>
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
