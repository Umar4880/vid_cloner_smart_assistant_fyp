from django.urls import path
from . import views

urlpatterns = [
    path('Setting/', views.setting, name='setting'),  # Landing page URL
    path('send-verification-code/', views.send_verification_code, name='send_verification_code'),
    path('verify-code/', views.verify_verification_code, name='verify_verification_code'),
    path('get-user-profile-data/', views.get_user_profile_data, name='get_user_profile_data'),
    path('upload-profile-photo/', views.upload_profile_photo, name='upload_profile_pic'),
    path('remove-profile-photo/', views.remove_profile_photo, name='remove_profile_pic'),
    path('update-Name/', views.save_name, name='update_Name'),
    path('update-email/', views.update_email, name='update_email'),
    path('set-2FA/', views.store_2fa_credentials, name='store_2fa_credentials'),
    path('get-2FA/', views.get_2fa_credentials, name='get_2fa_credentials'),
    path('delete-2FA/', views.delete_2fa_credentials, name='delete_2fa_credentials'),
    path('update-password/', views.update_password, name='update_password'),
    path('contact/', views.contact, name='contact'),
] 
