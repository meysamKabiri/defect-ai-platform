import json
import logging
from datetime import datetime
from datetime import timezone
from typing import AsyncIterator

import redis.asyncio as redis_async
from fastapi import APIRouter
from fastapi import Depends
from fastapi import Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.roles import require_authenticated
from app.core.config import settings
from app.core.database import get_db_session
from app.db.models.user import User
from app.services.event_publisher import workspace_event_channel
from app.services.workspace_service import WorkspaceService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Workspace Events"])

HEARTBEAT_SECONDS = 15


def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, separators=(",", ":"))
    return f"event: {event}\ndata: {payload}\n\n"


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/workspaces/{workspace_id}/events")
async def workspace_events(
    workspace_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_authenticated()),
):
    await WorkspaceService(db).require_membership(
        workspace_id=workspace_id,
        user=current_user,
    )

    async def event_stream() -> AsyncIterator[str]:
        redis_client = redis_async.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
        channel = workspace_event_channel(workspace_id)

        try:
            await pubsub.subscribe(channel)
            yield _sse(
                "connected",
                {
                    "workspace_id": workspace_id,
                    "timestamp": _timestamp(),
                },
            )

            while not await request.is_disconnected():
                message = await pubsub.get_message(
                    timeout=HEARTBEAT_SECONDS,
                )
                if message and message.get("type") == "message":
                    yield _sse("workspace.event", message.get("data", "{}"))
                else:
                    yield _sse("ping", {"timestamp": _timestamp()})

        except Exception:
            logger.exception("Workspace event stream failed for workspace %s", workspace_id)
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
            finally:
                await redis_client.aclose()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
