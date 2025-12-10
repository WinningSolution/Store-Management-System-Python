from sqlalchemy import Column, String, DECIMAL, DateTime, Integer, BigInteger, Index

from app.database import Base


class Sales(Base):
    __tablename__ = "SALES"

    sale_yyyymm = Column("SALE_YYYYMM", Integer, primary_key=True, nullable=False)
    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    sale_dt = Column("SALE_DT", DateTime, primary_key=True, nullable=False)
    prod_id = Column("PROD_ID", String(20), primary_key=True, nullable=False)

    sale_id = Column("SALE_ID", String(50), nullable=False)
    prod_nm = Column("PROD_NM", String(100))
    unit_price = Column("UNIT_PRICE", DECIMAL(10, 0), nullable=False)
    qty = Column("QTY", Integer, nullable=False, default=1)
    # TOTAL_AMT 는 GENERATED 컬럼
    pay_type = Column("PAY_TYPE", String(20))
    card_no = Column("CARD_NO", String(50))
    order_id = Column("ORDER_ID", String(50))
    sale_status = Column("SALE_STATUS", String(20), nullable=False, default="정상")
    event_id = Column("EVENT_ID", BigInteger)
    customer_id = Column("CUSTOMER_ID", String(20))
    channel = Column("CHANNEL", String(20))
    acq_source = Column("ACQ_SOURCE", String(50))
    referrer_id = Column("REFERRER_ID", String(20))
    created_at = Column("CREATED_AT", DateTime)

    __table_args__ = (
        Index("IDX_SALES_SALE", "SALE_ID"),
        Index("IDX_SALES_DATE", "SALE_DT"),
        Index("IDX_SALES_PROD", "PROD_ID", "SALE_DT"),
        Index("IDX_SALES_STORE_DATE", "STORE_ID", "SALE_DT"),
        Index("IDX_SALES_ORDER", "ORDER_ID"),
        Index("IDX_SALES_CARD", "CARD_NO"),
        Index("IDX_SALES_CUSTOMER", "CUSTOMER_ID"),
        Index("IDX_SALES_REFERRER", "REFERRER_ID"),
        Index("IDX_SALES_CHANNEL", "CHANNEL"),
    )


class Discount(Base):
    __tablename__ = "DISCOUNT"

    event_id = Column("EVENT_ID", BigInteger, primary_key=True, nullable=False)
    event_type = Column("EVENT_TYPE", String(20), nullable=False)
    event_nm = Column("EVENT_NM", String(100), nullable=False)
    prod_id = Column("PROD_ID", String(20), nullable=False)
    str_dt = Column("STR_DT", DateTime, nullable=False)
    end_dt = Column("END_DT", DateTime, nullable=False)
    dis_price = Column("DIS_PRICE", DECIMAL(10, 0), nullable=False)
    reg_dt = Column("REG_DT", DateTime, nullable=False)


