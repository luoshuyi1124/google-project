import "./LandingPage.css";

export default function LandingPage({ onLaunchApp }) {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <img src="/koala.png" alt="FocusedKoala" className="nav-koala" />
          FocusedKoala
        </div>
        <button className="btn-primary" onClick={onLaunchApp}>
          Open FocusTube ↗
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-badge">Free Chrome Extension</span>
          <h1 className="hero-title">
            Take back
            <br />
            your focus.
          </h1>
          <p className="hero-subtitle">
            FocusedKoala quietly removes the parts of YouTube designed to hijack
            your attention — so you can actually get things done. No
            distractions. No rabbit holes. Just you and your work.
          </p>
          <div className="hero-ctas">
            <a
              className="btn-primary btn-large"
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noreferrer"
            >
              Add to Chrome — It's Free
            </a>
            <button className="btn-ghost btn-large" onClick={onLaunchApp}>
              Try FocusTube →
            </button>
          </div>
          <p className="hero-note">No account needed. Works instantly.</p>
        </div>
        <div className="hero-image">
          <img
            src="/koala.png"
            alt="FocusedKoala mascot"
            className="hero-koala"
          />
        </div>
      </section>

      {/* PROBLEM STATEMENT */}
      <section className="problem">
        <p className="problem-text">
          The average person loses <strong>2+ hours a day</strong> to YouTube
          recommendations, Shorts, and autoplay. You opened one tab. You know
          how it ends.
        </p>
      </section>

      {/* FEATURES */}
      <section className="features">
        <h2 className="section-title">Everything you need to stay focused</h2>
        <p className="section-subtitle">
          Three powerful modes. One tiny extension. Zero regrets.
        </p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Productivity Mode</h3>
            <p>
              Replaces every video thumbnail with a calm, distraction-free
              image. You can still search and listen — you just won't be tempted
              by clickbait thumbnails ever again.
            </p>
          </div>
          <div className="feature-card feature-card--highlight">
            <div className="feature-badge">Most Popular</div>
            <div className="feature-icon">🚫</div>
            <h3>Block Shorts</h3>
            <p>
              Completely removes the YouTube Shorts section from your feed. No
              more 30-second dopamine loops. The Shorts row vanishes the moment
              you load the page.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">↩️</div>
            <h3>Shorts Redirect</h3>
            <p>
              If you accidentally (or intentionally) end up on a Shorts URL,
              FocusedKoala automatically bounces you back to YouTube's homepage
              before the video even starts.
            </p>
          </div>
        </div>
      </section>

      {/* FOCUSTUBE PROMO */}
      <section className="focustube-promo">
        <div className="focustube-promo-inner">
          <div className="focustube-text">
            <span className="hero-badge">Also from FocusedKoala</span>
            <h2>
              Listen to YouTube.
              <br />
              Without watching it.
            </h2>
            <p>
              FocusTube is our distraction-free music player. Search for any
              song, artist, or playlist — and listen with zero visuals, zero
              recommendations, and zero temptation to watch. Your ears get
              YouTube. Your eyes stay on your work.
            </p>
            <button className="btn-primary btn-large" onClick={onLaunchApp}>
              Open FocusTube →
            </button>
          </div>
          <div className="focustube-visual">
            <div className="mock-player">
              <div className="mock-player-title">Now Playing</div>
              <div className="mock-player-song">Lo-Fi Hip Hop Radio</div>
              <div className="mock-player-channel">ChilledCow</div>
              <div className="mock-controls">
                <span>⏮</span>
                <span className="mock-play">⏸</span>
                <span>⏭</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-nav-logo">
          <img src="/koala.png" alt="FocusedKoala" className="nav-koala" />
          FocusedKoala
        </div>
        <p>Built for people who value their time.</p>
      </footer>
    </div>
  );
}
