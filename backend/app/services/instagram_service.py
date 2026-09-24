import yt_dlp
import math
from typing import Optional, Dict, Any, List
from app.models.schemas import MediaMetadata, FormatOption, MediaType
from app.utils.security import validate_instagram_url
from app.utils.cookies import find_cookie_file

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "00:00"
    minutes, secs = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def format_bytes(size_bytes: Optional[int]) -> str:
    if not size_bytes or size_bytes <= 0:
        return "High Quality Stream"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

class InstagramService:
    @staticmethod
    def extract_metadata(url: str) -> MediaMetadata:
        is_valid, validated_url_or_reason = validate_instagram_url(url)
        if not is_valid:
            raise ValueError(validated_url_or_reason)

        ydl_opts = {
            'skip_download': True,
            'extract_flat': False,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': False,
            'allow_unplayable_formats': False,
            'nocheckcertificate': True,
        }

        cookie_file = find_cookie_file()
        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(validated_url_or_reason, download=False)
                if not info:
                    raise ValueError("Could not retrieve Instagram media. The post might be private or removed.")

                raw_title = info.get('description') or info.get('title') or "Instagram Reel"
                clean_title = (raw_title[:80] + "...") if len(raw_title) > 80 else raw_title
                channel = info.get('uploader') or info.get('channel') or info.get('uploader_id') or "Instagram Creator"
                if channel and not channel.startswith("@"):
                    channel = f"@{channel}"

                duration = int(info.get('duration') or 0)
                thumbnail = info.get('thumbnail')
                view_count = info.get('view_count') or info.get('like_count')

                raw_formats = info.get('formats', [])
                video_formats: List[FormatOption] = []
                audio_formats: List[FormatOption] = []

                # Find best video format
                best_video = None
                max_height = 0
                for f in raw_formats:
                    h = f.get('height') or 0
                    if h > max_height:
                        max_height = h
                        best_video = f

                # Provide high-quality 1080p/HD and original stream format options
                res_label = f"{max_height}p HD" if max_height > 0 else "Original Quality"
                video_formats.append(
                    FormatOption(
                        format_id="best",
                        extension="mp4",
                        resolution=res_label,
                        note=f"High Quality MP4 ({res_label})",
                        filesize_approx=best_video.get('filesize') if best_video else None,
                        filesize_formatted=format_bytes(best_video.get('filesize')) if best_video else "High Quality",
                        has_video=True,
                        has_audio=True,
                        media_type=MediaType.VIDEO
                    )
                )

                # Audio format option
                audio_formats.append(
                    FormatOption(
                        format_id="bestaudio",
                        extension="mp3",
                        resolution="Original Audio",
                        note="Instagram Reel Audio (MP3 320kbps)",
                        filesize_approx=None,
                        filesize_formatted="Audio Stream",
                        has_video=False,
                        has_audio=True,
                        media_type=MediaType.AUDIO
                    )
                )

                return MediaMetadata(
                    title=clean_title,
                    url=validated_url_or_reason,
                    thumbnail=thumbnail,
                    channel=channel,
                    duration=duration,
                    duration_formatted=format_duration(duration) if duration > 0 else "Reel",
                    view_count=view_count,
                    video_formats=video_formats,
                    audio_formats=audio_formats,
                    description_snippet=(raw_title[:160] + "...") if len(raw_title) > 160 else raw_title
                )

        except Exception as e:
            err_msg = str(e)
            lower_err = err_msg.lower()
            if "empty media response" in lower_err or "login" in lower_err or "rate-limit" in lower_err:
                raise ValueError(
                    "Instagram temporarily restricted unauthenticated access to this post/reel. "
                    "To access restricted content, please add your 'cookies.txt' file in the backend folder or set the INSTAGRAM_COOKIES environment variable."
                )
            if "private" in lower_err:
                raise ValueError("This Instagram post or reel is from a private account.")
            clean_err = err_msg.replace("ERROR: [Instagram]", "").strip()
            raise ValueError(f"Failed to extract Instagram media: {clean_err}")
