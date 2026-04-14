User selects themes + toggles Apply Filter
        ↓
popup.js saves to chrome.storage + sends message to tab
        ↓
content.js: applyAiFilter(enabled, themes)
        ↓
detectAiModel() — GET /api/tags → picks best model (prefers llama3/mistral/phi)
        ↓
Scan DOM: ytd-rich-item-renderer, ytd-video-renderer, etc.
Extract #video-title text from each card
        ↓
Apply cached decisions instantly (Map<title, show/hide>)
        ↓
Batch uncached titles (30 at a time) → POST /api/generate
Prompt asks Ollama for JSON array of indices to hide
        ↓
Parse response, cache results, set display:none on mismatches
        ↓
MutationObserver (900ms debounce) re-runs as YouTube lazy-loads more videos
        ↓
On page navigation (yt-navigate-finish), cache clears and filter re-runs