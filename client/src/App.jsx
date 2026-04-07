import { useState } from 'react'
import './App.css'


function App() {
  const [searchTerm, setSearchTerm] = useState('')

  const videos = [
    { id: 1, title: 'Sample Video 1', channel: 'Channel 1', views: '1M views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
    { id: 2, title: 'Sample Video 2', channel: 'Channel 2', views: '500K views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
    { id: 3, title: 'Sample Video 3', channel: 'Channel 3', views: '2M views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
    { id: 4, title: 'Sample Video 4', channel: 'Channel 4', views: '800K views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
    { id: 5, title: 'Sample Video 5', channel: 'Channel 5', views: '3M views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
    { id: 6, title: 'Sample Video 6', channel: 'Channel 6', views: '1.5M views', thumbnail: 'https://images.stockcake.com/public/f/c/5/fc5a10ee-206a-40fc-a18c-145a8dfd3cee_large/cozy-winter-reading-stockcake.jpg' },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
         {/* <button className="menu-btn">☰</button>*/}
          <div className="logo">FocusTube</div>
        </div>
        <div className="header-center">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">
            <img src="https://img.icons8.com/ios-filled/20/000000/search.png" alt="Search" />
          </button>
        </div>
        <div className="header-right">
          <button className="user-btn">👤</button>
        </div>
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
            {videos.map(video => (
              <div key={video.id} className="video-card">
                <img src={video.thumbnail} alt={video.title} className="thumbnail" />
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p>{video.channel}</p>
                  <p>{video.views}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App