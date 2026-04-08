const SHORTS_RULE_ID = 1;

const shortsRedirectRule = {
  id: SHORTS_RULE_ID,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { url: "https://www.youtube.com" },
  },
  condition: {
    urlFilter: "|https://www.youtube.com/shorts/*",
    resourceTypes: ["main_frame"],
  },
};

function setShortsRedirect(enabled) {
  if (enabled) {
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [shortsRedirectRule],
      removeRuleIds: [SHORTS_RULE_ID],
    });
  } else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [SHORTS_RULE_ID],
    });
  }
}

// Apply persisted state on service worker startup
chrome.storage.sync.get("blockShorts", (data) => {
  setShortsRedirect(!!data.blockShorts);
});

// React to toggle changes from the popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "blockShorts") setShortsRedirect(msg.value);
});
