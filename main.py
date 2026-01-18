# Главный файл приложения
from fastapi import FastAPI
from routers import tasks, stats

app = FastAPI(
    title="ToDo лист API",
    description="API для управления задачами с использованием матрицы Эйзенхауэра",
    version="1.0.0",
    contact={"name": "Матвей"}
)

# Подключение роутеров
app.include_router(Tasks.router)
app.include_router(stats.router)

@app.get("/")
async def root():
    return {
        "message": "Привет, студент!",
        "api_title": app.title,
        "api_description": app.description,
        "api_version": app.version,
        "api_author": app.contact.get("name")
    }