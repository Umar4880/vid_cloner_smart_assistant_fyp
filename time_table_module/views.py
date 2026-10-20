from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .models import StudyPreferences, Course, DailyProgress, WeeklyProgress, TimeTableEntry
import json
from datetime import datetime, timedelta, date
import time

@login_required
def timetable(request):
    """
    Render the timetable page and provide the raw data for client-side processing.
    """
    user = request.user
    context = {}
    
    # Check if the user has any study preferences
    has_preferences = False
    has_courses = False
    
    try:
        study_prefs = StudyPreferences.objects.get(user=user)
        has_preferences = True
        
        # Prepare preference data for the client
        preferences_data = {
            'study_goal': study_prefs.study_goal,
            'preferred_study_hours': study_prefs.preferred_study_hours,
            'morning_study': study_prefs.morning_study,
            'afternoon_study': study_prefs.afternoon_study,
            'evening_study': study_prefs.evening_study,
            'night_study': study_prefs.night_study,
            'break_duration': study_prefs.break_duration,
            'break_frequency': study_prefs.break_frequency
        }
        context['preferences'] = preferences_data
        
        # Check if user has courses
        courses = Course.objects.filter(user=user)
        if courses.exists():
            has_courses = True
            
            # Prepare course data for the client
            course_data = []
            for course in courses:
                course_data.append({
                    'id': course.id,
                    'name': course.name,
                    'course_type': course.course_type,
                    'difficulty': course.difficulty,
                    'priority': course.priority,
                    'deadline': course.deadline.strftime('%Y-%m-%d')
                })
            context['courses'] = course_data
                
    except StudyPreferences.DoesNotExist:
        pass
    
    context['has_preferences'] = has_preferences
    context['has_courses'] = has_courses
    
    return render(request, 'timetable.html', context)

@login_required
def save_study_preferences(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract data from the request
            study_goal = data.get('studyGoal')
            preferred_study_hours = data.get('preferredStudyHours')
            morning_study = data.get('morningStudy', False)
            afternoon_study = data.get('afternoonStudy', False)
            evening_study = data.get('eveningStudy', False)
            night_study = data.get('nightStudy', False)
            break_duration = data.get('breakDuration')
            break_frequency = data.get('breakFrequency')
            study_intensity = data.get('studyIntensity', 'balanced')
            custom_free_slots = data.get('customFreeSlots')
            
            # Update or create study preferences for the user
            study_prefs, created = StudyPreferences.objects.update_or_create(
                user=request.user,
                defaults={
                    'study_goal': study_goal,
                    'preferred_study_hours': preferred_study_hours,
                    'morning_study': morning_study,
                    'afternoon_study': afternoon_study,
                    'evening_study': evening_study,
                    'night_study': night_study,
                    'break_duration': break_duration,
                    'break_frequency': break_frequency,
                    'study_intensity': study_intensity,
                    'custom_free_slots': custom_free_slots if study_intensity == 'custom' else None
                }
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Study preferences saved successfully!'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error saving study preferences: {str(e)}'
            }, status=400)
            
    return JsonResponse({
        'success': False,
        'message': 'Invalid request method'
    }, status=405)

@login_required
def add_course(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract data from the request
            name = data.get('name')
            course_type = data.get('courseType')
            difficulty = data.get('difficulty')
            priority = data.get('priority')
            deadline_str = data.get('deadline')
            
            # Validate required fields
            if not all([name, course_type, difficulty, priority, deadline_str]):
                return JsonResponse({
                    'success': False,
                    'message': 'All fields are required.'
                }, status=400)
            
            # Parse deadline date
            try:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid date format for deadline.'
                }, status=400)
            
            # Create new course
            course = Course.objects.create(
                user=request.user,
                name=name,
                course_type=course_type,
                difficulty=difficulty,
                priority=priority,
                deadline=deadline
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Course added successfully!',
                'course': {
                    'id': course.id,
                    'name': course.name,
                    'course_type': course.course_type,
                    'difficulty': course.difficulty,
                    'priority': course.priority,
                    'deadline': deadline_str
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error adding course: {str(e)}'
            }, status=400)
            
    return JsonResponse({
        'success': False,
        'message': 'Invalid request method'
    }, status=405)

