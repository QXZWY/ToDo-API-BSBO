from fastapi import APIRouter, HTTPException, Query, status, Response, Depends
from typing import List
from data import tasks_db
from database import get_async_session
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.task import Task
from models.user import User
from schemas import TaskCreate, TaskResponse, TaskUpdate
from dependencies import get_current_user

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)

def calculate_days_until_deadline(deadline_at):
    if deadline_at is None:
        return None
    today = datetime.now().date()
    deadline_date = deadline_at.date() if isinstance(deadline_at, datetime) else deadline_at
    return (deadline_date - today).days

def calculate_urgency(deadline_at):
    if deadline_at is None:
        return False
    today = datetime.now().date()
    deadline_date = deadline_at.date() if isinstance(deadline_at, datetime) else deadline_at
    days_until_deadline = (deadline_date - today).days
    return days_until_deadline <= 3

def determine_quadrant(is_important, is_urgent):
    if is_important and is_urgent:
        return "Q1"
    elif is_important and not is_urgent:
        return "Q2"
    elif not is_important and is_urgent:
        return "Q3"
    else:
        return "Q4"

@router.get("", response_model=List[TaskResponse])
async def get_all_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> List[TaskResponse]:
    # Если пользователь - admin, показываем все задачи
    print(current_user.role)
    if current_user.role.value == "admin":
        result = await db.execute(select(Task))
    else:
        # Обычные пользователи только свои задачи
        result = await db.execute(
            select(Task).where(Task.user_id == current_user.id)
        )
    tasks = result.scalars().all()
    print([task.user_id for task in tasks])
    return tasks

@router.get("/quadrant/{quadrant}", response_model=List[TaskResponse])
async def get_tasks_by_quadrant(
    quadrant: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> List[TaskResponse]:
    if quadrant not in ["Q1", "Q2", "Q3", "Q4"]:
        raise HTTPException(
            status_code=400,
            detail="Неверный квадрант. Используйте: Q1, Q2, Q3, Q4"
        )
    
    query = select(Task).where(Task.quadrant == quadrant)
    
    # Администраторы видят все задачи, пользователи — только свои
    if current_user.role.value != "admin":
        query = query.where(Task.user_id == current_user.id)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    return tasks

@router.get("/search", response_model=List[TaskResponse])
async def search_tasks(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
) -> List[TaskResponse]:
    keyword = f"%{q.lower()}%"
    condition = (Task.title.ilike(keyword)) | (Task.description.ilike(keyword))
    
    if current_user.role.value == "admin":
        query = select(Task).where(condition)
    else:
        query = select(Task).where(
            Task.user_id == current_user.id,
            condition
        )

    result = await db.execute(query)
    tasks = result.scalars().all()
    
    if not tasks:
        raise HTTPException(
            status_code=404,
            detail="По данному запросу ничего не найдено"
        )
    return tasks

@router.get("/today", response_model=List[TaskResponse])
async def get_tasks_due_today(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> List[TaskResponse]:
    """Get all tasks that are due today"""
    from datetime import date
    
    today = date.today()
    
    # Build query based on user role
    if current_user.role.value == "admin":
        result = await db.execute(
            select(Task).where(
                Task.deadline_at.isnot(None)
            )
        )
    else:
        result = await db.execute(
            select(Task).where(
                Task.user_id == current_user.id,
                Task.deadline_at.isnot(None)
            )
        )
    
    # Filter tasks where deadline is today
    all_tasks = result.scalars().all()
    tasks_due_today = [
        task for task in all_tasks
        if task.deadline_at.date() == today
    ]
    
    return tasks_due_today

@router.get("/status/{status}", response_model=List[TaskResponse])
async def get_tasks_by_status(
    status: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> List[TaskResponse]:
    if status not in ["completed", "pending"]:
        raise HTTPException(status_code=404, detail="Недопустимый статус. Используйте: completed или pending")
    is_completed = status == "completed"
    if current_user.role.value == "admin":
        result = await db.execute(
            select(Task).where(Task.completed == is_completed)
        )
    else:
        result = await db.execute(
            select(Task).where(
                Task.completed == is_completed,
                Task.user_id == current_user.id
            )
        )
    tasks = result.scalars().all()
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_by_id(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if current_user.role.value != "admin" and task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой задаче",
        )
    return task


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> TaskResponse:
    is_urgent = calculate_urgency(task.deadline_at)
    quadrant = determine_quadrant(task.is_important, is_urgent)

    new_task = Task(
        title=task.title,
        description=task.description,
        is_important=task.is_important,
        deadline_at=task.deadline_at,
        quadrant=quadrant,
        completed=False,
        user_id=current_user.id
    )

    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if current_user.role.value != "admin" and task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой задаче"
        )

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    if "is_important" in update_data or "deadline_at" in update_data:
        is_urgent = calculate_urgency(task.deadline_at)
        task.quadrant = determine_quadrant(task.is_important, is_urgent)

    await db.commit()
    await db.refresh(task)

    task_dict = task.__dict__.copy()
    task_dict['is_urgent'] = task.is_urgent
    task_dict['days_until_deadline'] = calculate_days_until_deadline(task.deadline_at)
    return TaskResponse(**task_dict)


@router.patch("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> TaskResponse:
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if current_user.role.value != "admin" and task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой задаче"
        )
    task.completed = True
    task.completed_at = datetime.now()

    await db.commit()
    await db.refresh(task)

    task_dict = task.__dict__.copy()
    task_dict['is_urgent'] = task.is_urgent
    task_dict['days_until_deadline'] = calculate_days_until_deadline(task.deadline_at)
    return TaskResponse(**task_dict)

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> dict:
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if current_user.role.value != "admin" and task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой задаче"
        )

    deleted_task_info = {
        "id": task.id,
        "title": task.title
    }

    await db.delete(task)
    await db.commit()

    return {
        "message": "Задача успешно удалена",
        "id": deleted_task_info["id"],
        "title": deleted_task_info["title"]
    }