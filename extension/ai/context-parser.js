/**
 * Karbali Context Parser — Built from scratch
 * 
 * Extracts structured context from the current browser page:
 * 1. URL analysis (domain, path patterns, query params)
 * 2. DOM metadata extraction (title, meta tags, Open Graph, Schema.org)
 * 3. Page type classification (search, product, checkout, article, etc.)
 * 4. Product data extraction (price, name, images)
 * 5. Search query extraction across search engines
 */

const KarbaliContextParser = (function () {
  "use strict";

  // ── Page Type Detection Patterns ──────────────────
  const PAGE_TYPE_PATTERNS = {
    search: {
      domains: ["google.com", "google.co", "bing.com", "yahoo.com", "duckduckgo.com", "search.brave.com", "yandex.com"],
      urlPatterns: [/[?&]q=/, /[?&]query=/, /[?&]search=/, /\/search\?/],
    },
    checkout: {
      urlPatterns: [/checkout/i, /cart/i, /basket/i, /payment/i, /pay\b/i, /order-confirm/i, /billing/i, /shipping-address/i],
      domSignals: ["[name='card-number']", "[name='cardNumber']", "[data-testid*='checkout']", ".checkout", "#checkout", ".cart-summary", ".order-summary"],
    },
    product: {
      urlPatterns: [/\/product\//i, /\/item\//i, /\/p\//i, /\/dp\//i, /\/gp\/product/i, /\/products\//i],
      domSignals: [".product-price", "[itemprop='price']", "[data-price]", ".add-to-cart", "[data-testid*='product']", ".product-title", ".product-detail"],
    },
    category: {
      urlPatterns: [/\/category\//i, /\/categories\//i, /\/collections?\//i, /\/shop\//i, /\/c\//i],
    },
    article: {
      domSignals: ["article", "[itemprop='articleBody']", ".post-content", ".article-body", ".entry-content"],
    },
  };

  // ── Search Engine Query Extractors ────────────────
  const SEARCH_EXTRACTORS = {
    "google": (url) => new URL(url).searchParams.get("q"),
    "bing": (url) => new URL(url).searchParams.get("q"),
    "yahoo": (url) => new URL(url).searchParams.get("p"),
    "duckduckgo": (url) => new URL(url).searchParams.get("q"),
    "brave": (url) => new URL(url).searchParams.get("q"),
    "yandex": (url) => new URL(url).searchParams.get("text"),
  };

  // ── URL Analysis ──────────────────────────────────
  function analyzeUrl(url) {
    try {
      const parsed = new URL(url);
      return {
        domain: parsed.hostname.replace(/^www\./, ""),
        path: parsed.pathname,
        params: Object.fromEntries(parsed.searchParams),
        protocol: parsed.protocol,
        isSecure: parsed.protocol === "https:",
      };
    } catch {
      return { domain: "", path: "", params: {}, protocol: "", isSecure: false };
    }
  }

  // ── Page Type Classification ──────────────────────
  function classifyPageType(url, doc) {
    const urlStr = url.toLowerCase();
    const urlInfo = analyzeUrl(url);

    // Search page detection
    for (const domain of PAGE_TYPE_PATTERNS.search.domains) {
      if (urlInfo.domain.includes(domain)) {
        for (const pattern of PAGE_TYPE_PATTERNS.search.urlPatterns) {
          if (pattern.test(url)) return "search";
        }
      }
    }

    // Checkout detection (URL + DOM)
    for (const pattern of PAGE_TYPE_PATTERNS.checkout.urlPatterns) {
      if (pattern.test(urlStr)) return "checkout";
    }
    if (doc) {
      for (const selector of PAGE_TYPE_PATTERNS.checkout.domSignals) {
        try {
          if (doc.querySelector(selector)) return "checkout";
        } catch {}
      }
    }

    // Product detection (URL + DOM)
    for (const pattern of PAGE_TYPE_PATTERNS.product.urlPatterns) {
      if (pattern.test(urlStr)) return "product";
    }
    if (doc) {
      let productSignals = 0;
      for (const selector of PAGE_TYPE_PATTERNS.product.domSignals) {
        try {
          if (doc.querySelector(selector)) productSignals++;
        } catch {}
      }
      if (productSignals >= 2) return "product";
    }

    // Category detection
    for (const pattern of PAGE_TYPE_PATTERNS.category.urlPatterns) {
      if (pattern.test(urlStr)) return "category";
    }

    // Article detection
    if (doc) {
      for (const selector of PAGE_TYPE_PATTERNS.article.domSignals) {
        try {
          if (doc.querySelector(selector)) return "article";
        } catch {}
      }
    }

    return "browsing";
  }

  // ── Search Query Extraction ───────────────────────
  function extractSearchQuery(url) {
    const domain = analyzeUrl(url).domain;
    for (const [engine, extractor] of Object.entries(SEARCH_EXTRACTORS)) {
      if (domain.includes(engine)) {
        try {
          return extractor(url) || "";
        } catch {
          return "";
        }
      }
    }

    // Fallback: check for common search input on page
    const searchInput = document.querySelector(
      'input[name="q"], input[name="search"], input[name="query"], input[type="search"]'
    );
    return searchInput?.value || "";
  }

  // ── Meta & Open Graph Extraction ──────────────────
  function extractMeta(doc) {
    const getMeta = (name) => {
      const el = doc.querySelector(
        `meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`
      );
      return el?.getAttribute("content") || "";
    };

    return {
      title: doc.title || "",
      description: getMeta("description") || getMeta("og:description"),
      ogTitle: getMeta("og:title"),
      ogImage: getMeta("og:image"),
      ogType: getMeta("og:type"),
      ogSiteName: getMeta("og:site_name"),
      keywords: getMeta("keywords"),
      author: getMeta("author"),
      canonical: doc.querySelector('link[rel="canonical"]')?.href || "",
    };
  }

  // ── Product Data Extraction ───────────────────────
  function extractProductData(doc) {
    const product = {
      name: null,
      price: null,
      currency: null,
      image: null,
      brand: null,
      availability: null,
      rating: null,
    };

    // Try JSON-LD Schema.org
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            product.name = item.name || product.name;
            product.brand = item.brand?.name || item.brand || product.brand;
            product.image = item.image || product.image;
            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              product.price = offer.price || offer.lowPrice || product.price;
              product.currency = offer.priceCurrency || product.currency;
              product.availability = offer.availability || product.availability;
            }
            if (item.aggregateRating) {
              product.rating = item.aggregateRating.ratingValue;
            }
          }
        }
      } catch {}
    }

    // Try microdata (itemprop)
    if (!product.name) {
      const nameEl = doc.querySelector('[itemprop="name"]');
      product.name = nameEl?.textContent?.trim() || null;
    }
    if (!product.price) {
      const priceEl = doc.querySelector('[itemprop="price"]');
      product.price = priceEl?.getAttribute("content") || priceEl?.textContent?.trim() || null;
    }
    if (!product.currency) {
      const currEl = doc.querySelector('[itemprop="priceCurrency"]');
      product.currency = currEl?.getAttribute("content") || null;
    }
    if (!product.image) {
      const imgEl = doc.querySelector('[itemprop="image"]');
      product.image = imgEl?.src || imgEl?.getAttribute("content") || null;
    }

    // Try common CSS patterns
    if (!product.price) {
      const priceSelectors = [".product-price", ".price", "#price", "[data-price]", ".current-price", ".sale-price"];
      for (const sel of priceSelectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          const match = text.match(/[\$₦€£]\s?[\d,.]+|[\d,.]+\s?(?:NGN|USD|EUR|GBP)/);
          if (match) {
            product.price = match[0];
            break;
          }
        }
      }
    }

    if (!product.name) {
      const h1 = doc.querySelector("h1");
      if (h1 && classifyPageType(location.href, doc) === "product") {
        product.name = h1.textContent.trim().substring(0, 200);
      }
    }

    return product;
  }

  // ── Cart Items Detection ──────────────────────────
  function detectCartItems(doc) {
    const items = [];
    const cartSelectors = [".cart-item", ".line-item", "[data-cart-item]", ".basket-item"];

    for (const sel of cartSelectors) {
      const elements = doc.querySelectorAll(sel);
      elements.forEach((el) => {
        const name = el.querySelector(".item-name, .product-name, .title")?.textContent?.trim();
        const price = el.querySelector(".item-price, .product-price, .price")?.textContent?.trim();
        if (name) items.push({ name, price: price || "N/A" });
      });
    }

    return items;
  }

  // ── Full Context Parse ────────────────────────────
  function parse() {
    const url = location.href;
    const doc = document;
    const urlInfo = analyzeUrl(url);
    const pageType = classifyPageType(url, doc);
    const meta = extractMeta(doc);
    const searchQuery = extractSearchQuery(url);

    const context = {
      url,
      domain: urlInfo.domain,
      path: urlInfo.path,
      isSecure: urlInfo.isSecure,
      pageType,
      title: meta.title,
      description: meta.description,
      siteName: meta.ogSiteName || urlInfo.domain,
      searchQuery,
      product: null,
      cartItems: [],
      meta,
      timestamp: Date.now(),
    };

    // Extract product data on product pages
    if (pageType === "product" || pageType === "checkout") {
      context.product = extractProductData(doc);
    }

    // Extract cart items on checkout pages
    if (pageType === "checkout") {
      context.cartItems = detectCartItems(doc);
    }

    return context;
  }

  // ── Lightweight context for quick checks ──────────
  function quickContext() {
    return {
      url: location.href,
      domain: analyzeUrl(location.href).domain,
      pageType: classifyPageType(location.href, document),
      title: document.title,
      searchQuery: extractSearchQuery(location.href),
    };
  }

  return {
    parse,
    quickContext,
    classifyPageType,
    extractProductData,
    extractSearchQuery,
    analyzeUrl,
  };
})();

if (typeof window !== "undefined") {
  window.KarbaliContextParser = KarbaliContextParser;
}
