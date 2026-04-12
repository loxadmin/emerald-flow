(function () {
  "use strict";

  var TRACK_ENDPOINT = "https://advertiser.karbali.com/api/track";
  var TRACK_SESSION_ENDPOINT = "https://advertiser.karbali.com/api/track/session";
  var PING_ENDPOINT = "https://advertiser.karbali.com/api/track-ping";

  // Storage keys
  var CLIENT_ID_KEY = "karbali_client_id";
  var USER_ID_KEY = "karbali_user_id";
  var REFERRAL_ID_KEY = "karbali_referral_id";
  var REFERRAL_CODE_KEY = "karbali_referral_code";
  var SIGNUP_TRACKED_KEY = "karbali_signup_tracked";

  var cachedApiKey = null;

  // ─── Storage helpers (triple-layer: localStorage + cookie + sessionStorage) ───

  function setStorage(key, value) {
    if (value == null || value === "") return;
    var v = String(value);
    try { localStorage.setItem(key, v); } catch (_) {}
    try { sessionStorage.setItem(key, v); } catch (_) {}
    document.cookie = key + "=" + encodeURIComponent(v) + ";path=/;max-age=2592000;SameSite=Lax";
  }

  function getStorage(key) {
    try {
      var v = localStorage.getItem(key);
      if (v) return v;
    } catch (_) {}
    try {
      var s = sessionStorage.getItem(key);
      if (s) return s;
    } catch (_) {}
    var m = document.cookie.match(new RegExp("(?:^|; )" + key + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ─── Utility ───

  function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "kb_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getApiKey() {
    if (cachedApiKey) return cachedApiKey;
    var script = document.currentScript ||
      document.querySelector('script[src*="karbali-tracker"]') ||
      document.querySelector('script[data-api-key]');
    var key = null;
    if (window.KarbaliConfig) key = window.KarbaliConfig.apiKey || window.KarbaliConfig.api_key;
    if (!key && script) key = script.getAttribute("data-api-key");
    if (key) cachedApiKey = key;
    return key;
  }

  // ─── Identity ───

  function getClientId() {
    var id = getStorage(CLIENT_ID_KEY);
    if (!id) {
      id = createClientId();
      setStorage(CLIENT_ID_KEY, id);
    }
    return id;
  }

  function getUserId() {
    return getStorage(USER_ID_KEY);
  }

  function setUserId(uid) {
    if (!uid) return null;
    var id = String(uid);
    setStorage(USER_ID_KEY, id);
    return id;
  }

  function getReferralId() {
    return getStorage(REFERRAL_ID_KEY) || getStorage(REFERRAL_CODE_KEY);
  }

  // ─── Attribution sync (captures URL params on every navigation) ───

  function syncAttribution() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get("ref") || params.get("referral_id");
    var refCode = params.get("ref_code") || params.get("code");
    var clientId = params.get("client_id") || params.get("kb_client_id");

    if (ref) setStorage(REFERRAL_ID_KEY, ref);
    if (refCode) setStorage(REFERRAL_CODE_KEY, refCode);
    if (clientId) setStorage(CLIENT_ID_KEY, clientId);

    // Ensure client_id always exists and persist server session
    getClientId();
    ensureTrackingSession();
  }



  async function ensureTrackingSession() {
    var apiKey = getApiKey();
    if (!apiKey) return;

    var params = new URLSearchParams(window.location.search);
    var referralCode = params.get("ref_code") || getStorage(REFERRAL_CODE_KEY) || null;

    try {
      await fetch(TRACK_SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          tid: getClientId(),
          referral_code: referralCode,
          referral_id: getReferralId() || null,
        }),
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      });
    } catch (_) {}
  }

  // Patch history for SPA navigation
  function patchHistory() {
    if (window.history && !window.history.__karbaliPatched) {
      var origPush = window.history.pushState;
      var origReplace = window.history.replaceState;
      window.history.pushState = function () {
        var r = origPush.apply(this, arguments);
        setTimeout(syncAttribution, 0);
        return r;
      };
      window.history.replaceState = function () {
        var r = origReplace.apply(this, arguments);
        setTimeout(syncAttribution, 0);
        return r;
      };
      window.history.__karbaliPatched = true;
    }
    window.addEventListener("popstate", syncAttribution);
    window.addEventListener("pageshow", syncAttribution);
  }

  // ─── Core tracking function ───

  async function track(eventType, data) {
    var payload = data || {};
    var apiKey = payload.api_key || payload.apiKey || getApiKey();

    if (!apiKey) {
      console.warn("[Karbali] Missing API key — cannot track");
      return { error: "Missing API key" };
    }

    var userId = payload.user_id || payload.userId || getUserId();
    if (userId) setUserId(userId);

    var body = {
      api_key: apiKey,
      event_type: eventType,
      user_id: userId || null,
      client_id: payload.client_id || payload.clientId || getClientId(),
      referral_id: payload.referral_id || payload.referralId || getReferralId() || null,
      amount: payload.amount != null ? payload.amount : null,
      source_url: payload.source_url || payload.sourceUrl || window.location.href,
    };

    try {
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
        console.warn("[Karbali] Track failed:", result.error || response.status);
        return result;
      }

      // Mark signup tracked to prevent duplicates
      if (eventType === "signup") {
        setStorage(SIGNUP_TRACKED_KEY, "1");
      }

      return result;
    } catch (err) {
      console.warn("[Karbali] Track error:", err.message);
      return { error: err.message };
    }
  }

  // ─── Explicit tracking methods (DETERMINISTIC — no guessing) ───

  function identify(userIdOrObj) {
    var uid = (typeof userIdOrObj === "string" || typeof userIdOrObj === "number")
      ? String(userIdOrObj)
      : (userIdOrObj && (userIdOrObj.id || userIdOrObj.user_id || userIdOrObj.email)) || null;
    return setUserId(uid);
  }

  function trackSignup(userOrPayload) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || null };
    if (payload.user_id) identify(payload.user_id);
    return track("signup", payload);
  }

  function trackPurchase(userOrPayload, amount) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || getUserId() || null, amount: amount != null ? amount : null };
    if (payload.user_id) identify(payload.user_id);
    return track("purchase", payload);
  }

  function trackDownload(userOrPayload) {
    var payload = (typeof userOrPayload === "object" && userOrPayload !== null)
      ? userOrPayload
      : { user_id: userOrPayload || getUserId() || null };
    if (payload.user_id) identify(payload.user_id);
    return track("download", payload);
  }

  // ─── Download link auto-detection (clicks on .apk/.ipa/store links) ───

  function bindDownloadClicks() {
    var DOWNLOAD_PATTERNS = ["play.google.com", "apps.apple.com", "/download"];
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;

      var element = target.closest("[data-karbali-event], a[href]");
      if (!element) return;

      // Explicit data-attribute tracking
      var explicitEvent = element.getAttribute("data-karbali-event");
      if (explicitEvent === "download") {
        trackDownload(element.getAttribute("data-karbali-user-id") || null);
        return;
      }
      if (explicitEvent === "signup") {
        trackSignup(element.getAttribute("data-karbali-user-id") || null);
        return;
      }
      if (explicitEvent === "purchase") {
        trackPurchase({
          user_id: element.getAttribute("data-karbali-user-id") || null,
          amount: element.getAttribute("data-karbali-amount") ? Number(element.getAttribute("data-karbali-amount")) : null,
        });
        return;
      }

      // Auto-detect download links
      if (element.tagName === "A") {
        var href = (element.getAttribute("href") || "").toLowerCase();
        var isDownload = /\.(apk|ipa|dmg|exe|pkg)(\?|#|$)/i.test(href);
        if (!isDownload) {
          for (var i = 0; i < DOWNLOAD_PATTERNS.length; i++) {
            if (href.indexOf(DOWNLOAD_PATTERNS[i]) !== -1) { isDownload = true; break; }
          }
        }
        if (isDownload) {
          trackDownload(getUserId());
        }
      }
    }, true);
  }

  // ─── Heartbeat / Ping (script health monitoring) ───

  function startHeartbeat() {
    var apiKey = getApiKey();
    if (!apiKey) return;

    function ping() {
      try {
        fetch(PING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
          }),
          keepalive: true,
          mode: "cors",
          credentials: "omit",
        }).catch(function () {});
      } catch (_) {}
    }

    // Ping on load, then every 5 minutes
    ping();
    setInterval(ping, 300000);
  }

  // ─── Initialize ───

  syncAttribution();
  getApiKey();
  patchHistory();
  bindDownloadClicks();
  startHeartbeat();

  // ─── Public API ───

  var api = {
    endpoint: TRACK_ENDPOINT,
    sessionEndpoint: TRACK_SESSION_ENDPOINT,
    sync: syncAttribution,
    ensureSession: ensureTrackingSession,
    identify: identify,
    getApiKey: function () { return getApiKey(); },
    getClientId: function () { return getClientId(); },
    getUserId: function () { return getUserId(); },
    getReferralId: function () { return getReferralId(); },
    track: track,
    trackSignup: trackSignup,
    trackPurchase: trackPurchase,
    trackDownload: trackDownload,
  };

  window.Karbali = api;
  window.KarbaliAds = api;
  window.karbali = api;

  // Legacy compat
  window.KarbaliTrack = function (eventName, userId, amount) {
    return api.track(eventName, { user_id: userId || getUserId(), amount: amount != null ? amount : null });
  };
  window.karbaliTrackSignup = function (userId) { return api.trackSignup(userId || getUserId()); };
  window.karbaliTrackPurchase = function (userId, amount) { return api.trackPurchase({ user_id: userId || getUserId(), amount: amount }); };
  window.karbaliTrackDownload = function (userId) { return api.trackDownload(userId || getUserId()); };
})();
