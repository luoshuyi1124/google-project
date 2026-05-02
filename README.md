<div align="center">
  <img src="extension/images/cute_koala.png" alt="FocusedKoala" width="120"/>
  <h1>🎯 FocusTube</h1>
  <p><strong>Take back your focus on YouTube</strong></p>
  <p>A Chrome extension that removes distractions from YouTube so you can stay productive</p>
</div>

---

## ✨ Features

**🧠 Productivity Mode**  
Replaces clickbait thumbnails with calming koala images. Search and watch freely without the dopamine traps.

**🚫 Block Shorts**  
Completely removes YouTube Shorts from your feed. No more infinite scrolling.

**🤖 AI Filter** *(Experimental)*  
Uses on-device AI to analyze video titles and filter out distractions before they tempt you.

---

## 📺 Demo

### Productivity Mode with Koala Thumbnails
<img width="1919" alt="YouTube homepage with koala thumbnails replacing video covers" src="https://github.com/user-attachments/assets/091da99e-790d-4c35-8901-7eb04850db55" />

### Block Shorts in Action
https://github.com/user-attachments/assets/75221bf0-7323-4891-b21d-9f8e7624afd0

### AI Filter Detection
https://github.com/user-attachments/assets/26409997-c3f8-447c-9073-646013be30be

### AI Filter on "lofi" Query
https://github.com/user-attachments/assets/acc508a3-013d-41b5-871f-68826ebb9288

---

## 🚀 Quick Start

### Install the Extension

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/focustube.git
   cd focustube
   ```

2. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

3. **Start using**
   - Visit YouTube.com
   - Click the extension icon to toggle features
   - Enjoy distraction-free browsing!

### Run the Landing Page (Optional)

```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` to see the marketing landing page.

### Run the AI Server (Optional)

```bash
cd server
npm install
node index.js
```

The AI filtering server runs on `http://localhost:3000`.

---

## 🛠️ Tech Stack

**Extension**: Vanilla JavaScript, Chrome Extension Manifest V3  
**Landing Page**: React 19 + Vite  
**AI Backend**: Node.js + Express  
**AI Model**: On-device inference with Phi-3 *(experimental)*

---

## 📁 Project Structure

```
📦 focustube
├── 📂 extension/          # Chrome extension source
│   ├── manifest.json
│   ├── content.js         # YouTube DOM manipulation
│   ├── background.js      # Extension background logic
│   └── popup.html         # Extension popup UI
├── 📂 client/             # React landing page
│   └── src/
│       └── LandingPage.jsx
├── 📂 server/             # AI filtering backend
│   └── index.js
└── 📂 Version_1/          # Legacy code (archived)
```

---

## ⚠️ Known Limitations

- **AI Filter**: Currently uses Phi-3 which may have accuracy limitations. Future versions will support more robust models.
- **Shorts Blocking**: Some YouTube UI updates may temporarily break shorts detection until content script is updated.

---

## 💡 Why FocusTube?

The average person loses **2+ hours a day** to YouTube recommendations, Shorts, and autoplay. You opened one tab for a tutorial... and suddenly it's 2 AM.

FocusTube gives you control back. No distractions. No rabbit holes. Just intentional viewing.

---

## 📄 License

MIT License - feel free to use and modify!

---

<div align="center">
  <sub>Built with 🧠 for humans who actually want to focus</sub>
</div>