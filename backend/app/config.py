from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "OVERSEER Agent"
    api_prefix: str = "/api"
    secret_key: str = "CHANGE_ME"
    access_token_expire_minutes: int = 60 * 24
    mongodb_uri: str | None = None
    mongodb_db: str = "overseer"
    openai_api_key: str | None = None
    llm_api_base: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    model_config = SettingsConfigDict(env_file=".env")


class TokenPayload(BaseModel):
    sub: str
    exp: int
