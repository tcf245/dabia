from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str

    # Cloud Storage settings
    GCP_BUCKET_NAME: str = "dabia-assets"
    GCP_MEDIA_PATH: str = "medias"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()