(function () {
  var TRACK_ENDPOINT = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/track";
  var REFERRAL_ID_KEY = "karbali_referral_id";
  var REFERRAL_CODE_KEY = "karbali_referral_code";
  var CLIENT_ID_KEY = "karbali_client_id";
  var USER_ID_KEY = "karbali_user_id";
  var recentAutoTracks = {};
  var cachedApiKey = null;
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
    if (value === null || value === undefined || value === "") return;

    try {
      window.localStorage.setItem(key, String(value));
    } catch (_error) {}

    document.cookie = key + "=" + encodeURIComponent(String(value)) + ";path=/;max-age=2592000;SameSite=Lax";
  }

  function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "kb_client_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
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

  function getCurrentScript() {
    return document.currentScript ||
      document.querySelector('script[src*="karbali-tracker"]') ||
      document.querySelector('script[data-api-key]');
  }

  function getApiKey(data) {
    if (cachedApiKey) return cachedApiKey;

    var script = getCurrentScript();
    var key = firstValue([
      data && data.apiKey,
      data && data.api_key,
      window.KarbaliConfig && (window.KarbaliConfig.apiKey || window.KarbaliConfig.api_key),
      window.KarbaliAdsConfig && (window.KarbaliAdsConfig.apiKey || window.KarbaliAdsConfig.api_key),
      script && script.getAttribute("data-api-key"),
    ]);

    if (key) cachedApiKey = key;
    return key;
  }

  function getRememberedUserId() {
    return getStorageValue(USER_ID_KEY);
  }

  function rememberUserId(user) {
    var identity = (typeof user === "string" || typeof user === "number")
      ? String(user)
      : extractIdentity(user);

    if (!identity) return null;
    setStorageValue(USER_ID_KEY, identity);
    return identity;
  }

  function syncAttribution() {
    var url = new URL(window.location.href);
    var referralId = firstValue([url.searchParams.get("ref"), url.searchParams.get("referral_id")]);
    var referralCode = firstValue([url.searchParams.get("ref_code"), url.searchParams.get("code")]);
    var clientId = firstValue([url.searchParams.get("client_id"), url.searchParams.get("kb_client_id")]);

    if (referralId) setStorageValue(REFERRAL_ID_KEY, referralId);
    if (referralCode) setStorageValue(REFERRAL_CODE_KEY, referralCode);
    if (clientId) setStorageValue(CLIENT_ID_KEY, clientId);

    if (!getStorageValue(CLIENT_ID_KEY)) {
      setStorageValue(CLIENT_ID_KEY, createClientId());
    }
  }

  function patchHistory() {
    if (window.history && !window.history.__karbaliPatched) {
      var originalPushState = window.history.pushState;
      var originalReplaceState = window.history.replaceState;

      window.history.pushState = function () {
        var result = originalPushState.apply(this, arguments);
        setTimeout(syncAttribution, 0);
        return result;
      };

      window.history.replaceState = function () {
        var result = originalReplaceState.apply(this, arguments);
        setTimeout(syncAttribution, 0);
        return result;
      };

      window.history.__karbaliPatched = true;
    }

    window.addEventListener("popstate", syncAttribution);
    window.addEventListener("pageshow", syncAttribution);
  }

  function wasRecentlyTracked(eventName, identity) {
    var key = eventName + ":" + (identity || getRememberedUserId() || getStorageValue(CLIENT_ID_KEY) || "anonymous");
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
    var explicitUserId = firstValue([payload.user_id, payload.userId]);
    var rememberedUserId = explicitUserId ? rememberUserId(explicitUserId) : getRememberedUserId();

    if (!apiKey) {
      throw new Error("Missing Karbali API key");
    }

    var body = {
      api_key: apiKey,
      event_type: eventName,
      user_id: rememberedUserId || null,
      client_id: firstValue([payload.client_id, payload.clientId, getStorageValue(CLIENT_ID_KEY)]),
      referral_id: firstValue([payload.referral_id, payload.referralId, getStorageValue(REFERRAL_ID_KEY), getStorageValue(REFERRAL_CODE_KEY)]),
      amount: payload.amount == null ? null : payload.amount,
      source_url: firstValue([payload.source_url, payload.sourceUrl, window.location.href]),
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

    if (body.user_id) rememberUserId(body.user_id);
    return result;
  }

  function identify(user) {
    syncAttribution();
    return rememberUserId(user);
  }

  function trackDownload(userOrPayload) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || getRememberedUserId() || null };

    if (payload.user_id) payload.user_id = identify(payload.user_id) || payload.user_id;
    return track("download", payload);
  }

  function trackSignup(userOrPayload) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || null };

    if (payload.user_id) payload.user_id = identify(payload.user_id) || payload.user_id;
    return track("signup", payload);
  }

  function trackPurchase(userOrPayload, amount) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || getRememberedUserId() || null, amount: amount == null ? null : amount };

    if (payload.user_id) payload.user_id = identify(payload.user_id) || payload.user_id;
    return track("purchase", payload);
  }

  function autoTrack(eventName, requestData, responseData) {
    var identity = extractIdentity(responseData) || extractIdentity(requestData);
    if (identity) rememberUserId(identity);
    if (wasRecentlyTracked(eventName, identity)) return;

    track(eventName, {
      user_id: identity || getRememberedUserId() || null,
      amount: eventName === "purchase" ? (extractAmount(responseData) || extractAmount(requestData)) : null,
    }).catch(function () {});
  }

  function inspectRequest(url, requestData, responseData) {
    var normalizedRequestUrl = normalizeUrl(url);

    if (hasPattern(normalizedRequestUrl, SIGNUP_PATTERNS)) {
      autoTrack("signup", requestData, responseData);
      return;
    }

    if (!hasPattern(normalizedRequestUrl, PURCHASE_PATTERNS)) return;
    if (!isSuccessfulPurchase(responseData)) return;

    if (!hasPattern(normalizedRequestUrl, PURCHASE_SUCCESS_PATTERNS) && extractAmount(responseData) == null && extractAmount(requestData) == null) {
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
      if (explicitEvent === "download") {
        trackDownload(element.getAttribute("data-karbali-user-id") || null).catch(function () {});
        return;
      }

      if (explicitEvent === "signup") {
        trackSignup(element.getAttribute("data-karbali-user-id") || null).catch(function () {});
        return;
      }

      if (explicitEvent === "purchase") {
        trackPurchase({
          user_id: element.getAttribute("data-karbali-user-id") || null,
          amount: parseAmount(element.getAttribute("data-karbali-amount")),
        }).catch(function () {});
        return;
      }

      if (element.tagName !== "A") return;

      var href = normalizeUrl(element.getAttribute("href") || "");
      var isDownloadLink = hasPattern(href, DOWNLOAD_PATTERNS) || /\.(apk|ipa|dmg|exe|pkg)(\?|#|$)/i.test(href);
      if (isDownloadLink && !wasRecentlyTracked("download", getRememberedUserId())) {
        trackDownload(getRememberedUserId()).catch(function () {});
      }
    }, true);
  }

  syncAttribution();
  getApiKey(null);
  patchHistory();
  patchFetch();
  patchXhr();
  bindClickTracking();

  var api = Object.assign(window.Karbali || {}, {
    endpoint: TRACK_ENDPOINT,
    sync: syncAttribution,
    identify: identify,
    rememberUserId: identify,
    getApiKey: function () {
      return getApiKey(null);
    },
    getClientId: function () {
      syncAttribution();
      return getStorageValue(CLIENT_ID_KEY);
    },
    getReferralId: function () {
      syncAttribution();
      return getStorageValue(REFERRAL_ID_KEY) || getStorageValue(REFERRAL_CODE_KEY);
    },
    getUserId: function () {
      return getRememberedUserId();
    },
    track: track,
    trackDownload: trackDownload,
    trackSignup: trackSignup,
    trackPurchase: trackPurchase,
  });

  window.Karbali = api;
  window.KarbaliAds = api;
  window.karbali = api;

  window.KarbaliTrack = function (eventName, userId, amount) {
    return api.track(eventName, {
      user_id: userId || getRememberedUserId() || null,
      amount: amount == null ? null : amount,
    });
  };

  window.karbaliTrackDownload = function (userId) {
    return api.trackDownload(userId || getRememberedUserId() || null);
  };

  window.karbaliTrackSignup = function (userId) {
    return api.trackSignup(userId || getRememberedUserId() || null);
  };

  window.karbaliTrackPurchase = function (userId, amount) {
    return api.trackPurchase({
      user_id: userId || getRememberedUserId() || null,
      amount: amount == null ? null : amount,
    });
  };
})();
