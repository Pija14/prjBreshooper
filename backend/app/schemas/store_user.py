from pydantic import BaseModel, ConfigDict


class StoreUserCreate(BaseModel):
    store_id: int
    user_id: int
    role: str = "OPERATOR"


class StoreUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    user_id: int
    role: str
    status: str
