const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
require("dotenv").config();

app.use(express.json());
app.use(cors());

const searchCache = new Map();
const videoCache = new Map();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
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
