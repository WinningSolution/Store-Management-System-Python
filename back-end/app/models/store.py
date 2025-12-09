from sqlalchemy import Column, String, DECIMAL, JSON

from app.database import Base


class Store(Base):
    __tablename__ = "STORE"

    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    store_nm = Column("STORE_NM", String(20))
    lat = Column("LAT", DECIMAL(10, 6))
    lng = Column("LNG", DECIMAL(10, 6))
    gu = Column("GU", String(50))
    dong = Column("DONG", String(50))
    store_geojson = Column("STORE_GEOJSON", JSON)












