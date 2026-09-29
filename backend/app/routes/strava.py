import json
import os
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..db import session
from ..services import upsert_strava
from .common import put_setting, setting

router = APIRouter(prefix='/api/strava')
TOKEN_URL = 'https://www.strava.com/oauth/token'
ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'


def oauth_data(**fields):
    return {
        'client_id': os.getenv('STRAVA_CLIENT_ID'),
        'client_secret': os.getenv('STRAVA_CLIENT_SECRET'),
        **fields,
    }


def save_tokens(db, token):
    for key in ('refresh_token', 'access_token', 'expires_at'):
        put_setting(db, f'strava_{key}', token[key])


@router.get('/status')
def strava_status(db: Session = Depends(session)):
    return {
        'configured': bool(os.getenv('STRAVA_CLIENT_ID') and os.getenv('STRAVA_CLIENT_SECRET')),
        'connected': bool(setting(db, 'strava_refresh_token')),
        'last_sync': setting(db, 'last_sync'),
        'last_result': setting(db, 'last_result'),
    }


@router.get('/connect')
def strava_connect():
    client_id = os.getenv('STRAVA_CLIENT_ID')
    if not client_id:
        raise HTTPException(400, 'Configurer STRAVA_CLIENT_ID')
    params = {
        'client_id': client_id,
        'redirect_uri': os.getenv('STRAVA_REDIRECT_URI', 'http://localhost:8000/api/strava/callback'),
        'response_type': 'code', 'approval_prompt': 'auto', 'scope': 'activity:read_all',
    }
    return RedirectResponse(f'https://www.strava.com/oauth/authorize?{urlencode(params)}')


@router.get('/callback')
async def strava_callback(code: str, db: Session = Depends(session)):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(TOKEN_URL, data=oauth_data(code=code, grant_type='authorization_code'))
        response.raise_for_status()
        save_tokens(db, response.json())
    return RedirectResponse(os.getenv('FRONTEND_URL', 'http://localhost:5173') + '/?strava=connected')


@router.post('/sync')
async def strava_sync(db: Session = Depends(session)):
    refresh_token = setting(db, 'strava_refresh_token')
    if not refresh_token:
        raise HTTPException(400, 'Connecter Strava d’abord')

    counts = {'importé': 0, 'actualisé': 0, 'supprimé localement': 0}
    page = 1
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(TOKEN_URL, data=oauth_data(
                refresh_token=refresh_token, grant_type='refresh_token',
            ))
            response.raise_for_status()
            token = response.json()
            save_tokens(db, token)
            while True:
                response = await client.get(ACTIVITIES_URL,
                    params={'page': page, 'per_page': 100},
                    headers={'Authorization': f"Bearer {token['access_token']}"},
                )
                response.raise_for_status()
                rows = response.json()
                for row in rows:
                    counts[upsert_strava(db, row)] += 1
                db.commit()
                if len(rows) < 100:
                    break
                page += 1
        put_setting(db, 'last_sync', datetime.now().isoformat(timespec='seconds'))
        put_setting(db, 'last_result', json.dumps(counts))
        return counts
    except Exception as error:
        db.rollback()
        put_setting(db, 'last_result', f'Erreur : {error}')
        raise HTTPException(502, str(error)) from error
