document.addEventListener('DOMContentLoaded', function() {
    // Инициализация графиков
    initCharts();

    // Обработчики для переключения типов отчетов
    document.querySelectorAll('.report-type-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.report-type-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('current-chart-title').textContent = this.textContent.trim();
            updateChartType(this.dataset.report);
            applyFilters();
        });
    });

    // Обработчики для переключения типов диаграмм
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Скрыть все графики
            document.querySelectorAll('.chart-content').forEach(content => {
                content.classList.remove('active');
            });

            // Показать выбранный график
            document.getElementById(`${this.dataset.type}-chart`).classList.add('active');
        });
    });

    // Обработчики для периодов
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFilters();
        });
    });

    // Обработчики для фильтров
    document.getElementById('specific-date').addEventListener('change', function() {
        if (this.value) {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        }
        applyFilters();
    });

    document.getElementById('specific-month').addEventListener('change', function() {
        if (this.value) {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        }
        applyFilters();
    });

    document.getElementById('group-filter').addEventListener('change', applyFilters);

    // Сброс фильтров
    document.getElementById('reset-analytics-filters').addEventListener('click', function() {
        document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.period-btn[data-period="week"]').classList.add('active');
        document.getElementById('specific-date').value = '';
        document.getElementById('specific-month').value = '';
        document.getElementById('group-filter').value = '';
        applyFilters();
    });

    // Инициализация данных
    applyFilters();
});

function initCharts() {
    // Инициализация столбчатой диаграммы
    const barCtx = document.getElementById('barChartCanvas').getContext('2d');
    window.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Активные пользователи',
                data: [],
                backgroundColor: '#4361ee',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Активные пользователи по датам'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            }
        }
    });

    // Инициализация круговой диаграммы
    const pieCtx = document.getElementById('pieChartCanvas').getContext('2d');
    window.pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Курсанты', 'Преподаватели'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#4361ee', '#4cc9f0']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Распределение по ролям'
                }
            }
        }
    });
}

function updateChartType(reportType) {
    // Обновляем заголовки и данные в зависимости от типа отчета
    const barChart = window.barChart;
    const pieChart = window.pieChart;

    if (reportType === 'active-users') {
        barChart.options.plugins.title.text = 'Активные пользователи по датам';
        barChart.data.datasets[0].label = 'Активные пользователи';
        pieChart.data.labels = ['Курсанты', 'Преподаватели'];
    } else if (reportType === 'learning') {
        barChart.options.plugins.title.text = 'Сессии обучения по датам';
        barChart.data.datasets[0].label = 'Сессии обучения';
        pieChart.data.labels = ['Курсанты', 'Преподаватели'];
    } else if (reportType === 'testing') {
        barChart.options.plugins.title.text = 'Тестирования по датам';
        barChart.data.datasets[0].label = 'Тестирования';
        pieChart.data.labels = ['Успешные', 'Неуспешные'];
    }

    barChart.update();
    pieChart.update();
}

function applyFilters() {
    const period = document.querySelector('.period-btn.active')?.dataset.period || 'week';
    const specificDate = document.getElementById('specific-date').value;
    const specificMonth = document.getElementById('specific-month').value;
    const group = document.getElementById('group-filter').value;
    const reportType = document.querySelector('.report-type-item.active').dataset.report;

    // Формируем данные для запроса
    const filters = {
        period: specificDate ? 'custom' : specificMonth ? 'month' : period,
        date: specificDate,
        month: specificMonth,
        group: group,
        report_type: reportType
    };

    // Отправляем запрос на сервер
    fetch('/api/analytics/active-users/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(filters)
    })
    .then(response => response.json())
    .then(data => {
        updateChartsWithData(data, reportType);
        updateTableWithData(data, reportType);
    })
    .catch(error => {
        console.error('Error:', error);
        // Для демонстрации используем тестовые данные
        const testData = generateTestData(period, group, reportType);
        updateChartsWithData(testData, reportType);
        updateTableWithData(testData, reportType);
    });
}

