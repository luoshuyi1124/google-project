const KOALA_URL = chrome.runtime.getURL("images/cute_koala.png");
const SERVER_BASE = "http://localhost:3000";

// ─── Productivity Mode ────────────────────────────────────────────────────────

function applyProductivityMode(enabled) {
  const existingStyle = document.getElementById("yt-focus-productivity-style");
  if (enabled) {
    if (existingStyle) return;
    const style = document.createElement("style");
    style.id = "yt-focus-productivity-style";
    style.textContent = `
      ytd-thumbnail img,
      ytd-playlist-thumbnail img,
      .ytThumbnailViewModelImage img {
        content: url('${KOALA_URL}') !important;
        object-fit: cover !important;
        width: 100% !important;
        height: 100% !important;
      }
      #inline-preview-player,
      ytd-thumbnail video,
      ytd-playlist-thumbnail video,
      yt-thumbnail-view-model video {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  } else {
    existingStyle?.remove();
  }
}

// ─── Block Shorts ─────────────────────────────────────────────────────────────

const SHORTS_CSS = `
  ytd-rich-shelf-renderer[is-shorts],
  ytd-reel-shelf-renderer {
    display: none !important;
  }
`;

let shortsObserver = null;

function hideShortsShelf() {
  document
    .querySelectorAll(
      "ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer",
    )
    .forEach((el) => {
      el.style.display = "none";
      el.dataset.ytFocusHidden = "1";
    });

  document.querySelectorAll("ytd-rich-shelf-renderer").forEach((el) => {
    if (
      !el.dataset.ytFocusHidden &&
      el.querySelector("h2")?.textContent.trim().includes("Shorts")
    ) {
      el.style.display = "none";
      el.dataset.ytFocusHidden = "1";
    }
  });
}

function applyBlockShorts(enabled, everywhere = false) {
  const existingStyle = document.getElementById("yt-focus-shorts-style");

  if (enabled) {
    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = "yt-focus-shorts-style";
      style.textContent = SHORTS_CSS;
      document.head.appendChild(style);
    }

    hideShortsShelf();

    document.querySelectorAll('a[href="/shorts"]').forEach((el) => {
      el.style.display = "none";
      el.dataset.ytFocusHidden = "1";
    });

    if (everywhere) {
      document
        .querySelectorAll(
          'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]',
        )
        .forEach((el) => {
          el.style.display = "none";
          el.dataset.ytFocusHidden = "1";
        });
    }

    // Disconnect old observer before creating a new one
    if (shortsObserver) {
      shortsObserver.disconnect();
      shortsObserver = null;
    }

    shortsObserver = new MutationObserver(() => {
      hideShortsShelf();
      if (everywhere) {
        document
          .querySelectorAll(
            'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]',
          )
          .forEach((el) => {
            el.style.display = "none";
            el.dataset.ytFocusHidden = "1";
          });
      }
    });
    shortsObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    existingStyle?.remove();

    document.querySelectorAll("[data-yt-focus-hidden]").forEach((el) => {
      el.style.display = "";
      delete el.dataset.ytFocusHidden;
    });

    shortsObserver?.disconnect();
    shortsObserver = null;
  }
}

function blockShortsPlayback() {
  document
    .querySelectorAll("ytd-shorts, ytd-reel-video-renderer, [is-shorts]")
    .forEach((el) => {
      el.style.display = "none";
      el.dataset.ytFocusHidden = "1";
    });

  document.querySelectorAll("video").forEach((video) => {
    if (
      video.closest("ytd-shorts") ||
      video.closest("[is-shorts]") ||
      video.src.includes("/shorts/")
    ) {
      video.pause();
      video.currentTime = 0;
    }
  });
}

// ─── Video keyword filter ─────────────────────────────────────────────────────

let filterObserver = null;

function applyVideoFilter(focusKeywords, blockKeywords) {
  // Always disconnect any existing observer first
  if (filterObserver) {
    filterObserver.disconnect();
    filterObserver = null;
  }

  const focusList = focusKeywords
    ? focusKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const blockList = blockKeywords
    ? blockKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    : [];

  // If no keywords at all, do nothing — don't attach an observer
  if (focusList.length === 0 && blockList.length === 0) return;

  function filterVideos() {
    document
      .querySelectorAll("ytd-video-renderer, ytd-compact-video-renderer")
      .forEach((video) => {
        const title =
          video.querySelector("#video-title")?.textContent.toLowerCase() || "";
        const channel =
          video.querySelector("#channel-name")?.textContent.toLowerCase() || "";
        const text = title + " " + channel;

        const matchesFocus =
          focusList.length === 0 || focusList.some((k) => text.includes(k));
        const matchesBlock = blockList.some((k) => text.includes(k));

        video.style.display = !matchesFocus || matchesBlock ? "none" : "";
      });
  }

  filterVideos();

  filterObserver = new MutationObserver(filterVideos);
  filterObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── AI Video Filter ─────────────────────────────────────────────────────────
// All Ollama HTTP calls are routed through background.js (CORS-exempt proxy).

const VIDEO_CARD_SELECTOR = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-reel-item-renderer",
  "yt-lockup-view-model",
].join(", ");

const TITLE_SELECTOR =
  "#video-title, #video-title-link, h3.ytLockupMetadataViewModelHeadingReset";

/**
 * Find all video cards on the page.
 * Primary: querySelectorAll on known card elements.
 * Fallback: locate title elements and walk up to the nearest card ancestor,
 * covering new lockup-model layouts where the outer wrapper tag may differ.
 */
function findVideoCards() {
  const direct = [...document.querySelectorAll(VIDEO_CARD_SELECTOR)];
  if (direct.length > 0) return direct;

  // Fallback: find by title element and climb to the nearest card container.
  const seen = new Set();
  const cards = [];
  document.querySelectorAll(TITLE_SELECTOR).forEach((titleEl) => {
    const card =
      titleEl.closest(VIDEO_CARD_SELECTOR) ||
      titleEl.closest("[class*='ytLockupViewModel']")?.closest("[id='content']")?.parentElement ||
      titleEl.closest("[class*='ytLockupViewModelHost']")?.parentElement;
    if (card && !seen.has(card)) {
      seen.add(card);
      cards.push(card);
    }
  });

  if (cards.length === 0) {
    // Last resort: any element that directly contains a title selector.
    document.querySelectorAll(TITLE_SELECTOR).forEach((titleEl) => {
      const card = titleEl.parentElement;
      if (card && !seen.has(card)) {
        seen.add(card);
        cards.push(card);
      }
    });
  }

  return cards;
}

let aiState = { enabled: false, themes: [] };
let aiModel = null;
let aiDecisionCache = new Map(); // title -> true (show) | false (hide)
let aiFilterObserver = null;
let aiDebounceTimer = null;
let swKeepalivePort = null;
let aiFilterRunId = 0; // incremented on each run; stale completions are discarded
let aiFilterRunning = false; // prevents concurrent Ollama requests
let aiFilterStopped = false; // set by unloadModel to suppress re-scheduling after abort
let aiCurrentAbortController = null; // aborted when unload is requested
let aiBatchSize = 10; // videos per Ollama request; configurable from popup

function openSwKeepalive() {
  if (swKeepalivePort) return;
  swKeepalivePort = chrome.runtime.connect({ name: "keepalive" });
  swKeepalivePort.onDisconnect.addListener(() => {
    swKeepalivePort = null;
  });
  console.log("[AI Filter] Service worker keepalive port opened");
}

function closeSwKeepalive() {
  if (!swKeepalivePort) return;
  swKeepalivePort.disconnect();
  swKeepalivePort = null;
  console.log("[AI Filter] Service worker keepalive port closed");
}

function portCall(portName, payload) {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };
    const port = chrome.runtime.connect({ name: portName });
    if (payload !== undefined) port.postMessage(payload);
    port.onMessage.addListener((res) => {
      port.disconnect();
      if (!res?.ok) {
        console.warn(
          `[AI Filter] ${portName} returned not-ok:`,
          res?.error ?? "(unknown)",
        );
        done(null);
      } else {
        done(res.data);
      }
    });
    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError?.message;
      if (err) console.warn(`[AI Filter] ${portName} port disconnected:`, err);
      done(null);
    });
  });
}

function ollamaProxy(msg) {
  if (msg.type === "ollamaTags") return portCall("ollamaTags");
  if (msg.type === "ollamaGenerate") {
    // Fetch directly from the content script — avoids service worker being
    // killed by Chrome mid-request (common MV3 issue with long Ollama calls).
    aiCurrentAbortController = new AbortController();
    return fetch(`${SERVER_BASE}/ollama/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.payload),
      signal: aiCurrentAbortController.signal,
    })
      .then((r) => {
        if (!r.ok) {
          return r.text().then((body) => {
            console.warn(
              `[AI Filter] ollamaGenerate direct fetch failed: HTTP ${r.status}: ${body.slice(0, 200)}`,
            );
            return null;
          });
        }
        return r.json();
      })
      .catch((err) => {
        console.warn(
          "[AI Filter] ollamaGenerate direct fetch error:",
          err.message,
        );
        return null;
      });
  }
  // fallback for any other messages
  return Promise.resolve(null);
}

