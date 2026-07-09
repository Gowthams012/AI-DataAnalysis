import json
import structlog
from typing import Optional, Any
from redis.asyncio import Redis, ConnectionPool
from app.core.config import settings

log = structlog.get_logger(__name__)

class RedisCache:
    """Async Redis cache for LLM requests with graceful fallback."""
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.enabled = False
        try:
            if settings.redis_url:
                pool = ConnectionPool.from_url(settings.redis_url, decode_responses=True)
                self.redis = Redis(connection_pool=pool)
                self.enabled = True
                log.info("redis.init.ok", url=settings.redis_url)
        except Exception as e:
            log.warning("redis.init.failed", error=str(e))

    async def get(self, key: str) -> Optional[Any]:
        """Get parsed JSON value from cache."""
        if not self.enabled or not self.redis:
            return None
        try:
            val = await self.redis.get(key)
            if val:
                log.debug("redis.get.hit", key=key)
                return json.loads(val)
            return None
        except Exception as e:
            log.warning("redis.get.error", key=key, error=str(e))
            return None

    async def set(self, key: str, value: Any, expire_seconds: int = 86400) -> bool:
        """Store value as JSON in cache with 24h default expiry."""
        if not self.enabled or not self.redis:
            return False
        try:
            val = json.dumps(value)
            await self.redis.set(key, val, ex=expire_seconds)
            log.debug("redis.set.ok", key=key)
            return True
        except Exception as e:
            log.warning("redis.set.error", key=key, error=str(e))
            return False

    async def close(self):
        if self.redis:
            await self.redis.close()

redis_cache = RedisCache()
