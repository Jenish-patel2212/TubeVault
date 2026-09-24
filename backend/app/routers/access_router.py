from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Header, status
from pydantic import BaseModel, Field

from app.services.access_service import AccessService

router = APIRouter(prefix="/access", tags=["Device Access & Owner Approval"])

# --- Request Models ---

class AccessRequestPayload(BaseModel):
    device_id: str = Field(..., description="Unique persistent client device UUID")
    visitor_name: str = Field(..., description="Name of person requesting access")
    device_info: Optional[str] = Field("", description="Browser/device information")

class VerifyMasterPinPayload(BaseModel):
    pin: str = Field(..., description="Master Owner PIN")

class ActionDevicePayload(BaseModel):
    device_id: str
    pin: str

class ChangePinPayload(BaseModel):
    current_pin: str
    new_pin: str

# --- Endpoints ---

@router.post("/request")
async def request_access(payload: AccessRequestPayload, request: Request):
    """Called by visitors to request access from Jenish."""
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", payload.device_info or "")
    
    result = AccessService.request_access(
        device_id=payload.device_id,
        visitor_name=payload.visitor_name,
        device_info=user_agent[:120],
        ip_address=client_ip
    )
    return {"success": True, "data": result}

@router.get("/status/{device_id}")
async def get_access_status(device_id: str):
    """Polled by visitor browser to check if Jenish approved them."""
    result = AccessService.get_status(device_id)
    return {"success": True, "data": result}

@router.post("/verify-master")
async def verify_master_pin(payload: VerifyMasterPinPayload):
    """Called when Jenish enters his Master PIN to unlock Owner mode."""
    is_valid = AccessService.verify_master_pin(payload.pin)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Master PIN")
    return {"success": True, "message": "Owner authenticated"}

@router.get("/admin/list")
async def list_access_requests(x_master_pin: Optional[str] = Header(None)):
    """Called by Jenish's phone to list all pending and approved devices."""
    if not x_master_pin or not AccessService.verify_master_pin(x_master_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized: Master PIN required")
    
    requests = AccessService.list_requests()
    return {"success": True, "requests": requests}

@router.post("/admin/approve")
async def approve_device(payload: ActionDevicePayload):
    """Called by Jenish on his phone to grant access to a visitor."""
    if not AccessService.verify_master_pin(payload.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Master PIN")
    
    success = AccessService.approve_device(payload.device_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device request not found")
    return {"success": True, "message": "Access granted successfully"}

@router.post("/admin/reject")
async def reject_device(payload: ActionDevicePayload):
    """Called by Jenish to reject a visitor's request."""
    if not AccessService.verify_master_pin(payload.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Master PIN")
    
    success = AccessService.reject_device(payload.device_id)
    return {"success": True, "message": "Request rejected"}

@router.post("/admin/revoke")
async def revoke_device(payload: ActionDevicePayload):
    """Called by Jenish to revoke access from a previously approved device."""
    if not AccessService.verify_master_pin(payload.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Master PIN")
    
    success = AccessService.revoke_device(payload.device_id)
    return {"success": True, "message": "Access revoked"}

@router.post("/admin/change-pin")
async def change_master_pin(payload: ChangePinPayload):
    """Allows Jenish to change his Master PIN."""
    if not AccessService.verify_master_pin(payload.current_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect current PIN")
    if len(payload.new_pin.strip()) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be at least 4 digits")
    
    AccessService.set_master_pin(payload.new_pin.strip())
    return {"success": True, "message": "Master PIN updated successfully"}
