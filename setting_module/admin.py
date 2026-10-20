from django.contrib import admin
from .models import TwoFactorAuth

@admin.register(TwoFactorAuth)
class TwoFactorAuthAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_registered', 'phone_number_registered', 'email', 'phone_number')
