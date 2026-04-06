(function () {
  var TRACK_ENDPOINT = "https://advertiser.karbali.com/api/track";
  var REFERRAL_ID_KEY = "karbali_referral_id";
  var REFERRAL_CODE_KEY = "karbali_referral_code";
  var CLIENT_ID_KEY = "karbali_client_id";
  var recentAutoTracks = {};
  var SIGNUP_PATTERNS = ["/auth/v1/signup", "signup", "sign-up", "register"];
  var PURCHASE_PATTERNS = ["purchase", "checkout", "subscribe", "subscription", "payment", "payments", "orders", "paystack"];
  var PURCHASE_SUCCESS_PATTERNS = ["verify", "success", "complete", "completed", "callback"];
  var DOWNLOAD_PATTERNS = ["play.google.com", "apps.apple.com", "/download"];

  function getStorageValue(key) {
    try {
      var localValue = window.localStorage.getItem(key);
      if (localValue) return localValue;
    } catch (_error) {}

    var match = document.cookie.match(new RegExp("(?:^|; )" + key + "=([^;]+)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setStorageValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {}

    document.cookie = key + "=" + encodeURIComponent(value) + ";path=/;max-age=2592000;SameSite=Lax";
  }

  function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "kb_client_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function syncAttribution() {
    var url = new URL(window.location.href);
    var referralId = url.searchParams.get("ref");
    var referralCode = url.searchParams.get("ref_code");
    var clientId = url.searchParams.get("client_id");

    if (referralId) setStorageValue(REFERRAL_ID_KEY, referralId);
    if (referralCode) setStorageValue(REFERRAL_CODE_KEY, referralCode);
    if (clientId) setStorageValue(CLIENT_ID_KEY, clientId);

    if (!getStorageValue(CLIENT_ID_KEY)) {
      setStorageValue(CLIENT_ID_KEY, createClientId());
    }
  }

  function getCurrentScript() {
    return document.currentScript || document.querySelector('script[src*="karbali-tracker.js"][data-api-key]');
  }

  function getApiKey(data) {
    var script = getCurrentScript();
    return (data && data.apiKey) || (window.KarbaliConfig && window.KarbaliConfig.apiKey) || (script && script.getAttribute("data-api-key")) || null;
  }

  function firstValue(values) {
    for (var i = 0; i < values.length; i += 1) {
      var value = values[i];
      if (value !== null && value !== undefined && value !== "") {
        return String(value);
      }
    }
    return null;
  }

  function parseAmount(value) {
    if (value === null || value === undefined || value === "") return null;
    var amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }

  function extractIdentity(data) {
    if (!data || typeof data !== "object") return null;
    return firstValue([
      data.user_id,
      data.userId,
      data.external_user_id,
      data.externalUserId,
      data.customer_id,
      data.customerId,
      data.email,
      data.id,
      data.user && data.user.id,
      data.user && data.user.email,
      data.data && data.data.user_id,
      data.data && data.data.id,
      data.record && data.record.user_id,
      data.record && data.record.id,
    ]);
  }

  function extractAmount(data) {
    if (!data || typeof data !== "object") return null;
    return parseAmount(
      data.amount != null ? data.amount :
      data.total != null ? data.total :
      data.price != null ? data.price :
      data.value != null ? data.value :
      data.data && data.data.amount != null ? data.data.amount :
      data.data && data.data.total != null ? data.data.total :
      data.record && data.record.amount != null ? data.record.amount :
      null
    );
  }

  function normalizeUrl(value) {
    try {
      return new URL(String(value || ""), window.location.origin).toString().toLowerCase();
    } catch (_error) {
      return String(value || "").toLowerCase();
    }
  }

  function hasPattern(value, patterns) {
    for (var i = 0; i < patterns.length; i += 1) {
      if (value.indexOf(patterns[i]) !== -1) return true;
    }
    return false;
  }

  function parseRequestBody(body) {
    if (!body) return null;

    if (typeof FormData !== "undefined" && body instanceof FormData) {
      var formDataResult = {};
      body.forEach(function (value, key) {
        formDataResult[key] = value;
      });
      return formDataResult;
    }

    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      var paramsResult = {};
      body.forEach(function (value, key) {
        paramsResult[key] = value;
      });
      return paramsResult;
    }

    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (_error) {
        try {
          var parsedParams = new URLSearchParams(body);
          var stringParamsResult = {};
          parsedParams.forEach(function (value, key) {
            stringParamsResult[key] = value;
          });
          return Object.keys(stringParamsResult).length > 0 ? stringParamsResult : null;
        } catch (_secondError) {
          return null;
        }
      }
    }

    return typeof body === "object" ? body : null;
  }

  function parseResponseBody(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function wasRecentlyTracked(eventName, identity) {
    var key = eventName + ":" + (identity || getStorageValue(CLIENT_ID_KEY) || "anonymous");
    var now = Date.now();
    if (recentAutoTracks[key] && now - recentAutoTracks[key] < 10000) {
      return true;
    }
    recentAutoTracks[key] = now;
    return false;
  }

  function isSuccessfulPurchase(data) {
    if (!data || typeof data !== "object") return false;
    var status = firstValue([
      data.status,
      data.payment_status,
      data.gateway_response,
      data.event,
      data.data && data.data.status,
      data.data && data.data.gateway_response,
    ]);

    if (data.success === true || data.paid === true) return true;
    if (!status) return false;

    var normalizedStatus = status.toLowerCase();
    return normalizedStatus === "success" || normalizedStatus === "succeeded" || normalizedStatus === "paid" || normalizedStatus === "completed";
  }

  async function track(eventName, data) {
    syncAttribution();
    var payload = data || {};
    var apiKey = getApiKey(payload);

    if (!apiKey) {
      throw new Error("Missing Karbali API key");
    }

    var body = {
      api_key: apiKey,
      event_type: eventName,
      user_id: payload.user_id || null,
      client_id: payload.client_id || getStorageValue(CLIENT_ID_KEY),
      referral_id: payload.referral_id || getStorageValue(REFERRAL_ID_KEY) || getStorageValue(REFERRAL_CODE_KEY),
      amount: payload.amount == null ? null : payload.amount,
    };

    var response = await fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    });

    var result = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(result.error || "Karbali tracking request failed");
    }

    return result;
  }

  function autoTrack(eventName, requestData, responseData) {
    var identity = extractIdentity(responseData) || extractIdentity(requestData);
    if (wasRecentlyTracked(eventName, identity)) return;

    track(eventName, {
      user_id: identity || null,
      amount: eventName === "purchase" ? (extractAmount(responseData) || extractAmount(requestData)) : null,
    }).catch(function () {});
  }

  function inspectRequest(url, requestData, responseData) {
    var normalizedUrl = normalizeUrl(url);

    if (hasPattern(normalizedUrl, SIGNUP_PATTERNS)) {
      autoTrack("signup", requestData, responseData);
      return;
    }

    if (!hasPattern(normalizedUrl, PURCHASE_PATTERNS)) return;
    if (!isSuccessfulPurchase(responseData)) return;

    if (!hasPattern(normalizedUrl, PURCHASE_SUCCESS_PATTERNS) && extractAmount(responseData) == null && extractAmount(requestData) == null) {
      return;
    }

    autoTrack("purchase", requestData, responseData);
  }

  function patchFetch() {
    if (!window.fetch || window.fetch.__karbaliPatched) return;

    var originalFetch = window.fetch.bind(window);
    var patchedFetch = function (input, init) {
      var requestUrl = typeof input === "string" ? input : (input && input.url) || "";
      var requestData = parseRequestBody(init && init.body);

      return originalFetch(input, init).then(function (response) {
        if (!response || !response.ok) return response;

        var clonedResponse = response.clone();
        clonedResponse.text().then(function (text) {
          inspectRequest(requestUrl, requestData, parseResponseBody(text) || null);
        }).catch(function () {});

        return response;
      });
    };

    patchedFetch.__karbaliPatched = true;
    window.fetch = patchedFetch;
  }

  function patchXhr() {
    if (!window.XMLHttpRequest || window.XMLHttpRequest.__karbaliPatched) return;

    var originalOpen = window.XMLHttpRequest.prototype.open;
    var originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url) {
      this.__karbaliUrl = url;
      return originalOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function (body) {
      this.__karbaliBody = parseRequestBody(body);
      this.addEventListener("loadend", function () {
        if (this.status < 200 || this.status >= 300) return;
        inspectRequest(this.__karbaliUrl, this.__karbaliBody, parseResponseBody(this.responseText) || null);
      });
      return originalSend.apply(this, arguments);
    };

    window.XMLHttpRequest.__karbaliPatched = true;
  }

  function bindClickTracking() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;

      var element = target.closest("[data-karbali-event], a[href]");
      if (!element) return;

      var explicitEvent = element.getAttribute("data-karbali-event");
      if (explicitEvent === "download" || explicitEvent === "signup" || explicitEvent === "purchase") {
        track(explicitEvent, {
          user_id: element.getAttribute("data-karbali-user-id") || null,
          amount: parseAmount(element.getAttribute("data-karbali-amount")),
        }).catch(function () {});
        return;
      }

      if (element.tagName !== "A") return;

      var href = normalizeUrl(element.getAttribute("href") || "");
      var isDownloadLink = hasPattern(href, DOWNLOAD_PATTERNS) || /\.(apk|ipa|dmg|exe|pkg)(\?|#|$)/i.test(href);
      if (isDownloadLink && !wasRecentlyTracked("download", null)) {
        track("download", {}).catch(function () {});
      }
    }, true);
  }

  syncAttribution();
  patchFetch();
  patchXhr();
  bindClickTracking();

  window.Karbali = Object.assign(window.Karbali || {}, {
    endpoint: TRACK_ENDPOINT,
    sync: syncAttribution,
    getClientId: function () {
      syncAttribution();
      return getStorageValue(CLIENT_ID_KEY);
    },
    getReferralId: function () {
      syncAttribution();
      return getStorageValue(REFERRAL_ID_KEY) || getStorageValue(REFERRAL_CODE_KEY);
    },
    track: track,
  });

  window.KarbaliTrack = function (eventName, userId, amount) {
    return window.Karbali.track(eventName, {
      user_id: userId || null,
      amount: amount == null ? null : amount,
    });
  };
})();