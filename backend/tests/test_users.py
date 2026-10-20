"""Testes da alteração de cliente (nome e telefone)."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from app.config import settings
from app.database.session import get_db
from app.main import app
from app.models import Operator, Store, User  # noqa: F401  (registra todas as tabelas)
from app.models.base import Base
from app.security import criar_token_acesso


def auth(usuario_id):
    return {"Authorization": f"Bearer {criar_token_acesso(usuario_id)[0]}"}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "x" * 40)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def get_test_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as c:
        loja = c.post("/api/lojas", json={"nome": "Brechó Teste"}).json()
        c.operadora = c.post("/api/usuarios", json={"nome": "Ana", "email": "ana@example.com"}).json()
        c.post("/api/operadores", json={"loja_id": loja["id"], "usuario_id": c.operadora["id"], "perfil": "OPERADOR"})
        c.cliente = c.post("/api/usuarios", json={"nome": "Bia", "email": "bia@example.com", "telefone": "11 9999-0000"}).json()
        c.outro = c.post("/api/usuarios", json={"nome": "Caio", "email": "caio@example.com"}).json()
        yield c
    app.dependency_overrides.clear()


def test_operador_altera_nome_e_telefone(client):
    r = client.patch(f"/api/usuarios/{client.cliente['id']}", json={"nome": "  Bia Souza ", "telefone": "(11) 98888-7777"}, headers=auth(client.operadora["id"]))
    assert r.status_code == 200
    assert (r.json()["nome"], r.json()["telefone"], r.json()["email"]) == ("Bia Souza", "(11) 98888-7777", "bia@example.com")


def test_telefone_vazio_remove(client):
    r = client.patch(f"/api/usuarios/{client.cliente['id']}", json={"telefone": "  "}, headers=auth(client.operadora["id"]))
    assert r.json()["telefone"] is None and r.json()["nome"] == "Bia"


def test_nome_vazio_recusado(client):
    assert client.patch(f"/api/usuarios/{client.cliente['id']}", json={"nome": " "}, headers=auth(client.operadora["id"])).status_code == 400


def test_somente_operador_ou_o_proprio(client):
    url = f"/api/usuarios/{client.cliente['id']}"
    assert client.patch(url, json={"nome": "X"}).status_code == 401
    assert client.patch(url, json={"nome": "X"}, headers=auth(client.outro["id"])).status_code == 403
    assert client.patch(url, json={"nome": "Bia B."}, headers=auth(client.cliente["id"])).status_code == 200
    assert client.patch("/api/usuarios/999", json={"nome": "X"}, headers=auth(client.operadora["id"])).status_code == 404
