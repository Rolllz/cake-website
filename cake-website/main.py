from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import asyncpg
import re
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

app = FastAPI()

# Подключение статических файлов
app.mount("/", StaticFiles(directory="templates"), name="templates")  # Монтируем templates в корень
app.mount("/static", StaticFiles(directory="static"), name="static")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],  # Убрали 5500, так как используем только 8000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация базы данных
DATABASE_URL = {
    "user": "postgres",
    "password": "12345678",
    "host": "localhost",
    "port": 5432,
    "database": "cake_orders"
}

# Настройки JWT
SECRET_KEY = "d65f97e88c1e14f53d86592e23adfdac7d06cef9315290d4595241d143196699"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Хеширование паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Модель данных для заказа
class Order(BaseModel):
    name: str
    phone: str
    product: str
    quantity: int
    details: str | None = None
    total_cost: int

# Модель данных для пользователя
class User(BaseModel):
    username: str
    password: str

# Функция валидации телефона
def validate_phone(phone: str) -> bool:
    phone_pattern = r"^(?:\+7|8)\s?\(?\d{3}\)?\s?\d{3}-?\d{2}-?\d{2}$|^\d{10,11}$"
    return bool(re.match(phone_pattern, phone))

# Проверка токена
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Не удалось проверить токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

# Подключение к базе данных
async def init_db():
    try:
        app.state.db_pool = await asyncpg.create_pool(
            user=DATABASE_URL["user"],
            password=DATABASE_URL["password"],
            host=DATABASE_URL["host"],
            port=DATABASE_URL["port"],
            database=DATABASE_URL["database"]
        )
        async with app.state.db_pool.acquire() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    product TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    details TEXT,
                    total_cost INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL
                );
            ''')
        print("Подключение к базе данных успешно!")
    except Exception as e:
        print(f"Ошибка подключения к базе данных: {e}")

@app.on_event("startup")
async def startup():
    await init_db()

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

# Главная страница
@app.get("/")
async def root():
    return RedirectResponse(url="/index.html")

# Регистрация пользователя
@app.post("/register")
async def register(user: User):
    async with app.state.db_pool.acquire() as conn:
        existing_user = await conn.fetchval("SELECT username FROM users WHERE username = $1", user.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")
        
        hashed_password = pwd_context.hash(user.password)
        await conn.execute(
            "INSERT INTO users (username, hashed_password) VALUES ($1, $2)",
            user.username, hashed_password
        )
    return {"message": "Пользователь успешно зарегистрирован"}

# Создание JWT токена
def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Авторизация пользователя
@app.post("/login")
async def login(user: User):
    async with app.state.db_pool.acquire() as conn:
        db_user = await conn.fetchrow("SELECT * FROM users WHERE username = $1", user.username)
        if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль")
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

# Эндпоинт для создания заказа
@app.post("/order")
async def create_order(order: Order):
    if not validate_phone(order.phone):
        raise HTTPException(status_code=400, detail="Некорректный номер телефона. Используйте формат +7 (XXX) XXX-XX-XX или 10-11 цифр.")
    
    try:
        async with app.state.db_pool.acquire() as conn:
            await conn.execute(
                '''
                INSERT INTO orders (name, phone, product, quantity, details, total_cost)
                VALUES ($1, $2, $3, $4, $5, $6)
                ''',
                order.name, order.phone, order.product, order.quantity, order.details, order.total_cost
            )
        return {"message": f"Спасибо за заказ, {order.name}! Мы свяжемся с вами по номеру {order.phone}."}
    except Exception as e:
        print(f"Ошибка сервера: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении заказа: {str(e)}")

# Эндпоинт для получения заказов (только для авторизованных)
@app.get("/orders")
async def get_orders(current_user: str = Depends(get_current_user)):
    try:
        async with app.state.db_pool.acquire() as conn:
            orders = await conn.fetch("SELECT * FROM orders ORDER BY created_at DESC")
        return [dict(order) for order in orders]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении заказов: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)