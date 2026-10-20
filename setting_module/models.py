from django.db import models
from django.contrib.auth.models import User

class TwoFactorAuth(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='two_factor_auth')
    email_registered = models.BooleanField(default=False)
    phone_number_registered = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    twofa_enable=models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s 2FA Information"
