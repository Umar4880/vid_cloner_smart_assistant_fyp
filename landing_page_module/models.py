from django.db import models
from django.contrib.auth.models import User  # Import Django's built-in User model


class Contact(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)  # Allow null values
    name = models.CharField(max_length=20)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()

    def __str__(self):
        return f"Message from {self.user.username if self.user else 'Anonymous'}: {self.subject}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    background_color = models.CharField(max_length=7, default='#7c0d0d')  # Hex color code

    def __str__(self):
        return f"Profile of {self.user.username if self.user else 'Anonymous'}"


