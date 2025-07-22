import json
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dashboard.models import User
from django.shortcuts import render
from django.http import HttpResponse
import subprocess

def menu(request):
    return render(request, 'menu/index.html')

def learning(request):
    return render(request, 'menu/learning.html')

def testing(request):
    return render(request, 'menu/testing.html')


def launch_scenario(request, scenario_id):
    if request.method == 'POST':
        try:
            # Проверяем scenario_id
            if not 1 <= scenario_id <= 4:
                return JsonResponse({"error": "Неверный номер сценария"}, status=400)

            # Получаем данные из запроса
            data = json.loads(request.body)

            # Пути к файлам
            pythonw_path = r"D:\nasos\venv\Scripts\pythonw.exe"
            script_path = rf"D:\nasos\scenario_{scenario_id}.py"

            # Проверяем существование файла сценария
            if not os.path.exists(script_path):
                return JsonResponse({"error": f"Файл сценария {scenario_id} не найден"}, status=404)

            # Запускаем сценарий с передачей данных
            subprocess.Popen(
                [pythonw_path, script_path, json.dumps(data)],
                creationflags=subprocess.CREATE_NO_WINDOW
            )

            return JsonResponse({
                "success": True,
                "message": f"Сценарий {scenario_id} запущен"
            })

        except json.JSONDecodeError:
            return JsonResponse({"error": "Неверный формат данных"}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"Ошибка: {str(e)}"}, status=500)

    return JsonResponse({"error": "Метод не разрешен"}, status=405)


@csrf_exempt
def check_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_exists = User.objects.filter(
                last_name=data['lastName'],
                first_name=data['firstName'],
                middle_name=data.get('middleName', ''),
                role=data['role']
            ).exists()

            return JsonResponse({'exists': user_exists})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)