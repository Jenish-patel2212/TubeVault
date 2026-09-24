import os
import sqlite3
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

# Database directory in backend/data
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "tubevault.db")

# Uploads directory for FamApp QR code images
UPLOADS_DIR = os.path.join(DB_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_payment_db():
    """Initializes SQLite tables for orders, payments, subscriptions, settings, and coupons."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Plans Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                badge TEXT DEFAULT '',
                description TEXT NOT NULL,
                monthly_price REAL NOT NULL,
                yearly_price REAL NOT NULL,
                fixed_price REAL DEFAULT 0.0,
                duration_days INTEGER NOT NULL,
                features TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)

        # 2. Orders Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_email TEXT NOT NULL COLLATE NOCASE,
                customer_name TEXT NOT NULL,
                customer_mobile TEXT NOT NULL,
                plan_id TEXT NOT NULL,
                billing_cycle TEXT NOT NULL,
                original_amount REAL NOT NULL,
                discount_amount REAL DEFAULT 0.0,
                final_amount REAL NOT NULL,
                currency TEXT DEFAULT 'INR',
                coupon_code TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED, REFUNDED
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(user_email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);")

        # 3. Payments Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                payment_method TEXT NOT NULL, -- upi_qr, upi_id, gateway
                payment_gateway TEXT NOT NULL, -- famapp_manual, razorpay, cashfree, simulated
                gateway_order_id TEXT DEFAULT '',
                gateway_payment_id TEXT DEFAULT '',
                utr TEXT DEFAULT '',
                amount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, FAILED, CANCELLED, REFUNDED
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL COLLATE NOCASE,
                customer_mobile TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                verified_by TEXT DEFAULT '',
                verified_at TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments(utr);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);")

        # 4. Payment Events / Audit Log (with idempotency)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id TEXT DEFAULT '',
                order_id TEXT DEFAULT '',
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                idempotency_key TEXT UNIQUE,
                created_at TEXT NOT NULL
            )
        """)

        # 5. Subscriptions Table (Linked to orders)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL COLLATE NOCASE,
                plan_id TEXT NOT NULL,
                order_id TEXT DEFAULT '',
                payment_id TEXT DEFAULT '',
                start_date TEXT NOT NULL,
                expiry_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked
                updated_at TEXT NOT NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_subs_user_email ON subscriptions(user_email);")

        # 6. Payment Settings (Key-Value)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT DEFAULT ''
            )
        """)

        # 7. Coupons Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coupons (
                code TEXT PRIMARY KEY COLLATE NOCASE,
                discount_type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'flat'
                discount_value REAL NOT NULL,
                min_order_amount REAL DEFAULT 0.0,
                max_discount REAL DEFAULT 9999.0,
                is_active INTEGER DEFAULT 1,
                uses_count INTEGER DEFAULT 0
            )
        """)

        # 8. Licenses Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS licenses (
                license_key TEXT PRIMARY KEY COLLATE NOCASE,
                user_email TEXT NOT NULL COLLATE NOCASE,
                customer_name TEXT NOT NULL,
                plan_id TEXT NOT NULL,
                order_id TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, REVOKED
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                download_count INTEGER DEFAULT 0,
                notes TEXT DEFAULT ''
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(user_email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);")

        conn.commit()

        # Seed initial default data
        _seed_default_data(cursor)
        conn.commit()

