const KEYS = ["productivityMode", "blockShorts"];

// Restore saved toggle states on open
chrome.storage.sync.get(KEYS, (data) => {
  for (const key of KEYS) {
    document.getElementById(key).checked = !!data[key];
  }
});

// On toggle change: save, notify the active tab's content script, and notify background
for (const key of KEYS) {
  document.getElementById(key).addEventListener("change", (e) => {
    const value = e.target.checked;
    chrome.storage.sync.set({ [key]: value });
    chrome.runtime.sendMessage({ type: key, value });
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: key, value });
      }
    });
  });
}
