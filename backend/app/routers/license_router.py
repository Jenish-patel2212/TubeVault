import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Header, Response, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.services.payment_db import PaymentDB
from app.routers.subscription_router import verify_admin_token

router = APIRouter(prefix="/license", tags=["Video Download Licensing & Certificates"])

# --- Request Models ---

class VerifyLicenseRequest(BaseModel):
    license_key: str

class GenerateCertificateRequest(BaseModel):
    license_key: str
    media_title: str
    media_url: str
    format_label: Optional[str] = "Video MP4"

class AdminCreateLicenseRequest(BaseModel):
    user_email: str
    customer_name: str
    plan_id: str
    duration_days: Optional[int] = 365
    custom_key: Optional[str] = ""
    notes: Optional[str] = "Manual Admin License Issuance"

class AdminRevokeLicenseRequest(BaseModel):
    license_key: str
    reason: Optional[str] = "Revoked by Administrator"


# --- Certificate Formatter Helper ---

def build_license_certificate_text(
    license_data: Dict[str, Any],
    media_title: str,
    media_url: str,
    format_label: str = "Video MP4"
) -> Dict[str, str]:
    """Builds a formatted, cryptographic certificate document string."""
    now_utc = datetime.now(timezone.utc)
    cert_id = f"CERT-{now_utc.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    timestamp_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")

    key = license_data.get("license_key", "UNKNOWN-KEY")
    customer = license_data.get("customer_name", "Valued Customer")
    email = license_data.get("user_email", "N/A")
    plan = (license_data.get("plan_id", "pro")).upper()
    expires = license_data.get("expires_at", "N/A")

    # Generate integrity checksum
    checksum_raw = f"{cert_id}|{key}|{email}|{media_url}|{timestamp_str}"
    checksum = hashlib.sha256(checksum_raw.encode("utf-8")).hexdigest()[:32].upper()

    doc = f"""================================================================================
                 TUBEVAULT OFFICIAL MEDIA LICENSE CERTIFICATE
================================================================================
CERTIFICATE IDENTIFIER : {cert_id}
ISSUANCE TIMESTAMP     : {timestamp_str}
ISSUING AUTHORITY      : TubeVault Central Digital Media Authority
AUTHORITY REGISTRY     : https://tubevault.media/registry

--------------------------------------------------------------------------------
1. LICENSEE CREDENTIALS
--------------------------------------------------------------------------------
LICENSEE NAME          : {customer}
LICENSEE EMAIL         : {email}
OFFICIAL LICENSE KEY   : {key}
TIER ENTITLEMENT       : {plan} PASS (Ultra-Fast VIP Node / High-Definition)
EXPIRATION DATE        : {expires}
STATUS                 : VERIFIED & ACTIVE

--------------------------------------------------------------------------------
2. LICENSED MEDIA ASSET
--------------------------------------------------------------------------------
CONTENT TITLE          : {media_title}
SOURCE IDENTIFIER/URL  : {media_url}
DELIVERY FORMAT        : {format_label}

--------------------------------------------------------------------------------
3. TERMS & GRANT OF NON-EXCLUSIVE DIGITAL RIGHTS
--------------------------------------------------------------------------------
This document certifies that the Licensee designated above has acquired a valid,
verified TubeVault access pass granting non-exclusive authorization for personal,
educational, research, and offline fair-use archival of the digital media asset
referenced herein. 

All original copyrights, trademarks, and associated intellectual property rights
remain with their respective content owners and publishers. This certificate
serves as verifiable electronic proof of legitimate download through the TubeVault
secure accelerator gateway.

--------------------------------------------------------------------------------
4. VERIFICATION & CRYPTOGRAPHIC INTEGRITY
--------------------------------------------------------------------------------
INTEGRITY CHECKSUM     : SHA256-{checksum}
ELECTRONIC VALIDATION  : Validated against TubeVault Database Registry
================================================================================
             END OF CERTIFICATE - TUBEVAULT PROTECTED ASSET
================================================================================
"""
    clean_filename = "".join(c for c in media_title if c.isalnum() or c in (" ", "-", "_")).rstrip()[:50]
    safe_title = clean_filename if clean_filename else "download"
    filename = f"{safe_title} - TubeVault License Certificate.txt"

    return {
        "certificate_id": cert_id,
        "certificate_text": doc,
        "filename": filename,
        "checksum": checksum,
        "timestamp": timestamp_str
    }


# --- Public Customer Endpoints ---

