import os
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.config import settings

# Database location in backend/data
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "tubevault.db")

PLAN_NAMES = {
    "starter": "Starter Pass",
    "pro": "Pro Pass",
    "vip": "1.5 Years VIP Pass",
    "lifetime": "Lifetime VIP Pass"
}

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite tables for subscribers and audit logs."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE COLLATE NOCASE NOT NULL,
                plan_id TEXT NOT NULL,
                plan_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                amount_paid REAL DEFAULT 0.0,
                payment_method TEXT DEFAULT 'upi',
                payment_ref TEXT DEFAULT '',
                is_admin_grant INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()

# Run init immediately on import
init_db()

class SubscriptionDB:
    @staticmethod
    def activate_subscription(
        email: str,
        plan_id: str,
        duration_days: int = 30,
        amount_paid: float = 0.0,
        payment_method: str = "card",
        payment_ref: str = "",
        is_admin_grant: bool = False,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Activates or upgrades a customer's premium subscription by email.
        If customer already has an active subscription, validity is extended.
        """
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise ValueError("A valid email address is required.")

        clean_plan = plan_id.lower().strip()
        plan_name = PLAN_NAMES.get(clean_plan, clean_plan.capitalize() + " Pass")

        now = datetime.utcnow()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscribers WHERE email = ?", (clean_email,))
            existing = cursor.fetchone()

            # Compute expiration
            if existing and existing["status"] == "active":
                try:
                    current_exp = datetime.fromisoformat(existing["expires_at"])
                    base_date = max(now, current_exp)
                except Exception:
                    base_date = now
            else:
                base_date = now

            if duration_days <= 0 or duration_days > 36500: # Lifetime
                expires_at = base_date + timedelta(days=36500) # 100 years
            else:
                expires_at = base_date + timedelta(days=duration_days)

            now_str = now.isoformat()
            exp_str = expires_at.isoformat()

            if existing:
                cursor.execute("""
                    UPDATE subscribers
                    SET plan_id = ?, plan_name = ?, status = 'active',
                        amount_paid = amount_paid + ?, payment_method = ?,
                        payment_ref = ?, is_admin_grant = ?, notes = ?,
                        expires_at = ?
                    WHERE email = ?
                """, (
                    clean_plan, plan_name, amount_paid, payment_method,
                    payment_ref, 1 if is_admin_grant else 0, notes,
                    exp_str, clean_email
                ))
            else:
                cursor.execute("""
                    INSERT INTO subscribers (
                        email, plan_id, plan_name, status, amount_paid,
                        payment_method, payment_ref, is_admin_grant, notes,
                        created_at, expires_at
                    ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
                """, (
                    clean_email, clean_plan, plan_name, amount_paid,
                    payment_method, payment_ref, 1 if is_admin_grant else 0,
                    notes, now_str, exp_str
                ))

            # Audit log
            grant_type = "Admin Manual Activation" if is_admin_grant else "Customer Purchase"
            details = f"{grant_type} for plan '{plan_name}' ({duration_days} days). Ref: {payment_ref}"
            cursor.execute("""
                INSERT INTO audit_logs (email, action, details, created_at)
                VALUES (?, 'activate', ?, ?)
            """, (clean_email, details, now_str))

            conn.commit()

        return SubscriptionDB.get_subscription(clean_email)

    @staticmethod
    def get_subscription(email: str) -> Dict[str, Any]:
        """Returns the customer's subscription details and active state."""
        clean_email = email.strip().lower()
        now = datetime.utcnow()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscribers WHERE email = ?", (clean_email,))
            row = cursor.fetchone()

            if not row:
                return {
                    "email": clean_email,
                    "is_active": False,
                    "plan_id": "free",
                    "plan_name": "Free Tier",
                    "status": "none",
                    "expires_at": None,
                    "days_remaining": 0,
                    "features": ["720p HD Downloads", "Standard Speed", "Single Download Queue"]
                }

            sub = dict(row)
            expires_at = datetime.fromisoformat(sub["expires_at"])
            is_expired = expires_at < now
            days_remaining = max(0, (expires_at - now).days)

            is_active = (sub["status"] == "active") and not is_expired

            if is_expired and sub["status"] == "active":
                # Auto-update status to expired
                cursor.execute("UPDATE subscribers SET status = 'expired' WHERE email = ?", (clean_email,))
                conn.commit()
                sub["status"] = "expired"

            return {
                "email": clean_email,
                "is_active": is_active,
                "plan_id": sub["plan_id"] if is_active else "free",
                "plan_name": sub["plan_name"] if is_active else "Free Tier",
                "status": sub["status"],
                "created_at": sub["created_at"],
                "expires_at": sub["expires_at"],
                "days_remaining": days_remaining if is_active else 0,
                "is_admin_grant": bool(sub["is_admin_grant"]),
                "amount_paid": sub["amount_paid"],
                "features": [
                    "4K & 1080p Ultra HD Downloads",
                    "320kbps Studio Audio Conversion",
                    "Uncapped 100+ MB/s Turbo Speed",
                    "Multi-Platform Support (YouTube & Instagram)"
                ] if is_active else ["720p HD Downloads", "Standard Speed", "Single Download Queue"]
            }

    @staticmethod
    def revoke_subscription(email: str, reason: str = "Admin cancelled") -> bool:
        clean_email = email.strip().lower()
        now_str = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE subscribers SET status = 'revoked', notes = ? WHERE email = ?", (reason, clean_email))
            if cursor.rowcount > 0:
                cursor.execute("""
                    INSERT INTO audit_logs (email, action, details, created_at)
                    VALUES (?, 'revoke', ?, ?)
                """, (clean_email, f"Plan revoked. Reason: {reason}", now_str))
                conn.commit()
                return True
            return False

    @staticmethod
    def extend_subscription(email: str, extra_days: int = 30) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        now = datetime.utcnow()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscribers WHERE email = ?", (clean_email,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Subscriber not found.")

            try:
                current_exp = datetime.fromisoformat(row["expires_at"])
                base_date = max(now, current_exp)
            except Exception:
                base_date = now

            new_exp = (base_date + timedelta(days=extra_days)).isoformat()
            cursor.execute("""
                UPDATE subscribers
                SET expires_at = ?, status = 'active'
                WHERE email = ?
            """, (new_exp, clean_email))

            cursor.execute("""
                INSERT INTO audit_logs (email, action, details, created_at)
                VALUES (?, 'extend', ?, ?)
            """, (clean_email, f"Extended validity by {extra_days} days", now.isoformat()))
            conn.commit()

        return SubscriptionDB.get_subscription(clean_email)

    @staticmethod
    def get_all_subscribers(query: str = "", status_filter: str = "", limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Retrieves paginated list of subscribers for Admin Dashboard."""
        now = datetime.utcnow()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            sql = "SELECT * FROM subscribers WHERE 1=1"
            params: List[Any] = []

            if query:
                sql += " AND (email LIKE ? OR plan_name LIKE ? OR notes LIKE ?)"
                q = f"%{query.strip()}%"
                params.extend([q, q, q])

            if status_filter and status_filter != "all":
                sql += " AND status = ?"
                params.append(status_filter)

            sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            # Count total
            count_sql = "SELECT COUNT(*) FROM subscribers WHERE 1=1"
            count_params: List[Any] = []
            if query:
                count_sql += " AND (email LIKE ? OR plan_name LIKE ? OR notes LIKE ?)"
                count_params.extend([q, q, q])
            if status_filter and status_filter != "all":
                count_sql += " AND status = ?"
                count_params.append(status_filter)

            cursor.execute(count_sql, count_params)
            total_count = cursor.fetchone()[0]

            subscribers = []
            for r in rows:
                item = dict(r)
                try:
                    exp = datetime.fromisoformat(item["expires_at"])
                    item["is_expired"] = exp < now
                    item["days_remaining"] = max(0, (exp - now).days)
                except Exception:
                    item["is_expired"] = False
                    item["days_remaining"] = 0
                subscribers.append(item)

            return {
                "total": total_count,
                "subscribers": subscribers,
                "limit": limit,
                "offset": offset
            }

    @staticmethod
    def get_admin_metrics() -> Dict[str, Any]:
        """Returns aggregated metrics for the Admin Dashboard."""
        now = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM subscribers")
            total_subscribers = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM subscribers WHERE status = 'active' AND expires_at > ?", (now,))
            active_subscribers = cursor.fetchone()[0]

            cursor.execute("SELECT SUM(amount_paid) FROM subscribers")
            total_revenue = cursor.fetchone()[0] or 0.0

            cursor.execute("SELECT plan_id, COUNT(*) as count FROM subscribers WHERE status = 'active' GROUP BY plan_id")
            plan_counts = {r["plan_id"]: r["count"] for r in cursor.fetchall()}

            cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15")
            recent_logs = [dict(r) for r in cursor.fetchall()]

            return {
                "total_subscribers": total_subscribers,
                "active_subscribers": active_subscribers,
                "total_revenue": round(total_revenue, 2),
                "plan_distribution": plan_counts,
                "recent_logs": recent_logs
            }
