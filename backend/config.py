"""Backend configuration via environment variables and defaults."""

import os
import secrets
import stat
from pathlib import Path

from pydantic_settings import BaseSettings

# Where the auto-generated API key is persisted between restarts
_KEY_FILE = Path(__file__).parent / "data" / ".api_key"


def _load_or_generate_api_key() -> str:
    """Return the API key from env var, persisted file, or generate+save a new one.

    Priority:
      1. HOMESOC_API_KEY env var (explicit override — always wins)
      2. .api_key file in backend/data/ (persisted across restarts)
      3. Generate a new key, write it to the file with 0600 permissions
    """
    env_key = os.environ.get("HOMESOC_API_KEY", "").strip()
    if env_key:
        return env_key

    _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)

    if _KEY_FILE.exists():
        key = _KEY_FILE.read_text().strip()
        if key:
            return key

    # Generate and persist
    key = secrets.token_urlsafe(32)
    _KEY_FILE.write_text(key)
    # Owner read/write only — no group/other access
    _KEY_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return key


class Settings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8443
    db_path: str = str(Path(__file__).parent / "data" / "events.db")
    rules_dir: str = str(Path(__file__).parent / "rules")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    event_retention_days: int = 7
    heartbeat_timeout_seconds: int = 60

    # API key — loaded from env, persisted file, or auto-generated once
    api_key: str = ""

    # JWT settings for dashboard user auth
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    # Redis settings
    redis_url: str = "redis://localhost:6379/0"

    model_config = {"env_prefix": "HOMESOC_"}

    def ensure_api_key(self) -> str:
        """Return the stable API key, loading/generating it once."""
        if not self.api_key:
            self.api_key = _load_or_generate_api_key()
        return self.api_key

    def ensure_jwt_secret(self) -> str:
        """Return the JWT secret, generating one if empty."""
        if not self.jwt_secret:
            self.jwt_secret = secrets.token_urlsafe(32)
        return self.jwt_secret


settings = Settings()
