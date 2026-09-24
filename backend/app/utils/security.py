import re
import socket
import urllib.parse
import ipaddress
from app.config import settings

# Regex for YouTube URLs
YOUTUBE_URL_REGEX = re.compile(
    r'^(https?://)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/(watch\?v=|embed/|v/|shorts/|live/)?([a-zA-Z0-9_-]{11})(\S*)?$'
)

DISALLOWED_IP_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),        # IPv4 Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # Private class A
    ipaddress.ip_network('172.16.0.0/12'),      # Private class B
    ipaddress.ip_network('192.168.0.0/16'),     # Private class C
    ipaddress.ip_network('169.254.0.0/16'),     # Link-local / Cloud metadata
    ipaddress.ip_network('0.0.0.0/8'),          # Current network
    ipaddress.ip_network('::1/128'),            # IPv6 Loopback
    ipaddress.ip_network('fc00::/7'),           # IPv6 Unique Local Address
    ipaddress.ip_network('fe80::/10'),          # IPv6 Link-local
]

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection vulnerabilities."""
    # Remove path traversal sequences first
    clean = filename.replace('..', '')
    # Replace non-alphanumeric chars (excluding dots and dashes) with underscores
    clean = re.sub(r'[^a-zA-Z0-9._-]', '_', clean)
    # Strip leading dots, underscores, and spaces
    clean = clean.lstrip('. _-')
    return clean or "tube_vault_media"

def is_ip_allowed(ip_str: str) -> bool:
    """Checks if IP is not within blocked private or loopback ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        for network in DISALLOWED_IP_NETWORKS:
            if ip in network:
                return False
        return True
    except ValueError:
        return False

def extract_youtube_video_id(parsed: urllib.parse.ParseResult) -> tuple[bool, str]:
    """Extract 11-char YouTube video ID from various standard URL structures."""
    hostname = (parsed.hostname or "").lower()
    path = parsed.path
    
    # 1. youtu.be/<id>
    if "youtu.be" in hostname:
        parts = [p for p in path.strip("/").split("/") if p]
        if parts:
            candidate = parts[0]
            if re.match(r'^[a-zA-Z0-9_-]{11}$', candidate):
                return True, candidate

    # 2. youtube.com formats
    if any(domain in hostname for domain in ["youtube.com"]):
        # /watch?v=<id> (handles any query parameters ordering)
        if path == "/watch" or path.startswith("/watch"):
            qs = urllib.parse.parse_qs(parsed.query)
            if 'v' in qs and qs['v']:
                candidate = qs['v'][0]
                if re.match(r'^[a-zA-Z0-9_-]{11}$', candidate):
                    return True, candidate

        # /shorts/<id>, /embed/<id>, /v/<id>, /live/<id>
        parts = [p for p in path.strip("/").split("/") if p]
        if len(parts) >= 2 and parts[0] in ["shorts", "embed", "v", "live"]:
            candidate = parts[1]
            if re.match(r'^[a-zA-Z0-9_-]{11}$', candidate):
                return True, candidate

    return False, ""

def validate_youtube_url(url: str) -> tuple[bool, str]:
    """
    Validates host, protocol, IP range, and regex pattern for YouTube URLs.
    Returns (is_valid, reason/normalized_url)
    """
    if not url or not isinstance(url, str):
        return False, "URL string is missing or invalid."

    url = url.strip()

    # Prepend https if user pasted URL without scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)

    # Allow only http and https
    if parsed.scheme not in ["http", "https"]:
        return False, "Invalid protocol scheme. Only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL lacks a valid hostname."

    hostname_lower = hostname.lower()

    # Check host against allowed list
    is_domain_allowed = any(
        hostname_lower == domain or hostname_lower.endswith("." + domain)
        for domain in settings.ALLOWED_DOMAINS
    )

    if not is_domain_allowed:
        return False, f"Domain '{hostname}' is not supported. Please paste a valid YouTube video link."

    # Prevent SSRF via IP resolution check
    try:
        ip_addresses = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in ip_addresses:
            ip = sockaddr[0]
            if not is_ip_allowed(ip):
                return False, f"Access to IP address '{ip}' is blocked for security reasons."
    except Exception:
        # If hostname resolution fails during pre-flight, let yt-dlp handle or return error
        pass

    # Extract clean video ID
    has_id, video_id = extract_youtube_video_id(parsed)
    if has_id:
        normalized_url = f"https://www.youtube.com/watch?v={video_id}"
        return True, normalized_url

    # Regex validation for YouTube format structure fallback
    if YOUTUBE_URL_REGEX.match(url):
        return True, url

    return False, "Invalid YouTube video link format. Please check the URL and try again."

