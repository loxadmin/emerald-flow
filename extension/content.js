/**
 * Karbali AI Assistant — Content Script
 * Injected on every page to provide floating AI button, chat panel,
 * partner badge, checkout detection, and search filtering.
 */

(function () {
  "use strict";
  if (window.__karbaliContentLoaded) return;
  window.__karbaliContentLoaded = true;

  const API_BASE = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";

  // ── State ──────────────────────────────────────────
  let chatOpen = false;
  let chatMessages = [];
  let isTyping = false;
  let currentOffer = null;
  let isPartnerSite = false;
  let checkoutPromptShown = false;
  let searchFilterVisible = false;

  // ── Helpers ────────────────────────────────────────
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  async function getToken() {
    const { access_token } = await chrome.storage.local.get("access_token");
    return access_token || null;
  }

  function getPageContext() {
    const url = location.href;
    const title = document.title;
    const isSearch = /google\.|bing\.|yahoo\.|duckduckgo\./.test(location.hostname);
    const isCheckout = /checkout|cart|payment|order|pay/i.test(url + " " + title);
    const isProduct = /product|item|shop|buy|store/i.test(url + " " + title);

    let pageType = "browsing";
    if (isSearch) pageType = "search";
    else if (isCheckout) pageType = "checkout";
    else if (isProduct) pageType = "product";

    return { url, title, pageType, isPartner: isPartnerSite, offer: currentOffer };
  }

  function isSearchPage() {
    return /google\.|bing\.|yahoo\.|duckduckgo\./.test(location.hostname);
  }

  function isCheckoutPage() {
    return /checkout|cart|payment|order-confirm|pay\b/i.test(location.href + " " + document.title);
  }

  // ── API Calls ──────────────────────────────────────
  async function callAI(userMessage) {
    const token = await getToken();
    if (!token) return "Please sign in to use Karbali AI. Click the extension icon in your toolbar.";

    chatMessages.push({ role: "user", content: userMessage });

    try {
      const resp = await fetch(`${API_BASE}/extension-ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          messages: chatMessages.slice(-10), // last 10 for context window
          page_context: getPageContext(),
        }),
      });

      if (resp.status === 401) {
        return "Your session expired. Please sign in again via the extension popup.";
      }
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        return d.error || "Something went wrong. Try again!";
      }

      const data = await resp.json();
      const reply = data.reply || "I'm not sure how to help with that.";
      chatMessages.push({ role: "assistant", content: reply });
      return reply;
    } catch (e) {
      console.error("Karbali AI error:", e);
      return "Connection issue. Please check your internet and try again.";
    }
  }

  async function checkPartnerStatus() {
    const token = await getToken();
    if (!token) return;

    try {
      const resp = await fetch(`${API_BASE}/detect-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ url: location.href }),
      });

      if (!resp.ok) return;
      const data = await resp.json();

      if (data.offer) {
        currentOffer = data.offer;
        isPartnerSite = true;
        showPartnerBadge(data.offer);
        updateFloatingButtonNotification(true);
      } else {
        currentOffer = null;
        isPartnerSite = false;
        removePartnerBadge();
        updateFloatingButtonNotification(false);
      }
    } catch (e) {
      console.error("Karbali partner check failed:", e);
    }
  }

  // ── UI: Floating Button ────────────────────────────
  function createFloatingButton() {
    if (document.getElementById("karbali-floating-btn")) return;

    const btn = document.createElement("button");
    btn.id = "karbali-floating-btn";
    btn.innerHTML = `
      <span class="karbali-btn-icon">K</span>
      <span class="karbali-notification-dot"></span>
    `;
    btn.addEventListener("click", toggleChatPanel);
    document.body.appendChild(btn);
  }

  function updateFloatingButtonNotification(active) {
    const dot = document.querySelector("#karbali-floating-btn .karbali-notification-dot");
    if (dot) dot.classList.toggle("active", active);
  }

  // ── UI: Partner Badge ──────────────────────────────
  function showPartnerBadge(offer) {
    removePartnerBadge();
    const badge = document.createElement("div");
    badge.id = "karbali-partner-badge";
    badge.innerHTML = `✔ Karbali Partner &nbsp;·&nbsp; 💰 ${offer.reward_points.toLocaleString()} pts available`;
    badge.addEventListener("click", () => {
      openChatPanel();
      sendQuickMessage("Tell me about the savings available on this site");
    });
    document.body.appendChild(badge);
  }

  function removePartnerBadge() {
    document.getElementById("karbali-partner-badge")?.remove();
  }

  // ── UI: Chat Panel ─────────────────────────────────
  function createChatPanel() {
    if (document.getElementById("karbali-chat-panel")) return;

    const panel = document.createElement("div");
    panel.id = "karbali-chat-panel";
    panel.innerHTML = `
      <div class="karbali-chat-header">
        <div class="karbali-chat-header-left">
          <div class="karbali-chat-header-logo">K</div>
          <div>
            <div class="karbali-chat-header-title">Karbali AI</div>
            <div class="karbali-chat-header-subtitle">Your savings assistant</div>
          </div>
        </div>
        <button class="karbali-chat-close" id="karbali-close-chat">×</button>
      </div>
      <div class="karbali-quick-actions" id="karbali-quick-actions">
        <button class="karbali-quick-action" data-msg="What savings are available here?">💰 Check Savings</button>
        <button class="karbali-quick-action" data-msg="Show me Karbali partner alternatives">🔍 Find Partners</button>
        <button class="karbali-quick-action" data-msg="Compare options for what I'm looking at">⚖️ Compare</button>
        <button class="karbali-quick-action" data-msg="Help me save money on this purchase">🛒 Save More</button>
      </div>
      <div class="karbali-chat-messages" id="karbali-messages"></div>
      <div class="karbali-chat-input-area">
        <div class="karbali-chat-input-wrap">
          <textarea class="karbali-chat-input" id="karbali-input" placeholder="Ask me anything about savings..." rows="1"></textarea>
          <button class="karbali-chat-send" id="karbali-send">➤</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Event listeners
    document.getElementById("karbali-close-chat").addEventListener("click", closeChatPanel);
    document.getElementById("karbali-send").addEventListener("click", handleSend);
    document.getElementById("karbali-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Quick actions
    document.querySelectorAll(".karbali-quick-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        sendQuickMessage(btn.dataset.msg);
      });
    });

    // Welcome message
    addMessageToUI("assistant", "Hey! 👋 I'm your Karbali AI assistant. I help you find savings while you browse. What are you looking for today?");
  }

  function toggleChatPanel() {
    chatOpen ? closeChatPanel() : openChatPanel();
  }

  function openChatPanel() {
    createChatPanel();
    const panel = document.getElementById("karbali-chat-panel");
    setTimeout(() => panel.classList.add("open"), 10);
    chatOpen = true;
  }

  function closeChatPanel() {
    const panel = document.getElementById("karbali-chat-panel");
    if (panel) {
      panel.classList.remove("open");
      chatOpen = false;
    }
  }

  function addMessageToUI(role, content) {
    const container = document.getElementById("karbali-messages");
    if (!container) return;

    const msg = document.createElement("div");
    msg.className = `karbali-msg ${role}`;
    msg.innerHTML = escapeHtml(content);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  function showTypingIndicator() {
    const container = document.getElementById("karbali-messages");
    if (!container) return;

    const typing = document.createElement("div");
    typing.className = "karbali-typing";
    typing.id = "karbali-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    document.getElementById("karbali-typing")?.remove();
  }

  async function handleSend() {
    const input = document.getElementById("karbali-input");
    const text = input.value.trim();
    if (!text || isTyping) return;

    input.value = "";
    addMessageToUI("user", text);

    isTyping = true;
    document.getElementById("karbali-send").disabled = true;
    showTypingIndicator();

    const reply = await callAI(text);

    removeTypingIndicator();
    addMessageToUI("assistant", reply);
    isTyping = false;
    document.getElementById("karbali-send").disabled = false;
  }

  function sendQuickMessage(msg) {
    openChatPanel();
    const input = document.getElementById("karbali-input");
    if (input) {
      input.value = msg;
      handleSend();
    }
  }

  // ── UI: Checkout Prompt ────────────────────────────
  function showCheckoutPrompt() {
    if (checkoutPromptShown || document.getElementById("karbali-checkout-prompt")) return;
    checkoutPromptShown = true;

    const prompt = document.createElement("div");
    prompt.id = "karbali-checkout-prompt";
    prompt.innerHTML = `
      <button class="karbali-checkout-close" id="karbali-checkout-dismiss">×</button>
      <div class="karbali-checkout-title">💰 Karbali Savings Check</div>
      <div class="karbali-checkout-text">
        ${isPartnerSite
          ? "Great news! This is a Karbali partner site. You could be earning savings on this purchase!"
          : "This site isn't a Karbali partner yet. Want to see partner alternatives that could boost your savings?"
        }
      </div>
      <div class="karbali-checkout-actions">
        <button class="karbali-checkout-btn primary" id="karbali-checkout-check">
          ${isPartnerSite ? "View Savings" : "Find Alternatives"}
        </button>
        <button class="karbali-checkout-btn secondary" id="karbali-checkout-skip">Not Now</button>
      </div>
    `;
    document.body.appendChild(prompt);

    document.getElementById("karbali-checkout-check").addEventListener("click", () => {
      prompt.remove();
      const msg = isPartnerSite
        ? "I'm about to checkout. How much am I earning in savings from this purchase?"
        : "I'm about to buy something here. Can you show me Karbali partner alternatives where I'd earn savings?";
      sendQuickMessage(msg);
    });

    document.getElementById("karbali-checkout-skip").addEventListener("click", () => prompt.remove());
    document.getElementById("karbali-checkout-dismiss").addEventListener("click", () => prompt.remove());
  }

  // ── UI: Search Filter ──────────────────────────────
  function createSearchFilter() {
    if (document.getElementById("karbali-search-filter") || !isSearchPage()) return;

    const filter = document.createElement("div");
    filter.id = "karbali-search-filter";
    filter.innerHTML = `
      <div class="karbali-filter-title">🔍 Karbali Search Filter</div>
      <label class="karbali-filter-option">
        <input type="checkbox" class="karbali-filter-checkbox" id="karbali-filter-partners" />
        Show Karbali Partners Only
      </label>
      <label class="karbali-filter-option">
        <input type="checkbox" class="karbali-filter-checkbox" id="karbali-filter-savings" />
        Highest Savings First
      </label>
      <label class="karbali-filter-option">
        <input type="checkbox" class="karbali-filter-checkbox" id="karbali-filter-verified" />
        Verified Stores Only
      </label>
      <div class="karbali-filter-results" id="karbali-filter-results"></div>
    `;
    document.body.appendChild(filter);

    // Toggling filters triggers AI search
    filter.querySelectorAll(".karbali-filter-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => {
        const searchQuery = getSearchQuery();
        if (searchQuery) {
          sendQuickMessage(`Find Karbali partners for: "${searchQuery}"`);
        }
      });
    });
  }

  function toggleSearchFilter() {
    const filter = document.getElementById("karbali-search-filter");
    if (!filter) return;
    searchFilterVisible = !searchFilterVisible;
    filter.classList.toggle("visible", searchFilterVisible);
  }

  function getSearchQuery() {
    // Extract from Google/Bing search input
    const searchInput = document.querySelector('input[name="q"], input[name="search"], input[type="search"]');
    return searchInput?.value || "";
  }

  // ── Initialization ─────────────────────────────────
  async function init() {
    const token = await getToken();
    if (!token) return; // Not authenticated, don't show anything

    // Create UI elements
    createFloatingButton();

    // Check partner status
    await checkPartnerStatus();

    // Search page: create filter panel
    if (isSearchPage()) {
      createSearchFilter();
    }

    // Checkout detection
    if (isCheckoutPage()) {
      setTimeout(showCheckoutPrompt, 2000);
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "OFFER_FOUND") {
        currentOffer = msg.offer;
        isPartnerSite = true;
        showPartnerBadge(msg.offer);
        updateFloatingButtonNotification(true);
      }
      if (msg.type === "OFFER_CLEARED") {
        currentOffer = null;
        isPartnerSite = false;
        removePartnerBadge();
        updateFloatingButtonNotification(false);
      }
    });

    // Override floating button click on search pages to also toggle filter
    if (isSearchPage()) {
      const btn = document.getElementById("karbali-floating-btn");
      if (btn) {
        btn.removeEventListener("click", toggleChatPanel);
        btn.addEventListener("click", () => {
          toggleSearchFilter();
          toggleChatPanel();
        });
      }
    }
  }

  // Run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
