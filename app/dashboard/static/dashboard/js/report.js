document.addEventListener('DOMContentLoaded', function() {
    // Переключение типа отчета
    const reportTypeButtons = document.querySelectorAll('.type-option');
    reportTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            reportTypeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            loadReportData();
        });
    });

    // Переключение типа визуализации
    const chartTypeButtons = document.querySelectorAll('.chart-option');
    chartTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            chartTypeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const chartType = this.dataset.chart;
            document.querySelectorAll('.chart-container, .table-container').forEach(el => {
                el.classList.remove('active');
            });

            if (chartType === 'table') {
                document.getElementById('report-table').classList.add('active');
            } else {
                document.getElementById(`${chartType}-chart`).classList.add('active');
                renderChart(chartType);
            }
        });
    });

    // Фильтры (аналогично dashboard.js)
    const filterToggle = document.getElementById('report-filter-toggle');
    const filterDropdown = document.getElementById('report-filter-dropdown');

    filterToggle.addEventListener('click', function() {
        filterDropdown.classList.toggle('active');
        this.textContent = filterDropdown.classList.contains('active') ?
            'Фильтр ▲' : 'Фильтр ▼';
    });

    // Загрузка данных отчета
    function loadReportData() {
        const reportType = document.querySelector('.type-option.active').dataset.type;
        // Здесь будет AJAX запрос для получения данных
        console.log(`Loading ${reportType} report data`);
    }

    // Рендеринг графиков
    function renderChart(chartType) {
        const ctxPie = document.getElementById('pieChartCanvas').getContext('2d');
        const ctxBar = document.getElementById('barChartCanvas').getContext('2d');

        // Пример данных - в реальности будут приходить с сервера
        const data = {
            labels: ['ПИ-201', 'ПИ-202', 'ПИ-203'],
            datasets: [{
                data: [30, 45, 25],
                backgroundColor: ['#4361ee', '#3a0ca3', '#7209b7'],
            }]
        };

        if (chartType === 'pie') {
            new Chart(ctxPie, {
                type: 'pie',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        } else if (chartType === 'bar') {
            new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Активные пользователи',
                        data: data.datasets[0].data,
                        backgroundColor: '#4361ee',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    // Инициализация
    loadReportData();
    renderChart('pie');
});