async function detectAiModel() {
  if (aiModel) {
    console.log("[AI Filter] Using cached model:", aiModel);
    return aiModel;
  }
  // Check if the user has manually chosen a model in the popup
  const stored = await new Promise((resolve) =>
    chrome.storage.sync.get("ollamaModel", (d) =>
      resolve(d.ollamaModel || null),
    ),
  );
  if (stored) {
    aiModel = stored;
    console.log("[AI Filter] Using user-selected model:", aiModel);
    return aiModel;
  }
  console.log("[AI Filter] Querying Ollama for available models…");
  const data = await ollamaProxy({ type: "ollamaTags" });
  if (!data) {
    console.warn("[AI Filter] detectAiModel: no response from Ollama proxy");
    return null;
  }
  const models = (data.models || []).map((m) => m.name);
  console.log("[AI Filter] Available models:", models);
  if (models.length === 0) {
    console.warn("[AI Filter] No models installed in Ollama");
    return null;
  }
  const preferred = ["deepseek", "mistral", "qwen", "gemma", "phi", "llama3"];
  const match = preferred.flatMap((p) => models.filter((m) => m.includes(p)));
  aiModel = match[0] || models[0];
  console.log("[AI Filter] Auto-selected model:", aiModel);
  return aiModel;
}

async function classifyTitles(titles, themes) {
  const model = await detectAiModel();
  if (!model) {
    console.warn(
      "[AI Filter] classifyTitles: no model available, skipping batch",
    );
    return null;
  }

  const themeList = themes.join(", ");
  const numbered = titles.map((t, i) => `${i}: "${t}"`).join("\n");

  const prompt =
    `You are a strict video content filter. The user ONLY wants to watch videos about: ${themeList}.\n` +
    `Below are YouTube video titles numbered from 0. ` +
    `Reply with ONLY a JSON array of the 0-based indices of titles that do NOT belong to any of those themes (titles to hide). ` +
    `Be strict and aggressive — if a title is not clearly and directly about one of the themes, include it in the hide list. ` +
    `Only show titles that are unmistakably about the requested themes. ` +
    `If all titles should be hidden, reply with an array of all indices. If all match, reply with []. ` +
    `No explanation, no markdown — only the raw JSON array.\n\n` +
    `Titles:\n${numbered}\n\nJSON array of indices to hide:`;

  console.log(
    `[AI Filter] Sending ${titles.length} titles to Ollama (model: ${model})`,
  );
  console.log("[AI Filter] Prompt:\n", prompt);

  const data = await ollamaProxy({
    type: "ollamaGenerate",
    payload: { model, prompt, stream: false },
  });
  if (!data) {
    console.warn(
      "[AI Filter] classifyTitles: no response from Ollama generate",
    );
    aiModel = null; // force re-detection next run
    return null;
  }

  let raw = (data.response || "").trim();
  console.log("[AI Filter] Raw Ollama response:\n", raw);

  // Strip <think>...</think> blocks produced by reasoning models (e.g. deepseek-r1)
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (stripped !== raw) {
    console.log("[AI Filter] Stripped <think> block. Remaining:\n", stripped);
    raw = stripped;
  }

  // Take the LAST JSON array in the response — the final answer, not mid-reasoning mentions
  const matches = [...raw.matchAll(/\[[\d,\s]*\]/g)];
  console.log(
    "[AI Filter] JSON array matches found:",
    matches.map((m) => m[0]),
  );
  if (matches.length === 0) {
    console.warn(
      "[AI Filter] No JSON array found in response, treating as 'hide none'",
    );
    return [];
  }
  const result = JSON.parse(matches[matches.length - 1][0]);
  console.log("[AI Filter] Indices to hide:", result);
  return result;
}

