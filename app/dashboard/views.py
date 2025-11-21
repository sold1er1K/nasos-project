import json
from django.utils import timezone

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from datetime import datetime, timedelta, date
from .models import User
from django.views import View
from django.db.models import Count, Q
from .models import ScenarioHistory
from django.core.serializers.json import DjangoJSONEncoder


def dashboard(request):
    nav_items = ["archive", "stats", "settings"]
    sidebar_open = request.session.get('sidebar_open', False)

    return render(request, 'dashboard/dashboard.html', {
        'nav_items': nav_items,
        'sidebar_open': sidebar_open
    })

def users_page(request):
    return render(request, 'dashboard/users.html')

def report_page(request):
    return render(request, 'dashboard/report.html')


@csrf_exempt
def users_api(request, user_id=None):
    if request.method == 'GET':
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                return JsonResponse({
                    'id': user.id,
                    'last_name': user.last_name,
                    'first_name': user.first_name,
                    'middle_name': user.middle_name,
                    'role': user.role,
                    'group': user.group,
                    'created_at': user.created_at.strftime('%Y-%m-%d')
                })
            except User.DoesNotExist:
                return JsonResponse({'error': 'Пользователь не найден'}, status=404)
        else:
            users = User.objects.all().values('id', 'last_name', 'first_name',
                                              'middle_name', 'role', 'group', 'created_at')
            return JsonResponse(list(users), safe=False)

    elif request.method == 'POST':
        data = json.loads(request.body)

        if not all([data.get('last_name'), data.get('first_name'), data.get('role')]):
            return JsonResponse({'error': 'Не все поля заполнены'}, status=400)

        existing_user = User.objects.filter(
            last_name=data['last_name'],
            first_name=data['first_name'],
            middle_name=data.get('middle_name', ''),
            role=data['role']
        ).first()

        if existing_user:
            return JsonResponse({
                'error': 'Пользователь уже существует',
                'existing_user_id': existing_user.id
            }, status=409)

        try:
            user = User.objects.create(
                last_name=data['last_name'],
                first_name=data['first_name'],
                middle_name=data.get('middle_name', ''),
                role=data['role'],
                group=data.get('group') if data['role'] == 'student' else None
            )
            return JsonResponse({
                'success': True,
                'id': user.id,
                'message': 'Пользователь успешно создан'
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method == 'PUT':
        data = json.loads(request.body)
        try:
            user = User.objects.get(id=user_id)

            if any([
                user.last_name != data.get('last_name'),
                user.first_name != data.get('first_name'),
                user.middle_name != data.get('middle_name', ''),
                user.role != data.get('role')
            ]):
                existing_user = User.objects.filter(
                    last_name=data.get('last_name', user.last_name),
                    first_name=data.get('first_name', user.first_name),
                    middle_name=data.get('middle_name', user.middle_name),
                    role=data.get('role', user.role)
                ).exclude(id=user_id).first()

                if existing_user:
                    return JsonResponse({
                        'error': 'Пользователь с такими данными уже существует',
                        'existing_user_id': existing_user.id
                    }, status=409)

            user.last_name = data.get('last_name', user.last_name)
            user.first_name = data.get('first_name', user.first_name)
            user.middle_name = data.get('middle_name', user.middle_name)
            user.role = data.get('role', user.role)
            user.group = data.get('group') if data.get('role', user.role) == 'student' else None
            user.save()

            return JsonResponse({'success': True, 'message': 'Данные пользователя успешно изменены'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'Пользователь не найден'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return JsonResponse({'success': True, 'message': 'Пользователь успешно удалён'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'Пользователь не найден'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


class ScenarioHistoryView(View):
    def get(self, request):
        user_id = request.GET.get('user_id')

        if not user_id:
            return JsonResponse({'error': 'Не указан ID пользователя'}, status=400)

        history = ScenarioHistory.objects.filter(user_id=user_id).order_by('-start_time')

        history_data = []
        for item in history:
            history_data.append({
                'id': item.id,
                'scenario_id': item.scenario_id,
                'start_time': item.start_time,
                'end_time': item.end_time,
                'duration': item.duration,
                'status': item.status,
                'result': item.result
            })

        return JsonResponse(
            {'history': history_data},
            encoder=DjangoJSONEncoder,
            safe=False
        )


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import ScenarioHistory
import json


@csrf_exempt
def complete_scenario(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(data)
            history_id = data.get('history_id')
            print(history_id)
            status = data.get('status', 'completed')
            print(status)

            try:
                scenario = ScenarioHistory.objects.get(id=history_id)
            except ScenarioHistory.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Scenario not found'}, status=404)

            # Обновляем статус И время завершения
            scenario.status = status
            scenario.end_time = timezone.now()

            # Рассчитываем продолжительность, если есть start_time
            if scenario.start_time:
                scenario.duration = (scenario.end_time - scenario.start_time).total_seconds()

            scenario.save()

            return JsonResponse({
                'success': True,
                'message': 'Scenario completed successfully',
                'data': {
                    'id': scenario.id,
                    'duration': scenario.duration,
                    'status': scenario.status,
                    'end_time': scenario.end_time.isoformat()  # Добавляем end_time в ответ
                }
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)


@require_POST
@csrf_exempt
def analytics_active_users(request):
    try:
        data = json.loads(request.body)
        period = data.get('period', 'week')
        date_filter = data.get('date')
        month_filter = data.get('month')
        group_filter = data.get('group')
        report_type = data.get('report_type', 'active-users')

        # Определяем временной диапазон
        today = date.today()

        if period == 'today' or date_filter:
            if date_filter:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                start_date = datetime.combine(filter_date, datetime.min.time())
                end_date = datetime.combine(filter_date, datetime.max.time())
            else:
                start_date = datetime.combine(today, datetime.min.time())
                end_date = datetime.combine(today, datetime.max.time())

            labels = [today.strftime('%d.%m.%Y')]

        elif period == 'week':
            start_date = datetime.combine(today - timedelta(days=6), datetime.min.time())
            end_date = datetime.combine(today, datetime.max.time())

            labels = []
            for i in range(6, -1, -1):
                day = today - timedelta(days=i)
                labels.append(day.strftime('%d.%m.%Y'))

        elif period == 'month' or month_filter:
            if month_filter:
                year, month = map(int, month_filter.split('-'))
                start_date = datetime(year, month, 1)
                end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
                end_date -= timedelta(days=1)
                end_date = datetime.combine(end_date, datetime.max.time())
            else:
                # Текущий месяц
                start_date = datetime(today.year, today.month, 1)
                next_month = today.month + 1 if today.month < 12 else 1
                next_year = today.year if today.month < 12 else today.year + 1
                end_date = datetime(next_year, next_month, 1) - timedelta(days=1)
                end_date = datetime.combine(end_date, datetime.max.time())

            # Генерируем даты для всего месяца
            labels = []
            current_date = start_date.date()
            while current_date <= end_date.date():
                labels.append(current_date.strftime('%d.%m.%Y'))
                current_date += timedelta(days=1)

        # Фильтр по взводу
        user_q = Q()
        if group_filter:
            user_q = Q(group=group_filter)

        # Подготавливаем данные
        result_data = {
            'labels': labels,
            'activeUsersData': [0] * len(labels),
            'studentsData': [0] * len(labels),
            'teachersData': [0] * len(labels),
            'learningSessionsData': [0] * len(labels),
            'successDataTesting': [0] * len(labels),
            'failedDataTesting': [0] * len(labels)
        }

        # Для каждого дня в диапазоне
        for i, label in enumerate(labels):
            day_date = datetime.strptime(label, '%d.%m.%Y').date()
            day_start = datetime.combine(day_date, datetime.min.time())
            day_end = datetime.combine(day_date, datetime.max.time())

            if report_type == 'active-users':
                # Активные пользователи
                active_users = ScenarioHistory.objects.filter(
                    start_time__range=(day_start, day_end)
                ).values('user').distinct()

                user_ids = [item['user'] for item in active_users]
                users = User.objects.filter(id__in=user_ids).filter(user_q)

                result_data['activeUsersData'][i] = users.count()
                result_data['studentsData'][i] = users.filter(role='student').count()
                result_data['teachersData'][i] = users.filter(role='teacher').count()

            elif report_type == 'learning':
                # Сессии обучения
                learning_sessions = ScenarioHistory.objects.filter(
                    start_time__range=(day_start, day_end),
                    # Предполагаем, что сценарии с ID < 1000 - это обучение
                    scenario_id__lt=1000
                )

                if group_filter:
                    learning_sessions = learning_sessions.filter(user__group=group_filter)

                result_data['learningSessionsData'][i] = learning_sessions.count()

                # Разделение по ролям
                students_sessions = learning_sessions.filter(user__role='student')
                teachers_sessions = learning_sessions.filter(user__role='teacher')

                result_data['studentsData'][i] = students_sessions.count()
                result_data['teachersData'][i] = teachers_sessions.count()

            elif report_type == 'testing':
                # Тестирования
                tests = ScenarioHistory.objects.filter(
                    start_time__range=(day_start, day_end),
                    # Предполагаем, что сценарии с ID >= 1000 - это тестирование
                    scenario_id__gte=1000
                )

                if group_filter:
                    tests = tests.filter(user__group=group_filter)

                successful_tests = tests.filter(status='completed', result__icontains='успе')
                failed_tests = tests.exclude(status='completed').exclude(result__icontains='успе')

                result_data['successDataTesting'][i] = successful_tests.count()
                result_data['failedDataTesting'][i] = failed_tests.count()

        return JsonResponse(result_data)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

class ScenarioHistoryView(View):
    def get(self, request):
        user_id = request.GET.get('user_id')

        if not user_id:
            return JsonResponse({'error': 'Не указан ID пользователя'}, status=400)

        history = ScenarioHistory.objects.filter(user_id=user_id).order_by('-start_time')

        history_data = []
        for item in history:
            history_data.append({
                'id': item.id,
                'scenario_id': item.scenario_id,
                'start_time': item.start_time,
                'end_time': item.end_time,
                'duration': item.duration,
                'status': item.status,
                'result': item.result
            })

        return JsonResponse(
            {'history': history_data},
            encoder=DjangoJSONEncoder,
            safe=False
        )


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import ScenarioHistory
import json


@csrf_exempt
def complete_scenario(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(data)
            history_id = data.get('history_id')
            print(history_id)
            status = data.get('status', 'completed')
            print(status)

            try:
                scenario = ScenarioHistory.objects.get(id=history_id)
            except ScenarioHistory.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Scenario not found'}, status=404)

            # Обновляем статус И время завершения
            scenario.status = status
            scenario.end_time = timezone.now()

            # Рассчитываем продолжительность, если есть start_time
            if scenario.start_time:
                scenario.duration = (scenario.end_time - scenario.start_time).total_seconds()

            scenario.save()

            return JsonResponse({
                'success': True,
                'message': 'Scenario completed successfully',
                'data': {
                    'id': scenario.id,
                    'duration': scenario.duration,
                    'status': scenario.status,
                    'end_time': scenario.end_time.isoformat()  # Добавляем end_time в ответ
                }
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def bulk_create_users(request):
    """
    Массовое создание пользователей из Excel файла
    """
    try:
        # Парсим JSON данные
        data = json.loads(request.body)

        # Валидация обязательных полей
        required_fields = ['last_name', 'first_name', 'group']
        for field in required_fields:
            if field not in data or not data[field]:
                return JsonResponse({
                    'success': False,
                    'error': f'Отсутствует обязательное поле: {field}'
                })

        # Проверяем, не существует ли уже пользователь с такими данными
        existing_user = User.objects.filter(
            last_name=data['last_name'],
            first_name=data['first_name'],
            middle_name=data.get('middle_name', ''),
            group=data['group']
        ).first()

        if existing_user:
            return JsonResponse({
                'success': False,
                'error': f'Пользователь {data["last_name"]} {data["first_name"]} уже существует в группе {data["group"]}'
            })

        # Создаем пользователя
        user = User(
            last_name=data['last_name'],
            first_name=data['first_name'],
            middle_name=data.get('middle_name', ''),
            role='student',  # Все загружаемые пользователи - курсанты
            group=data['group']
        )

        # Валидация модели перед сохранением
        user.full_clean()
        user.save()

        return JsonResponse({
            'success': True,
            'user_id': user.id,
            'message': f'Пользователь {user.last_name} {user.first_name} успешно создан'
        })

    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'error': f'Ошибка валидации: {dict(e)}'
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Ошибка декодирования JSON'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Неизвестная ошибка: {str(e)}'
        })
