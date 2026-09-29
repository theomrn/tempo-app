from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import func, select

from .models import Activity, ActivityTag, TrackPoint, Wellness
from .services import activity_json

ANALYTICS_SOURCES = ('fit', 'demo', 'strava')


def eligible(db, start=None, sport=None, tag_ids=None):
    query = select(Activity).where(Activity.source.in_(ANALYTICS_SOURCES))
    if start:
        query = query.where(Activity.start_at >= datetime.fromisoformat(start))
    if sport and sport != 'tous':
        query = query.where(Activity.sport == sport)
    if tag_ids:
        query = (
            query.join(ActivityTag, ActivityTag.activity_id == Activity.id)
            .where(ActivityTag.tag_id.in_(tag_ids))
            .distinct()
        )
    return db.scalars(query.order_by(Activity.start_at)).all()


def period_start(period):
    days = {'1m': 30, '3m': 90, '6m': 180, '1a': 365}.get(period)
    return (date.today() - timedelta(days=days)).isoformat() if days else None


def empty_summary():
    return {
        'distance_km': 0, 'duration_s': 0, 'count': 0,
        'elevation_m': 0, 'hr_sum': 0, 'hr_count': 0,
    }


def add_to_summary(summary, activity):
    summary['distance_km'] += activity.distance_km or 0
    summary['duration_s'] += activity.duration_s or 0
    summary['elevation_m'] += activity.elevation_m or 0
    summary['count'] += 1
    if activity.avg_hr is not None:
        summary['hr_sum'] += activity.avg_hr
        summary['hr_count'] += 1


def summarize(rows):
    return {
        sport: {
            **values,
            'avg_speed_kmh': round(values['distance_km'] / values['duration_s'] * 3600, 2)
            if values['duration_s'] else None,
            'avg_hr': round(values['hr_sum'] / values['hr_count'])
            if values['hr_count'] else None,
        }
        for sport, values in rows.items()
    }


def dashboard(db, period='3m', year='all'):
    weeks = defaultdict(lambda: defaultdict(lambda: {'duration_s': 0, 'distance_km': 0, 'count': 0}))
    sports = defaultdict(empty_summary)
    for activity in eligible(db, period_start(period)):
        week = (activity.start_at.date() - timedelta(days=activity.start_at.weekday())).isoformat()
        bucket = weeks[week][activity.sport]
        bucket['duration_s'] += activity.duration_s or 0
        bucket['distance_km'] += activity.distance_km or 0
        bucket['count'] += 1
        add_to_summary(sports[activity.sport], activity)

    sport_stats = defaultdict(empty_summary)
    for activity in eligible(db):
        if year == 'all' or str(activity.start_at.year) == year:
            add_to_summary(sport_stats[activity.sport], activity)

    heatmap = defaultdict(lambda: {'duration_s': 0, 'count': 0, 'sports': set()})
    heatmap_start = (date.today() - timedelta(days=364)).isoformat()
    for activity in eligible(db, heatmap_start):
        if not activity.distance_km or activity.distance_km <= 0:
            continue
        bucket = heatmap[activity.start_at.date().isoformat()]
        bucket['duration_s'] += activity.duration_s or 0
        bucket['count'] += 1
        bucket['sports'].add(activity.sport)

    source_counts = dict(db.execute(
        select(Activity.source, func.count()).group_by(Activity.source)
    ).all())
    return {
        'weeks': [{'week': week, 'sports': dict(values)} for week, values in sorted(weeks.items())],
        'sports': summarize(sports),
        'sport_stats': summarize(sport_stats),
        'heatmap': [
            {'date': day, 'duration_s': values['duration_s'], 'count': values['count'],
             'sports': sorted(values['sports'])}
            for day, values in sorted(heatmap.items())
        ],
        'coverage': {
            'fit_activities': source_counts.get('fit', 0),
            'demo_activities': source_counts.get('demo', 0),
            'strava_activities': source_counts.get('strava', 0),
            'note': 'Les analyses utilisent les activités enregistrées en base : Strava, FIT et démonstration.',
        },
    }


def trends(db, period='3m', sport='tous', tag_ids=None):
    activities = [
        activity for activity in eligible(db, period_start(period), sport, tag_ids)
        if activity.distance_km and activity.distance_km > 0
    ]
    wellness = db.scalars(select(Wellness).order_by(Wellness.date)).all()
    return {
        'points': [activity_json(activity) for activity in activities],
        'wellness': [
            {'date': entry.date, 'sleep_min': entry.sleep_min, 'hrv_ms': entry.hrv_ms}
            for entry in wellness
        ],
        'coverage': (
            'Les tendances d’activité et la carte utilisent les séances avec une distance positive. '
            'Toutes les séances restent dans le temps de sport hebdomadaire. '
            'Le parcours, le dénivelé et la météo peuvent influencer les comparaisons.'
        ),
    }


def records(db):
    activities = eligible(db)
    result = []

    running = [
        activity for activity in activities
        if activity.sport in ('course', 'trail') and activity.distance_km is not None
        and activity.distance_km > 0
    ]
    if running:
        activity = max(running, key=lambda item: item.distance_km)
        result.append({
            'sport': activity.sport, 'label': 'Plus longue distance à pied',
            'distance_km': activity.distance_km, 'activity_id': activity.id,
            'date': activity.start_at.date().isoformat(), 'kind': 'activité entière',
        })

    for sport in ('vélo', 'natation'):
        candidates = [
            activity for activity in activities
            if activity.sport == sport and activity.distance_km is not None
        ]
        if candidates:
            activity = max(candidates, key=lambda item: item.distance_km)
            result.append({
                'sport': sport, 'label': 'Plus longue distance',
                'distance_km': activity.distance_km, 'activity_id': activity.id,
                'date': activity.start_at.date().isoformat(), 'kind': 'activité entière',
            })

    for distance_km, label in (
        (5, '5 km'), (10, '10 km'), (15, '15 km'),
        (21.0975, 'Semi-marathon'), (42.195, 'Marathon'),
    ):
        best = None
        for activity in running:
            points = db.scalars(
                select(TrackPoint)
                .where(TrackPoint.activity_id == activity.id)
                .order_by(TrackPoint.timestamp)
            ).all()
            if len(points) < 2:
                continue
            start_index = 0
            for point_index, point in enumerate(points):
                while start_index < point_index and point.distance_m - points[start_index].distance_m >= distance_km * 1000:
                    elapsed = (point.timestamp - points[start_index].timestamp).total_seconds()
                    if elapsed > 0 and (best is None or elapsed < best['duration_s']):
                        best = {
                            'sport': 'course', 'label': label,
                            'duration_s': round(elapsed),
                            'pace_s_km': round(elapsed / distance_km),
                            'activity_id': activity.id,
                            'date': activity.start_at.date().isoformat(),
                            'kind': 'effort dans une activité',
                        }
                    start_index += 1
        if best:
            result.append(best)

    return {
        'records': result,
        'note': (
            'Les records de course nécessitent des points horodatés avec distance. '
            'Un résumé Strava seul ne permet pas de calculer un meilleur effort sur 5 km, 10 km ou plus.'
        ),
    }