@login_required
def generate_timetable(request):
    """
    API endpoint that provides raw data for client-side timetable generation
    and saves the timetable entries for today to the database.
    """
    if request.method == 'POST':
        try:
            user = request.user
            
            # Get user's study preferences
            try:
                study_prefs = StudyPreferences.objects.get(user=user)
                preferences_data = {
                    'study_goal': study_prefs.study_goal,
                    'preferred_study_hours': study_prefs.preferred_study_hours,
                    'morning_study': study_prefs.morning_study,
                    'afternoon_study': study_prefs.afternoon_study,
                    'evening_study': study_prefs.evening_study,
                    'night_study': study_prefs.night_study,
                    'break_duration': study_prefs.break_duration,
                    'break_frequency': study_prefs.break_frequency,
                    'study_intensity': study_prefs.study_intensity,
                    'custom_free_slots': study_prefs.custom_free_slots
                }
            except StudyPreferences.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Please set your study preferences first.'
                }, status=400)
            
            # Get user's courses
            courses = Course.objects.filter(user=user).order_by('deadline', '-priority')
            
            if not courses.exists():
                return JsonResponse({
                    'success': False,
                    'message': 'Please add at least one course before generating a timetable.'
                }, status=400)
            
            # Prepare course data
            course_data = []
            for course in courses:
                course_data.append({
                    'id': course.id,
                    'name': course.name,
                    'course_type': course.course_type,
                    'difficulty': course.difficulty,
                    'priority': course.priority,
                    'deadline': course.deadline.strftime('%Y-%m-%d')
                })
                
            today = date.today()
            
            # Generate and save timetable entries for today
            generated_entries = generate_and_save_timetable_entries(user, courses, study_prefs, today)
            
            # Return the raw data that will be used by client to generate timetable
            return JsonResponse({
                'success': True,
                'message': 'Data retrieved successfully for timetable generation!',
                'preferences': preferences_data,
                'courses': course_data,
                'today': today.strftime('%Y-%m-%d')
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error retrieving data: {str(e)}'
            }, status=400)
            
    return JsonResponse({
        'success': False,
        'message': 'Invalid request method'
    }, status=405)

def generate_and_save_timetable_entries(user, courses, preferences, target_date):
    """
    Generate timetable entries for a specific date and save them to the database.
    
    Args:
        user: The user for whom the timetable is being generated
        courses: QuerySet of Course objects
        preferences: StudyPreferences object
        target_date: Date object for which to generate the timetable
    
    Returns:
        List of generated TimeTableEntry objects
    """
    # First, remove any existing entries for this date
    TimeTableEntry.objects.filter(user=user, date=target_date).delete()
    
    # Set up time preferences
    study_times = []
    if preferences.morning_study: study_times.append('Morning')
    if preferences.afternoon_study: study_times.append('Afternoon')
    if preferences.evening_study: study_times.append('Evening')
    if preferences.night_study: study_times.append('Night')
    if not study_times: study_times = ['Morning', 'Afternoon', 'Evening']
    
    # Static time slots - same as in timetable.js
    time_slot_map = {
        'Morning': ['08:00 - 09:15', '09:30 - 10:45', '11:00 - 12:15'],
        'Afternoon': ['13:00 - 14:15', '14:30 - 15:45', '16:00 - 17:15'],
        'Evening': ['18:00 - 19:15', '19:30 - 20:45', '21:00 - 22:15'],
    }
    
    # Used time slots
    used_time_slots = set()
    
    # Last used time slot for each course
    course_last_time_slot = {course.id: None for course in courses}
    
    # Calculate sessions needed for each course
    course_sessions = {}
    for course in courses:
        sessions = 1  # Default is 1 session
        
        # Adjust based on difficulty
        if course.difficulty == 'Hard':
            sessions = 3
        elif course.difficulty == 'Medium':
            sessions = 2
        
        # Adjust for high priority
        if course.priority == 'High':
            sessions += 1
            
        course_sessions[course.id] = sessions
    
    # Function to parse time from string (e.g. "08:00")
    def parse_time(time_str):
        hour, minute = map(int, time_str.split(':'))
        return datetime.strptime(f"{hour:02d}:{minute:02d}", "%H:%M").time()
    
    # Function to get available time slots for a course
    def get_available_time_slots(course_id, preferred_times):
        available_slots = []
        last_used = course_last_time_slot[course_id]
        
        for time_of_day in preferred_times:
            slots = time_slot_map.get(time_of_day, [])
            for slot in slots:
                if slot not in used_time_slots and slot != last_used:
                    available_slots.append((time_of_day, slot))
        
        # Shuffle for variety
        import random
        random.shuffle(available_slots)
        return available_slots
    
    # Created entries to return
    created_entries = []
    
    # Sort courses by priority and deadline
    sorted_courses = sorted(
        courses, 
        key=lambda c: (-1 if c.priority == 'High' else (0 if c.priority == 'Medium' else 1), c.deadline)
    )
    
    # Assign one session per course for today (if within deadline)
    for course in sorted_courses:
        # Skip if deadline is before today
        if course.deadline < target_date:
            continue
            
        # Get available time slots
        available_slots = get_available_time_slots(course.id, study_times)
        
        if available_slots:
            # Select the first available slot
            time_of_day, time_slot = available_slots[0]
            start_str, end_str = time_slot.split(' - ')
            
            # Create TimeTableEntry
            entry = TimeTableEntry.objects.create(
                user=user,
                course=course,
                date=target_date,
                start_time=parse_time(start_str),
                end_time=parse_time(end_str),
                status='pending'
            )
            
            # Mark this slot as used
            used_time_slots.add(time_slot)
            course_last_time_slot[course.id] = time_slot
            created_entries.append(entry)
    
    return created_entries

