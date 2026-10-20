# landing_page_module/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.LandingPage, name='LandingPage'),  # Landing page URL
    path('signup/', views.signupPage, name='signup'),  # Signup page URL
    path('login/', views.loginPage, name='login'),  # Login page URL
    path('contact/', views.contact_view, name='contact'),
    path('login_view/', views.login_view, name='login_view'),  # This will handle the login logic
    path('signup_view/', views.signup_view, name='signup_view'),
    path('logout/', views.logout_view, name='logout'),  # Logout URL
]
