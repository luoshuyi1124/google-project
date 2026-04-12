const TOGGLE_KEYS = [
  "productivityMode",
  "blockShorts",
  "blockShortsEverywhere",
];
const TEXT_KEYS = ["focusKeywords", "blockKeywords"];
const ALL_KEYS = [...TOGGLE_KEYS, ...TEXT_KEYS, "aiThemes", "aiCustomThemes"];

// Restore saved states on open
chrome.storage.sync.get(ALL_KEYS, (data) => {
  for (const key of TOGGLE_KEYS) {
    const el = document.getElementById(key);
    if (el) el.checked = !!data[key];
  }
  for (const key of TEXT_KEYS) {
    const el = document.getElementById(key);
    if (el) el.value = data[key] || "";
  }
});

function sendToTab(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg);
  });
}

// Checkboxes — fire on "change"
for (const key of TOGGLE_KEYS) {
  const el = document.getElementById(key);
  if (!el) continue;
  el.addEventListener("change", (e) => {
    const value = e.target.checked;
    chrome.storage.sync.set({ [key]: value });
    chrome.runtime.sendMessage({ type: key, value });
    sendToTab({ type: key, value });
  });
}

// Text inputs — fire on "input" so changes take effect as you type,
// with a small debounce to avoid spamming storage on every keystroke
const debounceTimers = {};
for (const key of TEXT_KEYS) {
  const el = document.getElementById(key);
  if (!el) continue;
  el.addEventListener("input", (e) => {
    const value = e.target.value;
    clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(() => {
      chrome.storage.sync.set({ [key]: value });
      chrome.runtime.sendMessage({ type: key, value });
      sendToTab({ type: key, value });
    }, 400);
  });
}

// ── AI Video Filter ────────────────────────────────────────────────────────

const PRESET_THEMES = [
  "Education",
  "Technology",
  "Science",
  "Finance",
  "Music",
  "Gaming",
  "News",
  "Sports",
  "Cooking",
  "Comedy",
  "Travel",
  "Fitness",
];

// In-memory state (synced to/from storage)
let selectedPresets = new Set();
let customThemes = []; // ordered list of user-added custom theme strings

function saveAiThemes() {
  const data = {
    aiThemes: [...selectedPresets],
    aiCustomThemes: [...customThemes],
  };
  chrome.storage.sync.set(data);
  sendToTab({ type: "aiThemes", value: data });
  updateFilterStatus();
}

function updateFilterStatus() {
  const total = selectedPresets.size + customThemes.length;
  const el = document.getElementById("filterStatus");
  if (total === 0) {
    el.textContent = "No filter active — all videos shown";
    el.classList.remove("active");
  } else {
    el.textContent = `Filtering for ${total} theme${total > 1 ? "s" : ""}`;
    el.classList.add("active");
  }
}

function renderPresetGrid() {
  const grid = document.getElementById("presetGrid");
  grid.innerHTML = "";
  for (const theme of PRESET_THEMES) {
    const chip = document.createElement("span");
    chip.className =
      "theme-chip" + (selectedPresets.has(theme) ? " selected" : "");
    chip.textContent = theme;
    chip.addEventListener("click", () => {
      if (selectedPresets.has(theme)) {
        selectedPresets.delete(theme);
      } else {
        selectedPresets.add(theme);
      }
      chip.classList.toggle("selected");
      saveAiThemes();
    });
    grid.appendChild(chip);
  }
}

function renderCustomGrid() {
  const grid = document.getElementById("customGrid");
  grid.innerHTML = "";
  for (const theme of customThemes) {
    const chip = document.createElement("span");
    chip.className = "theme-chip custom selected";
    chip.innerHTML = `${theme}<span class="remove-btn" title="Remove">✕</span>`;
    chip.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      customThemes = customThemes.filter((t) => t !== theme);
      renderCustomGrid();
      saveAiThemes();
    });
    grid.appendChild(chip);
  }
}

function addCustomTheme(raw) {
  const theme = raw.trim();
  if (!theme) return;
  // Avoid duplicates (case-insensitive check against presets and existing custom)
  const lower = theme.toLowerCase();
  const alreadyPreset = PRESET_THEMES.some((p) => p.toLowerCase() === lower);
  const alreadyCustom = customThemes.some((t) => t.toLowerCase() === lower);
  if (alreadyPreset) {
    // Just select the matching preset instead
    const match = PRESET_THEMES.find((p) => p.toLowerCase() === lower);
    selectedPresets.add(match);
    renderPresetGrid();
    saveAiThemes();
    return;
  }
  if (alreadyCustom) return;
  customThemes.push(theme);
  renderCustomGrid();
  saveAiThemes();
}

// Wire up the Add button and Enter key
document.getElementById("addThemeBtn").addEventListener("click", () => {
  const input = document.getElementById("customThemeInput");
  addCustomTheme(input.value);
  input.value = "";
  input.focus();
});

document.getElementById("customThemeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addCustomTheme(e.target.value);
    e.target.value = "";
  }
});

// Restore AI filter state on open (merged into the existing storage.get restore)
chrome.storage.sync.get(["aiThemes", "aiCustomThemes"], (data) => {
  selectedPresets = new Set(data.aiThemes || []);
  customThemes = data.aiCustomThemes || [];
  renderPresetGrid();
  renderCustomGrid();
  updateFilterStatus();
});

// //UPDATED KEYS
// const KEYS = ["productivityMode", "blockShorts","focusKeywords", "blockKeywords", "blockShortsEverywhere"];

// // Restore saved toggle states on open
// chrome.storage.sync.get(KEYS, (data) => {
//   for (const key of KEYS) {
// //<!---UPDATED STARTS--->

//     //document.getElementById(key).checked = !!data[key]; -> was here orginally
//      const el = document.getElementById(key);
//     if (el.type === "checkbox") {
//       el.checked = !!data[key];
//     } else {
//       el.value = data[key] || "";
//     }

//     //<!---UPDATED ENDS--->
//   }
// });

// // On toggle change: save, notify the active tab's content script, and notify background
// for (const key of KEYS) {
//   document.getElementById(key).addEventListener("change", (e) => {
//     //const value = e.target.checked; -> was here orginally
//    /*only update*/ const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;

//     chrome.storage.sync.set({ [key]: value });
//     chrome.runtime.sendMessage({ type: key, value });
//     chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
//       if (tab?.id) {
//         chrome.tabs.sendMessage(tab.id, { type: key, value });
//       }
//     });
//   });
// }