async function runAiFilter() {
  const runId = ++aiFilterRunId;
  if (aiFilterRunning) {
    console.log(
      "[AI Filter] Already running — will re-check after current run",
    );
    return;
  }
  aiFilterRunning = true;
  try {
    await _runAiFilterInner(runId);
  } finally {
    aiCurrentAbortController = null;
    aiFilterRunning = false;
    chrome.storage.local.set({ aiPendingCount: 0 });
    // If new cards appeared while we were running, process them now
    if (!aiFilterStopped) {
      const uncachedExist = findVideoCards().some((card) => {
        const el = card.querySelector(TITLE_SELECTOR);
        const title = (el?.getAttribute("title") || el?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        return title && !aiDecisionCache.has(title);
      });
      if (uncachedExist) scheduleAiFilter();
    }
  }
}

async function _runAiFilterInner(runId) {
  if (!aiState.enabled || aiState.themes.length === 0) {
    console.log(
      "[AI Filter] runAiFilter: disabled or no themes — restoring all cards",
    );
    document.querySelectorAll("[data-ai-hidden]").forEach((el) => {
      el.style.display = "";
      delete el.dataset.aiHidden;
    });
    return;
  }

  const cards = findVideoCards();
  console.log(
    `[AI Filter] runAiFilter: found ${cards.length} video cards on page`,
  );
  if (cards.length === 0) {
    console.log(
      `[AI Filter] 0 cards — page may not have loaded video content yet, or selectors don't match this page type.`,
      `\nURL: ${location.pathname}`,
      `\nytd-rich-item-renderer count: ${document.querySelectorAll('ytd-rich-item-renderer').length}`,
      `\nyt-lockup-view-model count: ${document.querySelectorAll('yt-lockup-view-model').length}`,
      `\n${TITLE_SELECTOR} count: ${document.querySelectorAll(TITLE_SELECTOR).length}`,
    );
  }

  // Group cards by title to avoid sending duplicate titles to Ollama
  // (YouTube nests ytd-video-renderer inside ytd-rich-item-renderer, so both
  // match VIDEO_CARD_SELECTOR and produce the same title twice).
  const titleCardMap = new Map(); // title -> [card, ...]

  // Apply cached decisions instantly, group the rest by title
  cards.forEach((card) => {
    const el = card.querySelector(TITLE_SELECTOR);
    const title = (el?.getAttribute("title") || el?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) return;
    if (aiDecisionCache.has(title)) {
      const show = aiDecisionCache.get(title);
      card.style.display = show ? "" : "none";
      if (!show) card.dataset.aiHidden = "1";
      else delete card.dataset.aiHidden;
    } else {
      if (!titleCardMap.has(title)) titleCardMap.set(title, []);
      titleCardMap.get(title).push(card);
    }
  });

  const uncached = [...titleCardMap.entries()].map(([title, cards]) => ({ title, cards }));

  console.log(
    `[AI Filter] ${cards.length - uncached.length} from cache, ${uncached.length} need classification`,
  );
  if (uncached.length === 0) return;

  chrome.storage.local.set({ aiPendingCount: uncached.length });

  // Send uncached titles to Ollama in configurable batches
  for (let i = 0; i < uncached.length; i += aiBatchSize) {
    const batch = uncached.slice(i, i + aiBatchSize);
    // Update pending count: remaining items not yet processed
    chrome.storage.local.set({ aiPendingCount: uncached.length - i });
    console.log(
      `[AI Filter] Processing batch ${Math.floor(i / aiBatchSize) + 1}: titles`,
      batch.map((b) => b.title),
    );

    console.log(
      `%c[AI Filter] ⏳ Waiting for Ollama… (${batch.length} titles)`,
      "color: #aaa;",
    );
    const _t0 = performance.now();
    const hideIndices = await classifyTitles(
      batch.map((b) => b.title),
      aiState.themes,
    );
    const _elapsed = ((performance.now() - _t0) / 1000).toFixed(2);

    if (runId !== aiFilterRunId) {
      console.log(
        "[AI Filter] Stale run discarded (filter was reset mid-request)",
      );
      break;
    }

    if (hideIndices === null) {
      console.warn("[AI Filter] Ollama unavailable — stopping filter run");
      break;
    }

    const hideSet = new Set(hideIndices);
    const hiddenTitles = [];
    const shownTitles = [];
    batch.forEach(({ cards, title }, idx) => {
      const show = !hideSet.has(idx);
      aiDecisionCache.set(title, show);
      cards.forEach((card) => {
        card.style.display = show ? "" : "none";
        if (!show) card.dataset.aiHidden = "1";
        else delete card.dataset.aiHidden;
      });
      if (!show) hiddenTitles.push(title);
      else shownTitles.push(title);
    });
    console.log(
      `[AI Filter] Batch result — ✅ ${shownTitles.length} shown  🚫 ${hiddenTitles.length} blocked  ⏱️ ${_elapsed}s`,
    );
    if (shownTitles.length > 0) {
      console.groupCollapsed(
        `%c✅ Shown (${shownTitles.length})`,
        "color: #52b052; font-weight: bold;",
      );
      shownTitles.forEach((t, i) =>
        console.log(`%c  ${i + 1}. ${t}`, "color: #52b052;"),
      );
      console.groupEnd();
    }
    if (hiddenTitles.length > 0) {
      console.groupCollapsed(
        `%c🚫 Blocked (${hiddenTitles.length})`,
        "color: #e05252; font-weight: bold;",
      );
      hiddenTitles.forEach((t, i) =>
        console.log(`%c  ${i + 1}. ${t}`, "color: #e05252;"),
      );
      console.groupEnd();
    }
  }
}

function scheduleAiFilter() {
  clearTimeout(aiDebounceTimer);
  aiDebounceTimer = setTimeout(runAiFilter, 900);
}

function startAiObserver() {
  if (aiFilterObserver) return;
  console.log("[AI Filter] Starting MutationObserver");
  aiFilterObserver = new MutationObserver(scheduleAiFilter);
  aiFilterObserver.observe(document.body, { childList: true, subtree: true });
}

function stopAiObserver() {
  aiFilterObserver?.disconnect();
  aiFilterObserver = null;
  clearTimeout(aiDebounceTimer);
  console.log("[AI Filter] Observer stopped");
}

async function applyAiFilter(enabled, themes) {
  console.log(
    "[AI Filter] applyAiFilter called — enabled:",
    enabled,
    "themes:",
    themes,
  );
  aiState = { enabled, themes };
  aiFilterStopped = false;
  aiDecisionCache.clear();

  if (!enabled || themes.length === 0) {
    console.log(
      "[AI Filter] Filter off or no themes — clearing all hidden cards",
    );
    stopAiObserver();
    closeSwKeepalive();
    document.querySelectorAll("[data-ai-hidden]").forEach((el) => {
      el.style.display = "";
      delete el.dataset.aiHidden;
    });
    return;
  }

  openSwKeepalive();

  await runAiFilter();
  startAiObserver();
}

// ─── YouTube SPA navigation ───────────────────────────────────────────────────

window.addEventListener("yt-navigate-finish", () => {
  chrome.storage.sync.get(
    [
      "productivityMode",
      "blockShorts",
      "blockShortsEverywhere",
      "focusKeywords",
      "blockKeywords",
      "aiFilterEnabled",
      "aiThemes",
      "aiCustomThemes",
    ],
    (data) => {
      applyProductivityMode(!!data.productivityMode);
      if (data.blockShorts) {
        applyBlockShorts(true, !!data.blockShortsEverywhere);
        blockShortsPlayback();
      }
      if (data.focusKeywords || data.blockKeywords) {
        applyVideoFilter(data.focusKeywords, data.blockKeywords);
      }
      // New page — clear cache so fresh videos are classified
      aiDecisionCache.clear();
      if (data.aiFilterEnabled) {
        const themes = [
          ...(data.aiThemes || []),
          ...(data.aiCustomThemes || []),
        ];
        applyAiFilter(true, themes);
      }
    },
  );
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(
  [
    "productivityMode",
    "blockShorts",
    "blockShortsEverywhere",
    "focusKeywords",
    "blockKeywords",
    "aiFilterEnabled",
    "aiThemes",
    "aiCustomThemes",
    "aiBatchSize",
  ],
  (data) => {
    if (data.aiBatchSize) aiBatchSize = Math.max(1, Math.min(50, Number(data.aiBatchSize)));
    applyProductivityMode(!!data.productivityMode);
    applyBlockShorts(!!data.blockShorts, !!data.blockShortsEverywhere);
    if (data.blockShorts) {
      blockShortsPlayback();
    }
    if (data.focusKeywords || data.blockKeywords) {
      applyVideoFilter(data.focusKeywords, data.blockKeywords);
    }
    if (data.aiFilterEnabled) {
      const themes = [...(data.aiThemes || []), ...(data.aiCustomThemes || [])];
      applyAiFilter(true, themes);
    }
  },
);

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "productivityMode") {
    applyProductivityMode(msg.value);
  }

  if (msg.type === "blockShorts") {
    chrome.storage.sync.get("blockShortsEverywhere", (data) => {
      applyBlockShorts(msg.value, !!data.blockShortsEverywhere);
    });
  }

  if (msg.type === "blockShortsEverywhere") {
    chrome.storage.sync.get("blockShorts", (data) => {
      applyBlockShorts(!!data.blockShorts, msg.value);
    });
  }

  if (msg.type === "focusKeywords" || msg.type === "blockKeywords") {
    chrome.storage.sync.get(["focusKeywords", "blockKeywords"], (data) => {
      applyVideoFilter(data.focusKeywords, data.blockKeywords);
    });
  }

  if (msg.type === "aiFilterEnabled" || msg.type === "aiThemes") {
    chrome.storage.sync.get(
      ["aiFilterEnabled", "aiThemes", "aiCustomThemes"],
      (data) => {
        const enabled = !!data.aiFilterEnabled;
        const themes = [
          ...(data.aiThemes || []),
          ...(data.aiCustomThemes || []),
        ];
        applyAiFilter(enabled, themes);
      },
    );
  }

  if (msg.type === "ollamaModel") {
    aiModel = msg.value || null; // clear cache so next run uses new model
    console.log("[AI Filter] Model changed to:", aiModel);
  }

  if (msg.type === "unloadModel") {
    console.log("[AI Filter] unloadModel received — aborting in-flight request and stopping observer");
    aiFilterStopped = true;
    ++aiFilterRunId;
    aiCurrentAbortController?.abort();
    aiCurrentAbortController = null;
    stopAiObserver();
    chrome.storage.local.set({ aiPendingCount: 0 });
  }

  if (msg.type === "aiBatchSize") {
    const n = parseInt(msg.value, 10);
    if (!isNaN(n) && n >= 1 && n <= 50) {
      aiBatchSize = n;
      console.log("[AI Filter] Batch size updated to:", aiBatchSize);
    }
  }
});

