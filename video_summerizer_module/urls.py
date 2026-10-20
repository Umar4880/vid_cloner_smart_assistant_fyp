from django.urls import path
from . import views
 
urlpatterns=[
    path('get-upload-token/', views.get_temporary_token, name='temp_token'),  # deprecated
    path('stream-upload/', views.stream_upload, name='stream_upload'),  # NEW streaming endpoint
    path('upload-video/', views.upload_video, name='upload-video'),  # NEW streaming endpoint
    path('summerizer/', views.summerizer, name='summerizer'),
    path('generate-notes/', views.generate_notes, name='generate_notes'),
    path('update-notes/', views.update_notes, name='update_notes'),
    path('save-notes/', views.save_notes, name='save_notes'),
    path('get-titles/', views.get_titles, name='get_titles'),
    path('get-summary/<int:summary_id>/', views.get_summary, name='get_summary'),
    path('rename-note/<int:note_id>/', views.rename_note, name='rename_note'),
    path('delete-note/<int:note_id>/', views.delete_note, name='delete_note'),
]