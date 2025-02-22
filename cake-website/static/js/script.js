document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('order-form');
    const productSelect = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const totalCostDisplay = document.getElementById('total-cost');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLink = document.getElementById('admin-link'); // Новая ссылка
    const messageContainer = document.getElementById('message-container');

    // Проверка авторизации
    const token = localStorage.getItem('token');
    if (token) {
        loginLink.style.display = 'none';
        logoutBtn.style.display = 'inline';
        adminLink.style.display = 'inline'; // Показываем ссылку на админ-панель
    }

    // Функция для отображения сообщений
    function showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        messageContainer.appendChild(message);
        setTimeout(() => message.remove(), 3500);
    }

    // Обновление стоимости
    function updateTotalCost() {
        const price = parseInt(productSelect.options[productSelect.selectedIndex].getAttribute('data-price'));
        const quantity = parseInt(quantityInput.value) || 0;
        const total = price * quantity;
        totalCostDisplay.textContent = `Общая стоимость: ${total} руб`;
    }

    productSelect.addEventListener('change', updateTotalCost);
    quantityInput.addEventListener('input', updateTotalCost);

    // Выход
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.reload();
    });

    // Отправка данных на сервер
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const quantity = quantityInput.value;
        const product = productSelect.options[productSelect.selectedIndex].text;
        const details = document.getElementById('details').value.trim();
        const phoneError = document.getElementById('phone-error');

        // Валидация телефона
        const phonePattern = /^(?:\+7|8)\s?\(?\d{3}\)?\s?\d{3}-?\d{2}-?\d{2}$|^\d{10,11}$/;
        if (!phonePattern.test(phone)) {
            phoneError.style.display = 'block';
            return;
        } else {
            phoneError.style.display = 'none';
        }

        if (!name || !phone || !quantity) {
            showMessage('Пожалуйста, заполните все обязательные поля: имя, телефон и количество.', 'error');
            return;
        }

        const orderData = {
            name,
            phone,
            product,
            quantity: parseInt(quantity),
            details,
            total_cost: parseInt(productSelect.options[productSelect.selectedIndex].getAttribute('data-price')) * parseInt(quantity)
        };

        try {
            const response = await fetch('http://localhost:8000/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.message, 'success');
                form.reset();
                totalCostDisplay.textContent = 'Общая стоимость: 0 руб';
            } else {
                const errorData = await response.json();
                showMessage(errorData.detail || 'Ошибка при отправке заказа. Попробуйте позже.', 'error');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showMessage('Произошла ошибка. Проверьте соединение с сервером.', 'error');
        }
    });
});