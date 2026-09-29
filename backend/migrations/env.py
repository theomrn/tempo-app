import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from alembic import context
from sqlalchemy import engine_from_config, pool
from app.db import Base
from app.db import URL
from app import models
config = context.config
config.set_main_option('sqlalchemy.url', URL)
target_metadata = Base.metadata
def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
        with context.begin_transaction():
            context.run_migrations()
run_migrations_online()
