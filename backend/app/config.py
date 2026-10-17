from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://breshopper:breshopper@db:5432/breshopper"

    # Autenticação
    google_client_id: str = ""
    jwt_secret: str = ""
    access_token_minutes: int = 720

    # Origens autorizadas a chamar a API pelo navegador (separadas por vírgula).
    cors_origins: str = "https://pija14.github.io,http://localhost:8080,http://127.0.0.1:8080"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
