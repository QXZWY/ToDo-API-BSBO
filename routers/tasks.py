from fastapi import APIRouter, HTTPException, Query
from data import tasks_db

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)

@router.get("/")
async def get_all_tasks() -> dict:
    return {
        "count": len(tasks_db),
        "tasks": tasks_db
    }

@router.get("/quadrant/{quadrant}")
async def get_tasks_by_quadrant(quadrant: str) -> dict:
    if quadrant not in ["Q1", "Q2", "Q3", "Q4"]:
        raise HTTPException(
            status_code=400,
            detail="Неверный квадрант. Используйте: Q1, Q2, Q3, Q4"
        )
    filtered_tasks = [
        task
        for task in tasks_db
        if task["quadrant"] == quadrant
    ]
    return {
        "quadrant": quadrant,
        "count": len(filtered_tasks),
        "tasks": filtered_tasks
    }

@router.get("/search")
async def search_tasks(q: str = Query(..., min_length=2)) -> dict:
    filtered = [
        task for task in tasks_db
        if q.lower() in task["title"].lower() or
           (task["description"] and q.lower() in task["description"].lower())
    ]
    if not filtered:
        raise HTTPException(status_code=404, detail="Нет задач по данному запросу")
    return {"query": q, "count": len(filtered), "tasks": filtered}

@router.get("/status/{status}")
async def get_tasks_by_status(status: str) -> dict:
    if status not in ["completed", "pending"]:
        raise HTTPException(status_code=404, detail="Статус должен быть 'completed' или 'pending'")
    status_bool = True if status == "completed" else False
    filtered_tasks = [task for task in tasks_db if task["completed"] == status_bool]
    return {
        "status": status,
        "count": len(filtered_tasks),
        "tasks": filtered_tasks
    }

@router.get("/{task_id}")
async def get_task_by_id(task_id: int) -> dict:
    for task in tasks_db:
        if task['id'] == task_id:
            return task
    raise HTTPException(status_code=404, detail=f"Задача с ID={task_id} не найдена")