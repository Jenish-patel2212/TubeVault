import re
import time
from typing import Dict, Set
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Known automated malicious vulnerability scanners & exploit bots
BLOCKED_USER_AGENTS = re.compile(
    r"(?i)(sqlmap|nikto|masscan|acunetix|gobuster|dirbuster|nmap|wpscan|hydra|burpcollaborator|zgrab|openvas|havij|netsparker|metasploit)",
    re.IGNORECASE
)

# Common web attack payload patterns
ATTACK_SIGNATURES = [
    # Command Injection
    re.compile(r"(?i)(;|\||`|&&|\$\(|\$\{)\s*(cat|ls|dir|net\s+user|whoami|sh|bash|cmd|powershell|curl|wget|nc\s+-e|chmod|rm\s+-rf)"),
    # Path Traversal & LFI
    re.compile(r"(\.\.[\\\/]|%2e%2e[%2f\\\/]|windows[\\\/]win\.ini|etc[\\\/]passwd)"),
    # SQL Injection Patterns
    re.compile(r"(?i)(\bunion\b\s+\bselect\b|\bor\b\s+['\"]?1['\"]?\s*=\s*['\"]?1|--\s*$|;\s*drop\b\s+\btable\b|\bbenchmark\s*\(|\bsleep\s*\(\d+\))"),
    # Cross-Site Scripting (XSS)
    re.compile(r"(?i)(<script\b|javascript\s*:|vbscript\s*:|\bonerror\s*=|\bonload\s*=|\bdocument\.cookie)"),
]

# Track IP violations for automatic temporary rate-limiting & blocking
VIOLATIONS: Dict[str, int] = {}
BANNED_IPS: Dict[str, float] = {} # ip -> ban_expiry_timestamp
BAN_DURATION = 900 # 15 minutes ban for hostile scanners

def is_ip_banned(ip: str) -> bool:
    if ip in BANNED_IPS:
        if time.time() < BANNED_IPS[ip]:
            return True
        else:
            del BANNED_IPS[ip]
            if ip in VIOLATIONS:
                del VIOLATIONS[ip]
    return False

def record_violation(ip: str):
    VIOLATIONS[ip] = VIOLATIONS.get(ip, 0) + 1
    if VIOLATIONS[ip] >= 3:
        BANNED_IPS[ip] = time.time() + BAN_DURATION

class AntiHackShieldMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # 1. Check if IP is currently under security ban
        if is_ip_banned(client_ip):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "TubeVault Security Shield: Access temporarily restricted due to repetitive security policy violations."
                }
            )

        # 2. Block malicious automated scanners
        user_agent = request.headers.get("user-agent", "")
        if user_agent and BLOCKED_USER_AGENTS.search(user_agent):
            record_violation(client_ip)
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Access Denied: Automated exploit scanner detected."}
            )

        # 3. Inspect URL query string and path for attack payloads
        query_string = request.url.query
        path = request.url.path
        target_check_str = f"{path}?{query_string}"

        for sig in ATTACK_SIGNATURES:
            if sig.search(target_check_str):
                record_violation(client_ip)
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Security Shield: Malicious request payload blocked by WAF."}
                )

        # 4. Enforce request size limit (anti-memory exhaustion DDoS, max 1MB for API json)
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > 1024 * 1024:  # 1MB
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Request payload exceeds maximum allowed size (1MB)."}
                    )
            except ValueError:
                pass

        # 5. Process request
        response: Response = await call_next(request)

        # 6. Apply Full Spectrum Military-Grade Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';"
        )
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        )
        # Obfuscate server signature to prevent version-targeted reconnaissance
        response.headers["Server"] = "TubeVault-SecurityShield"

        return response
