document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const messageContainer = document.getElementById('message-container');

    function showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        messageContainer.appendChild(message);
        setTimeout(() => message.remove(), 3500);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        if (password.length < 6) {
            showMessage('Пароль должен быть не менее 6 символов.', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                window.location.href = '/templates/login.html'; // Просто переход, без сообщения
            } else {
                const data = await response.json();
                showMessage(data.detail || 'Ошибка при регистрации', 'error');
            }
        } catch (err) {
            showMessage('Ошибка сети', 'error');
        }
    });
});