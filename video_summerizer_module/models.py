from django.db import models
from django.contrib.auth.models import User

class SummarizedNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.IntegerField()
    title = models.CharField(max_length=255, default="Untitled Summary")
    notes = models.TextField()  # Markdown/text format
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

class VideoMetaData(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    video_name = models.CharField(max_length=512)
    video_size = models.FloatField()
    upload_date = models.DateTimeField(auto_now_add=True)
    transcript_id = models.CharField(max_length=512)

    def __str__(self):
        return f"{self.title} - {self.created_at.strftime('%Y-%m-%d')}"

