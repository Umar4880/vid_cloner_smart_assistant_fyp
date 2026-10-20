# Register your models here.
from django.contrib import admin
from .models import Course, StudyPreferences, TimeTableEntry, WeeklyProgress, DailyProgress

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'difficulty', 'priority', 'deadline')
    search_fields = ('name', 'user__username')
    list_filter = ('difficulty', 'priority')

@admin.register(StudyPreferences)
class StudyPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'preferred_study_hours', 'study_intensity', 'break_duration')
    search_fields = ('user__username',)

@admin.register(TimeTableEntry)
class TimeTableEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'date', 'start_time', 'end_time', 'status')
    list_filter = ('status', 'date')
    search_fields = ('user__username', 'course__name')
    date_hierarchy = 'date'

@admin.register(WeeklyProgress)
class WeeklyProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'week_start_date', 'week_end_date', 'total_slots', 'completed_slots', 'completion_percentage')
    search_fields = ('user__username',)
    date_hierarchy = 'week_start_date'

@admin.register(DailyProgress)
class DailyProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'total_slots', 'completed_slots', 'completion_percentage')
    search_fields = ('user__username',)
    date_hierarchy = 'date'
