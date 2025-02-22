document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const ordersBody = document.getElementById('orders-body');
    const error = document.getElementById('error');
    const logoutBtn = document.getElementById('logout-btn');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Загрузка заказов
    try {
        const response = await fetch('http://localhost:8000/orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const orders = await response.json();
            ordersBody.innerHTML = '';
            orders.forEach(order => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${order.name}</td>
                    <td>${order.phone}</td>
                    <td>${order.product}</td>
                    <td>${order.quantity}</td>
                    <td>${order.details || '-'}</td>
                    <td>${order.total_cost} руб</td>
                    <td>${new Date(order.created_at).toLocaleString('ru')}</td>
                `;
                ordersBody.appendChild(row);
            });
        } else {
            error.textContent = 'Ошибка загрузки заказов';
            error.style.display = 'block';
        }
    } catch (err) {
        error.textContent = 'Ошибка сети';
        error.style.display = 'block';
    }

    // Выход
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});