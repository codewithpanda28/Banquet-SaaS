'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HelpCircle, MessageSquare, Send, ShieldCheck, Clock, CheckCircle2, AlertTriangle, RefreshCw, PartyPopper, ImagePlus, X, Eye } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function SupportHQPage() {
    const [ticket, setTicket] = useState({ subject: '', message: '', image_url: '' })
    const [sendingTicket, setSendingTicket] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [pastTickets, setPastTickets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchPastTickets = useCallback(async () => {
        try {
            setIsLoading(true)
            const { data } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(5)
            setPastTickets(data || [])
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPastTickets()
        const channel = supabase.channel('support-updates')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'support_tickets',
                filter: `restaurant_id=eq.${RESTAURANT_ID}`
            }, (payload) => {
                if (payload.new.status === 'resolved' && payload.old.status === 'open') {
                    toast.success("Problem Resolved! HQ has verified your system fix.", {
                        icon: <PartyPopper className="text-emerald-500" />,
                        duration: 8000
                    });
                }
                fetchPastTickets();
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [fetchPastTickets])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${RESTAURANT_ID}_${Date.now()}.${fileExt}`;
            const filePath = `support_evidence/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('branding') // Using branding bucket as a fallback for ease
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath);

            setTicket(prev => ({ ...prev, image_url: publicUrl }));
            toast.success('Visual evidence uploaded!');
        } catch (error: any) {
            toast.error('Image upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    async function handleSubmitTicket() {
        if (!ticket.message) return
        try {
            setSendingTicket(true)
            const { error } = await supabase.from('support_tickets').insert({
                restaurant_id: RESTAURANT_ID,
                subject: ticket.subject || 'Support Request',
                message: ticket.message,
                image_url: ticket.image_url
            });
            if (error) throw error;

            // Automation Webhook
            try {
                await fetch('/api/webhook/automation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'support_ticket_new',
                        restaurant_id: RESTAURANT_ID,
                        subject: ticket.subject,
                        message: ticket.message,
                        image_url: ticket.image_url,
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (e) { console.warn(e); }

            toast.info('Transmission Complete! SOS Signal is now active at Headquarters.');
            setTicket({ subject: '', message: '', image_url: '' });
            fetchPastTickets();
        } catch (error: any) {
            toast.error(`Dispatch Failed: ${error.message}`);
        } finally {
            setSendingTicket(false);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <PageHeader
                title="Support HQ"
                description="Direct communication line with our technical resolution team"
            />

            <div className="grid gap-6 max-w-6xl mx-auto md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden relative">
                        <CardHeader className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <HelpCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">System SOS</CardTitle>
                                        <CardDescription className="text-xs">Submit technical issue with visual evidence</CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-indigo-600/10 text-indigo-600 border-0 font-bold px-3 py-1 rounded-full text-[10px] uppercase">HQ Real-time</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Subject</Label>
                                        <Input
                                            placeholder="Printer Connection Failure..."
                                            value={ticket.subject}
                                            onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                            className="bg-gray-50/50 border-gray-100 h-11 rounded-xl focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Evidence Screenshot (Optional)</Label>
                                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                                        
                                        {!ticket.image_url ? (
                                            <button onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center hover:bg-slate-50 transition-all text-slate-400 group">
                                                {isUploading ? <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" /> : <ImagePlus className="h-6 w-6 group-hover:scale-110 transition-transform" />}
                                                <span className="text-[9px] font-black uppercase mt-2">{isUploading ? 'Uploading Evidence...' : 'Attach Proof'}</span>
                                            </button>
                                        ) : (
                                            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group">
                                                <img src={ticket.image_url} className="w-full h-full object-contain" alt="Proof" />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform p-3">
                                                    <button onClick={() => setTicket(prev => ({ ...prev, image_url: '' }))} className="flex items-center gap-2 text-white font-black text-[10px] uppercase"><X size={14} /> Remove Photo</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Describe Message</Label>
                                    <Textarea
                                        placeholder="Explain exactly what happened..."
                                        value={ticket.message}
                                        onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                                        className="bg-gray-50/50 border-gray-100 resize-none h-[184px] rounded-2xl focus:ring-indigo-500 p-4"
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={handleSubmitTicket} 
                                disabled={sendingTicket || !ticket.message || isUploading} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-10 rounded-xl w-full md:w-auto shadow-2xl transition-all"
                            >
                                {sendingTicket ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {sendingTicket ? 'Establishing Transmission...' : 'Transmit SOS Signal'}
                            </Button>
                        </CardContent>
                    </Card>

                    {pastTickets.some(t => t.status === 'resolved') && (
                        <Card className="border-0 shadow-sm rounded-3xl bg-emerald-500 p-8 text-white relative overflow-hidden animate-in zoom-in-95 duration-700">
                           <div className="flex items-center gap-6 relative z-10"><CheckCircle2 className="h-10 w-10 shrink-0" /><div><h3 className="text-xl font-bold italic">Stabilized Node</h3><p className="text-sm font-medium opacity-90">HQ verified an operational solution. All systems synchronized.</p></div></div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-0 shadow-sm rounded-3xl bg-slate-900 text-white p-6">
                        <div className="flex items-center gap-3 mb-6 relative z-10 text-indigo-400"><ShieldCheck size={20} /><h3 className="font-bold text-sm tracking-tight text-white uppercase tracking-widest">Protocol SLA</h3></div>
                        <div className="space-y-4 relative z-10 text-[10px] font-medium text-slate-400">
                            <p className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> Fast Diagnosis with Visual Proof</p>
                            <p className="flex gap-2"><CheckCircle2 size={12} className="text-blue-500 shrink-0" /> Automatic HQ Alert Routing</p>
                        </div>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-3xl bg-white p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-slate-400" /><h3 className="font-bold text-sm tracking-tight">Recent Signals</h3></div>
                            <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-50 text-indigo-600">{pastTickets.length}</Badge>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {pastTickets.map((t, i) => (
                                <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 group">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-bold text-gray-900 truncate uppercase">{t.subject || 'SOS'}</p>
                                        <Badge className={cn("text-[8px] font-bold px-1.5 h-4 border-0", t.status === 'open' ? 'bg-orange-500' : 'bg-emerald-500')}>{t.status}</Badge>
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-medium line-clamp-1 truncate">{t.message}</p>
                                    {t.image_url && <div className="mt-2 text-[8px] font-black text-indigo-500 flex items-center gap-1"><Eye size={10} /> Image Attached</div>}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
            `}</style>
        </div>
    )
}
