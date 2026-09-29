from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class Activity(Base):
    __tablename__ = 'activities'
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    source: Mapped[str] = mapped_column(String(20))
    source_id: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    source_name: Mapped[str] = mapped_column(String(255))
    sport: Mapped[str] = mapped_column(String(30))
    source_sport: Mapped[str] = mapped_column(String(100))
    start_at: Mapped[datetime] = mapped_column(DateTime)
    distance_km: Mapped[float | None] = mapped_column(Float)
    duration_s: Mapped[int | None] = mapped_column(Integer)
    elevation_m: Mapped[float | None] = mapped_column(Float)
    avg_hr: Mapped[float | None] = mapped_column(Float)
    local_override: Mapped[bool] = mapped_column(Boolean, default=False)
    file_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    __table_args__ = (UniqueConstraint('owner_id', 'source', 'source_id'),)

class TrackPoint(Base):
    __tablename__ = 'track_points'
    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey('activities.id', ondelete='CASCADE'), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    distance_m: Mapped[float] = mapped_column(Float)

class Tag(Base):
    __tablename__ = 'tags'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    color: Mapped[str] = mapped_column(String(7))

class ActivityTag(Base):
    __tablename__ = 'activity_tags'
    activity_id: Mapped[int] = mapped_column(ForeignKey('activities.id', ondelete='CASCADE'), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)

class Tombstone(Base):
    __tablename__ = 'tombstones'
    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(20))
    source_id: Mapped[str] = mapped_column(String(255))
    __table_args__ = (UniqueConstraint('source', 'source_id'),)

class Plan(Base):
    __tablename__ = 'plans'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    sport: Mapped[str] = mapped_column(String(30))
    date: Mapped[str] = mapped_column(String(10), index=True)
    kind: Mapped[str] = mapped_column(String(20), default='simple')
    tag_id: Mapped[int | None] = mapped_column(ForeignKey('tags.id', ondelete='SET NULL'))
    duration_s: Mapped[int | None] = mapped_column(Integer)
    distance_km: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    parts_json: Mapped[str | None] = mapped_column(Text)
    activity_id: Mapped[int | None] = mapped_column(ForeignKey('activities.id', ondelete='SET NULL'))

class Goal(Base):
    __tablename__ = 'goals'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[str] = mapped_column(String(10))
    target: Mapped[str | None] = mapped_column(String(255))

class Wellness(Base):
    __tablename__ = 'wellness'
    date: Mapped[str] = mapped_column(String(10), primary_key=True)
    sleep_min: Mapped[int | None] = mapped_column(Integer)
    hrv_ms: Mapped[float | None] = mapped_column(Float)
    note: Mapped[str | None] = mapped_column(Text)

class Setting(Base):
    __tablename__ = 'settings'
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
