from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db, get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from routers import tasks, stats, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код ДО yield выполняется при ЗАПУСКЕ
    print(" Запуск приложения...")
    print(" Инициализация базы данных...")
    # Создаем таблицы (если их нет)
    await init_db()
    print(" Приложение готово к работе!")
    yield  # Здесь приложение работает

    # Код ПОСЛЕ yield выполняется при ОСТАНОВКЕ
    print(" Остановка приложения...")

app = FastAPI(
    title="ToDo лист API",
    description="API для управления задачами с использованием матрицы Эйзенхауэра",
    version="3.0.0",
    contact={"name": "Матвей"},
    lifespan=lifespan  # Подключаем lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5500",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/api/v3")  # подключение роутера к приложению
app.include_router(stats.router, prefix="/api/v3")
app.include_router(auth.router, prefix="/api/v3")

@app.get("/")
async def read_root() -> dict:
    return {
        "message": "Task Manager API - Управление задачами по матрице Эйзенхауэра",
        "version": "3.0.0",
        "database": "PostgreSQL (Supabase)",
        "docs": "/docs",
        "redoc": "/redoc",
    }

@app.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_async_session)
) -> dict:
    """
    Проверка здоровья API и динамическая проверка подключения к БД.
    """
    try:
        # Пытаемся выполнить простейший запрос к БД
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status
    }