import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import session
from ..models import Goal, Plan, Wellness
from .schemas import GoalInput, PlanInput, WellnessInput

router = APIRouter(prefix='/api')


def plan_json(plan):
    return {
        'id': plan.id, 'title': plan.title, 'sport': plan.sport,
        'date': plan.date, 'kind': plan.kind, 'tag_id': plan.tag_id,
        'duration_s': plan.duration_s, 'distance_km': plan.distance_km,
        'notes': plan.notes, 'parts': json.loads(plan.parts_json or '[]'),
        'activity_id': plan.activity_id,
    }


@router.get('/plans')
def plans(db: Session = Depends(session)):
    return [plan_json(plan) for plan in db.scalars(select(Plan).order_by(Plan.date))]


@router.post('/plans')
def add_plan(data: PlanInput, db: Session = Depends(session)):
    plan = Plan(**data.model_dump(exclude={'parts'}), parts_json=json.dumps(data.parts or []))
    db.add(plan)
    db.commit()
    return {'id': plan.id}


@router.put('/plans/{id}')
def edit_plan(id: int, data: PlanInput, db: Session = Depends(session)):
    plan = db.get(Plan, id)
    if not plan:
        raise HTTPException(404)
    for field, value in data.model_dump(exclude={'parts'}).items():
        setattr(plan, field, value)
    plan.parts_json = json.dumps(data.parts or [])
    db.commit()
    return {'id': id}


@router.delete('/plans/{id}')
def delete_plan(id: int, db: Session = Depends(session)):
    plan = db.get(Plan, id)
    if not plan:
        raise HTTPException(404)
    db.delete(plan)
    db.commit()
    return {'ok': True}


@router.get('/goals')
def goals(db: Session = Depends(session)):
    return [
        {'id': goal.id, 'title': goal.title, 'date': goal.date, 'target': goal.target}
        for goal in db.scalars(select(Goal).order_by(Goal.date))
    ]


@router.post('/goals')
def add_goal(data: GoalInput, db: Session = Depends(session)):
    goal = Goal(**data.model_dump())
    db.add(goal)
    db.commit()
    return {'id': goal.id}


@router.put('/goals/{id}')
def edit_goal(id: int, data: GoalInput, db: Session = Depends(session)):
    goal = db.get(Goal, id)
    if not goal:
        raise HTTPException(404)
    for field, value in data.model_dump().items():
        setattr(goal, field, value)
    db.commit()
    return {'id': id}


@router.delete('/goals/{id}')
def delete_goal(id: int, db: Session = Depends(session)):
    goal = db.get(Goal, id)
    if not goal:
        raise HTTPException(404)
    db.delete(goal)
    db.commit()
    return {'ok': True}


@router.get('/wellness')
def wellness(db: Session = Depends(session)):
    return [
        {'date': entry.date, 'sleep_min': entry.sleep_min, 'hrv_ms': entry.hrv_ms, 'note': entry.note}
        for entry in db.scalars(select(Wellness).order_by(Wellness.date))
    ]


@router.put('/wellness/{day}')
def save_wellness(day: str, data: WellnessInput, db: Session = Depends(session)):
    entry = db.get(Wellness, day)
    if not entry:
        entry = Wellness(date=day)
        db.add(entry)
    entry.sleep_min = data.sleep_min
    entry.hrv_ms = data.hrv_ms
    entry.note = data.note
    db.commit()
    return {'ok': True}
