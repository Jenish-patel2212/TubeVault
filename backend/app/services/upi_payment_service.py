import os
import re
import urllib.parse
from typing import Dict, Any, Optional
from app.services.payment_db import PaymentDB, UPLOADS_DIR

UTR_REGEX = re.compile(r"^[a-zA-Z0-9]{12}$")

class UPIPaymentService:
    @staticmethod
    def get_upi_config() -> Dict[str, str]:
        """Retrieves active UPI ID, Business Name, and QR image status."""
        upi_id = PaymentDB.get_setting("upi_id", "famapp@idbi")
        business_name = PaymentDB.get_setting("business_name", "TubeVault Media")
        qr_filename = PaymentDB.get_setting("famapp_qr_filename", "")
        
        has_custom_qr = False
        qr_image_url = ""
        if qr_filename:
            path = os.path.join(UPLOADS_DIR, qr_filename)
            if os.path.exists(path):
                has_custom_qr = True
                qr_image_url = f"/api/payments/admin/qr-image?t={int(os.path.getmtime(path))}"

        return {
            "upi_id": upi_id,
            "business_name": business_name,
            "has_custom_qr": has_custom_qr,
            "qr_image_url": qr_image_url
        }

    @staticmethod
    def generate_upi_uri(amount: float, order_id: str) -> str:
        """
        Builds standard NPCI UPI payment deep link URI:
        upi://pay?pa=MY_UPI_ID&pn=MY_BUSINESS_NAME&am=AMOUNT&cu=INR&tn=Order-ORD-XXXX
        """
        config = UPIPaymentService.get_upi_config()
        upi_id = config["upi_id"]
        business_name = config["business_name"]
        
        params = {
            "pa": upi_id,
            "pn": business_name,
            "am": f"{amount:.2f}",
            "cu": "INR",
            "tn": f"TubeVault {order_id}"
        }
        encoded = urllib.parse.urlencode(params)
        return f"upi://pay?{encoded}"

    @staticmethod
    def validate_utr(utr: str) -> str:
        """
        Validates the 12-character alphanumeric/digit UTR reference.
        Throws ValueError if invalid.
        """
        clean_utr = (utr or "").strip()
        if not clean_utr:
            raise ValueError("Transaction Reference / UTR number is required.")
        if len(clean_utr) != 12 or not UTR_REGEX.match(clean_utr):
            raise ValueError("Invalid UTR format. UPI Reference Numbers (UTR) are exactly 12 digits (e.g. 425612345678).")
        return clean_utr

    @staticmethod
    def check_duplicate_utr(utr: str) -> None:
        """Checks whether this UTR has already been submitted or verified."""
        existing = PaymentDB.find_payment_by_utr(utr)
        if existing:
            raise ValueError(f"This UTR ({utr}) has already been submitted for order {existing['order_id']} and is currently {existing['status']}.")

    @staticmethod
    def save_famapp_qr(file_bytes: bytes, filename: str) -> str:
        """Saves uploaded FamApp QR image into uploads directory."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
            raise ValueError("Uploaded file must be an image (PNG, JPG, or WEBP).")

        saved_name = f"famapp_qr{ext}"
        saved_path = os.path.join(UPLOADS_DIR, saved_name)

        # Write safely
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

        PaymentDB.set_setting("famapp_qr_filename", saved_name, "Custom FamApp QR code uploaded by admin")
        return saved_name
