from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    youtube_id = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    published_at = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer)  # total video length
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    thumbnail_url = Column(String(500))

    # Puzzle-specific fields
    puzzle_url = Column(String(1000))  # SudokuPad or f-puzzles URL
    setter_name = Column(String(200))  # parsed from title/description
    solver_name = Column(String(100))  # CTC host solving the puzzle (Simon, Mark, etc.)
    source_name = Column(String(200))  # where the puzzle was published (e.g. Logic Masters)
    puzzle_start_seconds = Column(Integer)  # when solving actually begins (from chapters)
    solve_duration_seconds = Column(Integer)  # duration - puzzle_start_seconds

    # Derived scores
    difficulty_score = Column(Float)  # 0.0–10.0 estimate
    popularity_score = Column(Float)  # normalized 0.0–10.0

    last_updated = Column(DateTime, default=datetime.utcnow)

    rules = relationship("VideoRule", back_populates="video", cascade="all, delete-orphan")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    is_rare = Column(Boolean, default=False)  # True when <= 3 videos use it

    videos = relationship("VideoRule", back_populates="rule")


class VideoRule(Base):
    __tablename__ = "video_rules"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(Integer, ForeignKey("rules.id"), nullable=False)
    confidence = Column(Float, default=1.0)  # 0.0–1.0
    matched_text = Column(String(500))  # the snippet that triggered the match

    __table_args__ = (UniqueConstraint("video_id", "rule_id"),)

    video = relationship("Video", back_populates="rules")
    rule = relationship("Rule", back_populates="videos")
