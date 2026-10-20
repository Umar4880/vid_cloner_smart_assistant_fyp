import os
import json
from django.http import HttpResponse
from django.shortcuts import render
from landing_page_module.models import UserProfile
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.core.files.storage import default_storage
from datetime import datetime, timedelta
from django.utils import timezone
from time_table_module.models import TimeTableEntry, DailyProgress, WeeklyProgress
from django.core.serializers.json import DjangoJSONEncoder
from time_table_module.chart_utils import (
    get_daily_progress_chart,
    get_weekly_progress_chart,
    get_course_progress_chart
)

def LandingPage(request):
    return render(request, 'index.html')

@login_required
def Dashboard(request):
    user = request.user
    try:
        # Fetch the UserProfile instance or create it if it doesn't exist
        user_profile, created = UserProfile.objects.get_or_create(user=user)

        # Format the last name to replace underscores with spaces
        formatted_last_name = user.last_name.replace("_", " ") 
        formatted_first_name = user.first_name.replace("_", " ") 
        
        # Get the current date - use timezone.now() for timezone awareness
        today = timezone.now().date()
        today_date = today.strftime("%A, %d %B %Y")  # Format: Monday, 28 April 2025
        
        # Debug logs - what is today's date?
        print(f"DEBUG: Today's date is {today} (type: {type(today)})")
        
        # Import TimeTableEntry model
        from time_table_module.models import TimeTableEntry
        
        # Debug - check all TimeTableEntry objects for this user
        all_entries = TimeTableEntry.objects.filter(user=user)
        print(f"DEBUG: Total timetable entries for user: {all_entries.count()}")
        for entry in all_entries:
            print(f"DEBUG: Entry date {entry.date} (type: {type(entry.date)}), course: {entry.course.name}, start: {entry.start_time}")
        
        # Get today's timetable entries
        daily_timetable = TimeTableEntry.objects.filter(
            user=user, 
            date=today
        ).select_related('course')
        
        print(f"DEBUG: Found {daily_timetable.count()} entries specifically for today ({today})")
        
        # Get progress data for the past 7 days
        past_7_days = []
        for i in range(6, -1, -1):  # From 6 days ago to today
            day_date = today - timedelta(days=i)
            try:
                daily_progress = DailyProgress.objects.get(user=user, date=day_date)
                past_7_days.append({
                    'date': day_date.strftime('%a %d %b'),
                    'total_slots': daily_progress.total_slots,
                    'completed_slots': daily_progress.completed_slots,
                    'completion_percentage': daily_progress.completion_percentage,
                })
            except DailyProgress.DoesNotExist:
                past_7_days.append({
                    'date': day_date.strftime('%a %d %b'),
                    'total_slots': 0,
                    'completed_slots': 0,
                    'completion_percentage': 0,
                })
        
        # Get the current week's progress
        try:
            current_week_progress = WeeklyProgress.get_current_week_progress(user)
            weekly_data = {
                'total_slots': current_week_progress.total_slots,
                'completed_slots': current_week_progress.completed_slots,
                'completion_percentage': current_week_progress.completion_percentage,
            }
        except Exception as e:
            weekly_data = {
                'total_slots': 0,
                'completed_slots': 0,
                'completion_percentage': 0,
            }
            print(f"Error fetching weekly progress: {e}")
        
        # Generate matplotlib charts
        daily_progress_chart = get_daily_progress_chart(user)
        weekly_progress_chart = get_weekly_progress_chart(user)
        course_progress_chart = get_course_progress_chart(user)
        
        # Serialize data to JSON for JavaScript
        weekly_progress_json = json.dumps(weekly_data, cls=DjangoJSONEncoder)
        past_7_days_json = json.dumps(past_7_days, cls=DjangoJSONEncoder)
        
        context = {
            'profile_picture_url': user_profile.profile_picture.url if user_profile.profile_picture else None,
            'avatar_background_color': user_profile.background_color,
            'user': user,
            'formatted_last_name': formatted_last_name,
            'formatted_first_name': formatted_first_name,
            'past_7_days': past_7_days_json,
            'weekly_progress': weekly_progress_json,
            'daily_progress_chart': daily_progress_chart,
            'weekly_progress_chart': weekly_progress_chart,
            'course_progress_chart': course_progress_chart,
            'daily_timetable': daily_timetable,
            'today_date': today_date,
        }
        
        # Debug log the context
        print(f"DEBUG: Timetable context has {len(daily_timetable)} entries")
        
        return render(request, 'Dashboard.html', context)

    except Exception as e:
        print(f"Dashboard error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"success": False, "message": f"An unexpected error occurred: {e}"}, status=500)

@login_required
def get_user_profile(request):
    user = request.user
    try:
        # Fetch user's profile
        profile = UserProfile.objects.get(user=user)
        profile_picture_url = profile.profile_picture.url if profile.profile_picture else None
        # Construct the background color for the initials (can be a random color or derived from the user's name)
        background_color = profile.background_color if profile.background_color else "#000000"
        initials = user.first_name[:1].upper() + user.last_name[:1].upper()

        print(background_color)
        print(profile_picture_url)
        return JsonResponse({
            'success': True,
            'profile_picture_url': profile_picture_url,
            'initials': initials,
            'background_color': background_color,
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User profile not found!'}, status=404)

@login_required
@csrf_protect
def upload_profile_picture(request):
    if request.method == 'POST' and request.FILES.get('profile_pic'):
        user = request.user
        file = request.FILES['profile_pic']

        # Validate file type and size
        if file.content_type not in ['image/png', 'image/jpeg']:
            return JsonResponse({'success': False, 'message': 'Invalid file format! Only PNG and JPEG are supported.'}, status=400)
        if file.size > 5 * 1024 * 1024:  # 5 MB
            return JsonResponse({'success': False, 'message': 'File size exceeds 5MB!'}, status=400)

        # Delete existing profile picture if any
        if user.profile.profile_picture:
            old_file_path = user.profile.profile_picture.path
            if os.path.exists(old_file_path):
                os.remove(old_file_path)

        # Save new profile picture
        file_path = default_storage.save(f'profile_pictures/{user.id}_{file.name}', file)
        user.profile.profile_picture.name = file_path
        user.profile.save()

        # Return JSON response with the URL of the uploaded image
        return JsonResponse({'success': True, 'image_url': default_storage.url(file_path)})

    return JsonResponse({'success': False, 'message': 'Invalid request.'}, status=400)
