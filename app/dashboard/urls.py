from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('users/', views.users_page, name='users'),
    path('users/api/', views.users_api, name='users_api'),
    path('users/api/<int:user_id>/', views.users_api, name='user_detail'),
]