INSTAGRAM_URL_REGEX = re.compile(
    r'^(https?://)?(www\.|m\.)?(instagram\.com|ddinstagram\.com)/(reel|reels|p|tv)/([a-zA-Z0-9_-]+)/?(\S*)?$'
)

def extract_instagram_shortcode(parsed: urllib.parse.ParseResult) -> tuple[bool, str, str]:
    """Extract media type (reel/post) and shortcode from Instagram URL."""
    hostname = (parsed.hostname or "").lower()
    path = parsed.path.strip("/")
    parts = [p for p in path.split("/") if p]
    
    if any(d in hostname for d in ["instagram.com", "ddinstagram.com"]):
        if len(parts) >= 2 and parts[0] in ["reel", "reels", "p", "tv"]:
            media_type = "reel" if parts[0] in ["reel", "reels"] else "post"
            shortcode = parts[1]
            if re.match(r'^[a-zA-Z0-9_-]+$', shortcode):
                return True, media_type, shortcode

    return False, "", ""

def validate_instagram_url(url: str) -> tuple[bool, str]:
    """
    Validates host, protocol, IP range, and regex pattern for Instagram Reel and Post URLs.
    Guarantees SSRF immunity and anti-bypass protections.
    Returns (is_valid, reason/normalized_url)
    """
    if not url or not isinstance(url, str):
        return False, "URL string is missing or invalid."

    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)

    if parsed.scheme not in ["http", "https"]:
        return False, "Invalid protocol scheme. Only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL lacks a valid hostname."

    hostname_lower = hostname.lower()
    allowed_insta_domains = ["instagram.com", "www.instagram.com", "m.instagram.com", "ddinstagram.com"]
    is_domain_allowed = any(
        hostname_lower == domain or hostname_lower.endswith("." + domain)
        for domain in allowed_insta_domains
    )

    if not is_domain_allowed:
        return False, f"Domain '{hostname}' is not a valid Instagram URL. Please paste a valid Instagram Reel or Post link."

    # SSRF DNS IP verification check
    try:
        ip_addresses = socket.getaddrinfo(hostname, None)
        for family, socktype, proto, canonname, sockaddr in ip_addresses:
            ip = sockaddr[0]
            if not is_ip_allowed(ip):
                return False, f"Access to IP address '{ip}' is blocked for security reasons."
    except Exception:
        pass

    has_code, media_type, shortcode = extract_instagram_shortcode(parsed)
    if has_code:
        route_prefix = "reel" if media_type == "reel" else "p"
        normalized_url = f"https://www.instagram.com/{route_prefix}/{shortcode}/"
        return True, normalized_url

    if INSTAGRAM_URL_REGEX.match(url):
        return True, url

    return False, "Invalid Instagram Reel or Post URL format. Expected link like https://www.instagram.com/reel/CODE/ or https://www.instagram.com/p/CODE/"

def validate_any_supported_url(url: str) -> tuple[bool, str, str]:
    """
    Detects platform (youtube / instagram) and performs complete SSRF and domain validation.
    Returns (is_valid, reason/normalized_url, platform)
    """
    if not url or not isinstance(url, str):
        return False, "Missing URL.", "unknown"

    url_lower = url.lower()
    if "instagram.com" in url_lower or "ddinstagram.com" in url_lower:
        is_val, res = validate_instagram_url(url)
        return is_val, res, "instagram"
    else:
        is_val, res = validate_youtube_url(url)
        return is_val, res, "youtube"

