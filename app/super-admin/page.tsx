'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Globe, Settings, ExternalLink, Loader2, Search, MoreVertical, 
  LayoutDashboard, Utensils, Zap, BarChart3, TrendingUp, Users, 
  DollarSign, Trash2, X, Pencil, ImagePlus, CreditCard, ShieldCheck, 
  HelpCircle, ChevronRight, Eye, EyeOff, Send, Database, AppWindow,
  Clock, AlertCircle, CheckCircle2, MessageSquare, Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'analytics' | 'support' | 'settings'>('nodes');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Real Data State
  const [globalStats, setGlobalStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    revenueChange: 0,
    topNodes: [] as any[],
    revenueTrend: [] as any[]
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '', slug: '', custom_domain: '', primary_color: '#ef4444', admin_passcode: '', whatsapp_number: '', report_whatsapp_number: '', whatsapp_token: '', whatsapp_api_id: '', whatsapp_api_url: 'https://thinkaiq.in/api', logo_url: '', banner_url: '', coin_balance: 0, webhook_url: '', coin_deduction_per_order: 5
  });

  const [selectedRestro, setSelectedRestro] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');

  const handleNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const payload = { 
            ...formData,
            custom_domain: formData.custom_domain.trim() === '' ? null : formData.custom_domain.trim()
        };
        
        if (editingId) {
            const { error } = await supabase.from('restaurants').update(payload).eq('id', editingId);
            if (error) throw error;
            toast.success('Node alignment updated');
        } else {
            const { error } = await supabase.from('restaurants').insert([payload]);
            if (error) throw error;
            toast.success('New node deployed to network');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', slug: '', custom_domain: '', primary_color: '#ef4444', admin_passcode: '', whatsapp_number: '', report_whatsapp_number: '', whatsapp_token: '', whatsapp_api_id: '', whatsapp_api_url: 'https://thinkaiq.in/api', logo_url: '', banner_url: '', coin_balance: 0, webhook_url: '', coin_deduction_per_order: 5 });
        fetchRestaurants();
    } catch (error: any) {
        toast.error(error.message || 'Transmission failed');
    } finally {
        setIsLoading(false);
    }
  };

  const fetchGlobalStats = useCallback(async () => {
    try {
        const { data: orders } = await supabase.from('orders').select('total, created_at, restaurant_id, status').eq('status', 'completed');
        const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        if (orders) {
            const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
            const totalOrders = orders.length;
            const trend = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(new Date(), 6 - i);
                const dailyTotal = orders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')).reduce((sum, o) => sum + (o.total || 0), 0);
                return { day: format(date, 'MMM d'), revenue: dailyTotal };
            });
            const nodeSales = orders.reduce((acc: any, o) => { if (!acc[o.restaurant_id]) acc[o.restaurant_id] = 0; acc[o.restaurant_id] += o.total || 0; return acc; }, {});
            const sortedNodes = Object.entries(nodeSales).map(([id, revenue]) => ({ id, revenue: revenue as number, name: restaurants.find(r => r.id === id)?.name || 'Unknown Node' })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            setGlobalStats(prev => ({ ...prev, totalRevenue, totalOrders, totalCustomers: customerCount || 0, revenueTrend: trend, topNodes: sortedNodes }));
        }
    } catch (e) { console.error(e); }
  }, [restaurants]);

  const fetchTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*, restaurants(name)').order('created_at', { ascending: false });
    setTickets(data || []);
  };

  const fetchRestaurants = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    const auth = sessionStorage.getItem('saas_auth');
    if (auth === 'true') setIsAuthenticated(true);
    fetchRestaurants();
    fetchTickets();

    const channel = supabase.channel('global-hq-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => { fetchTickets(); })
        .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, []);

  useEffect(() => { if (restaurants.length > 0) fetchGlobalStats(); }, [restaurants, fetchGlobalStats]);

  const handleUpdateTicket = async (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
    if (!error) toast.success(`Record marked as ${status.toUpperCase()}`);
    else { toast.error('Sync Failed'); fetchTickets(); }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Erase this diagnostic signal?')) return;
    setTickets(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (error) { toast.error('Erase Failed'); fetchTickets(); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('saas_auth', 'true');
        toast.success('Authorized Hub Access!');
      } else {
        toast.error('Invalid Access Code');
      }
    } catch {
      toast.error('Auth server unreachable');
    }
  };

  const getFullLink = (path: string, restro: any) => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // If not localhost, and no custom domain, simply use the main Vercel app domain.
    // The middleware will rely entirely on the ?id= parameter, resolving the 404/DNS issue.
    let base = restro.custom_domain 
        ? `${protocol}//${restro.custom_domain}` 
        : `${protocol}//${hostname}`;
        
    const separator = path.includes('?') ? '&' : '?';
    return `${base}${path}${separator}id=${restro.id}`;
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-white text-center">
            <div className="w-full max-w-md bg-[#111111] border border-white/10 p-12 rounded-[4rem] relative overflow-hidden">
                <div className="absolute inset-0 bg-purple-600/10 blur-[90px]" />
                <Zap className="text-purple-500 w-16 h-16 mb-8 mx-auto relative z-10" />
                <h1 className="text-4xl font-black italic mb-8 relative z-10">SaaS Hub</h1>
                <form onSubmit={handleAuth} className="space-y-6 relative z-10">
                    <input type="password" placeholder="Passcode" className="w-full bg-black border border-white/10 p-6 rounded-[2rem] text-center font-black tracking-widest outline-none" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
                    <button type="submit" className="w-full bg-white text-black font-black py-6 rounded-[2rem] uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Execute Authorization</button>
                </form>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-20 lg:w-72 border-r border-white/5 flex flex-col py-10 px-4 bg-[#0A0A0A] z-40">
            <div className="flex items-center gap-3 mb-16 px-4">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center"><Zap size={24} /></div>
                <span className="text-xl font-bold italic hidden lg:block tracking-tight uppercase">RestroSaaS HQ</span>
            </div>
            <nav className="flex-1 space-y-3">
                {[
                    { id: 'nodes', label: 'Network Control', icon: <LayoutDashboard size={20} /> },
                    { id: 'analytics', label: 'Global Intel', icon: <BarChart3 size={20} /> },
                    { id: 'support', label: 'Emergency Hub', icon: <AlertCircle size={20} /> },
                    { id: 'settings', label: 'Platform Hub', icon: <Settings size={20} /> }
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white text-black font-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{item.icon}<span className="hidden lg:block uppercase tracking-widest text-[10px]">{item.label}</span></button>
                ))}
            </nav>
        </div>

        <div className="flex-1 overflow-y-auto relative p-8 md:p-12 h-screen custom-scrollbar">
            <div className="max-w-7xl mx-auto pb-40">
                {activeTab === 'nodes' && (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div><h1 className="text-3xl font-black italic tracking-tighter mb-1">Platform Nodes</h1><p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">{restaurants.length} Neural Links Identified</p></div>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Locate node..." className="bg-white/5 border border-white/10 rounded-xl py-3 px-6 w-48 text-sm focus:ring-1 focus:ring-purple-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <button onClick={() => { setEditingId(null); setFormData({ name: '', slug: '', custom_domain: '', primary_color: '#ef4444', admin_passcode: '', whatsapp_number: '', report_whatsapp_number: '', whatsapp_token: '', whatsapp_api_id: '', whatsapp_api_url: 'https://thinkaiq.in/api', logo_url: '', banner_url: '', coin_balance: 0, webhook_url: '', coin_deduction_per_order: 5 }); setIsModalOpen(true); }} className="bg-white text-black font-black px-6 py-3 rounded-xl flex items-center gap-2 text-xs transition-all shadow-xl hover:scale-105"><Plus size={16} /> Deploy Node</button>
                            </div>
                        </header>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {restaurants.filter(r => r.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(restaurant => (
                                <div key={restaurant.id} className="bg-[#111111] border border-white/5 p-6 rounded-3xl hover:border-purple-500/40 transition-all duration-500 flex flex-col justify-between group h-full relative overflow-hidden">
                                     <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-xl text-gray-400 group-hover:text-white border border-white/5">{restaurant.name?.[0]}</div>
                                            <div className="flex flex-col items-end gap-1"><div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[8px] font-black uppercase border border-green-500/20">Active</div></div>
                                        </div>
                                        <h3 className="text-xl font-black mb-1 tracking-tight group-hover:text-purple-400 uppercase italic">{restaurant.name}</h3>
                                        <p className="text-[9px] text-gray-500 font-mono tracking-tighter truncate opacity-60 group-hover:opacity-100">{restaurant.custom_domain || `${restaurant.slug}.restrohq.io`}</p>
                                    </div>
                                    <div className="flex gap-2 mt-6 relative z-10">
                                        <button onClick={() => setSelectedRestro(restaurant)} className="flex-1 bg-purple-600 font-black py-3 rounded-xl text-[9px] uppercase shadow-lg text-white hover:bg-purple-500 transition-all">Terminal</button>
                                        <button onClick={() => { setEditingId(restaurant.id); setFormData({ name: restaurant.name || '', slug: restaurant.slug || '', custom_domain: restaurant.custom_domain || '', primary_color: restaurant.primary_color || '#ef4444', admin_passcode: restaurant.admin_passcode || '', whatsapp_number: restaurant.whatsapp_number || '', report_whatsapp_number: restaurant.report_whatsapp_number || '', whatsapp_token: restaurant.whatsapp_token || '', whatsapp_api_id: restaurant.whatsapp_api_id || '', whatsapp_api_url: restaurant.whatsapp_api_url || 'https://thinkaiq.in/api', logo_url: restaurant.logo_url || '', banner_url: restaurant.banner_url || '', coin_balance: restaurant.coin_balance || 0, webhook_url: restaurant.webhook_url || '', coin_deduction_per_order: restaurant.coin_deduction_per_order !== undefined ? restaurant.coin_deduction_per_order : 5 }); setIsModalOpen(true); }} className="px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"><Pencil size={14} className="text-gray-400" /></button>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(restaurant.id);
                                                setDeleteConfirmName(restaurant.name);
                                            }} 
                                            className="px-4 h-11 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-all group/trash flex items-center justify-center"
                                        >
                                            <Trash2 size={16} className="text-rose-500 group-hover/trash:scale-125 transition-all" />
                                        </button>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'support' && (
                    <div className="space-y-12 animate-in slide-in-from-right-10 duration-700">
                        <header><h1 className="text-5xl font-black italic tracking-tighter">Emergency Hub</h1><p className="text-xs text-rose-500 font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-rose-500 ml-1">Live SOS Visual Evidence Matrix</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             {tickets.length > 0 ? tickets.map(t => (
                                <div key={t.id} className={cn("bg-[#111111] border p-8 rounded-[3.5rem] space-y-6 group transition-all duration-700 relative overflow-hidden", t.status === 'resolved' ? 'border-emerald-500/20 opacity-40 translate-y-4' : 'border-rose-500/20 shadow-2xl shadow-rose-500/5')}>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="px-5 py-2 bg-indigo-500/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-white/5">{t.restaurants?.name}</div>
                                        <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500", t.status === 'open' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-emerald-500 text-white')}>{t.status}</div>
                                    </div>
                                    
                                    {t.image_url && (
                                        <div onClick={() => setPreviewImage(t.image_url)} className="relative h-60 w-full rounded-[2rem] overflow-hidden border border-white/5 bg-gray-950 cursor-pointer group/img">
                                            <img src={t.image_url} alt="Proof" className="w-full h-full object-contain transition-transform duration-1000" />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity py-3">
                                                <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-tighter"><Maximize2 size={12} /> View Full Signal</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative z-10">
                                        <h3 className={cn("text-xl font-bold italic mb-2", t.status === 'resolved' && 'line-through text-gray-700')}>{t.subject}</h3>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic truncate">{t.message}</p>
                                    </div>
                                    <div className="flex gap-2 border-t border-white/5 pt-6 relative z-10">
                                        {t.status === 'open' ? (
                                            <button onClick={() => handleUpdateTicket(t.id, 'resolved')} className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">Solve Diagnostic</button>
                                        ) : (
                                            <button onClick={() => handleUpdateTicket(t.id, 'open')} className="flex-1 py-4 bg-white/5 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-white/5 hover:text-white transition-all">Re-Open Link</button>
                                        )}
                                        <button onClick={() => handleDeleteTicket(t.id)} className="px-5 bg-white/5 hover:bg-rose-500/10 rounded-2xl flex items-center justify-center text-gray-600 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                             )) : (
                                <div className="col-span-full py-40 text-center flex flex-col items-center opacity-20"><CheckCircle2 size={60} className="mb-4 text-emerald-500" /><h3 className="text-2xl font-black italic uppercase tracking-[0.5em]">Neural Equilibrium Stable</h3></div>
                             )}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-12 animate-in fade-in zoom-in duration-700">
                        <header>
                            <h1 className="text-5xl font-black italic tracking-tighter">Global Intel</h1>
                            <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-indigo-500 ml-1">Real-time Cross-Node performance analysis</p>
                        </header>
                        
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: 'Platform Revenue', value: `₹${globalStats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={24} />, color: 'text-emerald-500' },
                                { label: 'Total Orders', value: globalStats.totalOrders, icon: <LayoutDashboard size={24} />, color: 'text-indigo-500' },
                                { label: 'Total Users', value: globalStats.totalCustomers, icon: <Users size={24} />, color: 'text-orange-500' }
                            ].map((kpi, i) => (
                                <div key={i} className="bg-[#111111] border border-white/5 p-8 rounded-[3.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">{kpi.icon}</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{kpi.label}</p>
                                    <h3 className={cn("text-4xl font-black italic", kpi.color)}>{kpi.value}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Revenue Chart */}
                        <div className="bg-[#111111] border border-white/5 p-12 rounded-[4rem]">
                            <h3 className="text-xl font-black italic uppercase tracking-widest mb-10 text-gray-400">7-Day Revenue Trajectory</h3>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={globalStats.revenueTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                        <XAxis dataKey="day" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px' }}
                                            labelStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Nodes */}
                        <div className="bg-[#111111] border border-white/5 p-12 rounded-[4rem]">
                            <h3 className="text-xl font-black italic uppercase tracking-widest mb-10 text-gray-400">High-Performing Nodes</h3>
                            <div className="space-y-6">
                                {globalStats.topNodes.length > 0 ? globalStats.topNodes.map((node, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-black">{i + 1}</div>
                                            <div>
                                                <h4 className="text-lg font-bold italic uppercase">{node.name}</h4>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Node ID: {node.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black italic text-emerald-500">₹{node.revenue.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Gross Revenue</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 opacity-20"><Database size={40} className="mx-auto mb-4" /><p className="uppercase tracking-[0.5em] font-black">No Node Data Synced</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
                        <header>
                            <h1 className="text-5xl font-black italic tracking-tighter">Platform Hub</h1>
                            <p className="text-xs text-orange-500 font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-orange-500 ml-1">Global SaaS Architecture Configuration</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#111111] border border-white/5 p-12 rounded-[4rem] space-y-8">
                                <h3 className="text-xl font-black italic uppercase tracking-widest text-gray-400">Platform Identity</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Platform Name</label>
                                        <input type="text" defaultValue="RestroHQ SaaS" className="w-full bg-black border border-white/10 p-6 rounded-[2rem] outline-none focus:border-purple-500 transition-all font-bold italic" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Main Support WhatsApp</label>
                                        <input type="text" defaultValue="+91 1234567890" className="w-full bg-black border border-white/10 p-6 rounded-[2rem] outline-none focus:border-purple-500 transition-all font-bold italic" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#111111] border border-white/5 p-12 rounded-[4rem] space-y-8">
                                <h3 className="text-xl font-black italic uppercase tracking-widest text-gray-400">Infrastructure Controls</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                                        <div>
                                            <p className="font-black italic uppercase text-xs">Maintenance Mode</p>
                                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Disables all restaurant fronts</p>
                                        </div>
                                        <div className="w-16 h-8 bg-white/5 border border-white/10 rounded-full relative cursor-pointer">
                                            <div className="absolute left-1 top-1 w-6 h-6 bg-gray-600 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                                        <div>
                                            <p className="font-black italic uppercase text-xs">Self-Registration</p>
                                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Allow new restauranteurs to join</p>
                                        </div>
                                        <div className="w-16 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-1 w-6 h-6 bg-emerald-500 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-full bg-white/5 border border-white/10 p-12 rounded-[4rem] text-center">
                                <button onClick={() => toast.success('Global Configuration Saved Successfully')} className="bg-white text-black font-black px-16 py-6 rounded-[2.5rem] uppercase tracking-[0.2em] text-[10px] hover:scale-105 transition-all shadow-2xl">Deploy Platform Changes</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* Full Image Preview Modal */}
        {previewImage && (
            <div className="fixed inset-0 z-[150] bg-black/98 p-10 flex items-center justify-center animate-in fade-in duration-300 backdrop-blur-3xl" onClick={() => setPreviewImage(null)}>
                <button className="absolute top-10 right-10 p-5 bg-white/5 text-white rounded-full hover:bg-white/10 transition-all"><X size={32} /></button>
                <div className="max-w-[90vw] max-h-[85vh] relative rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.1)] border border-white/10" onClick={e => e.stopPropagation()}>
                    <img src={previewImage} alt="Full Diagnostic evidence" className="w-full h-full object-contain" />
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-black/60 backdrop-blur-2xl rounded-[3rem] border border-white/10 text-center min-w-[300px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-purple-400 mb-1">Visual Diagnostic Probe</p>
                        <p className="text-xs font-bold text-white italic opacity-80">High Resolution Evidence #4102-S-Node</p>
                    </div>
                </div>
            </div>
        )}

        {selectedRestro && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
                 <div className="bg-[#111111] border border-white/10 w-full max-w-4xl p-10 md:p-14 rounded-[3rem] shadow-4xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <button onClick={() => setSelectedRestro(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all border border-white/5"><X size={24} /></button>
                    </div>
                    <div className="text-center mb-10 relative">
                        <Zap size={40} className="text-purple-500 mx-auto mb-4" />
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">{selectedRestro.name} <span className="text-gray-500">Vault</span></h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {[
                            { label: 'Admin Hub', icon: <Settings />, color: 'bg-blue-600', href: getFullLink('/admin/login', selectedRestro) },
                            { label: 'Production', icon: <Utensils />, color: 'bg-orange-600', href: getFullLink('/kitchen', selectedRestro) },
                            { label: 'Point-of-SaaS', icon: <Zap />, color: 'bg-indigo-600', href: getFullLink('/waiter', selectedRestro) },
                            { label: 'Cloud Scan', icon: <Globe />, color: 'bg-emerald-600', href: getFullLink('/customer/scan', selectedRestro) }
                        ].map((l, i) => (
                            <a key={i} href={l.href} target="_blank" className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all flex items-center gap-6 group/item">
                                <div className={`h-14 w-14 rounded-2xl ${l.color} flex items-center justify-center text-white shadow-xl group-hover/item:scale-110 transition-transform duration-500`}>{l.icon || <ExternalLink />}</div>
                                <span className="text-xl font-black uppercase tracking-tighter group-hover/item:text-white">{l.label}</span>
                                <ChevronRight className="ml-auto opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-2 transition-all" size={24} />
                            </a>
                        ))}
                    </div>

                    {/* Neural Webhook Section - Only this remains as per request */}
                    <div className="mt-10 p-8 bg-black/40 border border-white/5 rounded-[2.5rem] relative z-10 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Database className="text-purple-500" size={16} />
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">Neural Webhook Endpoint</p>
                            </div>
                            <button 
                                onClick={() => {
                                    const url = selectedRestro.webhook_url || `https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant?id=${selectedRestro.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('Webhook Link Synced to Clipboard');
                                }}
                                className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full hover:bg-purple-500/20 transition-all uppercase border border-purple-500/10"
                            >
                                Copy Link
                            </button>
                        </div>
                        <div className="bg-black/80 p-5 rounded-2xl border border-white/5 overflow-hidden">
                            <p className="text-[11px] font-mono text-gray-400 truncate opacity-90 tracking-tighter">{selectedRestro.webhook_url || `https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant?id=${selectedRestro.id}`}</p>
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[8px] text-gray-600 italic uppercase">POST method neural routing enabled</p>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-500 uppercase">Live Port</span>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
                 <div className="bg-[#111111] border border-white/10 w-full max-w-4xl p-8 md:p-12 rounded-[2.5rem] shadow-4xl relative max-h-[95vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingId ? 'Refine Node Architecture' : 'Deploy New Neural Node'}</h2>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 border border-white/5 rounded-full hover:bg-white/10 transition-all text-gray-500 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <form onSubmit={handleNodeSubmit} className="space-y-8">
                        {/* Section 1: Basic Identity */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 border-b border-white/5 pb-2">Core Identity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Restaurant Name</label>
                                    <input type="text" placeholder="The Gold Biryani" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Slug</label>
                                    <input type="text" placeholder="gold-biryani" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Custom Domain</label>
                                    <input type="text" placeholder="domain.com" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.custom_domain} onChange={(e) => setFormData({...formData, custom_domain: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Visuals & Security */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 border-b border-white/5 pb-2">Visuals & Security</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Admin Passcode</label>
                                    <input type="text" maxLength={4} placeholder="1234" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm font-mono tracking-widest" value={formData.admin_passcode} onChange={(e) => setFormData({...formData, admin_passcode: e.target.value})} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Primary Color</label>
                                    <input type="color" className="w-full h-12 bg-black border border-white/10 p-1 rounded-xl outline-none cursor-pointer" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Initial Coin Balance</label>
                                    <input type="number" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.coin_balance} onChange={(e) => setFormData({...formData, coin_balance: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-orange-500 ml-2">Deduction / Order</label>
                                    <input type="number" className="w-full bg-black border border-orange-500/30 p-4 rounded-xl outline-none focus:border-orange-500 transition-all text-sm font-black text-orange-400" value={formData.coin_deduction_per_order} onChange={(e) => setFormData({...formData, coin_deduction_per_order: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Logo URL</label>
                                    <input type="text" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Banner URL</label>
                                    <input type="text" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.banner_url} onChange={(e) => setFormData({...formData, banner_url: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Comms Pipeline */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b border-white/5 pb-2">Communications Pipeline (Meta API)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">WhatsApp Number</label>
                                    <input type="text" placeholder="+91..." className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Report WhatsApp</label>
                                    <input type="text" placeholder="+91..." className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.report_whatsapp_number} onChange={(e) => setFormData({...formData, report_whatsapp_number: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black text-gray-500 ml-2">WhatsApp API ID</label>
                                    <input type="text" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.whatsapp_api_id} onChange={(e) => setFormData({...formData, whatsapp_api_id: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">System API URL</label>
                                <input type="text" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.whatsapp_api_url} onChange={(e) => setFormData({...formData, whatsapp_api_url: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Neutral Webhook URL (Manual Override)</label>
                                <input type="text" placeholder="https://..." className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm" value={formData.webhook_url} onChange={(e) => setFormData({...formData, webhook_url: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Bearer Token (Auth)</label>
                                <textarea className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-sm h-24 font-mono text-[10px]" value={formData.whatsapp_token} onChange={(e) => setFormData({...formData, whatsapp_token: e.target.value})} />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-black py-5 rounded-xl uppercase tracking-[0.2em] text-[10px] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3">
                                {isLoading ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'Execute Systematic Update' : 'Initialize Neural Node')}
                            </button>
                        </div>
                    </form>
                 </div>
            </div>
        )}


        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 p-4 backdrop-blur-3xl animate-in fade-in duration-300">
                <div className="bg-[#111111] border border-white/10 w-full max-w-md p-10 rounded-[3rem] shadow-4xl text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-rose-600/5 blur-[80px]" />
                    <div className="w-20 h-20 bg-rose-600/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-500/20 animate-pulse">
                        <Trash2 className="text-rose-500 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Node Purge Protocol</h2>
                    <p className="text-gray-500 text-xs leading-relaxed mb-10 px-4 uppercase tracking-widest font-bold opacity-60">
                        Are you sure you want to permanently erase <span className="text-rose-500 font-black italic underline">"{deleteConfirmName}"</span>? All associated data, orders, and neural links will be terminated forever.
                    </p>
                    <div className="flex flex-col gap-3 relative z-10">
                        <button 
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    const { error } = await supabase.from('restaurants').delete().eq('id', deleteConfirmId);
                                    if (!error) {
                                        toast.success('Node purged successfully');
                                        setDeleteConfirmId(null);
                                        fetchRestaurants();
                                    } else {
                                        toast.error(`Purge Error: ${error.message}`);
                                    }
                                } catch (err) {
                                    toast.error('Critical link failure');
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/20"
                        >
                            {isLoading ? 'Executing Purge...' : 'Verify Destruction'}
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)} className="w-full py-5 bg-white/5 text-gray-400 font-extrabold rounded-2xl uppercase tracking-widest text-[10px] hover:text-white transition-all border border-white/10">Abort Protocol</button>
                    </div>
                </div>
            </div>
        )}

        <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        `}</style>
    </div>
  );
}
