from datetime import datetime

from pydantic import BaseModel


class ActivityEdit(BaseModel):
    name: str | None = None
    sport: str | None = None
    start_at: datetime | None = None
    distance_km: float | None = None
    duration_s: int | None = None
    elevation_m: float | None = None
    avg_hr: float | None = None
    tag_ids: list[int] | None = None


class TagInput(BaseModel):
    name: str
    color: str = '#7359e8'


class PlanInput(BaseModel):
    title: str
    sport: str = 'course'
    date: str
    kind: str = 'simple'
    tag_id: int | None = None
    duration_s: int | None = None
    distance_km: float | None = None
    notes: str | None = None
    parts: list[dict] | None = None
    activity_id: int | None = None


class GoalInput(BaseModel):
    title: str
    date: str
    target: str | None = None


class WellnessInput(BaseModel):
    date: str
    sleep_min: int | None = None
    hrv_ms: float | None = None
    note: str | None = None
