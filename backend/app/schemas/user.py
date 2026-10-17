from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    google_sub: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_sub: str | None
    name: str
    email: EmailStr
    phone: str | None
    avatar_url: str | None
    status: bool
