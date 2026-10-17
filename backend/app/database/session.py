from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Supabase fornece a URI PostgreSQL no formato `postgresql://...`.
# Como este projeto utiliza psycopg 3, explicitamos o driver para o SQLAlchemy.
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
