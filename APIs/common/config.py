import sqlite3
import os
from pathlib import Path
from .exceptions import DBConnectionError
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class dbConfig:
    def __init__(self, path: str = None):
        if path is None:
            self.db_path = os.getenv("DB_PATH", "db.sqlite3")

        self.db_path = Path(self.db_path)
        self.ensure_directory_exits()

    def _ensure_directory_exits(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def get_connection(self):
        conn = sqlite3.connect(str(self.db_path), timeout=20.0)

        try:
            yield
            conn.commit
        except Exception as e:
            raise DBConnectionError("Failed to connect to Database", details={"original_exp":e})
        finally:
            conn.close()

# Resolve .env from the Django project root (djangofyp/)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class ChatModelSetting(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow",
    )

    text_model: str = Field('gemini-2.0-flash')
    video_model: str = Field('gemini-2.0-flash')
    alternate_video_model: str = Field('gemini-1.5-flash')
    temperature: float = Field(1)
    max_tokens: int = Field(512)
    api_key: str = Field(...)

model_setting = ChatModelSetting()




