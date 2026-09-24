import os
from typing import Optional
from app.config import settings

def find_cookie_file() -> Optional[str]:
    """
    Locates an existing Netscape cookies.txt file or constructs one
    from environment variables (e.g., INSTAGRAM_COOKIES or COOKIES_FILE).
    This allows yt-dlp to bypass Instagram bot detection and login walls.
    """
    # 1. Direct file path via env
    env_cookie = os.environ.get("COOKIES_FILE")
    if env_cookie and os.path.exists(env_cookie) and os.path.getsize(env_cookie) > 0:
        return env_cookie

    # 2. Raw cookie content passed via env variable
    raw_cookies = os.environ.get("INSTAGRAM_COOKIES") or os.environ.get("YTDLP_COOKIES")
    if raw_cookies and raw_cookies.strip():
        tmp_cookie = os.path.join(settings.TEMP_DIR, "env_cookies.txt")
        try:
            with open(tmp_cookie, "w", encoding="utf-8") as f:
                f.write(raw_cookies.strip())
            return tmp_cookie
        except Exception:
            pass

    # 3. Standard file locations
    base_backend = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    workspace_root = os.path.dirname(base_backend)
    candidates = [
        os.path.join(base_backend, "cookies.txt"),
        os.path.join(workspace_root, "cookies.txt"),
        os.path.join(os.getcwd(), "cookies.txt"),
        os.path.join(settings.TEMP_DIR, "cookies.txt"),
    ]

    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 0:
            return c

    return None
