import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import puzzles, rules, setters
from app.database import Base, SessionLocal, engine, get_db
from app.models import Rule, Video, VideoRule
from app.rules_data import RULE_DEFINITIONS


def seed_rules(db):
    """Insert any missing rules into the DB."""
    for defn in RULE_DEFINITIONS:
        existing = db.query(Rule).filter(Rule.slug == defn["slug"]).first()
        if not existing:
            db.add(
                Rule(
                    slug=defn["slug"],
                    display_name=defn["display_name"],
                    description=defn["description"],
                )
            )
    db.commit()


def update_rare_flags(db):
    """Mark rules with <= 3 associated videos as rare."""
    from app.models import VideoRule

    counts = dict(
        db.query(VideoRule.rule_id, func.count(VideoRule.id)).group_by(VideoRule.rule_id).all()
    )
    for rule in db.query(Rule).all():
        rule.is_rare = counts.get(rule.id, 0) <= 3
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed rules
    db = SessionLocal()
    try:
        seed_rules(db)
        update_rare_flags(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="CTC Puzzle Database",
    description="Search and filter Cracking the Cryptic sudoku puzzles by rule type.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(puzzles.router, prefix="/api")
app.include_router(rules.router, prefix="/api")
app.include_router(setters.router, prefix="/api")


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    from app.schemas import RuleOut, StatsOut

    total_videos = db.query(func.count(Video.id)).scalar()
    total_rules = db.query(func.count(Rule.id)).scalar()

    counts = dict(
        db.query(VideoRule.rule_id, func.count(VideoRule.id)).group_by(VideoRule.rule_id).all()
    )
    top_rules = db.query(Rule).filter(Rule.slug != "unique-rules").all()
    top_rules_out = []
    for r in top_rules:
        out = RuleOut.model_validate(r)
        out.video_count = counts.get(r.id, 0)
        top_rules_out.append(out)
    top_rules_out.sort(key=lambda r: r.video_count, reverse=True)

    return StatsOut(
        total_videos=total_videos or 0,
        total_rules=total_rules or 0,
        most_common_rules=top_rules_out[:10],
    )
