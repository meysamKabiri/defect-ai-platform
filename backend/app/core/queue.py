from rq import Queue

from app.core.redis import redis_client

queue = Queue(
    "detection",
    connection=redis_client,
)
