from sqlalchemy import Column, String, Integer, Date, DateTime, DECIMAL, Index

from app.database import Base


class InventoryStatus(Base):
    __tablename__ = "INVENTORY_STATUS"

    snapshot_yyyymm = Column("SNAPSHOT_YYYYMM", Integer, primary_key=True, nullable=False)
    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    prod_id = Column("PROD_ID", String(20), primary_key=True, nullable=False)
    snapshot_dt = Column("SNAPSHOT_DT", Date, primary_key=True, nullable=False)

    prod_nm = Column("PROD_NM", String(100), nullable=False)
    season = Column("SEASON", String(20), nullable=False)
    fl_qty = Column("FL_QTY", Integer, nullable=False, default=0)
    br_qty = Column("BR_QTY", Integer, nullable=False, default=0)
    # TOTAL_QTY 는 GENERATED 컬럼이므로 SQLAlchemy에는 별도 컬럼 없이 조회만 사용


class InventoryHistory(Base):
    __tablename__ = "INVENTORY_HISTORY"

    move_yyyymm = Column("MOVE_YYYYMM", Integer, primary_key=True, nullable=False)
    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    prod_id = Column("PROD_ID", String(20), primary_key=True, nullable=False)
    move_dt = Column("MOVE_DT", DateTime, primary_key=True, nullable=False)

    prod_nm = Column("PROD_NM", String(100), nullable=False)
    season = Column("SEASON", String(20))
    qty = Column("QTY", Integer, nullable=False, default=0)
    location = Column("LOCATION", String(20))
    move_type = Column("MOVE_TYPE", String(20))

    __table_args__ = (
        Index("IDX_STORE", "STORE_ID"),
        Index("IDX_PROD", "PROD_ID"),
        Index("IDX_DT", "MOVE_DT"),
    )



