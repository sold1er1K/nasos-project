// Функции уведомлений
function showNotification(message, type = 'error') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');

    if (!notification || !messageElement) {
        console.log('Notification:', message, type);
        return;
    }

    messageElement.textContent = message;
    notification.className = 'notification active';
    notification.classList.add(type);

    setTimeout(() => {
        hideNotification();
    }, 3000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('active');
        setTimeout(() => {
            notification.className = 'notification';
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function fetchWithCSRF(url, options = {}) {
        const csrftoken = getCookie('csrftoken');
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
    }

    // Основные элементы
    const addUserBtn = document.getElementById('add-user-btn');
    const userModal = document.getElementById('user-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const closeBtns = document.querySelectorAll('.close-btn, .cancel-btn');
    const userForm = document.getElementById('user-form');
    const roleSelect = document.getElementById('role');
    const groupField = document.getElementById('group-field');
    const usersTable = document.querySelector('.users-table tbody');
    const roleFilter = document.getElementById('role-filter');
    const groupFilter = document.getElementById('group-filter');
    const userSearch = document.getElementById('user-search');
    const resetFiltersBtn = document.getElementById('reset-filters');

    // Элементы для загрузки Excel
    const uploadUsersBtn = document.getElementById('upload-users-btn');
    const uploadModal = document.getElementById('upload-modal');
    const uploadProgressModal = document.getElementById('upload-progress-modal');
    const excelFileInput = document.getElementById('excel-file');
    const uploadForm = document.getElementById('upload-form');
    const uploadPreview = document.getElementById('upload-preview');
    const previewTbody = document.getElementById('preview-tbody');
    const previewStats = document.getElementById('preview-stats');
    const uploadSubmit = document.getElementById('upload-submit');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressDetails = document.getElementById('progress-details');

    let currentUserId = null;
    let allUsers = [];
    let allGroups = new Set();
    let excelData = [];

    // Проверяем существование элементов перед добавлением обработчиков
    if (document.querySelector('.notification-close')) {
        document.querySelector('.notification-close').addEventListener('click', hideNotification);
    }

    // Функция загрузки пользователей
    function loadUsers() {
        fetchWithCSRF('/dashboard/users/api/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(users => {
                allUsers = users;
                updateGroupsList(users);
                renderUsers(users);
                applyFilters();
            })
            .catch(error => {
                console.error('Ошибка загрузки пользователей:', error);
                showNotification('Ошибка загрузки пользователей');
            });
    }

    function updateGroupsList(users) {
        allGroups = new Set();
        users.forEach(user => {
            if (user.group) {
                allGroups.add(user.group);
            }
        });

        if (groupFilter) {
            groupFilter.innerHTML = '<option value="">Все взводы</option>';
            allGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                groupFilter.appendChild(option);
            });
        }
    }

    function renderUsers(users) {
        if (!usersTable) return;

        usersTable.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user.id;
            row.innerHTML = `
                <td>${user.last_name} ${user.first_name} ${user.middle_name || ''}</td>
                <td>${user.role === 'student' ? 'Курсант' : 'Преподаватель'}</td>
                <td>${user.group || '-'}</td>
                <td>${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                <td class="actions">
                    <button class="edit-btn" data-user-id="${user.id}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="delete-btn" data-user-id="${user.id}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </td>
            `;
            usersTable.appendChild(row);
        });

        initUserActions();
    }

    function applyFilters() {
        if (!roleFilter || !groupFilter || !userSearch) return;

        const roleValue = roleFilter.value;
        const groupValue = groupFilter.value;
        const searchValue = userSearch.value.toLowerCase();

        const filteredUsers = allUsers.filter(user => {
            const roleMatch = !roleValue || user.role === roleValue;

            const groupMatch = !groupValue ||
                             (user.group && user.group.toLowerCase().includes(groupValue.toLowerCase()));

            const nameMatch = !searchValue ||
                            `${user.last_name} ${user.first_name} ${user.middle_name || ''}`
                            .toLowerCase().includes(searchValue);

            return roleMatch && groupMatch && nameMatch;
        });

        renderUsers(filteredUsers);
    }

    function resetFilters() {
        if (roleFilter) roleFilter.value = '';
        if (groupFilter) groupFilter.value = '';
        if (userSearch) userSearch.value = '';
        applyFilters();
    }

    function initUserActions() {
        // Обработчики для основных кнопок
        if (addUserBtn) {
            addUserBtn.addEventListener('click', function() {
                currentUserId = null;
                document.getElementById('modal-title').textContent = 'Добавить пользователя';
                userForm.reset();
                if (groupField) groupField.style.display = 'none';
                if (userModal) userModal.classList.add('active');
            });
        }

        // Обработчики для кнопок редактирования и удаления
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.userId;
                fetchWithCSRF(`/dashboard/users/api/${userId}/`)
                    .then(response => response.json())
                    .then(user => {
                        currentUserId = user.id;
                        document.getElementById('modal-title').textContent = 'Редактировать пользователя';
                        document.getElementById('user-id').value = user.id;
                        document.getElementById('last-name').value = user.last_name;
                        document.getElementById('first-name').value = user.first_name;
                        document.getElementById('middle-name').value = user.middle_name || '';
                        document.getElementById('role').value = user.role;

                        if (user.role === 'student') {
                            document.getElementById('group').value = user.group || '';
                            if (groupField) groupField.style.display = 'block';
                        } else {
                            if (groupField) groupField.style.display = 'none';
                        }

                        if (userModal) userModal.classList.add('active');
                    });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentUserId = this.dataset.userId;
                if (confirmModal) confirmModal.classList.add('active');
            });
        });

        // Обработчики фильтров
        if (roleFilter) roleFilter.addEventListener('change', applyFilters);
        if (groupFilter) groupFilter.addEventListener('change', applyFilters);
        if (userSearch) userSearch.addEventListener('input', applyFilters);
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    }

    // Функционал загрузки Excel
    function initExcelUpload() {
        if (!uploadUsersBtn || !uploadModal) return;

        // Открытие модального окна загрузки
        uploadUsersBtn.addEventListener('click', function() {
            uploadModal.classList.add('active');
            resetUploadForm();
        });

        // Обработка выбора файла
        if (excelFileInput) {
            excelFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    document.getElementById('file-info').textContent =
                        `Выбран файл: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

                    readExcelFile(file);
                }
            });
        }

        // Отправка формы загрузки
        if (uploadForm) {
            uploadForm.addEventListener('submit', function(e) {
                e.preventDefault();

                if (excelData.length === 0) {
                    showNotification('Нет данных для загрузки');
                    return;
                }

                uploadModal.classList.remove('active');
                if (uploadProgressModal) uploadProgressModal.classList.add('active');

                uploadUsers(excelData);
            });
        }
    }

    // Чтение Excel файла
    function readExcelFile(file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Предполагаем, что данные в первом листе
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                processExcelData(jsonData);
            } catch (error) {
                showNotification('Ошибка чтения Excel файла: ' + error.message);
                resetUploadForm();
            }
        };

        reader.onerror = function() {
            showNotification('Ошибка при чтении файла');
            resetUploadForm();
        };

        reader.readAsArrayBuffer(file);
    }

    // Обработка данных из Excel
    function processExcelData(data) {
        if (data.length < 2) {
            showNotification('Файл не содержит данных');
            resetUploadForm();
            return;
        }

        // Определяем заголовки
        const headers = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');

        // Находим индексы колонок
        const lastNameIndex = headers.findIndex(h =>
            h.includes('фамил') || h === 'lastname' || h === 'фамилия');
        const firstNameIndex = headers.findIndex(h =>
            h.includes('имя') || h === 'firstname' || h === 'имя');
        const middleNameIndex = headers.findIndex(h =>
            h.includes('отчеств') || h.includes('отчество') || h === 'middlename');
        const groupIndex = headers.findIndex(h =>
            h.includes('групп') || h.includes('номер') || h === 'group' || h === 'группа');

        if (lastNameIndex === -1 || firstNameIndex === -1 || groupIndex === -1) {
            showNotification('Не найдены необходимые колонки: Фамилия, Имя, Группа');
            resetUploadForm();
            return;
        }

        // Обрабатываем строки данных
        excelData = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < Math.max(lastNameIndex, firstNameIndex, groupIndex) + 1) continue;

            const lastName = row[lastNameIndex] ? row[lastNameIndex].toString().trim() : '';
            const firstName = row[firstNameIndex] ? row[firstNameIndex].toString().trim() : '';
            const middleName = middleNameIndex !== -1 && row[middleNameIndex]
                ? row[middleNameIndex].toString().trim() : '';
            const group = row[groupIndex] ? row[groupIndex].toString().trim() : '';

            if (lastName && firstName && group) {
                excelData.push({
                    last_name: lastName,
                    first_name: firstName,
                    middle_name: middleName,
                    group: group,
                    role: 'student'
                });
            }
        }

        if (excelData.length === 0) {
            showNotification('Не найдено корректных данных для загрузки');
            resetUploadForm();
            return;
        }

        showPreview();
    }

    // Показ предпросмотра данных
    function showPreview() {
        if (!previewTbody || !uploadPreview || !previewStats) return;

        previewTbody.innerHTML = '';

        // Показываем первые 10 строк для предпросмотра
        const previewRows = excelData.slice(0, 10);

        previewRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.last_name}</td>
                <td>${row.first_name}</td>
                <td>${row.middle_name || '-'}</td>
                <td>${row.group}</td>
            `;
            previewTbody.appendChild(tr);
        });

        previewStats.innerHTML = `
            Найдено пользователей: ${excelData.length}<br>
            ${excelData.length > 10 ? `Показано первых 10 из ${excelData.length}` : ''}
        `;

        uploadPreview.style.display = 'block';
        if (uploadSubmit) uploadSubmit.disabled = false;
    }

    // Сброс формы загрузки
    function resetUploadForm() {
        if (excelFileInput) excelFileInput.value = '';
        if (document.getElementById('file-info')) {
            document.getElementById('file-info').textContent = '';
        }
        if (uploadPreview) uploadPreview.style.display = 'none';
        if (previewTbody) previewTbody.innerHTML = '';
        if (previewStats) previewStats.innerHTML = '';
        if (uploadSubmit) uploadSubmit.disabled = true;
        excelData = [];
    }

    // Загрузка пользователей на сервер
    function uploadUsers(users) {
        const totalUsers = users.length;
        let processed = 0;
        let successful = 0;
        let errors = [];

        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Начало загрузки...';
        if (progressDetails) progressDetails.innerHTML = '';

        function processNextUser() {
            if (processed >= totalUsers) {
                // Загрузка завершена
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Загрузка завершена!';

                setTimeout(() => {
                    if (uploadProgressModal) uploadProgressModal.classList.remove('active');

                    if (errors.length === 0) {
                        showNotification(`Успешно загружено ${successful} пользователей`, 'success');
                    } else {
                        showNotification(
                            `Загружено ${successful} из ${totalUsers} пользователей. Ошибок: ${errors.length}`,
                            'warning'
                        );
                    }

                    loadUsers(); // Обновляем таблицу
                }, 1000);

                return;
            }

            const user = users[processed];

            fetchWithCSRF('/dashboard/users/api/bulk_create/', {
                method: 'POST',
                body: JSON.stringify(user)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    successful++;
                } else {
                    errors.push({
                        user: user,
                        error: data.error || 'Неизвестная ошибка'
                    });
                }
            })
            .catch(error => {
                errors.push({
                    user: user,
                    error: 'Ошибка сети'
                });
            })
            .finally(() => {
                processed++;
                const progress = (processed / totalUsers) * 100;
                if (progressFill) progressFill.style.width = progress + '%';
                if (progressText) progressText.textContent = `Обработано ${processed} из ${totalUsers}`;

                if (progressDetails) {
                    progressDetails.innerHTML = `
                        Успешно: ${successful}<br>
                        Ошибок: ${errors.length}
                    `;
                }

                // Обрабатываем следующего пользователя с небольшой задержкой
                setTimeout(processNextUser, 100);
            });
        }

        // Начинаем обработку
        processNextUser();
    }

    // Обработчики для основных форм
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = {
                last_name: document.getElementById('last-name').value,
                first_name: document.getElementById('first-name').value,
                middle_name: document.getElementById('middle-name').value,
                role: document.getElementById('role').value,
                group: document.getElementById('role').value === 'student'
                    ? document.getElementById('group').value
                    : null
            };

            const url = currentUserId
                ? `/dashboard/users/api/${currentUserId}/`
                : '/dashboard/users/api/';
            const method = currentUserId ? 'PUT' : 'POST';

            fetchWithCSRF(url, {
                method: method,
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    userModal.classList.remove('active');
                    loadUsers();
                    showNotification(
                        currentUserId
                            ? 'Пользователь успешно обновлен'
                            : 'Пользователь успешно добавлен',
                        'success'
                    );
                } else {
                    showNotification(data.error || 'Неизвестная ошибка');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                showNotification('Произошла ошибка при сохранении пользователя');
            });
        });
    }

    if (document.getElementById('confirm-delete')) {
        document.getElementById('confirm-delete').addEventListener('click', function() {
            if (currentUserId) {
                fetchWithCSRF(`/dashboard/users/api/${currentUserId}/`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        confirmModal.classList.remove('active');
                        loadUsers();
                        showNotification('Пользователь успешно удален', 'success');
                    } else {
                        showNotification(data.error || 'Неизвестная ошибка');
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                    showNotification('Произошла ошибка при удалении пользователя');
                });
            }
        });
    }

    // Обработчики закрытия модальных окон
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (userModal) userModal.classList.remove('active');
            if (confirmModal) confirmModal.classList.remove('active');
            if (uploadModal) uploadModal.classList.remove('active');
            if (uploadProgressModal) uploadProgressModal.classList.remove('active');
        });
    });

    // Закрытие модальных окон по клику вне контента
    [userModal, confirmModal, uploadModal, uploadProgressModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        }
    });

    // Обработчик изменения роли
    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            if (this.value === 'student') {
                if (groupField) groupField.style.display = 'block';
            } else {
                if (groupField) groupField.style.display = 'none';
            }
        });
    }

    // Инициализация функционала
    loadUsers();
    initExcelUpload();
    initUserActions();
});