// const KOALA_URL = chrome.runtime.getURL("images/cute_koala.png");

// // ─── Productivity Mode ────────────────────────────────────────────────────────
// // Uses CSS `content: url()` on thumbnail <img> elements to replace what Chrome
// // paints, regardless of what YouTube sets on src/srcset. Also hides hover
// // video previews via CSS.

// function applyProductivityMode(enabled) {
//   const existingStyle = document.getElementById("yt-focus-productivity-style");
//   if (enabled) {
//     if (existingStyle) return;
//     const style = document.createElement("style");
//     style.id = "yt-focus-productivity-style";
//     // content: url() on <img> replaces what Chrome paints entirely.
//     // YouTube's JS can change src/srcset all it wants — CSS content wins.
//     style.textContent = `
//       ytd-thumbnail img,
//       ytd-playlist-thumbnail img,
//       .ytThumbnailViewModelImage img {
//         content: url('${KOALA_URL}') !important;
//         object-fit: cover !important;
//         width: 100% !important;
//         height: 100% !important;
//       }
//       #inline-preview-player,
//       ytd-thumbnail video,
//       ytd-playlist-thumbnail video,
//       yt-thumbnail-view-model video {
//         display: none !important;
//         visibility: hidden !important;
//       }
//     `;
//     document.head.appendChild(style);
//   } else {
//     existingStyle?.remove();
//   }
// }

