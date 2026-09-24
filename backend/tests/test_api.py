import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "TubeVault Backend"}

def test_analyze_invalid_url():
    response = client.post("/api/analyze", json={"url": "https://invalid-domain.com/video"})
    assert response.status_code == 400
    assert "detail" in response.json()

def test_analyze_malicious_scheme():
    response = client.post("/api/analyze", json={"url": "file:///etc/passwd"})
    assert response.status_code == 400

def test_get_nonexistent_job():
    response = client.get("/api/download/non-existent-uuid-123")
    assert response.status_code == 404

def test_search_empty_query():
    response = client.post("/api/search", json={"query": "   "})
    assert response.status_code == 400

