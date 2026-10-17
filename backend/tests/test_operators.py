"""Testes da alteração de operador (perfil e status)."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from app.database.session import get_db
from app.main import app
from app.models import Operator, Store, User  # noqa: F401  (registra todas as tabelas)
from app.models.base import Base


@pytest.fixture()
def client():
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
        usuario = c.post("/api/usuarios", json={"nome": "Ana", "email": "ana@example.com"}).json()
        c.operador = c.post("/api/operadores", json={"loja_id": loja["id"], "usuario_id": usuario["id"], "perfil": "ADMINISTRADOR"}).json()
        yield c
    app.dependency_overrides.clear()


def test_altera_perfil_para_operador(client):
    r = client.patch(f"/api/operadores/{client.operador['id']}", json={"perfil": "operador"})
    assert r.status_code == 200
    assert r.json()["perfil"] == "OPERADOR"
    assert r.json()["status"] == "ATIVO"


def test_desativa_operador(client):
    r = client.patch(f"/api/operadores/{client.operador['id']}", json={"status": "INATIVO"})
    assert r.status_code == 200
    assert r.json()["status"] == "INATIVO"
    assert r.json()["perfil"] == "ADMINISTRADOR"


def test_valida_valores(client):
    assert client.patch(f"/api/operadores/{client.operador['id']}", json={"perfil": "GERENTE"}).status_code == 400
    assert client.patch(f"/api/operadores/{client.operador['id']}", json={"status": "SUSPENSO"}).status_code == 400


def test_operador_inexistente(client):
    assert client.patch("/api/operadores/999", json={"perfil": "OPERADOR"}).status_code == 404
