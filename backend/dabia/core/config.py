from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str

    # Storage Provider: "gcp" or "r2"
    STORAGE_PROVIDER: str = "r2"

    # GCP Cloud Storage settings
    GCP_BUCKET_NAME: str = "dabia-assets"
    GCP_MEDIA_PATH: str = "medias"

    # R2 Cloudflare Storage settings
    R2_PUBLIC_URL: str = "https://rawcontent.erictans.com"
    R2_MEDIA_PATH: str = "medias"

    # Auth Settings
    GOOGLE_CLIENT_ID: str = "PLACEHOLDER_CLIENT_ID"
    GOOGLE_CLIENT_SECRET: str = "PLACEHOLDER_CLIENT_SECRET"
    SECRET_KEY: str = "dev_secret_key" # Default for dev, override in prod
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days (10080 minutes)
    GRAMMAR_DEBUG_ENABLED: bool = False
    GRAMMAR_DEBUG_SOURCE: str = "auto-rule-v1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
