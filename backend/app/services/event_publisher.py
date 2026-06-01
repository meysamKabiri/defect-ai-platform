import asyncio
import json
import logging
from datetime import datetime
from datetime import timezone
from typing import Any

from app.core.redis import redis_client

logger = logging.getLogger(__name__)


def workspace_event_channel(workspace_id: str) -> str:
    return f"workspace:{workspace_id}:events"


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _event_payload(
    *,
    event_type: str,
    workspace_id: str,
    project_id: str | None = None,
    batch_id: str | None = None,
    job_id: str | None = None,
    feedback_id: str | None = None,
    status: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": event_type,
        "workspace_id": workspace_id,
        "project_id": project_id,
        "batch_id": batch_id,
        "job_id": job_id,
        "feedback_id": feedback_id,
        "status": status,
        "timestamp": _utc_timestamp(),
    }
    if extra:
        payload.update(extra)
    return {key: value for key, value in payload.items() if value is not None}


def publish_workspace_event_sync(
    *,
    event_type: str,
    workspace_id: str,
    project_id: str | None = None,
    batch_id: str | None = None,
    job_id: str | None = None,
    feedback_id: str | None = None,
    status: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    payload = _event_payload(
        event_type=event_type,
        workspace_id=workspace_id,
        project_id=project_id,
        batch_id=batch_id,
        job_id=job_id,
        feedback_id=feedback_id,
        status=status,
        extra=extra,
    )
    try:
        redis_client.publish(
            workspace_event_channel(workspace_id),
            json.dumps(payload, separators=(",", ":")),
        )
    except Exception:
        logger.exception("Failed to publish workspace event: %s", event_type)


async def publish_workspace_event(
    *,
    event_type: str,
    workspace_id: str,
    project_id: str | None = None,
    batch_id: str | None = None,
    job_id: str | None = None,
    feedback_id: str | None = None,
    status: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    await asyncio.to_thread(
        publish_workspace_event_sync,
        event_type=event_type,
        workspace_id=workspace_id,
        project_id=project_id,
        batch_id=batch_id,
        job_id=job_id,
        feedback_id=feedback_id,
        status=status,
        extra=extra,
    )
