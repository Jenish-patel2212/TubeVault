import os
import sqlite3
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Database directory in backend/data
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "tubevault.db")

# Default Master Owner PIN for Jenish Patel
DEFAULT_MASTER_PIN = "2022"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_access_db():
    """Initializes the access_requests and access_settings tables."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS access_requests (
                device_id TEXT PRIMARY KEY,
                visitor_name TEXT NOT NULL,
                device_info TEXT DEFAULT '',
                ip_address TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REVOKED
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS access_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        # Insert default master pin if not present
        cursor.execute("SELECT value FROM access_settings WHERE key = 'master_pin'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO access_settings (key, value) VALUES ('master_pin', ?)", (DEFAULT_MASTER_PIN,))
        conn.commit()

# Initialize immediately
init_access_db()

class AccessService:
    @staticmethod
    def get_master_pin() -> str:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM access_settings WHERE key = 'master_pin'")
            row = cursor.fetchone()
            return row["value"] if row else DEFAULT_MASTER_PIN

    @staticmethod
    def set_master_pin(new_pin: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO access_settings (key, value) VALUES ('master_pin', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (new_pin.strip(),))
            conn.commit()
            return True

    @staticmethod
    def verify_master_pin(pin: str) -> bool:
        current_pin = AccessService.get_master_pin()
        return pin.strip() == current_pin

    @staticmethod
    def request_access(device_id: str, visitor_name: str, device_info: str = "", ip_address: str = "") -> Dict[str, Any]:
        now_str = datetime.now(timezone.utc).isoformat()
        clean_name = visitor_name.strip() or "Guest User"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM access_requests WHERE device_id = ?", (device_id,))
            existing = cursor.fetchone()

            if existing:
                # If already approved, keep approved status
                if existing["status"] == "APPROVED":
                    return dict(existing)
                
                # Update with new request
                cursor.execute("""
                    UPDATE access_requests
                    SET visitor_name = ?, device_info = ?, ip_address = ?, status = 'PENDING', updated_at = ?
                    WHERE device_id = ?
                """, (clean_name, device_info, ip_address, now_str, device_id))
            else:
                cursor.execute("""
                    INSERT INTO access_requests (device_id, visitor_name, device_info, ip_address, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
                """, (device_id, clean_name, device_info, ip_address, now_str, now_str))
            conn.commit()

            cursor.execute("SELECT * FROM access_requests WHERE device_id = ?", (device_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def get_status(device_id: str) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM access_requests WHERE device_id = ?", (device_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return {"device_id": device_id, "status": "UNKNOWN"}

    @staticmethod
    def list_requests() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM access_requests ORDER BY updated_at DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def approve_device(device_id: str) -> bool:
        now_str = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE access_requests
                SET status = 'APPROVED', updated_at = ?
                WHERE device_id = ?
            """, (now_str, device_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def reject_device(device_id: str) -> bool:
        now_str = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE access_requests
                SET status = 'REJECTED', updated_at = ?
                WHERE device_id = ?
            """, (now_str, device_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def revoke_device(device_id: str) -> bool:
        now_str = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE access_requests
                SET status = 'REVOKED', updated_at = ?
                WHERE device_id = ?
            """, (now_str, device_id))
            conn.commit()
            return cursor.rowcount > 0
