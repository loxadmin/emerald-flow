import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X, Upload, ShieldCheck } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";

const FREE_EMAIL = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com", "aol.com", "live.com", "googlemail.com", "yahoo.co.uk", "msn.com"];


const DURATIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "Custom" },
];

const GOALS = ["Brand Switching", "Product Purchase", "App Install", "App Usage", "First Transaction", "Store Visit", "Custom"];

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export default function OfflineLOI() {
  const navigate = useNavigate();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Nigeria");

  const [productInput, setProductInput] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [customerGoal, setCustomerGoal] = useState("20000");
  const [duration, setDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("Brand Switching");
  const [customGoal, setCustomGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [sigFile, setSigFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase
        .from("letters_of_intent" as any)
        .select("*")
        .eq("advertiser_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExisting(data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (existing) navigate("/offline/loi/status", { replace: true });
  }, [existing, navigate]);

  const addProduct = () => {
    const v = productInput.trim();
    if (!v) return;
    if (products.includes(v)) return;
    setProducts([...products, v]);
    setProductInput("");
  };

  const submit = async () => {
    // Validate
    if (!companyName || !website || !businessEmail || !contactPerson || !jobTitle || !phone || !country) {
      return toast.error("Fill all company details");
    }
    const domain = extractDomain(website);
    if (!domain) return toast.error("Enter a valid website URL");
    const emailDomain = businessEmail.split("@")[1]?.toLowerCase();
    if (!emailDomain) return toast.error("Invalid business email");
    if (FREE_EMAIL.includes(emailDomain)) {
      return toast.error("Please use an official company email, not a free provider like Gmail or Yahoo.");
    }
    // Email must share the registrable root with the website
    const emailRoot = emailDomain.split(".").slice(-2).join(".");
    const siteRoot = domain.split(".").slice(-2).join(".");
    if (emailRoot !== siteRoot) {
      return toast.error(`Business email must match the company website (${siteRoot})`);
    }
    if (products.length === 0) return toast.error("Add at least one product");
    const goalN = Number(customerGoal);
    if (!goalN || goalN <= 0) return toast.error("Customer goal must be a positive number");
    if (duration === 0 && !customDuration) return toast.error("Enter custom duration");
    if (campaignGoal === "Custom" && !customGoal) return toast.error("Describe your custom campaign goal");
    if (!sigFile) return toast.error("Upload your signature");

    setSubmitting(true);
    try {
      // Process signature
      const b64 = await fileToBase64(sigFile);
      const { data: sig, error: sigErr } = await supabase.functions.invoke("process-signature", {
        body: { file_base64: b64, mime: sigFile.type },
      });
      if (sigErr) throw sigErr;
      const sigPath = (sig as any).path;

      const { data: res, error } = await supabase.rpc("submit_letter_of_intent" as any, {
        _company_name: companyName,
        _website: website,
        _business_email: businessEmail,
        _contact_person: contactPerson,
        _job_title: jobTitle,
        _phone: phone,
        _country: country,
        _products: products,
        _customer_goal: goalN,
        _duration_days: duration === 0 ? null : duration,
        _custom_duration_text: duration === 0 ? customDuration : null,
        _campaign_goal: campaignGoal,
        _custom_goal_text: campaignGoal === "Custom" ? customGoal : null,
        _notes: notes || null,
        _signature_path: sigPath,
      });
      if (error) throw error;

      // Notify admin (best-effort)
      supabase.functions.invoke("notify", {
        body: { event: "loi_submitted", payload: { loi_id: (res as any).id } },
      }).catch(() => {});

      toast.success("Letter of Intent submitted");
      navigate("/offline/loi/status", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Reserve consumer demand</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit a Letter of Intent to reserve future customers on Karbali. Once Karbali reaches your requested threshold, we'll notify you to launch your campaign against real, verified migration opportunities.
          </p>
        </div>

        {/* Company info */}
        <Section title="Company information">
          <Grid>
            <Field label="Company name"><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></Field>
            <Field label="Official website"><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.pzcussons.com" /></Field>
            <Field label="Official business email"><Input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="marketing@pzcussons.com" /></Field>
            <Field label="Contact person"><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></Field>
            <Field label="Job title"><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></Field>
            <Field label="Phone number"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
          </Grid>
          <p className="text-xs text-muted-foreground mt-3">
            Your business email must be on your company's domain — e.g. <code>marketing@pzcussons.com</code>, not Gmail.
          </p>
        </Section>

        {/* Reservation */}
        <Section title="Consumer demand reservation">
          <Field label="Products (add one at a time)">
            <div className="flex gap-2">
              <Input
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addProduct(); }
                }}
                placeholder="e.g. Nunu Milk"
              />
              <Button type="button" variant="outline" onClick={addProduct}>Add</Button>
            </div>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {products.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-accent text-foreground text-xs px-3 py-1">
                    {p}
                    <button onClick={() => setProducts(products.filter((x) => x !== p))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Customer goal (users you want Karbali to deliver)">
            <Input type="number" value={customerGoal} onChange={(e) => setCustomerGoal(e.target.value)} />
          </Field>

          <Field label="Campaign duration">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border ${duration === d.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {duration === 0 && (
              <Input className="mt-2" placeholder="Describe custom duration" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} />
            )}
          </Field>

          <Field label="Campaign goal">
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCampaignGoal(g)}
                  className={`px-3 py-1.5 text-sm rounded-md border ${campaignGoal === g ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
                >
                  {g}
                </button>
              ))}
            </div>
            {campaignGoal === "Custom" && (
              <Input className="mt-2" placeholder="Describe your custom goal" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} />
            )}
          </Field>

          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </Section>

        {/* Signature */}
        <Section title="Advertiser signature">
          <div className="rounded-md border border-border bg-muted/40 p-4 text-xs text-muted-foreground mb-3">
            <p className="font-medium text-foreground mb-1">Signature instructions</p>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>Sign on a plain white sheet of paper.</li>
              <li>Take a clear picture or scan it.</li>
              <li>Upload below — we'll automatically remove the background and place your signature on the Letter of Intent.</li>
            </ol>
          </div>
          <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setSigFile(e.target.files?.[0] || null)} />
          {sigFile && <p className="text-xs text-muted-foreground mt-1">{sigFile.name}</p>}
        </Section>

        <div className="flex items-center gap-3 mt-6">
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : (<><Upload className="h-4 w-4 mr-1" /> Submit LOI</>)}
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Signed digitally by both parties, stored securely.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 mb-4">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}
function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
