from sqlalchemy import Column, String, Date

from app.database import Base


class Customer(Base):
    __tablename__ = "CUSTOMER"

    customer_id = Column("CUSTOMER_ID", String(20), primary_key=True, nullable=False)
    gender = Column("GENDER", String(10))
    age_group = Column("AGE_GROUP", String(20))
    region = Column("REGION", String(50))
    signup_dt = Column("SIGNUP_DT", Date, nullable=False)
    signup_channel = Column("SIGNUP_CHANNEL", String(20))
    acq_source = Column("ACQ_SOURCE", String(50))
    referrer_id = Column("REFERRER_ID", String(20))


class CustomerSegment(Base):
    __tablename__ = "CUSTOMER_SEGMENT"

    segment_id = Column("SEGMENT_ID", String(20), primary_key=True, nullable=False)
    segment_nm = Column("SEGMENT_NM", String(100), nullable=False)
    segment_type = Column("SEGMENT_TYPE", String(20), nullable=False)
    description = Column("DESCRIPTION", String(255))
    active_flag = Column("ACTIVE_FLAG", String(1), nullable=False, default="Y")


class CustomerSegmentLog(Base):
    __tablename__ = "CUSTOMER_SEGMENT_LOG"

    customer_id = Column("CUSTOMER_ID", String(20), primary_key=True, nullable=False)
    segment_id = Column("SEGMENT_ID", String(20), primary_key=True, nullable=False)
    start_dt = Column("START_DT", Date, primary_key=True, nullable=False)
    end_dt = Column("END_DT", Date)
    source = Column("SOURCE", String(20))












