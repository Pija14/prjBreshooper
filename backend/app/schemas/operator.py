from pydantic import BaseModel, ConfigDict


class OperatorCreate(BaseModel):
    store_id: int
    user_id: int
    role: str = "OPERATOR"


class OperatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    user_id: int
    role: str
    status: str
