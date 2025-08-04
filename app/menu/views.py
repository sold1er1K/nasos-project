import json
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dashboard.models import User, ScenarioHistory
from django.shortcuts import render
from django.db import connection
import json
import os
import subprocess
from django.http import JsonResponse
from django.http import HttpResponse
import subprocess

def menu(request):
    return render(request, 'menu/index.html')

def learning(request):
    return render(request, 'menu/learning.html')

def testing(request):
    return render(request, 'menu/testing.html')

@csrf_exempt
def check_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Ищем существующего пользователя
            user = User.objects.filter(
                last_name=data['lastName'],
                first_name=data['firstName'],
                middle_name=data.get('middleName', ''),
                role=data['role']
            ).first()

            if user:
                return JsonResponse({
                    'exists': True,
                    'userId': user.id,
                    'user': {
                        'id': user.id,
                        'last_name': user.last_name,
                        'first_name': user.first_name,
                        'middle_name': user.middle_name,
                        'role': user.role,
                        'group': user.group
                    }
                })
            else:
                # Создаем нового пользователя если не найден
                new_user = User.objects.create(
                    last_name=data['lastName'],
                    first_name=data['firstName'],
                    middle_name=data.get('middleName', ''),
                    role=data['role'],
                    group=data.get('group') if data['role'] == 'student' else None
                )
                return JsonResponse({
                    'exists': False,
                    'userId': new_user.id,
                    'user': {
                        'id': new_user.id,
                        'last_name': new_user.last_name,
                        'first_name': new_user.first_name,
                        'middle_name': new_user.middle_name,
                        'role': new_user.role,
                        'group': new_user.group
                    }
                })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def launch_scenario(request, scenario_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Проверяем scenario_id
            if not 1 <= scenario_id <= 8:
                return JsonResponse({"error": "Неверный номер сценария"}, status=400)

            # Проверяем обязательные поля
            required_fields = ['lastName', 'firstName', 'role']
            for field in required_fields:
                if field not in data or not data[field]:
                    return JsonResponse({"error": f"Не заполнено обязательное поле: {field}"}, status=400)

            # Создаем пользователя или получаем существующего
            user, created = User.objects.get_or_create(
                last_name=data['lastName'],
                first_name=data['firstName'],
                middle_name=data.get('middleName', ''),
                role=data['role'],
                defaults={
                    'group': data.get('group') if data['role'] == 'student' else None
                }
            )

            # Создаем запись в истории сценариев
            history = ScenarioHistory.objects.create(
                user=user,
                scenario_id=scenario_id,
                status='started'
            )

            # Пути к файлам
            pythonw_path = r"D:\nasos\venv\Scripts\pythonw.exe"
            script_path = rf"D:\nasos\scenario_{scenario_id}.py"

            # Проверяем существование файла сценария
            if not os.path.exists(script_path):
                return JsonResponse({"error": f"Файл сценария {scenario_id} не найден"}, status=404)

            params = {
                'history_id': history.id,
                'user_id': user.id,
                'scenario_id': scenario_id
            }
            json_str = json.dumps(params)

            process = subprocess.Popen(
                [
                    pythonw_path,
                    script_path,
                    "--data", json_str
                ],
                creationflags=subprocess.CREATE_NO_WINDOW
            )

            return JsonResponse({
                "success": True,
                "message": f"Сценарий {scenario_id} запущен",
                "user_id": user.id,
                "history_id": history.id
            })

        except json.JSONDecodeError:
            return JsonResponse({"error": "Неверный формат данных"}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"Ошибка: {str(e)}"}, status=500)

    return JsonResponse({"error": "Метод не разрешен"}, status=405)