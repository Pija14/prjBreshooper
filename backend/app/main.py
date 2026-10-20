from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.controllers.auth_controller import router as auth_router
from app.controllers.health_controller import router as health_router
from app.controllers.store_controller import router as store_router
from app.controllers.user_controller import router as user_router
from app.controllers.operator_controller import router as operator_router
from app.controllers.category_controller import router as category_router
from app.controllers.brand_controller import router as brand_router
from app.controllers.product_controller import router as product_router
from app.controllers.evaluation_controller import router as evaluation_router
from app.controllers.sale_controller import router as sale_router

app = FastAPI(
    title="Breshopper API",
    version="0.1.0",
    description=(
        "API do MVP Breshopper. O sistema conecta usuários e lojas para "
        "facilitar a compra e venda de produtos, com operação realizada "
        "pelos operadores das lojas. O MVP controla usuários, lojas, "
        "operadores, categorias, marcas, produtos e avaliações, com login pelo Google."
    ),
)

# O frontend é publicado em outra origem (GitHub Pages); o navegador só permite as chamadas com CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(store_router)
app.include_router(user_router)
app.include_router(operator_router)
app.include_router(category_router)
app.include_router(brand_router)
app.include_router(product_router)
app.include_router(evaluation_router)
app.include_router(sale_router)
