from django.urls import path
from . import views

urlpatterns = [
    path('timetable/', views.timetable, name='timetable'),
    path('save-study-preferences/', views.save_study_preferences, name='save_study_preferences'),
    path('add-course/', views.add_course, name='add_course'),
    path('generate-timetable/', views.generate_timetable, name='generate_timetable'),
    path('generate-pdf/', views.generate_pdf_timetable, name='generate_pdf_timetable'),
    path('progress-dashboard/', views.progress_dashboard, name='progress_dashboard'),
    path('progress-data/', views.progress_data_api, name='progress_data_api'),
    # New URLs for today's timetable
    path('today-timetable/', views.get_today_timetable, name='get_today_timetable'),
    path('update-entry-status/', views.update_entry_status, name='update_entry_status'),
]
