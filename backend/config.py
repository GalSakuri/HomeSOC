"""Backend configuration via environment variables and defaults."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8443
    db_path: str = str(Path(__file__).parent / "data" / "events.db")
    rules_dir: str = str(Path(__file__).parent / "rules")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    event_retention_days: int = 7
    heartbeat_timeout_seconds: int = 60

    model_config = {"env_prefix": "HOMESOC_"}


settings = Settings()
