import { useState, useEffect, useRef } from "react";
import "./App.css";
import { getSearchList, getVideos } from "./api";
import LandingPage from "./LandingPage";

function App() {
  const [showLanding, setShowLanding] = useState(false);
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

  if (showLanding) {
    return <LandingPage onLaunchApp={() => setShowLanding(false)} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">FocusTube</div>
          <button
            className="header-ext-btn"
            onClick={() => setShowLanding(true)}
          >
            Get the Extension
          </button>
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
              src="https://img.icons8.com/ios-filled/20/ffffff/search.png"
              alt="Search"
            />
          </button>
        </form>
      </header>

      <div className="main">
        {/* Hidden YouTube player */}
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

        {/* Left — player panel */}
        <div className="sidebar-wrap">
          <div className="now-playing-card">
            <p className="now-playing-label">Now Playing</p>
            {selectedVideo ? (
              <>
                <h3 className="now-playing-title">
                  {selectedVideo["snippet"]["title"]}
                </h3>
                <p className="now-playing-channel">
                  {selectedVideo["snippet"]["channelTitle"]}
                </p>
              </>
            ) : (
              <p className="now-playing-idle">Select a video to play</p>
            )}
          </div>

          <div className="controls-card">
            <span className="controls-label">Controls</span>
            <button
              className="play-btn"
              onClick={togglePlay}
              disabled={!selectedVideo}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
          </div>
        </div>

        {/* Right — search results */}
        <div className="content-wrap">
          <div className="video-grid">
            {videoData.map((video) => {
              const isSelected = selectedVideo?.["id"] === video["id"];
              return (
                <div
                  key={video["id"]}
                  className={`video-card${isSelected ? " video-card--selected" : ""}`}
                  onClick={() => selectVideo(video)}
                >
                  <h3 className="video-title">{video["snippet"]["title"]}</h3>
                  <p className="video-meta">
                    <span>{video["snippet"]["channelTitle"]}</span>
                  </p>
                  <p className="video-meta">
                    {Number(video["statistics"]["viewCount"]).toLocaleString()}{" "}
                    views
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
