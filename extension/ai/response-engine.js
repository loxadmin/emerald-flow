/**
 * Karbali Response Engine — Built from scratch
 * 
 * Generates contextual responses using:
 * 1. Template-based response system for known intents
 * 2. Dynamic response composition based on context + intent + state
 * 3. Savings narrative framing
 * 4. AI gateway fallback only for complex/ambiguous queries
 */

const KarbaliResponseEngine = (function () {
  "use strict";

  const INTENTS = KarbaliIntentClassifier.INTENTS;

  // ── Response Templates ────────────────────────────
  // Each intent has multiple templates, randomly selected for variety
  // Placeholders: {product}, {domain}, {category}, {points}, {price}, {query}, {savings}

  const TEMPLATES = {
    [INTENTS.GREETING]: {
      responses: [
        "Hey there! 👋 I'm your Karbali AI assistant. I help you find savings while you browse. What can I help you with?",
        "Hi! Welcome to Karbali AI 🌟 I'm here to help you save money while you shop online. Ask me anything!",
        "Hello! 😊 Ready to help you maximize your savings. What are you looking for today?",
      ],
    },

    [INTENTS.HELP]: {
      responses: [
        "I can help you with:\n\n💰 **Check savings** — See if you're earning on this site\n🔍 **Find partners** — Discover Karbali merchant partners\n⚖️ **Compare options** — Help you choose the best deal\n🛒 **Checkout assist** — Verify you're earning savings at checkout\n\nJust tell me what you need!",
        "Here's what I do best:\n\n• Detect savings opportunities while you browse\n• Find Karbali partner stores for what you're shopping\n• Help compare products and prices\n• Make sure you earn points at checkout\n\nWhat would you like help with?",
      ],
    },

    [INTENTS.SHOPPING]: {
      noPartner: [
        "I see you're looking for {category} products! Let me check if there are Karbali partners that could help you save on this. Would you like me to search?",
        "Shopping for {category}? 🛍️ I can find Karbali partner stores where you'd earn savings on similar products. Want me to look?",
        "Looking to buy something in {category}? Let me see which Karbali partners offer savings on this type of purchase!",
      ],
      withPartner: [
        "Great news! 🎉 This is a Karbali partner site. You can earn up to **{points} points** on your purchase here. That's real savings added to your balance!",
        "You're on a Karbali partner site! 💰 This purchase could earn you **{points} points**. Make sure to complete your purchase to lock in those savings!",
      ],
      withProduct: [
        "I see you're looking at **{product}**! {partnerMsg} Want me to find the best savings options?",
        "Interested in **{product}**? {partnerMsg} I can help you get the most value!",
      ],
    },

    [INTENTS.COMPARISON]: {
      responses: [
        "I'd love to help you compare! Here's what I can check:\n\n🏷️ Which option has better Karbali savings\n✅ Which stores are verified partners\n💰 Where you'd earn more points\n\nWhat are you comparing?",
        "Let me help with that comparison! ⚖️ I can show you which options give you the best Karbali savings. Tell me more about what you're choosing between.",
      ],
      withProduct: [
        "Looking at **{product}**? I can help you compare this with similar options on Karbali partner sites where you'd earn savings. Want me to check?",
      ],
    },

    [INTENTS.CHECKOUT]: {
      isPartner: [
        "🎉 Great news! You're checking out on a Karbali partner site. You're earning **{points} points** on this purchase — that's being added to your savings balance automatically!",
        "✅ Savings confirmed! This checkout will earn you **{points} points** in your Karbali account. Enjoy your purchase!",
      ],
      notPartner: [
        "⚠️ This site isn't currently a Karbali partner, so you won't earn savings on this purchase. Want me to find partner alternatives where you could earn points on the same product?",
        "Heads up — you're not earning Karbali savings on this purchase. I can show you partner stores that sell similar products where you'd earn points. Interested?",
      ],
      generic: [
        "Looks like you're about to check out! 💰 Let me verify if you're earning Karbali savings on this purchase...",
      ],
    },

    [INTENTS.SAVINGS_CHECK]: {
      isPartner: [
        "✅ This site is a Karbali partner! You can earn **{points} points** (≈ ₦{savings}) on eligible purchases here. Your savings are looking good! 🌟",
        "Good news! 💰 You're on a Karbali partner site. Eligible purchases here earn you **{points} points**. Keep shopping smart!",
      ],
      notPartner: [
        "This site isn't a Karbali partner yet, so no savings are available here. But I can find partner alternatives! Want me to look?",
        "No savings available on this site currently. 😔 But Karbali has many partner stores — want me to find ones related to what you're browsing?",
      ],
    },

    [INTENTS.PARTNER_SEARCH]: {
      responses: [
        "I'll look for Karbali partner stores for you! 🔍 Our network includes verified merchants across fashion, electronics, food, and more. What type of store are you looking for?",
        "Let me search our partner network! Karbali has verified merchants where every purchase earns you savings. What category interests you?",
      ],
      withCategory: [
        "Looking for {category} partners? Let me check our network for verified {category} merchants where you can earn savings! 🔍",
        "I can find Karbali partner stores in {category}! These are verified merchants where your purchases earn real points. Let me search...",
      ],
    },

    [INTENTS.PRICE_CHECK]: {
      responses: [
        "I can help with pricing! While I can't check exact prices across all stores, I can tell you which Karbali partners offer savings on what you're looking for. That effectively reduces your cost! Want me to check?",
        "Looking for better prices? 💡 The best way to save is through Karbali partners — your purchases earn points that translate to real savings. Let me find options for you!",
      ],
      withProduct: [
        "Looking at **{product}** for {price}? I can check if there are Karbali partners offering this where you'd earn savings on top! That's like getting a discount 💰",
      ],
    },

    [INTENTS.RESEARCH]: {
      isPartner: [
        "This is a verified Karbali partner site ✅ — that means it's part of our trusted merchant network. You can shop here with confidence and earn savings!",
        "Good question! This site is a **Karbali verified partner** ✅ which means it meets our standards and your purchases here earn savings points.",
      ],
      notPartner: [
        "I don't have specific verification data for this site. It's not currently in the Karbali partner network. For guaranteed safe shopping with savings, I'd recommend checking our partner stores!",
        "This site isn't a Karbali partner, so I can't vouch for it specifically. Our partner network includes verified, trusted merchants — want me to find some?",
      ],
    },

    followUp: {
      affirmative: [
        "On it! 🚀 Let me look into that for you...",
        "Great choice! Let me check what's available...",
        "Sure thing! Searching for the best options...",
      ],
      negative: [
        "No problem! I'm here whenever you need help. Just ask! 😊",
        "Got it! Feel free to ask me anything else while you browse.",
        "Okay! I'll be right here if you change your mind or need help with something else.",
      ],
      continueExploring: [
        "Would you like me to look at anything else? I can check savings, find partners, or help compare options!",
      ],
    },

    [INTENTS.UNKNOWN]: {
      responses: [
        "I'm not quite sure what you mean, but I'm here to help with savings! I can:\n\n💰 Check if you're earning savings here\n🔍 Find partner stores\n⚖️ Compare shopping options\n\nWhat sounds helpful?",
        "Hmm, could you tell me more? I specialize in helping you save money while browsing. Try asking me about savings, partner stores, or product comparisons!",
      ],
    },
  };

  // ── Template Selection ────────────────────────────
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fillTemplate(template, data) {
    return template
      .replace(/\{product\}/g, data.product || "this product")
      .replace(/\{domain\}/g, data.domain || "this site")
      .replace(/\{category\}/g, data.category || "this category")
      .replace(/\{points\}/g, data.points?.toLocaleString() || "0")
      .replace(/\{price\}/g, data.price || "N/A")
      .replace(/\{query\}/g, data.query || "")
      .replace(/\{savings\}/g, data.savings || "0")
      .replace(/\{partnerMsg\}/g, data.partnerMsg || "");
  }

  // ── Main Response Generator ───────────────────────
  function generate(classification, conversationState, pageContext, offer) {
    const intent = classification.intent;
    const isPartner = !!offer;
    const templates = TEMPLATES[intent];

    // Build template data
    const data = {
      product: pageContext?.product?.name || classification.entities?.products?.[0] || null,
      domain: pageContext?.domain || "",
      category: classification.category !== "general" ? classification.category : null,
      points: offer?.reward_points || 0,
      price: pageContext?.product?.price || classification.entities?.prices?.[0] || null,
      query: pageContext?.searchQuery || "",
      savings: offer ? (offer.payout_naira || 0).toFixed(2) : "0",
      partnerMsg: isPartner
        ? `This is a Karbali partner — you can earn **${offer.reward_points?.toLocaleString()} points**!`
        : "This site isn't a Karbali partner yet.",
    };

    // Handle follow-ups
    if (conversationState.isFollowUp) {
      if (conversationState.isAffirmative) {
        return { text: pickRandom(TEMPLATES.followUp.affirmative), needsAI: true, reason: "follow_up_action" };
      }
      if (conversationState.isNegative) {
        return { text: pickRandom(TEMPLATES.followUp.negative), needsAI: false };
      }
    }

    // Low confidence — delegate to AI
    if (classification.confidence < 0.15 && intent === INTENTS.UNKNOWN) {
      return { text: null, needsAI: true, reason: "low_confidence" };
    }

    let responseText = null;

    switch (intent) {
      case INTENTS.GREETING:
        responseText = pickRandom(templates.responses);
        break;

      case INTENTS.HELP:
        responseText = pickRandom(templates.responses);
        break;

      case INTENTS.SHOPPING:
        if (data.product && templates.withProduct) {
          responseText = fillTemplate(pickRandom(templates.withProduct), data);
        } else if (isPartner) {
          responseText = fillTemplate(pickRandom(templates.withPartner), data);
        } else {
          responseText = fillTemplate(pickRandom(templates.noPartner), data);
        }
        break;

      case INTENTS.COMPARISON:
        if (data.product && templates.withProduct) {
          responseText = fillTemplate(pickRandom(templates.withProduct), data);
        } else {
          responseText = pickRandom(templates.responses);
        }
        break;

      case INTENTS.CHECKOUT:
        if (isPartner) {
          responseText = fillTemplate(pickRandom(templates.isPartner), data);
        } else {
          responseText = pickRandom(templates.notPartner);
        }
        break;

      case INTENTS.SAVINGS_CHECK:
        if (isPartner) {
          responseText = fillTemplate(pickRandom(templates.isPartner), data);
        } else {
          responseText = pickRandom(templates.notPartner);
        }
        break;

      case INTENTS.PARTNER_SEARCH:
        if (data.category) {
          responseText = fillTemplate(pickRandom(templates.withCategory), data);
        } else {
          responseText = pickRandom(templates.responses);
        }
        // Partner search always benefits from AI enrichment
        return { text: responseText, needsAI: true, reason: "partner_search" };

      case INTENTS.PRICE_CHECK:
        if (data.product && data.price && templates.withProduct) {
          responseText = fillTemplate(pickRandom(templates.withProduct), data);
        } else {
          responseText = pickRandom(templates.responses);
        }
        break;

      case INTENTS.RESEARCH:
        if (isPartner) {
          responseText = pickRandom(templates.isPartner);
        } else {
          responseText = pickRandom(templates.notPartner);
        }
        break;

      case INTENTS.UNKNOWN:
      default:
        // Complex or ambiguous — use AI
        return { text: null, needsAI: true, reason: "unknown_intent" };
    }

    // Decide if AI enhancement needed
    // Long follow-up chains, complex entities, or multi-intent → AI
    const needsAI = (
      conversationState.followUpChain > 2 ||
      classification.secondaryIntent !== null ||
      (classification.entities?.products?.length > 0 && classification.entities?.prices?.length > 0)
    );

    return {
      text: responseText,
      needsAI,
      reason: needsAI ? "complex_query" : null,
    };
  }

  // ── Proactive Suggestions ─────────────────────────
  // Generate suggestions based on page context without user input
  function generateProactiveSuggestion(pageContext, offer) {
    if (!pageContext) return null;

    const { pageType, domain, product, searchQuery } = pageContext;

    if (pageType === "checkout") {
      if (offer) {
        return {
          type: "checkout_savings",
          text: `You're earning ${offer.reward_points.toLocaleString()} points on this purchase! 💰`,
          action: "view_savings",
        };
      } else {
        return {
          type: "checkout_no_savings",
          text: "You're not earning Karbali savings on this purchase. Want to see partner alternatives?",
          action: "find_partners",
        };
      }
    }

    if (pageType === "product" && offer) {
      return {
        type: "product_savings",
        text: `Savings available! Earn ${offer.reward_points.toLocaleString()} points on ${product?.name || "this product"}.`,
        action: "claim_offer",
      };
    }

    if (pageType === "search" && searchQuery) {
      return {
        type: "search_filter",
        text: `Searching for "${searchQuery}"? Filter to see Karbali partner results!`,
        action: "filter_search",
      };
    }

    return null;
  }

  return {
    generate,
    generateProactiveSuggestion,
  };
})();

if (typeof window !== "undefined") {
  window.KarbaliResponseEngine = KarbaliResponseEngine;
}
