from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers.api import router as api_router
from app.routers.subscription_router import router as sub_router
from app.routers.payment_router import router as payment_router
from app.routers.license_router import router as license_router
from app.routers.access_router import router as access_router

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_REQUESTS_PER_MINUTE}/minute"])

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure, production-grade YouTube media analysis & compliant media retriever.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS for all origins (Netlify, Cloudflare, localhost, mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.include_router(api_router)
app.include_router(sub_router, prefix="/api")
app.include_router(payment_router, prefix="/api/payments")
app.include_router(license_router, prefix="/api")
app.include_router(access_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
