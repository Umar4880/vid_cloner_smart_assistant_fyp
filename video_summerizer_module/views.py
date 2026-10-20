from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import SummarizedNote
from APIs.common.assemblyai_transcriber import (
    stream_upload_to_assemblyai,
    get_upload_token,
    upload_file_to_assemblyai,
)
from django.contrib.auth.decorators import login_required
import json
import logging
from APIs.summerizer.chain import Summarizer_chain
from uuid import uuid4

# Set up logger
logger = logging.getLogger(__name__)

# Renders the summarizer HTML page
@login_required
def summerizer(request):
    user = request.user
    
    # Format the first and last name for the welcome message
    formatted_first_name = user.first_name.capitalize() if user.first_name else user.username.split('_')[0].capitalize()
    formatted_last_name = user.last_name.capitalize() if user.last_name else (user.username.split('_')[1].capitalize() if '_' in user.username else '')
    
    context = {
        'formatted_first_name': formatted_first_name,
        'formatted_last_name': formatted_last_name,
    }
    
    return render(request, 'video_summerizer_module/summerizer.html', context)


# ── Generate notes (upload or YouTube) ───────────────────────────

@login_required
def get_temporary_token(request):
    """DEPRECATED: Return a short-lived AssemblyAI upload token as JSON."""
    try:
        data=json.loads(request.body)
        print("timeout is ", data.get('timeout'))
        return get_upload_token(data)
    except Exception as e:
        print(f"get_temporary_token error: {e}", exc_info=True)
        return JsonResponse({'error': 'Failed to obtain upload token.'}, status=500)


@csrf_exempt
@require_POST
async def stream_upload(request):
    """
    Streaming upload proxy endpoint.
    
    Frontend POSTs the video file here, and we stream it directly to AssemblyAI
    without buffering the entire file in memory. Returns {"upload_url": "..."}.
    
    This is MUCH faster than the old token-based approach because:
    1. No temporary token required (uses API key directly on server)
    2. Streaming - upload starts immediately, no full buffering
    3. Single hop - frontend -> your server -> AssemblyAI (all streaming)
    """

    return upload_file_to_assemblyai(request)

# ...existing code...
from django.core.files.storage import default_storage
from uuid import uuid4

def upload_video(request):
    if request.method != "POST":
        return JsonResponse({'error': 'POST Required'}, status=405)

    video_file = request.FILES.get('video')
    if not video_file:
        return JsonResponse({'error': 'No file provided'}, status=400)

    try:
        filename = f"videos/{uuid4().hex}_{video_file.name}"
        saved_path = default_storage.save(filename, video_file)  # streams to disk safely
        file_url = default_storage.url(saved_path)
        return JsonResponse({'success': 'video uploaded successfully', 'path': saved_path, 'url': file_url}, status=200)
    except Exception as e:
        logger.error("Unable to save uploaded video: %s", e, exc_info=True)
        return JsonResponse({'error':'unable to upload video'}, status=500)

