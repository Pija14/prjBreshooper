from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["Usuários"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[UserResponse], summary="Listar usuários", description="Retorna todos os usuários cadastrados no Beeshopper.")
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.get("/{user_id}", response_model=UserResponse, summary="Consultar usuário", description="Retorna os dados de um usuário específico pelo identificador.")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Cadastrar usuário", description="Cadastra uma pessoa no Beeshopper. O usuário pode atuar como comprador e/ou vendedor; esses papéis surgem conforme as operações realizadas.")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    email = str(payload.email).strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Nome é obrigatório")

    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail")

    if payload.google_sub and db.scalar(select(User).where(User.google_sub == payload.google_sub)):
        raise HTTPException(status_code=409, detail="Este usuário Google já está cadastrado")

    user = User(
        name=name,
        email=email,
        google_sub=payload.google_sub,
        phone=payload.phone,
        avatar_url=payload.avatar_url,
        status=True,
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível cadastrar o usuário")

    return user
