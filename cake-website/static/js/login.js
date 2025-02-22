document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
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

        try {
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                window.location.href = 'index.html'; // Остаёмся на главной странице
            } else {
                const data = await response.json();
                showMessage(data.detail || 'Ошибка при входе', 'error');
            }
        } catch (err) {
            showMessage('Ошибка сети', 'error');
        }
    });
});