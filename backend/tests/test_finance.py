"""Testes do financeiro: repasses (despesas) ao vendedor, carteira e resumo da loja."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

from app.config import settings
from app.database.session import get_db
from app.main import app
from app.models import Movement, Operator, Payout, Sale, Store, User  # noqa: F401  (registra todas as tabelas)
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
        c.op_auth = auth(operadora["id"])
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


def repasses(c, status=None):
    params = {"status": status} if status else {}
    r = c.get(f"/api/lojas/{c.loja['id']}/repasses", params=params, headers=c.op_auth)
    assert r.status_code == 200
    return r.json()


def pagar(c, repasse_id, forma, headers=None):
    return c.post(f"/api/repasses/{repasse_id}/pagamento", json={"forma_pagamento": forma}, headers=headers or c.op_auth)


def conta(c, usuario_id):
    return c.get("/api/conta-corrente", headers=auth(usuario_id)).json()


def test_venda_gera_repasse_pendente_sem_creditar_carteira(client):
    venda = vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    assert (rep["status"], rep["valor"], rep["forma_pagamento"], rep["pago_em"]) == ("PENDENTE", "600.00", None, None)
    assert rep["referencia"] == venda["referencia"] and rep["vendedor_nome"] == "Bia" and rep["produto_nome"] == "Raquete"
    c = conta(client, client.vendedor["id"])
    assert (c["saldo"], c["a_receber"], c["movimentacoes"]) == ("0.00", "600.00", [])


def test_pagamento_em_credito_na_loja_vai_para_a_carteira(client):
    venda = vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    r = pagar(client, rep["id"], "CREDITO_LOJA")
    assert r.status_code == 200
    assert (r.json()["status"], r.json()["forma_pagamento"]) == ("PAGO", "CREDITO_LOJA")
    assert r.json()["pago_em"].endswith(("Z", "+00:00"))
    c = conta(client, client.vendedor["id"])
    assert (c["saldo"], c["a_receber"]) == ("600.00", "0.00")
    mov = c["movimentacoes"][0]
    assert (mov["tipo"], mov["valor"], mov["referencia"], mov["produto_nome"]) == ("CREDITO", "600.00", venda["referencia"], "Raquete")


@pytest.mark.parametrize("forma", ["PIX", "CARTAO"])
def test_pagamento_por_pix_ou_cartao_nao_credita_carteira(client, forma):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    assert pagar(client, rep["id"], forma).json()["forma_pagamento"] == forma
    c = conta(client, client.vendedor["id"])
    assert (c["saldo"], c["a_receber"], c["movimentacoes"]) == ("0.00", "0.00", [])


def test_nao_paga_duas_vezes(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    assert pagar(client, rep["id"], "CREDITO_LOJA").status_code == 200
    r = pagar(client, rep["id"], "CREDITO_LOJA")
    assert r.status_code == 409
    assert r.json()["detail"] == "Este vendedor já foi pago por esta venda"
    assert conta(client, client.vendedor["id"])["saldo"] == "600.00"


def test_forma_de_pagamento_invalida(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    assert pagar(client, rep["id"], "BOLETO").status_code == 422
    assert repasses(client)[0]["status"] == "PENDENTE"


def test_pagamento_somente_por_operador_da_loja(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    [rep] = repasses(client)
    assert client.post(f"/api/repasses/{rep['id']}/pagamento", json={"forma_pagamento": "PIX"}).status_code == 401
    assert pagar(client, rep["id"], "PIX", headers=auth(client.vendedor["id"])).status_code == 403
    assert pagar(client, 999, "PIX").status_code == 404
    assert client.get(f"/api/lojas/{client.loja['id']}/repasses", headers=auth(client.vendedor["id"])).status_code == 403


def test_lista_repasses_por_status(client):
    vender(client, "A", "100.00", "60.00", "40.00")
    vender(client, "B", "200.00", "120.00", "80.00")
    vender(client, "C", "300.00", "180.00", "120.00")
    a = next(r for r in repasses(client) if r["produto_nome"] == "A")
    pagar(client, a["id"], "PIX")
    assert [r["produto_nome"] for r in repasses(client)] == ["B", "C", "A"]  # pendentes (mais antigo primeiro), depois pagos
    assert [r["produto_nome"] for r in repasses(client, "pendente")] == ["B", "C"]
    assert [r["produto_nome"] for r in repasses(client, "PAGO")] == ["A"]


def test_resumo_financeiro_da_loja(client):
    outro = client.post("/api/usuarios", json={"nome": "Davi", "email": "davi@example.com"}).json()
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    vender(client, "Tênis", "350.00", "210.00", "140.00")
    vender(client, "Mochila", "500.00", "250.00", "250.00", vendedor_id=outro["id"])
    reps = {r["produto_nome"]: r for r in repasses(client)}
    pagar(client, reps["Raquete"]["id"], "PIX")
    pagar(client, reps["Mochila"]["id"], "CREDITO_LOJA")

    fin = client.get(f"/api/lojas/{client.loja['id']}/financeiro", headers=client.op_auth).json()
    r = fin["resumo"]
    assert (r["quantidade_vendas"], r["total_vendido"], r["receita_loja"], r["parte_vendedores"]) == (3, "1850.00", "790.00", "1060.00")
    assert (r["pago_vendedores"], r["a_pagar_vendedores"], r["repasses_pendentes"]) == ("850.00", "210.00", 1)
    assert r["pago_por_forma"] == {"PIX": "600.00", "CARTAO": "0.00", "CREDITO_LOJA": "250.00"}
    assert [(v["nome"], v["total_vendedor"], v["a_pagar"]) for v in fin["vendedores"]] == [("Bia", "810.00", "210.00"), ("Davi", "250.00", "0.00")]
    assert {v["produto_nome"]: v["repasse_status"] for v in fin["vendas"]} == {"Raquete": "PAGO", "Tênis": "PENDENTE", "Mochila": "PAGO"}


def test_resumo_filtra_periodo_mas_a_pagar_e_sempre_total(client):
    vender(client, "Raquete", "1000.00", "600.00", "400.00")
    url = f"/api/lojas/{client.loja['id']}/financeiro"
    futuro = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    passado = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.get(url, params={"de": passado, "ate": futuro}, headers=client.op_auth).json()["resumo"]["quantidade_vendas"] == 1
    r = client.get(url, params={"de": futuro}, headers=client.op_auth).json()["resumo"]
    assert (r["quantidade_vendas"], r["total_vendido"], r["a_pagar_vendedores"]) == (0, "0.00", "600.00")


def test_financeiro_somente_operador_da_loja(client):
    url = f"/api/lojas/{client.loja['id']}/financeiro"
    assert client.get(url).status_code == 401
    assert client.get(url, headers=auth(client.vendedor["id"])).status_code == 403
    assert client.get("/api/lojas/999/financeiro", headers=client.op_auth).status_code == 404


def test_conta_exige_login(client):
    assert client.get("/api/conta-corrente").status_code == 401