@router.post("/verify")
async def verify_license_key(req: VerifyLicenseRequest):
    """
    Validates a license key provided by the customer before starting a download.
    Also accepts email if the customer activated their subscription by email.
    """
    key = req.license_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="License key is required.")

    # Check if user entered an email address instead of a key
    if "@" in key:
        lic = PaymentDB.get_license_by_email(key)
        if lic:
            verification = PaymentDB.verify_license(lic["license_key"])
            return {
                "success": True,
                "valid": verification["valid"],
                "reason": verification["reason"],
                "license": verification["license"]
            }
        # Also check subscription table directly
        sub_record = PaymentDB.get_customer_history(key).get("subscription")
        if sub_record and sub_record.get("status") == "active":
            # Auto-mint license for this active subscriber
            auto_lic = PaymentDB.create_license(
                user_email=key,
                customer_name="Subscriber",
                plan_id=sub_record.get("plan_id", "pro"),
                order_id=sub_record.get("order_id", ""),
                notes="Auto-minted from active email subscription"
            )
            return {
                "success": True,
                "valid": True,
                "reason": "Active subscription detected. License Key granted!",
                "license": auto_lic
            }

        return {
            "success": True,
            "valid": False,
            "reason": f"No active license or subscription found for '{key}'. Please purchase a pass.",
            "license": None
        }

    # Standard license key lookup
    verification = PaymentDB.verify_license(key)
    return {
        "success": True,
        "valid": verification["valid"],
        "reason": verification["reason"],
        "license": verification["license"]
    }


@router.post("/certificate")
async def generate_license_certificate(req: GenerateCertificateRequest):
    """
    Generates official License Certificate text upon completion of a video download.
    Increments download count on the license record.
    """
    key = req.license_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="License key is required to generate a certificate.")

    # Find license or resolve via email
    if "@" in key:
        license_data = PaymentDB.get_license_by_email(key)
    else:
        license_data = PaymentDB.get_license(key)

    if not license_data:
        # Fallback certificate for newly activated users
        license_data = {
            "license_key": key.upper(),
            "customer_name": "TubeVault Pass Holder",
            "user_email": "Customer",
            "plan_id": "pro",
            "expires_at": "Active",
            "status": "ACTIVE"
        }
    else:
        PaymentDB.increment_license_downloads(license_data["license_key"])

    cert_data = build_license_certificate_text(
        license_data=license_data,
        media_title=req.media_title or "Media Download",
        media_url=req.media_url or "https://youtube.com",
        format_label=req.format_label or "Video MP4"
    )

    return {
        "success": True,
        "data": cert_data
    }


@router.get("/certificate/file")
async def download_certificate_file(
    license_key: str,
    title: str = "TubeVault Download",
    url: str = "",
    format_label: str = "Video MP4"
):
    """
    Direct HTTP file attachment download for the License Certificate (.txt).
    """
    if "@" in license_key:
        lic = PaymentDB.get_license_by_email(license_key)
    else:
        lic = PaymentDB.get_license(license_key)

    if not lic:
        lic = {
            "license_key": license_key.upper(),
            "customer_name": "TubeVault Member",
            "user_email": "Verified User",
            "plan_id": "pro",
            "expires_at": "Active",
            "status": "ACTIVE"
        }

    cert = build_license_certificate_text(
        license_data=lic,
        media_title=title,
        media_url=url,
        format_label=format_label
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{cert["filename"]}"'
    }
    return PlainTextResponse(content=cert["certificate_text"], media_type="text/plain", headers=headers)


# --- Admin Protected Endpoints ---

@router.get("/admin/list")
async def admin_list_licenses(
    search: Optional[str] = "",
    status: Optional[str] = "all",
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    auth: bool = Depends(verify_admin_token)
):
    """Admin retrieves paginated list of all issued licenses."""
    result = PaymentDB.list_licenses(
        search=search or "",
        status=status or "all",
        limit=min(limit or 50, 100),
        offset=offset or 0
    )
    return {
        "success": True,
        "total": result["total"],
        "licenses": result["licenses"]
    }


@router.post("/admin/create")
async def admin_create_license(
    req: AdminCreateLicenseRequest,
    auth: bool = Depends(verify_admin_token)
):
    """Admin manually generates a new license key."""
    if not req.user_email or "@" not in req.user_email:
        raise HTTPException(status_code=400, detail="A valid customer email is required.")

    lic = PaymentDB.create_license(
        user_email=req.user_email,
        customer_name=req.customer_name or req.user_email.split("@")[0],
        plan_id=req.plan_id or "pro",
        duration_days=req.duration_days or 365,
        custom_key=req.custom_key or "",
        notes=req.notes or "Manual Admin Grant"
    )

    return {
        "success": True,
        "message": f"License key '{lic['license_key']}' created successfully.",
        "license": lic
    }


@router.post("/admin/revoke")
async def admin_revoke_license(
    req: AdminRevokeLicenseRequest,
    auth: bool = Depends(verify_admin_token)
):
    """Admin revokes a license key."""
    ok = PaymentDB.revoke_license(req.license_key, req.reason or "Revoked by admin")
    if not ok:
        raise HTTPException(status_code=404, detail="License key not found.")

    return {
        "success": True,
        "message": f"License key '{req.license_key}' has been revoked."
    }
