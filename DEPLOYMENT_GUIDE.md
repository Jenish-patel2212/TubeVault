# TubeVault Online Deployment Guide 🚀

This guide explains how to deploy **TubeVault** online on the internet for free or low-cost using modern cloud platforms.

TubeVault consists of two parts:
1. **Backend (FastAPI + yt-dlp + ffmpeg)**: Requires Docker or a Linux environment with `ffmpeg` installed.
2. **Frontend (React + Vite)**: A static Single Page Application (SPA).

---

## 🌟 Method 1: Render.com (Easiest & Free)

Render allows you to deploy both the Docker backend and static frontend from your GitHub repository using the included `render.yaml` Blueprint.

### Steps:
1. **Push your code to GitHub**:
   - Create a new repository on [GitHub](https://github.com/new) (public or private).
   - Upload or push your TubeVault project code to that repository.

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/) and sign in.
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository.
   - Render will detect [`render.yaml`](./render.yaml) and configure:
     - `tubevault-backend` (Docker Web Service)
     - `tubevault-frontend` (Static Site)
   - Click **Apply**.

3. **Link Frontend to Backend**:
   - Once the backend is deployed, copy its public URL (e.g., `https://tubevault-backend.onrender.com`).
   - In the frontend settings, ensure the environment variable `VITE_API_BASE_URL` is set to your backend URL (e.g. `https://tubevault-backend.onrender.com`).
   - Trigger a redeploy of the frontend.

---

## ⚡ Method 2: Render (Backend) + Vercel (Frontend) (Recommended)

For the fastest worldwide CDN performance, host the frontend on **Vercel** and the backend on **Render**.

### 1. Deploy the Backend on Render:
1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your repository and choose **Docker** runtime.
4. Set:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile`
5. Click **Create Web Service**.
6. Note the deployed backend URL (e.g., `https://your-backend.onrender.com`).

### 2. Deploy the Frontend on Vercel:
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** and import your repository.
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. Expand **Environment Variables** and add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend.onrender.com` *(your Render backend URL)*
5. Click **Deploy**.

---

## 🚂 Method 3: Railway.app (1-Click Docker)

1. Sign in to [Railway](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Add the `backend` service (Railway will automatically build using [`backend/Dockerfile`](./backend/Dockerfile)).
4. Add the `frontend` service with environment variable `VITE_API_BASE_URL`.
5. Generate public domain URLs for both in **Service Settings -> Networking**.

---

## 🖥️ Method 4: Self-Hosted VPS (Ubuntu / Debian / Docker)

If you have a Linux VPS (DigitalOcean, AWS, Linode, Hetzner):
1. Install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   ```
2. Clone your project onto the server.
3. Run:
   ```bash
   docker-compose up -d --build
   ```
4. Configure Nginx or Caddy with SSL (Let's Encrypt) to proxy domain traffic to ports `8000` (API) and `5173` (Frontend).

---

## 🔍 Checklist Before Launching
- [x] Backend Dockerfile updated with dynamic `$PORT` support
- [x] Frontend `vercel.json` SPA routing configured
- [x] Render Blueprint `render.yaml` created
- [ ] Code uploaded to a GitHub repository
- [ ] Backend deployed and verified via `/docs`
- [ ] Frontend `VITE_API_BASE_URL` set to the backend public URL
