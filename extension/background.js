const API_BASE = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";
const CONTENT_SCRIPT_FILES = [
  "ai/intent-classifier.js",
  "ai/context-parser.js",
  "ai/conversation-manager.js",
  "ai/response-engine.js",
  "content.js",
];
const CONTENT_STYLE_FILES = ["content.css"];
const AUTH_STORAGE_KEYS = ["access_token", "user_email", "user_name", "user_id", "user_avatar_url"];

function isInjectableUrl(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

async function ensureAssistantInjected(tabId, url) {
  if (!tabId || !isInjectableUrl(url)) return;

  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: CONTENT_STYLE_FILES });
  } catch (_) {}

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_SCRIPT_FILES });
  } catch (err) {
    console.debug("Karbali assistant injection skipped:", err?.message || err);
  }
}

async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => ensureAssistantInjected(tab.id, tab.url)));
}

function getDisplayName(user) {
  return user?.name || user?.email || "Connected";
}

async function fetchExtensionSession(accessToken) {
  const response = await fetch(`${API_BASE}/ext-session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: ANON_KEY,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Failed to load extension session");
    error.status = response.status;
    throw error;
  }

  return data.user || null;
}

async function storeExtensionSession(accessToken, user) {
  await chrome.storage.local.set({
    access_token: accessToken,
    user_email: user?.email || null,
    user_name: getDisplayName(user),
    user_id: user?.id || null,
    user_avatar_url: user?.avatar_url || null,
  });
}

async function clearExtensionSession() {
  await chrome.storage.local.clear();

  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;

      await chrome.action.setBadgeText({ text: "", tabId: tab.id });
      chrome.tabs.sendMessage(tab.id, { type: "OFFER_CLEARED" }).catch(() => {});
    })
  );
}

async function refreshOffersForOpenTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) return;
      await ensureAssistantInjected(tab.id, tab.url);
      await checkForOffers(tab.url, tab.id);
    })
  );
}

async function syncAuthSession(accessToken) {
  const user = await fetchExtensionSession(accessToken);
  await storeExtensionSession(accessToken, user);
  await refreshOffersForOpenTabs();

  return {
    success: true,
    authenticated: true,
    user,
  };
}

async function refreshAuthSession() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEYS);
  const accessToken = stored.access_token;

  if (!accessToken) {
    return { authenticated: false };
  }

  try {
    const user = await fetchExtensionSession(accessToken);
    await storeExtensionSession(accessToken, user);

    return {
      authenticated: true,
      user,
    };
  } catch (err) {
    if (err?.status === 401) {
      await clearExtensionSession();
      return {
        authenticated: false,
        error: err.message,
      };
    }

    return {
      authenticated: true,
      stale: true,
      user: {
        id: stored.user_id || null,
        email: stored.user_email || null,
        name: stored.user_name || stored.user_email || "Connected",
        avatar_url: stored.user_avatar_url || null,
      },
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  injectIntoOpenTabs().catch((err) => console.error("Karbali initial injection failed:", err));
});

chrome.runtime.onStartup.addListener(() => {
  injectIntoOpenTabs().catch((err) => console.error("Karbali startup injection failed:", err));
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    ensureAssistantInjected(tabId, tab.url);
    checkForOffers(tab.url, tabId);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    ensureAssistantInjected(activeInfo.tabId, tab.url);
    checkForOffers(tab.url, activeInfo.tabId);
  }
});

async function checkForOffers(url, tabId) {
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
    chrome.action.setBadgeText({ text: "", tabId });
    return;
  }

  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) {
    chrome.action.setBadgeText({ text: "", tabId });
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/detect-offer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ url }),
    });

    if (response.status === 401) {
      await clearExtensionSession();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Offer check failed");
    }

    if (data.offer) {
      await chrome.storage.local.set({ [`offer_${tabId}`]: data.offer });
      chrome.action.setBadgeText({ text: "💰", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#10B981", tabId });

      // Notify content script
      chrome.tabs.sendMessage(tabId, { type: "OFFER_FOUND", offer: data.offer }).catch(() => {});
    } else {
      await chrome.storage.local.remove(`offer_${tabId}`);
      chrome.action.setBadgeText({ text: "", tabId });

      chrome.tabs.sendMessage(tabId, { type: "OFFER_CLEARED" }).catch(() => {});
    }
  } catch (err) {
    console.error("Karbali offer check failed:", err);
  }
}

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_AUTH_SESSION") {
    syncAuthSession(message.access_token).then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err?.message || "Failed to sync login" });
    });
    return true;
  }
  if (message.type === "REFRESH_AUTH_SESSION") {
    refreshAuthSession().then(sendResponse);
    return true;
  }
  if (message.type === "TRACK_CLICK") {
    handleTrackClick(message.campaign_id).then(sendResponse);
    return true;
  }
  if (message.type === "LOGOUT") {
    clearExtensionSession().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === "GET_PAGE_CONTEXT") {
    // Return stored offer for requesting tab
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.storage.local.get(`offer_${tabId}`).then((stored) => {
        sendResponse({ offer: stored[`offer_${tabId}`] || null });
      });
      return true;
    }
    sendResponse({ offer: null });
    return false;
  }
});

async function handleTrackClick(campaign_id) {
  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) return { error: "Not authenticated" };

  try {
    const response = await fetch(`${API_BASE}/ext-track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ campaign_id }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      await clearExtensionSession();
      return { error: "Session expired. Please sign in again." };
    }

    if (!response.ok) {
      return { error: data.error || "Failed to claim offer" };
    }

    return data;
  } catch (err) {
    return { error: err.message };
  }
}
