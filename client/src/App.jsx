import { useState, useEffect, useRef } from "react";
import "./App.css";
import { getSearchList, getVideos } from "./api";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [videoData, setVideoData] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const playerReady = useRef(false);
  const pendingVideoId = useRef(null);

  // Load YouTube IFrame API once and create a hidden player
  useEffect(() => {
    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        height: "1",
        width: "1",
        videoId: "",
        playerVars: { autoplay: 0 },
        events: {
          onReady: () => {
            playerReady.current = true;
            if (pendingVideoId.current) {
              playerRef.current.loadVideoById(pendingVideoId.current);
              pendingVideoId.current = null;
            }
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };
  }, []);

  const searchYouTube = async (e) => {
    e.preventDefault();
    const data = await getSearchList(searchTerm);
    const videoIds = data["items"]
      .map((item) => item["id"]["videoId"])
      .join(",");
    const videos = await getVideos(videoIds);
    setVideoData(videos["items"]);
  };

  const selectVideo = (video) => {
    setSelectedVideo(video);
    setIsPlaying(true);
    if (playerReady.current && playerRef.current) {
      playerRef.current.loadVideoById(video["id"]);
    } else {
      pendingVideoId.current = video["id"];
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">FocusTube</div>
        </div>

        <form onSubmit={searchYouTube} className="header-center">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <button className="search-btn" onClick={searchYouTube}>
            <img
              src="https://img.icons8.com/ios-filled/20/000000/search.png"
              alt="Search"
            />
          </button>
        </form>
      </header>

      <div className="main">
        <div style={{ flexGrow: 1, position: "relative" }}>
          <aside className="sidebar">
            {/* Hidden YouTube player — required by YouTube API */}
            <div
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <div id="yt-player"></div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "40vh",
                backgroundColor: "blueviolet",
                borderRadius: "50px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              {selectedVideo ? (
                <>
                  <h3 style={{ color: "white", margin: 0 }}>
                    {selectedVideo["snippet"]["title"]}
                  </h3>
                  <p
                    style={{ color: "rgba(255,255,255,0.7)", marginTop: "8px" }}
                  >
                    {selectedVideo["snippet"]["channelTitle"]}
                  </p>
                </>
              ) : (
                <p style={{ color: "white" }}>Select a video to play</p>
              )}
            </div>

            <div style={{ display: "flex", height: "4vh" }}></div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "40vh",
                backgroundColor: "gray",
                gap: "16px",
              }}
            >
              <button
                onClick={togglePlay}
                disabled={!selectedVideo}
                style={{
                  padding: "12px 32px",
                  fontSize: "20px",
                  cursor: selectedVideo ? "pointer" : "not-allowed",
                  borderRadius: "8px",
                  border: "none",
                }}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            </div>
          </aside>
        </div>

        <div className="content-wrap">
          <main className="content">
            <div className="video-grid">
              {videoData.map((video) => {
                const isSelected = selectedVideo?.["id"] === video["id"];
                return (
                  <div
                    key={video["id"]}
                    className="video-card"
                    onClick={() => selectVideo(video)}
                    style={{
                      cursor: "pointer",
                      outline: isSelected ? "2px solid blueviolet" : "none",
                    }}
                  >
                    <div className="video-info">
                      <h3 className="video-title">
                        {video["snippet"]["title"]}
                      </h3>
                      <p>Channel: {video["snippet"]["channelTitle"]}</p>
                      <p>Views: {video["statistics"]["viewCount"]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