// // ─── Block Shorts ─────────────────────────────────────────────────────────────
// // Hides the Shorts shelf on the homepage and redirects /shorts/* URLs to home.

// // Selectors covering both old and new YouTube Shorts shelf renderers
// const SHORTS_CSS = `
//   ytd-rich-shelf-renderer[is-shorts],
//   ytd-reel-shelf-renderer {
//     display: none !important;
//   }
// `;

// let shortsObserver = null;
// let filterObserver = null

// function hideShortsShelf() {
//   // Hide by attribute / tag
//   document
//     .querySelectorAll(
//       "ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer",
//     )
//     .forEach((el) => {
//       el.style.display = "none";
//       el.dataset.ytFocusHidden = "1";
//     });

//   // Fallback: hide any rich shelf whose heading contains "Shorts"
//   document.querySelectorAll("ytd-rich-shelf-renderer").forEach((el) => {
//     if (
//       !el.dataset.ytFocusHidden &&
//       el.querySelector("h2")?.textContent.trim().includes("Shorts")
//     ) {
//       el.style.display = "none";
//       el.dataset.ytFocusHidden = "1";
//     }
//   });
// }

// /*updated*/function applyBlockShorts(enabled, everywhere = false) {
//   const existingStyle = document.getElementById("yt-focus-shorts-style");

