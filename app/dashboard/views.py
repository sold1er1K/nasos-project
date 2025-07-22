import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import User


def dashboard(request):
    nav_items = ["archive", "stats", "settings"]
    sidebar_open = request.session.get('sidebar_open', False)

    return render(request, 'dashboard/dashboard.html', {
        'nav_items': nav_items,
        'sidebar_open': sidebar_open
    })

def users_page(request):
    return render(request, 'dashboard/users.html')


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