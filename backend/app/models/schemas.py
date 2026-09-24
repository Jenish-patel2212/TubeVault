from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from enum import Enum

class MediaType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"

class FormatOption(BaseModel):
    format_id: str
    extension: str
    resolution: Optional[str] = None  # e.g., "1080p", "720p", "480p" or "128k (Audio)"
    note: Optional[str] = None
    filesize_approx: Optional[int] = None  # Size in bytes
    filesize_formatted: Optional[str] = None  # Human readable size (e.g. "24.5 MB")
    has_video: bool = True
    has_audio: bool = True
    media_type: MediaType = MediaType.VIDEO
    fps: Optional[int] = None

class StoryItem(BaseModel):
    id: str
    index: int
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    duration_formatted: Optional[str] = None
    media_type: str = "video"

class AnalyzeRequest(BaseModel):
    url: str = Field(..., description="YouTube video or media URL to analyze")

class MediaMetadata(BaseModel):
    title: str
    url: str
    thumbnail: Optional[str] = None
    channel: Optional[str] = None
    duration: Optional[int] = None  # Duration in seconds
    duration_formatted: Optional[str] = None  # "04:15"
    view_count: Optional[int] = None
    video_formats: List[FormatOption] = []
    audio_formats: List[FormatOption] = []
    description_snippet: Optional[str] = None
    is_story: bool = False
    is_highlight: bool = False
    story_count: Optional[int] = None
    story_items: Optional[List[StoryItem]] = None

class DownloadRequest(BaseModel):
    url: str
    format_id: str
    media_type: MediaType = MediaType.VIDEO
    item_index: Optional[int] = None  # 1-based index for story/highlight playlists

class JobStatusEnum(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DownloadJobStatus(BaseModel):
    job_id: str
    status: JobStatusEnum
    percent: float = 0.0
    downloaded_bytes: int = 0
    total_bytes: int = 0
    speed_bytes_per_sec: float = 0.0
    speed_formatted: str = "0 KB/s"
    eta_seconds: Optional[int] = None
    filename: Optional[str] = None
    file_size_formatted: Optional[str] = None
    error: Optional[str] = None
    created_at: str

class ErrorResponse(BaseModel):
    detail: str
    code: str = "INVALID_INPUT"

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200, description="Search query string")
    limit: int = Field(default=10, ge=1, le=25, description="Maximum number of search results to return")

class SearchResultItem(BaseModel):
    id: str
    title: str
    url: str
    thumbnail: Optional[str] = None
    channel: Optional[str] = None
    duration: Optional[int] = None
    duration_formatted: Optional[str] = None
    view_count: Optional[int] = None

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem] = []
