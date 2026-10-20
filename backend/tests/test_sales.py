"""Testes do registro de vendas."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from app.database.session import get_db
from app.main import app
from app.models import Operator, Sale, Store, User  # noqa: F401  (registra todas as tabelas)
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
        operadora = c.post("/api/usuarios", json={"nome": "Ana", "email": "ana@example.com"}).json()
        c.operador = c.post("/api/operadores", json={"loja_id": loja["id"], "usuario_id": operadora["id"], "perfil": "OPERADOR"}).json()
        c.vendedor = c.post("/api/usuarios", json={"nome": "Bia", "email": "bia@example.com"}).json()
        c.comprador = c.post("/api/usuarios", json={"nome": "Caio", "email": "caio@example.com"}).json()
        c.produto = c.post(
            f"/api/produtos?operador_id={c.operador['id']}",
            json={"loja_id": loja["id"], "usuario_vendedor_id": c.vendedor["id"], "nome": "Raquete"},
        ).json()
        yield c
    app.dependency_overrides.clear()


def avaliar(c):
    r = c.post(
        f"/api/avaliacoes?operador_id={c.operador['id']}",
        json={"produto_id": c.produto["id"], "valor_venda": "1000.00", "valor_usuario": "600.00", "valor_loja": "400.00"},
    )
    assert r.status_code == 201


def vender(c, comprador_id=None):
    return c.post(
        f"/api/vendas?operador_id={c.operador['id']}",
        json={"produto_id": c.produto["id"], "usuario_comprador_id": comprador_id or c.comprador["id"]},
    )


def test_registra_venda_com_valores_da_avaliacao(client):
    avaliar(client)
    r = vender(client)
    assert r.status_code == 201
    venda = r.json()
    assert venda["status"] == "CONCLUIDA"
    assert venda["referencia"].startswith("VND-")
    assert (venda["valor_venda"], venda["valor_usuario"], venda["valor_loja"]) == ("1000.00", "600.00", "400.00")
    produtos = client.get("/api/produtos").json()
    assert produtos[0]["status"] == "VENDIDO"
    assert client.get(f"/api/vendas?loja_id={client.operador['loja_id']}").json()[0]["id"] == venda["id"]


def test_produto_nao_disponivel(client):
    r = vender(client)
    assert r.status_code == 400
    assert r.json()["detail"] == "Produto não está disponível para venda"


def test_nao_vende_duas_vezes(client):
    avaliar(client)
    assert vender(client).status_code == 201
    assert vender(client).status_code == 400


def test_vendedor_nao_compra_o_proprio_produto(client):
    avaliar(client)
    r = vender(client, client.vendedor["id"])
    assert r.status_code == 400
    assert r.json()["detail"] == "O vendedor não pode comprar o próprio produto"


def test_operador_nao_compra(client):
    avaliar(client)
    r = vender(client, client.operador["usuario_id"])
    assert r.status_code == 400
    assert r.json()["detail"] == "Operadores de loja não podem comprar produtos"


def test_operador_de_outra_loja(client):
    avaliar(client)
    outra = client.post("/api/lojas", json={"nome": "Outra"}).json()
    usuario = client.post("/api/usuarios", json={"nome": "Davi", "email": "davi@example.com"}).json()
    op = client.post("/api/operadores", json={"loja_id": outra["id"], "usuario_id": usuario["id"], "perfil": "OPERADOR"}).json()
    r = client.post(f"/api/vendas?operador_id={op['id']}", json={"produto_id": client.produto["id"], "usuario_comprador_id": client.comprador["id"]})
    assert r.status_code == 403
