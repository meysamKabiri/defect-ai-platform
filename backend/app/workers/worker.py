from rq import Worker
from rq import Queue
from rq import Connection

from app.core.redis import (
    redis_client,
)

listen = ["detection"]

if __name__ == "__main__":

    with Connection(redis_client):

        worker = Worker([Queue(name) for name in listen])

        worker.work()
