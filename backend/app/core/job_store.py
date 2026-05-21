import json

from app.core.redis import redis_client


def create_job(job_id: str):

    data = {
        "status": "queued",
    }

    redis_client.set(
        f"job:{job_id}",
        json.dumps(data),
    )


def update_job(
    job_id: str,
    payload: dict,
):

    redis_client.set(
        f"job:{job_id}",
        json.dumps(payload),
    )


def get_job(job_id: str):

    data = redis_client.get(f"job:{job_id}")

    if not data:
        return None

    return json.loads(data)
