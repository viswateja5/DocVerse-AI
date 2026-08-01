from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.core.logging import logger

class AuditService:
    @staticmethod
    async def log_action(db: AsyncSession, user_id: str, action: str, endpoint: str) -> None:
        """
        Logs critical user actions into the database audit trail.
        """
        try:
            log = AuditLog(user_id=user_id, action=action, endpoint=endpoint)
            db.add(log)
            await db.commit()
            logger.info("audit_log_created", user_id=user_id, action=action, endpoint=endpoint)
        except Exception as e:
            logger.error("audit_log_failed", error=str(e))
            # Non-blocking: we don't raise here to prevent interrupting the main flow
