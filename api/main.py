import os
import uuid
import logging
import asyncio
import secrets
from urllib.parse import urlparse
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
from telegram import Update, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vortex-api")

# --- Configuration & Security ---
ACCESS_KEY = os.getenv("ACCESS_KEY")
if not ACCESS_KEY:
    raise RuntimeError("CRITICAL: ACCESS_KEY environment variable must be set.")

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ALLOWED_TELEGRAM_USERS = os.getenv("ALLOWED_TELEGRAM_USERS", "")
DOWNLOADS_DIR = "downloads"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://your-domain.com") 

allowed_user_ids = []
if ALLOWED_TELEGRAM_USERS:
    try:
        allowed_user_ids = [int(uid.strip()) for uid in ALLOWED_TELEGRAM_USERS.split(",") if uid.strip()]
    except ValueError:
        logger.warning("Invalid ALLOWED_TELEGRAM_USERS format.")

# --- Core Logic ---

def validate_url(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ["http", "https"]:
        raise ValueError("Invalid URL scheme.")

def perform_download(url: str) -> dict:
    validate_url(url)
    download_id = str(uuid.uuid4())[:8]
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'outtmpl': f'{DOWNLOADS_DIR}/%(title)s [{download_id}].%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'restrictfilenames': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename_abs = ydl.prepare_filename(info)
        filename_base = os.path.basename(filename_abs)
        title = info.get('title', 'Unknown Title')
        return {"title": title, "filename": filename_base, "filepath": filename_abs}

# --- Telegram Bot Logic (Mini App Mode) ---

async def telegram_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if allowed_user_ids and user_id not in allowed_user_ids:
        await update.message.reply_text("🚫 You are not on the guest list.")
        return

    logger.info(f"User {user_id} started bot. Serving Mini App link: {FRONTEND_URL}")

    kb = [
        [KeyboardButton(text="📱 Open App", web_app=WebAppInfo(url=FRONTEND_URL))]
    ]
    reply_markup = ReplyKeyboardMarkup(kb, resize_keyboard=True)
    
    await update.message.reply_text(
        "👋 Welcome to Vortex!\n\nI can help you download videos privately from your favorite sites.\nTap the button below to open the app!",
        reply_markup=reply_markup
    )

async def run_telegram_bot():
    if not TELEGRAM_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Bot disabled.")
        return

    application = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    application.add_handler(CommandHandler("start", telegram_start))
    
    await application.initialize()
    await application.start()
    await application.updater.start_polling()
    
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()

# --- FastAPI Lifespan & App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    bot_task = None
    if TELEGRAM_TOKEN:
        logger.info("Starting Telegram Bot...")
        bot_task = asyncio.create_task(run_telegram_bot())
    yield
    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Vortex API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

class DownloadRequest(BaseModel):
    url: str

def verify_key_header(x_access_key: Optional[str] = Header(None)):
    if x_access_key is None or not secrets.compare_digest(x_access_key, ACCESS_KEY):
        raise HTTPException(status_code=401, detail="Invalid Access Key.")

def verify_key_query(token: str = Query(...)):
    if not secrets.compare_digest(token, ACCESS_KEY):
        raise HTTPException(status_code=401, detail="Invalid Access Key.")

@app.get("/health")
def health_check():
    return {"status": "ok", "vibe": "immaculate"}

@app.post("/yoink")
async def yoink_media(req: DownloadRequest, x_access_key: Optional[str] = Header(None)):
    verify_key_header(x_access_key)
    try:
        logger.info(f"API Pulling: {req.url}")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, perform_download, req.url)
        return {
            "status": "success",
            "title": result['title'],
            "filename": result['filename'],
            "download_url": f"/files/{result['filename']}"
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"API Download failed: {e}")
        raise HTTPException(status_code=400, detail="Download failed.")

@app.get("/files/{filename}")
async def get_file(filename: str, token: str = Query(...)):
    verify_key_query(token)
    safe_filename = os.path.basename(filename)
    file_path = os.path.abspath(os.path.join(DOWNLOADS_DIR, safe_filename))
    if not file_path.startswith(os.path.abspath(DOWNLOADS_DIR)) or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(file_path)
