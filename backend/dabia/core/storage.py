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

def get_storage_provider() -> StorageProvider:
    # For now, we are hardcoding GCP, but this can be extended
    # to read from settings.STORAGE_PROVIDER and return different providers.
    return GCPStorageProvider(
        bucket_name=settings.GCP_BUCKET_NAME,
        media_path=settings.GCP_MEDIA_PATH
    )

storage_provider = get_storage_provider()
