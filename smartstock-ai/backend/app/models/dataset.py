from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.db.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False, unique=True)
    file_type = Column(String, nullable=False) # csv, excel, parquet
    size_bytes = Column(Float, nullable=False)
    
    # Metadata extracted by Pandas
    num_rows = Column(Integer, nullable=True)
    num_columns = Column(Integer, nullable=True)
    
    status = Column(String, default="uploading") # uploading, ready, error
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", backref="datasets")
