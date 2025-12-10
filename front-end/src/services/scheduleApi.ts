import { get, post } from "../lib/api";

export interface ScheduleCalendarItem {
  storeId: string;
  empId: string;
  empNm?: string;
  workDt: string;
  shiftStartPlan?: string | null;
  shiftEndPlan?: string | null;
  clockInTs?: string | null;
  clockOutTs?: string | null;
  lateFlag?: string | null;
  earlyFlag?: string | null;
}

export interface ScheduleCalendarResponse {
  items: ScheduleCalendarItem[];
}

export interface DemandHeatmapItem {
  dayname: string;
  hour: number;
  salesAmt: number;
  trafficCnt: number;
  requiredStaff: number;
}

export interface DemandPeakItem {
  date: string;
  hour: number;
  salesAmt: number;
  requiredStaff: number;
}

export interface DemandForecastResponse {
  heatmap: DemandHeatmapItem[];
  summaryPeaks: DemandPeakItem[];
  expectedSalesToday: number;
  expectedVisitorsToday: number;
  peakHour: number | null;
  peakRequiredStaff: number | null;
  weeklySummary: {
    date: string;
    dayname: string;
    predictedSales: number;
    actualSales: number;
  }[];
  weeklyAccuracy?: number | null;
}

export interface AutoSchedulingRequest {
  storeId: string;
  weekStartDt: string;
  strategy?: "full" | "partial";
}

export interface AutoSchedulingResult {
  status: string;
  conflicts: Record<string, unknown>[];
}

export interface ScheduleResultItem {
  weekStartDt: string;
  dayname: string;
  workType: string;
  requiredCnt: number;
  assignedEmpList: Record<string, unknown>[];
}

export interface ScheduleResultResponse {
  items: ScheduleResultItem[];
}

export interface VacationItem {
  storeId: string;
  empId: string;
  empNm: string;
  startDate: string;
  endDate: string;
  vacationType: string;
  status: string;
  appliedDate: string;
  approvedDate?: string | null;
  days: number;
}

export interface VacationListResponse {
  items: VacationItem[];
}

export interface ScheduleIngredientItem {
  empId: string;
  dayname: string; // Mon..Sun
  workType: string; // 오전/오후
  status: number; // 1 가능, 0 불가
}

export interface ScheduleIngredientListResponse {
  items: ScheduleIngredientItem[];
}

export function fetchScheduleCalendar(params: {
  store_id: string;
  start_date: string;
  end_date: string;
  emp_id?: string;
}): Promise<ScheduleCalendarResponse> {
  return get<ScheduleCalendarResponse>("/schedules", params);
}

export function fetchDemandForecast(params: {
  store_id: string;
  target_dt: string;
  history_days?: number;
}): Promise<DemandForecastResponse> {
  return get<DemandForecastResponse>("/scheduling/demand", params);
}

export function runAutoScheduling(
  body: AutoSchedulingRequest
): Promise<AutoSchedulingResult> {
  return post<AutoSchedulingResult>("/scheduling/auto-generate", body);
}

export function applySchedule(
  body: { storeId: string; weekStartDt: string }
): Promise<AutoSchedulingResult> {
  return post<AutoSchedulingResult>("/scheduling/apply", body);
}

export function fetchScheduleResult(params: {
  store_id: string;
  week_start_dt: string;
}): Promise<ScheduleResultResponse> {
  return get<ScheduleResultResponse>("/scheduling/result", params);
}

export function fetchVacations(params: {
  store_id?: string;
  emp_id?: string;
  start_dt?: string;
  end_dt?: string;
  status?: string;
  vacation_type?: string;
}): Promise<VacationListResponse> {
  return get<VacationListResponse>("/vacations", params);
}

export function fetchScheduleIngredients(params: {
  emp_id: string;
}): Promise<ScheduleIngredientListResponse> {
  return get<ScheduleIngredientListResponse>("/scheduling/ingredients", params);
}

export function saveScheduleIngredients(body: {
  empId: string;
  items: ScheduleIngredientItem[];
}): Promise<{ message: string }> {
  return post<{ message: string }>("/scheduling/ingredients", body);
}



