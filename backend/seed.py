from datetime import datetime, timedelta
import random
from sqlalchemy import select
from app.db import Session
from app.models import Activity, ActivityTag, Goal, Plan, Tag, TrackPoint, Wellness

random.seed(26)
today=datetime.now().replace(hour=7,minute=15,second=0,microsecond=0)
with Session() as db:
    for name,color in [('EF','#66a481'),('Fractionné','#e67863'),('Sortie longue','#d1aa59'),('Seuil','#7359e8')]:
        if not db.scalar(select(Tag).where(Tag.name==name)):db.add(Tag(name=name,color=color))
    db.commit()
    tag={t.name:t.id for t in db.scalars(select(Tag))}
    for i in range(55):
        when=today-timedelta(days=i*3+random.randint(0,1))
        if when>today:continue
        kind=['course','course','vélo','course','natation','trail'][i%6]
        km=round(random.uniform(5,16) if kind=='course' else random.uniform(25,65) if kind=='vélo' else random.uniform(1,2.5) if kind=='natation' else random.uniform(10,24),2)
        seconds=round(km*random.uniform(320,380) if kind=='course' else km*random.uniform(115,160) if kind=='vélo' else km*random.uniform(1400,1900) if kind=='natation' else km*random.uniform(420,550))
        source_id=f'demo-{i}'
        existing=db.scalar(select(Activity).where(Activity.source.in_(['fit','demo']),Activity.source_id==source_id))
        if existing:
            existing.source='demo'
            continue
        title=('Footing matinal' if kind=='course' else 'Sortie vallonnée' if kind=='vélo' else 'Longueurs en bassin' if kind=='natation' else 'Sentiers du dimanche')
        a=Activity(source='demo',source_id=source_id,name=title,source_name=title,sport=kind,source_sport=kind,start_at=when,distance_km=km,duration_s=seconds,elevation_m=round(km*(8 if kind=='trail' else 4 if kind=='vélo' else 2)),avg_hr=random.randint(130,157))
        db.add(a);db.flush()
        if kind=='course':
            db.add(ActivityTag(activity_id=a.id,tag_id=tag['EF' if i%3 else 'Fractionné']))
            # Points de démonstration horodatés, clairement identifiés par source_id demo-.
            for j in range(0,121):db.add(TrackPoint(activity_id=a.id,timestamp=when+timedelta(seconds=seconds*j/120),distance_m=km*1000*j/120))
        elif kind=='trail':db.add(ActivityTag(activity_id=a.id,tag_id=tag['Sortie longue']))
    if not db.scalar(select(Plan.id)):
        for d,title,kind in [(2,'Footing en endurance','simple'),(5,'Séance de seuil','three'),(9,'Sortie longue','simple')]:
            db.add(Plan(title=title,sport='course',date=(today+timedelta(days=d)).date().isoformat(),kind=kind,tag_id=tag['EF'] if d==2 else tag['Seuil'],duration_s=2700 if d==2 else 3600,distance_km=7 if d==2 else 10,notes='Rester à l’écoute des sensations.',parts_json='[{"name":"Échauffement","description":"15 min faciles"},{"name":"Cœur de séance","description":"3 × 8 min au seuil"},{"name":"Retour au calme","description":"10 min souples"}]' if kind=='three' else '[]'))
        db.add(Goal(title='10 km de l’automne',date=(today+timedelta(days=45)).date().isoformat(),target='Moins de 48 min'))
    for i in range(30):
        day=(today-timedelta(days=i)).date().isoformat()
        if not db.get(Wellness,day):db.add(Wellness(date=day,sleep_min=random.randint(375,510),hrv_ms=round(random.uniform(48,74),1)))
    db.commit()
print('Données de démonstration chargées.')
