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

// All Ollama calls are proxied through the local backend (localhost:3000),
// which forwards them to Ollama — avoiding the chrome-extension:// origin rejection.
const OLLAMA_BASE = "http://localhost:3000/ollama";

// All non-Ollama messages (e.g. blockShorts) still use sendMessage.
// ollamaTags via sendMessage is used by the popup (wakes SW automatically).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "blockShorts") {
    setShortsRedirect(msg.value);
    return false;
  }
  if (msg.type === "ollamaTags") {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 6000);
    fetch(`${OLLAMA_BASE}/api/tags`, { signal: controller.signal })
      .then((r) => {
        clearTimeout(tid);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => {
        clearTimeout(tid);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // keep channel open for async sendResponse
  }
});

// All Ollama calls use long-lived ports so the service worker is never
// killed mid-request. A "keepalive" port holds the SW awake for the
// whole filter session; "ollamaTags" and "ollamaGenerate" carry data.
chrome.runtime.onConnect.addListener((port) => {
  // Keepalive: content script holds this open while the filter is active.
  // No messages needed — the open port itself prevents SW termination.
  if (port.name === "keepalive") {
    console.log("[AI Filter BG] Keepalive port opened");
    port.onDisconnect.addListener(() =>
      console.log("[AI Filter BG] Keepalive port closed"),
    );
    return;
  }

  if (port.name === "ollamaTags") {
    const controller = new AbortController();
    const tid = setTimeout(() => {
      console.warn("[AI Filter BG] ollamaTags timed out");
      controller.abort();
    }, 6000);
    fetch(`${OLLAMA_BASE}/api/tags`, { signal: controller.signal })
      .then((r) => {
        clearTimeout(tid);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        console.log(
          "[AI Filter BG] ollamaTags success, models:",
          (data.models || []).map((m) => m.name),
        );
        port.postMessage({ ok: true, data });
      })
      .catch((err) => {
        clearTimeout(tid);
        console.warn("[AI Filter BG] ollamaTags failed:", err.message);
        port.postMessage({ ok: false, error: err.message });
      });
    return;
  }

  if (port.name === "ollamaGenerate") {
    port.onMessage.addListener((payload) => {
      console.log(
        "[AI Filter BG] ollamaGenerate via port, model:",
        payload.model,
      );
      const controller = new AbortController();
      const tid = setTimeout(() => {
        console.warn("[AI Filter BG] ollamaGenerate timed out after 120s");
        controller.abort();
      }, 120000);
      fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then((r) => {
          clearTimeout(tid);
          if (!r.ok) {
            if (r.status === 403) {
              throw new Error(
                "HTTP 403: Ollama is blocking the extension origin. " +
                  "Fix: set OLLAMA_ORIGINS=* before running ollama serve. " +
                  "PowerShell: $env:OLLAMA_ORIGINS='*'; ollama serve",
              );
            }
            return r.text().then((body) => {
              throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`);
            });
          }
          return r.json();
        })
        .then((data) => {
          console.log("[AI Filter BG] ollamaGenerate success");
          port.postMessage({ ok: true, data });
        })
        .catch((err) => {
          clearTimeout(tid);
          console.warn("[AI Filter BG] ollamaGenerate failed:", err.message);
          port.postMessage({ ok: false, error: err.message });
        });
    });
    return;
  }
});
