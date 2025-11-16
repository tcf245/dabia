from abc import ABC, abstractmethod
from .config import settings

class StorageProvider(ABC):
    @abstractmethod
    def get_url(self, filename: str) -> str:
        """
        Generates the full URL for a given filename.
        """
        pass

class GCPStorageProvider(StorageProvider):
    def __init__(self, bucket_name: str, media_path: str = "medias"):
        self.bucket_name = bucket_name
        self.media_path = media_path
        self.base_url = f"https://storage.cloud.google.com/{self.bucket_name}"

    def get_url(self, filename: str) -> str:
        if not filename:
            return ""
        return f"{self.base_url}/{self.media_path}/{filename}"

class R2StorageProvider(StorageProvider):
    def __init__(self, public_url: str, media_path: str = "medias"):
        self.base_url = public_url
        self.media_path = media_path

    def get_url(self, filename: str) -> str:
        if not filename:
            return ""
        return f"{self.base_url}/{self.media_path}/{filename}"


def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_PROVIDER == "gcp":
        return GCPStorageProvider(
            bucket_name=settings.GCP_BUCKET_NAME,
            media_path=settings.GCP_MEDIA_PATH
        )
    elif settings.STORAGE_PROVIDER == "r2":
        return R2StorageProvider(
            public_url=settings.R2_PUBLIC_URL,
            media_path=settings.R2_MEDIA_PATH
        )
    else:
        raise ValueError(f"Unsupported storage provider: {settings.STORAGE_PROVIDER}")


storage_provider = get_storage_provider()
