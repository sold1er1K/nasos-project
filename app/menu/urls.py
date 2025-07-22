from django.urls import path
from . import views

urlpatterns = [
    path('', views.menu, name='menu'),
    path('learning/', views.learning, name='learning'),
    path('testing/', views.testing, name='testing'),
    path('check-user/', views.check_user, name='check_user'),
    path('launch-scenario/<int:scenario_id>/', views.launch_scenario, name='launch_scenario'),
]