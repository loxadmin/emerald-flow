(function () {
  var TRACK_ENDPOINT = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1/track";
  var REFERRAL_ID_KEY = "karbali_referral_id";
  var REFERRAL_CODE_KEY = "karbali_referral_code";
  var CLIENT_ID_KEY = "karbali_client_id";

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
    });

    var result = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(result.error || "Karbali tracking request failed");
    }

    return result;
  }

  syncAttribution();

  window.Karbali = Object.assign(window.Karbali || {}, {
    endpoint: "https://advertiser.karbali.com/api/track",
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