import { get, post, put } from "../lib/api";

export interface EmployeeListItem {
  storeId: string;
  storeNm?: string;
  empId: string;
  empNm: string;
  grade?: string;
  workStatus: string;
  schStatus: string;
  hireDt: string;
}

export interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function fetchEmployees(params?: {
  store_id?: string;
  work_status?: string;
  grade?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}): Promise<EmployeeListResponse> {
  return get<EmployeeListResponse>("/employees", params);
}

export interface EmployeeBasic {
  storeId: string;
  empId: string;
  empNm: string;
  grade?: string;
  workStatus: string;
  schStatus: string;
  hireDt: string;
}

export interface AttendanceSummary {
  month: string;
  workDays: number;
  lateCount: number;
  earlyLeaveCount: number;
}

export interface AttendanceLogItem {
  workDt: string;
  shiftStartPlan?: string | null;
  shiftEndPlan?: string | null;
  clockInTs?: string | null;
  clockOutTs?: string | null;
  lateFlag?: string | null;
  earlyFlag?: string | null;
}

export interface VacationItem {
  vacationDt: string;
  vacationType: string;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  canceledAt?: string | null;
  remainDays?: number | null;
}

export interface ScheduleIngredientItem {
  dayname: string;
  workType: string;
  status: number;
}

export interface ScheduleResultSummaryItem {
  weekStartDt: string;
  dayname: string;
  workType: string;
  assigned: boolean;
}

export interface EmployeeDetailResponse {
  basic: EmployeeBasic;
  attendanceSummary: AttendanceSummary;
  recentAttendanceLogs: AttendanceLogItem[];
  vacations: VacationItem[];
  scheduleIngredient: ScheduleIngredientItem[];
  scheduleResultSummary: ScheduleResultSummaryItem[];
}

export function createEmployee(payload: {
  storeId: string;
  empId: string;
  empNm: string;
  grade?: string;
  hireDt: string;
  phone?: string;
  schStatus?: string;
}): Promise<{ message: string }> {
  return post<{ message: string }>("/employees", payload);
}

export function updateEmployee(
  empId: string,
  storeId: string,
  payload: {
    empNm?: string;
    phone?: string;
    grade?: string;
    schStatus?: string;
  }
): Promise<{ message: string }> {
  return put<{ message: string }>(
    `/employees/${empId}?store_id=${encodeURIComponent(storeId)}`,
    payload
  );
}

export function terminateEmployee(
  empId: string,
  payload: { storeId: string; terminateDt: string }
): Promise<{ message: string }> {
  return post<{ message: string }>(`/employees/${empId}/terminate`, payload);
}

export function fetchEmployeeDetail(params: {
  emp_id: string;
  store_id: string;
  month?: string;
}): Promise<EmployeeDetailResponse> {
  const { emp_id, ...rest } = params;
  return get<EmployeeDetailResponse>(`/employees/${encodeURIComponent(emp_id)}`, rest);
}











