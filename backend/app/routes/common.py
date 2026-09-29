from fastapi import HTTPException
from sqlalchemy import select

from ..models import Activity, ActivityTag, Setting, Tag


def setting(db, key, default=None):
    row = db.get(Setting, key)
    return row.value if row else default


def put_setting(db, key, value):
    row = db.get(Setting, key)
    if row:
        row.value = str(value)
    else:
        db.add(Setting(key=key, value=str(value)))
    db.commit()


def get_activity(db, activity_id):
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, 'Activité introuvable')
    return activity


def tags_for(db, activity_id):
    tags = db.scalars(
        select(Tag).join(ActivityTag, ActivityTag.tag_id == Tag.id)
        .where(ActivityTag.activity_id == activity_id)
    ).all()
    return [{'id':tag.id, 'name':tag.name, 'color':tag.color} for tag in tags]