function getCSRFToken() {
    const name = 'csrftoken';
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

function updateChartsWithData(data, reportType) {
    // Обновляем столбчатую диаграмму
    const barChart = window.barChart;
    barChart.data.labels = data.labels;

    if (reportType === 'testing') {
        // Для тестирования показываем две группы данных
        barChart.data.datasets = [
            {
                label: 'Успешные тесты',
                data: data.successData || data.successDataTesting || [],
                backgroundColor: '#4caf50',
                borderWidth: 1
            },
            {
                label: 'Неуспешные тесты',
                data: data.failedData || data.failedDataTesting || [],
                backgroundColor: '#f44336',
                borderWidth: 1
            }
        ];
    } else if (reportType === 'learning') {
        // Для обучения показываем одну группу данных
        barChart.data.datasets = [
            {
                label: 'Сессии обучения',
                data: data.learningSessionsData || [],
                backgroundColor: '#4361ee',
                borderWidth: 1
            }
        ];
    } else {
        // Для активных пользователей показываем одну группу данных
        barChart.data.datasets = [
            {
                label: 'Активные пользователи',
                data: data.activeUsersData || [],
                backgroundColor: '#4361ee',
                borderWidth: 1
            }
        ];
    }

    barChart.update();

    // Обновляем круговую диаграмму
    const pieChart = window.pieChart;

    if (reportType === 'testing') {
        const totalSuccess = (data.successData || data.successDataTesting || []).reduce((a, b) => a + b, 0);
        const totalFailed = (data.failedData || data.failedDataTesting || []).reduce((a, b) => a + b, 0);
        pieChart.data.datasets[0].data = [totalSuccess, totalFailed];
        pieChart.data.labels = ['Успешные', 'Неуспешные'];
    } else {
        const totalStudents = (data.studentsData || []).reduce((a, b) => a + b, 0);
        const totalTeachers = (data.teachersData || []).reduce((a, b) => a + b, 0);
        pieChart.data.datasets[0].data = [totalStudents, totalTeachers];
        pieChart.data.labels = ['Курсанты', 'Преподаватели'];
    }

    pieChart.update();
}

function updateTableWithData(data, reportType) {
    const tableBody = document.getElementById('analytics-table-body');
    tableBody.innerHTML = '';

    for (let i = 0; i < data.labels.length; i++) {
        const row = document.createElement('tr');

        if (reportType === 'testing') {
            row.innerHTML = `
                <td>${data.labels[i]}</td>
                <td>${(data.successData || data.successDataTesting || [])[i] || 0}</td>
                <td>${(data.failedData || data.failedDataTesting || [])[i] || 0}</td>
                <td>${((data.successData || data.successDataTesting || [])[i] || 0) + ((data.failedData || data.failedDataTesting || [])[i] || 0)}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${data.labels[i]}</td>
                <td>${data.activeUsersData[i] || data.learningSessionsData[i] || 0}</td>
                <td>${data.studentsData[i] || 0}</td>
                <td>${data.teachersData[i] || 0}</td>
            `;
        }

        tableBody.appendChild(row);
    }

    // Обновляем заголовки таблицы в зависимости от типа отчета
    const tableHeaders = document.querySelectorAll('.analytics-table th');
    if (reportType === 'testing') {
        tableHeaders[1].textContent = 'Успешные';
        tableHeaders[2].textContent = 'Неуспешные';
        tableHeaders[3].textContent = 'Всего';
    } else if (reportType === 'learning') {
        tableHeaders[1].textContent = 'Сессии обучения';
        tableHeaders[2].textContent = 'Курсанты';
        tableHeaders[3].textContent = 'Преподаватели';
    } else {
        tableHeaders[1].textContent = 'Активные пользователи';
        tableHeaders[2].textContent = 'Курсанты';
        tableHeaders[3].textContent = 'Преподаватели';
    }
}

function generateTestData(period, group, reportType) {
    const now = new Date();
    let labels = [];
    let activeUsersData = [];
    let learningSessionsData = [];
    let studentsData = [];
    let teachersData = [];
    let successDataTesting = [];
    let failedDataTesting = [];

    if (period === 'today') {
        labels.push(now.toLocaleDateString());
        activeUsersData.push(Math.floor(Math.random() * 50) + 30);
        learningSessionsData.push(Math.floor(Math.random() * 40) + 20);
        studentsData.push(Math.floor(Math.random() * 40) + 20);
        teachersData.push(Math.floor(Math.random() * 15) + 5);
        successDataTesting.push(Math.floor(Math.random() * 25) + 15);
        failedDataTesting.push(Math.floor(Math.random() * 10) + 5);
    } else if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            labels.push(date.toLocaleDateString());
            activeUsersData.push(Math.floor(Math.random() * 70) + 30);
            learningSessionsData.push(Math.floor(Math.random() * 50) + 30);
            studentsData.push(Math.floor(Math.random() * 50) + 20);
            teachersData.push(Math.floor(Math.random() * 20) + 10);
            successDataTesting.push(Math.floor(Math.random() * 35) + 15);
            failedDataTesting.push(Math.floor(Math.random() * 15) + 5);
        }
    } else if (period === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            if (i % 2 === 0) {
                labels.push(`${i}.${now.getMonth() + 1}`);
                activeUsersData.push(Math.floor(Math.random() * 80) + 40);
                learningSessionsData.push(Math.floor(Math.random() * 60) + 40);
                studentsData.push(Math.floor(Math.random() * 60) + 30);
                teachersData.push(Math.floor(Math.random() * 25) + 10);
                successDataTesting.push(Math.floor(Math.random() * 40) + 20);
                failedDataTesting.push(Math.floor(Math.random() * 20) + 5);
            }
        }
    }

    if (reportType === 'testing') {
        return {
            labels,
            successData: successDataTesting,
            failedData: failedDataTesting,
            successDataTesting,
            failedDataTesting
        };
    } else if (reportType === 'learning') {
        return {
            labels,
            learningSessionsData,
            studentsData,
            teachersData
        };
    } else {
        return {
            labels,
            activeUsersData,
            studentsData,
            teachersData
        };
    }
}