//   if (enabled) {
//     // Inject CSS to catch future elements before the observer fires
//     if (!existingStyle) {
//       const style = document.createElement("style");
//       style.id = "yt-focus-shorts-style";
//       style.textContent = SHORTS_CSS;
//       document.head.appendChild(style);
//     }

//     hideShortsShelf();
//     //UPDATED STARTS
//     document.querySelectorAll('a[href="/shorts"]').forEach((el) => {
//       el.style.display = "none";
//       el.dataset.ytFocusHidden = "1";
//     });
//     if (everywhere) {
//       document.querySelectorAll(
//         'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]'
//       ).forEach((el) => {
//         el.style.display = "none";
//         el.dataset.ytFocusHidden = "1";
//       });
//     }

//     // Watch for dynamically injected shelf elements (YouTube SPA)
//     if (!shortsObserver) {
//       /*updated*/shortsObserver = new MutationObserver(() =>{
//     //UPDATED STARTS
//         hideShortsShelf();
//         if (everywhere) {
//           document.querySelectorAll(
//             'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]'
//           ).forEach((el) => {
//             el.style.display = "none";
//             el.dataset.ytFocusHidden = "1";
//           });
//         }
//       });
//    //UPDATED ENDS
//       shortsObserver.observe(document.body, { childList: true, subtree: true });
//     }
//   } else {
//     existingStyle?.remove();

