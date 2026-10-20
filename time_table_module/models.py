from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta, date
from django.utils import timezone

class Course(models.Model):
    """Model to store course details from the timetable form."""
    
    DIFFICULTY_CHOICES = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
    ]
    
    PRIORITY_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    
    COURSE_TYPE_CHOICES = [
        ('Theory', 'Theory'),
        ('Practical', 'Practical'),
        ('Project', 'Project-based'),
        ('Mixed', 'Mixed'),
    ]
    
    # User relationship
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    
    # Course details
    name = models.CharField(max_length=100)
    course_type = models.CharField(max_length=20, choices=COURSE_TYPE_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES)
    deadline = models.DateField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

class StudyPreferences(models.Model):
    """Model to store user's general study preferences."""
    
    STUDY_GOALS_CHOICES = [
        ('pass_exam', 'Pass an exam'),
        ('high_grades', 'Achieve high grades'),
        ('gain_knowledge', 'Gain deep knowledge'),
        ('certification', 'Prepare for certification'),
        ('skill_development', 'Develop practical skills'),
    ]
    
    BREAK_DURATION_CHOICES = [
        ('5', '5 minutes'),
        ('10', '10 minutes'),
        ('15', '15 minutes'),
        ('20', '20 minutes'),
        ('30', '30 minutes'),
    ]
    
    BREAK_FREQUENCY_CHOICES = [
        ('25', 'Every 25 minutes (Pomodoro)'),
        ('45', 'Every 45 minutes'),
        ('60', 'Every 60 minutes'),
        ('90', 'Every 90 minutes'),
        ('120', 'Every 120 minutes'),
    ]
    
    STUDY_INTENSITY_CHOICES = [
        ('intensive', 'Fill all available time slots (Intensive)'),
        ('balanced', 'Leave some free slots (Balanced)'),
        ('relaxed', 'Leave plenty of free time (Relaxed)'),
        ('custom', 'Custom: specific number of free slots'),
    ]
    
    # User relationship - one set of preferences per user
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='study_preferences')
    
    # Study goals - primary goal for studying
    study_goal = models.CharField(max_length=50, choices=STUDY_GOALS_CHOICES)
    
    # Preferred study hours per week
    preferred_study_hours = models.PositiveIntegerField(default=15)
    
    # Study intensity - how densely packed should the schedule be
    study_intensity = models.CharField(max_length=20, choices=STUDY_INTENSITY_CHOICES, default='balanced')
    custom_free_slots = models.PositiveIntegerField(default=1, null=True, blank=True)
    
    # Optimal study times - using boolean fields for each time period
    morning_study = models.BooleanField(default=False)  # 5AM-12PM
    afternoon_study = models.BooleanField(default=False)  # 12PM-5PM
    evening_study = models.BooleanField(default=False)  # 5PM-10PM
    night_study = models.BooleanField(default=False)  # 10PM-5AM
    
    # Break preferences
    break_duration = models.CharField(max_length=3, choices=BREAK_DURATION_CHOICES, default='15')
    break_frequency = models.CharField(max_length=3, choices=BREAK_FREQUENCY_CHOICES, default='25')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Study Preferences"
        
    class Meta:
        verbose_name = 'Study Preference'
        verbose_name_plural = 'Study Preferences'

class TimeTableEntry(models.Model):
    """Model to store individual time table entries/slots."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('rescheduled', 'Rescheduled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='timetable_entries')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='timetable_entries')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.course.name} - {self.date} ({self.start_time} to {self.end_time})"

    class Meta:
        verbose_name = 'TimeTable Entry'
        verbose_name_plural = 'TimeTable Entries'
        ordering = ['date', 'start_time']

class DailyProgress(models.Model):
    """Model to store daily progress summaries for more granular progress tracking."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_progress')
    date = models.DateField()
    total_slots = models.IntegerField(default=0)
    completed_slots = models.IntegerField(default=0)
    completion_percentage = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Progress on {self.date}"
    
    @classmethod
    def calculate_daily_progress(cls, user, target_date=None):
        """Calculate and save the progress for a specific day."""
        if target_date is None:
            target_date = timezone.now().date()
        
        # Get all time table entries for the day
        entries = TimeTableEntry.objects.filter(
            user=user,
            date=target_date
        )
        
        total_slots = entries.count()
        completed_slots = entries.filter(status='completed').count()
        completion_percentage = (completed_slots / total_slots * 100) if total_slots > 0 else 0
        
        # Create or update the daily progress record
        progress, created = cls.objects.update_or_create(
            user=user,
            date=target_date,
            defaults={
                'total_slots': total_slots,
                'completed_slots': completed_slots,
                'completion_percentage': completion_percentage
            }
        )
        
        return progress
    
    @classmethod
    def get_or_calculate_today_progress(cls, user):
        """Get or calculate progress for today."""
        today = timezone.now().date()
        
        try:
            progress = cls.objects.get(user=user, date=today)
        except cls.DoesNotExist:
            progress = cls.calculate_daily_progress(user, today)
            
        return progress
        
    class Meta:
        verbose_name = 'Daily Progress'
        verbose_name_plural = 'Daily Progress'
        unique_together = ['user', 'date']

class WeeklyProgress(models.Model):
    """Model to store weekly progress summaries."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_progress')
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    total_slots = models.IntegerField(default=0)
    completed_slots = models.IntegerField(default=0)
    completion_percentage = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Progress ({self.week_start_date} to {self.week_end_date})"
    
    @classmethod
    def calculate_weekly_progress(cls, user, week_start=None):
        """Calculate and save the progress for a specific week."""
        if week_start is None:
            # Calculate for previous week by default
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday() + 7)
        
        week_end = week_start + timedelta(days=6)
        
        # Get all time table entries for the week
        entries = TimeTableEntry.objects.filter(
            user=user,
            date__gte=week_start,
            date__lte=week_end
        )
        
        total_slots = entries.count()
        completed_slots = entries.filter(status='completed').count()
        completion_percentage = (completed_slots / total_slots * 100) if total_slots > 0 else 0
        
        # Create or update the weekly progress record
        progress, created = cls.objects.update_or_create(
            user=user,
            week_start_date=week_start,
            week_end_date=week_end,
            defaults={
                'total_slots': total_slots,
                'completed_slots': completed_slots,
                'completion_percentage': completion_percentage
            }
        )
        
        return progress
        
    @classmethod
    def get_current_week_progress(cls, user):
        """Get or calculate progress for the current week."""
        today = timezone.now().date()
        # Get the start of the current week (Monday)
        current_week_start = today - timedelta(days=today.weekday())
        current_week_end = current_week_start + timedelta(days=6)
        
        # Try to get existing progress record
        try:
            progress = cls.objects.get(
                user=user,
                week_start_date=current_week_start,
                week_end_date=current_week_end
            )
        except cls.DoesNotExist:
            # Calculate if it doesn't exist
            progress = cls.calculate_weekly_progress(user, current_week_start)
        
        return progress
    
    class Meta:
        verbose_name = 'Weekly Progress'
        verbose_name_plural = 'Weekly Progress'
        unique_together = ['user', 'week_start_date']
