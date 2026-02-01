import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import os

# Set required env vars BEFORE importing main
os.environ["ACCESS_KEY"] = "test_key"
os.environ["TELEGRAM_BOT_TOKEN"] = "test_token"
os.environ["ALLOWED_TELEGRAM_USERS"] = "12345, 67890"
os.environ["FRONTEND_URL"] = "http://test-frontend.com"

from main import app, telegram_start, validate_url

client = TestClient(app)

# --- Unit Tests for Core Logic ---

def test_validate_url_success():
    """Should not raise error for valid http/https URLs."""
    validate_url("https://youtube.com/watch?v=123")
    validate_url("http://example.com")

def test_validate_url_failure():
    """Should raise ValueError for non-http schemes."""
    with pytest.raises(ValueError):
        validate_url("ftp://example.com")
    with pytest.raises(ValueError):
        validate_url("file:///etc/passwd")

# --- Unit Tests for FastAPI ---

def test_health_check():
    """Should return 200 OK and the vibe check."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "vibe": "immaculate"}

@patch("main.perform_download")
def test_yoink_endpoint_success(mock_download):
    """Should return 200 and download details on success."""
    # Mock the return value of the internal download function
    mock_download.return_value = {
        "title": "Test Video",
        "filename": "test_video.mp4",
        "filepath": "/tmp/test_video.mp4"
    }

    response = client.post(
        "/yoink",
        json={"url": "https://youtube.com/watch?v=123"},
        headers={"X-Access-Key": "test_key"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["title"] == "Test Video"
    assert "download_url" in data

def test_yoink_endpoint_auth_fail():
    """Should return 401 if Access Key is wrong."""
    response = client.post(
        "/yoink",
        json={"url": "https://youtube.com/watch?v=123"},
        headers={"X-Access-Key": "wrong_key"}
    )
    assert response.status_code == 401

# --- Unit Tests for Telegram Bot ---

@pytest.mark.asyncio
async def test_telegram_start_authorized():
    """Should reply with Welcome message and Mini App button for allowed users."""
    
    # Mock Update object
    update = AsyncMock()
    update.effective_user.id = 12345 # Allowed user
    update.message.reply_text = AsyncMock()

    # Mock Context (not used but required signature)
    context = MagicMock()

    await telegram_start(update, context)

    # Assert reply was sent
    update.message.reply_text.assert_called_once()
    
    # Check args passed to reply_text
    args, kwargs = update.message.reply_text.call_args
    assert "Welcome to Vortex" in args[0]
    assert "reply_markup" in kwargs
    
    # Verify the button URL
    keyboard = kwargs["reply_markup"].keyboard
    assert len(keyboard) > 0
    button = keyboard[0][0]
    assert button.web_app.url == "http://test-frontend.com"

@pytest.mark.asyncio
async def test_telegram_start_unauthorized():
    """Should reject unauthorized users."""
    
    update = AsyncMock()
    update.effective_user.id = 99999 # Not in allowed list
    update.message.reply_text = AsyncMock()
    context = MagicMock()

    await telegram_start(update, context)

    # Assert rejection message
    update.message.reply_text.assert_called_once()
    args, _ = update.message.reply_text.call_args
    assert "not on the guest list" in args[0]
