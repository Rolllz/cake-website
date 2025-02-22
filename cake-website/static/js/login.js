document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const messageContainer = document.getElementById('message-container');

    if (!form) {
        console.error('Форма с id="login-form" не найдена');
        return;
    }

    function showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        messageContainer.appendChild(message);
        setTimeout(() => message.remove(), 3500);
    }

    form.addEventListener('submit', async (e) => {
        console.log('Форма отправлена'); // Отладка
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!username || !password) {
            showMessage('Введите имя пользователя и пароль.', 'error');
            return;
        }

        try {
            console.log('Отправляем POST-запрос к /login'); // Отладка
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            console.log('Ответ получен:', response.status); // Отладка
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('role', data.role);
                if (data.role === 'admin') {
                    window.location.href = '/templates/admin.html';
                } else {
                    window.location.href = '/templates/index.html';
                }
            } else {
                const data = await response.json();
                showMessage(data.detail || 'Ошибка при входе', 'error');
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
            showMessage('Ошибка сети', 'error');
        }
    });
});