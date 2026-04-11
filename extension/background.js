const API_BASE = "https://dvkoafztquswcqniwcyf.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a29hZnp0cXVzd2Nxbml3Y3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzc3ODcsImV4cCI6MjA4OTkxMzc4N30.tisSwPAmALxSQx1tJ5TFcGfLVZWyhQXCfsfWBzIPiQM";

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkForOffers(tab.url, tabId);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
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

    const data = await response.json();

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
  if (message.type === "TRACK_CLICK") {
    handleTrackClick(message.campaign_id).then(sendResponse);
    return true;
  }
  if (message.type === "LOGOUT") {
    chrome.storage.local.clear().then(() => sendResponse({ success: true }));
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

    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}