//     // Restore any elements hidden by this extension
//     document.querySelectorAll("[data-yt-focus-hidden]").forEach((el) => {
//       el.style.display = "";
//       delete el.dataset.ytFocusHidden;
//     });

//     shortsObserver?.disconnect();
//     shortsObserver = null;
//   }
// }

// //UPDATED STARTS
// // NEW: Function to block Shorts playback and content on Shorts pages or anywhere Shorts appear.
// function blockShortsPlayback() {
//    document.querySelectorAll('ytd-shorts, ytd-reel-video-renderer, [is-shorts]').forEach(el => {
//     el.style.display = 'none';
//     el.dataset.ytFocusHidden = '1';
//   });

//   document.querySelectorAll('video').forEach(video => {
//     if (
//       video.closest('ytd-shorts') ||
//       video.closest('[is-shorts]') ||
//       video.src.includes('/shorts/')
//     ) {
//       video.pause();
//       video.currentTime = 0;
//     }
//   });
// }
// //UPDATED ENDS

// //UPDATED STARTS
// // ───Block shorts everywhere. Not just on homepage───────────────────────────────────────────────────
// // function applyBlockShorts(enabled, everywhere = false) {
// //   // ... existing logic for shelf ...

// //   if (enabled && everywhere) {
// //     // Hide Shorts in all contexts: feeds, search, sidebar, etc.
// //     const shortsSelectors = `
// //       ytd-video-renderer[is-shorts],
// //       ytd-compact-video-renderer[is-shorts],
// //       a[href*="/shorts/"],
// //       [data-shorts-video]
// //     `;
// //     document.querySelectorAll(shortsSelectors).forEach(el => {
// //       el.style.display = 'none';
// //       el.dataset.ytFocusHidden = '1';
// //     });

