import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Search, Users, FileText, Save, Trash2, Plus, Beaker } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface Advertiser {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
}

export default function AdminBroadcast() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [testRecipientId, setTestRecipientId] = useState<string>("");
  const [sendingTest, setSendingTest] = useState(false);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("id, name, subject, body, variables")
      .order("name");
    setTemplates((data || []) as EmailTemplate[]);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_name")
        .not("email", "is", null)
        .order("created_at", { ascending: false });
      setAdvertisers((data || []) as Advertiser[]);
      setLoading(false);
      await loadTemplates();
    })();
  }, []);

  const applyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) {
      setSubject(t.subject);
      setMessage(t.body);
      setTemplateName(t.name);
    }
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name || !subject.trim() || !message.trim()) {
      toast.error("Name, subject and message are required");
      return;
    }
    setSavingTemplate(true);
    const existing = templates.find(t => t.id === selectedTemplateId);
    const payload = { name, subject: subject.trim(), body: message.trim() };
    const { error } = existing
      ? await supabase.from("email_templates").update(payload).eq("id", existing.id)
      : await supabase.from("email_templates").insert(payload);
    setSavingTemplate(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Template updated" : "Template saved");
    await loadTemplates();
  };

  const deleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", selectedTemplateId);
    if (error) { toast.error(error.message); return; }
    toast.success("Template deleted");
    setSelectedTemplateId(""); setTemplateName("");
    await loadTemplates();
  };

  const newTemplate = () => {
    setSelectedTemplateId(""); setTemplateName(""); setSubject(""); setMessage("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return advertisers;
    return advertisers.filter(a =>
      (a.email || "").toLowerCase().includes(q) ||
      (a.full_name || "").toLowerCase().includes(q) ||
      (a.company_name || "").toLowerCase().includes(q)
    );
  }, [advertisers, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map(a => a.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleSendTest = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (!testRecipientId) {
      toast.error("Pick an advertiser to send the test to");
      return;
    }
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke("admin-broadcast-email", {
      body: {
        subject: subject.trim(),
        message: message.trim(),
        all: false,
        recipient_ids: [testRecipientId],
      },
    });
    setSendingTest(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { sent?: number; failed?: number };
    if (r?.sent) toast.success("Test email sent");
    else toast.error("Test email failed to send");
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    const recipientCount = sendToAll ? advertisers.length : selected.size;
    if (recipientCount === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    if (!confirm(`Send this email to ${recipientCount} advertiser${recipientCount === 1 ? "" : "s"}?`)) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-broadcast-email", {
      body: {
        subject: subject.trim(),
        message: message.trim(),
        all: sendToAll,
        recipient_ids: sendToAll ? [] : Array.from(selected),
      },
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as { sent?: number; failed?: number };
    toast.success(`Sent: ${r?.sent ?? 0}${r?.failed ? `, Failed: ${r.failed}` : ""}`);
    setSubject(""); setMessage(""); setSelected(new Set()); setSendToAll(false);
  };

  const recipientCount = sendToAll ? advertisers.length : selected.size;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Broadcast Email</h1>
          <p className="text-sm text-muted-foreground">Send announcements or updates to advertisers</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Template</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Select value={selectedTemplateId || "none"} onValueChange={v => v === "none" ? newTemplate() : applyTemplate(v)}>
              <SelectTrigger><SelectValue placeholder="Pick a template or write a new one" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">New (blank)</SelectItem>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <GlassButton size="sm" variant="ghost" onClick={newTemplate}><Plus className="h-4 w-4 mr-1" />New</GlassButton>
            <GlassButton size="sm" variant="ghost" onClick={saveAsTemplate} disabled={savingTemplate}>
              <Save className="h-4 w-4 mr-1" />{selectedTemplateId ? "Update" : "Save as template"}
            </GlassButton>
            {selectedTemplateId && (
              <GlassButton size="sm" variant="ghost" onClick={deleteTemplate}><Trash2 className="h-4 w-4 mr-1" />Delete</GlassButton>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Template name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Welcome email" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="Hi {{full_name}}, welcome!" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={10000} rows={10} placeholder="Hi {{full_name}}, ..." />
            <p className="text-xs text-muted-foreground">
              Variables auto-fill per recipient: <code>{"{{full_name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{company_name}}"}</code>. Line breaks preserved.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Recipients</h3>
              <span className="text-xs text-muted-foreground">({recipientCount} selected)</span>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={sendToAll} onCheckedChange={v => setSendToAll(!!v)} />
              <span className="text-foreground">Send to all advertisers ({advertisers.length})</span>
            </label>
          </div>

          {!sendToAll && (
            <>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or company" className="pl-9" />
                </div>
                <GlassButton size="sm" variant="ghost" onClick={selectAllVisible}>Select all visible</GlassButton>
                <GlassButton size="sm" variant="ghost" onClick={clearSelection}>Clear</GlassButton>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No advertisers found</div>
                ) : filtered.map(a => (
                  <label key={a.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{a.full_name || a.company_name || "—"}</span>
                        <span className="text-xs text-muted-foreground truncate">{a.email}</span>
                      </div>
                      {a.company_name && a.full_name && (
                        <p className="text-xs text-muted-foreground/70 truncate">{a.company_name}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <GlassButton variant="glow" onClick={handleSend} disabled={sending || !subject.trim() || !message.trim() || recipientCount === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : `Send to ${recipientCount} advertiser${recipientCount === 1 ? "" : "s"}`}
          </GlassButton>
        </div>
      </div>
    </AdminLayout>
  );
}