@login_required
def generate_notes(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required.'}, status=405)

    source_type = request.POST.get('source_type', 'upload')
    mode = request.POST.get('mode', 'fast')
    youtube_url = request.POST.get('youtube_url', '').strip()
    instructions = request.POST.get('instructions', '').strip() or None
    
    # NEW: Get the upload_url string from frontend
    upload_url = request.POST.get('upload_url') 
    video_file = request.FILES.get('video')

    # Validation logic
    if source_type == 'upload' and not (upload_url or video_file):
        return JsonResponse({'error': 'No video or upload URL provided.'}, status=400)
    
    try:
        # Pass the upload_url or file to the chain - it handles transcription internally
        chain = Summarizer_chain(
            user_id=str(request.user.id),
            session_id=request.session.session_key or 'default',
            source_type=source_type,
            source_url=youtube_url if source_type == 'youtube' else None,
            upload_url=upload_url if source_type == 'upload' else None,
            upload_file=video_file if (source_type == 'upload' and not upload_url) else None,
            mode=mode,
            action='generate',
        )
        notes = chain.invoke(user_input=instructions)
        return JsonResponse({'notes': notes})
    except Exception as e:
        logger.error(f"generate_notes error: {e}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)
    
# ── Update existing notes ────────────────────────────────────────

@login_required
def update_notes(request):
    """
    POST form-data:
      session_id      : int
      source_type  : "upload" | "youtube"
      mode         : "fast"   | "precise"
      instructions : str
      video        : file  (optional re-upload)
      youtube_url  : str   (optional)
      image        : file  (optional screenshot)
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required.'}, status=405)

    note_id = request.POST.get('session_id')
    source_type = request.POST.get('source_type', 'upload')
    mode = request.POST.get('mode', 'fast')
    youtube_url = request.POST.get('youtube_url', '').strip()
    instructions = request.POST.get('instructions', '').strip()
    upload_url = request.POST.get('upload_url', '').strip()
    image_file = request.FILES.get('image')

    if not note_id:
        return JsonResponse({'error': 'note_id is required.'}, status=400)

    user_input = instructions
    if image_file:
        user_input += "\n[User attached an image/screenshot for reference.]"

    try:
        chain = Summarizer_chain(
            user_id=str(request.user.id),
            session_id=request.session.session_key or 'default',
            source_type=source_type,
            source_url=youtube_url if source_type == 'youtube' else None,
            upload_url=upload_url if source_type == 'upload' else None,
            mode=mode,
            action='update',
        )
        updated_notes = chain.invoke(user_input=user_input)

        # persist
        try:
            note = SummarizedNote.objects.get(id=note_id, user=request.user)
            note.notes = updated_notes
            note.save()
        except SummarizedNote.DoesNotExist:
            pass

        return JsonResponse({'notes': updated_notes})
    except Exception as e:
        logger.error(f"update_notes error: {e}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


# ── CRUD helpers ─────────────────────────────────────────────────


@login_required
def save_notes(request):
    if request.method == 'POST':
        try:
            # Parse JSON data from the request body
            data = json.loads(request.body)
            notes = data.get('notes', '')
            title = data.get('title', '')

            if not notes:
                return JsonResponse({'success': False, 'message': 'Notes content is required.'})
            # Save the notes to the database
            summarized_note = SummarizedNote.objects.create(
                user=request.user,
                session_id = str(uuid4()),
                title=title,
                notes=notes
            )

            return JsonResponse({'success': True, 'message': 'Notes saved successfully!', 'note_id': summarized_note.id})
        except json.JSONDecodeError:
            logger.error("Invalid JSON data received")
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'})
        except Exception as e:
            logger.error(f"Error saving notes: {str(e)}", exc_info=True)
            return JsonResponse({'success': False, 'message': 'An unexpected error occurred.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@login_required
def get_titles(request):
    try:
        logger.info(f"get_titles called by user: {request.user.username}")
        summaries = SummarizedNote.objects.filter(user=request.user).values('id', 'title')
        titles_list = list(summaries)
        logger.debug(f"Returning {len(titles_list)} titles")
        return JsonResponse(titles_list, safe=False)
    except Exception as e:
        logger.error(f"Error in get_titles: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def get_summary(request, summary_id):
    try:
        summary = SummarizedNote.objects.get(id=summary_id, user=request.user)
        return JsonResponse({'title': summary.title, 'notes': summary.notes})
    except SummarizedNote.DoesNotExist:
        logger.warning(f"Summary not found: ID {summary_id} for user {request.user.username}")
        return JsonResponse({'error': 'Summary not found'}, status=404)
    except Exception as e:
        logger.error(f"Error retrieving summary: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)


@login_required
def rename_note(request, note_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_title = data.get('title', '').strip()
            if not new_title:
                return JsonResponse({'success': False, 'message': 'Title cannot be empty.'})

            note = SummarizedNote.objects.get(id=note_id, user=request.user)
            note.title = new_title
            note.save()

            return JsonResponse({'success': True, 'message': 'Title renamed successfully!'})
        except SummarizedNote.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Note not found.'}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            logger.error(f"Error renaming note: {str(e)}", exc_info=True)
            return JsonResponse({'success': False, 'message': 'An unexpected error occurred.'}, status=500)
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)


@login_required
def delete_note(request, note_id):
    if request.method == 'DELETE':
        try:
            note = SummarizedNote.objects.get(id=note_id, user=request.user)
            note.delete()
            return JsonResponse({'success': True, 'message': 'Note deleted successfully!'})
        except SummarizedNote.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Note not found.'}, status=404)
        except Exception as e:
            logger.error(f"Error deleting note: {str(e)}", exc_info=True)
            return JsonResponse({'success': False, 'message': 'An unexpected error occurred.'}, status=500)
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)