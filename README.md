# TubeVault - Modern YouTube Media Utility 🚀

TubeVault is a modern, production-ready web application for analyzing YouTube video metadata and retrieving allowed video and audio formats with live download progress tracking, security sandboxing, clean dark/light UI, and legal compliance safeguards.

---

## 🌟 Key Features

- **Format & Metadata Analysis**: Instant parsing of video title, channel, duration, thumbnail, view counts, and available video (1080p, 720p, 480p, 360p) and audio (MP3) quality options.
- **Real-Time Download Tracking**: Monitor percentage progress, current transfer speed (MB/s), estimated time remaining (ETA), and direct file saving to disk.
- **Security Sandboxing**:
  - **Zero Shell Execution**: Uses Python's `yt_dlp` API programmatically inside application memory. Eliminates OS command injection.
  - **SSRF & Hostname Guard**: Validates scheme, domain whitelist, and rejects private/loopback IP ranges (`127.0.0.1`, `10.x.x.x`, `169.254.169.254`).
  - **Path Traversal Shield**: All downloaded media files are stored in isolated UUID subdirectories with strict filename sanitization.
- **Automated TTL Cleanup**: Temporary download folders are automatically purged after completion or after 15 minutes.
- **Browser Local History**: Private download history stored strictly inside the user's browser LocalStorage with one-click clear options.
- **Modern Glassmorphism UI**: High-contrast Dark and Light mode toggle, smooth responsive layout, and gradient accents.
- **Legal Compliance Notices**: Prominent terms of service disclaimers. DRM circumvention, paywalls, and private video extractions are strictly disabled.

---

## 🛠️ Architecture & Tech Stack

### Backend
- **Framework**: Python 3.11 + FastAPI
- **Engine**: `yt-dlp` (Python native API)
- **Validation**: Pydantic v2
- **Rate Limiting**: Slowapi
- **Testing**: Pytest & HTTPX test client

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Glassmorphism Utilities
- **Icons**: Lucide React
- **API Client**: Axios

---

## 📁 Directory Structure

```
youtube/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI entry, CORS, security headers, rate limits
│   │   ├── config.py              # Application settings & environment configuration
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic data models for requests & responses
│   │   ├── routers/
│   │   │   └── api.py             # REST API endpoints (/analyze, /download, etc.)
│   │   ├── services/
│   │   │   ├── youtube_service.py # yt-dlp metadata extraction & format parsing
│   │   │   └── download_manager.py# Async job queue, progress tracking & temp file storage
│   │   └── utils/
│   │       └── security.py        # URL parsing, SSRF defense, filename sanitization
│   ├── tests/
│   │   ├── test_security.py       # URL validation & SSRF test cases
│   │   └── test_api.py            # API endpoint integration tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/            # Navbar, Hero, URLInput, MediaPreview, FormatSelector, etc.
│   │   ├── pages/                 # HomePage, HistoryPage, AboutPage, PrivacyPage, TermsPage
│   │   ├── types/                 # TypeScript interfaces matching backend models
│   │   ├── utils/                 # API client & LocalStorage helpers
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css              # Custom scrollbars, glassmorphism & Tailwind layers
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quickstart & Development Setup

### Option A: Running Locally

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API server will start at `http://localhost:8000`. API Swagger Docs available at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend Vite server will start at `http://localhost:5173`.

---

### Option B: Running with Docker Compose

```bash
docker-compose up --build
```
Access the application at `http://localhost:5173`.

---

## 🧪 Running Unit Tests

```bash
cd backend
pytest -v
```

---

## 📡 REST API Documentation

### `POST /api/analyze`
Validates YouTube URL and retrieves available format metadata.
- **Request Body**: `{ "url": "https://www.youtube.com/watch?v=..." }`
- **Response**: `MediaMetadata` object containing title, thumbnail, channel, duration, video formats, and audio formats.

### `POST /api/download`
Initiates a background download job for a permitted YouTube URL.
- **Request Body**: `{ "url": "...", "format_id": "137", "media_type": "video" }`
- **Response**: `{ "job_id": "uuid-string", "message": "Download job initiated successfully." }`

### `GET /api/download/{job_id}`
Polls real-time download status, percent complete, transfer speed (MB/s), and ETA (seconds).

### `GET /api/download/{job_id}/file`
Streams completed media file to browser with `Content-Disposition: attachment`.

### `DELETE /api/download/{job_id}`
Cancels ongoing download job and cleans up temporary files.

---

## ⚖️ Legal & Compliance Disclaimer

TubeVault is developed for educational, demonstration, and personal archival purposes. Users are strictly required to respect copyright laws and YouTube's Terms of Service. Only download media that you own or have explicit authorization to download.
