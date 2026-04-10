const TOGGLE_KEYS = ["productivityMode", "blockShorts", "blockShortsEverywhere"];
const TEXT_KEYS = ["focusKeywords", "blockKeywords"];
const ALL_KEYS = [...TOGGLE_KEYS, ...TEXT_KEYS];

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
