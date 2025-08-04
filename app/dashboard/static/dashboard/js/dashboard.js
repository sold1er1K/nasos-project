document.addEventListener('DOMContentLoaded', function() {
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const userListContainer = document.querySelector('.user-list');
    const scenarioHistoryTable = document.getElementById('scenario-history');
    const scenarioHistoryTbody = document.querySelector('#scenario-history tbody');
    const userDetailsContainer = document.querySelector('.user-info');

    // Загружаем список пользователей при загрузке страницы
    loadUsers();

    // Обработчики для фильтров (оставляем как было)
    filterToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        filterDropdown.classList.toggle('active');
        this.textContent = filterDropdown.classList.contains('active') ?
            'Фильтр ▲' : 'Фильтр ▼';
    });

    document.addEventListener('click', function(e) {
        if (!filterDropdown.contains(e.target) && e.target !== filterToggle) {
            filterDropdown.classList.remove('active');
            filterToggle.textContent = 'Фильтр ▼';
        }
    });

    document.querySelector('.filter-option[data-filter="today"]').addEventListener('click', function() {
        applyFilter('today', 'today');
    });

    document.querySelector('.filter-option[data-filter="week"]').addEventListener('click', function() {
        applyFilter('week', 'week');
    });

    document.querySelector('.filter-option[data-filter="month"]').addEventListener('click', function() {
        applyFilter('month', 'month');
    });

    document.getElementById('date-filter').addEventListener('change', function() {
        if (this.value) {
            applyFilter('date', this.value);
        }
    });

    document.getElementById('month-filter').addEventListener('change', function() {
        if (this.value) {
            const monthName = this.options[this.selectedIndex].text;
            applyFilter('month', this.value, monthName);
        }
    });

    document.getElementById('group-filter').addEventListener('change', function() {
        if (this.value) {
            applyFilter('group', this.value);
        }
    });

    function applyFilter(type, value, displayValue = null) {
        let message = '';
        const activeUserCard = document.querySelector('.user-card.active');

        if (!activeUserCard) {
            alert('Сначала выберите пользователя');
            return;
        }

        const userId = activeUserCard.dataset.userId;

        switch(type) {
            case 'today':
                message = 'Применен фильтр: Сегодня';
                loadScenarioHistory(userId, {filter: 'today'});
                break;
            case 'week':
                message = 'Применен фильтр: Неделя';
                loadScenarioHistory(userId, {filter: 'week'});
                break;
            case 'month':
                message = 'Применен фильтр: Месяц';
                loadScenarioHistory(userId, {filter: 'month'});
                break;
            case 'date':
                message = `Применен фильтр по дате: ${value}`;
                loadScenarioHistory(userId, {date: value});
                break;
            case 'month':
                message = `Применен фильтр по месяцу: ${displayValue}`;
                loadScenarioHistory(userId, {month: value});
                break;
            case 'group':
                message = `Применен фильтр по группе: ${value}`;
                // Фильтрация по группе уже происходит при загрузке пользователей
                break;
        }

        console.log(message);
        filterDropdown.classList.remove('active');
        filterToggle.textContent = 'Фильтр ▼';
    }

    // Функция загрузки списка пользователей
    function loadUsers() {
        fetch('/dashboard/users/api/')  // URL вашего API для получения пользователей
            .then(response => response.json())
            .then(users => {
                userListContainer.innerHTML = ''; // Очищаем список

                users.forEach(user => {
                    const userCard = document.createElement('div');
                    userCard.className = 'user-card';
                    userCard.dataset.userId = user.id;

                    const userName = document.createElement('div');
                    userName.className = 'user-name';
                    userName.textContent = `${user.last_name} ${user.first_name} ${user.middle_name || ''}`.trim();

                    const userRole = document.createElement('div');
                    userRole.className = 'user-role';
                    userRole.textContent = user.role === 'student' ? 'Курсант' : 'Преподаватель';

                    userCard.appendChild(userName);
                    userCard.appendChild(userRole);

                    if (user.role === 'student' && user.group) {
                        const userGroup = document.createElement('div');
                        userGroup.className = 'user-group';
                        userGroup.textContent = `Взвод: ${user.group}`;
                        userCard.appendChild(userGroup);
                    }

                    userCard.addEventListener('click', function() {
                        document.querySelectorAll('.user-card').forEach(c => c.classList.remove('active'));
                        this.classList.add('active');

                        // Загружаем историю сценариев для выбранного пользователя
                        loadScenarioHistory(user.id);
                        loadUserDetails(user.id);
                    });

                    userListContainer.appendChild(userCard);
                });

                // Активируем первого пользователя по умолчанию
                if (users.length > 0) {
                    const firstUserCard = userListContainer.querySelector('.user-card');
                    firstUserCard.classList.add('active');
                    loadScenarioHistory(users[0].id);
                    loadUserDetails(users[0].id);
                }
            })
            .catch(error => console.error('Ошибка загрузки пользователей:', error));
    }

    // Функция загрузки истории сценариев
    function loadScenarioHistory(userId, filters = {}) {
        let url = `/dashboard/scenario-history/?user_id=${userId}`;

        // Добавляем параметры фильтрации
        if (filters.filter) {
            url += `&filter=${filters.filter}`;
        } else if (filters.date) {
            url += `&date=${filters.date}`;
        } else if (filters.month) {
            url += `&month=${filters.month}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const tbody = document.querySelector('#scenario-history tbody');
                tbody.innerHTML = ''; // Очищаем только тело таблицы

                if (data.history && data.history.length > 0) {
                    // Фильтруем записи, чтобы не показывать дубликаты или ненужные статусы
                    const filteredHistory = data.history.filter((item, index, self) => {
                        // Можно добавить дополнительную логику фильтрации при необходимости
                        return true;
                    });

                    if (filteredHistory.length === 0) {
                        showNoDataMessage(tbody);
                        return;
                    }

                    filteredHistory.forEach(item => {
                        const row = document.createElement('tr');

                        // Вид события
                        const scenarioCell = document.createElement('td');
                        scenarioCell.textContent = `Сценарий ${item.scenario_id}`;

                        // Дата начала
                        const dateCell = document.createElement('td');
                        dateCell.textContent = new Date(item.start_time).toLocaleString();

                        // Длительность нормативная
                        const normDurationCell = document.createElement('td');
                        normDurationCell.textContent = item.norm_duration ?
                            `${parseFloat(item.norm_duration).toFixed(1)} мин` : '-';

                        // Длительность фактическая
                        const actualDurationCell = document.createElement('td');
                        // Для статуса "started" продолжительность обычно не известна
                        actualDurationCell.textContent = item.status === 'started' ? '-' :
                            (item.duration ? `${parseFloat(item.duration).toFixed(1)} мин` : '-');

                        // Результат
                        const resultCell = document.createElement('td');
                        let statusText = '';
                        switch(item.status) {
                            case 'started':
                                statusText = 'В процессе';
                                resultCell.classList.add('status-in-progress');
                                break;
                            case 'completed':
                                statusText = 'Успешно завершено';
                                resultCell.classList.add('status-completed');
                                break;
                            case 'failed':
                                statusText = 'Не удалось выполнить';
                                resultCell.classList.add('status-failed');
                                break;
                            default:
                                statusText = item.status || '-';
                        }
                        resultCell.textContent = statusText;

                        // Добавляем ячейки в строку
                        row.appendChild(scenarioCell);
                        row.appendChild(dateCell);
                        row.appendChild(normDurationCell);
                        row.appendChild(actualDurationCell);
                        row.appendChild(resultCell);

                        tbody.appendChild(row);
                    });
                } else {
                    showNoDataMessage(tbody);
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки истории сценариев:', error);
                showErrorMessage(tbody);
            });

        // Функция для показа сообщения об отсутствии данных
        function showNoDataMessage(tbody) {
            tbody.innerHTML = '';
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.textContent = 'Нет данных о прохождении сценариев';
            emptyCell.className = 'empty-message';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        }

        // Функция для показа сообщения об ошибке
        function showErrorMessage(tbody) {
            tbody.innerHTML = '';
            const errorRow = document.createElement('tr');
            const errorCell = document.createElement('td');
            errorCell.colSpan = 5;
            errorCell.textContent = 'Ошибка загрузки данных';
            errorCell.className = 'error-message';
            errorRow.appendChild(errorCell);
            tbody.appendChild(errorRow);
        }
    }

    // Функция загрузки деталей пользователя
    function loadUserDetails(userId) {
        fetch(`/dashboard/users/api/${userId}/`)
            .then(response => response.json())
            .then(user => {
                userDetailsContainer.innerHTML = `
                    <div class="info-row">
                        <span class="info-label">ФИО:</span>
                        <span class="info-value">${user.last_name} ${user.first_name} ${user.middle_name || ''}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Роль:</span>
                        <span class="info-value">${user.role === 'student' ? 'Курсант' : 'Преподаватель'}</span>
                    </div>
                    ${user.role === 'student' && user.group ? `
                    <div class="info-row">
                        <span class="info-label">Взвод:</span>
                        <span class="info-value">${user.group}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Дата регистрации:</span>
                        <span class="info-value">${new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                `;
            })
            .catch(error => console.error('Ошибка загрузки данных пользователя:', error));
    }
});