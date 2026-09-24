import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.services.payment_db import PaymentDB, init_payment_db
from app.services.payment_service import PaymentService

client = TestClient(app)
ADMIN_TOKEN = f"token-{os.getenv('ADMIN_SECRET_KEY', 'admin123')}"

@pytest.fixture(autouse=True)
def setup_db():
    init_payment_db()

def test_get_payment_config():
    response = client.get("/api/payments/config")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "upi_id" in data["config"]
    assert "business_name" in data["config"]

def test_coupon_validation():
    # Valid coupon
    res = client.post("/api/payments/coupon/validate", json={"code": "WELCOME20", "order_amount": 499.0})
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["discount_amount"] > 0
    assert data["final_amount"] < 499.0

    # Invalid coupon
    res_inv = client.post("/api/payments/coupon/validate", json={"code": "NONEXISTENT", "order_amount": 100.0})
    assert res_inv.status_code == 200
    assert res_inv.json()["valid"] is False

def test_full_payment_verification_lifecycle():
    # 1. Create order
    order_payload = {
        "customer_name": "Rohan Sharma",
        "customer_email": "rohan.test@example.com",
        "customer_mobile": "+919876543210",
        "plan_id": "pro",
        "billing_cycle": "yearly",
        "coupon_code": "WELCOME20"
    }
    create_res = client.post("/api/payments/order/create", json=order_payload)
    assert create_res.status_code == 200
    order_data = create_res.json()["data"]
    order_id = order_data["order"]["id"]
    assert order_id.startswith("ORD-")
    assert "upi_uri" in order_data["payment_details"]
    assert "upi://pay?" in order_data["payment_details"]["upi_uri"]
    assert order_data["order"]["status"] == "PENDING"

    # 2. Submit manual payment with valid 12-digit UTR
    import random
    valid_utr = f"{random.randint(100000000000, 999999999999)}"
    manual_payload = {
        "order_id": order_id,
        "utr": valid_utr,
        "payment_date": "2026-09-20",
        "amount": order_data["order"]["final_amount"],
        "customer_name": "Rohan Sharma",
        "customer_email": "rohan.test@example.com",
        "customer_mobile": "+919876543210"
    }
    submit_res = client.post("/api/payments/manual/submit-utr", json=manual_payload)
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["success"] is True
    payment_id = submit_data["payment"]["id"]
    assert submit_data["payment"]["status"] == "PENDING"
    assert submit_data["payment"]["utr"] == valid_utr

    # Check status endpoint - must NOT be active before admin approval
    order_status_res = client.get(f"/api/payments/order/{order_id}")
    assert order_status_res.status_code == 200
    assert order_status_res.json()["payment"]["status"] == "PENDING"
    assert order_status_res.json()["order"]["status"] == "PENDING"

    # 3. Test duplicate UTR rejection
    dup_payload = {
        "order_id": order_id,
        "utr": valid_utr,
        "amount": 100.0
    }
    dup_res = client.post("/api/payments/manual/submit-utr", json=dup_payload)
    assert dup_res.status_code == 400
    assert "already been submitted" in dup_res.json()["detail"]

    # 4. Admin approves payment
    verify_payload = {
        "payment_id": payment_id,
        "action": "approve",
        "notes": "Verified against bank statement"
    }
    admin_verify_res = client.post(
        "/api/payments/admin/verify",
        json=verify_payload,
        headers={"x-admin-token": ADMIN_TOKEN}
    )
    assert admin_verify_res.status_code == 200
    assert admin_verify_res.json()["payment_status"] == "PAID"
    assert admin_verify_res.json()["order_status"] == "CONFIRMED"

    # 5. Verify customer subscription is now ACTIVE
    sub_res = client.get("/api/subscription/status?email=rohan.test@example.com")
    assert sub_res.status_code == 200
    assert sub_res.json()["is_active"] is True
    assert sub_res.json()["plan_id"] == "pro"

    # 6. Verify invoice generation
    inv_res = client.get(f"/api/payments/invoice/{order_id}")
    assert inv_res.status_code == 200
    inv_data = inv_res.json()["invoice"]
    assert inv_data["customer_name"] == "Rohan Sharma"
    assert inv_data["payment_status"] == "PAID"
    assert inv_data["utr"] == valid_utr

    # HTML invoice
    inv_html_res = client.get(f"/api/payments/invoice/{order_id}/html")
    assert inv_html_res.status_code == 200
    assert "Official Payment Receipt" in inv_html_res.text

