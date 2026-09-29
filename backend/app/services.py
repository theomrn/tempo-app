import hashlib
import io
from datetime import datetime

from fitparse import FitFile
from sqlalchemy import select

from .models import Activity, Tombstone, TrackPoint

SPORTS = {
    'running': 'course', 'run': 'course',
    'trailrunning': 'trail', 'trailrun': 'trail',
    'cycling': 'vélo', 'ride': 'vélo', 'biking': 'vélo',
    'mountainbikeride': 'vélo', 'mountainbiking': 'vélo',
    'gravelride': 'vélo', 'ebikeride': 'vélo',
    'emountainbikeride': 'vélo', 'virtualride': 'vélo',
    'swimming': 'natation', 'swim': 'natation',
    'weighttraining': 'musculation', 'workout': 'musculation',
}


def sport(value):
    normalized = str(value or '').lower().replace('_', '').replace(' ', '').replace('-', '')
    return SPORTS.get(normalized, 'autre')


def parse_fit(data, db):
    digest = hashlib.sha256(data).hexdigest()
    if db.scalar(select(Activity.id).where(Activity.file_hash == digest)):
        return {'status': 'doublon', 'reason': 'Fichier déjà importé'}

    fit = FitFile(io.BytesIO(data), check_crc=False)
    sessions = list(fit.get_messages('session'))
    if not sessions:
        raise ValueError('Aucune session FIT trouvée')

    values = {field.name: field.value for field in sessions[0]}
    points = []
    for record in fit.get_messages('record'):
        row = {field.name: field.value for field in record}
        if isinstance(row.get('timestamp'), datetime) and isinstance(row.get('distance'), (int, float)):
            points.append((row['timestamp'], float(row['distance'])))

    started = values.get('start_time') or (points[0][0] if points else None)
    if not isinstance(started, datetime):
        raise ValueError('Date de début absente')

    original_sport = str(values.get('sport') or 'autre')
    source_id = f'{started.isoformat()}:{values.get("total_elapsed_time", "")}'
    existing = db.scalar(select(Activity).where(Activity.source == 'fit', Activity.source_id == source_id))
    if existing:
        return {'status': 'doublon', 'reason': 'Activité FIT déjà présente'}

    activity = Activity(
        source='fit', source_id=source_id,
        name=f'{original_sport} du {started:%d/%m/%Y}',
        source_name=f'{original_sport} du {started:%d/%m/%Y}',
        sport=sport(original_sport), source_sport=original_sport,
        start_at=started,
        distance_km=values.get('total_distance') / 1000 if values.get('total_distance') is not None else None,
        duration_s=round(values['total_timer_time']) if values.get('total_timer_time') is not None else None,
        elevation_m=values.get('total_ascent'),
        avg_hr=values.get('avg_heart_rate'),
        file_hash=digest,
    )
    db.add(activity)
    db.flush()
    db.add_all(
        TrackPoint(activity_id=activity.id, timestamp=timestamp, distance_m=distance)
        for timestamp, distance in points
    )
    return {'status': 'importé', 'id': activity.id, 'points': len(points)}


def upsert_strava(db, row):
    source_id = str(row['id'])
    tombstone = db.scalar(select(Tombstone.id).where(
        Tombstone.source == 'strava', Tombstone.source_id == source_id,
    ))
    if tombstone:
        return 'supprimé localement'

    activity = db.scalar(select(Activity).where(
        Activity.source == 'strava', Activity.source_id == source_id,
    ))
    original_sport = str(row.get('sport_type') or row.get('type') or 'autre')
    started = datetime.fromisoformat(row['start_date_local'].replace('Z', '+00:00')).replace(tzinfo=None)
    fields = {
        'source_name': row.get('name') or 'Activité Strava',
        'source_sport': original_sport,
        'start_at': started,
        'distance_km': row.get('distance', 0) / 1000 if row.get('distance') is not None else None,
        'duration_s': row.get('moving_time'),
        'elevation_m': row.get('total_elevation_gain'),
        'avg_hr': row.get('average_heartrate'),
    }
    if activity:
        if not activity.local_override:
            for name, value in fields.items():
                setattr(activity, name, value)
            activity.name = fields['source_name']
            activity.sport = sport(original_sport)
        return 'actualisé'

    db.add(Activity(
        source='strava', source_id=source_id,
        name=fields['source_name'], sport=sport(original_sport), **fields,
    ))
    return 'importé'


def activity_json(activity, tags=()):
    distance = activity.distance_km
    seconds = activity.duration_s
    return {
        'id': activity.id,
        'source': activity.source,
        'source_id': activity.source_id,
        'name': activity.name,
        'source_name': activity.source_name,
        'sport': activity.sport,
        'source_sport': activity.source_sport,
        'start_at': activity.start_at.isoformat(),
        'distance_km': distance,
        'duration_s': seconds,
        'elevation_m': activity.elevation_m,
        'avg_hr': activity.avg_hr,
        'avg_speed_kmh': round(distance / seconds * 3600, 2) if distance is not None and seconds else None,
        'pace_s_km': round(seconds / distance) if distance and distance > 0 and seconds else None,
        'tags': list(tags),
        'analytics_eligible': activity.source in ('fit', 'demo', 'strava'),
    }
