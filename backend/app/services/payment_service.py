import os
import re
import secrets
from datetime import datetime
from typing import Dict, Any, Optional
from app.services.payment_db import PaymentDB
from app.services.upi_payment_service import UPIPaymentService

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_REGEX = re.compile(r"^[0-9\+\-\s]{10,15}$")

class PaymentService:
    @staticmethod
    def validate_coupon(code: str, order_amount: float) -> Dict[str, Any]:
        """Validates coupon code against minimum order rules and calculates discount."""
        clean_code = (code or "").strip().upper()
        if not clean_code:
            return {"valid": False, "discount_amount": 0.0, "final_amount": order_amount, "message": "No code entered."}

        coupon = PaymentDB.get_coupon(clean_code)
        if not coupon:
            return {"valid": False, "discount_amount": 0.0, "final_amount": order_amount, "message": "Invalid or expired coupon code."}

        if order_amount < coupon["min_order_amount"]:
            return {
                "valid": False,
                "discount_amount": 0.0,
                "final_amount": order_amount,
                "message": f"Minimum order amount of ₹{coupon['min_order_amount']:.0f} required for this coupon."
            }

        if coupon["discount_type"] == "percent":
            discount = (order_amount * coupon["discount_value"]) / 100.0
            discount = min(discount, coupon["max_discount"])
        else: # flat
            discount = min(coupon["discount_value"], order_amount)

        discount = round(discount, 2)
        final_amount = max(0.0, round(order_amount - discount, 2))

        return {
            "valid": True,
            "code": clean_code,
            "discount_type": coupon["discount_type"],
            "discount_value": coupon["discount_value"],
            "discount_amount": discount,
            "final_amount": final_amount,
            "message": f"Coupon '{clean_code}' applied! You saved ₹{discount:.2f}"
        }

    @staticmethod
    def create_order(
        customer_name: str,
        customer_email: str,
        customer_mobile: str,
        plan_id: str,
        billing_cycle: str = "yearly",
        coupon_code: str = ""
    ) -> Dict[str, Any]:
        """Creates a pending checkout order and generates the UPI payment deep link."""
        clean_name = (customer_name or "").strip()
        if len(clean_name) < 2:
            raise ValueError("Customer full name is required.")

        clean_email = (customer_email or "").strip().lower()
        if not EMAIL_REGEX.match(clean_email):
            raise ValueError("A valid customer email address is required.")

        clean_mobile = (customer_mobile or "").strip()
        if not PHONE_REGEX.match(clean_mobile):
            raise ValueError("A valid 10-digit mobile number is required.")

        plan = PaymentDB.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Selected plan '{plan_id}' does not exist or is inactive.")

        # Calculate base price
        cycle = (billing_cycle or "yearly").lower()
        if plan.get("fixed_price", 0) > 0:
            original_amount = float(plan["fixed_price"])
            effective_cycle = "fixed"
        elif cycle == "yearly":
            original_amount = float(plan["yearly_price"] * 12)
            effective_cycle = "yearly"
        else:
            original_amount = float(plan["monthly_price"])
            effective_cycle = "monthly"

        # Apply coupon if provided
        discount_amount = 0.0
        final_amount = original_amount
        applied_coupon = ""
        if coupon_code:
            coupon_res = PaymentService.validate_coupon(coupon_code, original_amount)
            if coupon_res["valid"]:
                discount_amount = coupon_res["discount_amount"]
                final_amount = coupon_res["final_amount"]
                applied_coupon = coupon_res["code"]

        year = datetime.utcnow().strftime("%Y")
        rand_token = secrets.token_hex(4).upper()
        order_id = f"ORD-{year}-{rand_token}"
        now_str = datetime.utcnow().isoformat()

        order_data = {
            "id": order_id,
            "user_email": clean_email,
            "customer_name": clean_name,
            "customer_mobile": clean_mobile,
            "plan_id": plan["id"],
            "billing_cycle": effective_cycle,
            "original_amount": original_amount,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "currency": "INR",
            "coupon_code": applied_coupon,
            "status": "PENDING",
            "created_at": now_str,
            "updated_at": now_str
        }

        created_order = PaymentDB.create_order(order_data)
        
        # Increment coupon usage if used
        if applied_coupon:
            PaymentDB.increment_coupon_usage(applied_coupon)

        # Generate UPI deep link & fetch config
        upi_uri = UPIPaymentService.generate_upi_uri(final_amount, order_id)
        upi_config = UPIPaymentService.get_upi_config()

        return {
            "order": created_order,
            "plan": plan,
            "payment_details": {
                "upi_id": upi_config["upi_id"],
                "business_name": upi_config["business_name"],
                "amount": final_amount,
                "currency": "INR",
                "upi_uri": upi_uri,
                "has_custom_qr": upi_config["has_custom_qr"],
                "qr_image_url": upi_config["qr_image_url"]
            }
        }

    @staticmethod
    def submit_manual_upi_payment(
        order_id: str,
        utr: str,
        payment_date: str,
        amount: float,
        customer_name: str,
        customer_email: str,
        customer_mobile: str
    ) -> Dict[str, Any]:
        """
        Customer submits manual FamApp UPI payment with UTR.
        Enforces 12-digit UTR validation and duplicate checks.
        Saves payment status as PENDING (Pending Verification).
        """
        order = PaymentDB.get_order(order_id)
        if not order:
            raise ValueError(f"Order '{order_id}' was not found.")

        if order["status"] == "CONFIRMED":
            raise ValueError(f"Order '{order_id}' is already confirmed and paid.")

        # Validate UTR
        clean_utr = UPIPaymentService.validate_utr(utr)
        UPIPaymentService.check_duplicate_utr(clean_utr)

        # Ensure payment amount matches or is recorded
        expected_amount = float(order["final_amount"])

        year = datetime.utcnow().strftime("%Y")
        payment_id = f"PAY-{year}-{secrets.token_hex(4).upper()}"
        now_str = datetime.utcnow().isoformat()

        payment_data = {
            "id": payment_id,
            "order_id": order_id,
            "payment_method": "upi_qr",
            "payment_gateway": "famapp_manual",
            "gateway_order_id": "",
            "gateway_payment_id": "",
            "utr": clean_utr,
            "amount": amount if amount > 0 else expected_amount,
            "status": "PENDING", # Pending Verification
            "customer_name": customer_name or order["customer_name"],
            "customer_email": (customer_email or order["user_email"]).strip().lower(),
            "customer_mobile": customer_mobile or order["customer_mobile"],
            "payment_date": payment_date or now_str[:10],
            "notes": "Customer submitted UPI reference for verification.",
            "created_at": now_str,
            "updated_at": now_str
        }

        created_payment = PaymentDB.create_payment(payment_data)

        # Log event
        PaymentDB.log_payment_event(
            payment_id=payment_id,
            order_id=order_id,
            event_type="manual_payment_submitted",
            payload={"utr": clean_utr, "amount": payment_data["amount"], "customer_email": payment_data["customer_email"]}
        )

        return {
            "success": True,
            "message": "Payment submitted for verification. Admin will verify your UTR.",
            "payment": created_payment,
            "order": order
        }

    @staticmethod
    def admin_verify_payment(
        payment_id: str,
        action: str, # "approve" or "reject"
        admin_identity: str = "Admin",
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Admin-only verification of manual payments.
        When approved: Payment status = PAID, Order status = CONFIRMED, Plan status = ACTIVE.
        """
        payment = PaymentDB.get_payment(payment_id)
        if not payment:
            raise ValueError(f"Payment '{payment_id}' not found.")

        order_id = payment["order_id"]
        order = PaymentDB.get_order(order_id)
        if not order:
            raise ValueError(f"Associated order '{order_id}' not found.")

        clean_action = action.lower().strip()
        if clean_action == "approve":
            new_payment_status = "PAID"
            new_order_status = "CONFIRMED"
            admin_note = notes or "Verified by administrator"

            PaymentDB.update_payment_verification(
                payment_id=payment_id,
                status=new_payment_status,
                verified_by=admin_identity,
                notes=admin_note
            )
            PaymentDB.update_order_status(order_id, new_order_status)

            # Activate subscription in backend
            plan = PaymentDB.get_plan(order["plan_id"])
            duration_days = plan["duration_days"] if plan else 30
            sub = PaymentDB.record_subscription(
                email=order["user_email"],
                plan_id=order["plan_id"],
                order_id=order_id,
                payment_id=payment_id,
                duration_days=duration_days
            )

            PaymentDB.log_payment_event(
                payment_id=payment_id,
                order_id=order_id,
                event_type="payment_approved",
                payload={"verified_by": admin_identity, "notes": admin_note}
            )

            # Generate and assign License Key
            license_obj = PaymentDB.create_license(
                user_email=order["user_email"],
                customer_name=order["customer_name"],
                plan_id=order["plan_id"],
                order_id=order_id,
                duration_days=duration_days,
                notes=f"Auto-generated on Admin Approval of {payment_id}"
            )

            return {
                "success": True,
                "message": f"Payment {payment_id} approved. Customer plan '{order['plan_id']}' is now ACTIVE.",
                "payment_status": "PAID",
                "order_status": "CONFIRMED",
                "subscription": sub,
                "license": license_obj
            }

        elif clean_action == "reject":
            new_payment_status = "FAILED"
            new_order_status = "CANCELLED"
            admin_note = notes or "Payment rejected by administrator (invalid UTR or mismatch)"

            PaymentDB.update_payment_verification(
                payment_id=payment_id,
                status=new_payment_status,
                verified_by=admin_identity,
                notes=admin_note
            )
            PaymentDB.update_order_status(order_id, new_order_status)

            PaymentDB.log_payment_event(
                payment_id=payment_id,
                order_id=order_id,
                event_type="payment_rejected",
                payload={"verified_by": admin_identity, "notes": admin_note}
            )

            return {
                "success": True,
                "message": f"Payment {payment_id} rejected. Reason: {admin_note}",
                "payment_status": "FAILED",
                "order_status": "CANCELLED"
            }
        else:
            raise ValueError(f"Invalid verification action '{action}'. Must be 'approve' or 'reject'.")

    @staticmethod
    def admin_refund_payment(payment_id: str, admin_identity: str = "Admin", reason: str = "") -> Dict[str, Any]:
        """Issues refund for payment and revokes the active subscription."""
        payment = PaymentDB.get_payment(payment_id)
        if not payment:
            raise ValueError(f"Payment '{payment_id}' not found.")

        order_id = payment["order_id"]
        order = PaymentDB.get_order(order_id)

        notes = reason or "Refunded by administrator"
        PaymentDB.update_payment_verification(
            payment_id=payment_id,
            status="REFUNDED",
            verified_by=admin_identity,
            notes=notes
        )
        PaymentDB.update_order_status(order_id, "REFUNDED")

        # Revoke customer subscription
        from app.services.subscription_db import SubscriptionDB
        SubscriptionDB.revoke_subscription(payment["customer_email"], f"Refunded: {notes}")

        PaymentDB.log_payment_event(
            payment_id=payment_id,
            order_id=order_id,
            event_type="payment_refunded",
            payload={"verified_by": admin_identity, "reason": notes}
        )

        return {
            "success": True,
            "message": f"Payment {payment_id} marked as REFUNDED and customer subscription revoked."
        }

    @staticmethod
    def confirm_gateway_payment(order_id: str, gateway_payment_id: str, notes: str = "") -> Dict[str, Any]:
        """Fulfillment handler when an automated gateway confirms the payment."""
        order = PaymentDB.get_order(order_id)
        if not order:
            raise ValueError(f"Order '{order_id}' not found.")

        year = datetime.utcnow().strftime("%Y")
        payment_id = f"PAY-{year}-{secrets.token_hex(4).upper()}"
        now_str = datetime.utcnow().isoformat()

        payment_data = {
            "id": payment_id,
            "order_id": order_id,
            "payment_method": "gateway",
            "payment_gateway": "automated_gateway",
            "gateway_order_id": order_id,
            "gateway_payment_id": gateway_payment_id,
            "utr": gateway_payment_id,
            "amount": order["final_amount"],
            "status": "PAID",
            "customer_name": order["customer_name"],
            "customer_email": order["user_email"],
            "customer_mobile": order["customer_mobile"],
            "payment_date": now_str[:10],
            "notes": notes or "Automated gateway webhook confirmation",
            "created_at": now_str,
            "updated_at": now_str
        }
        PaymentDB.create_payment(payment_data)
        PaymentDB.update_order_status(order_id, "CONFIRMED")

        plan = PaymentDB.get_plan(order["plan_id"])
        duration = plan["duration_days"] if plan else 30
        sub = PaymentDB.record_subscription(
            email=order["user_email"],
            plan_id=order["plan_id"],
            order_id=order_id,
            payment_id=payment_id,
            duration_days=duration
        )

        # Generate and assign License Key
        license_obj = PaymentDB.create_license(
            user_email=order["user_email"],
            customer_name=order["customer_name"],
            plan_id=order["plan_id"],
            order_id=order_id,
            duration_days=duration,
            notes=f"Auto-generated on Gateway Payment {gateway_payment_id}"
        )

        return {"success": True, "subscription": sub, "license": license_obj}

    @staticmethod
    def generate_invoice_data(order_id: str) -> Dict[str, Any]:
        """Assembles official invoice metadata for customer or admin download."""
        order = PaymentDB.get_order(order_id)
        if not order:
            raise ValueError(f"Order '{order_id}' not found.")

        payment = PaymentDB.get_payment_by_order(order_id)
        plan = PaymentDB.get_plan(order["plan_id"])

        business_name = PaymentDB.get_setting("business_name", "TubeVault Media Inc.")
        invoice_number = f"INV-{order['id'].replace('ORD-', '')}"

        final_amount = float(order["final_amount"])

        return {
            "business_name": business_name,
            "invoice_number": invoice_number,
            "order_id": order["id"],
            "payment_id": payment["id"] if payment else "N/A",
            "customer_name": order["customer_name"],
            "customer_email": order["user_email"],
            "customer_mobile": order["customer_mobile"],
            "plan_id": order["plan_id"],
            "plan_name": plan["name"] if plan else order["plan_id"].capitalize(),
            "billing_cycle": order["billing_cycle"],
            "original_amount": order["original_amount"],
            "discount_amount": order["discount_amount"],
            "final_amount": final_amount,
            "currency": order.get("currency", "INR"),
            "payment_method": payment["payment_method"].upper() if payment else "UPI",
            "utr": payment["utr"] if payment else "N/A",
            "order_status": order["status"],
            "payment_status": payment["status"] if payment else order["status"],
            "date": payment["payment_date"] if payment and payment["payment_date"] else order["created_at"][:10],
            "created_at": order["created_at"]
        }

    @staticmethod
    def generate_invoice_html(order_id: str) -> str:
        """Renders an elegant, printable, PDF-ready HTML invoice."""
        data = PaymentService.generate_invoice_data(order_id)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice {data['invoice_number']} - {data['business_name']}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
  body {{ background: #f1f5f9; padding: 40px 20px; color: #1e293b; }}
  .invoice-card {{ max-width: 780px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 48px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 28px; margin-bottom: 32px; }}
  .brand {{ font-size: 28px; font-weight: 900; color: #dc2626; letter-spacing: -0.5px; }}
  .brand span {{ color: #0f172a; }}
  .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }}
  .badge-paid {{ background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }}
  .badge-pending {{ background: #fefce8; color: #ca8a04; border: 1px solid #fef08a; }}
  .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }}
  .section-title {{ font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }}
  .info-val {{ font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.5; }}
  .table {{ width: 100%; border-collapse: collapse; margin-bottom: 32px; }}
  .table th {{ background: #f8fafc; text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }}
  .table td {{ padding: 18px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }}
  .totals {{ margin-left: auto; width: 300px; }}
  .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }}
  .total-row.grand {{ border-top: 2px solid #0f172a; padding-top: 14px; margin-top: 8px; font-size: 18px; font-weight: 800; color: #0f172a; }}
  .footer {{ border-top: 1px dashed #cbd5e1; padding-top: 24px; margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }}
  .actions {{ max-width: 780px; margin: 20px auto 0; display: flex; justify-content: flex-end; gap: 12px; }}
  .btn {{ padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none; border: none; }}
  .btn-print {{ background: #dc2626; color: #fff; }}
  .btn-print:hover {{ background: #b91c1c; }}
  @media print {{
    body {{ background: #fff; padding: 0; }}
    .invoice-card {{ box-shadow: none; border: none; padding: 20px; }}
    .actions {{ display: none; }}
  }}
</style>
</head>
<body>

<div class="invoice-card">
  <div class="header">
    <div>
      <div class="brand">TUBE<span>VAULT</span></div>
      <div style="font-size: 13px; color: #64748b; margin-top: 4px;">{data['business_name']}</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Official Payment Receipt</div>
    </div>
    <div style="text-align: right;">
      <span class="badge {'badge-paid' if data['payment_status'] == 'PAID' else 'badge-pending'}">{data['payment_status']}</span>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 8px;">{data['invoice_number']}</div>
      <div style="font-size: 13px; color: #64748b;">Date: {data['date']}</div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Billed To</div>
      <div class="info-val">{data['customer_name']}</div>
      <div style="font-size: 14px; color: #64748b;">{data['customer_email']}</div>
      <div style="font-size: 13px; color: #64748b;">Phone: {data['customer_mobile']}</div>
    </div>
    <div style="text-align: right;">
      <div class="section-title">Payment Information</div>
      <div class="info-val">Method: {data['payment_method']}</div>
      <div style="font-size: 13px; color: #64748b;">Order ID: <strong>{data['order_id']}</strong></div>
      <div style="font-size: 13px; color: #64748b;">Payment ID: {data['payment_id']}</div>
      <div style="font-size: 13px; color: #64748b;">UTR / Ref: <code>{data['utr']}</code></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Cycle</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div style="font-weight: 700; color: #0f172a;">{data['plan_name']}</div>
          <div style="font-size: 12px; color: #64748b;">4K/1080p Ultra HD downloads, 320kbps audio & uncapped turbo speeds</div>
        </td>
        <td>{data['billing_cycle'].capitalize()}</td>
        <td style="text-align: right; font-weight: 600;">₹{data['original_amount']:.2f}</td>
      </tr>
    </tbody>
  </table>

    <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>₹{data['original_amount']:.2f}</span>
    </div>
    {'<div class="total-row" style="color: #059669;"><span>Discount Applied</span><span>- ₹' + f"{data['discount_amount']:.2f}" + '</span></div>' if data['discount_amount'] > 0 else ''}
    <div class="total-row grand">
      <span>Total Paid</span>
      <span>₹{data['final_amount']:.2f} {data['currency']}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing {data['business_name']}!</p>
    <p style="margin-top: 4px;">This is a computer-generated invoice. For support contact: support@tubevault.com</p>
  </div>
</div>

<div class="actions">
  <button class="btn btn-print" onclick="window.print()">🖨️ Print or Save as PDF</button>
</div>

</body>
</html>
"""
