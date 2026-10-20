import random
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from .models import Contact
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.auth.models import User
import re
from .models import UserProfile


def LandingPage(request):
    return render(request, 'landing_page_module/index.html')  # Ensure this path matches your template structure

def loginPage(request):
    return render(request, 'landing_page_module/login_modal.html')

def signupPage(request):
    return render(request, 'landing_page_module/register_modal.html')

def generate_random_color():
    while True:
        # Generate a random color
        color = "#{:06x}".format(random.randint(0, 0xFFFFFF))
        if is_color_dark_enough(color):
            return color

def is_color_dark_enough(color):
    # Convert hex to RGB
    r = int(color[1:3], 16)
    g = int(color[3:5], 16)
    b = int(color[5:7], 16)
    # Calculate luminance based on the relative luminance formula
    luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    # Ensure luminance is below a threshold (e.g., 0.6)
    return luminance < 0.6


def contact_view(request):
    if request.method == 'POST':
        # Get form data
        name = request.POST.get('name')
        email = request.POST.get('email')
        subject = request.POST.get('subject')
        message = request.POST.get('message')

        # Check if the user is authenticated
        if request.user.is_authenticated:
            user = request.user  # Assign the logged-in user to the contact
        else:
            user = None  # Leave it as None for anonymous users

        try:
            # Save the contact message
            contact = Contact(user=user, name=name, email=email, subject=subject, message=message)
            contact.save()
            messages.success(request, "Your message has been sent!")
            return redirect('LandingPage')  # Redirect to the landing page after success

        except IntegrityError as e:
            # Handle the error gracefully if the user is not logged in
            messages.error(request, "Login to Contact us")
            return redirect('LandingPage')  # Redirect to the landing page with the error message

    return render(request, 'landing_page_module/index.html')


# Function to generate a random hex color


from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib import messages
import re
from django.contrib.auth.models import User
from .models import UserProfile

def signup_view(request):
    if request.method == 'POST':
        fname = request.POST.get('first_name')
        lname = request.POST.get('last_name')
        email = request.POST.get('email')
        password1 = request.POST.get('password')
        password2 = request.POST.get('confirm_password')

        # Check if email is valid
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"success": False, "message": "Invalid email format!"})

        # Check if email already exists in the database
        if User.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "message": "Email already exists! Try a different one."})

        # Check if passwords match
        if password1 != password2:
            return JsonResponse({"success": False, "message": "Passwords do not match!"})

        # Password strength check (simple example, can be expanded)
        if not re.match(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$', password1):
            return JsonResponse({"success": False, "message": "Password must be at least 8 characters long, contain one letter, one number, and one special character."})

        try:
            # Generate username from email (using part before @)
            username = email.split('@')[0]
            
            # Make sure username is unique by appending numbers if needed
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Create the user
            user = User.objects.create_user(
                username=username,  # Set the generated username
                email=email,
                first_name=fname,
                last_name=lname,
                password=password1
            )
            user.save()

            # Generate a random background color
            random_color = generate_random_color()

            # Create a UserProfile for the user with the random background color
            UserProfile.objects.create(user=user, background_color=random_color)

            # Return success message
            return JsonResponse({"success": True, "message": "Account created successfully! Please log in.", "redirect_url": "/login/"})

        except Exception as e:
            # Log the error in production and show a general error message
            print(f"Error occurred during registration: {e}")
            return JsonResponse({"success": False, "message": "An error occurred. Please try again later."})

    # If the request is not POST, return a response indicating invalid request
    return JsonResponse({"success": False, "message": "Invalid request method."})


from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.shortcuts import render

def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=400)

        user = authenticate(request, username=user.username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'success': True, 'message': 'Login successful.', 'redirect_url': '/Dashboard/'})
        else:
            return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=400)

    return render(request, 'landing_page_module/login_modal.html')

from django.contrib.auth import logout
from django.shortcuts import redirect

def logout_view(request):
    logout(request)  # Log out the user
    return redirect('LandingPage')  # Redirect to the login page (or any other page)