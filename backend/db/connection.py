"""Async SQLite connection management with WAL mode."""

from pathlib import Path

import aiosqlite

from ..config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _db


async def init_db() -> aiosqlite.Connection:
    global _db
    db_path = Path(settings.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    _db = await aiosqlite.connect(str(db_path))
    _db.row_factory = aiosqlite.Row

    # Enable WAL mode for concurrent read/write
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("PRAGMA synchronous=NORMAL")
    await _db.execute("PRAGMA cache_size=-64000")  # 64MB cache
    await _db.execute("PRAGMA foreign_keys=ON")

    # Create tables
    from .models import CREATE_TABLES

    for stmt in CREATE_TABLES:
        await _db.execute(stmt)
    await _db.commit()

    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
