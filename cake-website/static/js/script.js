document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('order-form');
    const productSelect = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const totalCostDisplay = document.getElementById('total-cost');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLink = document.getElementById('admin-link');
    const messageContainer = document.getElementById('message-container');

    let token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
        loginLink.style.display = 'none';
        logoutBtn.style.display = 'inline';
        if (role === 'admin') {
            adminLink.style.display = 'inline';
        }
    }

    function showMessage(text, type) {
        console.log('Вызываем showMessage с текстом:', text); // Отладка
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        // Убираем анимацию для мгновенного отображения
        message.style.opacity = '1';
        message.style.transform = 'translateY(0)';
        if (messageContainer) {
            messageContainer.appendChild(message);
            console.log('Сообщение добавлено в DOM'); // Отладка
            setTimeout(() => message.remove(), 3500);
        } else {
            console.error('messageContainer не найден');
        }
    }

    function updateTotalCost() {
        const price = parseInt(productSelect.options[productSelect.selectedIndex].getAttribute('data-price'));
        const quantity = parseInt(quantityInput.value) || 0;
        const total = price * quantity;
        totalCostDisplay.textContent = `Общая стоимость: ${total} руб`;
    }

    productSelect.addEventListener('change', updateTotalCost);
    quantityInput.addEventListener('input', updateTotalCost);

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/templates/index.html';
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        if (name.length < 2) {
            showMessage('Имя должно содержать минимум 2 символа.', 'error');
            return;
        }
        const phone = document.getElementById('phone').value.trim();
        const quantity = quantityInput.value;
        const product = productSelect.options[productSelect.selectedIndex].text;
        const details = document.getElementById('details').value.trim();
        const phoneError = document.getElementById('phone-error');

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

        token = localStorage.getItem('token');
        console.log('Токен перед отправкой:', token);
        if (!token || token === 'undefined' || token === 'null') {
            console.log('Токен отсутствует или некорректен, редирект на логин');
            showMessage('Пожалуйста, войдите в систему, чтобы сделать заказ.', 'error');
            //setTimeout(() => {
            //    window.location.href = '/templates/login.html';
            //}, 2000); // Увеличиваем задержку до 2 секунд
            return;
        }

        try {
            console.log('Отправляем заказ с токеном:', token);
            const response = await fetch('http://localhost:8000/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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