from sqlalchemy import Column, String, DECIMAL, Date

from app.database import Base


class Product(Base):
    __tablename__ = "PRODUCT"

    prod_id = Column("PROD_ID", String(20), primary_key=True, nullable=False)
    season = Column("SEASON", String(20))
    prod_nm = Column("PROD_NM", String(100))
    prod_line = Column("PROD_LINE", String(20))
    category = Column("CATEGORY", String(50))
    color = Column("COLOR", String(20))
    size = Column("SIZE", String(10))
    origin_price = Column("ORIGIN_PRICE", DECIMAL(10, 0))
    reg_dt = Column("REG_DT", Date)
    out_dt = Column("OUT_DT", Date)
    sale_state = Column("SALE_STATE", String(20))












