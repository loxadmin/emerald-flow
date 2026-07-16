import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Film, X, Loader2 } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export type PromoMediaValue = {
  url: string | null;
  path: string | null;
  type: string | null;
};

export default function PromoMediaUpload({
  value,
  onChange,
}: {
  value: PromoMediaValue;
  onChange: (v: PromoMediaValue) => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Max 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("campaign-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("campaign-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year signed URL for preview
      if (sErr) throw sErr;
      onChange({ url: signed.signedUrl, path, type: file.type });
      toast.success("Promo media uploaded");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (value.path) {
      await supabase.storage.from("campaign-media").remove([value.path]).catch(() => {});
    }
    onChange({ url: null, path: null, type: null });
  };

  const isVideo = value.type?.startsWith("video/");

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        Promotional image or video <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
      </Label>
      <p className="text-xs text-muted-foreground">
        Attaching a preview image or short video improves your approval timeline. Max 10 MB.
      </p>

      {value.url ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-start gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-background border">
              {isVideo ? (
                <video src={value.url} className="h-full w-full object-cover" muted />
              ) : (
                <img src={value.url} alt="Promo preview" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                {isVideo ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                <span className="truncate">{value.type}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">Uploaded ✓</p>
              <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={remove} type="button">
                <X className="mr-1 h-3 w-3" /> Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4" /> Click to upload (image or video, ≤10 MB)</>
          )}
          <input
            type="file"
            className="hidden"
            accept={ACCEPT}
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
