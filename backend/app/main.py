from fastapi import FastAPI
from app.controllers.health_controller import router as health_router
from app.controllers.store_controller import router as store_router

app = FastAPI(
    title="Breshopper API",
    version="0.1.0",
    description="API do MVP Breshopper",
)

app.include_router(health_router)
app.include_router(store_router)
