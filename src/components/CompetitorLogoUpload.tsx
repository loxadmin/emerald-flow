import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

type Props = {
  value: { url: string | null; path: string | null };
  onChange: (v: { url: string | null; path: string | null }) => void;
};

const MAX_BYTES = 4 * 1024 * 1024;
const ONE_YEAR = 60 * 60 * 24 * 365;

export default function CompetitorLogoUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) return toast.error("Max 4 MB");
    setUploading(true);
    try {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userData.user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "png";
      const path = `${userData.user.id}/competitor-logos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("campaign-media").upload(path, file, {
        cacheControl: "31536000", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("campaign-media").createSignedUrl(path, ONE_YEAR);
      if (sErr) throw sErr;
      onChange({ url: signed.signedUrl, path });
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (value.path) await supabase.storage.from("campaign-media").remove([value.path]).catch(() => {});
    onChange({ url: null, path: null });
  };

  return (
    <div className="space-y-1.5">
      <Label>Logo</Label>
      {value.url ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
          <img src={value.url} alt="" className="h-12 w-12 rounded object-cover bg-background border" />
          <Button size="sm" variant="ghost" onClick={remove} type="button">
            <X className="mr-1 h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
          {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                     : <><Upload className="h-3.5 w-3.5" /> Upload logo (PNG/JPG/SVG, ≤4 MB)</>}
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
