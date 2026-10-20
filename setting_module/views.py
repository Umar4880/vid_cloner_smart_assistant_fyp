from pyexpat.errors import messages
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from datetime import datetime, timedelta
import secrets, json, os, time
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import TwoFactorAuth
from landing_page_module.models import UserProfile
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.core.files.storage import default_storage
from django.conf import settings
from django.urls import reverse

# Dictionary for storing verification codes temporarily


###===============================###
#           functions              #
###===============================###

# Function to validate email format
def validate_email(email):
    try:
        EmailValidator()(email)  # Validate email format
    except ValidationError:
        raise ValidationError("Invalid email address")



###===============================###
#           views           
###===============================###


# View to render setting page
def setting(request):
    user = request.user
    user_profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Extract first name and last name from user object
    user_first_name = user.first_name
    user_last_name = user.last_name
    
    # Create username by concatenating first and last name
    if user_first_name and user_last_name:
        username = (user_first_name + " " + user_last_name).replace("_", " ")
    else:
        # Fallback to username if first_name or last_name is empty
        username = user.username.replace("_", " ")
    
    twofa = None

    try:
        twofa = TwoFactorAuth.objects.get(user=user)  # Adjust if needed
    except TwoFactorAuth.DoesNotExist:
        twofa = None  # Handle case where 2FA data doesn't exist
    
    # Format the first and last name for the welcome message
    formatted_first_name = user.first_name.capitalize() if user.first_name else user.username.split('_')[0].capitalize()
    formatted_last_name = user.last_name.capitalize() if user.last_name else (user.username.split('_')[1].capitalize() if '_' in user.username else '') 
       
    context = {
        'profile_picture_url': user_profile.profile_picture.url if user_profile.profile_picture else None,
        'avatar_background_color': user_profile.background_color,
        'user': user,
        'twofa': twofa,
        'user_name': username,
        'formatted_first_name': formatted_first_name,
        'formatted_last_name': formatted_last_name,
    }
   
    return render(request, 'setting_module/setting.html', context)

import logging

logger = logging.getLogger(__name__)


from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def get_user_profile_data(request):
    user = request.user
    try:
        # Fetch user's profile
        profile = UserProfile.objects.get(user=user)
        profile_picture_url = profile.profile_picture.url if profile.profile_picture else None
        # Construct the background color for the initials (can be a random color or derived from the user's name)
        background_color = profile.background_color if profile.background_color else "#000000"
        initials = user.first_name[:1].upper() + user.last_name[:1].upper()

        print(background_color)
        print(profile_picture_url)
        return JsonResponse({
            'success': True,
            'profile_picture_url': profile_picture_url,
            'initials': initials,
            'background_color': background_color,
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User profile not found!'}, status=404)


# views.py
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect

@login_required
@csrf_protect
def upload_profile_photo(request):
    if request.method == 'POST' and request.FILES.get('profile_pic'):
        user = request.user
        file = request.FILES['profile_pic']

        # Validate file type and size
        valid_formats = ['image/png', 'image/jpeg']
        if file.content_type not in valid_formats:
            return JsonResponse({'success': False, 'message': 'Invalid file format! Only PNG and JPEG are supported.'}, status=400)
        if file.size > 5 * 1024 * 1024:  # 5 MB
            return JsonResponse({'success': False, 'message': 'File size exceeds 5MB!'}, status=400)

        # Fetch user's profile or create one if not exists
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Delete existing profile picture if any
        if profile.profile_picture:
            old_file_path = profile.profile_picture.path
            if os.path.exists(old_file_path):
                os.remove(old_file_path)

        # Save new profile picture
        file_path = default_storage.save(f'profile_pictures/{user.id}_{file.name}', file)
        profile.profile_picture.name = file_path
        profile.save()

        # Return JSON response with the URL of the uploaded image
        image_url = default_storage.url(file_path)
        return JsonResponse({'success': True, 'image_url': image_url})

    return JsonResponse({'success': False, 'message': 'Invalid request.'}, status=400)


@login_required
@csrf_protect
def remove_profile_photo(request):
    if request.method == 'POST':
        user = request.user

        # Fetch the user's profile
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'User profile not found!'}, status=404)

        # Check if the user has a profile picture
        if profile.profile_picture:
            # Delete the profile picture from the server
            old_file_path = profile.profile_picture.path
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
                profile.profile_picture = None  # Remove the profile picture from the database
                profile.save()

            return JsonResponse({'success': True, 'message': 'Profile picture removed successfully.'})

        return JsonResponse({'success': False, 'message': 'No profile picture found to remove.'}, status=404)

    return JsonResponse({'success': False, 'message': 'Invalid request.'}, status=400)

