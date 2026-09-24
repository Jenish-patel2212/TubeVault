import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, status, Response
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field

from app.services.payment_db import PaymentDB, UPLOADS_DIR
from app.services.payment_service import PaymentService
from app.services.upi_payment_service import UPIPaymentService
from app.services.webhook_service import WebhookService
from app.services.razorpay_gateway_service import RazorpayGatewayService
from app.routers.subscription_router import verify_admin_token

router = APIRouter(tags=["Payment System & Checkout"])

# --- Request Models ---

class CreateRazorpayOrderRequest(BaseModel):
    order_id: str

class VerifyRazorpayPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class AdminUpdateRazorpayConfigRequest(BaseModel):
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = ""
    enabled: Optional[bool] = True

class ValidateCouponRequest(BaseModel):
    code: str
    order_amount: float

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_mobile: str
    plan_id: str
    billing_cycle: Optional[str] = "yearly"
    coupon_code: Optional[str] = ""

class SubmitManualUTRRequest(BaseModel):
    order_id: str
    utr: str
    payment_date: Optional[str] = ""
    amount: Optional[float] = 0.0
    customer_name: Optional[str] = ""
    customer_email: Optional[str] = ""
    customer_mobile: Optional[str] = ""

class AdminVerifyRequest(BaseModel):
    payment_id: str
    action: str # "approve" or "reject"
    notes: Optional[str] = ""

class AdminRefundRequest(BaseModel):
    payment_id: str
    reason: Optional[str] = ""

class AdminUpdateConfigRequest(BaseModel):
    upi_id: str
    business_name: str
    merchant_category: Optional[str] = "5734"


# --- Public Customer Endpoints ---

@router.get("/config")
async def get_payment_config():
    """Returns public UPI payment config: active UPI ID, Business Name, and QR image details."""
    config = UPIPaymentService.get_upi_config()
    return {
        "success": True,
        "config": config
    }

@router.get("/plans")
async def get_available_plans():
    """Returns all active subscription plans."""
    plans = PaymentDB.get_all_plans()
    return {
        "success": True,
        "plans": plans
    }

@router.post("/coupon/validate")
async def validate_coupon(req: ValidateCouponRequest):
    """Validates coupon code and returns discount calculation."""
    result = PaymentService.validate_coupon(req.code, req.order_amount)
    return result

