from datetime import datetime

from pydantic import BaseModel


class RuleOut(BaseModel):
    id: int
    slug: str
    display_name: str
    description: str | None
    is_rare: bool
    video_count: int = 0

    model_config = {"from_attributes": True}


class VideoRuleOut(BaseModel):
    rule: RuleOut
    confidence: float
    matched_text: str | None

    model_config = {"from_attributes": True}


class VideoOut(BaseModel):
    id: int
    youtube_id: str
    title: str
    published_at: datetime
    duration_seconds: int | None
    view_count: int
    like_count: int
    comment_count: int
    thumbnail_url: str | None
    puzzle_url: str | None
    setter_name: str | None
    puzzle_start_seconds: int | None
    solve_duration_seconds: int | None
    difficulty_score: float | None
    popularity_score: float | None
    rules: list[VideoRuleOut] = []

    model_config = {"from_attributes": True}


class VideoSummary(BaseModel):
    """Lightweight version for list views."""

    id: int
    youtube_id: str
    title: str
    published_at: datetime
    view_count: int
    thumbnail_url: str | None
    puzzle_url: str | None
    setter_name: str | None
    solver_name: str | None
    source_name: str | None
    puzzle_start_seconds: int | None
    solve_duration_seconds: int | None
    difficulty_score: float | None
    rules: list[VideoRuleOut] = []

    model_config = {"from_attributes": True}


class PaginatedVideos(BaseModel):
    items: list[VideoSummary]
    total: int
    page: int
    per_page: int
    pages: int


class StatsOut(BaseModel):
    total_videos: int
    total_rules: int
    most_common_rules: list[RuleOut]
