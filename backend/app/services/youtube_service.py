import yt_dlp
import math
from typing import Optional, Dict, Any, List
from app.models.schemas import MediaMetadata, FormatOption, MediaType
from app.utils.security import validate_youtube_url

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
        return "Unknown size"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

class YouTubeService:
    @staticmethod
    def extract_metadata(url: str) -> MediaMetadata:
        is_valid, validated_url_or_reason = validate_youtube_url(url)
        if not is_valid:
            raise ValueError(validated_url_or_reason)

        ydl_opts = {
            'skip_download': True,
            'extract_flat': False,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': False,
            'allow_unplayable_formats': False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(validated_url_or_reason, download=False)
                if not info:
                    raise ValueError("Could not retrieve media details for this URL.")

                raw_formats = info.get('formats', [])
                video_formats_map: Dict[str, FormatOption] = {}
                audio_formats_map: Dict[str, FormatOption] = {}

                # Sort formats into video and audio categories
                for f in raw_formats:
                    format_id = f.get('format_id')
                    ext = f.get('ext', 'mp4')
                    vcodec = f.get('vcodec', 'none')
                    acodec = f.get('acodec', 'none')
                    height = f.get('height')
                    width = f.get('width')
                    fps = f.get('fps')
                    filesize = f.get('filesize') or f.get('filesize_approx')

                    has_video = vcodec != 'none' and vcodec is not None
                    has_audio = acodec != 'none' and acodec is not None

                    # Only present clean progressive formats or popular stream options
                    if has_video:
                        res_label = f"{height}p" if height else (f"{width}x{height}" if width and height else "SD")
                        # Skip ultra low resolution duplicates if better exist
                        key = f"{res_label}_{ext}"
                        
                        note = f.get('format_note') or (f"Video ({res_label})" if height else "Video")
                        
                        fmt_option = FormatOption(
                            format_id=format_id,
                            extension=ext if ext in ['mp4', 'webm', 'mkv'] else 'mp4',
                            resolution=res_label,
                            note=note,
                            filesize_approx=filesize,
                            filesize_formatted=format_bytes(filesize),
                            has_video=True,
                            has_audio=has_audio,
                            media_type=MediaType.VIDEO,
                            fps=fps
                        )
                        if key not in video_formats_map or (filesize and not video_formats_map[key].filesize_approx):
                            video_formats_map[key] = fmt_option

                    elif has_audio and not has_video:
                        abr = f.get('abr')
                        res_label = f"{int(abr)} kbps" if abr else "High Quality Audio"
                        key = f"audio_{ext}_{abr or 'default'}"
                        
                        fmt_option = FormatOption(
                            format_id=format_id,
                            extension="mp3" if ext in ["mp3", "m4a", "webm", "opus"] else ext,
                            resolution=res_label,
                            note=f"Audio ({res_label})",
                            filesize_approx=filesize,
                            filesize_formatted=format_bytes(filesize),
                            has_video=False,
                            has_audio=True,
                            media_type=MediaType.AUDIO,
                            fps=None
                        )
                        audio_formats_map[key] = fmt_option

                # Sort video options by resolution priority (1080p, 720p, 480p, 360p, etc.)
                def parse_res(fmt: FormatOption) -> int:
                    res_str = fmt.resolution or "0"
                    res_num = ''.join(filter(str.isdigit, res_str))
                    return int(res_num) if res_num else 0

                sorted_video = sorted(video_formats_map.values(), key=parse_res, reverse=True)
                
                # Filter down to standard resolutions (2160p 4K, 1440p 2K, 1080p, 720p, 480p, 360p)
                filtered_video: List[FormatOption] = []
                seen_res = set()
                for fmt in sorted_video:
                    res_val = parse_res(fmt)
                    if res_val in [2160, 1440, 1080, 720, 480, 360, 240, 144] and res_val not in seen_res:
                        seen_res.add(res_val)
                        filtered_video.append(fmt)
                    elif not filtered_video and len(seen_res) < 6:
                        filtered_video.append(fmt)

                # Fallback if no specific progressive format match found
                if not filtered_video:
                    filtered_video = sorted_video[:4]

                sorted_audio = list(audio_formats_map.values())[:3]
                if not sorted_audio:
                    # Provide default standard audio option
                    sorted_audio = [
                        FormatOption(
                            format_id="bestaudio",
                            extension="mp3",
                            resolution="320 kbps",
                            note="High Quality MP3 Audio",
                            filesize_approx=None,
                            filesize_formatted="Auto calculated",
                            has_video=False,
                            has_audio=True,
                            media_type=MediaType.AUDIO
                        )
                    ]

                duration = info.get('duration')
                return MediaMetadata(
                    title=info.get('title', 'YouTube Media'),
                    url=validated_url_or_reason,
                    thumbnail=info.get('thumbnail') or (info.get('thumbnails')[-1]['url'] if info.get('thumbnails') else None),
                    channel=info.get('uploader') or info.get('channel') or 'YouTube Creator',
                    duration=duration,
                    duration_formatted=format_duration(duration),
                    view_count=info.get('view_count'),
                    video_formats=filtered_video,
                    audio_formats=sorted_audio,
                    description_snippet=(info.get('description') or '')[:160]
                )

        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            if "Private video" in err_msg:
                raise ValueError("This video is private and cannot be accessed.")
            elif "Video unavailable" in err_msg:
                raise ValueError("This video is unavailable or has been removed.")
            elif "Age-restricted" in err_msg:
                raise ValueError("Age-restricted media cannot be retrieved per safety compliance.")
            elif "Members-only" in err_msg:
                raise ValueError("Members-only or paywalled content cannot be downloaded.")
            raise ValueError("Unable to retrieve YouTube video metadata. Please verify the URL.")
        except Exception as e:
            raise ValueError(f"Failed to process YouTube link: {str(e)}")

    @staticmethod
    def search_videos(query: str, limit: int = 10) -> List[Any]:
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        ydl_opts = {
            'skip_download': True,
            'extract_flat': True,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': True,
        }

        search_expr = f"ytsearch{limit}:{clean_query}"
        results = []

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(search_expr, download=False)
                if not info or 'entries' not in info:
                    return []

                for entry in info['entries']:
                    if not entry:
                        continue
                    
                    video_id = entry.get('id')
                    if not video_id:
                        continue

                    duration = entry.get('duration')
                    # Format thumbnail URL
                    thumbnails = entry.get('thumbnails')
                    thumb_url = entry.get('thumbnail') or (thumbnails[-1]['url'] if thumbnails else f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")

                    results.append({
                        "id": video_id,
                        "title": entry.get('title', 'YouTube Video'),
                        "url": f"https://www.youtube.com/watch?v={video_id}" if not entry.get('url', '').startswith('http') else entry.get('url'),
                        "thumbnail": thumb_url,
                        "channel": entry.get('uploader') or entry.get('channel') or 'Creator',
                        "duration": duration,
                        "duration_formatted": format_duration(duration),
                        "view_count": entry.get('view_count'),
                    })

                return results
        except Exception as e:
            raise ValueError(f"Search failed: {str(e)}")
