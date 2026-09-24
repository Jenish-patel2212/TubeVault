import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_subscription_buy_and_status():
    email = "customer123@example.com"
    # Buy plan
    res = client.post("/api/subscription/buy", json={
        "email": email,
        "plan_id": "pro",
        "billing_cycle": "yearly",
        "payment_method": "upi",
        "amount": 1188.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["subscription"]["email"] == email
    assert data["subscription"]["plan_id"] == "pro"
    assert data["subscription"]["is_active"] is True

    # Check status
    res2 = client.get(f"/api/subscription/status?email={email}")
    assert res2.status_code == 200
    status_data = res2.json()
    assert status_data["email"] == email
    assert status_data["is_active"] is True
    assert status_data["plan_id"] == "pro"

def test_admin_auth_and_management():
    # Auth
    auth_res = client.post("/api/admin/auth", json={"passcode": "admin123"})
    assert auth_res.status_code == 200
    token = auth_res.json().get("token")
    assert token is not None

    headers = {"x-admin-token": token}

    # Admin metrics
    met_res = client.get("/api/admin/metrics", headers=headers)
    assert met_res.status_code == 200
    assert "total_subscribers" in met_res.json()

    # Admin manual activate
    act_res = client.post("/api/admin/activate-by-email", json={
        "email": "granted_user@gmail.com",
        "plan_id": "vip",
        "duration_days": 548,
        "notes": "Testing admin manual grant"
    }, headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["success"] is True
    assert act_res.json()["subscription"]["plan_id"] == "vip"

    # Admin extend
    ext_res = client.post("/api/admin/extend", json={
        "email": "granted_user@gmail.com",
        "extra_days": 30
    }, headers=headers)
    assert ext_res.status_code == 200
    assert ext_res.json()["success"] is True

    # Admin revoke
    rev_res = client.post("/api/admin/revoke", json={
        "email": "granted_user@gmail.com",
        "reason": "Test revoke"
    }, headers=headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["success"] is True
