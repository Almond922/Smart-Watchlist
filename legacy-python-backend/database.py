import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# SQLite for the hackathon demo (zero setup). Swap DATABASE_URL to a
# postgresql:// URL and nothing else in this file needs to change.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./watchlist.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)
