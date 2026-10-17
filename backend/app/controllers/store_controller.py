from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.store import Store

router = APIRouter(prefix="/api/stores", tags=["Stores"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
def list_stores(db: Session = Depends(get_db)):
    stores = db.scalars(select(Store)).all()
    return [{"id": s.id, "name": s.name, "document": s.document, "status": s.status} for s in stores]
