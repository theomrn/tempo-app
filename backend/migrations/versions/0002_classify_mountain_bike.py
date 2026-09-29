from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("UPDATE activities SET sport = 'vélo' WHERE sport = 'autre' AND source_sport IN ('MountainBikeRide', 'MountainBiking') AND local_override = 0"))


def downgrade():
    pass
