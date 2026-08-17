import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import MotionWrapper from "@/components/MotionWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, LogOut, User as UserIcon, Trash2 } from "lucide-react";
import { FormSkeleton } from "@/components/skeletons";
import { friendlyError } from "@/lib/errors";

const MAX_BYTES = 3 * 1024 * 1024;

export default function Profile() {
  const { user, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const signPath = async (path: string) => {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
    return data?.signedUrl || null;
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name, website, whatsapp_phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setCompany(data.company_name || "");
        setWebsite(data.website || "");
        setPhone((data as any).whatsapp_phone || "");
        const path = (data as any).avatar_url as string | null;
        setAvatarPath(path);
        if (path) setAvatarUrl(await signPath(path));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_BYTES) return toast.error("Logo must be under 3 MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { error: pErr } = await supabase.from("profiles").update({ avatar_url: path } as any).eq("id", user.id);
      if (pErr) throw pErr;
      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      setAvatarPath(path);
      setAvatarUrl(await signPath(path));
      toast.success("Profile logo updated");
    } catch (err) {
      toast.error(friendlyError(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!user || !avatarPath) return;
    await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
    await supabase.from("profiles").update({ avatar_url: null } as any).eq("id", user.id);
    setAvatarPath(null);
    setAvatarUrl(null);
    toast.success("Logo removed");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, company_name: company || null, website: website || null } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(friendlyError(error));
    else toast.success("Profile saved");
  };

  const initial = (company || fullName || user?.email || "?")[0].toUpperCase();

  return (
    <DashboardLayout>
      <MotionWrapper>
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Your brand identity and account details.</p>
          </div>

          {loading ? (
            <FormSkeleton fields={6} />
          ) : (
            <>
              {/* Logo */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Brand logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-semibold text-muted-foreground">{initial}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Brand logo</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG or WEBP. Max 3 MB.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                        {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                        {avatarUrl ? "Replace" : "Upload"}
                      </Button>
                      {avatarUrl && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={removeLogo}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
                />
              </div>

              {/* Details */}
              <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-medium text-foreground">Account details</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company</Label>
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input value={user?.email || ""} disabled />
                  </div>
                  {phone && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input value={phone} disabled />
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null} Save changes
                </Button>
              </div>

              {/* Session */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">Session</p>
                  <p className="text-xs text-muted-foreground">Sign out of your Karbali workspace on this device.</p>
                </div>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={signOut}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Log out
                </Button>
              </div>
            </>
          )}
        </div>
      </MotionWrapper>
    </DashboardLayout>
  );
}
