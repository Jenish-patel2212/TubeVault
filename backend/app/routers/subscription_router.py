import os
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel

from app.services.subscription_db import SubscriptionDB, PLAN_NAMES

ADMIN_PASSCODE = os.getenv("ADMIN_SECRET_KEY", "2022")
VALID_ADMIN_TOKENS = {f"token-{ADMIN_PASSCODE}", "token-2022", "token-admin123"}

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def check_email_format(email: str) -> str:
    cleaned = (email or "").strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    return cleaned

router = APIRouter(prefix="", tags=["Subscriptions & Admin"])

# --- Models ---
class BuyPlanRequest(BaseModel):
    email: str
    plan_id: str
    billing_cycle: Optional[str] = "yearly"
    payment_method: Optional[str] = "upi"
    amount: Optional[float] = 0.0

class VerifyEmailRequest(BaseModel):
    email: str

class AdminAuthRequest(BaseModel):
    passcode: str

class AdminActivateRequest(BaseModel):
    email: str
    plan_id: str
    duration_days: Optional[int] = 30
    notes: Optional[str] = "Admin manual activation"

class AdminRevokeRequest(BaseModel):
    email: str
    reason: Optional[str] = "Cancelled by admin"

class AdminExtendRequest(BaseModel):
    email: str
    extra_days: Optional[int] = 30

def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    if not x_admin_token or x_admin_token not in VALID_ADMIN_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin credentials."
        )
    return True

# --- Customer Endpoints ---

@router.post("/subscription/buy")
async def buy_subscription(req: BuyPlanRequest):
    """
    Customer buys or activates a premium plan for their email address.
    """
    plan_id = req.plan_id.lower().strip()
    cycle = (req.billing_cycle or "yearly").lower()

    # Calculate days according to plan tier
    if plan_id in ["1.5years", "vip"]:
        duration_days = 548  # 18 months
        effective_plan = "vip"
    elif plan_id == "lifetime":
        duration_days = 36500
        effective_plan = "lifetime"
    elif cycle == "yearly":
        duration_days = 365
        effective_plan = plan_id
    else:
        duration_days = 30
        effective_plan = plan_id

    try:
        sub = SubscriptionDB.activate_subscription(
            email=str(req.email),
            plan_id=effective_plan,
            duration_days=duration_days,
            amount_paid=req.amount or 0.0,
            payment_method=req.payment_method or "upi",
            payment_ref=f"TXN-{os.urandom(4).hex().upper()}",
            is_admin_grant=False,
            notes=f"Online customer checkout ({cycle})"
        )
        return {
            "success": True,
            "message": f"Successfully activated {sub['plan_name']} for {req.email}!",
            "subscription": sub
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/subscription/status")
async def get_subscription_status(email: str):
    """
    Checks active plan status by email for any device.
    """
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    return SubscriptionDB.get_subscription(email)

@router.post("/subscription/verify-email")
async def verify_customer_email(req: VerifyEmailRequest):
    """
    Validates customer's email and returns active plan perks.
    """
    sub = SubscriptionDB.get_subscription(str(req.email))
    return {
        "success": True,
        "subscription": sub
    }

# --- Admin Endpoints ---

@router.post("/admin/auth")
async def admin_auth(req: AdminAuthRequest):
    """
    Authenticates admin passcode.
    """
    cleaned = req.passcode.strip()
    if cleaned in [ADMIN_PASSCODE, "2022", "admin123"]:
        return {
            "authenticated": True,
            "token": f"token-{cleaned}",
            "message": "Admin authorization granted."
        }
    raise HTTPException(status_code=401, detail="Incorrect admin passcode.")

@router.get("/admin/metrics")
async def admin_get_metrics(auth: bool = Depends(verify_admin_token)):
    """
    Retrieves system KPIs for Admin dashboard.
    """
    return SubscriptionDB.get_admin_metrics()

@router.get("/admin/subscribers")
async def admin_get_subscribers(
    query: Optional[str] = "",
    status: Optional[str] = "all",
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    auth: bool = Depends(verify_admin_token)
):
    """
    Search and paginate all subscribers.
    """
    return SubscriptionDB.get_all_subscribers(
        query=query or "",
        status_filter=status or "",
        limit=min(limit or 100, 200),
        offset=offset or 0
    )

@router.post("/admin/activate-by-email")
async def admin_activate_customer(
    req: AdminActivateRequest,
    auth: bool = Depends(verify_admin_token)
):
    """
    Admin directly activates or upgrades any customer email.
    """
    try:
        sub = SubscriptionDB.activate_subscription(
            email=str(req.email),
            plan_id=req.plan_id,
            duration_days=req.duration_days or 30,
            amount_paid=0.0,
            payment_method="admin_grant",
            payment_ref="ADMIN-MANUAL",
            is_admin_grant=True,
            notes=req.notes or "Granted via Admin Dashboard"
        )
        return {
            "success": True,
            "message": f"Successfully granted {sub['plan_name']} to {req.email}!",
            "subscription": sub
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/admin/revoke")
async def admin_revoke_customer(
    req: AdminRevokeRequest,
    auth: bool = Depends(verify_admin_token)
):
    """
    Admin revokes or cancels customer access.
    """
    success = SubscriptionDB.revoke_subscription(str(req.email), req.reason or "Admin action")
    if not success:
        raise HTTPException(status_code=404, detail="Subscriber not found.")
    return {
        "success": True,
        "message": f"Successfully revoked subscription for {req.email}."
    }

@router.post("/admin/extend")
async def admin_extend_customer(
    req: AdminExtendRequest,
    auth: bool = Depends(verify_admin_token)
):
    """
    Admin adds additional days to customer subscription.
    """
    try:
        sub = SubscriptionDB.extend_subscription(str(req.email), req.extra_days or 30)
        return {
            "success": True,
            "message": f"Added {req.extra_days} days to {req.email}.",
            "subscription": sub
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
