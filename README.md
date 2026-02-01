# Vortex

A modern, lightweight, private media downloader. "Vibe coded" for simplicity and style.

## Features
- **Minimal UI**: Clean, dark-mode interface.
- **Telegram Mini App**: Use the downloader directly inside Telegram!
- **Powerful Backend**: Powered by `yt-dlp` and `ffmpeg` (via FastAPI).
- **Private**: Secured Access Key authentication.

## Quick Start (Docker)

1. **Clone & Enter:**
   ```bash
   cd vortex
   ```

2. **Configure:**
   You **MUST** set the `ACCESS_KEY` environment variable.
   Create a `.env` file (optional but recommended) or export variables:
   ```bash
   export ACCESS_KEY="super_secret_password"
   export TELEGRAM_BOT_TOKEN="your-bot-token"
   export ALLOWED_TELEGRAM_USERS="12345678" 
   export FRONTEND_URL="https://your-public-url.com" # Required for Mini App button
   ```

3. **Run:**
   ```bash
   docker compose up --build
   ```

4. **Vortex:**
   - **Telegram**: Start the bot (`/start`). Click the "Open Vortex App" button.
   - **Web**: Open `http://localhost:3000`. Key: `super_secret_password`.

## Telegram Mini App Setup
To make the Mini App work:
1. Your `frontend` must be accessible via **HTTPS** (e.g., using ngrok, Cloudflare Tunnel, or Vercel).
2. Set `FRONTEND_URL` in your env to that HTTPS URL.
3. Start the bot. It will give you a button to launch the app.

## Security Notes
- **Access Key**: The app will fail if `ACCESS_KEY` is not provided.
- **Telegram Auth**: The bot is "Fail-Closed".
- **File Access**: Direct file access (browsing `/files/`) is disabled.

## Configuration

Set environment variables in `docker-compose.yml` or a `.env` file:

- `ACCESS_KEY`: **[REQUIRED]** The password.
- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token.
- `ALLOWED_TELEGRAM_USERS`: **[REQUIRED for Bot]** Comma-separated list of Telegram User IDs.
- `FRONTEND_URL`: **[REQUIRED for Bot]** Public HTTPS URL of the frontend.
