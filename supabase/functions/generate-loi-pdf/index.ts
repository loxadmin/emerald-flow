// Generates the Letter of Intent PDF for an approved LOI and stores it in loi-documents.
// Admin-only. Uses pdf-lib to lay out a professional agreement with both signatures.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "admin only" }, 403);

    const { loi_id } = await req.json();
    if (!loi_id) return json({ error: "loi_id required" }, 400);

    const { data: loi, error: loiErr } = await admin
      .from("letters_of_intent")
      .select("*")
      .eq("id", loi_id)
      .maybeSingle();
    if (loiErr || !loi) return json({ error: "LOI not found" }, 404);

    // Download signatures
    const advSig = await downloadSignature(admin, loi.advertiser_signature_path);
    const karbaliSig = loi.karbali_signature_path_snapshot
      ? await downloadSignature(admin, loi.karbali_signature_path_snapshot)
      : null;

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // Letter
    const { width, height } = page.getSize();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const margin = 54;
    let y = height - margin;

    // Header
    page.drawText("KARBALI ADS", { x: margin, y, size: 20, font: bold, color: rgb(0.06, 0.72, 0.51) });
    y -= 22;
    page.drawText("Letter of Intent — Consumer Demand Reservation", { x: margin, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 18;

    // Meta
    const today = new Date(loi.generated_at || loi.approved_at || new Date()).toISOString().slice(0, 10);
    drawKV(page, "Agreement ID", loi.agreement_id, margin, y, font, bold); y -= 14;
    drawKV(page, "Date", today, margin, y, font, bold); y -= 14;
    drawKV(page, "Country", loi.country, margin, y, font, bold); y -= 22;

    // Preamble
    y = drawParagraph(page,
      `This Letter of Intent ("LOI") is entered into on ${today} between ${loi.karbali_company_name_snapshot || "Karbali Ads"} ("Karbali") and ${loi.company_name} ("Advertiser"), a company operating in ${loi.country}. Advertiser hereby reserves future customer acquisition capacity on the Karbali platform on the terms below.`,
      margin, y, width - margin * 2, 10, font);
    y -= 10;

    // Company section
    y = section(page, "1. Advertiser", margin, y, bold);
    drawKV(page, "Company", loi.company_name, margin, y, font, bold); y -= 12;
    drawKV(page, "Website", loi.website, margin, y, font, bold); y -= 12;
    drawKV(page, "Contact", `${loi.contact_person} — ${loi.job_title}`, margin, y, font, bold); y -= 12;
    drawKV(page, "Email", loi.business_email, margin, y, font, bold); y -= 12;
    drawKV(page, "Phone", loi.phone, margin, y, font, bold); y -= 18;

    // Reservation section
    y = section(page, "2. Consumer Demand Reservation", margin, y, bold);
    drawKV(page, "Products", (loi.products || []).join(", "), margin, y, font, bold); y -= 12;
    drawKV(page, "Customer goal", `${Number(loi.customer_goal).toLocaleString()} users`, margin, y, font, bold); y -= 12;
    const dur = loi.duration_days ? `${loi.duration_days} days` : (loi.custom_duration_text || "Custom");
    drawKV(page, "Campaign duration", dur, margin, y, font, bold); y -= 12;
    const goal = loi.campaign_goal === "Custom" ? (loi.custom_goal_text || "Custom") : loi.campaign_goal;
    drawKV(page, "Campaign goal", goal, margin, y, font, bold); y -= 18;
    if (loi.notes) {
      y = drawParagraph(page, `Notes: ${loi.notes}`, margin, y, width - margin * 2, 10, italic);
      y -= 6;
    }

    // Terms
    y = section(page, "3. Terms", margin, y, bold);
    y = drawParagraph(page,
      "Karbali will notify the Advertiser once the reserved customer threshold is reached within the Karbali user base. Upon notification, Advertiser may launch a campaign targeting real, verified customer migration opportunities identified inside the Karbali ecosystem. This LOI expresses non-binding intent; final commercial terms will be captured in the campaign order signed at launch.",
      margin, y, width - margin * 2, 10, font);
    y -= 20;

    // Signatures
    const sigBoxY = Math.max(y - 90, 140);
    const colW = (width - margin * 2 - 30) / 2;

    // Karbali column
    page.drawText("For Karbali", { x: margin, y: sigBoxY + 70, size: 10, font: bold });
    if (karbaliSig) {
      const embed = await pdf.embedPng(karbaliSig);
      const scale = Math.min(140 / embed.width, 46 / embed.height);
      page.drawImage(embed, {
        x: margin,
        y: sigBoxY + 20,
        width: embed.width * scale,
        height: embed.height * scale,
      });
    }
    page.drawLine({ start: { x: margin, y: sigBoxY + 14 }, end: { x: margin + colW, y: sigBoxY + 14 }, thickness: 0.5 });
    page.drawText(loi.karbali_rep_name_snapshot || "Karbali Representative", { x: margin, y: sigBoxY, size: 9, font: bold });
    page.drawText(loi.karbali_rep_position_snapshot || "Authorized Signatory", { x: margin, y: sigBoxY - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(today, { x: margin, y: sigBoxY - 24, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

    // Advertiser column
    const advX = margin + colW + 30;
    page.drawText("For Advertiser", { x: advX, y: sigBoxY + 70, size: 10, font: bold });
    if (advSig) {
      const embed = await pdf.embedPng(advSig);
      const scale = Math.min(140 / embed.width, 46 / embed.height);
      page.drawImage(embed, {
        x: advX,
        y: sigBoxY + 20,
        width: embed.width * scale,
        height: embed.height * scale,
      });
    }
    page.drawLine({ start: { x: advX, y: sigBoxY + 14 }, end: { x: advX + colW, y: sigBoxY + 14 }, thickness: 0.5 });
    page.drawText(loi.contact_person, { x: advX, y: sigBoxY, size: 9, font: bold });
    page.drawText(loi.job_title, { x: advX, y: sigBoxY - 12, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(today, { x: advX, y: sigBoxY - 24, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

    // Footer
    page.drawText(`Agreement ${loi.agreement_id} · karbali.com`, {
      x: margin, y: 40, size: 8, font, color: rgb(0.6, 0.6, 0.6),
    });

    const bytes = await pdf.save();
    const path = `${loi.advertiser_id}/loi/${loi.agreement_id}.pdf`;
    const { error: upErr } = await admin.storage.from("loi-documents").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ success: true, path });
  } catch (err) {
    console.error("generate-loi-pdf error", err);
    return json({ error: err instanceof Error ? err.message : "server error" }, 500);
  }
});

async function downloadSignature(admin: any, path: string): Promise<Uint8Array | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from("loi-documents").download(path);
  if (error || !data) return null;
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

function drawKV(page: any, label: string, value: string, x: number, y: number, font: any, bold: any) {
  page.drawText(`${label}:`, { x, y, size: 9, font: bold });
  page.drawText(String(value || "—"), { x: x + 100, y, size: 9, font });
}

function section(page: any, title: string, x: number, y: number, bold: any) {
  page.drawText(title, { x, y, size: 11, font: bold, color: rgb(0.06, 0.72, 0.51) });
  return y - 16;
}

function drawParagraph(page: any, text: string, x: number, y: number, maxWidth: number, size: number, font: any) {
  const words = text.split(/\s+/);
  let line = "";
  const lineH = size + 3;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth) {
      page.drawText(line, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
      y -= lineH;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
    y -= lineH;
  }
  return y;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
