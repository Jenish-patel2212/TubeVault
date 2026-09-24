from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends, status
from fastapi.responses import FileResponse
from typing import Dict, Any
import os

from app.models.schemas import (
    AnalyzeRequest,
    MediaMetadata,
    DownloadRequest,
    DownloadJobStatus,
    ErrorResponse,
    SearchRequest,
    SearchResponse,
    SearchResultItem
)
from app.services.youtube_service import YouTubeService
from app.services.instagram_service import InstagramService
from app.services.download_manager import download_manager
from app.utils.security import (
    validate_youtube_url,
    validate_instagram_url,
    validate_any_supported_url
)

router = APIRouter(prefix="/api", tags=["Media Vault"])

@router.post(
    "/search",
    response_model=SearchResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def search_youtube(request: SearchRequest):
    """
    Directly searches YouTube for videos and songs by keyword.
    """
    query = request.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty."
        )

    try:
        results_data = YouTubeService.search_videos(query=query, limit=request.limit)
        items = [SearchResultItem(**item) for item in results_data]
        return SearchResponse(query=query, results=items)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while searching: {str(e)}"
        )

@router.post(
    "/analyze",
    response_model=MediaMetadata,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def analyze_url(request: AnalyzeRequest):
    """
    Validates YouTube URL and retrieves available format metadata.
    """
    is_valid, reason_or_url = validate_youtube_url(request.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason_or_url
        )

    try:
        metadata = YouTubeService.extract_metadata(reason_or_url)
        return metadata
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while analyzing the URL: {str(e)}"
        )

@router.post(
    "/instagram/analyze",
    response_model=MediaMetadata,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def analyze_instagram_url(request: AnalyzeRequest):
    """
    Validates Instagram URL and retrieves Reels / Post format metadata.
    """
    is_valid, reason_or_url = validate_instagram_url(request.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason_or_url
        )

    try:
        metadata = InstagramService.extract_metadata(reason_or_url)
        return metadata
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while analyzing the Instagram URL: {str(e)}"
        )

@router.post(
    "/download",
    response_model=Dict[str, str],
    status_code=status.HTTP_202_ACCEPTED
)
async def create_download_job(request: DownloadRequest, background_tasks: BackgroundTasks):
    """
    Initiates a background download job for a permitted YouTube or Instagram media URL.
    Returns the job_id for status polling.
    """
    is_valid, reason_or_url, platform = validate_any_supported_url(request.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason_or_url
        )

    job_id = download_manager.create_job()
    
    # Trigger background download execution
    await download_manager.start_download(
        job_id=job_id,
        url=reason_or_url,
        format_id=request.format_id,
        media_type=request.media_type
    )

    return {"job_id": job_id, "message": "Download job initiated successfully."}

@router.get(
    "/download/{job_id}",
    response_model=DownloadJobStatus,
    responses={404: {"model": ErrorResponse}}
)
async def get_download_status(job_id: str):
    """
    Retrieves real-time status, speed, ETA, and progress percentage for a download job.
    """
    job = download_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download job not found or has expired."
        )
    return job

@router.get(
    "/download/{job_id}/file",
    responses={404: {"model": ErrorResponse}}
)
async def get_downloaded_file(job_id: str, background_tasks: BackgroundTasks):
    """
    Streams the completed media file to the browser as a downloadable attachment.
    """
    job = download_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Download job not found or has expired."
        )

    file_path = download_manager.get_file_path(job_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested media file is unavailable or has been cleaned up."
        )

    filename = job.filename or os.path.basename(file_path)
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Accept-Ranges": "bytes",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Accept-Ranges"
        }
    )

@router.delete(
    "/download/{job_id}",
    response_model=Dict[str, str]
)
async def cancel_download_job(job_id: str):
    """
    Cancels an active download job and cleans up temporary media files.
    """
    success = download_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or already terminated."
        )
    return {"message": "Download job cancelled successfully."}

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "app": "TubeVault Backend"}
