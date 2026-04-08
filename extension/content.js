const KOALA_URL = chrome.runtime.getURL("images/cute_koala.png");

// ─── Productivity Mode ────────────────────────────────────────────────────────
// Replaces all video thumbnails with the koala image via CSS content injection.

function applyProductivityMode(enabled) {
  const existing = document.getElementById("yt-focus-productivity-style");
  if (enabled) {
    if (existing) return;
    const style = document.createElement("style");
    style.id = "yt-focus-productivity-style";
    style.textContent = `
      ytd-thumbnail img {
        content: url('${KOALA_URL}') !important;
        object-fit: cover !important;
      }
    `;
    document.head.appendChild(style);
  } else {
    existing?.remove();
  }
}

// ─── Block Shorts ─────────────────────────────────────────────────────────────
// Hides the Shorts shelf on the homepage and redirects /shorts/* URLs to home.

// Selectors covering both old and new YouTube Shorts shelf renderers
const SHORTS_CSS = `
  ytd-rich-shelf-renderer[is-shorts],
  ytd-reel-shelf-renderer {
    display: none !important;
  }
`;

let shortsObserver = null;

function hideShortsShelf() {
  // Hide by attribute / tag
  document
    .querySelectorAll(
      "ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer",
    )
    .forEach((el) => {
      el.style.display = "none";
      el.dataset.ytFocusHidden = "1";
    });

  // Fallback: hide any rich shelf whose heading contains "Shorts"
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

function applyBlockShorts(enabled) {
  const existingStyle = document.getElementById("yt-focus-shorts-style");

  if (enabled) {
    // Inject CSS to catch future elements before the observer fires
    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = "yt-focus-shorts-style";
      style.textContent = SHORTS_CSS;
      document.head.appendChild(style);
    }

    hideShortsShelf();

    // Watch for dynamically injected shelf elements (YouTube SPA)
    if (!shortsObserver) {
      shortsObserver = new MutationObserver(hideShortsShelf);
      shortsObserver.observe(document.body, { childList: true, subtree: true });
    }
  } else {
    existingStyle?.remove();

    // Restore any elements hidden by this extension
    document.querySelectorAll("[data-yt-focus-hidden]").forEach((el) => {
      el.style.display = "";
      delete el.dataset.ytFocusHidden;
    });

    shortsObserver?.disconnect();
    shortsObserver = null;
  }
}

// ─── YouTube SPA navigation ───────────────────────────────────────────────────
// YouTube uses history.pushState for internal navigation, so the content script
// only runs once. Re-apply features whenever YouTube signals a navigation.

window.addEventListener("yt-navigate-finish", () => {
  chrome.storage.sync.get(["productivityMode", "blockShorts"], (data) => {
    if (data.blockShorts) hideShortsShelf();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(["productivityMode", "blockShorts"], (data) => {
  applyProductivityMode(!!data.productivityMode);
  applyBlockShorts(!!data.blockShorts);
});

// ─── Message listener (from popup toggle changes) ─────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "productivityMode") applyProductivityMode(msg.value);
  if (msg.type === "blockShorts") applyBlockShorts(msg.value);
});
