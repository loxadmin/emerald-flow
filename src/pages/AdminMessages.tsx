import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassButton } from "@/components/ui/glass-button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MailOpen, Send, Clock } from "lucide-react";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }) as { data: ContactMessage[] | null };
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("contact_messages").update({ is_read: true } as never).eq("id", id);
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, is_read: true } : m));
  };

  const handleReply = async (msg: ContactMessage) => {
    if (!reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("contact_messages").update({ admin_reply: reply.trim(), replied_at: new Date().toISOString(), is_read: true } as never).eq("id", msg.id);
    if (error) { toast.error(error.message); } else {
      toast.success(`Reply saved for ${msg.email}`);
      setReply("");
      setSelectedId(null);
      fetchMessages();
    }
    setSending(false);
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contact Messages</h1>
            <p className="text-sm text-muted-foreground">{unreadCount} unread message{unreadCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`rounded-xl border bg-card p-5 ${!msg.is_read ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {msg.is_read ? <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{msg.name}</span>
                        <span className="text-xs text-muted-foreground">{msg.email}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{msg.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {format(new Date(msg.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>

                      {msg.admin_reply && (
                        <div className="mt-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
                          <p className="text-xs font-medium text-primary mb-1">Your reply:</p>
                          <p className="text-sm text-foreground">{msg.admin_reply}</p>
                          {msg.replied_at && <p className="mt-1 text-xs text-muted-foreground">{format(new Date(msg.replied_at), "MMM d, yyyy 'at' h:mm a")}</p>}
                        </div>
                      )}

                      {selectedId === msg.id && (
                        <div className="mt-3 space-y-2">
                          <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." maxLength={2000} className="text-sm" rows={3} />
                          <div className="flex gap-2">
                            <GlassButton size="sm" variant="glow" onClick={() => handleReply(msg)} disabled={sending || !reply.trim()}>
                              <Send className="h-3.5 w-3.5 mr-1" /> {sending ? "Sending..." : "Send Reply"}
                            </GlassButton>
                            <GlassButton size="sm" variant="ghost" onClick={() => { setSelectedId(null); setReply(""); }}>Cancel</GlassButton>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {!msg.is_read && (
                      <GlassButton size="sm" variant="ghost" onClick={() => markRead(msg.id)}>Mark read</GlassButton>
                    )}
                    {selectedId !== msg.id && (
                      <GlassButton size="sm" variant="secondary" onClick={() => { setSelectedId(msg.id); setReply(msg.admin_reply || ""); if (!msg.is_read) markRead(msg.id); }}>
                        Reply
                      </GlassButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
