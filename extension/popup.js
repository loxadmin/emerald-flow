const API_BASE = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";
const AUTH_URL = "https://www.karbali.com/auth?extension=1";
const AUTH_STORAGE_KEYS = ["access_token", "user_email", "user_name", "user_id", "user_avatar_url"];

const app = document.getElementById("app");

async function refreshAuthState() {
  try {
    return await chrome.runtime.sendMessage({ type: "REFRESH_AUTH_SESSION" });
  } catch {
    return null;
  }
}

async function init() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEYS);

  if (!stored.access_token) {
    renderAuthScreen();
  } else {
    const authState = await refreshAuthState();

    if (authState && !authState.authenticated) {
      renderAuthScreen();
      return;
    }

    renderMainScreen(
      authState?.user?.name ||
      authState?.user?.email ||
      stored.user_name ||
      stored.user_email ||
      "Connected"
    );
  }
}

function renderAuthScreen() {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="logo" style="justify-content:center;margin-bottom:20px;">
        <div class="logo-icon">K</div>
        <span>Karbali</span>
      </div>
      <h2>Earn While You Browse</h2>
      <p>Sign in to discover offers and earn points from the sites you already visit.</p>
      <button class="btn btn-primary" id="signInBtn">Sign in with Karbali</button>
      <br>
      <button class="btn btn-ghost" id="tokenBtn">Enter token manually</button>
    </div>
  `;

  document.getElementById("signInBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: AUTH_URL });
  });

  document.getElementById("tokenBtn").addEventListener("click", () => {
    renderTokenInput();
  });
}

function renderTokenInput() {
  app.innerHTML = `
    <div class="content">
      <div class="logo" style="margin-bottom:16px;">
        <div class="logo-icon">K</div>
        <span>Karbali</span>
      </div>
      <p style="font-size:13px;color:#94A3B8;margin-bottom:12px;">Paste your access token from the Karbali app:</p>
      <textarea id="tokenInput" style="width:100%;height:80px;background:#1E293B;border:1px solid #334155;border-radius:8px;color:#E2E8F0;padding:10px;font-size:12px;resize:none;" placeholder="Paste your JWT token here..."></textarea>
      <button class="btn-claim" id="saveTokenBtn" style="margin-top:12px;">Save & Connect</button>
      <button class="btn btn-ghost" id="backBtn" style="display:block;width:100%;text-align:center;">Back</button>
    </div>
  `;

  document.getElementById("saveTokenBtn").addEventListener("click", async () => {
    const token = document.getElementById("tokenInput").value.trim();
    if (!token) return;

    try {
      const result = await chrome.runtime.sendMessage({
        type: "SYNC_AUTH_SESSION",
        access_token: token,
      });

      if (!result?.success) {
        alert(result?.error || "Invalid token. Please check and try again.");
        return;
      }

      init();
    } catch {
      alert("Failed to validate token. Check your connection.");
    }
  });

  document.getElementById("backBtn").addEventListener("click", () => renderAuthScreen());
}

async function renderMainScreen(email) {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;

  // Get cached offer
  const offerKey = `offer_${tabId}`;
  const stored = await chrome.storage.local.get(offerKey);
  const offer = stored[offerKey];

  app.innerHTML = `
    <div class="header">
      <div class="logo">
        <div class="logo-icon">K</div>
        <span>Karbali</span>
      </div>
      <div class="points-badge" id="pointsBadge">⚡ Active</div>
    </div>
    <div class="content" id="offerArea">
      <div style="font-size:12px;color:#94A3B8;margin-bottom:12px;">Signed in as ${escapeHtml(email)}</div>
      ${offer ? renderOfferCard(offer) : renderNoOffer()}
    </div>
    <div class="footer">
      <a class="footer-link" href="https://karbali.com" target="_blank">karbali.com</a>
      <a class="footer-link" id="logoutBtn">Sign out</a>
    </div>
  `;

  if (offer) {
    document.getElementById("claimBtn")?.addEventListener("click", () => handleClaim(offer));
  }

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "LOGOUT" });
    init();
  });
}

function renderOfferCard(offer) {
  const nairaValue = (offer.payout_naira || 0).toFixed(2);
  const events = offer.event_types || ["signup"];

  return `
    <div class="offer-card has-offer">
      <div class="offer-title">${escapeHtml(offer.title)}</div>
      <div class="offer-points">🪙 ${offer.reward_points.toLocaleString()} points</div>
      <div class="offer-naira">≈ ₦${nairaValue} value</div>
      <div class="offer-events">
        ${events.map(e => `<span class="event-tag">${escapeHtml(e)}</span>`).join("")}
      </div>
      <button class="btn-claim" id="claimBtn">Claim Offer →</button>
      <div id="statusArea"></div>
    </div>
  `;
}

function renderNoOffer() {
  return `
    <div class="no-offer">
      <div class="no-offer-icon">🔍</div>
      <p>No offers for this site right now.</p>
      <p style="margin-top:4px;">Keep browsing — we'll alert you!</p>
    </div>
  `;
}

async function handleClaim(offer) {
  const btn = document.getElementById("claimBtn");
  const statusArea = document.getElementById("statusArea");
  btn.disabled = true;
  btn.textContent = "Processing...";

  const result = await chrome.runtime.sendMessage({
    type: "TRACK_CLICK",
    campaign_id: offer.campaign_id,
  });

  if (result.redirect_url) {
    statusArea.innerHTML = `<div class="status success">✅ Offer claimed! Opening...</div>`;
    setTimeout(() => {
      chrome.tabs.create({ url: result.redirect_url });
    }, 800);
  } else {
    const errMsg = result.error || "Failed to claim offer";
    statusArea.innerHTML = `<div class="status error">❌ ${escapeHtml(errMsg)}</div>`;
    btn.disabled = false;
    btn.textContent = "Claim Offer →";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
