from sqlalchemy import Column, String, Date, DateTime, Time, DECIMAL, Enum, Integer

from app.database import Base


class Employee(Base):
    __tablename__ = "EMP"

    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    emp_id = Column("EMP_ID", String(20), primary_key=True, nullable=False)
    hire_dt = Column("HIRE_DT", Date, primary_key=True, nullable=False)

    emp_nm = Column("EMP_NM", String(100), nullable=False)
    work_status = Column("WORK_STATUS", String(10), nullable=False, default="재직")
    sch_status = Column("SCH_STATUS", String(10), nullable=False, default="무관")
    grade = Column("GRADE", String(50))


class Attend(Base):
    __tablename__ = "ATTEND"

    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    emp_id = Column("EMP_ID", String(20), primary_key=True, nullable=False)
    work_dt = Column("WORK_DT", Date, primary_key=True, nullable=False)

    shift_start_plan = Column("SHIFT_START_PLAN", Time)
    clock_in_ts = Column("CLOCK_IN_TS", DateTime)
    shift_end_plan = Column("SHIFT_END_PLAN", Time)
    clock_out_ts = Column("CLOCK_OUT_TS", DateTime)
    late_flag = Column("LATE_FLAG", String(1))
    early_flag = Column("EARLY_FLAG", String(1))


class AttendLog(Base):
    __tablename__ = "ATTEND_LOG"

    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    emp_id = Column("EMP_ID", String(20), primary_key=True, nullable=False)
    work_dt = Column("WORK_DT", Date, primary_key=True, nullable=False)
    work_type = Column("WORK_TYPE", String(10), primary_key=True, nullable=False)


class Vacation(Base):
    __tablename__ = "VACATION"

    requested_at = Column("REQUESTED_AT", DateTime, primary_key=True, nullable=False)
    store_id = Column("STORE_ID", String(20), primary_key=True, nullable=False)
    emp_id = Column("EMP_ID", String(20), primary_key=True, nullable=False)
    vacation_dt = Column("VACATION_DT", Date, primary_key=True, nullable=False)
    vacation_type = Column("VACATION_TYPE", String(20), primary_key=True, nullable=False)

    status = Column("STATUS", String(20), nullable=False)
    canceled_at = Column("CANCELED_AT", DateTime)
    remain_days = Column("REMAIN_DAYS", DECIMAL(4, 1))
    approved_at = Column("APPROVED_AT", DateTime)


class ScheduleIngredient(Base):
    __tablename__ = "SCHEDULE_INGREDIENT"

    emp_id = Column("EMP_ID", String(20), primary_key=True, nullable=False)
    dayname = Column("DAYNAME", Enum("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"), primary_key=True, nullable=False)
    work_type = Column("WORK_TYPE", Enum("오전", "오후"), primary_key=True, nullable=False)
    status = Column("STATUS", Integer, nullable=False)


class ScheduleResult(Base):
    __tablename__ = "SCHEDULE_RESULT"

    week_start_dt = Column("WEEK_START_DT", Date, primary_key=True, nullable=False)
    dayname = Column("DAYNAME", Enum("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"), primary_key=True, nullable=False)
    work_type = Column("WORK_TYPE", Enum("오전", "오후"), primary_key=True, nullable=False)
    required_cnt = Column("REQUIRED_CNT", Integer, nullable=False)


