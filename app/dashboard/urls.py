from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('users/', views.users_page, name='users'),
    path('report/', views.report_page, name='report'),
    path('users/api/', views.users_api, name='users_api'),
    path('users/api/<int:user_id>/', views.users_api, name='user_detail'),
    path('users/api/bulk_create/', views.bulk_create_users, name='bulk_create_users'),
    path('scenario-history/', views.ScenarioHistoryView.as_view(), name='scenario-history'),
    path('complete-scenario/', views.complete_scenario, name='complete_scenario'),
]