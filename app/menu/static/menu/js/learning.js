let currentScenarioId = 0;

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

function launchScenario(event) {
    event.preventDefault();

    function getCSRFToken() {
        const csrfCookie = document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    }

    const csrftoken = getCSRFToken();

    if (!csrftoken) {
        showStatus("Ошибка безопасности. Пожалуйста, перезагрузите страницу.", 'error');
        return;
    }

    const formData = {
        lastName: document.getElementById('last-name').value.trim(),
        firstName: document.getElementById('first-name').value.trim(),
        middleName: document.getElementById('middle-name').value.trim(),
        role: document.getElementById('role').value,
        group: document.getElementById('role').value === 'student'
              ? document.getElementById('group').value.trim()
              : null,
        scenarioId: currentScenarioId
    };

    if (!formData.lastName || !formData.firstName || !formData.role) {
        showStatus('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }

    showStatus("Проверка пользователя...", 'loading');
    fetch('/check-user/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({
            lastName: formData.lastName,
            firstName: formData.firstName,
            middleName: formData.middleName,
            role: formData.role
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка сервера');
        return response.json();
    })
    .then(data => {
        if (data.exists) {
            showStatus("Запуск 3D симулятора...", 'loading');
            return fetch(`/launch-scenario/${currentScenarioId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
        } else {
            throw new Error('Пользователь не найден');
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        showStatus(data.message || "Сценарий успешно запущен! Перенаправление...", 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(error.message, 'error');
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'block';
    statusDiv.textContent = message;

    statusDiv.className = 'status-message';

    if (type === 'error') {
        statusDiv.classList.add('error-message');
    } else if (type === 'success') {
        statusDiv.classList.add('success-message');
    } else if (type === 'loading') {
        statusDiv.classList.add('loading-message');
    }
}

const style = document.createElement('style');
style.textContent = `
    .error-message {
        background-color: #ffebee !important;
        color: #c62828 !important;
        border-left: 4px solid #c62828;
    }
    .success-message {
        background-color: #e8f5e9 !important;
        color: #2e7d32 !important;
        border-left: 4px solid #2e7d32;
    }
    .loading-message {
        background-color: #e3f2fd !important;
        color: #1565c0 !important;
        border-left: 4px solid #1565c0;
    }
`;
document.head.appendChild(style);