def test_invalid_utr_validation():
    # Attempt with invalid UTR format (e.g. 5 digits)
    order = PaymentService.create_order(
        customer_name="Test User",
        customer_email="test.user@example.com",
        customer_mobile="9988776655",
        plan_id="starter"
    )
    order_id = order["order"]["id"]

    res = client.post("/api/payments/manual/submit-utr", json={
        "order_id": order_id,
        "utr": "1234" # Invalid short UTR
    })
    assert res.status_code == 400
    assert "Invalid UTR" in res.json()["detail"]

def test_admin_config_update():
    update_res = client.post(
        "/api/payments/admin/config",
        json={
            "upi_id": "merchant@famapp",
            "business_name": "TubeVault Ultra"
        },
        headers={"x-admin-token": ADMIN_TOKEN}
    )
    assert update_res.status_code == 200
    assert update_res.json()["config"]["upi_id"] == "merchant@famapp"
    assert update_res.json()["config"]["business_name"] == "TubeVault Ultra"

def test_razorpay_public_and_admin_config():
    # 1. Public config check
    res = client.get("/api/payments/razorpay/config")
    assert res.status_code == 200
    assert "key_id" in res.json()["config"]

    # 2. Admin get config
    res_admin = client.get("/api/payments/admin/razorpay-config", headers={"x-admin-token": ADMIN_TOKEN})
    assert res_admin.status_code == 200
    assert "key_id" in res_admin.json()["config"]

    # 3. Admin update config
    res_update = client.post(
        "/api/payments/admin/razorpay-config",
        json={
            "key_id": "rzp_test_sample123",
            "key_secret": "sample_secret_key",
            "webhook_secret": "whsec_sample",
            "enabled": True
        },
        headers={"x-admin-token": ADMIN_TOKEN}
    )
    assert res_update.status_code == 200
    assert res_update.json()["config"]["key_id"] == "rzp_test_sample123"

def test_razorpay_automated_order_and_verification():
    # 1. Create order
    order = PaymentService.create_order(
        customer_name="Gateway Buyer",
        customer_email="gateway.buyer@example.com",
        customer_mobile="+919999988888",
        plan_id="starter"
    )
    order_id = order["order"]["id"]

    # 2. Create Razorpay order
    rzp_res = client.post("/api/payments/razorpay/create-order", json={"order_id": order_id})
    assert rzp_res.status_code == 200
    rzp_data = rzp_res.json()
    assert "razorpay_order_id" in rzp_data["order"]

    # 3. Verify Razorpay payment
    import hmac, hashlib
    sim_rzp_order_id = rzp_data["order"]["razorpay_order_id"]
    sim_payment_id = "pay_sim_9988776655"
    key_secret = "sample_secret_key"
    signature = hmac.new(
        key_secret.encode("utf-8"),
        f"{sim_rzp_order_id}|{sim_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    verify_res = client.post("/api/payments/razorpay/verify", json={
        "order_id": order_id,
        "razorpay_order_id": sim_rzp_order_id,
        "razorpay_payment_id": sim_payment_id,
        "razorpay_signature": signature
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # 4. Verify subscription is now active
    sub_res = client.get("/api/subscription/status?email=gateway.buyer@example.com")
    assert sub_res.status_code == 200
    assert sub_res.json()["is_active"] is True