@login_required
def save_name(request):
    if request.method == "POST":
        try:
            # Load JSON data from the request body
            data = json.loads(request.body)
            user = request.user  # Get the authenticated user

            # Extract fields and trim whitespace
            username = data.get("username", "").strip().replace(" ","_")
            first_name = data.get("first_name", "").strip().replace(" ","_")
            last_name = data.get("last_name", "").strip().replace(" ","_")
            username=first_name+" "+last_name
            print(data)
            # Validate username presence and length
            if not username:
                return JsonResponse({"success": False, "message": "Username should not be null!"}, status=400)
            if len(username) > 150:
                return JsonResponse({"success": False, "message": "Username is too long! Maximum 150 characters allowed."}, status=400)
            if len(username) < 3:
                return JsonResponse({"success": False, "message": "Username is too short! Minimum 3 characters required."}, status=400)

            # username=username.replace(" ","_")
            # first_name=first_name.replace(" ","_")
            # last_name=last_name.replace(" ","_")
            # Validate and assign fields

            print(first_name, last_name)
            user.first_name = first_name
            user.last_name = last_name

            # Save the user object
            user.full_clean()  # Perform field validations
            user.save()

            return JsonResponse({"success": True, "message": "User details updated successfully."})

        except json.JSONDecodeError:
            logger.error("Invalid JSON data received.")
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)

        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            return JsonResponse({"success": False, "message": f"Validation error: {e}"}, status=400)

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            return JsonResponse({"success": False, "message": "An unexpected error occurred."}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)


