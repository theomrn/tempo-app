import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).resolve().parents[2]/'.env')
URL = os.getenv('DATABASE_URL', 'sqlite:///./sport.db')
engine = create_engine(URL, connect_args={'check_same_thread': False} if URL.startswith('sqlite') else {})
Session = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def session():
    with Session() as db:
        yield db
