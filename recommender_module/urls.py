from django.urls import path
from . import views

urlpatterns = [
    path('recommend/', views.recommend, name='recommend'),  # Landing page URL
    # path('bookRecommend/',views.book_recommendations, name='recommendFunction')
]
