from sqlalchemy import Column, String, Integer, Date, Float

from app.database import Base


class OrderForecastResult(Base):
  __tablename__ = "MART_ORDER_FORECAST_RESULT"

  store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
  prod_id = Column("PROD_ID", String(30), primary_key=True, nullable=False)
  base_date = Column("BASE_DATE", Date, primary_key=True, nullable=False)

  pred_7d_qty = Column("PRED_7D_QTY", Float, nullable=False)
  curr_stock = Column("CURR_STOCK", Integer, nullable=False)
  recommend_qty = Column("RECOMMEND_QTY", Integer, nullable=False)
  priority = Column("PRIORITY", String(10), nullable=False)
  explain_text = Column("EXPLAIN_TEXT", String(255))



