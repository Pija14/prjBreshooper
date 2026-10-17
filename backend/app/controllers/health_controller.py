from fastapi import APIRouter

router = APIRouter(tags=["Sistema"])


@router.get(
    "/health",
    summary="Verificar saúde da API",
    description="Verifica se a API do Beeshopper está disponível e respondendo normalmente.",
)
def health():
    return {"status": "ok", "service": "breshopper-api"}