// //     // Add to observer for dynamic content
// //     // (Extend the existing shortsObserver to include these selectors)
// //   }
// // }
// // //UPDATED ENDS

// //UPDATED STARTS
// //UPDATED ENDS

// //UPDATED STARTS
// // ─── Focusing and blocking based on keywords───────────────────────────────────────────────────
// function applyVideoFilter(focusKeywords, blockKeywords) {
//   const focusList = focusKeywords ? focusKeywords.split(',').map(k => k.trim().toLowerCase()) : [];
//   const blockList = blockKeywords ? blockKeywords.split(',').map(k => k.trim().toLowerCase()) : [];

//   function filterVideos() {
//     document.querySelectorAll('ytd-video-renderer, ytd-compact-video-renderer').forEach(video => {
//       const title = video.querySelector('#video-title')?.textContent.toLowerCase() || '';
//       const channel = video.querySelector('#channel-name')?.textContent.toLowerCase() || '';
//       const text = title + ' ' + channel;

//       const matchesFocus = focusList.length === 0 || focusList.some(k => text.includes(k));
//       const matchesBlock = blockList.some(k => text.includes(k));

//       video.style.display = (!matchesFocus || matchesBlock) ? 'none' : '';
//     });
//   }

//   // Initial filter
//   filterVideos();

//   // Observe for new videos (YouTube loads dynamically)
//   // const filterObserver = new MutationObserver(filterVideos);
//   // filterObserver.observe(document.body, { childList: true, subtree: true });
//   if (filterObserver) filterObserver.disconnect();
//   filterObserver = new MutationObserver(filterVideos);
//   filterObserver.observe(document.body, { childList: true, subtree: true });
// }
// //UPDATED ENDS

// // ─── YouTube SPA navigation ───────────────────────────────────────────────────
// // YouTube uses history.pushState for internal navigation, so the content script
// // only runs once. Re-apply features whenever YouTube signals a navigation.

// window.addEventListener("yt-navigate-finish", () => {
//   /*updated*/chrome.storage.sync.get(["productivityMode", "blockShorts", "blockShortsEverywhere", "focusKeywords", "blockKeywords"], (data) => {
//     /*updated into function*/if (data.blockShorts){
//        //UPDATED STARTS
//         applyBlockShorts(true, !!data.blockShortsEverywhere);
//         blockShortsPlayback();

//     }
//     if (data.focusKeywords || data.blockKeywords) {
//       applyVideoFilter(data.focusKeywords, data.blockKeywords);
//     }

//     //UPDATED ENDS
//   });
// });

// // ─── Init ─────────────────────────────────────────────────────────────────────

// /*updated*/chrome.storage.sync.get(["productivityMode", "blockShorts", "focusKeywords", "blockKeywords", "blockShortsEverywhere"], (data) => {
//   applyProductivityMode(!!data.productivityMode);
//   /*updated*/applyBlockShorts(!!data.blockShorts, !!data.blockShortsEverywhere);
//  /*completely new*/applyVideoFilter(data.focusKeywords, data.blockKeywords);
//  /*completely new*/if (data.focusKeywords || data.blockKeywords) {
//   /*completely new*/applyVideoFilter(data.focusKeywords, data.blockKeywords);
// }

//     // Redirect or hide content
//   if (data.blockShorts) {
//   blockShortsPlayback();
// }
// });

// // ─── Message listener (from popup toggle changes) ─────────────────────────────

// chrome.runtime.onMessage.addListener((msg) => {
//   if (msg.type === "productivityMode") applyProductivityMode(msg.value);
//    /*updated into function*/if (msg.type === "blockShorts"){
//     chrome.storage.sync.get("blockShortsEverywhere", (data) => {
//         /*updated*/applyBlockShorts(msg.value, !!data.blockShortsEverywhere);
//     });
//   }

//   //UPDATED STARTS
//   if (msg.type === "focusKeywords" || msg.type === "blockKeywords") {
//     chrome.storage.sync.get(["focusKeywords", "blockKeywords"], (data) => {
//       applyVideoFilter(data.focusKeywords, data.blockKeywords);
//     });
//   }
//   if (msg.type === "blockShortsEverywhere") {
//     chrome.storage.sync.get("blockShorts", (data) => {
//       applyBlockShorts(!!data.blockShorts, msg.value);
//     });
//   }
//   //UPDATED ENDS
// });
