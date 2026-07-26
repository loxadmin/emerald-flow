import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";

type Sig = {
  id: string;
  signature_path: string;
  company_name: string;
  representative_name: string;
  representative_position: string;
};

export default function AdminCompanySignature() {
  const [sig, setSig] = useState<Sig | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Karbali Ads");
  const [repName, setRepName] = useState("");
  const [repPosition, setRepPosition] = useState("");
  const [sigData, setSigData] = useState<string | null>(null);
  const [sigMime, setSigMime] = useState("image/png");
  const [saving, setSaving] = useState(false);


  const load = async () => {
    const { data } = await supabase
      .from("company_signature" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const s = data as any;
      setSig(s);
      setCompanyName(s.company_name);
      setRepName(s.representative_name);
      setRepPosition(s.representative_position);
      const { data: signed } = await supabase.storage
        .from("loi-documents")
        .createSignedUrl(s.signature_path, 3600);
      setPreviewUrl(signed?.signedUrl || null);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!companyName || !repName || !repPosition) {
      return toast.error("Fill all fields");
    }
    setSaving(true);
    try {
      let path = sig?.signature_path || "";
      if (sigData) {
        const { data, error } = await supabase.functions.invoke("process-signature", {
          body: { file_base64: sigData, mime: sigMime },
        });
        if (error) throw error;
        path = (data as any).path;
      }
      if (!path) throw new Error("Upload or draw a signature");


      if (sig) {
        const { error } = await supabase
          .from("company_signature" as any)
          .update({
            signature_path: path,
            company_name: companyName,
            representative_name: repName,
            representative_position: repPosition,
          })
          .eq("id", sig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_signature" as any).insert({
          signature_path: path,
          company_name: companyName,
          representative_name: repName,
          representative_position: repPosition,
        });
        if (error) throw error;
      }
      toast.success("Company signature saved");
      setSigData(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold mb-1">Company signature</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This signature and representative are embedded automatically into every Letter of Intent generated for advertisers.
        </p>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Karbali signature (PNG or JPEG)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Sign on a plain white sheet, take a clear picture, and upload. Background will be removed automatically.
            </p>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {previewUrl && !file && (
              <div className="mt-3 rounded-md border border-border bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] p-3 inline-block">
                <img src={previewUrl} alt="Signature" className="max-h-16" />
              </div>
            )}
          </div>
          <div>
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label>Representative name</Label>
            <Input value={repName} onChange={(e) => setRepName(e.target.value)} />
          </div>
          <div>
            <Label>Representative position</Label>
            <Input value={repPosition} onChange={(e) => setRepPosition(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
