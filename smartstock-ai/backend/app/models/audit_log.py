from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    details = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