@login_required
@csrf_protect
def send_verification_code(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('input')

            # Validate email format
            try:
                validate_email(email)
            except ValidationError:
                return JsonResponse({"success": False, "message": "Invalid email format."}, status=402)

            if not email:
                return JsonResponse({"success": False, "message": "Email is required."}, status=400)

            # Generate a 6-digit random code and store in session
            verification_code = secrets.randbelow(900000) + 100000
            expiration_time = datetime.now() + timedelta(minutes=5)

            request.session['verification_code'] = {
                'email': email,
                'code': verification_code,
                'expires_at': expiration_time.isoformat()  # Store as ISO format
            }

            print("Verification code stored in session:", request.session['verification_code'])

            #             # Email content
            subject = "Email Verification for VidCloner Smart Assistant"
            body = f"""
            <html>
            <head>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f9f9f9;
                    }}
                    .email-container {{
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }}
                    .header {{
                        text-align: center;
                        font-size: 24px;
                        font-weight: bold;
                        color: #007bff;
                        margin-bottom: 20px;
                    }}
                    .body-content {{
                        font-size: 16px;
                        color: #333;
                        line-height: 1.5;
                    }}
                    .verification-code {{
                        font-size: 18px;
                        font-weight: bold;
                        color: #e74c3c;
                        margin: 20px 0;
                        text-align: center;
                    }}
                    .footer {{
                        font-size: 14px;
                        color: #777;
                        text-align: center;
                        margin-top: 30px;
                    }}
                    @media (max-width: 600px) {{
                        .email-container {{
                            padding: 15px;
                        }}
                        .header {{
                            font-size: 20px;
                        }}
                        .body-content {{
                            font-size: 14px;
                        }}
                        .footer {{
                            font-size: 12px;
                        }}
                    }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        VidCloner Smart Assistant - Email Verification
                    </div>
                    <div class="body-content">
                        <p>Hello,</p>
                        <p>You have requested to update your email address in VidCloner Smart Assistant.</p>
                        <p class="verification-code">Your verification code is: {verification_code}</p>
                        <p>Please use this code within 5 minutes to verify your email address. If you did not request this change, please ignore this email.</p>
                        <p>Thank you,<br>The VidCloner Team</p>
                    </div>
                    <div class="footer">
                        <p>If you did not request this change, please disregard this message. If you need help, contact support.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Send the email
            send_mail(
                subject,
                body,
                'vidclonersmartassistant@gmail.com',  # Sender's email
                [email],
                fail_silently=False,
                html_message=body,  # Send HTML formatted content
            )

            return JsonResponse({"success": True, "message": "Verification code sent successfully."})

        except Exception as e:
            print("Error during code generation:", e)
            return JsonResponse({"success": False, "message": "An unexpected error occurred."}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)

@login_required
def verify_verification_code(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('input')
            code = data.get('code')

            print(f"Received email: {email}, code: {code}")
            print("Stored session data before verification:", request.session.get('verification_code'))

            # Check if email exists in session data
            session_data = request.session.get('verification_code')
            if not session_data or session_data['email'] != email:
                print("Email not found in session verification data.")
                return JsonResponse({"success": False, "message": "Verification code not requested for this email."}, status=400)

            stored_code = session_data['code']
            expires_at = datetime.fromisoformat(session_data['expires_at'])

            if datetime.now() > expires_at:
                del request.session['verification_code']  # Remove expired code
                print("Verification code has expired.")
                return JsonResponse({"success": False, "message": "Verification code has expired."}, status=402)

            if str(stored_code) != str(code):
                print("Verification code mismatch.")
                return JsonResponse({"success": False, "message": "Invalid verification code."}, status=400)

            # Successfully verified; remove the code from session
            del request.session['verification_code']
            print("Verification successful. Code removed from session.")
            return JsonResponse({"success": True, "message": "Verification successful."})

        except json.JSONDecodeError:
            print("Error: Invalid JSON payload")
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
        except Exception as e:
            print(f"Unexpected error: {e}")
            return JsonResponse({"success": False, "message": str(e)}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)




import json
import logging

logger = logging.getLogger(__name__)

@csrf_exempt  # Use with caution; consider using CSRF protection in production
def store_2fa_credentials(request):
    if request.method == "POST":
        try:
            # Parse the JSON body
            data = json.loads(request.body)
            user = request.user  # Automatically gets the logged-in user

            # Check for user authentication
            if not user.is_authenticated:
                return JsonResponse({"success": False, "message": "User not authenticated."}, status=403)

            phone_number = data.get('phone')
            twofa_enable = data.get('twofa_enable')
            email = data.get('email')

            # logger.debug(f"Received data: {data}")

            # Check if the 2FA credentials already exist for this user
            two_fa, created = TwoFactorAuth.objects.get_or_create(user=user)

            # Check if the user is trying to set both phone and email
            if phone_number and email:
                two_fa.phone_number_registered = True
                two_fa.phone_number = phone_number
                two_fa.email_registered = True
                two_fa.email = email
                two_fa.twofa_enable = twofa_enable  # Update 2FA status if provided

            # If only phone number is provided, set it
            elif phone_number:
                two_fa.phone_number_registered = True
                two_fa.phone_number = phone_number

            # If only email is provided, set it
            elif email:
                two_fa.email_registered = True
                two_fa.email = email

            # If 2FA enable status is provided, update it
            if twofa_enable is not None:  # Check for explicit True/False value
                two_fa.twofa_enable = twofa_enable

            # Save to the database
            two_fa.save()

            return JsonResponse({"success": True, "message": "2FA credentials stored successfully."})

        except json.JSONDecodeError:
            logger.error("Invalid JSON data received.")
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
        except Exception as e:
            logger.error(f"An error occurred: {e}")
            return JsonResponse({"success": False, "message": str(e)}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)


# from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def get_2fa_credentials(request):
    try:
        user = request.user  # Automatically gets the logged-in user
        user_profile = TwoFactorAuth.objects.get(user=user)  # Retrieve 2FA profile associated with the user

        # Collect 2FA data
        data = {
            'email': user_profile.email,
            'phone': user_profile.phone_number,
            'twofa_enable': user_profile.twofa_enable,
        }

        return JsonResponse({'success': True, 'data': data}, status=200)
    except TwoFactorAuth.DoesNotExist:
        return JsonResponse({'success': False, 'message': '2FA credentials not found.'}, status=404)
    except Exception as e:
        # Log the exception for better debugging (optional)
        # logger.error(f"An error occurred: {e}")
        return JsonResponse({'success': False, 'message': 'An unexpected error occurred.'}, status=500)

@login_required
def delete_2fa_credentials(request):
    if request.method == 'POST':
        try:
            user = request.user  # Get the logged-in user
            data = json.loads(request.body)  # Correct JSON parsing

            twofa = TwoFactorAuth.objects.get(user=user)  # Adjust if necessary

            # Check and delete specific fields
            if 'email' in data and data['email'] is not None:
                twofa.email = None
            if 'phone' in data and data['phone'] is not None:
                twofa.phone = None
            
            twofa.save()

            return JsonResponse({'success': True, 'message': '2FA data deleted successfully.'})
        except TwoFactorAuth.DoesNotExist:
            return JsonResponse({'success': False, 'message': '2FA credentials not found.'}, status=404)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            # Optionally log the error
            # logger.error(f"An error occurred: {e}")
            return JsonResponse({'success': False, 'message': 'An unexpected error occurred.'}, status=500)


import re
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
import json

def update_password(request):
    if request.method == "POST":
        try:
            user = request.user
            data = json.loads(request.body)

            if not user.is_authenticated:
                return JsonResponse({"success": False, "message": "User not authenticated."}, status=403)

            new_password = data.get("password")
            confirm_password = data.get("confirmPassword")

            print(data)
            # Check if passwords match
            if new_password != confirm_password:
                return JsonResponse({"success": False, "message": "Passwords do not match!"}, status=400)

            # Regex validation for password complexity
            password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
            if not re.match(password_regex, new_password):
                return JsonResponse({
                    "success": False,
                    "message": (
                        "Password must be at least 8 characters long, "
                        "and include at least one uppercase letter, one lowercase letter, "
                        "one number, and one special character (@$!%*?&)."
                    )
                }, status=400)

            # Hash and update the user's password
            user.password = make_password(new_password)
            user.save()

            return JsonResponse({"success": True, "message": "Password updated successfully!"})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)

        except Exception as e:
            return JsonResponse({"success": False, "message": f"An unexpected error occurred: {e}"}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)


def update_email(request):
    if request.method == "POST":
        try:
            user = request.user
            data = json.loads(request.body)

            if not user.is_authenticated:
                return JsonResponse({"success": False, "message": "User not authenticated."}, status=403)

            new_email = data.get("email")
            print(data)
            
            # Validate email format
            try:
                validate_email(new_email)  # This will raise a ValidationError if the email is not valid
            except ValidationError:
                return JsonResponse({"success": False, "message": "Email is not valid!"}, status=400)

            # Update the email directly on the user object
            user.email = new_email
            user.save()

            return JsonResponse({"success": True, "message": "Email updated successfully!"})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)

        except Exception as e:
            print(f"Error updating email: {str(e)}")  # Log the error for debugging
            return JsonResponse({"success": False, "message": f"An unexpected error occurred: {e}"}, status=500)

    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)

def contact(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')
        subject = request.POST.get('subject')
        message = request.POST.get('message')

        try:
            # Send the email
            send_mail(
                subject=f"Contact Form: {subject}",
                message=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=['vidcloneremail@gmail.com'],  # Updated to vidcloneremail address
            )
            messages.success(request, 'Your message has been sent successfully!')
        except Exception as e:
            messages.error(request, f"An error occurred: {e}")

        # Redirect back to the settings page with contact section anchor
        return redirect(reverse('setting') + '#contact')

    # If not POST, render the settings page
    return redirect('setting')

