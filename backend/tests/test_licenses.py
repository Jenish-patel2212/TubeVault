import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.services.payment_db import PaymentDB, init_payment_db

client = TestClient(app)
ADMIN_TOKEN = f"token-{os.getenv('ADMIN_SECRET_KEY', 'admin123')}"

@pytest.fixture(autouse=True)
def setup_db():
    init_payment_db()

def test_license_creation_and_verification():
    # 1. Create a license directly via DB
    lic = PaymentDB.create_license(
        user_email="test.license@example.com",
        customer_name="Alice Explorer",
        plan_id="pro",
        duration_days=30
    )
    key = lic["license_key"]
    assert key.startswith("TVLT-PRO-")

    # 2. Verify license key via API
    res = client.post("/api/license/verify", json={"license_key": key})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["valid"] is True
    assert data["license"]["user_email"] == "test.license@example.com"

    # 3. Verify license by email lookup
    res_email = client.post("/api/license/verify", json={"license_key": "test.license@example.com"})
    assert res_email.status_code == 200
    assert res_email.json()["valid"] is True

    # 4. Verify invalid key
    res_invalid = client.post("/api/license/verify", json={"license_key": "TVLT-FAKE-0000-0000"})
    assert res_invalid.status_code == 200
    assert res_invalid.json()["valid"] is False

def test_license_certificate_generation():
    lic = PaymentDB.create_license(
        user_email="cert.user@example.com",
        customer_name="Bob Creator",
        plan_id="vip",
        duration_days=548
    )
    key = lic["license_key"]

    cert_res = client.post("/api/license/certificate", json={
        "license_key": key,
        "media_title": "Creative Nature 4K",
        "media_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "format_label": "Video 1080p MP4"
    })
    assert cert_res.status_code == 200
    cert_data = cert_res.json()["data"]
    assert "TUBEVAULT OFFICIAL MEDIA LICENSE CERTIFICATE" in cert_data["certificate_text"]
    assert "Creative Nature 4K" in cert_data["certificate_text"]
    assert key in cert_data["certificate_text"]
    assert cert_data["filename"].endswith(".txt")

    # File download endpoint
    file_res = client.get(f"/api/license/certificate/file?license_key={key}&title=CreativeNature")
    assert file_res.status_code == 200
    assert "attachment;" in file_res.headers.get("content-disposition", "")
    assert "TUBEVAULT" in file_res.text

def test_admin_license_management():
    # Admin create license
    create_res = client.post(
        "/api/license/admin/create",
        json={
            "user_email": "admin.assigned@example.com",
            "customer_name": "Charlie Pro",
            "plan_id": "pro",
            "duration_days": 90,
            "custom_key": "TVLT-PRO-CHAR-9999"
        },
        headers={"x-admin-token": ADMIN_TOKEN}
    )
    assert create_res.status_code == 200
    assert create_res.json()["license"]["license_key"] == "TVLT-PRO-CHAR-9999"

    # Admin list licenses
    list_res = client.get("/api/license/admin/list?search=CHAR-9999", headers={"x-admin-token": ADMIN_TOKEN})
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # Admin revoke license
    revoke_res = client.post(
        "/api/license/admin/revoke",
        json={"license_key": "TVLT-PRO-CHAR-9999", "reason": "Test revocation"},
        headers={"x-admin-token": ADMIN_TOKEN}
    )
    assert revoke_res.status_code == 200

    # Verification should now fail because revoked
    verify_res = client.post("/api/license/verify", json={"license_key": "TVLT-PRO-CHAR-9999"})
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is False
    assert "REVOKED" in verify_res.json()["reason"].upper()
