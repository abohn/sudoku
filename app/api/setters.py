from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Video

router = APIRouter(prefix="/setters", tags=["setters"])


@router.get("/")
def list_setters(
    q: str = Query("", description="Search setter names (case-insensitive substring)"),
    min_count: int = Query(2, ge=1, description="Minimum puzzle count to include"),
    db: Session = Depends(get_db),
):
    """Return all setter names with puzzle counts, sorted by count descending."""
    query = (
        db.query(Video.setter_name, func.count(Video.id).label("count"))
        .filter(Video.setter_name.isnot(None), Video.setter_name != "")
        .group_by(Video.setter_name)
        .having(func.count(Video.id) >= min_count)
    )
    if q:
        query = query.filter(Video.setter_name.ilike(f"%{q}%"))

    rows = query.order_by(func.count(Video.id).desc()).all()
    return [{"name": name, "count": count} for name, count in rows]
