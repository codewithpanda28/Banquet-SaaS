'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HelpCircle, MessageSquare, Send, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'
import { supabase, getRestaurantId } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function SupportHQPage() {
    const [ticket, setTicket] = useState({ subject: '', message: '' })
    const [sendingTicket, setSendingTicket] = useState(false)

    async function handleSubmitTicket() {
        if (!ticket.message) return
        try {
            setSendingTicket(true)
            const { error } = await supabase.from('support_tickets').insert({
                restaurant_id: getRestaurantId(),
                subject: ticket.subject || 'General Assistance',
                message: ticket.message
            })
            if (error) throw error
            toast.success('Signal sent! Super Admin HQ will resolve this soon.')
            setTicket({ subject: '', message: '' })
        } catch (error) {
            toast.error('Failed to send SOS signal')
        } finally {
            setSendingTicket(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <PageHeader
                title="Support HQ"
                description="Direct communication line with our technical resolution team"
            />

            <div className="grid gap-8 max-w-5xl mx-auto md:grid-cols-3">
                {/* Main Ticket Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="glass-panel border-0 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        <HelpCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Submit New Ticket</CardTitle>
                                        <CardDescription>Describe your technical issue or request</CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-indigo-600 text-white border-0">ONLINE 24/7</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Problem Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g. Printer connection issues"
                                    value={ticket.subject}
                                    onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                    className="bg-secondary/20 border-border/50 h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How can we help?</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Describe your issue in detail..."
                                    value={ticket.message}
                                    onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                                    className="bg-secondary/20 border-border/50 resize-none min-h-[160px]"
                                />
                            </div>
                            <Button 
                                onClick={handleSubmitTicket} 
                                disabled={sendingTicket || !ticket.message} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8 rounded-xl w-full md:w-auto transition-all"
                            >
                                {sendingTicket ? 'Sending Signal...' : 'REPORT ISSUE'}
                                <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="glass-panel border-0 bg-indigo-900/10">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-indigo-400">
                                <ShieldCheck className="h-5 w-5" />
                                <CardTitle className="text-sm">Priority Resolution</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">Average response time is under 15 minutes for critical nodes.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">Automated diagnostics start immediately after ticket submission.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-0">
                        <CardHeader>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="h-5 w-5" />
                                <CardTitle className="text-sm">Past Signals</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50 rounded-2xl">
                                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-[10px] text-muted-foreground">No active issues found on your node.</p>
                           </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
