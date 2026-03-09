from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Rule, Video, VideoRule
from app.schemas import PaginatedVideos, VideoOut, VideoSummary

router = APIRouter(prefix="/puzzles", tags=["puzzles"])


# difficulty label → (min_score_inclusive, max_score_exclusive)
_DIFFICULTY_RANGES = {
    "easy": (None, 3.0),
    "medium": (3.0, 5.5),
    "hard": (5.5, 7.5),
    "brutal": (7.5, None),
}


def _build_query(
    db: Session,
    rules: str | None,
    match: Literal["all", "any"],
    sort: Literal["views", "published", "solve_time", "difficulty"],
    order: Literal["asc", "desc"],
    has_puzzle_url: bool | None,
    setter: str | None = None,
    difficulties: str | None = None,
):
    q = db.query(Video).options(selectinload(Video.rules).selectinload(VideoRule.rule))

    if rules:
        slugs = [s.strip() for s in rules.split(",") if s.strip()]
        if slugs:
            rule_ids = [r.id for r in db.query(Rule.id).filter(Rule.slug.in_(slugs)).all()]
            if match == "all":
                # Video must have every requested rule
                for rid in rule_ids:
                    sub = db.query(VideoRule.video_id).filter(VideoRule.rule_id == rid).subquery()
                    q = q.filter(Video.id.in_(sub))
            else:
                # Video must have at least one requested rule
                sub = (
                    db.query(VideoRule.video_id).filter(VideoRule.rule_id.in_(rule_ids)).subquery()
                )
                q = q.filter(Video.id.in_(sub))

    if has_puzzle_url is True:
        q = q.filter(Video.puzzle_url.isnot(None))
    elif has_puzzle_url is False:
        q = q.filter(Video.puzzle_url.is_(None))

    if setter:
        q = q.filter(Video.setter_name == setter)

    if difficulties:
        labels = [d.strip().lower() for d in difficulties.split(",") if d.strip()]
        valid = [lbl for lbl in labels if lbl in _DIFFICULTY_RANGES]
        if valid:
            clauses = []
            for label in valid:
                lo, hi = _DIFFICULTY_RANGES[label]
                clause = Video.difficulty_score.isnot(None)
                if lo is not None:
                    clause = clause & (Video.difficulty_score >= lo)
                if hi is not None:
                    clause = clause & (Video.difficulty_score < hi)
                clauses.append(clause)
            q = q.filter(or_(*clauses))

    sort_col = {
        "views": Video.view_count,
        "published": Video.published_at,
        "solve_time": Video.solve_duration_seconds,
        "difficulty": Video.difficulty_score,
    }.get(sort, Video.published_at)

    if order == "desc":
        q = q.order_by(sort_col.desc().nullslast())
    else:
        q = q.order_by(sort_col.asc().nullsfirst())

    return q


@router.get("/", response_model=PaginatedVideos)
def list_puzzles(
    rules: str | None = Query(None, description="Comma-separated rule slugs"),
    match: Literal["all", "any"] = Query("all", description="AND vs OR rule matching"),
    sort: Literal["views", "published", "solve_time", "difficulty"] = Query("published"),
    order: Literal["asc", "desc"] = Query("desc"),
    has_puzzle_url: bool | None = Query(None),
    setter: str | None = Query(None, description="Filter by exact setter name"),
    difficulties: str | None = Query(None, description="Comma-separated: easy,medium,hard,brutal"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = _build_query(db, rules, match, sort, order, has_puzzle_url, setter, difficulties)
    total = q.count()
    offset = (page - 1) * per_page
    items = q.offset(offset).limit(per_page).all()

    return PaginatedVideos(
        items=[VideoSummary.model_validate(v) for v in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/{video_id}", response_model=VideoOut)
def get_puzzle(video_id: int, db: Session = Depends(get_db)):
    video = (
        db.query(Video)
        .options(selectinload(Video.rules).selectinload(VideoRule.rule))
        .filter(Video.id == video_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return VideoOut.model_validate(video)
