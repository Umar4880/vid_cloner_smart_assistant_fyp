from django.contrib import admin
from django.urls import path, include
from landing_page_module import views
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),  # Admin URL
    # path("__reload__/", include("django_browser_reload.urls")),
    path('', include('landing_page_module.urls')),  # Includes the landing page URLs (index, signup, login)
    path('upload-profile-pic/', views.upload_profile_picture, name='upload_profile_pic'),
    path('get-profile-photo/', views.get_user_profile, name='get_profile_photo'),
    path('Dashboard/', views.Dashboard, name='Dashboard' ),
    path('', include('setting_module.urls')),
    path('', include('recommender_module.urls')),
    path('', include('video_summerizer_module.urls')),
    path('', include('time_table_module.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