def _seed_default_data(cursor: sqlite3.Cursor):
    # Default payment settings
    default_settings = [
        ("upi_id", "famapp@idbi", "Configured UPI VPA ID for payments"),
        ("business_name", "TubeVault Media", "Business Name displayed in UPI app"),
        ("merchant_category", "5734", "Merchant Category Code"),
        ("famapp_qr_filename", "", "Uploaded FamApp QR image filename"),
        ("gateway_mode", "manual_upi", "Payment Gateway Mode (manual_upi or live_gateway)")
    ]
    for k, v, desc in default_settings:
        cursor.execute("INSERT OR IGNORE INTO payment_settings (key, value, description) VALUES (?, ?, ?)", (k, v, desc))

    # Default plans
    default_plans = [
        (
            "starter", "Starter Pass", "",
            "Full 1080p HD downloads, 192kbps audio, and accelerated speeds.",
            99.0, 69.0, 0.0, 30,
            json.dumps(["Up to 1080p Full HD Resolution", "192 kbps Enhanced MP3 Audio", "Accelerated Download Speed (25 MB/s)", "Single Video URL Processing", "Mobile & Desktop Access"])
        ),
        (
            "pro", "Pro Pass", "MOST POPULAR",
            "Uncapped turbo speed, 4K 60FPS video, studio audio, and batch queue conversion.",
            150.0, 99.0, 0.0, 30,
            json.dumps(["4K & 2K Ultra HD (60 FPS & HDR)", "320 kbps Studio Quality Audio", "⚡ Uncapped Turbo Speed (100+ MB/s)", "Batch & Playlist Processing", "5 Simultaneous Concurrent Downloads", "100% Ad-Free Clean Interface"])
        ),
        (
            "1.5years", "1.5 Years VIP Pass", "MEGA VALUE • 18 MONTHS",
            "18 full months of uncapped downloads, 4K 60FPS video, and VIP bandwidth for just ₹499.",
            0.0, 0.0, 499.0, 548,
            json.dumps(["18 Months (1.5 Years) Unlimited Access", "Only ~₹27 / Month (82% Savings)", "4K & 2K Ultra HD (60 FPS & HDR)", "320 kbps Studio Quality Audio", "⚡ Dedicated VIP Bandwidth Servers", "Unlimited Concurrent Queue Downloads"])
        ),
        (
            "lifetime", "Lifetime VIP Pass", "ULTIMATE LIFETIME",
            "Lifetime unrestricted access to TubeVault premium engine forever.",
            0.0, 0.0, 999.0, 36500,
            json.dumps(["Lifetime Unlimited Access (Forever)", "4K & 8K Ultra HD Support", "320 kbps Studio Audio", "Priority Queue & Cloud Storage Export", "Direct VIP WhatsApp & Email Support"])
        )
    ]
    for plan in default_plans:
        cursor.execute("""
            INSERT OR IGNORE INTO plans (
                id, name, badge, description, monthly_price, yearly_price,
                fixed_price, duration_days, features
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, plan)

    # Default Coupons
    default_coupons = [
        ("WELCOME20", "percent", 20.0, 50.0, 200.0, 1),
        ("TUBE50", "flat", 50.0, 150.0, 50.0, 1),
        ("SUPER10", "percent", 10.0, 0.0, 100.0, 1),
        ("SPECIAL100", "flat", 100.0, 400.0, 100.0, 1),
    ]
    for c in default_coupons:
        cursor.execute("""
            INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """, c)

# Initialize schema upon module import
init_payment_db()

class PaymentDB:
    @staticmethod
    def get_setting(key: str, default: str = "") -> str:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM payment_settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    @staticmethod
    def set_setting(key: str, value: str, description: str = ""):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO payment_settings (key, value, description)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (key, value, description))
            conn.commit()

    @staticmethod
    def get_all_settings() -> Dict[str, str]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM payment_settings")
            return {r["key"]: r["value"] for r in cursor.fetchall()}

    @staticmethod
    def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM plans WHERE id = ? AND is_active = 1", (plan_id.lower(),))
            row = cursor.fetchone()
            if not row:
                return None
            plan = dict(row)
            plan["features"] = json.loads(plan["features"])
            return plan

    @staticmethod
    def get_all_plans() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM plans WHERE is_active = 1")
            results = []
            for r in cursor.fetchall():
                p = dict(r)
                p["features"] = json.loads(p["features"])
                results.append(p)
            return results

    @staticmethod
    def get_coupon(code: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (code.strip().upper(),))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def increment_coupon_usage(code: str):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE coupons SET uses_count = uses_count + 1 WHERE code = ?", (code.strip().upper(),))
            conn.commit()

    @staticmethod
    def create_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO orders (
                    id, user_email, customer_name, customer_mobile, plan_id,
                    billing_cycle, original_amount, discount_amount, final_amount,
                    currency, coupon_code, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_data["id"],
                order_data["user_email"].strip().lower(),
                order_data["customer_name"].strip(),
                order_data["customer_mobile"].strip(),
                order_data["plan_id"],
                order_data["billing_cycle"],
                order_data["original_amount"],
                order_data.get("discount_amount", 0.0),
                order_data["final_amount"],
                order_data.get("currency", "INR"),
                order_data.get("coupon_code", ""),
                order_data.get("status", "PENDING"),
                order_data["created_at"],
                order_data["updated_at"]
            ))
            conn.commit()
        return PaymentDB.get_order(order_data["id"])

    @staticmethod
    def get_order(order_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def update_order_status(order_id: str, status: str) -> bool:
        now_str = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE orders SET status = ?, updated_at = ? WHERE id = ?
            """, (status, now_str, order_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def create_payment(payment_data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO payments (
                    id, order_id, payment_method, payment_gateway, gateway_order_id,
                    gateway_payment_id, utr, amount, status, customer_name,
                    customer_email, customer_mobile, payment_date, notes,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_data["id"],
                payment_data["order_id"],
                payment_data["payment_method"],
                payment_data["payment_gateway"],
                payment_data.get("gateway_order_id", ""),
                payment_data.get("gateway_payment_id", ""),
                payment_data.get("utr", ""),
                payment_data["amount"],
                payment_data.get("status", "PENDING"),
                payment_data["customer_name"],
                payment_data["customer_email"].strip().lower(),
                payment_data["customer_mobile"],
                payment_data["payment_date"],
                payment_data.get("notes", ""),
                payment_data["created_at"],
                payment_data["updated_at"]
            ))
            conn.commit()
        return PaymentDB.get_payment(payment_data["id"])

    @staticmethod
    def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_payment_by_order(order_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1", (order_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def find_payment_by_utr(utr: str) -> Optional[Dict[str, Any]]:
        clean_utr = utr.strip()
        if not clean_utr:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM payments WHERE utr = ? AND status IN ('PAID', 'PENDING')", (clean_utr,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def update_payment_verification(
        payment_id: str,
        status: str,
        verified_by: str,
        notes: str = ""
    ) -> bool:
        now_str = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE payments
                SET status = ?, verified_by = ?, verified_at = ?, notes = ?, updated_at = ?
                WHERE id = ?
            """, (status, verified_by, now_str, notes, now_str, payment_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def log_payment_event(
        payment_id: str,
        order_id: str,
        event_type: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> bool:
        now_str = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO payment_events (
                        payment_id, order_id, event_type, payload, idempotency_key, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (payment_id, order_id, event_type, json.dumps(payload), idempotency_key, now_str))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                # Idempotency duplicate event
                return False

    @staticmethod
    def record_subscription(
        email: str,
        plan_id: str,
        order_id: str,
        payment_id: str,
        duration_days: int
    ) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        now = datetime.utcnow()
        if duration_days <= 0 or duration_days > 36500:
            expiry = now + timedelta(days=36500)
        else:
            expiry = now + timedelta(days=duration_days)

        start_str = now.isoformat()
        exp_str = expiry.isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Deactivate previous active subscriptions for this email
            cursor.execute("""
                UPDATE subscriptions SET status = 'replaced', updated_at = ?
                WHERE user_email = ? AND status = 'active'
            """, (start_str, clean_email))

            cursor.execute("""
                INSERT INTO subscriptions (
                    user_email, plan_id, order_id, payment_id, start_date, expiry_date, status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
            """, (clean_email, plan_id, order_id, payment_id, start_str, exp_str, start_str))
            conn.commit()

        # Also sync to existing `subscribers` table for backwards compatibility with downloader checks
        from app.services.subscription_db import SubscriptionDB
        SubscriptionDB.activate_subscription(
            email=clean_email,
            plan_id=plan_id,
            duration_days=duration_days,
            payment_method="upi",
            payment_ref=payment_id,
            is_admin_grant=False,
            notes=f"Order {order_id}"
        )

        return {
            "user_email": clean_email,
            "plan_id": plan_id,
            "order_id": order_id,
            "payment_id": payment_id,
            "start_date": start_str,
            "expiry_date": exp_str,
            "status": "active"
        }

    @staticmethod
    def get_orders_admin(
        status_filter: str = "all",
        search: str = "",
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            sql = """
                SELECT 
                    o.id as order_id,
                    o.user_email,
                    o.customer_name,
                    o.customer_mobile,
                    o.plan_id,
                    o.billing_cycle,
                    o.original_amount,
                    o.discount_amount,
                    o.final_amount,
                    o.currency,
                    o.coupon_code,
                    o.status as order_status,
                    o.created_at as order_date,
                    p.id as payment_id,
                    p.payment_method,
                    p.payment_gateway,
                    p.utr,
                    p.status as payment_status,
                    p.payment_date,
                    p.verified_by,
                    p.verified_at,
                    p.notes
                FROM orders o
                LEFT JOIN payments p ON o.id = p.order_id
                WHERE 1=1
            """
            params: List[Any] = []

            if status_filter and status_filter.lower() != "all":
                sql += " AND (p.status = ? OR (p.status IS NULL AND o.status = ?))"
                params.extend([status_filter.upper(), status_filter.upper()])

            if search:
                sql += " AND (o.id LIKE ? OR o.user_email LIKE ? OR o.customer_name LIKE ? OR o.customer_mobile LIKE ? OR p.utr LIKE ?)"
                q = f"%{search.strip()}%"
                params.extend([q, q, q, q, q])

            sql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(sql, params)
            rows = [dict(r) for r in cursor.fetchall()]

            # Count total
            count_sql = """
                SELECT COUNT(DISTINCT o.id)
                FROM orders o
                LEFT JOIN payments p ON o.id = p.order_id
                WHERE 1=1
            """
            count_params: List[Any] = []
            if status_filter and status_filter.lower() != "all":
                count_sql += " AND (p.status = ? OR (p.status IS NULL AND o.status = ?))"
                count_params.extend([status_filter.upper(), status_filter.upper()])
            if search:
                count_sql += " AND (o.id LIKE ? OR o.user_email LIKE ? OR o.customer_name LIKE ? OR o.customer_mobile LIKE ? OR p.utr LIKE ?)"
                count_params.extend([q, q, q, q, q])

            cursor.execute(count_sql, count_params)
            total = cursor.fetchone()[0]

            return {
                "orders": rows,
                "total": total,
                "limit": limit,
                "offset": offset
            }

    @staticmethod
    def get_payment_metrics() -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM orders")
            total_orders = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payments WHERE status = 'PENDING'")
            pending_verifications = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payments WHERE status = 'PAID'")
            confirmed_payments = cursor.fetchone()[0]

            cursor.execute("SELECT SUM(amount) FROM payments WHERE status = 'PAID'")
            total_revenue = cursor.fetchone()[0] or 0.0

            cursor.execute("SELECT COUNT(*) FROM payments WHERE status = 'REFUNDED'")
            refunded_count = cursor.fetchone()[0]

            return {
                "total_orders": total_orders,
                "pending_verifications": pending_verifications,
                "confirmed_payments": confirmed_payments,
                "total_revenue": round(total_revenue, 2),
                "refunded_count": refunded_count
            }

    @staticmethod
    def get_customer_history(email: str) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    o.id as order_id,
                    o.plan_id,
                    o.final_amount,
                    o.currency,
                    o.status as order_status,
                    o.created_at,
                    p.id as payment_id,
                    p.utr,
                    p.payment_method,
                    p.status as payment_status,
                    p.payment_date
                FROM orders o
                LEFT JOIN payments p ON o.id = p.order_id
                WHERE o.user_email = ?
                ORDER BY o.created_at DESC
            """, (clean_email,))
            orders = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT * FROM subscriptions WHERE user_email = ? ORDER BY id DESC LIMIT 1
            """, (clean_email,))
            sub_row = cursor.fetchone()
            active_sub = dict(sub_row) if sub_row else None

            return {
                "email": clean_email,
                "orders": orders,
                "subscription": active_sub
            }

    # --- License Management Methods ---

    @staticmethod
    def create_license(
        user_email: str,
        customer_name: str,
        plan_id: str,
        order_id: str = "",
        duration_days: int = 365,
        custom_key: str = "",
        notes: str = ""
    ) -> Dict[str, Any]:
        """Generates or assigns a verified License Key for video downloading."""
        clean_email = user_email.strip().lower()
        clean_name = customer_name.strip() or "TubeVault Customer"
        plan_code = plan_id.upper()[:4]

        if not custom_key:
            p1 = secrets.token_hex(2).upper()
            p2 = secrets.token_hex(2).upper()
            license_key = f"TVLT-{plan_code}-{p1}-{p2}"
        else:
            license_key = custom_key.strip().upper()

        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=duration_days)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO licenses (
                    license_key, user_email, customer_name, plan_id, order_id,
                    status, created_at, expires_at, download_count, notes
                ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 0, ?)
            """, (
                license_key, clean_email, clean_name, plan_id, order_id,
                now.isoformat(), expires.isoformat(), notes
            ))
            conn.commit()

        return PaymentDB.get_license(license_key)

    @staticmethod
    def get_license(license_key: str) -> Optional[Dict[str, Any]]:
        """Retrieves a license by key."""
        clean_key = license_key.strip().upper()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM licenses WHERE license_key = ? COLLATE NOCASE", (clean_key,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_license_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Retrieves the latest active license for a given customer email."""
        clean_email = email.strip().lower()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM licenses 
                WHERE user_email = ? AND status = 'ACTIVE'
                ORDER BY created_at DESC LIMIT 1
            """, (clean_email,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def verify_license(license_key: str) -> Dict[str, Any]:
        """
        Validates if a license key is authentic, active, and not expired.
        """
        lic = PaymentDB.get_license(license_key)
        if not lic:
            return {
                "valid": False,
                "reason": "License key not found. Please check spelling or purchase a plan.",
                "license": None
            }

        if lic["status"].upper() != "ACTIVE":
            return {
                "valid": False,
                "reason": f"License status is {lic['status']}. Access has been revoked or terminated.",
                "license": lic
            }

        # Check expiration date
        try:
            exp_date = datetime.fromisoformat(lic["expires_at"].replace("Z", "+00:00"))
            if exp_date.tzinfo is None:
                exp_date = exp_date.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp_date:
                return {
                    "valid": False,
                    "reason": "License key has expired. Please renew or purchase a new pass.",
                    "license": lic
                }
        except Exception:
            pass

        return {
            "valid": True,
            "reason": "License key is active and verified.",
            "license": lic
        }

    @staticmethod
    def increment_license_downloads(license_key: str) -> int:
        """Increments the recorded download count for a license."""
        clean_key = license_key.strip().upper()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE licenses 
                SET download_count = download_count + 1
                WHERE license_key = ? COLLATE NOCASE
            """, (clean_key,))
            conn.commit()
            cursor.execute("SELECT download_count FROM licenses WHERE license_key = ? COLLATE NOCASE", (clean_key,))
            row = cursor.fetchone()
            return row["download_count"] if row else 1

    @staticmethod
    def list_licenses(
        search: str = "",
        status: str = "all",
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Admin list of all licenses."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            where_clauses = []
            params = []

            if status and status != "all":
                where_clauses.append("status = ? COLLATE NOCASE")
                params.append(status)

            if search:
                term = f"%{search.strip()}%"
                where_clauses.append("(license_key LIKE ? OR user_email LIKE ? OR customer_name LIKE ?)")
                params.extend([term, term, term])

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            count_query = f"SELECT COUNT(*) as cnt FROM licenses {where_sql}"
            cursor.execute(count_query, params)
            total = cursor.fetchone()["cnt"]

            query = f"""
                SELECT * FROM licenses 
                {where_sql}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [limit, offset])
            licenses = [dict(r) for r in cursor.fetchall()]

            return {
                "total": total,
                "licenses": licenses
            }

    @staticmethod
    def revoke_license(license_key: str, reason: str = "") -> bool:
        clean_key = license_key.strip().upper()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE licenses 
                SET status = 'REVOKED', notes = ?
                WHERE license_key = ? COLLATE NOCASE
            """, (reason or "Revoked by admin", clean_key))
            conn.commit()
            return cursor.rowcount > 0

