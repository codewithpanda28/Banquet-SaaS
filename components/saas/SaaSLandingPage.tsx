'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutDashboard, Utensils, Zap, Globe, Smartphone, BarChart3 } from 'lucide-react';

export default function SaaSLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* 🔮 Background Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      {/* 🧭 Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer transition-transform duration-300 hover:scale-105">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              RestroSaaS <span className="text-purple-500">.</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors uppercase tracking-widest text-[10px]">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors uppercase tracking-widest text-[10px]">Pricing</Link>
            <Link href="/login" className="px-5 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all">Admin Login</Link>
            <Link href="/register" className="px-5 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all shadow-xl shadow-white/10">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* 🚀 Hero Section */}
      <section className="pt-24 pb-32 px-6 relative">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-400 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Empowering 100+ Restaurants Globally
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-[1.05]">
            One Dashboard <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent italic">Scale Everything.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-gray-400 text-lg mb-12 leading-relaxed">
            Revolutionize your dining experience with AR menus, real-time analytics, and automated n8n workflows. Built for high-volume restaurant groups.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="h-14 px-10 bg-white text-black rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10 group">
              Launch Your Store <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="h-14 px-10 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-all">
              Live Demo
            </button>
          </div>

          {/* 🖼 Dashboard Mockup */}
          <div className="mt-20 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-blue-500/20 blur-[100px] -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="rounded-[2.5rem] border border-white/10 p-4 bg-white/5 backdrop-blur-sm overflow-hidden transform group-hover:rotate-1 group-hover:scale-[1.02] transition-all duration-700">
              <img 
                src="/saas_dashboard_mockup_1774700691327.png" 
                alt="Dashboard Mockup" 
                className="rounded-[1.5rem] w-full shadow-3xl"
              />
            </div>
            
            {/* ✨ Multi-Tenant Labels */}
            <div className="absolute -top-10 -left-10 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl hidden lg:block transform hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-2xl"><Globe className="w-6 h-6 text-green-400" /></div>
                <div className="text-left leading-tight">
                  <div className="text-sm font-bold">Custom Domains</div>
                  <div className="text-xs text-gray-400">restaurant1.com</div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl hidden lg:block transform hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-2xl"><Zap className="w-6 h-6 text-purple-400" /></div>
                <div className="text-left leading-tight">
                  <div className="text-sm font-bold">AI Workflow</div>
                  <div className="text-xs text-gray-400">n8n Integrated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 Features Section */}
      <section id="features" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Built for modern <br/> <span className="text-purple-500">Scale.</span></h2>
              <p className="text-gray-400 leading-relaxed italic">Everything you need to manage 10 or 100 locations effortlessly.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-1 line-through bg-purple-500/50 mb-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <LayoutDashboard className="w-8 h-8 text-blue-400" />, title: "Centralized HQ", desc: "Manage menus, staff, and analytics for all your restaurants from a single control center." },
              { icon: <Smartphone className="w-8 h-8 text-purple-400" />, title: "Digital Guest Flow", desc: "Interactive QR menus with real-time ordering directly linked to your kitchen display." },
              { icon: <BarChart3 className="w-8 h-8 text-green-400" />, title: "Live Insights", desc: "Data-driven decisions across all locations with powerful multi-tenant analytics." },
              { icon: <Zap className="w-8 h-8 text-yellow-400" />, title: "Automation Engine", desc: "Seamless n8n integration for webhooks, marketing, and stock alerts." },
              { icon: <Utensils className="w-8 h-8 text-red-400" />, title: "Smart Inventory", desc: "Real-time stock tracking with intelligent alerts when supplies run low." },
              { icon: <Globe className="w-8 h-8 text-indigo-400" />, title: "Custom Branding", desc: "Each restaurant gets its own theme, logo, and domain while running on your core engine." }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group">
                <div className="mb-6 p-4 w-fit bg-black/40 rounded-2xl group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 💰 Pricing & Plans */}
      <section id="pricing" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight italic">Plans Built for <span className="text-purple-500">Every Stage.</span></h2>
              <p className="text-gray-400 italic">Scale your restaurant group with predictable, transparent pricing.</p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all flex flex-col">
                  <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Starter Nucleus</h3>
                      <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">₹1,499</span>
                          <span className="text-xs text-gray-500">/mo</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">Perfect for a single modern outlet</p>
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Professional QR Menu</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Admin & Waiter Dashboards</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> WhatsApp Order Bot</li>
                      <li className="flex items-center gap-3 text-sm text-gray-500 line-through">Custom Domain</li>
                  </ul>
                  <button className="h-14 w-full rounded-2xl border border-white/10 font-bold hover:bg-white/5 transition-all">Get Started</button>
              </div>

              {/* Professional */}
              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-2 border-purple-500/30 relative flex flex-col scale-105 shadow-2xl shadow-purple-500/10">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-xs font-black rounded-full text-white uppercase tracking-widest">Most Popular</div>
                  <div className="mb-8 font-black">
                      <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4">Professional HQ</h3>
                      <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">₹3,999</span>
                          <span className="text-xs text-purple-400">/mo</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 italic">The industry standard for scale</p>
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Everything in Starter</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> <strong>Custom Domains</strong> (e.g. kfc.com)</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Kitchen Display (KDS)</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Advanced Analytics</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-purple-500" /> Priority n8n Workflows</li>
                  </ul>
                  <button className="h-14 w-full rounded-2xl bg-white text-black font-black hover:scale-105 transition-all shadow-xl shadow-white/10">Authorize Deployment</button>
              </div>

              {/* Enterprise */}
              <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col">
                  <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Empire Node</h3>
                      <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">Custom</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">Bespoke infrastructure for groups</p>
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-blue-500" /> Multi-Location Global HQ</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-blue-500" /> White-Label Partner Panel</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-blue-500" /> 24/7 Dedicated Concierge</li>
                      <li className="flex items-center gap-3 text-sm text-gray-300"><Zap className="w-4 h-4 text-blue-500" /> Custom SIEM Security</li>
                  </ul>
                  <button className="h-14 w-full rounded-2xl border border-white/10 font-bold hover:bg-white/5 transition-all">Contact Intelligence</button>
              </div>
          </div>
      </section>

      {/* 🚀 Final CTA */}
      <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto rounded-[3rem] bg-black border border-white/10 p-12 md:p-20 text-center relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter italic">Ready to transform your business?</h2>
              <p className="text-gray-400 mb-10 text-lg">Join the restaurants that are scaling 3x faster with our SaaS infrastructure.</p>
              <button className="px-12 py-5 bg-white text-black rounded-full font-black text-lg hover:scale-110 active:scale-95 transition-all shadow-xl shadow-white/20">
                Launch Your First Node
              </button>
          </div>
      </section>

      {/* 🏁 Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-60">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold tracking-tight">RestroSaaS</span>
          </div>
          <div className="text-xs text-gray-500">
            © 2026 RestroSaaS Engine. Advanced Multi-Tenant Infrastructure.
          </div>
          <div className="flex gap-6 text-xs font-medium">
            <button className="hover:text-white transition-colors">Terms</button>
            <button className="hover:text-white transition-colors">Privacy</button>
            <button className="hover:text-white transition-colors">Security</button>
          </div>
        </div>
      </footer>

      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[#0A0A0A] -z-20">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease forwards;
        }
      `}</style>
    </div>
  );
}
