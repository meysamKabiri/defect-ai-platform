from rq import Worker
from rq import Queue

from app.core.redis import (
    redis_client,
)

listen = ["detection"]

if __name__ == "__main__":

    queues = [
        Queue(
            name,
            connection=redis_client,
        )
        for name in listen
    ]

    worker = Worker(
        queues,
        connection=redis_client,
    )

    worker.work()
