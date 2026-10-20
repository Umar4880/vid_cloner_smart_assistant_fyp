from django.shortcuts import render
from django.http import JsonResponse 
import json
from django.contrib.auth.decorators import login_required

@login_required
def recommend(request):
    user = request.user
    
    # Format the first and last name for the welcome message
    formatted_first_name = user.first_name.capitalize() if user.first_name else user.username.split('_')[0].capitalize()
    formatted_last_name = user.last_name.capitalize() if user.last_name else (user.username.split('_')[1].capitalize() if '_' in user.username else '')
    
    context = {
        'formatted_first_name': formatted_first_name,
        'formatted_last_name': formatted_last_name,
    }
    
    return render(request, 'recommender_module/recommend.html', context)

# Create a view that handles book recommendations
# In your view function
from django.http import JsonResponse
import pandas as pd
import numpy as np
import json

# def book_recommendations(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             user_input = data.get('user_input', '')

#             recommendations = get_recommendations(user_input)

#             # Replace NaN with None
#             recommendations = recommendations.where(pd.notnull(recommendations), None)

#             response_data = recommendations.to_dict(orient='records')
#             return JsonResponse(response_data, safe=False)
#         except json.JSONDecodeError:
#             return JsonResponse({'error': 'Invalid JSON format.'}, status=400)
#         except Exception as e:
#             return JsonResponse({'error': str(e)}, status=500)