@router.post("/order/create")
async def create_checkout_order(req: CreateOrderRequest):
    """
    Creates a new pending checkout order.
    Returns order ID, price breakdown, and standard UPI deep link.
    """
    try:
        data = PaymentService.create_order(
            customer_name=req.customer_name,
            customer_email=req.customer_email,
            customer_mobile=req.customer_mobile,
            plan_id=req.plan_id,
            billing_cycle=req.billing_cycle or "yearly",
            coupon_code=req.coupon_code or ""
        )
        return {
            "success": True,
            "data": data
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal error creating checkout order.")

@router.post("/manual/submit-utr")
async def submit_manual_utr(req: SubmitManualUTRRequest):
    """
    Customer submits manual FamApp UPI payment reference (UTR).
    Strictly marked as PENDING (Pending Verification).
    Never activates plan until Admin verifies.
    """
    try:
        result = PaymentService.submit_manual_upi_payment(
            order_id=req.order_id,
            utr=req.utr,
            payment_date=req.payment_date or "",
            amount=req.amount or 0.0,
            customer_name=req.customer_name or "",
            customer_email=req.customer_email or "",
            customer_mobile=req.customer_mobile or ""
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to submit payment details for verification.")

@router.get("/order/{order_id}")
async def get_order_details(order_id: str):
    """Fetches real-time status of a customer order and payment."""
    order = PaymentDB.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    payment = PaymentDB.get_payment_by_order(order_id)
    plan = PaymentDB.get_plan(order["plan_id"])

    return {
        "success": True,
        "order": order,
        "payment": payment,
        "plan": plan
    }

@router.get("/customer/history")
async def get_customer_history(email: str):
    """Returns order history and active subscriptions for a customer's email."""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email address is required.")
    history = PaymentDB.get_customer_history(email)
    return {
        "success": True,
        "data": history
    }

@router.get("/invoice/{order_id}")
async def get_invoice_json(order_id: str):
    """Returns structured invoice details for an order."""
    try:
        data = PaymentService.generate_invoice_data(order_id)
        return {
            "success": True,
            "invoice": data
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/invoice/{order_id}/html", response_class=HTMLResponse)
async def get_invoice_html(order_id: str):
    """Returns print-ready styled HTML invoice."""
    try:
        html_content = PaymentService.generate_invoice_html(order_id)
        return HTMLResponse(content=html_content, status_code=200)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/webhook")
async def gateway_webhook(
    event_type: str = Header(None, alias="x-event-type"),
    signature: str = Header(None, alias="x-signature"),
    idempotency_key: str = Header(None, alias="x-idempotency-key"),
    payload: Dict[str, Any] = {}
):
    """
    Webhook endpoint for future automated UPI payment gateways (Razorpay, Cashfree, etc.).
    Verifies signature and processes idempotent updates.
    """
    # Verify signature if secret configured
    secret = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
    if secret and signature:
        if not WebhookService.verify_hmac_signature(str(payload).encode(), signature, secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    key = idempotency_key or f"evt-{payload.get('order_id', '')}-{payload.get('payment_id', '')}"
    success, message = WebhookService.process_gateway_webhook(
        event_type=event_type or payload.get("event", "payment.unknown"),
        payload=payload,
        idempotency_key=key
    )
    return {"success": success, "message": message}

# --- Razorpay Automatic Payment Gateway Endpoints ---

@router.get("/razorpay/config")
async def get_razorpay_public_config():
    """Returns public Razorpay configuration for checkout (Key ID, enabled status)."""
    return {
        "success": True,
        "config": RazorpayGatewayService.get_public_config()
    }

@router.post("/razorpay/create-order")
async def create_razorpay_order(req: CreateRazorpayOrderRequest):
    """Creates a Razorpay order linked to the checkout order ID."""
    order = PaymentDB.get_order(req.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    
    if order["status"] == "CONFIRMED":
        raise HTTPException(status_code=400, detail="Order is already confirmed.")

    try:
        rzp_order = RazorpayGatewayService.create_gateway_order(
            order_id=req.order_id,
            amount_inr=order["final_amount"]
        )
        return {
            "success": True,
            "order": rzp_order,
            "customer": {
                "name": order["customer_name"],
                "email": order["user_email"],
                "contact": order["customer_mobile"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay order: {str(e)}")

@router.post("/razorpay/verify")
async def verify_razorpay_payment(req: VerifyRazorpayPaymentRequest):
    """
    Verifies payment signature from Razorpay.
    Upon verification: Payment marked PAID, Order CONFIRMED, and Plan activated!
    """
    order = PaymentDB.get_order(req.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    is_valid = RazorpayGatewayService.verify_payment(
        order_id=req.order_id,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature. Verification failed.")

    # Confirm payment & activate customer subscription
    result = PaymentService.confirm_gateway_payment(
        order_id=req.order_id,
        gateway_payment_id=req.razorpay_payment_id,
        notes=f"Razorpay Gateway: {req.razorpay_order_id}"
    )

    return {
        "success": True,
        "message": "Payment verified successfully. Your plan is now ACTIVE!",
        "subscription": result.get("subscription")
    }


# --- Admin Protected Endpoints ---

@router.get("/admin/orders")
async def admin_get_orders(
    status: Optional[str] = "all",
    search: Optional[str] = "",
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    auth: bool = Depends(verify_admin_token)
):
    """Admin endpoint to list, filter, and search payments and orders."""
    res = PaymentDB.get_orders_admin(
        status_filter=status or "all",
        search=search or "",
        limit=min(limit or 50, 100),
        offset=offset or 0
    )
    metrics = PaymentDB.get_payment_metrics()
    return {
        "success": True,
        "data": res,
        "metrics": metrics
    }

@router.post("/admin/verify")
async def admin_verify_payment_action(
    req: AdminVerifyRequest,
    auth: bool = Depends(verify_admin_token)
):
    """
    Admin verifies manual payment:
    - Approve: Sets payment to PAID, order to CONFIRMED, activates customer plan.
    - Reject: Sets payment to FAILED, order to CANCELLED.
    """
    try:
        res = PaymentService.admin_verify_payment(
            payment_id=req.payment_id,
            action=req.action,
            admin_identity="Admin",
            notes=req.notes or ""
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Verification failed.")

@router.post("/admin/refund")
async def admin_refund_payment_action(
    req: AdminRefundRequest,
    auth: bool = Depends(verify_admin_token)
):
    """Admin refunds payment and revokes subscription."""
    try:
        res = PaymentService.admin_refund_payment(
            payment_id=req.payment_id,
            admin_identity="Admin",
            reason=req.reason or "Admin refund"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/admin/config")
async def admin_get_config(auth: bool = Depends(verify_admin_token)):
    """Admin gets full payment settings."""
    settings = PaymentDB.get_all_settings()
    upi_config = UPIPaymentService.get_upi_config()
    return {
        "success": True,
        "settings": settings,
        "upi_config": upi_config
    }

@router.post("/admin/config")
async def admin_update_config(
    req: AdminUpdateConfigRequest,
    auth: bool = Depends(verify_admin_token)
):
    """Admin updates UPI ID, Business Name, and Merchant Category."""
    clean_upi = req.upi_id.strip()
    if not clean_upi or "@" not in clean_upi:
        raise HTTPException(status_code=400, detail="Please enter a valid UPI ID (e.g. username@famapp or username@idbi).")

    clean_name = req.business_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Business Name is required.")

    PaymentDB.set_setting("upi_id", clean_upi, "Configured UPI VPA ID for payments")
    PaymentDB.set_setting("business_name", clean_name, "Business Name displayed in UPI app")
    if req.merchant_category:
        PaymentDB.set_setting("merchant_category", req.merchant_category.strip())

    return {
        "success": True,
        "message": "UPI payment configuration updated successfully.",
        "config": UPIPaymentService.get_upi_config()
    }

@router.post("/admin/upload-qr")
async def admin_upload_qr_code(
    file: UploadFile = File(...),
    auth: bool = Depends(verify_admin_token)
):
    """Admin uploads FamApp UPI QR code image."""
    try:
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
        
        saved_filename = UPIPaymentService.save_famapp_qr(content, file.filename or "famapp_qr.png")
        return {
            "success": True,
            "message": "FamApp UPI QR code uploaded successfully.",
            "filename": saved_filename,
            "config": UPIPaymentService.get_upi_config()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save uploaded QR code image.")

@router.get("/admin/qr-image")
async def get_uploaded_qr_image():
    """Serves the uploaded FamApp QR image with fallback."""
    qr_filename = PaymentDB.get_setting("famapp_qr_filename", "")
    if qr_filename:
        path = os.path.join(UPLOADS_DIR, qr_filename)
        if os.path.exists(path):
            media_type = "image/png" if qr_filename.endswith(".png") else "image/jpeg"
            return FileResponse(path, media_type=media_type)

    raise HTTPException(status_code=404, detail="No custom QR code image uploaded.")

@router.get("/admin/razorpay-config")
async def admin_get_razorpay_config(auth: bool = Depends(verify_admin_token)):
    """Admin retrieves Razorpay API keys and configuration."""
    creds = RazorpayGatewayService.get_credentials()
    return {
        "success": True,
        "config": creds
    }

@router.post("/admin/razorpay-config")
async def admin_update_razorpay_config(
    req: AdminUpdateRazorpayConfigRequest,
    auth: bool = Depends(verify_admin_token)
):
    """Admin updates Razorpay Key ID, Secret, and enabled toggle."""
    PaymentDB.set_setting("razorpay_key_id", req.key_id.strip(), "Razorpay Key ID")
    PaymentDB.set_setting("razorpay_key_secret", req.key_secret.strip(), "Razorpay Key Secret")
    if req.webhook_secret is not None:
        PaymentDB.set_setting("razorpay_webhook_secret", req.webhook_secret.strip(), "Razorpay Webhook Secret")
    PaymentDB.set_setting("razorpay_enabled", "1" if req.enabled else "0", "Razorpay Gateway Enabled Toggle")

    return {
        "success": True,
        "message": "Razorpay payment gateway configuration saved successfully.",
        "config": RazorpayGatewayService.get_credentials()
    }
