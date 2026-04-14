require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";

app.use(express.json());
app.use(cors());

const searchCache = new Map();
const videoCache = new Map();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Proxying Ollama from ${OLLAMA_BASE}`);
});

// ── Ollama proxy ──────────────────────────────────────────────────────────────
// The extension's service worker calls these endpoints instead of Ollama
// directly, avoiding the chrome-extension:// origin rejection (HTTP 403).

app.get("/ollama/api/tags", async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/ollama/api/generate", async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

async function getSearchList(searchTerm) {
  if (searchCache.has(searchTerm)) {
    return searchCache.get(searchTerm);
  }

  const params = new URLSearchParams();
  params.append("key", process.env["API_KEY"]);
  params.append("part", "snippet");
  params.append("type", "video");
  params.append("maxResults", 5);
  params.append("q", searchTerm);

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );

  const result = await response.json();
  searchCache.set(searchTerm, result);
  return result;
}

async function getVideos(videoIds) {
  if (videoCache.has(videoIds)) {
    return videoCache.get(videoIds);
  }

  const params = new URLSearchParams();
  params.append("key", process.env["API_KEY"]);
  params.append("part", "snippet,contentDetails,statistics");
  params.append("id", videoIds);

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`,
  );

  const result = await response.json();
  videoCache.set(videoIds, result);
  return result;
}

// connecting to client-side
app.post("/", async (req, res) => {
  const searchTerm = req.body["searchTerm"];
  const result = await getSearchList(searchTerm);

  res.send(result);
});

app.post("/video", async (req, res) => {
  const videoIds = req.body["videoIds"];
  const result = await getVideos(videoIds);

  res.send(result);
});
