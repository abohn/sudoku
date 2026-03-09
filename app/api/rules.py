from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Rule, VideoRule
from app.schemas import RuleOut

router = APIRouter(prefix="/rules", tags=["rules"])


def _with_counts(rules: list[Rule], db: Session) -> list[RuleOut]:
    """Attach video_count to each rule."""
    counts = dict(
        db.query(VideoRule.rule_id, func.count(VideoRule.id)).group_by(VideoRule.rule_id).all()
    )
    result = []
    for rule in rules:
        out = RuleOut.model_validate(rule)
        out.video_count = counts.get(rule.id, 0)
        result.append(out)
    return result


@router.get("/", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db)):
    """Return all rules sorted by video count descending."""
    rules = db.query(Rule).all()
    return sorted(_with_counts(rules, db), key=lambda r: r.video_count, reverse=True)
