from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from time_table_module.models import Course, TimeTableEntry, DailyProgress, WeeklyProgress
from django.utils import timezone
from datetime import timedelta, datetime
import random


class Command(BaseCommand):
    help = 'Add dummy progress data for the past 7 days to test progress bar functionality'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to add dummy data for')

    def handle(self, *args, **kwargs):
        username = kwargs['username']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User "{username}" does not exist'))
            return

        # The specific courses from the user input
        course_data = [
            {'name': 'Quran Translation', 'difficulty': 'Easy', 'priority': 'Low'},
            {'name': 'English', 'difficulty': 'Medium', 'priority': 'Medium'},
            {'name': 'Applied Physics', 'difficulty': 'Easy', 'priority': 'Low'},
            {'name': 'Numerical Computing', 'difficulty': 'Medium', 'priority': 'Medium'},
            {'name': 'ML', 'difficulty': 'Hard', 'priority': 'High'},
        ]
        
        # Create or update the specific courses
        courses = []
        for course_info in course_data:
            course, created = Course.objects.get_or_create(
                user=user,
                name=course_info['name'],
                defaults={
                    'course_type': random.choice(['Theory', 'Practical', 'Project', 'Mixed']),
                    'difficulty': course_info['difficulty'],
                    'priority': course_info['priority'],
                    'deadline': datetime(2025, 5, 27).date()  # May 27, 2025 as specified
                }
            )
            courses.append(course)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created course: {course_info["name"]}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Using existing course: {course_info["name"]}'))
                
        # Delete existing dummy data for the past 7 days to avoid duplicates
        today = timezone.now().date()
        seven_days_ago = today - timedelta(days=6)  # 7 days including today
        
        TimeTableEntry.objects.filter(
            user=user,
            date__gte=seven_days_ago,
            date__lte=today
        ).delete()
        
        DailyProgress.objects.filter(
            user=user,
            date__gte=seven_days_ago,
            date__lte=today
        ).delete()
        
        # Distribution weights for each course based on priority
        course_weights = {
            'Quran Translation': 1,      # Low priority
            'English': 2,                # Medium priority
            'Applied Physics': 1,        # Low priority
            'Numerical Computing': 2,    # Medium priority
            'ML': 3                      # High priority
        }
        
        # Completion trends - start with lower completion rates and increase
        # This creates a sense of progress improvement through the week
        completion_trends = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]
        
        # Create dummy time table entries and progress for the past 7 days
        total_entries = 0
        
        for day_offset in range(7):
            current_date = today - timedelta(days=6-day_offset)
            
            # Assign number of slots based on day of week
            # More slots on weekdays, fewer on weekends
            is_weekend = current_date.weekday() >= 5
            daily_slots = random.randint(4, 6) if is_weekend else random.randint(7, 10)
            
            # Calculate completion based on the trend for that day (improving over the week)
            completion_rate = completion_trends[day_offset]
            completed_slots = int(daily_slots * completion_rate)
            
            self.stdout.write(f'Adding {daily_slots} slots for {current_date}, with {completed_slots} completed')
            
            # Distribute slots among courses based on priority weights
            course_distributions = []
            for course in courses:
                weight = course_weights[course.name]
                course_distributions.extend([course] * weight)
            
            # Create time slots for the day
            # Start times between 8 AM and 10 PM
            possible_start_hours = list(range(8, 22))
            used_hours = []
            
            for i in range(daily_slots):
                # Select a course with weighted probability based on priority
                course = random.choice(course_distributions)
                
                # Find an available hour
                available_hours = [h for h in possible_start_hours if h not in used_hours]
                if not available_hours:
                    # Reset if all hours are used
                    used_hours = []
                    available_hours = possible_start_hours
                
                start_hour = random.choice(available_hours)
                used_hours.append(start_hour)
                
                start_time = f'{start_hour:02d}:00'
                end_time = f'{(start_hour + 1) % 24:02d}:00'
                
                # Determine status based on whether it should be completed
                if i < completed_slots:
                    status = 'completed'
                    completed_at = timezone.now() - timedelta(hours=random.randint(1, 24))
                else:
                    # Distribution of non-completed statuses
                    status = random.choices(
                        ['pending', 'missed', 'rescheduled'], 
                        weights=[0.6, 0.3, 0.1], 
                        k=1
                    )[0]
                    completed_at = None
                
                # Create time table entry
                entry = TimeTableEntry.objects.create(
                    user=user,
                    course=course,
                    date=current_date,
                    start_time=start_time,
                    end_time=end_time,
                    status=status,
                    completed_at=completed_at
                )
                total_entries += 1
                
            # Calculate and save daily progress
            DailyProgress.calculate_daily_progress(user, current_date)
        
        # Calculate weekly progress for the current week
        WeeklyProgress.calculate_weekly_progress(user, seven_days_ago)
        
        self.stdout.write(self.style.SUCCESS(f'Successfully added {total_entries} time table entries and progress data for the past 7 days'))