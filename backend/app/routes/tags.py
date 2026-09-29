from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..db import session
from ..models import ActivityTag, Tag
from .schemas import TagInput

router = APIRouter(prefix='/api')


def tag_json(tag):
    return {'id': tag.id, 'name': tag.name, 'color': tag.color}


@router.get('/tags')
def tags(db: Session = Depends(session)):
    return [tag_json(tag) for tag in db.scalars(select(Tag).order_by(Tag.name))]


@router.post('/tags')
def add_tag(data: TagInput, db: Session = Depends(session)):
    tag = Tag(**data.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag_json(tag)


@router.patch('/tags/{id}')
def edit_tag(id: int, data: TagInput, db: Session = Depends(session)):
    tag = db.get(Tag, id)
    if not tag:
        raise HTTPException(404)
    tag.name = data.name
    tag.color = data.color
    db.commit()
    return tag_json(tag)


@router.delete('/tags/{id}')
def delete_tag(id: int, db: Session = Depends(session)):
    tag = db.get(Tag, id)
    if not tag:
        raise HTTPException(404)
    db.execute(delete(ActivityTag).where(ActivityTag.tag_id == id))
    db.delete(tag)
    db.commit()
    return {'ok': True}
