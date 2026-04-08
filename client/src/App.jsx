import { useState } from 'react'
import './App.css'
import { getSearchList, getVideos} from './api'


function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [videoData, setVideoData] = useState([])

  const searchYouTube = async (e) => {
    const data = await getSearchList(searchTerm)
    const videoIds = data['items'].map((item) => item['id']['videoId']).join(',')
    const videos = await getVideos(videoIds)
    setVideoData(videos["items"])
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
         {/* <button className="menu-btn">☰</button>*/}
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
            <img src="https://img.icons8.com/ios-filled/20/000000/search.png" alt="Search" />
          </button>
        </form>
      </header>
      <div className="main">
        <aside className="sidebar">
          <nav>
            <ul>
              <li><a href="#App.jsx">🏠 Home</a></li>
              <li><a href="#">🔥 focus-mode</a></li>
              <li><a href="#">📺 Subscriptions</a></li>
              <li><a href="#">📚 Library</a></li>
              <li><a href="#">📜 History</a></li>
              <li><a href="#">🎵 Music</a></li>
              <li><a href="#">🎮 Gaming</a></li>
              <li><a href="#">📰 News</a></li>
              <li><a href="#">🏆 Sports</a></li>
            </ul>
          </nav>
        </aside>
        <main className="content">
          <div className="video-grid">
            {videoData.map((video) => {
              return (
                <div key={video["id"]} className="video-card">
                  <div className="video-info">
                    <h3 className="video-title">{video["snippet"]["title"]}</h3>
                    <p>Channel: {video["snippet"]["channelTitle"]}</p>
                    <p>Views: {video["statistics"]["viewCount"]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App