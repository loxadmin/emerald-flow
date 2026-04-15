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
  var cachedCampaignId = null;

  // ─── Debug mode ───

  function log() {
    if (window.KarbaliDebug) {
      var args = ["[Karbali]"].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    }
  }

  function warn() {
    var args = ["[Karbali]"].concat(Array.prototype.slice.call(arguments));
    if (window.KarbaliDebug) {
      console.warn.apply(console, args);
    }
  }

  function getTrackerVersion() {
    if (window.KarbaliConfig && window.KarbaliConfig.trackerVersion) return String(window.KarbaliConfig.trackerVersion);
    var script = document.currentScript || document.querySelector('script[src*="karbali-tracker"]');
    if (!script) return "legacy";
    var src = script.getAttribute("src") || "";
    var campaignMatch = src.match(/\/karbali-tracker\/c\/([a-z0-9-]+)\.js/i);
    if (campaignMatch) return "campaign-pointer";
    var versionMatch = src.match(/\/karbali-tracker\/v\/([^/]+)\.js/i);
    if (versionMatch) return versionMatch[1];
    return "legacy";
  }

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

  // ─── First-touch lock: only set referral if not already stored ───

  function setStorageOnce(key, value) {
    if (value == null || value === "") return false;
    var existing = getStorage(key);
    if (existing) {
      log("First-touch lock: keeping existing", key, "=", existing, "(ignored new:", value, ")");
      return false;
    }
    setStorage(key, value);
    log("First-touch set:", key, "=", value);
    return true;
  }

  // ─── Utility ───

  function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "kb_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getCampaignId() {
    if (cachedCampaignId) return cachedCampaignId;
    var cfg = window.KarbaliConfig || {};
    var cid = cfg.campaignId || cfg.campaign_id || null;
    if (cid) cachedCampaignId = String(cid);
    return cachedCampaignId;
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
      log("Generated new client_id:", id);
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
    log("User identified:", id);
    // Sync identity to server immediately
    syncIdentityToServer(id);
    return id;
  }

  function getReferralId() {
    return getStorage(REFERRAL_ID_KEY) || getStorage(REFERRAL_CODE_KEY);
  }

  // ─── Identity stitching: link client_id to user_id on server ───

  function syncIdentityToServer(userId) {
    var apiKey = getApiKey();
    if (!apiKey || !userId) return;

    log("Syncing identity to server: client_id =", getClientId(), "user_id =", userId);

    try {
      fetch(TRACK_SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          tid: getClientId(),
          referral_code: getStorage(REFERRAL_CODE_KEY) || null,
          referral_id: getStorage(REFERRAL_ID_KEY) || null,
          user_id: userId,
        }),
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      }).catch(function () {});
    } catch (_) {}
  }

  // ─── Attribution sync (captures URL params — first-touch for referrals) ───

  function syncAttribution() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get("ref") || params.get("referral_id");
    var refCode = params.get("ref_code") || params.get("code");
    var clientId = params.get("client_id") || params.get("kb_client_id");

    // FIRST-TOUCH LOCK: only store referral if not already present
    if (ref) setStorageOnce(REFERRAL_ID_KEY, ref);
    if (refCode) setStorageOnce(REFERRAL_CODE_KEY, refCode);

    // client_id from URL always overwrites (for cross-device continuity)
    if (clientId) setStorage(CLIENT_ID_KEY, clientId);

    // Ensure client_id always exists and persist server session
    getClientId();
    ensureTrackingSession();

    log("Attribution synced — referral:", getReferralId(), "client:", getClientId());
  }

  async function ensureTrackingSession() {
    var apiKey = getApiKey();
    if (!apiKey) return;

    var referralCode = getStorage(REFERRAL_CODE_KEY) || null;

    log("Ensuring tracking session — tid:", getClientId(), "referral:", getReferralId());

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
      warn("Missing API key — cannot track");
      return { error: "Missing API key" };
    }

    var userId = payload.user_id || payload.userId || getUserId();
    if (userId) setUserId(userId);

    var body = {
      campaign_id: payload.campaign_id || payload.campaignId || getCampaignId() || null,
      tracker_version: payload.tracker_version || payload.trackerVersion || getTrackerVersion(),
      api_key: apiKey,
      event_type: eventType,
      user_id: userId || null,
      client_id: payload.client_id || payload.clientId || getClientId(),
      referral_id: payload.referral_id || payload.referralId || getReferralId() || null,
      amount: payload.amount != null ? payload.amount : null,
      source_url: payload.source_url || payload.sourceUrl || window.location.href,
    };

    log("Tracking event:", eventType, body);

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
        warn("Track failed:", result.error || response.status);
        return result;
      }

      log("Track success:", eventType, result);

      // Mark signup tracked to prevent duplicates
      if (eventType === "signup") {
        setStorage(SIGNUP_TRACKED_KEY, "1");
      }

      return result;
    } catch (err) {
      warn("Track error:", err.message);
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
        log("Auto-detected download click via data attribute");
        trackDownload(element.getAttribute("data-karbali-user-id") || null);
        return;
      }
      if (explicitEvent === "signup") {
        log("Auto-detected signup click via data attribute");
        trackSignup(element.getAttribute("data-karbali-user-id") || null);
        return;
      }
      if (explicitEvent === "purchase") {
        log("Auto-detected purchase click via data attribute");
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
          log("Auto-detected download link:", href);
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
      log("Sending heartbeat ping");
      try {
        fetch(PING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            campaign_id: getCampaignId(),
            tracker_version: getTrackerVersion(),
            script_signature: [getCampaignId() || "unknown", getTrackerVersion(), "karbali-tracker"].join(":"),
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

  // ─── Clear referral (for testing / manual reset) ───

  function clearReferral() {
    try { localStorage.removeItem(REFERRAL_ID_KEY); } catch (_) {}
    try { localStorage.removeItem(REFERRAL_CODE_KEY); } catch (_) {}
    try { sessionStorage.removeItem(REFERRAL_ID_KEY); } catch (_) {}
    try { sessionStorage.removeItem(REFERRAL_CODE_KEY); } catch (_) {}
    document.cookie = REFERRAL_ID_KEY + "=;path=/;max-age=0";
    document.cookie = REFERRAL_CODE_KEY + "=;path=/;max-age=0";
    log("Referral data cleared");
  }

  // ─── Initialize ───

  log("Karbali tracker initializing — version:", getTrackerVersion());

  syncAttribution();
  getApiKey();
  patchHistory();
  bindDownloadClicks();
  startHeartbeat();

  log("Karbali tracker ready — API key:", getApiKey() ? "found" : "MISSING",
    "| Campaign:", getCampaignId() || "not set",
    "| Client:", getClientId(),
    "| User:", getUserId() || "anonymous",
    "| Referral:", getReferralId() || "none");

  // ─── Public API ───

  var api = {
    endpoint: TRACK_ENDPOINT,
    sessionEndpoint: TRACK_SESSION_ENDPOINT,
    sync: syncAttribution,
    ensureSession: ensureTrackingSession,
    identify: identify,
    getApiKey: function () { return getApiKey(); },
    getCampaignId: function () { return getCampaignId(); },
    getTrackerVersion: function () { return getTrackerVersion(); },
    getClientId: function () { return getClientId(); },
    getUserId: function () { return getUserId(); },
    getReferralId: function () { return getReferralId(); },
    track: track,
    trackSignup: trackSignup,
    trackPurchase: trackPurchase,
    trackDownload: trackDownload,
    clearReferral: clearReferral,
    debug: function (enabled) {
      window.KarbaliDebug = enabled !== false;
      log("Debug mode", window.KarbaliDebug ? "enabled" : "disabled");
    },
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