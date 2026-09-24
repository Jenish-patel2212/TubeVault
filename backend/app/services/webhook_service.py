import hmac
import hashlib
import json
from typing import Dict, Any, Tuple
from app.services.payment_db import PaymentDB

class WebhookService:
    @staticmethod
    def verify_hmac_signature(payload_bytes: bytes, signature: str, secret_key: str) -> bool:
        """
        Cryptographically validates HMAC-SHA256 signature from payment gateways (e.g. Razorpay, Cashfree).
        """
        if not signature or not secret_key:
            return False
        
        expected = hmac.new(
            secret_key.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def process_gateway_webhook(
        event_type: str,
        payload: Dict[str, Any],
        idempotency_key: str
    ) -> Tuple[bool, str]:
        """
        Processes inbound gateway webhook with strict idempotency protection.
        Prevents double-crediting if gateway retries the webhook delivery.
        """
        order_id = payload.get("order_id", "")
        payment_id = payload.get("payment_id", "")

        # Check idempotency
        is_new = PaymentDB.log_payment_event(
            payment_id=payment_id,
            order_id=order_id,
            event_type=event_type,
            payload=payload,
            idempotency_key=idempotency_key
        )

        if not is_new:
            return False, "Duplicate event ignored (idempotent)."

        # In live gateway mode, if event is payment.captured or payment.successful:
        if event_type in ["payment.captured", "payment.succeeded", "charge.successful"]:
            from app.services.payment_service import PaymentService
            PaymentService.confirm_gateway_payment(
                order_id=order_id,
                gateway_payment_id=payment_id,
                notes=f"Confirmed via automated webhook ({event_type})"
            )
            return True, "Payment successfully captured and subscription activated."

        return True, f"Event {event_type} logged."
