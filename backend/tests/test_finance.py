"""Testes da conta corrente (crédito na venda) e do financeiro da loja."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from app.config import settings
from app.database.session import get_db
from app.main import app
from app.models import Movement, Operator, Sale, Store, User  # noqa: F401  (registra todas as tabelas)
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
        c.loja = c.post("/api/lojas", json={"nome": "Brechó Teste"}).json()
        operadora = c.post("/api/usuarios", json={"nome": "Ana", "email": "ana@example.com"}).json()
        c.operador = c.post("/api/operadores", json={"loja_id": c.loja["id"], "usuario_id": operadora["id"], "perfil": "OPERADOR"}).json()
        c.vendedor = c.post("/api/usuarios", json={"nome": "Bia", "email": "bia@example.com"}).json()
        c.comprador = c.post("/api/usuarios", json={"nome": "Caio", "email": "caio@example.com"}).json()
        yield c
    app.dependency_overrides.clear()


def vender(c, nome, venda, usuario, loja, vendedor_id=None):
    op = c.operador["id"]
    produto = c.post(f"/api/produtos?operador_id={op}", json={"loja_id": c.loja["id"], "usuario_vendedor_id": vendedor_id or c.vendedor["id"], "nome": nome}).json()
    assert c.post(f"/api/avaliacoes?operador_id={op}", json={"produto_id": produto["id"], "valor_venda": venda, "valor_usuario": usuario, "valor_loja": loja}).status_code == 201
    r = c.post(f"/api/vendas?operador_id={op}", json={"produto_id": produto["id"], "usuario_comprador_id": c.comprador["id"]})
    assert r.status_code == 201
    return r.json()


def test_venda_gera_credito_na_conta_do_vendedor(client):
    venda = vender(client, "Raquete", "1000.00", "600.00", "400.00")
    r = client.get("/api/conta-corrente", headers=auth(client.vendedor["id"]))
    assert r.status_code == 200
    conta = r.json()
    assert conta["saldo"] == "600.00"
    assert conta["total_creditos"] == "600.00"
    mov = conta["movimentacoes"][0]
    assert (mov["tipo"], mov["origem"], mov["valor"]) == ("CREDITO", "VENDA", "600.00")
    assert mov["produto_nome"] == "Raquete" and mov["referencia"] == venda["referencia"] and mov["loja_nome"] == "Brechó Teste"
    assert mov["data_hora"].endswith(("Z", "+00:00"))


def test_saldo_soma_varias_vendas_sem_erro_de_arredondamento(client):
    vender(client, "A", "0.30", "0.10", "0.20")
    vender(client, "B", "0.30", "0.20", "0.10")
    vender(client, "C", "199.99", "120.00", "79.99")
    conta = client.get("/api/conta-corrente", headers=auth(client.vendedor["id"])).json()
    assert conta["saldo"] == "120.30"
    assert [m["produto_nome"] for m in conta["movimentacoes"]] == ["C", "B", "A"]


def test_comprador_nao_recebe_credito(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    conta = client.get("/api/conta-corrente", headers=auth(client.comprador["id"])).json()
    assert conta["saldo"] == "0.00" and conta["movimentacoes"] == []


def test_conta_exige_login(client):
    assert client.get("/api/conta-corrente").status_code == 401


def test_financeiro_da_loja(client):
    outro = client.post("/api/usuarios", json={"nome": "Davi", "email": "davi@example.com"}).json()
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    vender(client, "Tênis", "350.00", "210.00", "140.00")
    vender(client, "Mochila", "500.00", "250.00", "250.00", vendedor_id=outro["id"])
    r = client.get(f"/api/lojas/{client.loja['id']}/financeiro", headers=auth(client.operador["usuario_id"]))
    assert r.status_code == 200
    fin = r.json()
    assert fin["resumo"] == {"quantidade_vendas": 3, "total_vendido": "1850.00", "receita_loja": "790.00", "creditado_vendedores": "1060.00"}
    assert [(v["nome"], v["quantidade_vendas"], v["total_creditado"]) for v in fin["vendedores"]] == [("Bia", 2, "810.00"), ("Davi", 1, "250.00")]
    assert [v["produto_nome"] for v in fin["vendas"]] == ["Mochila", "Tênis", "Raquete"]
    assert fin["vendas"][0]["comprador_nome"] == "Caio"


def test_financeiro_filtra_periodo(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    url = f"/api/lojas/{client.loja['id']}/financeiro"
    h = auth(client.operador["usuario_id"])
    agora = datetime.now(timezone.utc)
    futuro = (agora + timedelta(days=1)).isoformat()
    passado = (agora - timedelta(days=1)).isoformat()
    assert client.get(url, params={"de": passado, "ate": futuro}, headers=h).json()["resumo"]["quantidade_vendas"] == 1
    assert client.get(url, params={"de": futuro}, headers=h).json()["resumo"]["quantidade_vendas"] == 0
    assert client.get(url, params={"ate": passado}, headers=h).json()["resumo"]["total_vendido"] == "0.00"


def test_financeiro_somente_operador_da_loja(client):
    url = f"/api/lojas/{client.loja['id']}/financeiro"
    assert client.get(url).status_code == 401
    assert client.get(url, headers=auth(client.vendedor["id"])).status_code == 403
    assert client.get("/api/lojas/999/financeiro", headers=auth(client.operador["usuario_id"])).status_code == 404
