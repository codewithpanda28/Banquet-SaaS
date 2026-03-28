'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Globe, Settings, ExternalLink, Loader2, Search, MoreVertical, LayoutDashboard, Utensils, Zap, BarChart3, TrendingUp, Users, DollarSign, Trash2, X, Pencil, ImagePlus, CreditCard, ShieldCheck, HelpCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MOCK_REV_DATA = [
  { day: 'Mon', revenue: 4000 },
  { day: 'Tue', revenue: 3000 },
  { day: 'Wed', revenue: 2000 },
  { day: 'Thu', revenue: 2780 },
  { day: 'Fri', revenue: 1890 },
  { day: 'Sat', revenue: 2390 },
  { day: 'Sun', revenue: 3490 },
];

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'analytics' | 'settings' | 'support'>('nodes');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    primary_color: '#ef4444',
    admin_passcode: '',
    whatsapp_number: '',
    whatsapp_token: '',
    whatsapp_api_id: '',
    whatsapp_api_url: 'https://thinkaiq.in/api',
    logo_url: '',
    banner_url: ''
  });

  const [selectedRestro, setSelectedRestro] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({
    siteName: 'RestroSaaS HQ',
    supportEmail: 'support@restrosaas.com',
    primaryColor: '#ef4444',
  });

  const fetchRestaurants = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load restaurants');
    } else {
      setRestaurants(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Check if previously authenticated in this session
    const auth = sessionStorage.getItem('saas_auth');
    if (auth === 'true') setIsAuthenticated(true);
    fetchRestaurants();
    // Load platform settings from localStorage or DB if exists
    const saved = localStorage.getItem('global_saas_settings');
    if (saved) setPlatformSettings(JSON.parse(saved));
  }, []);

  const getBaseURL = (restro: any) => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // 1. Custom Domain Priority
    if (restro.custom_domain) {
      return `${protocol}//${restro.custom_domain}`;
    }
    
    // 2. Localhost Subdomain Support
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      return `${protocol}//${restro.slug}.localhost:3000`;
    }
    
    // 3. Platform Detection (Vercel/Cloud-hosting without wildcards)
    if (hostname.includes('vercel.app')) {
      return `${protocol}//${hostname}`;
    }
    
    // 4. Standard SaaS Subdomain
    const mainDomain = hostname.replace(/^(admin|super-admin|www|waiter|kitchen|shop)\./, '');
    return `${protocol}//${restro.slug}.${mainDomain}`;
  };

  const getFullLink = (path: string, restro: any) => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    
    // If we are on Localhost OR Vercel (Environments where subdomains might fail or be wildcard-less)
    if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
        const separator = path.includes('?') ? '&' : '?';
        return `${window.location.protocol}//${window.location.host}${path}${separator}id=${restro.id}`;
    }

    const base = getBaseURL(restro);
    return `${base}${path}`;
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === '1801') {
      setIsAuthenticated(true);
      sessionStorage.setItem('saas_auth', 'true');
      toast.success('Access Granted Master!');
    } else {
      toast.error('Invalid Access Code');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `restaurants/${type}s/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'banner_url']: publicUrl
      }));
      toast.success(`${type} uploaded!`);
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and Slug are required');
      return;
    }

    // Clean data before insert/update
    const payload: any = { ...formData };
    // Allow clearing optional fields by sending null instead of deleting them from the payload
    if (!payload.custom_domain) payload.custom_domain = null;
    if (!payload.whatsapp_number) payload.whatsapp_number = null;

    let error;
    let data;

    if (editingId) {
        // UPDATE Existing Node
        const { data: updated, error: updateError } = await supabase
            .from('restaurants')
            .update(payload)
            .eq('id', editingId)
            .select();
        error = updateError;
        data = updated ? updated[0] : null;
    } else {
        // INSERT New Node
        const { data: inserted, error: insertError } = await supabase
            .from('restaurants')
            .insert([payload])
            .select();
        error = insertError;
        data = inserted ? inserted[0] : null;
    }

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(editingId ? 'Node Updated Successfully!' : 'Restaurant Onboarded Successfully!');
      
      if (!editingId) {
        // 🤖 Trigger Automation Webhook only for NEW restaurants
        try {
            await fetch('/api/webhook/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'node-onboarded',
                    restaurant_id: data.id,
                    restaurant_name: data.name,
                    slug: data.slug,
                    admin_passcode: payload.admin_passcode,
                    whatsapp_number: payload.whatsapp_number,
                    login_url: `https://${data.slug}.${window.location.host}/login`,
                    timestamp: new Date().toISOString()
                })
            });
            toast.info('Welcome Kit signal sent to HQ');
        } catch (e) {
            console.error('Automation trigger failed', e);
        }
      }

      setIsModalOpen(false);
      setEditingId(null);
      fetchRestaurants();
      setFormData({ name: '', slug: '', custom_domain: '', primary_color: '#ef4444', admin_passcode: '', whatsapp_number: '', whatsapp_token: '', whatsapp_api_id: '', whatsapp_api_url: 'https://thinkaiq.in/api', logo_url: '', banner_url: '' });
    }
  };

  const handleEditOpen = (restro: any) => {
    setEditingId(restro.id);
    setFormData({
      name: restro.name || '',
      slug: restro.slug || '',
      custom_domain: restro.custom_domain || '',
      primary_color: restro.primary_color || '#ef4444',
      admin_passcode: restro.admin_passcode || '',
      whatsapp_number: restro.whatsapp_number || '',
      whatsapp_token: restro.whatsapp_token || '',
      whatsapp_api_id: restro.whatsapp_api_id || '',
      whatsapp_api_url: restro.whatsapp_api_url || 'https://thinkaiq.in/api',
      logo_url: restro.logo_url || '',
      banner_url: restro.banner_url || ''
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedRestro(null);
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      custom_domain: '',
      primary_color: '#ef4444',
      admin_passcode: '',
      whatsapp_number: '',
      whatsapp_token: '',
      whatsapp_api_id: '',
      whatsapp_api_url: 'https://thinkaiq.in/api',
      logo_url: '',
      banner_url: ''
    });
    setIsModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="w-full max-w-md bg-[#111111] border border-white/10 p-12 rounded-[3.5rem] relative shadow-2xl">
                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-purple-600/20">
                    <Zap className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-center mb-2 italic tracking-tighter">SaaS <span className="text-purple-500">Command</span></h1>
                <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-10">Restricted Access Portal</p>
                
                <form onSubmit={handleAuth} className="space-y-6">
                    <input 
                        type="password" 
                        placeholder="Master Access Code" 
                        className="w-full bg-black border border-white/10 p-5 rounded-3xl text-center font-black tracking-[1em] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-3xl uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">Authorize Session</button>
                    <p className="text-center text-[8px] text-gray-700 uppercase tracking-widest font-black">Authorized Personnel Only</p>
                </form>
            </div>
        </div>
    )
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete ${name}? WARNING: If this restaurant has existing data (orders, menus), deletion might fail due to database constraints.`)) {
      // Immediate UI update
      setRestaurants(prev => prev.filter(r => r.id !== id));
      
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) {
        toast.error(`Critical: Deletion Failed. Database says: ${error.message}`);
        // Rollback on failure
        fetchRestaurants();
      } else {
        toast.success(`${name} has been terminated.`);
      }
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex selection:bg-purple-500/30 overflow-hidden">
        {/* 🧭 Vertical Sidebar */}
        <div className="w-20 lg:w-64 border-r border-white/5 flex flex-col items-center py-10 relative">
            <div className="flex lg:flex-row flex-col items-center gap-2 mb-12 px-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight hidden lg:block italic">RestroSaaS HQ</span>
            </div>

            <nav className="flex-1 space-y-2 w-full px-4">
                {[
                    { id: 'nodes', label: 'Nodes', icon: <LayoutDashboard /> },
                    { id: 'analytics', label: 'Global Sales', icon: <BarChart3 /> },
                    { id: 'support', label: 'Tickets', icon: <Users /> },
                    { id: 'settings', label: 'Platform', icon: <Settings /> }
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-white text-black font-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {item.icon}
                        <span className="hidden lg:block uppercase tracking-widest text-[10px]">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="mt-auto opacity-30 text-[10px] uppercase tracking-widest font-black lg:block hidden">v1.2 SaaS Engine</div>
        </div>

        {/* 🚀 Main Content */}
        <div className="flex-1 overflow-y-auto min-h-screen relative p-6 md:p-12">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[#0A0A0A] -z-20">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic tracking-tighter">
                            {activeTab === 'nodes' ? 'Network Overview' : activeTab === 'analytics' ? 'Global Metrics' : 'Platform Control'}
                        </h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Managing {restaurants.length} Active Environments</p>
                    </div>
                    
                    {activeTab === 'nodes' && (
                        <div className="flex gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    placeholder="Jump to node..." 
                                    className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full md:w-64 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleAddNew}
                                className="bg-white text-black font-bold py-3 px-6 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/20"
                            >
                                <Plus className="w-5 h-5" /> Deploy Node
                            </button>
                        </div>
                    )}
                </header>

                {activeTab === 'nodes' && (
                    <div className="space-y-12 animate-in fade-in duration-700">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: "Nodes Live", val: restaurants.length, icon: <LayoutDashboard />, color: "text-blue-400" },
                                { label: "Estimated ARR", val: "$124k", icon: <TrendingUp />, color: "text-green-400" },
                                { label: "Total Users", val: "14k", icon: <Users />, color: "text-purple-400" },
                                { label: "Network Success", val: "99.9%", icon: <Zap />, color: "text-yellow-400" }
                            ].map((stat, i) => (
                                <div key={i} className="bg-[#111111] border border-white/5 p-6 rounded-[2rem] group hover:border-white/20 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 bg-white/5 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                                            {stat.icon}
                                        </div>
                                        <div className="text-xl font-black">{stat.val}</div>
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {isLoading ? (
                                <div className="col-span-full flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-purple-500" /></div>
                            ) : filteredRestaurants.map(restaurant => (
                                <div key={restaurant.id} className="group relative bg-[#111111] border border-white/5 p-8 rounded-[2.5rem] hover:border-purple-500/30 transition-all duration-500 flex flex-col justify-between overflow-hidden hover:shadow-2xl hover:shadow-purple-500/5">
                                    {/* Accent Glow */}
                                    <div className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] -z-10 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xl border border-white/5 group-hover:border-purple-500/50 transition-colors">
                                                {restaurant.name?.[0]}
                                            </div>
                                            <Badge status="Live" />
                                        </div>
                                        <h3 className="text-2xl font-black mb-1">{restaurant.name}</h3>
                                        <div className="text-[10px] font-mono text-purple-500/80 mb-6 tracking-widest">{restaurant.slug}.restrohq.io</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSelectedRestro(restaurant)}
                                            className="flex-1 bg-purple-600 font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center text-center"
                                        >
                                            Control Terminal
                                        </button>
                                        <button 
                                            onClick={() => handleEditOpen(restaurant)} 
                                            className="px-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group/edit"
                                            title="Edit Configuration"
                                        >
                                            <Pencil className="w-4 h-4 text-gray-400 group-hover/edit:text-white transition-colors" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(restaurant.id, restaurant.name)} 
                                            className="px-5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/10 rounded-2xl transition-all group/del"
                                            title="Terminate Node"
                                        >
                                            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'support' && (
                    <div className="space-y-12 animate-in fade-in duration-700">
                        <div className="bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden">
                            <div className="p-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black italic">Resolution Center</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage network-wide support requests</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-5 py-2 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/20">3 Urgent</span>
                                    <span className="px-5 py-2 bg-gray-500/10 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">12 Closed</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 border-y border-white/5">
                                            <th className="p-8">Restaurant</th>
                                            <th className="p-8">Subject</th>
                                            <th className="p-8">Priority</th>
                                            <th className="p-8">Status</th>
                                            <th className="p-8">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.05]">
                                        {[
                                            { name: 'KFC Connaught', sub: 'AR Menu not loading', prio: 'High', status: 'Open', color: 'text-red-400' },
                                            { name: 'Pizza Hut', sub: 'Sticker Printer Error', prio: 'Medium', status: 'Pending', color: 'text-yellow-400' },
                                            { name: 'Burger King', sub: 'Custom domain setup', prio: 'Low', status: 'Resolved', color: 'text-green-400' }
                                        ].map((ticket, i) => (
                                            <tr key={ticket.name} className="hover:bg-white/[0.01] transition-colors group">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-bold text-gray-600">{ticket.name[0]}</div>
                                                        <div className="font-black text-gray-300">{ticket.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-sm text-gray-500 font-medium group-hover:text-white transition-colors">{ticket.sub}</td>
                                                <td className="p-8">
                                                   <span className={`text-[10px] font-black uppercase tracking-widest ${ticket.prio === 'High' ? 'text-red-500' : ticket.prio === 'Medium' ? 'text-yellow-500' : 'text-blue-500'}`}>
                                                        {ticket.prio}
                                                   </span>
                                                </td>
                                                <td className="p-8"><Badge status={ticket.status} /></td>
                                                <td className="p-8">
                                                    <button className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                                        <MoreVertical className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-12 animate-in fade-in duration-700">
                        {/* Platform Chart */}
                        <div className="bg-[#111111] border border-white/5 p-8 rounded-[3rem] shadow-2xl">
                           <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-2xl font-black italic">Platform Performance</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Network-wide revenue (INR)</p>
                                </div>
                                <div className="text-2xl font-black text-green-400">₹44,380.00 <span className="text-[10px] text-gray-500 lowercase font-normal italic ml-2">avg daily</span></div>
                           </div>
                           <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={MOCK_REV_DATA}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis dataKey="day" stroke="#ffffff33" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                        <YAxis hide />
                                        <Tooltip contentStyle={{backgroundColor: '#0f0f0f', border: '1px solid #ffffff10', borderRadius: '15px'}} />
                                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                           </div>
                        </div>

                        {/* Leaderboard Table */}
                        <div className="bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden">
                            <div className="p-8 pb-4">
                                <h2 className="text-2xl font-black italic">Top Performing Nodes</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                                            <th className="p-8">Restaurant</th>
                                            <th className="p-8">Total Orders</th>
                                            <th className="p-8">Total Revenue</th>
                                            <th className="p-8">Growth</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.05]">
                                        {restaurants.slice(0, 5).map((r, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold">{r.name[0]}</div>
                                                        <div className="font-bold tracking-tight">{r.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-gray-400 font-bold">{Math.floor(Math.random() * 500) + 10}</td>
                                                <td className="p-8 font-black italic">₹{(Math.random() * 50000).toLocaleString()}</td>
                                                <td className="p-8"><span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black tracking-widest uppercase">+{Math.floor(Math.random() * 30)}%</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* ONBOARDING MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
                <div className="bg-[#111111] border border-white/10 w-full max-w-4xl p-8 md:p-14 rounded-[2.5rem] my-auto shadow-4xl relative overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
                    
                    <div className="bg-[#111111] pb-8 z-10 border-b border-white/5 mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-white">{editingId ? 'Edit Configuration' : 'Deploy New Node'}</h2>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-2 px-1">Configure environment variables and branding</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Restaurant Name</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Midnight Biryani" className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold text-gray-200" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Slug</label>
                                        <input type="text" readOnly value={formData.slug} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-gray-500 cursor-not-allowed uppercase" />
                                    </div>
                                    <div className="group relative">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Admin Passcode</label>
                                        <div className="relative">
                                            <input 
                                                type={showPin ? "text" : "password"} 
                                                value={formData.admin_passcode} 
                                                onChange={(e) => setFormData({...formData, admin_passcode: e.target.value})} 
                                                placeholder="4 Digit PIN" 
                                                className="w-full bg-black border border-white/10 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-xs font-mono tracking-[0.5em]" 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Custom Domain</label>
                                    <input type="text" value={formData.custom_domain} onChange={(e) => setFormData({...formData, custom_domain: e.target.value})} placeholder="e.g., menu.goldbiryani.com" className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">WhatsApp Order Number</label>
                                    <input type="text" value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} placeholder="e.g. 917282871506" className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">WhatsApp API URL Base</label>
                                    <input 
                                        type="text" 
                                        value={formData.whatsapp_api_url || 'https://thinkaiq.in/api'} 
                                        onChange={(e) => setFormData({...formData, whatsapp_api_url: e.target.value})} 
                                        placeholder="e.g. https://thinkaiq.in/api" 
                                        className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-xs font-mono" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">WhatsApp API ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.whatsapp_api_id || ''} 
                                            onChange={(e) => setFormData({...formData, whatsapp_api_id: e.target.value})} 
                                            placeholder="e.g. bd54faee-..." 
                                            className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-xs font-mono" 
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">Brand Theme</label>
                                        <div className="flex gap-3">
                                            <input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-14 h-12 bg-black border border-white/10 rounded-xl cursor-pointer p-1" />
                                            <input type="text" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-xs font-mono outline-none focus:ring-1 focus:ring-purple-500 transition-all" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block ml-1">WhatsApp Access Token</label>
                                    <textarea 
                                        rows={2}
                                        value={formData.whatsapp_token || ''} 
                                        onChange={(e) => setFormData({...formData, whatsapp_token: e.target.value})} 
                                        placeholder="Paste full Bearer token here..." 
                                        className="w-full bg-black border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-xs font-mono resize-none" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-10 border-t border-white/5">
                            <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ name: '', slug: '', custom_domain: '', primary_color: '#ef4444', admin_passcode: '', whatsapp_number: '', whatsapp_token: '', whatsapp_api_id: '', whatsapp_api_url: 'https://thinkaiq.in/api', logo_url: '', banner_url: '' }); }} className="flex-1 py-4 rounded-2xl font-bold border border-white/5 text-gray-500 hover:text-white uppercase tracking-widest text-[10px] transition-all">Cancel</button>
                            <button type="submit" className="flex-1 py-4 rounded-2xl font-bold bg-white text-black hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-white/5">{editingId ? 'Save Changes' : 'Authorize Deployment'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* 🎮 CONTROL TERMINAL MODAL */}
        {selectedRestro && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                <div className="bg-[#111111] border border-white/10 w-full max-w-4xl p-10 md:p-16 rounded-[2.5rem] shadow-4xl relative overflow-hidden group">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-16 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-white/5 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">Environment Node #{selectedRestro.id.substring(0,6)}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Active Session</span>
                                </div>
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight text-white capitalize">{selectedRestro.name} <span className="text-gray-500 font-normal ml-2">Terminal</span></h2>
                        </div>
                        <button onClick={() => setSelectedRestro(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 hover:rotate-90 transition-all text-gray-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { label: 'Admin Dashboard', sub: 'Manage menus, orders & staff', icon: <Settings />, color: 'text-blue-400', href: getFullLink('/admin/login', selectedRestro) },
                            { label: 'Production Hub', sub: 'Real-time kitchen management', icon: <Utensils />, color: 'text-orange-400', href: getFullLink('/kitchen', selectedRestro) },
                            { label: 'Live Storefront', sub: 'Guest menu & transaction flow', icon: <Globe />, color: 'text-green-400', href: getFullLink('/customer/scan', selectedRestro) },
                            { label: 'Waiter Portal', sub: 'Table activity & service logs', icon: <Zap />, color: 'text-purple-400', href: getFullLink('/waiter', selectedRestro) }
                        ].map((link, i) => (
                            <a 
                                key={i}
                                href={link.href}
                                target="_blank"
                                className="group/link bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:border-white/20 hover:bg-white/[0.04] transition-all flex items-center gap-6"
                            >
                                <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center ${link.color} group-hover/link:scale-110 transition-transform shadow-xl`}>
                                    <div className="w-6 h-6">{link.icon}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-lg text-white tracking-tight">{link.label}</div>
                                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1 group-hover/link:text-gray-400 transition-colors">{link.sub}</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover/link:text-white group-hover/link:translate-x-1 transition-all" />
                            </a>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <div className="bg-black/60 border border-white/5 p-8 rounded-[2rem] relative group/hook">
                            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4 block ml-1 group-hover/hook:text-purple-400 transition-colors">Production Webhook Node</label>
                            <div className="flex gap-4">
                                <div className="flex-1 bg-black p-4 rounded-xl border border-white/10 font-mono text-[11px] text-gray-400 truncate select-all">
                                    {`https://n8n.srv1114630.hstgr.cloud/webhook/restaurant?id=${selectedRestro.id}`}
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://n8n.srv1114630.hstgr.cloud/webhook/restaurant?id=${selectedRestro.id}`);
                                        toast.success('Webhook link captured for deployment! 🎉');
                                    }}
                                    className="px-6 py-4 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                                >
                                    Copy Link
                                </button>
                            </div>
                            <p className="mt-4 text-[10px] text-gray-600 font-medium px-1 flex items-center gap-2 italic">
                                <ShieldCheck className="w-3 h-3" />
                                Unique endpoint for isolated data processing
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <button onClick={() => setSelectedRestro(null)} className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-700 hover:text-red-500 transition-colors">Terminate Console Link</button>
                    </div>
                </div>
            </div>
        )}

        <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        `}</style>
    </div>
  );
}

function Badge({ status }: { status: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 h-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-green-400">{status}</span>
        </div>
    )
}
