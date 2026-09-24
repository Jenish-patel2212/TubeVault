import os
import time
import uuid
import shutil
import asyncio
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional
import yt_dlp

from app.config import settings
from app.models.schemas import DownloadJobStatus, JobStatusEnum, MediaType
from app.utils.security import sanitize_filename, validate_any_supported_url
from app.utils.cookies import find_cookie_file

def format_speed(bytes_per_sec: float) -> str:
    if not bytes_per_sec or bytes_per_sec <= 0:
        return "0 KB/s"
    if bytes_per_sec >= 1024 * 1024:
        return f"{bytes_per_sec / (1024 * 1024):.1f} MB/s"
    return f"{bytes_per_sec / 1024:.1f} KB/s"

def format_bytes_human(size_bytes: int) -> str:
    if not size_bytes or size_bytes <= 0:
        return "0 MB"
    mb = size_bytes / (1024 * 1024)
    return f"{mb:.1f} MB"

def get_ffmpeg_executable() -> Optional[str]:
    """Find system ffmpeg or fallback to bundled imageio-ffmpeg executable."""
    sys_path = shutil.which('ffmpeg')
    if sys_path:
        return sys_path
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    return None

class DownloadJobManager:
    def __init__(self):
        self.jobs: Dict[str, DownloadJobStatus] = {}
        self.job_locks: Dict[str, threading.Lock] = {}
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.file_paths: Dict[str, str] = {}
        self._start_cleanup_timer()

    def _start_cleanup_timer(self):
        """Runs periodic cleanup of old temporary files in background thread."""
        def cleanup_loop():
            while True:
                try:
                    self.cleanup_expired_files()
                except Exception as e:
                    print(f"[Cleanup Error] {e}")
                time.sleep(300)  # Check every 5 minutes

        t = threading.Thread(target=cleanup_loop, daemon=True)
        t.start()

    def cleanup_expired_files(self):
        """Deletes job files older than FILE_TTL_MINUTES."""
        now = datetime.now()
        ttl = timedelta(minutes=settings.FILE_TTL_MINUTES)
        expired_jobs = []

        for job_id, job in list(self.jobs.items()):
            try:
                created_dt = datetime.fromisoformat(job.created_at)
                if now - created_dt > ttl:
                    expired_jobs.append(job_id)
            except Exception:
                pass

        for job_id in expired_jobs:
            self.delete_job(job_id)

    def create_job(self) -> str:
        job_id = str(uuid.uuid4())
        now_str = datetime.now().isoformat()
        job = DownloadJobStatus(
            job_id=job_id,
            status=JobStatusEnum.PENDING,
            percent=0.0,
            downloaded_bytes=0,
            total_bytes=0,
            speed_bytes_per_sec=0.0,
            speed_formatted="0 KB/s",
            created_at=now_str
        )
        self.jobs[job_id] = job
        self.job_locks[job_id] = threading.Lock()
        return job_id

    def get_job(self, job_id: str) -> Optional[DownloadJobStatus]:
        return self.jobs.get(job_id)

    def get_file_path(self, job_id: str) -> Optional[str]:
        path = self.file_paths.get(job_id)
        if path and os.path.exists(path):
            return path
        return None

    def cancel_job(self, job_id: str) -> bool:
        if job_id in self.jobs:
            job = self.jobs[job_id]
            job.status = JobStatusEnum.CANCELLED
            job.error = "Download was cancelled by user."
            # Cancel task if running
            if job_id in self.active_tasks:
                task = self.active_tasks[job_id]
                if not task.done():
                    task.cancel()
            self.delete_job_files(job_id)
            return True
        return False

    def delete_job_files(self, job_id: str):
        if job_id in self.file_paths:
            file_path = self.file_paths[job_id]
            folder = os.path.dirname(file_path)
            if os.path.exists(folder):
                try:
                    shutil.rmtree(folder, ignore_errors=True)
                except Exception:
                    pass
            del self.file_paths[job_id]

    def delete_job(self, job_id: str):
        self.cancel_job(job_id)
        if job_id in self.jobs:
            del self.jobs[job_id]
        if job_id in self.job_locks:
            del self.job_locks[job_id]

    async def start_download(self, job_id: str, url: str, format_id: str, media_type: MediaType):
        is_valid, validated_url, platform = validate_any_supported_url(url)
        if not is_valid:
            if job_id in self.jobs:
                self.jobs[job_id].status = JobStatusEnum.FAILED
                self.jobs[job_id].error = validated_url
            return

        job_dir = os.path.join(settings.TEMP_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)

        loop = asyncio.get_event_loop()
        task = loop.run_in_executor(
            None,
            self._download_sync,
            job_id,
            validated_url,
            format_id,
            media_type,
            job_dir
        )
        self.active_tasks[job_id] = task

    def _download_sync(self, job_id: str, url: str, format_id: str, media_type: MediaType, job_dir: str):
        job = self.jobs.get(job_id)
        if not job:
            return

        job.status = JobStatusEnum.DOWNLOADING

        def progress_hook(d):
            if job.status == JobStatusEnum.CANCELLED:
                raise Exception("Download cancelled by user")

            status = d.get('status')
            if status == 'downloading':
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                speed = d.get('speed') or 0.0
                eta = d.get('eta')

                percent = (downloaded / total * 100) if total > 0 else 0.0
                
                job.downloaded_bytes = downloaded
                job.total_bytes = total
                job.percent = round(min(percent, 99.9), 1)
                job.speed_bytes_per_sec = speed
                job.speed_formatted = format_speed(speed)
                job.eta_seconds = eta
                job.file_size_formatted = format_bytes_human(total or downloaded)

            elif status == 'finished':
                job.percent = 100.0
                job.speed_formatted = "Completed"
                job.eta_seconds = 0

        # Output template in secure isolated folder
        out_template = os.path.join(job_dir, '%(title)s.%(ext)s')

        ffmpeg_exe = get_ffmpeg_executable()
        has_ffmpeg = ffmpeg_exe is not None

        cookie_file = find_cookie_file()

        ydl_opts = {
            'outtmpl': out_template,
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }

        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file

        if has_ffmpeg:
            ydl_opts['ffmpeg_location'] = ffmpeg_exe

        is_instagram = "instagram.com" in url

        if media_type == MediaType.AUDIO:
            ydl_opts['format'] = 'bestaudio/best'
            # Add audio postprocessing when ffmpeg is available
            if has_ffmpeg:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
        else:
            # Video mode
            if is_instagram:
                # Instagram reels are delivered as single merged MP4 streams
                ydl_opts['format'] = 'best[ext=mp4]/best'
            elif format_id and format_id not in ["best", "bestvideo", "bestvideo+bestaudio"]:
                if has_ffmpeg:
                    ydl_opts['format'] = f"{format_id}+bestaudio/bestvideo+bestaudio/{format_id}/best"
                    ydl_opts['merge_output_format'] = 'mp4'
                else:
                    ydl_opts['format'] = f"{format_id}/best[ext=mp4]/best"
            else:
                if has_ffmpeg:
                    ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best'
                    ydl_opts['merge_output_format'] = 'mp4'
                else:
                    ydl_opts['format'] = 'best[ext=mp4]/best'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_file = ydl.prepare_filename(info)

                # Handle audio extension postprocessing conversion
                if media_type == MediaType.AUDIO and not downloaded_file.endswith('.mp3'):
                    base, _ = os.path.splitext(downloaded_file)
                    possible_mp3 = base + '.mp3'
                    if os.path.exists(possible_mp3):
                        downloaded_file = possible_mp3

                if os.path.exists(downloaded_file):
                    filename = os.path.basename(downloaded_file)
                    sanitized_name = sanitize_filename(filename)
                    final_path = os.path.join(job_dir, sanitized_name)
                    
                    if downloaded_file != final_path:
                        os.rename(downloaded_file, final_path)

                    self.file_paths[job_id] = final_path
                    job.filename = sanitized_name
                    job.status = JobStatusEnum.COMPLETED
                    job.percent = 100.0
                    job.file_size_formatted = format_bytes_human(os.path.getsize(final_path))
                else:
                    # Look for any file generated in the job_dir
                    files = os.listdir(job_dir)
                    if files:
                        found_path = os.path.join(job_dir, files[0])
                        sanitized_name = sanitize_filename(files[0])
                        final_path = os.path.join(job_dir, sanitized_name)
                        if found_path != final_path:
                            os.rename(found_path, final_path)
                        self.file_paths[job_id] = final_path
                        job.filename = sanitized_name
                        job.status = JobStatusEnum.COMPLETED
                        job.percent = 100.0
                        job.file_size_formatted = format_bytes_human(os.path.getsize(final_path))
                    else:
                        job.status = JobStatusEnum.FAILED
                        job.error = "Downloaded file could not be saved."

        except Exception as e:
            if job.status != JobStatusEnum.CANCELLED:
                job.status = JobStatusEnum.FAILED
                raw_err = str(e)
                if "empty media response" in raw_err or "login page" in raw_err.lower() or "not granting access" in raw_err:
                    job.error = (
                        "Instagram requires authentication or session cookies for this Reel. "
                        "Please verify the Reel is from a public profile, or place a 'cookies.txt' file in the server."
                    )
                elif "Private video" in raw_err or "login required" in raw_err.lower():
                    job.error = "This Instagram Reel is from a private account and cannot be downloaded without login."
                else:
                    job.error = f"Download failed: {raw_err}"

download_manager = DownloadJobManager()
