# Scope: 5 workstreams

## 1. Karbali AI — real intelligence, in-browser (no external APIs)

You asked for machine learning, NLP, context awareness — built from scratch, no external AI API. Here's what that realistically means in a Vite/React app with zero backend AI, and I want to confirm before I build it:

**What I will build:**
- **Tokenizer + intent classifier** — a small in-browser ML classifier (bag-of-words + TF-IDF vectors + a logistic-regression / naive-Bayes model trained on ~200 hand-labeled Karbali intents: create campaign, pricing, milestones, tracking, wallet, refunds, subcategory help, etc). Ships as a JSON weights file (~30–80KB), runs in-browser with plain JS math — no external calls.
- **Entity extractor** — regex + fuzzy matching over the live Karbali taxonomy (subtypes, milestones, categories, currencies, platforms) so it pulls "musician + 5,000 streams + ₦200k budget" out of free text.
- **Context memory** — a `ConversationState` object that persists across turns: current advertiser subtype (auto-loaded from their profile — no re-asking), collected slots, last intent, disambiguation stack. Stored in `sessionStorage` so a refresh doesn't lose the thread.
- **Response engine** — templated, Karbali-accurate answers with Nigerian tone, driven by a `KnowledgeBase` object that mirrors your real pricing, milestones, and flows (single source of truth — no hallucinated numbers).
- **Action layer** — when intent = `create_campaign` and required slots are filled, it writes a draft to Supabase and hands off to the review page. No more "redirect to normal form".

**Honest limit:** this is real ML for classification/NER, but it's not a generative LLM. It will not invent novel prose the way ChatGPT does — every answer is composed from Karbali's own knowledge base. That's actually what you want (no hallucinated pricing), but confirm you're good with that framing before I ship the weights file.

Files: rewrite `src/lib/assistant-nlp.ts`, add `src/lib/ai/{tokenizer,classifier,entities,knowledge,state}.ts` + `src/lib/ai/model-weights.json`, rewire `AiMode.tsx` and `KarbaliAssistant.tsx`.

## 2. Skip subcategory re-pick

`AiMode.tsx` currently shows a "pick your goal" card that re-asks the subtype. I'll load the advertiser's `subtype` from `advertiser_categories` on mount and skip straight to goals/actions scoped to that subtype. Same fix on `Packages.tsx` (already partially there — I'll finish it) and `CategorySelection.tsx` (only prompt when subtype is actually null).

## 3. Rename modes: Simple / Advance

- DB `admin_settings.manual_mode_enabled` stays as the key (no migration needed), but every UI label changes:
  - "Manual mode" → **Simple mode**
  - "API tracking mode" → **Advance mode**
- Files: `AdminSettings.tsx`, `CreateManualCampaign.tsx`, `CampaignRouter.tsx`, `Docs.tsx`, `Index.tsx`, any admin toggles.
- When Simple mode is ON (current state), the homepage hero + a banner on Docs display: *"Simple mode is live — you only need your app / website / song / video link to launch. Every campaign is manually approved by a Karbali official."*
- Homepage: add a mode-aware strip under the hero that reads live from `admin_settings`.

## 4. Docs redesign — classy, minimalist

Full rewrite of `src/pages/Docs.tsx`:
- Sidebar TOC + wide reading column, generous whitespace, serif display headings + clean sans body, thin dividers, no gradients, no busy cards.
- Sections: *Overview*, *Simple mode (Manual)*, *Advance mode (API/SDK)*, *Metrics & Attribution*, *Milestones*, *Billing & Escrow*, *Wallet & Fees*, *Approval flow*, *FAQ*.
- Simple vs Advance table comparing: setup effort, tracking method, approval, latency, metrics available, fraud protection, best-for.
- Deep metric definitions: click, valid click, install, signup, KYC, deposit, transaction, sale, stream, view — how each is measured in each mode.
- Karbali.com branding untouched.

## 5. Terms & Conditions

- New page `src/pages/Terms.tsx` at `/terms` — structured sections: Eligibility, Acceptable Use, **Prohibited Content (scam sites, fraud offers, illegal goods, adult, gambling without license → immediate ban + wallet forfeiture)**, Billing & Refunds, IP, Data & Privacy, Suspension & Termination, Dispute Resolution, Contact.
- `Signup.tsx`: mandatory checkbox — *"I agree to the [Terms & Conditions](/terms)"* — signup button disabled until ticked. Store `terms_accepted_at` on the profile (add column via migration).
- Footer link to `/terms`.

## Order of execution

1. Terms page + signup checkbox + migration (quick, unblocks legal).
2. Rename modes + homepage/docs mode banner.
3. Docs redesign.
4. Skip-subcategory fix in AiMode + Packages + CategorySelection.
5. AI rebuild (biggest lift — done last so the rest ships fast).

## Confirm before I start

- **AI framing** in section 1 — real in-browser ML classifier + entity extractor + templated responses from a Karbali knowledge base, no generative LLM. Good?
- **Terms content** — I'll draft it Karbali-appropriate; you can edit copy after. OK to proceed without you reviewing every clause first?
