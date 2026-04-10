const KOALA_URL = chrome.runtime.getURL("images/cute_koala.png");

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
    .querySelectorAll("ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer")
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
          'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]'
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
            'ytd-video-renderer[is-shorts], ytd-compact-video-renderer[is-shorts], a[href*="/shorts/"], [data-shorts-video]'
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
    ? focusKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
    : [];
  const blockList = blockKeywords
    ? blockKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
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

// ─── YouTube SPA navigation ───────────────────────────────────────────────────

window.addEventListener("yt-navigate-finish", () => {
  chrome.storage.sync.get(
    ["productivityMode", "blockShorts", "blockShortsEverywhere", "focusKeywords", "blockKeywords"],
    (data) => {
      applyProductivityMode(!!data.productivityMode);

      if (data.blockShorts) {
        applyBlockShorts(true, !!data.blockShortsEverywhere);
        blockShortsPlayback();
      }

      // Only run filter if there are actual keywords
      if (data.focusKeywords || data.blockKeywords) {
        applyVideoFilter(data.focusKeywords, data.blockKeywords);
      }
    }
  );
});

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(
  ["productivityMode", "blockShorts", "blockShortsEverywhere", "focusKeywords", "blockKeywords"],
  (data) => {
    applyProductivityMode(!!data.productivityMode);
    applyBlockShorts(!!data.blockShorts, !!data.blockShortsEverywhere);

    if (data.blockShorts) {
      blockShortsPlayback();
    }

    // Only run filter if there are actual keywords
    if (data.focusKeywords || data.blockKeywords) {
      applyVideoFilter(data.focusKeywords, data.blockKeywords);
    }
  }
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
