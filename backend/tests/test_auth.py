"""Testes do login com Google e da sessão (JWT).

O banco é um SQLite em memória (via override de get_db) e as chaves do Google são
substituídas por uma chave RSA local, para testar a validação sem acessar a rede.
"""
import time
import types

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import security
from app.config import settings
from app.database.session import get_db
from app.main import app
from app.models import Operator, Store, User  # noqa: F401  (registra todas as tabelas)
from app.models.base import Base

CLIENT_ID = "breshopper-test.apps.googleusercontent.com"
CHAVE = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def get_test_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = get_test_db
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "jwt_secret", "x" * 40)
    monkeypatch.setattr(security, "google_jwks", types.SimpleNamespace(get_signing_key_from_jwt=lambda _t: types.SimpleNamespace(key=CHAVE.public_key())))
    with TestClient(app) as c:
        c.session_factory = TestingSession
        yield c
    app.dependency_overrides.clear()


def credencial(chave=CHAVE, algoritmo="RS256", **alteracoes):
    agora = int(time.time())
    dados = {"iss": "https://accounts.google.com", "aud": CLIENT_ID, "sub": "google-123", "iat": agora, "exp": agora + 600,
             "email": "Maria@Gmail.com", "email_verified": True, "name": "Maria Souza", "picture": "https://exemplo.com/maria.jpg"}
    dados.update(alteracoes)
    dados = {k: v for k, v in dados.items() if v is not None}
    return jwt.encode(dados, chave if algoritmo == "RS256" else "x" * 40, algorithm=algoritmo)


def entrar(client, token):
    return client.post("/api/auth/google", json={"credencial": token})


def test_configuracao_google(client):
    assert client.get("/api/auth/google/config").json() == {"habilitado": True, "client_id": CLIENT_ID}


def test_primeiro_login_cria_usuario_e_sessao(client):
    r = entrar(client, credencial())
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["tipo_token"] == "bearer"
    assert corpo["usuario"]["email"] == "maria@gmail.com"
    assert corpo["usuario"]["nome"] == "Maria Souza"
    assert corpo["usuario"]["identificador_google"] == "google-123"
    assert corpo["usuario"]["url_avatar"] == "https://exemplo.com/maria.jpg"
    sessao = client.get("/api/auth/sessao", headers={"Authorization": f"Bearer {corpo['token_acesso']}"})
    assert sessao.status_code == 200
    assert sessao.json() == {"usuario": corpo["usuario"], "lojas": []}


def test_segundo_login_reutiliza_o_usuario(client):
    primeiro = entrar(client, credencial()).json()["usuario"]["id"]
    assert entrar(client, credencial()).json()["usuario"]["id"] == primeiro


def test_vincula_conta_google_a_usuario_existente_pelo_email(client):
    criado = client.post("/api/usuarios", json={"nome": "Maria", "email": "maria@gmail.com"})
    # O controller de usuários usa o mesmo get_db (sobrescrito), então o usuário existe no banco de teste.
    assert criado.status_code == 201
    r = entrar(client, credencial())
    assert r.status_code == 200
    assert r.json()["usuario"]["id"] == criado.json()["id"]
    assert r.json()["usuario"]["identificador_google"] == "google-123"


def test_sessao_lista_lojas_em_que_o_usuario_e_operador(client):
    corpo = entrar(client, credencial()).json()
    db = client.session_factory()
    loja = Store(nome="Brechó Centro", status="ATIVO")
    db.add(loja)
    db.flush()
    db.add(Operator(loja_id=loja.id, usuario_id=corpo["usuario"]["id"], perfil="OPERADOR", status="ATIVO"))
    db.commit()
    loja_id = loja.id
    db.close()
    sessao = client.get("/api/auth/sessao", headers={"Authorization": f"Bearer {corpo['token_acesso']}"}).json()
    assert sessao["lojas"] == [{"operador_id": 1, "loja_id": loja_id, "loja_nome": "Brechó Centro", "perfil": "OPERADOR"}]


@pytest.mark.parametrize("alteracao", [
    {"aud": "outro-app"},
    {"iss": "https://atacante.exemplo"},
    {"email_verified": False},
    {"email": None},
    {"exp": int(time.time()) - 120, "iat": int(time.time()) - 900},
])
def test_rejeita_credenciais_invalidas(client, alteracao):
    assert entrar(client, credencial(**alteracao)).status_code == 401


def test_rejeita_assinatura_de_outra_chave(client):
    outra = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    assert entrar(client, credencial(chave=outra)).status_code == 401


def test_rejeita_confusao_de_algoritmo(client):
    assert entrar(client, credencial(algoritmo="HS256")).status_code == 401


def test_usuario_inativo_nao_entra(client):
    usuario_id = entrar(client, credencial()).json()["usuario"]["id"]
    db = client.session_factory()
    db.get(User, usuario_id).status = "INATIVO"
    db.commit()
    db.close()
    assert entrar(client, credencial()).status_code == 403


def test_sessao_exige_token_valido(client):
    assert client.get("/api/auth/sessao").status_code == 401
    assert client.get("/api/auth/sessao", headers={"Authorization": "Bearer invalido"}).status_code == 401


def test_login_desabilitado_sem_client_id(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    assert client.get("/api/auth/google/config").json()["habilitado"] is False
    assert entrar(client, credencial()).status_code == 503


def test_cors_libera_github_pages(client):
    r = client.options("/api/auth/google/config", headers={"Origin": "https://pija14.github.io", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "https://pija14.github.io"
