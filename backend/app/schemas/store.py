from pydantic import BaseModel, ConfigDict


class StoreCreate(BaseModel):
    name: str
    document: str | None = None


class StoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    document: str | None
    status: bool
