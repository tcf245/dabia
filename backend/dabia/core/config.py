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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()