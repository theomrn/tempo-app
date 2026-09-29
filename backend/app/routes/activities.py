from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..db import session
from ..models import Activity, ActivityTag, Plan, Tag, Tombstone, TrackPoint
from ..services import activity_json
from .common import get_activity, tags_for
from .schemas import ActivityEdit

router = APIRouter(prefix='/api')


@router.get('/activities')
def activities(q: str = '', sport: str = '', start: str = '', end: str = '',
               tag_id: int | None = None, source: str = '', db: Session = Depends(session)):
    query = select(Activity)
    if q:
        query = query.where(Activity.name.ilike(f'%{q}%'))
    if sport:
        query = query.where(Activity.sport == sport)
    if source:
        query = query.where(Activity.source == source)
    if start:
        query = query.where(Activity.start_at >= datetime.fromisoformat(start))
    if end:
        query = query.where(Activity.start_at < datetime.fromisoformat(f'{end}T23:59:59'))
    if tag_id:
        query = query.join(ActivityTag, ActivityTag.activity_id == Activity.id).where(ActivityTag.tag_id == tag_id)
    return [activity_json(activity, tags_for(db, activity.id))
            for activity in db.scalars(query.order_by(Activity.start_at.desc())).all()]


@router.get('/activities/{id}')
def activity(id: int, db: Session = Depends(session)):
    row = get_activity(db, id)
    return activity_json(row, tags_for(db, id))


@router.patch('/activities/{id}')
def edit_activity(id: int, data: ActivityEdit, db: Session = Depends(session)):
    row = get_activity(db, id)
    for field, value in data.model_dump(exclude_unset=True, exclude={'tag_ids'}).items():
        setattr(row, field, value)
    if data.tag_ids is not None:
        db.execute(delete(ActivityTag).where(ActivityTag.activity_id == id))
        for tag_id in set(data.tag_ids):
            if db.get(Tag, tag_id):
                db.add(ActivityTag(activity_id=id, tag_id=tag_id))
    row.local_override = True
    db.commit()
    return activity(id, db)


@router.delete('/activities/{id}')
def delete_activity(id: int, db: Session = Depends(session)):
    row = get_activity(db, id)
    if row.source == 'strava':
        db.add(Tombstone(source=row.source, source_id=row.source_id))
    db.execute(delete(TrackPoint).where(TrackPoint.activity_id == id))
    db.execute(delete(ActivityTag).where(ActivityTag.activity_id == id))
    for plan in db.scalars(select(Plan).where(Plan.activity_id == id)):
        plan.activity_id = None
    db.delete(row)
    db.commit()
    return {'ok': True}
