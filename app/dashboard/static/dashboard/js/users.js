function showNotification(message, type = 'error') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');

    messageElement.textContent = message;
    notification.className = 'notification active';
    notification.classList.add(type);

    setTimeout(() => {
        hideNotification();
    }, 3000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('active');
    setTimeout(() => {
        notification.className = 'notification';
    }, 300);
}

document.querySelector('.notification-close')?.addEventListener('click', hideNotification);

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

    let currentUserId = null;
    let allUsers = [];
    let allGroups = new Set();

    function loadUsers() {
        fetchWithCSRF('/dashboard/users/api/')
            .then(response => response.json())
            .then(users => {
                allUsers = users;
                updateGroupsList(users);
                renderUsers(users);
                applyFilters();
            })
            .catch(error => {
                console.error('Ошибка загрузки пользователей:', error);
            });
    }

    function updateGroupsList(users) {
        allGroups = new Set();
        users.forEach(user => {
            if (user.group) {
                allGroups.add(user.group);
            }
        });

        groupFilter.innerHTML = '<option value="">Все группы</option>';
        allGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            groupFilter.appendChild(option);
        });
    }

    function renderUsers(users) {
        usersTable.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user.id;
            row.innerHTML = `
                <td>${user.last_name} ${user.first_name} ${user.middle_name || ''}</td>
                <td>${user.role === 'student' ? 'Студент' : 'Преподаватель'}</td>
                <td>${user.group || '-'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
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
        roleFilter.value = '';
        groupFilter.value = '';
        userSearch.value = '';
        applyFilters();
    }

    function initUserActions() {
        addUserBtn.addEventListener('click', function() {
            currentUserId = null;
            document.getElementById('modal-title').textContent = 'Добавить пользователя';
            userForm.reset();
            groupField.style.display = 'none';
            userModal.classList.add('active');
        });

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
                            groupField.style.display = 'block';
                        } else {
                            groupField.style.display = 'none';
                        }

                        userModal.classList.add('active');
                    });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentUserId = this.dataset.userId;
                confirmModal.classList.add('active');
            });
        });

        roleFilter.addEventListener('change', applyFilters);
        groupFilter.addEventListener('change', applyFilters);
        userSearch.addEventListener('input', applyFilters);

        resetFiltersBtn.addEventListener('click', resetFilters);
    }

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

    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            userModal.classList.remove('active');
            confirmModal.classList.remove('active');
        });
    });

    [userModal, confirmModal].forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    roleSelect.addEventListener('change', function() {
        if (this.value === 'student') {
            groupField.style.display = 'block';
        } else {
            groupField.style.display = 'none';
        }
    });

    loadUsers();
});