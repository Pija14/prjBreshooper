from fastapi import FastAPI

from app.controllers.health_controller import router as health_router
from app.controllers.store_controller import router as store_router
from app.controllers.user_controller import router as user_router
from app.controllers.operator_controller import router as operator_router
from app.controllers.product_controller import router as product_router
from app.controllers.evaluation_controller import router as evaluation_router

app = FastAPI(
    title="Breshopper API",
    version="0.1.0",
    description="API do MVP Breshopper",
)

app.include_router(health_router)
app.include_router(store_router)
app.include_router(user_router)
app.include_router(operator_router)
app.include_router(product_router)
app.include_router(evaluation_router)
