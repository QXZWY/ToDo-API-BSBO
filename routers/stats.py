from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.task import Task
from database import get_async_session
from schemas import TaskDeadlineStats
from typing import List

router = APIRouter(
    prefix="/stats",
    tags=["stats"]
)

@router.get("/", response_model=dict)
async def get_tasks_stats(db: AsyncSession = Depends(get_async_session)) -> dict:
    result = await db.execute(select(Task))
    tasks = result.scalars().all()
    total_tasks = len(tasks)
    by_quadrant = {q: 0 for q in ["Q1", "Q2", "Q3", "Q4"]}
    by_status = {"completed": 0, "pending": 0}
    for task in tasks:
        if task.quadrant in by_quadrant:
            by_quadrant[task.quadrant] += 1
        if task.completed:
            by_status["completed"] += 1
        else:
            by_status["pending"] += 1
    return {
        "total_tasks": total_tasks,
        "by_quadrant": by_quadrant,
        "by_status": by_status
    }

@router.get("/deadlines", response_model=List[TaskDeadlineStats])
async def get_pending_tasks_deadline_stats(
    db: AsyncSession = Depends(get_async_session)
) -> List[TaskDeadlineStats]:
    # Получаем все задачи со статусом pending
    result = await db.execute(
        select(Task).where(Task.completed == False)
    )
    pending_tasks = result.scalars().all()
    
    deadline_stats = []
    for task in pending_tasks:
        # Пропускаем задачи без дедлайна
        if not task.deadline_at:
            continue
            
        days_until_deadline = task.days_until_deadline
        deadline_stats.append(TaskDeadlineStats(
            title=task.title,
            description=task.description,
            created_at=task.created_at,
            days_until_deadline=days_until_deadline
        ))
    
    # Сортируем по количеству дней до дедлайна (сначала самые срочные)
    deadline_stats.sort(key=lambda x: x.days_until_deadline)
    
    return deadline_stats