import pytest
from app.utils.security import validate_youtube_url, sanitize_filename, is_ip_allowed

def test_validate_valid_youtube_urls():
    valid_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "http://youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ?si=abcdefg12345",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
        "www.youtube.com/watch?v=dQw4w9WgXcQ",
    ]
    for url in valid_urls:
        is_valid, _ = validate_youtube_url(url)
        assert is_valid is True, f"Failed for valid URL: {url}"

def test_reject_invalid_domains_and_schemes():
    invalid_urls = [
        "https://google.com",
        "http://malicious-site.org/video",
        "file:///etc/passwd",
        "ftp://youtube.com/video",
        "javascript:alert(1)",
        "http://127.0.0.1/admin",
        "http://localhost:8000",
    ]
    for url in invalid_urls:
        is_valid, reason = validate_youtube_url(url)
        assert is_valid is False, f"Should reject invalid URL: {url}"

def test_ssrf_ip_blocking():
    assert is_ip_allowed("127.0.0.1") is False
    assert is_ip_allowed("10.0.0.1") is False
    assert is_ip_allowed("192.168.1.1") is False
    assert is_ip_allowed("169.254.169.254") is False
    assert is_ip_allowed("8.8.8.8") is True

def test_filename_sanitization():
    assert sanitize_filename("../../../etc/passwd") == "etc_passwd"
    assert sanitize_filename("video<script>alert(1)</script>.mp4") == "video_script_alert_1___script_.mp4"
    assert sanitize_filename("Normal Title - 1080p.mp4") == "Normal_Title_-_1080p.mp4"

def test_validate_instagram_urls():
    from app.utils.security import validate_instagram_url
    valid_urls = [
        "https://www.instagram.com/reel/C8q87z_s8Xx/",
        "https://instagram.com/reel/C8q87z_s8Xx",
        "https://www.instagram.com/p/C8q87z_s8Xx/",
        "https://m.instagram.com/reel/C8q87z_s8Xx/?igsh=abcdef",
    ]
    for url in valid_urls:
        is_valid, _ = validate_instagram_url(url)
        assert is_valid is True, f"Failed for valid Instagram URL: {url}"

    invalid_urls = [
        "https://instagram.com/direct/inbox/",
        "https://evil-instagram.com/reel/123",
        "http://169.254.169.254/reel/123",
    ]
    for url in invalid_urls:
        is_valid, _ = validate_instagram_url(url)
        assert is_valid is False, f"Should reject invalid Instagram URL: {url}"

def test_validate_any_supported_url():
    from app.utils.security import validate_any_supported_url
    assert validate_any_supported_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")[0] is True
    assert validate_any_supported_url("https://www.instagram.com/reel/C8q87z_s8Xx/")[0] is True
    assert validate_any_supported_url("https://malicious.com")[0] is False

