"""
AssemblyAI transcription utilities.

Provides:
1. stream_upload_to_assemblyai() - Streaming proxy that pipes bytes directly to AssemblyAI
2. transcribe_from_url() - Request transcription from an upload_url
3. transcribe_file() - Upload + transcribe in one call (server-side)
"""

import os
import logging
from pathlib import Path
from typing import BinaryIO, Optional
from django.core.cache import cache
from django.views.decorators.http import require_GET


import httpx
import assemblyai as aai
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from dotenv import load_dotenv
from asgiref.sync import sync_to_async


# Ensure .env is loaded
_ENV_FILE = Path(__file__).resolve().parents[2] / '.env'
load_dotenv(_ENV_FILE)

logger = logging.getLogger(__name__)

# Timeouts
UPLOAD_TIMEOUT = 600.0  # 10 minutes for large files
TRANSCRIBE_TIMEOUT = 1800.0  # 30 minutes for long transcriptions

# AssemblyAI endpoints
ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v3/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v3/transcript"


class TranscriptionError(Exception):
    """Raised when AssemblyAI transcription fails."""
    pass


def _get_api_key() -> str:
    """Get AssemblyAI API key from environment."""
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise TranscriptionError(
            f"ASSEMBLYAI_API_KEY is not set. Checked .env at: {_ENV_FILE} (exists: {_ENV_FILE.exists()})"
        )
    return api_key


def _get_transcriber() -> aai.Transcriber:
    """Initialize AssemblyAI SDK transcriber."""
    aai.settings.api_key = _get_api_key()
    aai.settings.http_timeout = UPLOAD_TIMEOUT
    return aai.Transcriber()


CHUNK_SIZE = 256 * 1024  # 256KB
# ...existing code...


def _stream_file_to_assemblyai(file_obj, cache_key: Optional[str] = None) -> str:
    """
    Stream a file-like or Django UploadedFile to AssemblyAI and optionally update cache_key
    with percentage progress (0-100). Returns the upload_url on success.
    """
    api_key = _get_api_key()

    # Try to determine total size
    total = getattr(file_obj, "size", None)
    # fallback: file-like with fileno/stat if available
    if total is None:
        try:
            pos = file_obj.tell()
            file_obj.seek(0, os.SEEK_END)
            total = file_obj.tell()
            file_obj.seek(pos or 0)
        except Exception:
            total = None

    bytes_sent = 0

    def gen():
        nonlocal bytes_sent
        # Django UploadedFile exposes .chunks(); prefer that to avoid loading in memory
        if hasattr(file_obj, "chunks"):
            for chunk in file_obj.chunks(CHUNK_SIZE):
                yield chunk
                bytes_sent += len(chunk)
                if cache_key and total:
                    pct = int(bytes_sent * 100 / total)
                    cache.set(cache_key, pct, timeout=int(UPLOAD_TIMEOUT))
        else:
            # generic file-like
            while True:
                chunk = file_obj.read(CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
                bytes_sent += len(chunk)
                if cache_key and total:
                    pct = int(bytes_sent * 100 / total)
                    cache.set(cache_key, pct, timeout=int(UPLOAD_TIMEOUT))

    with httpx.Client(timeout=UPLOAD_TIMEOUT) as client:
        response = client.post(
            ASSEMBLYAI_UPLOAD_URL,
            headers={
                "authorization": api_key,
                "Content-Type": "application/octet-stream",
            },
            content=gen(),
        )

    if response.status_code != 200:
        if cache_key:
            cache.set(cache_key, -1, timeout=60)  # indicate error
        raise TranscriptionError(f"Upload failed: {response.status_code} {response.text}")

    upload_url = response.json().get("upload_url")
    if cache_key:
        cache.set(cache_key, 100, timeout=60)
        cache.set(f"upload_url:{cache_key}", upload_url, timeout=3600)
    return upload_url


# Backwards-compatible helper used by server-side code that already has a file object
def upload_file_to_assemblyai(file_obj) -> str:
    """
    Upload a file-like object to AssemblyAI (server-side). Returns upload_url.
    """
    return _stream_file_to_assemblyai(file_obj, cache_key=None)


@require_POST
def upload_with_progress(request):
    """
    Django view: stream the multipart-uploaded file from this request directly to AssemblyAI
    while updating cache with percentage progress. Frontend should POST 'video' and can
    optionally provide 'upload_id' (otherwise one is generated). Returns JSON with upload_id and upload_url.
    """
    if "video" not in request.FILES:
        return JsonResponse({"error": "No video file provided."}, status=400)

    upload_id = request.POST.get("upload_id") or str(uuid.uuid4())
    cache_key = f"upload_progress:{upload_id}"
    cache.set(cache_key, 0, timeout=int(UPLOAD_TIMEOUT))

    video_file = request.FILES["video"]

    try:
        upload_url = _stream_file_to_assemblyai(video_file, cache_key=cache_key)
    except TranscriptionError as e:
        return JsonResponse({"error": "upload_failed", "details": str(e)}, status=500)
    except Exception as e:
        cache.set(cache_key, -1, timeout=60)
        return JsonResponse({"error": "unexpected_error", "details": str(e)}, status=500)

    return JsonResponse({"upload_id": upload_id, "upload_url": upload_url})


@require_GET
def get_upload_progress(request, upload_id: str):
    """
    Poll this to get server-side upload-to-AssemblyAI progress (0-100, -1 on error).
    """
    cache_key = f"upload_progress:{upload_id}"
    progress = cache.get(cache_key)
    upload_url = cache.get(f"upload_url:{cache_key}")
    if progress is None:
        return JsonResponse({"upload_id": upload_id, "progress": None}, status=404)
    return JsonResponse({"upload_id": upload_id, "progress": int(progress), "upload_url": upload_url})
# ...existing code..