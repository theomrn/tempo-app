from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..analytics import dashboard, records, trends
from ..db import session

router = APIRouter(prefix='/api')


@router.get('/dashboard')
def get_dashboard(period: str = '3m', year: str = 'all', db: Session = Depends(session)):
    return dashboard(db, period, year)


@router.get('/trends')
def get_trends(period: str = '3m', sport: str = 'tous', tags: str = '',
               db: Session = Depends(session)):
    tag_ids = [int(value) for value in tags.split(',') if value.isdigit()]
    return trends(db, period, sport, tag_ids)


@router.get('/records')
def get_records(db: Session = Depends(session)):
    return records(db)
