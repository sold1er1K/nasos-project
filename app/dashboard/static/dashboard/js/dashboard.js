document.addEventListener('DOMContentLoaded', function() {
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');

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
        alert('Фильтр "Сегодня" применен');
    });

    document.getElementById('date-filter').addEventListener('change', function() {
        if (this.value) {
            applyFilter('date', this.value);
        }
    });

    document.getElementById('month-filter').addEventListener('change', function() {
        if (this.value) {
            applyFilter('month', this.value);
        }
    });

    document.getElementById('group-filter').addEventListener('change', function() {
        if (this.value) {
            applyFilter('group', this.value);
        }
    });

    function applyFilter(type, value) {
        let message = '';

        switch(type) {
            case 'today':
                message = 'Применен фильтр: Сегодня';
                break;
            case 'week':
                message = 'Применен фильтр: Неделя';
                break;
            case 'month':
                message = 'Применен фильтр: Месяц';
                break;
            case 'date':
                message = `Применен фильтр по дате: ${value}`;
                break;
            case 'month':
                const monthName = document.getElementById('month-filter')
                    .options[document.getElementById('month-filter').selectedIndex].text;
                message = `Применен фильтр по месяцу: ${monthName}`;
                break;
            case 'group':
                message = `Применен фильтр по группе: ${value}`;
                break;
        }

        alert(message);
        filterDropdown.classList.remove('active');
        filterToggle.textContent = 'Фильтр ▼';

    }

    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.user-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
});