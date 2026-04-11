/**
 * Karbali Response Engine — Built from scratch
 * Nigerian personality, short & goofy responses
 */

const KarbaliResponseEngine = (function () {
  "use strict";

  const INTENTS = KarbaliIntentClassifier.INTENTS;

  const TEMPLATES = {
    [INTENTS.GREETING]: {
      responses: [
        "Omo, welcome! 👋 I be your Karbali savings guy. Wetin you dey find today?",
        "Hey hey! Na your boy Karbali AI dey here. Make we save money together 🔥",
        "What's good! I dey here to make sure your money no waste. Ask me anything!",
      ],
    },

    [INTENTS.HELP]: {
      responses: [
        "No wahala, I fit help with:\n\n💰 **Check savings** — You dey earn here?\n🔍 **Find partners** — Where savings dey\n⚖️ **Compare** — Which one beta pass?\n🛒 **Checkout** — Make sure you dey earn\n\nWetin you want?",
        "Abeg see wetin I fit do:\n\n• Detect savings opportunity as you browse\n• Find Karbali partner stores\n• Compare products & prices\n• Make sure you earn points for checkout\n\nJust talk to me!",
      ],
    },

    [INTENTS.SHOPPING]: {
      noPartner: [
        "You dey shop for {category}? 🛍️ Make I check if Karbali partners get savings for this kain thing!",
        "Omo, {category} shopping! Let me find where your savings go fat pass. Want?",
        "Looking for {category}? Abeg hold on, make I check which Karbali partner fit save you money!",
      ],
      withPartner: [
        "Ehen! 🎉 Na Karbali partner site be this o. You fit earn **{points} points** here. Chop life!",
        "Bros/Sis, you don land correct site! 💰 **{points} points** dey wait for you if you buy here!",
      ],
      withProduct: [
        "You dey eye **{product}**? {partnerMsg} Want me find beta savings options?",
        "**{product}** abi? {partnerMsg} Make I help you get maximum value! 🔥",
      ],
    },

    [INTENTS.COMPARISON]: {
      responses: [
        "Oya drop the options! ⚖️ Make I tell you where your Karbali savings go fat pass 😂",
        "Compare ke? Na my specialty! Tell me wetin you dey choose between, make I check savings for each.",
      ],
      withProduct: [
        "You dey look **{product}**? Make I compare am with similar things wey go give you more Karbali points!",
      ],
    },

    [INTENTS.CHECKOUT]: {
      isPartner: [
        "Oya buy am! 🎉 Na Karbali partner site — **{points} points** dey enter your account. Sharp sharp!",
        "✅ Confirmed! This checkout go give you **{points} points**. Enjoy your purchase, baller! 💰",
      ],
      notPartner: [
        "Wahala! ⚠️ This site no be Karbali partner o. You no go earn savings. Want make I find partner alternatives?",
        "Heads up — no Karbali savings here o. But I fit show you partner stores wey sell the same thing. Interested?",
      ],
      generic: [
        "Omo you dey checkout! 💰 Make I verify say you dey earn Karbali savings on this purchase sharp sharp...",
      ],
    },

    [INTENTS.SAVINGS_CHECK]: {
      isPartner: [
        "✅ Na Karbali partner site be this! **{points} points** (≈ ₦{savings}) dey available. Your savings dey grow! 🌟",
        "Good news! 💰 Karbali partner site. You fit earn **{points} points** here. Money dey move!",
      ],
      notPartner: [
        "This site no dey Karbali network yet o. But I fit find partner alternatives! Want?",
        "No savings here for now 😔 But Karbali get plenty partners — make I find some?",
      ],
    },

    [INTENTS.PARTNER_SEARCH]: {
      responses: [
        "Make I search our partner network! 🔍 We get verified merchants for fashion, electronics, food, everything. Wetin you dey find?",
        "Oya, wetin you want buy? Make I check which Karbali partners fit hook you up with savings!",
      ],
      withCategory: [
        "You wan find {category} partners? Abeg hold on, make I check our network 🔍",
        "Looking for {category}? Say less! Make I find Karbali partners wey go save you money!",
      ],
    },

    [INTENTS.PRICE_CHECK]: {
      responses: [
        "Price check? 💡 I fit show you Karbali partners where you go earn points — na like free discount be that!",
        "Looking for better price? The real hack na to buy from Karbali partners — you earn savings on top! Want me check?",
      ],
      withProduct: [
        "**{product}** for {price}? Omo, make I check if Karbali partners get this — your points go reduce the cost! 💰",
      ],
    },

    [INTENTS.RESEARCH]: {
      isPartner: [
        "Na verified Karbali partner ✅ — you fit trust am. Plus you dey earn savings here!",
        "This site legit! **Karbali verified partner** ✅ Your purchases here dey earn you points.",
      ],
      notPartner: [
        "Hmm, this site no dey our partner network. I no fit vouch for am. For peace of mind, check our verified partners!",
        "E no dey Karbali network o. Want make I find verified partner stores instead?",
      ],
    },

    followUp: {
      affirmative: [
        "Sharp sharp! 🚀 Make I check am for you...",
        "Oya na! Let me find the best options...",
        "Say less! I dey on it...",
      ],
      negative: [
        "No wahala! I dey here if you need me 😊",
        "Okay boss! Just holla anytime you want help.",
        "E be like that sometimes! I dey kampe whenever you ready.",
      ],
      continueExploring: [
        "Wetin else you wan check? Savings, partners, comparisons — I dey here!",
      ],
    },

    [INTENTS.UNKNOWN]: {
      responses: [
        "Omo I no too understand 😅 But I fit help with savings, partner stores, or comparisons. Wetin you need?",
        "Abeg come again? I dey best for savings and shopping talk. Try ask me about that!",
      ],
    },
  };

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

  function generate(classification, conversationState, pageContext, offer) {
    const intent = classification.intent;
    const isPartner = !!offer;
    const templates = TEMPLATES[intent];

    const data = {
      product: pageContext?.product?.name || classification.entities?.products?.[0] || null,
      domain: pageContext?.domain || "",
      category: classification.category !== "general" ? classification.category : null,
      points: offer?.reward_points || 0,
      price: pageContext?.product?.price || classification.entities?.prices?.[0] || null,
      query: pageContext?.searchQuery || "",
      savings: offer ? (offer.payout_naira || 0).toFixed(2) : "0",
      partnerMsg: isPartner
        ? `Na Karbali partner — **${offer.reward_points?.toLocaleString()} points** dey wait for you!`
        : "This site no be Karbali partner yet sha.",
    };

    if (conversationState.isFollowUp) {
      if (conversationState.isAffirmative) {
        return { text: pickRandom(TEMPLATES.followUp.affirmative), needsAI: true, reason: "follow_up_action" };
      }
      if (conversationState.isNegative) {
        return { text: pickRandom(TEMPLATES.followUp.negative), needsAI: false };
      }
    }

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
        return { text: null, needsAI: true, reason: "unknown_intent" };
    }

    const needsAI = (
      conversationState.followUpChain > 2 ||
      classification.secondaryIntent !== null ||
      (classification.entities?.products?.length > 0 && classification.entities?.prices?.length > 0)
    );

    return { text: responseText, needsAI, reason: needsAI ? "complex_query" : null };
  }

  function generateProactiveSuggestion(pageContext, offer) {
    if (!pageContext) return null;

    const { pageType, product, searchQuery } = pageContext;

    if (pageType === "checkout") {
      if (offer) {
        return {
          type: "checkout_savings",
          text: `Omo you dey earn ${offer.reward_points.toLocaleString()} points on this purchase! Chop life 💰`,
          action: "view_savings",
        };
      } else {
        return {
          type: "checkout_no_savings",
          text: "Bros, you no dey earn Karbali savings here o. Want see partner alternatives?",
          action: "find_partners",
        };
      }
    }

    if (pageType === "product" && offer) {
      return {
        type: "product_savings",
        text: `Savings dey! Earn ${offer.reward_points.toLocaleString()} points on ${product?.name || "this product"} 🔥`,
        action: "claim_offer",
      };
    }

    if (pageType === "search" && searchQuery) {
      return {
        type: "search_filter",
        text: `You dey search "${searchQuery}"? Filter am to see only Karbali partner results!`,
        action: "filter_search",
      };
    }

    return null;
  }

  return { generate, generateProactiveSuggestion };
})();

if (typeof window !== "undefined") {
  window.KarbaliResponseEngine = KarbaliResponseEngine;
}
