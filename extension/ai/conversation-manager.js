/**
 * Karbali Conversation Manager — Built from scratch
 * 
 * Manages:
 * 1. Session-based conversation memory
 * 2. Conversation state machine
 * 3. Follow-up detection and context threading
 * 4. Turn management and topic tracking
 */

const KarbaliConversationManager = (function () {
  "use strict";

  // ── Conversation States ───────────────────────────
  const STATES = {
    IDLE: "idle",
    GREETING: "greeting",
    EXPLORING: "exploring",        // browsing, general questions
    SHOPPING: "shopping",          // actively looking to buy
    COMPARING: "comparing",        // comparing options
    CHECKOUT_ASSIST: "checkout",   // helping at checkout
    SAVINGS_REVIEW: "savings",     // reviewing savings/points
    PARTNER_DISCOVERY: "partners", // finding partner merchants
  };

  // ── State Transitions ─────────────────────────────
  const TRANSITIONS = {
    [STATES.IDLE]: ["greeting", "exploring", "shopping", "savings", "partners"],
    [STATES.GREETING]: ["exploring", "shopping", "savings", "partners"],
    [STATES.EXPLORING]: ["shopping", "comparing", "savings", "partners", "exploring"],
    [STATES.SHOPPING]: ["comparing", "checkout", "savings", "partners", "shopping"],
    [STATES.COMPARING]: ["shopping", "checkout", "savings", "comparing"],
    [STATES.CHECKOUT_ASSIST]: ["savings", "partners", "shopping"],
    [STATES.SAVINGS_REVIEW]: ["shopping", "partners", "exploring"],
    [STATES.PARTNER_DISCOVERY]: ["shopping", "comparing", "savings", "exploring"],
  };

  // Intent to state mapping
  const INTENT_STATE_MAP = {
    greeting: STATES.GREETING,
    shopping: STATES.SHOPPING,
    comparison: STATES.COMPARING,
    checkout: STATES.CHECKOUT_ASSIST,
    savings_check: STATES.SAVINGS_REVIEW,
    partner_search: STATES.PARTNER_DISCOVERY,
    price_check: STATES.SHOPPING,
    research: STATES.EXPLORING,
    help: STATES.EXPLORING,
    unknown: null, // don't transition
  };

  // ── Session Memory ────────────────────────────────
  let conversationHistory = [];
  let currentState = STATES.IDLE;
  let sessionTopics = [];       // topics discussed this session
  let activeProduct = null;     // product being discussed
  let activeCategory = null;    // category being explored
  let turnCount = 0;
  let lastIntent = null;
  let lastContext = null;
  let followUpChain = 0;        // consecutive follow-ups on same topic

  // ── Follow-Up Detection ───────────────────────────
  const FOLLOW_UP_PATTERNS = [
    /^(and|also|what about|how about|tell me more|more|go on|continue)/i,
    /^(yes|yeah|yep|sure|ok|okay|please|do it|go ahead|show me)/i,
    /^(no|nah|not really|never mind|skip|cancel)/i,
    /^(this one|that one|the first|the second|option \d)/i,
    /^(why|how|when|where)\??$/i,
  ];

  const AFFIRMATIVE = /^(yes|yeah|yep|sure|ok|okay|please|do it|go ahead|show me|absolutely|definitely|of course)/i;
  const NEGATIVE = /^(no|nah|not really|never mind|skip|cancel|nope|not now|later)/i;

  function isFollowUp(text) {
    const trimmed = text.trim();
    // Very short messages are likely follow-ups
    if (trimmed.split(/\s+/).length <= 3 && turnCount > 0) return true;
    return FOLLOW_UP_PATTERNS.some((p) => p.test(trimmed));
  }

  function isAffirmative(text) {
    return AFFIRMATIVE.test(text.trim());
  }

  function isNegative(text) {
    return NEGATIVE.test(text.trim());
  }

  // ── Topic Tracking ────────────────────────────────
  function updateTopics(intent, category, entities) {
    const topic = {
      intent,
      category,
      entities,
      timestamp: Date.now(),
    };

    // Avoid duplicates
    const isDuplicate = sessionTopics.some(
      (t) => t.intent === intent && t.category === category && Date.now() - t.timestamp < 60000
    );
    if (!isDuplicate) {
      sessionTopics.push(topic);
      // Keep only last 20 topics
      if (sessionTopics.length > 20) sessionTopics.shift();
    }
  }

  // ── State Machine ─────────────────────────────────
  function transitionState(intent) {
    const targetState = INTENT_STATE_MAP[intent];
    if (!targetState) return currentState; // unknown intent, stay

    const allowedTransitions = TRANSITIONS[currentState];
    if (allowedTransitions && allowedTransitions.includes(targetState)) {
      currentState = targetState;
    } else {
      // Force transition for strong signals
      currentState = targetState;
    }
    return currentState;
  }

  // ── Process a Turn ────────────────────────────────
  function processTurn(userText, classification, pageContext) {
    turnCount++;

    const isFollowUpMsg = isFollowUp(userText);
    const isAffirmativeMsg = isAffirmative(userText);
    const isNegativeMsg = isNegative(userText);

    // Build turn data
    const turn = {
      role: "user",
      text: userText,
      intent: classification.intent,
      category: classification.category,
      confidence: classification.confidence,
      entities: classification.entities,
      isFollowUp: isFollowUpMsg,
      isAffirmative: isAffirmativeMsg,
      isNegative: isNegativeMsg,
      pageContext: pageContext ? {
        pageType: pageContext.pageType,
        domain: pageContext.domain,
        product: pageContext.product,
      } : null,
      timestamp: Date.now(),
      turnNumber: turnCount,
    };

    // Update state
    if (!isFollowUpMsg || classification.confidence > 0.6) {
      transitionState(classification.intent);
    }

    if (isFollowUpMsg) {
      followUpChain++;
    } else {
      followUpChain = 0;
    }

    // Track active product
    if (classification.category !== "general") {
      activeCategory = classification.category;
    }
    if (pageContext?.product?.name) {
      activeProduct = pageContext.product;
    }

    // Update topics
    updateTopics(classification.intent, classification.category, classification.entities);

    // Store in history
    conversationHistory.push(turn);

    // Keep history manageable
    if (conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-30);
    }

    lastIntent = classification.intent;
    lastContext = pageContext;

    return {
      turn,
      state: currentState,
      isFollowUp: isFollowUpMsg,
      isAffirmative: isAffirmativeMsg,
      isNegative: isNegativeMsg,
      followUpChain,
      activeProduct,
      activeCategory,
      recentTopics: sessionTopics.slice(-5),
    };
  }

  // ── Add Assistant Response ────────────────────────
  function addAssistantTurn(responseText, metadata) {
    conversationHistory.push({
      role: "assistant",
      text: responseText,
      metadata,
      timestamp: Date.now(),
      turnNumber: turnCount,
    });
  }

  // ── Context Summary for AI Fallback ───────────────
  function getConversationSummary() {
    const recentTurns = conversationHistory.slice(-8);
    return {
      state: currentState,
      turnCount,
      activeProduct,
      activeCategory,
      recentTopics: sessionTopics.slice(-5),
      history: recentTurns.map((t) => ({
        role: t.role,
        text: t.text?.substring(0, 200),
        intent: t.intent,
      })),
    };
  }

  // ── Get messages formatted for AI gateway fallback ─
  function getMessagesForAI() {
    return conversationHistory.slice(-10).map((t) => ({
      role: t.role === "assistant" ? "assistant" : "user",
      content: t.text,
    }));
  }

  // ── Reset Session ─────────────────────────────────
  function reset() {
    conversationHistory = [];
    currentState = STATES.IDLE;
    sessionTopics = [];
    activeProduct = null;
    activeCategory = null;
    turnCount = 0;
    lastIntent = null;
    lastContext = null;
    followUpChain = 0;
  }

  return {
    STATES,
    processTurn,
    addAssistantTurn,
    getConversationSummary,
    getMessagesForAI,
    isFollowUp,
    isAffirmative,
    isNegative,
    reset,
    getState: () => currentState,
    getTurnCount: () => turnCount,
    getActiveProduct: () => activeProduct,
    getActiveCategory: () => activeCategory,
  };
})();

if (typeof window !== "undefined") {
  window.KarbaliConversationManager = KarbaliConversationManager;
}
