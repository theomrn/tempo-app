from datetime import datetime
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, session
from app.main import app
from app.models import Activity, Tombstone
from app.services import upsert_strava, sport

class Workflows(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session=sessionmaker(bind=self.engine)
        def override():
            with self.Session() as db:yield db
        app.dependency_overrides[session]=override
        self.client=TestClient(app)
    def tearDown(self):
        app.dependency_overrides.clear();self.engine.dispose()

    def test_strava_idempotence_edit_and_tombstone(self):
        row={'id':91,'name':'Course source','sport_type':'Run','start_date_local':'2026-09-01T07:00:00Z','distance':10000,'moving_time':3000}
        with self.Session() as db:
            self.assertEqual(upsert_strava(db,row),'importé');db.commit()
            self.assertEqual(upsert_strava(db,row),'actualisé');db.commit()
            self.assertEqual(len(db.scalars(select(Activity)).all()),1)
            id=db.scalar(select(Activity.id))
        self.assertEqual(self.client.patch(f'/api/activities/{id}',json={'name':'Ma correction'}).status_code,200)
        with self.Session() as db:
            upsert_strava(db,{**row,'name':'Nom changé sur Strava'});db.commit()
            self.assertEqual(db.get(Activity,id).name,'Ma correction')
        self.assertEqual(self.client.delete(f'/api/activities/{id}').status_code,200)
        with self.Session() as db:
            self.assertEqual(upsert_strava(db,row),'supprimé localement');db.commit()
            self.assertEqual(len(db.scalars(select(Activity)).all()),0)
            self.assertEqual(len(db.scalars(select(Tombstone)).all()),1)

    def test_mountain_bike_is_classified_as_cycling(self):
        self.assertEqual(sport('MountainBikeRide'),'vélo')
        self.assertEqual(sport('mountain_biking'),'vélo')
        row={'id':92,'name':'Sortie VTT','sport_type':'MountainBikeRide','start_date_local':'2026-09-01T07:00:00Z','distance':15000,'moving_time':3600}
        with self.Session() as db:
            upsert_strava(db,row)
            db.commit()
            self.assertEqual(db.scalar(select(Activity)).sport,'vélo')
        self.assertEqual(self.client.get('/api/dashboard?period=all').json()['sports']['vélo']['distance_km'],15)

    def test_tags_plans_wellness_and_analytics_coverage(self):
        with self.Session() as db:
            a=Activity(source='fit',source_id='fit-1',name='Course',source_name='Course',sport='course',source_sport='running',start_at=datetime(2026,9,1),distance_km=6,duration_s=1800)
            db.add(a);db.commit();id=a.id
        tag=self.client.post('/api/tags',json={'name':'EF','color':'#123456'}).json()
        self.assertEqual(self.client.patch(f'/api/activities/{id}',json={'tag_ids':[tag['id']]}).json()['tags'][0]['name'],'EF')
        plan=self.client.post('/api/plans',json={'title':'Footing','sport':'course','date':'2026-09-01','kind':'three','parts':[{'name':'Échauffement','description':'10 min'}],'activity_id':id}).json()
        self.assertEqual(self.client.get('/api/plans').json()[0]['activity_id'],id)
        self.assertEqual(self.client.put('/api/wellness/2026-09-01',json={'date':'2026-09-01','sleep_min':450,'hrv_ms':61,'note':'Bien'}).status_code,200)
        self.assertEqual(self.client.get('/api/wellness').json()[0]['sleep_min'],450)
        self.assertEqual(self.client.get('/api/dashboard?period=all').json()['coverage']['fit_activities'],1)
        self.assertEqual(self.client.delete(f'/api/tags/{tag["id"]}').status_code,200)
        self.assertEqual(len(self.client.get('/api/activities').json()),1)
        self.assertEqual(self.client.delete(f'/api/plans/{plan["id"]}').status_code,200)

    def test_strava_activity_is_included_in_graph_data(self):
        with self.Session() as db:
            db.add(Activity(source='strava',source_id='strava-1',name='Sortie',source_name='Sortie',sport='course',source_sport='Run',start_at=datetime.now(),distance_km=10,duration_s=3000))
            db.commit()
        dashboard=self.client.get('/api/dashboard?period=all').json()
        self.assertEqual(dashboard['sports']['course']['count'],1)
        self.assertEqual(dashboard['coverage']['strava_activities'],1)
        self.assertEqual(len(dashboard['heatmap']),1)
        trends=self.client.get('/api/trends?period=all').json()
        self.assertEqual(len(trends['points']),1)
        self.assertTrue(trends['points'][0]['analytics_eligible'])

    def test_activity_without_distance_only_appears_in_weekly_time(self):
        with self.Session() as db:
            db.add(Activity(source='strava',source_id='run-1',name='Course',source_name='Course',sport='course',source_sport='Run',start_at=datetime.now(),distance_km=10,duration_s=3000))
            db.add(Activity(source='strava',source_id='strength-1',name='Musculation',source_name='Musculation',sport='musculation',source_sport='WeightTraining',start_at=datetime.now(),distance_km=None,duration_s=1800))
            db.commit()
        dashboard=self.client.get('/api/dashboard?period=all').json()
        self.assertEqual(dashboard['sports']['musculation']['duration_s'],1800)
        self.assertEqual(dashboard['weeks'][0]['sports']['musculation']['duration_s'],1800)
        self.assertEqual(dashboard['heatmap'][0]['count'],1)
        points=self.client.get('/api/trends?period=all').json()['points']
        self.assertEqual(len(points),1)
        self.assertEqual(points[0]['sport'],'course')
        self.assertEqual(points[0]['pace_s_km'],300)

    def test_longest_running_distance_record_includes_trail(self):
        with self.Session() as db:
            db.add(Activity(source='strava',source_id='run-2',name='Course',source_name='Course',sport='course',source_sport='Run',start_at=datetime.now(),distance_km=12,duration_s=3600))
            db.add(Activity(source='strava',source_id='trail-2',name='Trail',source_name='Trail',sport='trail',source_sport='TrailRun',start_at=datetime.now(),distance_km=21.5,duration_s=7200))
            db.commit()
        longest=next(r for r in self.client.get('/api/records').json()['records'] if r['label']=='Plus longue distance à pied')
        self.assertEqual(longest['distance_km'],21.5)
        self.assertEqual(longest['sport'],'trail')
        self.assertEqual(longest['kind'],'activité entière')

if __name__=='__main__':unittest.main()