@login_required
def get_today_timetable(request):
    """
    API endpoint to get today's timetable entries from the database.
    """
    today = date.today()
    
    # Get today's entries
    entries = TimeTableEntry.objects.filter(
        user=request.user,
        date=today
    ).select_related('course').order_by('start_time')
    
    # Format the entries for JSON
    entries_data = []
    for entry in entries:
        entries_data.append({
            'id': entry.id,
            'course_name': entry.course.name,
            'course_id': entry.course.id,
            'difficulty': entry.course.difficulty,
            'priority': entry.course.priority,
            'deadline': entry.course.deadline.strftime('%Y-%m-%d'),
            'start_time': entry.start_time.strftime('%H:%M'),
            'end_time': entry.end_time.strftime('%H:%M'),
            'time_slot': f"{entry.start_time.strftime('%H:%M')} - {entry.end_time.strftime('%H:%M')}",
            'status': entry.status
        })
    
    return JsonResponse({
        'success': True,
        'today': today.strftime('%Y-%m-%d'),
        'entries': entries_data
    })

@login_required
def update_entry_status(request):
    """
    API endpoint to update the status of a timetable entry.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            entry_id = data.get('entry_id')
            new_status = data.get('status')
            
            if not entry_id or not new_status:
                return JsonResponse({
                    'success': False, 
                    'message': 'Entry ID and status are required.'
                }, status=400)
                
            # Validate status
            if new_status not in [status[0] for status in TimeTableEntry.STATUS_CHOICES]:
                return JsonResponse({
                    'success': False,
                    'message': f'Invalid status: {new_status}'
                }, status=400)
            
            # Get and update the entry
            try:
                entry = TimeTableEntry.objects.get(id=entry_id, user=request.user)
                entry.status = new_status
                
                # If marking as completed, record the completion time
                if new_status == 'completed':
                    entry.completed_at = timezone.now()
                    
                entry.save()
                
                # Update daily progress
                DailyProgress.calculate_daily_progress(request.user, entry.date)
                
                return JsonResponse({
                    'success': True,
                    'message': f'Entry status updated to {new_status}'
                })
                
            except TimeTableEntry.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': 'Entry not found or access denied.'
                }, status=404)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error updating entry: {str(e)}'
            }, status=400)
            
    return JsonResponse({
        'success': False,
        'message': 'Invalid request method'
    }, status=405)

@login_required
def generate_pdf_timetable(request):
    """
    Generate a PDF version of the user's timetable.
    """
    user = request.user
    context = {}

    try:
        # Get user's study preferences
        study_prefs = StudyPreferences.objects.get(user=user)
        preferences_data = {
            'study_goal': study_prefs.study_goal,
            'preferred_study_hours': study_prefs.preferred_study_hours,
            'morning_study': study_prefs.morning_study,
            'afternoon_study': study_prefs.afternoon_study,
            'evening_study': study_prefs.evening_study,
            'night_study': study_prefs.night_study,
            'break_duration': study_prefs.break_duration,
            'break_frequency': study_prefs.break_frequency
        }
        context['preferences'] = preferences_data

        # Get user's courses
        courses = Course.objects.filter(user=user).order_by('deadline', '-priority')

        if courses.exists():
            course_data = []
            for course in courses:
                course_data.append({
                    'id': course.id,
                    'name': course.name,
                    'course_type': course.course_type,
                    'difficulty': course.difficulty,
                    'priority': course.priority,
                    'deadline': course.deadline.strftime('%Y-%m-%d')
                })
            context['courses'] = course_data
        else:
            context['message'] = 'No courses found. Please add courses to generate a timetable.'

    except StudyPreferences.DoesNotExist:
        context['message'] = 'Please set your study preferences first.'

    # Render a printable view
    return render(request, 'pdf_timetable.html', context)

@login_required
def progress_dashboard(request):
    """View to display progress dashboard with progress bars"""
    # Get the current date
    today = timezone.now().date()
    
    # Get progress data for the past 7 days
    past_7_days = []
    for i in range(6, -1, -1):  # From 6 days ago to today
        day_date = today - timedelta(days=i)
        try:
            daily_progress = DailyProgress.objects.get(user=request.user, date=day_date)
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
    current_week_progress = WeeklyProgress.get_current_week_progress(request.user)
    
    context = {
        'past_7_days': past_7_days,
        'weekly_progress': current_week_progress,
    }
    
    return render(request, 'time_table_module/progress_dashboard.html', context)

@login_required
def progress_data_api(request):
    """API endpoint to get progress data for AJAX calls"""
    # Get the current date
    today = timezone.now().date()
    
    # Get progress data for the past 7 days
    past_7_days = []
    for i in range(6, -1, -1):  # From 6 days ago to today
        day_date = today - timedelta(days=i)
        try:
            daily_progress = DailyProgress.objects.get(user=request.user, date=day_date)
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
    current_week_progress = WeeklyProgress.get_current_week_progress(request.user)
    weekly_data = {
        'total_slots': current_week_progress.total_slots,
        'completed_slots': current_week_progress.completed_slots,
        'completion_percentage': current_week_progress.completion_percentage,
    }
    
    data = {
        'daily_progress': past_7_days,
        'weekly_progress': weekly_data,
    }
    
    return JsonResponse(data)
