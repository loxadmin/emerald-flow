/**
 * Karbali AI Assistant — Content Script (v2.0)
 * 
 * Uses the from-scratch NLP pipeline:
 * 1. KarbaliIntentClassifier — intent detection, entity extraction
 * 2. KarbaliContextParser — DOM/URL page context analysis
 * 3. KarbaliConversationManager — session memory, state machine
 * 4. KarbaliResponseEngine — template-based + AI fallback responses
 * 
 * AI Gateway is only used as a fallback for complex/ambiguous queries.
 */

(function () {
  "use strict";
  if (window.__karbaliContentLoaded) return;
  window.__karbaliContentLoaded = true;

  const API_BASE = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";

  // ── State ──────────────────────────────────────────
  let chatOpen = false;
  let isProcessing = false;
  let currentOffer = null;
  let isPartnerSite = false;
  let checkoutPromptShown = false;
  let searchFilterVisible = false;
  let pageContext = null;

  // ── Helpers ────────────────────────────────────────
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // Simple markdown-like formatting for responses
  function formatResponse(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  async function getToken() {
    const { access_token } = await chrome.storage.local.get("access_token");
    return access_token || null;
  }

  // ── NLP Pipeline ───────────────────────────────────
  function processUserInput(text) {
    // 1. Parse page context
    pageContext = KarbaliContextParser.parse();

    // 2. Classify intent
    const classification = KarbaliIntentClassifier.classify(text, {
      pageType: pageContext.pageType,
      isPartner: isPartnerSite,
    });

    // 3. Process through conversation manager
    const convState = KarbaliConversationManager.processTurn(text, classification, pageContext);

    // 4. Generate response
    const response = KarbaliResponseEngine.generate(classification, convState, pageContext, currentOffer);

    return { classification, convState, response, pageContext };
  }

  // ── AI Gateway Fallback ────────────────────────────
  async function callAIGateway(userMessage) {
    const token = await getToken();
    if (!token) return "Please sign in to use Karbali AI. Click the extension icon in your toolbar.";

    const messages = KarbaliConversationManager.getMessagesForAI();
    const summary = KarbaliConversationManager.getConversationSummary();

    try {
      const resp = await fetch(`${API_BASE}/extension-ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          messages,
          page_context: {
            url: pageContext?.url,
            title: pageContext?.title,
            pageType: pageContext?.pageType,
            isPartner: isPartnerSite,
            offer: currentOffer,
            product: pageContext?.product,
            searchQuery: pageContext?.searchQuery,
            conversationState: summary.state,
            activeCategory: summary.activeCategory,
          },
        }),
      });

      if (resp.status === 401) return "Your session expired. Please sign in again via the extension popup.";
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        return d.error || "Something went wrong. Try again!";
      }

      const data = await resp.json();
      return data.reply || "I'm not sure how to help with that.";
    } catch (e) {
      console.error("Karbali AI Gateway error:", e);
      return "Connection issue. Please check your internet and try again.";
    }
  }

  // ── Main Message Handler ───────────────────────────
  async function handleUserMessage(text) {
    // Run NLP pipeline
    const { classification, convState, response } = processUserInput(text);

    console.log("[Karbali NLP]", {
      intent: classification.intent,
      confidence: classification.confidence,
      category: classification.category,
      state: convState.state,
      needsAI: response.needsAI,
      reason: response.reason,
    });

    let finalResponse;

    if (response.text && !response.needsAI) {
      // Local NLP handled it fully
      finalResponse = response.text;
    } else if (response.text && response.needsAI) {
      // Show local response immediately, then enhance with AI
      addMessageToUI("assistant", response.text);

      // Call AI for richer follow-up
      const aiResponse = await callAIGateway(text);
      finalResponse = aiResponse;
    } else {
      // Full AI fallback
      finalResponse = await callAIGateway(text);
    }

    // Store assistant response in conversation manager
    KarbaliConversationManager.addAssistantTurn(finalResponse, {
      intent: classification.intent,
      wasAIFallback: response.needsAI,
    });

    return finalResponse;
  }

  // ── Partner Check ──────────────────────────────────
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
    btn.addEventListener("click", () => {
      toggleChatPanel();
      if (isSearchPage()) toggleSearchFilter();
    });
    document.body.appendChild(btn);
  }

  function updateFloatingButtonNotification(active) {
    const dot = document.querySelector("#karbali-floating-btn .karbali-notification-dot");
    if (dot) dot.classList.toggle("active", active);
  }

  function isSearchPage() {
    return /google\.|bing\.|yahoo\.|duckduckgo\./.test(location.hostname);
  }

  // ── UI: Partner Badge ──────────────────────────────
  function showPartnerBadge(offer) {
    removePartnerBadge();
    const badge = document.createElement("div");
    badge.id = "karbali-partner-badge";
    badge.innerHTML = `✔ Karbali Partner &nbsp;·&nbsp; 💰 ${offer.reward_points.toLocaleString()} pts available`;
    badge.addEventListener("click", () => {
      openChatPanel();
      setTimeout(() => {
        const input = document.getElementById("karbali-input");
        if (input) {
          input.value = "Tell me about the savings available on this site";
          handleSend();
        }
      }, 300);
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
        const input = document.getElementById("karbali-input");
        if (input) {
          input.value = btn.dataset.msg;
          handleSend();
        }
      });
    });

    // Show contextual welcome based on NLP page analysis
    showContextualWelcome();
  }

  async function showContextualWelcome() {
    const token = await getToken();
    if (!token) {
      addMessageToUI("assistant", "👋 Omo, welcome! Sign in first to unlock savings. Click the extension icon in your toolbar → Sign In.");
      return;
    }

    const ctx = KarbaliContextParser.quickContext();

    let welcome;
    if (ctx.pageType === "checkout") {
      welcome = isPartnerSite
        ? "👋 Omo you dey checkout! Na Karbali partner site be this — your points go enter sharp sharp! 💰"
        : "👋 Wahala! You wan checkout but this site no be Karbali partner o. Make I find better alternative?";
    } else if (ctx.pageType === "product") {
      welcome = isPartnerSite
        ? "👋 E be like say you eye something! This na Karbali partner — savings dey here! Ask me wetin you need!"
        : "👋 Browsing products? I fit find Karbali partner stores where you go earn savings on similar things!";
    } else if (ctx.pageType === "search") {
      welcome = `👋 You dey search for "${ctx.searchQuery || "something"}"? Make I filter am show you Karbali partners!`;
    } else {
      welcome = "👋 Omo, I be your Karbali AI guy! I dey help you save money as you dey browse. Ask me anything!";
    }

    addMessageToUI("assistant", welcome);
  }

  function toggleChatPanel() {
    chatOpen ? closeChatPanel() : openChatPanel();
  }

  function openChatPanel() {
    createChatPanel();
    setTimeout(() => document.getElementById("karbali-chat-panel")?.classList.add("open"), 10);
    chatOpen = true;
  }

  function closeChatPanel() {
    const panel = document.getElementById("karbali-chat-panel");
    if (panel) panel.classList.remove("open");
    chatOpen = false;
  }

  function addMessageToUI(role, content) {
    const container = document.getElementById("karbali-messages");
    if (!container) return;

    const msg = document.createElement("div");
    msg.className = `karbali-msg ${role}`;
    msg.innerHTML = formatResponse(content);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById("karbali-messages");
    if (!container) return;
    const typing = document.createElement("div");
    typing.className = "karbali-typing";
    typing.id = "karbali-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    document.getElementById("karbali-typing")?.remove();
  }

  async function handleSend() {
    const input = document.getElementById("karbali-input");
    const text = input.value.trim();
    if (!text || isProcessing) return;

    input.value = "";
    addMessageToUI("user", text);
    isProcessing = true;
    document.getElementById("karbali-send").disabled = true;
    showTyping();

    const reply = await handleUserMessage(text);

    removeTyping();
    addMessageToUI("assistant", reply);
    isProcessing = false;
    document.getElementById("karbali-send").disabled = false;
  }

  // ── UI: Checkout Prompt ────────────────────────────
  function showCheckoutPrompt() {
    if (checkoutPromptShown || document.getElementById("karbali-checkout-prompt")) return;
    checkoutPromptShown = true;

    const suggestion = KarbaliResponseEngine.generateProactiveSuggestion(
      KarbaliContextParser.quickContext(),
      currentOffer
    );
    if (!suggestion) return;

    const prompt = document.createElement("div");
    prompt.id = "karbali-checkout-prompt";
    prompt.innerHTML = `
      <button class="karbali-checkout-close" id="karbali-checkout-dismiss">×</button>
      <div class="karbali-checkout-title">💰 Karbali Savings Check</div>
      <div class="karbali-checkout-text">${escapeHtml(suggestion.text)}</div>
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
      openChatPanel();
      setTimeout(() => {
        const input = document.getElementById("karbali-input");
        if (input) {
          input.value = isPartnerSite
            ? "How much am I earning in savings from this purchase?"
            : "Show me Karbali partner alternatives for what I'm buying";
          handleSend();
        }
      }, 300);
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

    filter.querySelectorAll(".karbali-filter-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => {
        const query = KarbaliContextParser.extractSearchQuery(location.href);
        if (query) {
          openChatPanel();
          setTimeout(() => {
            const input = document.getElementById("karbali-input");
            if (input) {
              input.value = `Find Karbali partners for: "${query}"`;
              handleSend();
            }
          }, 300);
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

  // ── Background Communication ───────────────────────
  function setupBackgroundListener() {
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
  }

  // ── Initialization ─────────────────────────────────
  async function init() {
    // Always show floating button so users know the extension is active
    createFloatingButton();

    // Listen for background messages regardless of auth
    setupBackgroundListener();

    const token = await getToken();
    if (!token) {
      console.log("[Karbali AI] No token — floating button visible, chat requires sign-in");
      return;
    }

    // Check partner status
    await checkPartnerStatus();

    // Parse initial page context
    pageContext = KarbaliContextParser.parse();

    // Search page: create filter
    if (isSearchPage()) createSearchFilter();

    // Checkout detection with proactive prompt
    if (pageContext.pageType === "checkout") {
      setTimeout(showCheckoutPrompt, 2000);
    }

    // Product page proactive suggestion
    if (pageContext.pageType === "product" && isPartnerSite) {
      updateFloatingButtonNotification(true);
    }

    console.log("[Karbali AI] Initialized", {
      pageType: pageContext.pageType,
      isPartner: isPartnerSite,
      domain: pageContext.domain,
    });
  }

  // Run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
