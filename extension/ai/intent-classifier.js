/**
 * Karbali NLP Intent Classifier — Built from scratch
 * 
 * Multi-layer intent classification using:
 * 1. Tokenization + normalization
 * 2. Keyword/phrase pattern matching with weighted scoring
 * 3. N-gram analysis for compound intent detection
 * 4. Contextual boosting based on page state
 * 5. Confidence scoring with thresholds
 */

const KarbaliIntentClassifier = (function () {
  "use strict";

  // ── Intent Taxonomy ──────────────────────────────
  const INTENTS = {
    SHOPPING: "shopping",
    COMPARISON: "comparison",
    CHECKOUT: "checkout",
    RESEARCH: "research",
    SAVINGS_CHECK: "savings_check",
    PARTNER_SEARCH: "partner_search",
    PRICE_CHECK: "price_check",
    GREETING: "greeting",
    HELP: "help",
    UNKNOWN: "unknown",
  };

  // ── Category Taxonomy ────────────────────────────
  const CATEGORIES = {
    FASHION: "fashion",
    ELECTRONICS: "electronics",
    FOOD: "food",
    HEALTH: "health",
    HOME: "home",
    TRAVEL: "travel",
    FINANCE: "finance",
    ENTERTAINMENT: "entertainment",
    EDUCATION: "education",
    GENERAL: "general",
  };

  // ── Tokenizer ────────────────────────────────────
  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  function normalize(text) {
    return text.toLowerCase().trim();
  }

  // Compute bigrams for compound phrase matching
  function bigrams(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      result.push(tokens[i] + " " + tokens[i + 1]);
    }
    return result;
  }

  function trigrams(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length - 2; i++) {
      result.push(tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2]);
    }
    return result;
  }

  // ── Stopwords (lightweight) ──────────────────────
  const STOPWORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
    "both", "either", "neither", "each", "every", "all", "any", "few",
    "more", "most", "other", "some", "such", "than", "too", "very",
    "just", "about", "above", "also", "then", "there", "here",
    "i", "me", "my", "we", "our", "you", "your", "it", "its", "this", "that",
  ]);

  function removeStopwords(tokens) {
    return tokens.filter((t) => !STOPWORDS.has(t));
  }

  // ── Intent Pattern Definitions ────────────────────
  // Each pattern has: keywords (single words), phrases (multi-word), weight
  const INTENT_PATTERNS = {
    [INTENTS.SHOPPING]: {
      keywords: [
        { word: "buy", weight: 3.0 },
        { word: "purchase", weight: 3.0 },
        { word: "order", weight: 2.5 },
        { word: "shop", weight: 2.5 },
        { word: "shopping", weight: 2.5 },
        { word: "get", weight: 1.0 },
        { word: "need", weight: 1.5 },
        { word: "want", weight: 2.0 },
        { word: "looking", weight: 1.5 },
        { word: "find", weight: 1.5 },
        { word: "cheap", weight: 2.0 },
        { word: "affordable", weight: 2.0 },
        { word: "price", weight: 1.5 },
        { word: "deal", weight: 2.0 },
        { word: "deals", weight: 2.0 },
        { word: "discount", weight: 2.0 },
        { word: "sale", weight: 2.0 },
        { word: "store", weight: 1.5 },
        { word: "market", weight: 1.0 },
        { word: "spend", weight: 1.5 },
        { word: "cost", weight: 1.5 },
        { word: "pay", weight: 1.5 },
        { word: "buying", weight: 3.0 },
      ],
      phrases: [
        { phrase: "i want", weight: 2.5 },
        { phrase: "i need", weight: 2.5 },
        { phrase: "where can i buy", weight: 4.0 },
        { phrase: "where to buy", weight: 4.0 },
        { phrase: "how much", weight: 2.0 },
        { phrase: "best place to buy", weight: 4.0 },
        { phrase: "looking for", weight: 2.5 },
        { phrase: "want to buy", weight: 4.0 },
        { phrase: "want to get", weight: 3.0 },
        { phrase: "good deal", weight: 3.0 },
        { phrase: "best deal", weight: 3.5 },
        { phrase: "on sale", weight: 2.5 },
      ],
      baseThreshold: 2.0,
    },

    [INTENTS.COMPARISON]: {
      keywords: [
        { word: "compare", weight: 4.0 },
        { word: "comparison", weight: 4.0 },
        { word: "vs", weight: 4.0 },
        { word: "versus", weight: 4.0 },
        { word: "better", weight: 2.5 },
        { word: "best", weight: 2.0 },
        { word: "worse", weight: 2.0 },
        { word: "difference", weight: 2.5 },
        { word: "differences", weight: 2.5 },
        { word: "prefer", weight: 2.0 },
        { word: "recommend", weight: 2.0 },
        { word: "recommendation", weight: 2.0 },
        { word: "which", weight: 1.5 },
        { word: "alternative", weight: 2.5 },
        { word: "alternatives", weight: 2.5 },
        { word: "option", weight: 1.5 },
        { word: "options", weight: 1.5 },
      ],
      phrases: [
        { phrase: "which is better", weight: 4.5 },
        { phrase: "which one", weight: 2.5 },
        { phrase: "this or that", weight: 3.5 },
        { phrase: "compare these", weight: 4.5 },
        { phrase: "what's the difference", weight: 4.0 },
        { phrase: "should i choose", weight: 3.5 },
        { phrase: "better option", weight: 3.5 },
        { phrase: "best option", weight: 3.5 },
        { phrase: "pros and cons", weight: 4.0 },
      ],
      baseThreshold: 2.5,
    },

    [INTENTS.CHECKOUT]: {
      keywords: [
        { word: "checkout", weight: 4.0 },
        { word: "cart", weight: 3.0 },
        { word: "payment", weight: 3.0 },
        { word: "paying", weight: 3.0 },
        { word: "charge", weight: 2.0 },
        { word: "billing", weight: 2.5 },
        { word: "receipt", weight: 2.0 },
        { word: "confirm", weight: 1.5 },
        { word: "complete", weight: 1.5 },
        { word: "submit", weight: 1.5 },
        { word: "finalize", weight: 2.0 },
      ],
      phrases: [
        { phrase: "about to pay", weight: 4.5 },
        { phrase: "about to checkout", weight: 4.5 },
        { phrase: "ready to buy", weight: 4.0 },
        { phrase: "place order", weight: 4.0 },
        { phrase: "complete purchase", weight: 4.5 },
        { phrase: "confirm order", weight: 4.0 },
        { phrase: "add to cart", weight: 3.0 },
        { phrase: "in my cart", weight: 3.0 },
      ],
      baseThreshold: 2.5,
    },

    [INTENTS.RESEARCH]: {
      keywords: [
        { word: "review", weight: 2.5 },
        { word: "reviews", weight: 2.5 },
        { word: "rating", weight: 2.0 },
        { word: "ratings", weight: 2.0 },
        { word: "trustworthy", weight: 2.5 },
        { word: "legitimate", weight: 2.5 },
        { word: "legit", weight: 2.5 },
        { word: "safe", weight: 2.0 },
        { word: "scam", weight: 3.0 },
        { word: "reliable", weight: 2.0 },
        { word: "quality", weight: 1.5 },
        { word: "worth", weight: 1.5 },
        { word: "good", weight: 1.0 },
        { word: "bad", weight: 1.0 },
        { word: "info", weight: 1.0 },
        { word: "information", weight: 1.0 },
        { word: "about", weight: 0.5 },
        { word: "what", weight: 0.5 },
        { word: "how", weight: 0.5 },
        { word: "tell", weight: 1.0 },
      ],
      phrases: [
        { phrase: "is this safe", weight: 4.0 },
        { phrase: "is this legit", weight: 4.0 },
        { phrase: "is this real", weight: 3.5 },
        { phrase: "can i trust", weight: 4.0 },
        { phrase: "worth buying", weight: 3.0 },
        { phrase: "tell me about", weight: 2.5 },
        { phrase: "what do you know", weight: 2.5 },
        { phrase: "how good is", weight: 2.5 },
      ],
      baseThreshold: 2.0,
    },

    [INTENTS.SAVINGS_CHECK]: {
      keywords: [
        { word: "savings", weight: 3.5 },
        { word: "save", weight: 2.5 },
        { word: "saving", weight: 3.0 },
        { word: "earn", weight: 2.5 },
        { word: "earning", weight: 2.5 },
        { word: "points", weight: 3.0 },
        { word: "cashback", weight: 3.5 },
        { word: "reward", weight: 2.5 },
        { word: "rewards", weight: 2.5 },
        { word: "balance", weight: 2.0 },
        { word: "karbali", weight: 2.0 },
      ],
      phrases: [
        { phrase: "check savings", weight: 4.5 },
        { phrase: "how much savings", weight: 4.0 },
        { phrase: "am i earning", weight: 4.0 },
        { phrase: "my savings", weight: 3.5 },
        { phrase: "my points", weight: 3.5 },
        { phrase: "save money", weight: 3.5 },
        { phrase: "save more", weight: 3.5 },
        { phrase: "earn points", weight: 4.0 },
        { phrase: "savings available", weight: 4.0 },
        { phrase: "how much can i save", weight: 4.5 },
      ],
      baseThreshold: 2.5,
    },

    [INTENTS.PARTNER_SEARCH]: {
      keywords: [
        { word: "partner", weight: 3.0 },
        { word: "partners", weight: 3.0 },
        { word: "merchant", weight: 2.5 },
        { word: "merchants", weight: 2.5 },
        { word: "brand", weight: 1.5 },
        { word: "brands", weight: 1.5 },
        { word: "store", weight: 1.5 },
        { word: "stores", weight: 1.5 },
        { word: "integrated", weight: 2.0 },
        { word: "verified", weight: 2.0 },
      ],
      phrases: [
        { phrase: "karbali partner", weight: 4.5 },
        { phrase: "partner store", weight: 4.0 },
        { phrase: "find partners", weight: 4.0 },
        { phrase: "show partners", weight: 4.0 },
        { phrase: "partner brands", weight: 4.0 },
        { phrase: "partner alternatives", weight: 4.0 },
        { phrase: "which stores", weight: 3.0 },
        { phrase: "where can i earn", weight: 3.5 },
      ],
      baseThreshold: 2.5,
    },

    [INTENTS.PRICE_CHECK]: {
      keywords: [
        { word: "price", weight: 3.0 },
        { word: "prices", weight: 3.0 },
        { word: "cost", weight: 2.5 },
        { word: "costs", weight: 2.5 },
        { word: "expensive", weight: 2.5 },
        { word: "cheaper", weight: 3.0 },
        { word: "cheapest", weight: 3.0 },
        { word: "budget", weight: 2.0 },
        { word: "affordable", weight: 2.5 },
        { word: "value", weight: 1.5 },
      ],
      phrases: [
        { phrase: "how much does", weight: 3.5 },
        { phrase: "how much is", weight: 3.5 },
        { phrase: "what's the price", weight: 4.0 },
        { phrase: "price check", weight: 4.5 },
        { phrase: "cheaper option", weight: 3.5 },
        { phrase: "find cheaper", weight: 3.5 },
        { phrase: "lower price", weight: 3.0 },
        { phrase: "best price", weight: 3.5 },
        { phrase: "within budget", weight: 3.0 },
      ],
      baseThreshold: 2.0,
    },

    [INTENTS.GREETING]: {
      keywords: [
        { word: "hello", weight: 4.0 },
        { word: "hi", weight: 4.0 },
        { word: "hey", weight: 4.0 },
        { word: "sup", weight: 3.0 },
        { word: "yo", weight: 3.0 },
        { word: "howdy", weight: 3.0 },
        { word: "greetings", weight: 4.0 },
        { word: "morning", weight: 2.0 },
        { word: "evening", weight: 2.0 },
        { word: "afternoon", weight: 2.0 },
      ],
      phrases: [
        { phrase: "good morning", weight: 4.5 },
        { phrase: "good evening", weight: 4.5 },
        { phrase: "good afternoon", weight: 4.5 },
        { phrase: "how are you", weight: 4.0 },
        { phrase: "what's up", weight: 3.5 },
      ],
      baseThreshold: 3.0,
    },

    [INTENTS.HELP]: {
      keywords: [
        { word: "help", weight: 3.0 },
        { word: "assist", weight: 3.0 },
        { word: "support", weight: 2.5 },
        { word: "guide", weight: 2.0 },
        { word: "explain", weight: 2.0 },
        { word: "how", weight: 1.0 },
        { word: "what", weight: 0.5 },
        { word: "tutorial", weight: 2.5 },
      ],
      phrases: [
        { phrase: "how does this work", weight: 4.0 },
        { phrase: "what can you do", weight: 4.0 },
        { phrase: "help me", weight: 3.5 },
        { phrase: "i need help", weight: 4.0 },
        { phrase: "how to use", weight: 3.5 },
        { phrase: "what is karbali", weight: 4.0 },
      ],
      baseThreshold: 2.5,
    },
  };

  // ── Category Pattern Definitions ──────────────────
  const CATEGORY_PATTERNS = {
    [CATEGORIES.FASHION]: [
      "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "shirt",
      "dress", "jeans", "pants", "jacket", "coat", "bag", "handbag",
      "watch", "jewelry", "clothing", "clothes", "fashion", "apparel",
      "outfit", "wear", "wardrobe", "accessory", "accessories", "hat",
      "sandal", "sandals", "heel", "heels", "sunglass", "sunglasses",
    ],
    [CATEGORIES.ELECTRONICS]: [
      "phone", "laptop", "computer", "tablet", "headphone", "headphones",
      "speaker", "camera", "tv", "television", "monitor", "printer",
      "keyboard", "mouse", "charger", "cable", "earbuds", "airpods",
      "smartwatch", "console", "gaming", "playstation", "xbox", "iphone",
      "samsung", "android", "macbook", "ipad", "gadget", "tech",
    ],
    [CATEGORIES.FOOD]: [
      "food", "restaurant", "eat", "eating", "meal", "dinner", "lunch",
      "breakfast", "snack", "grocery", "groceries", "delivery", "order food",
      "takeout", "cuisine", "recipe", "cook", "cooking", "drink", "beverage",
    ],
    [CATEGORIES.HEALTH]: [
      "health", "medicine", "pharmacy", "doctor", "hospital", "supplement",
      "vitamin", "fitness", "gym", "workout", "exercise", "skincare",
      "beauty", "cosmetic", "makeup", "wellness", "therapy", "medical",
    ],
    [CATEGORIES.HOME]: [
      "furniture", "home", "house", "apartment", "decor", "decoration",
      "kitchen", "bedroom", "bathroom", "living room", "garden", "plant",
      "appliance", "cleaning", "mattress", "pillow", "curtain", "rug",
    ],
    [CATEGORIES.TRAVEL]: [
      "travel", "flight", "hotel", "booking", "vacation", "trip", "tour",
      "airline", "airport", "destination", "resort", "cruise", "luggage",
      "passport", "visa", "ticket", "accommodation",
    ],
    [CATEGORIES.FINANCE]: [
      "bank", "banking", "loan", "credit", "debit", "insurance", "invest",
      "investment", "savings", "account", "mortgage", "interest", "finance",
      "financial", "money", "transfer", "payment",
    ],
    [CATEGORIES.ENTERTAINMENT]: [
      "movie", "music", "game", "gaming", "stream", "streaming", "netflix",
      "spotify", "youtube", "concert", "show", "ticket", "event", "play",
    ],
    [CATEGORIES.EDUCATION]: [
      "course", "class", "learn", "learning", "school", "university",
      "education", "training", "tutorial", "study", "book", "textbook",
      "certificate", "degree", "online course",
    ],
  };

  // ── Urgency Detection ─────────────────────────────
  const URGENCY_SIGNALS = {
    high: [
      "now", "immediately", "urgent", "asap", "today", "right now",
      "quickly", "fast", "hurry", "rush", "need it now", "right away",
    ],
    medium: [
      "soon", "this week", "tomorrow", "planning", "thinking about",
      "considering", "might", "probably",
    ],
    low: [
      "eventually", "sometime", "maybe", "one day", "whenever",
      "no rush", "just browsing", "just looking", "exploring",
    ],
  };

  // ── Entity Extraction ─────────────────────────────
  // Extract product names, locations, price references
  function extractEntities(text, tokens) {
    const entities = {
      products: [],
      locations: [],
      prices: [],
      brands: [],
    };

    // Price patterns: $XX, ₦XX, NGN XX, XX naira, XX dollars
    const priceRegex = /(?:\$|₦|NGN\s?)[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*\s*(?:naira|dollars?|usd|ngn)/gi;
    const priceMatches = text.match(priceRegex);
    if (priceMatches) entities.prices = priceMatches;

    // Location patterns (Nigerian cities + common)
    const locations = [
      "lagos", "abuja", "port harcourt", "kano", "ibadan", "benin",
      "kaduna", "enugu", "calabar", "warri", "owerri", "abeokuta",
      "nigeria", "london", "new york", "accra", "nairobi",
    ];
    const lower = text.toLowerCase();
    locations.forEach((loc) => {
      if (lower.includes(loc)) entities.locations.push(loc);
    });

    return entities;
  }

  // ── Core Classification Engine ────────────────────
  function classify(text, pageContext) {
    const normalized = normalize(text);
    const tokens = tokenize(text);
    const contentTokens = removeStopwords(tokens);
    const bigramList = bigrams(tokens);
    const trigramList = trigrams(tokens);
    const normalizedPhrases = [...bigramList, ...trigramList];

    const scores = {};

    // Score each intent
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      let score = 0;

      // Keyword matching
      for (const { word, weight } of patterns.keywords) {
        if (contentTokens.includes(word) || tokens.includes(word)) {
          score += weight;
        }
      }

      // Phrase matching (bigrams/trigrams + substring check)
      for (const { phrase, weight } of patterns.phrases) {
        if (normalized.includes(phrase)) {
          score += weight;
        } else {
          // Fuzzy: check if all words of phrase are present
          const phraseWords = phrase.split(" ");
          const allPresent = phraseWords.every((w) => tokens.includes(w));
          if (allPresent) score += weight * 0.6;
        }
      }

      // Contextual boosting based on page state
      if (pageContext) {
        if (intent === INTENTS.CHECKOUT && pageContext.pageType === "checkout") {
          score += 3.0;
        }
        if (intent === INTENTS.SHOPPING && pageContext.pageType === "product") {
          score += 1.5;
        }
        if (intent === INTENTS.COMPARISON && pageContext.pageType === "search") {
          score += 1.0;
        }
        if (intent === INTENTS.SAVINGS_CHECK && pageContext.isPartner) {
          score += 1.5;
        }
        if (intent === INTENTS.PARTNER_SEARCH && !pageContext.isPartner) {
          score += 1.0;
        }
      }

      scores[intent] = score;
    }

    // Find best intent
    let bestIntent = INTENTS.UNKNOWN;
    let bestScore = 0;

    for (const [intent, score] of Object.entries(scores)) {
      const threshold = INTENT_PATTERNS[intent]?.baseThreshold || 2.0;
      if (score >= threshold && score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    }

    // Secondary intent (for compound queries like "buy + compare")
    let secondaryIntent = null;
    let secondaryScore = 0;
    for (const [intent, score] of Object.entries(scores)) {
      const threshold = INTENT_PATTERNS[intent]?.baseThreshold || 2.0;
      if (intent !== bestIntent && score >= threshold && score > secondaryScore) {
        secondaryIntent = intent;
        secondaryScore = score;
      }
    }

    // Classify category
    const category = classifyCategory(contentTokens, normalized);

    // Detect urgency
    const urgency = detectUrgency(normalized);

    // Extract entities
    const entities = extractEntities(text, tokens);

    // Savings potential: true if shopping, checkout, price, or partner-related
    const savingsPotential = [
      INTENTS.SHOPPING, INTENTS.CHECKOUT, INTENTS.PRICE_CHECK,
      INTENTS.SAVINGS_CHECK, INTENTS.PARTNER_SEARCH, INTENTS.COMPARISON,
    ].includes(bestIntent);

    // Confidence: normalize score against max possible
    const maxPossibleScore = 15;
    const confidence = Math.min(bestScore / maxPossibleScore, 1.0);

    return {
      intent: bestIntent,
      secondaryIntent,
      category,
      urgency,
      confidence,
      savingsPotential,
      entities,
      scores, // raw scores for debugging
    };
  }

  function classifyCategory(tokens, normalizedText) {
    let bestCategory = CATEGORIES.GENERAL;
    let bestCount = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_PATTERNS)) {
      let count = 0;
      for (const kw of keywords) {
        if (kw.includes(" ")) {
          if (normalizedText.includes(kw)) count += 2;
        } else {
          if (tokens.includes(kw)) count++;
        }
      }
      if (count > bestCount) {
        bestCategory = category;
        bestCount = count;
      }
    }

    return bestCategory;
  }

  function detectUrgency(normalizedText) {
    for (const signal of URGENCY_SIGNALS.high) {
      if (normalizedText.includes(signal)) return "high";
    }
    for (const signal of URGENCY_SIGNALS.medium) {
      if (normalizedText.includes(signal)) return "medium";
    }
    for (const signal of URGENCY_SIGNALS.low) {
      if (normalizedText.includes(signal)) return "low";
    }
    return "medium";
  }

  // ── Sentiment Analysis (lightweight) ──────────────
  const POSITIVE_WORDS = new Set([
    "good", "great", "best", "love", "like", "awesome", "amazing",
    "excellent", "perfect", "wonderful", "fantastic", "nice", "happy",
    "pleased", "satisfied", "recommend", "worth", "quality",
  ]);
  const NEGATIVE_WORDS = new Set([
    "bad", "worst", "hate", "terrible", "awful", "horrible", "poor",
    "disappointed", "scam", "fake", "broken", "expensive", "overpriced",
    "waste", "useless", "avoid", "regret",
  ]);

  function analyzeSentiment(text) {
    const tokens = tokenize(text);
    let positive = 0, negative = 0;
    tokens.forEach((t) => {
      if (POSITIVE_WORDS.has(t)) positive++;
      if (NEGATIVE_WORDS.has(t)) negative++;
    });
    if (positive > negative) return "positive";
    if (negative > positive) return "negative";
    return "neutral";
  }

  // ── Public API ────────────────────────────────────
  return {
    INTENTS,
    CATEGORIES,
    classify,
    analyzeSentiment,
    tokenize,
    extractEntities,
  };
})();

// Make available globally for other extension scripts
if (typeof window !== "undefined") {
  window.KarbaliIntentClassifier = KarbaliIntentClassifier;
}
