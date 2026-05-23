import json

from app.core.redis import redis_client


def create_job(
    job_id: str,
    rq_job_id: str | None = None,
):

    data = {
        "job_id": job_id,
        "status": "queued",
    }

    if rq_job_id:
        data["rq_job_id"] = rq_job_id

    redis_client.set(
        f"job:{job_id}",
        json.dumps(data),
    )


def update_job(
    job_id: str,
    payload: dict,
):
    current_job = get_job(job_id) or {
        "job_id": job_id,
    }
    current_job.update(payload)
    print("------------current_job----------")
    print(current_job)
    print("------------current_job----------")
    redis_client.set(
        f"job:{job_id}",
        json.dumps(current_job),
    )


def get_job(job_id: str):

    data = redis_client.get(f"job:{job_id}")

    if not data:
        return None

    return json.loads(data)
