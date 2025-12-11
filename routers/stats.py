from fastapi import APIRouter
from data import tasks_db

router = APIRouter(
    prefix="/stats",
    tags=["stats"]
)

@router.get("/")
async def get_tasks_stats() -> dict:
    by_quadrant = {q: 0 for q in ["Q1", "Q2", "Q3", "Q4"]}
    by_status = {"completed": 0, "pending": 0}
    for task in tasks_db:
        if task["quadrant"] in by_quadrant:
            by_quadrant[task["quadrant"]] += 1
        if task["completed"]:
            by_status["completed"] += 1
        else:
            by_status["pending"] += 1
    return {
        "total_tasks": len(tasks_db),
        "by_quadrant": by_quadrant,
        "by_status": by_status
    }