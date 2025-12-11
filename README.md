# ToDo List API

## Краткое описание
API-сервис для управления задачами с использованием матрицы Эйзенхауэра. Позволяет создавать, фильтровать и анализировать задачи по степени их важности и срочности.

## Технологии в проекте
- Python 3.10+
- FastAPI
- Uvicorn

## Инструкции по запуску

1. Клонируйте репозиторий:
```bash
git clone https://github.com/ArtemHelloWorld/fastapi-uni
cd fastapi-uni
```

2. Создайте и активируйте виртуальное окружение:
```bash
python -m venv venv
# Для Windows:
venv\Scripts\activate
# Для macOS/Linux:
source venv/bin/activate
```

3. Установите зависимости:

```bash
pip install -r requirements.txt
```

4. Запустите приложение:
```bash
uvicorn main:app --reload
```

5. Откройте в браузере http://127.0.0.1:8000/docs для просмотра документации и тестирования API.
