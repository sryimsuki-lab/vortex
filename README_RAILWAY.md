# Vortex (Railway Edition)

A modern, lightweight, private media downloader.

## 🚂 Railway Deployment Guide

This project is configured to run smoothly on [Railway](https://railway.app/).

### Prerequisites
1.  A GitHub Account.
2.  A Railway Account.
3.  This code pushed to a new GitHub repository.

### Step 1: Deploy to Railway
1.  Go to your Railway Dashboard.
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your **Vortex** repository.
4.  Railway will detect the `docker-compose.yml` and create two services: `backend` and `frontend`.

### Step 2: Configure Backend
1.  Click on the **`backend`** service card.
2.  Go to **Variables**:
    *   `ACCESS_KEY`: Set your secret password (e.g., `super_secret_pw`).
    *   `TELEGRAM_BOT_TOKEN`: Your bot token.
    *   `ALLOWED_TELEGRAM_USERS`: Your user ID.
    *   `FRONTEND_URL`: Leave blank for now (we'll come back).
3.  Go to **Settings** -> **Networking** -> **Generate Domain**.
    *   Copy this URL (e.g., `backend-production.up.railway.app`). This is your `NEXT_PUBLIC_API_URL`.
4.  **Important (Storage)**:
    *   By default, files disappear if the app restarts.
    *   To fix: Go to **Volumes**, create a volume, and mount it to `/app/downloads`.

### Step 3: Configure Frontend
1.  Click on the **`frontend`** service card.
2.  Go to **Variables**:
    *   `NEXT_PUBLIC_API_URL`: Paste the Backend URL from Step 2 (e.g., `https://backend-production.up.railway.app`). 
    *   **Note:** You might need to trigger a "Redeploy" for this change to take effect since it's baked into the build.
3.  Go to **Settings** -> **Networking** -> **Generate Domain**.
    *   Copy this URL (e.g., `frontend-production.up.railway.app`).

### Step 4: Finalize
1.  Go back to **Backend** Variables.
2.  Set `FRONTEND_URL` to your new Frontend URL (from Step 3). This enables the "Open App" button in Telegram.
3.  Restart the Backend.

### 🎉 Done!
*   **Web:** Open your Frontend URL.
*   **Telegram:** Message your bot!

## Local Development (Docker)
```bash
docker compose up --build
```
