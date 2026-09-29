from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import activities, analysis, imports, planning, strava, tags

app = FastAPI(title='Carnet sportif local')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health():
    return {'ok': True}


for router in (
    activities.router, tags.router, imports.router,
    analysis.router, planning.router, strava.router,
):
    app.include_router(router)
