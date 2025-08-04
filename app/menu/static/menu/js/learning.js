let currentScenarioId = 0;

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.style.display = 'block';
    statusDiv.textContent = message;

    // Очищаем предыдущие классы
    statusDiv.className = 'status-message';

    // Добавляем класс в зависимости от типа сообщения
    if (type === 'error') {
        statusDiv.classList.add('error-message');
    } else if (type === 'success') {
        statusDiv.classList.add('success-message');
    } else if (type === 'loading') {
        statusDiv.classList.add('loading-message');
    }
}

// Добавляем стили для статусных сообщений
const style = document.createElement('style');
style.textContent = `
    .status-message {
        padding: 10px 15px;
        margin: 10px 0;
        border-radius: 4px;
        display: none;
    }
    .error-message {
        background-color: #ffebee;
        color: #c62828;
        border-left: 4px solid #c62828;
    }
    .success-message {
        background-color: #e8f5e9;
        color: #2e7d32;
        border-left: 4px solid #2e7d32;
    }
    .loading-message {
        background-color: #e3f2fd;
        color: #1565c0;
        border-left: 4px solid #1565c0;
    }
`;
document.head.appendChild(style);

function openModal(scenarioId) {
    currentScenarioId = scenarioId;
    document.getElementById('scenario-id').value = scenarioId;
    const modal = document.getElementById('launch-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('status').style.display = 'none';
    document.getElementById('status').textContent = '';
}

function closeModal() {
    const modal = document.getElementById('launch-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleGroupField() {
    const role = document.getElementById('role').value;
    const groupField = document.getElementById('group-field');

    if (role === 'student') {
        groupField.style.display = 'block';
        document.getElementById('group').required = true;
    } else {
        groupField.style.display = 'none';
        document.getElementById('group').required = false;
    }
}

async function getOrCreateUser(formData) {
    try {
        const response = await fetch('/check-user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lastName: formData.lastName,
                firstName: formData.firstName,
                middleName: formData.middleName,
                role: formData.role,
                group: formData.group
            })
        });

        const data = await response.json();

        if (response.ok) {
            return data.id || data.existing_user_id;
        } else {
            throw new Error(data.error || 'Не удалось получить ID пользователя');
        }
    } catch (error) {
        console.error('Ошибка при получении ID пользователя:', error);
        throw error;
    }
}

async function loadScenarioHistory(userId) {
    try {
        const response = await fetch(`/dashboard/scenario-history/?user_id=${userId}`);
        const data = await response.json();

        const historyTable = document.getElementById('scenario-history');
        if (!historyTable) return;

        historyTable.innerHTML = ''; // Очищаем таблицу

        if (data.history && data.history.length > 0) {
            data.history.forEach(item => {
                const row = document.createElement('tr');

                const scenarioCell = document.createElement('td');
                scenarioCell.textContent = `Сценарий ${item.scenario_id}`;

                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(item.start_time).toLocaleString();

                const durationCell = document.createElement('td');
                durationCell.textContent = item.duration ?
                    `${parseFloat(item.duration).toFixed(1)} мин` : '-';

                const resultCell = document.createElement('td');
                resultCell.textContent = item.result || item.status;

                row.appendChild(scenarioCell);
                row.appendChild(dateCell);
                row.appendChild(durationCell);
                row.appendChild(resultCell);

                historyTable.appendChild(row);
            });
        } else {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 4;
            emptyCell.textContent = 'Нет данных о прохождении сценариев';
            emptyCell.className = 'empty-message';
            emptyRow.appendChild(emptyCell);
            historyTable.appendChild(emptyRow);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории сценариев:', error);
    }
}

// Добавляем стиль для пустого сообщения
const historyStyle = document.createElement('style');
historyStyle.textContent = `
    .empty-message {
        text-align: center;
        padding: 20px;
        color: #666;
    }
`;
document.head.appendChild(historyStyle);

async function launchScenario(event) {
    event.preventDefault();

    showStatus("Проверка пользователя...", 'loading');

    try {
        // 1. Сначала проверяем/создаем пользователя
        const userData = {
            lastName: document.getElementById('last-name').value.trim(),
            firstName: document.getElementById('first-name').value.trim(),
            middleName: document.getElementById('middle-name').value.trim(),
            role: document.getElementById('role').value,
            group: document.getElementById('role').value === 'student'
                ? document.getElementById('group').value.trim()
                : null
        };

        const checkResponse = await fetch('/check-user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const checkData = await checkResponse.json();

        if (!checkResponse.ok) {
            throw new Error(checkData.error || 'Ошибка проверки пользователя');
        }

        // 2. Запускаем сценарий с полученным userId
        const formData = {
            lastName: userData.lastName,
            firstName: userData.firstName,
            middleName: userData.middleName,
            role: userData.role,
            group: userData.group,
            userId: checkData.userId,
            scenarioId: currentScenarioId
        };

        showStatus("Запуск 3D симулятора...", 'loading');

        const launchResponse = await fetch(`/launch-scenario/${currentScenarioId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!launchResponse.ok) {
            const errorData = await launchResponse.json();
            throw new Error(errorData.error || `Ошибка запуска сценария: ${launchResponse.status}`);
        }

        const launchData = await launchResponse.json();
        showStatus(launchData.message || "Сценарий успешно запущен!", 'success');

        // 3. Обновляем историю сценариев
        if (checkData.userId) {
            await loadScenarioHistory(checkData.userId);
        }

    } catch (error) {
        console.error('Error:', error);
        showStatus(error.message, 'error');
    }
}