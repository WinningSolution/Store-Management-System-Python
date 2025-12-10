import { get } from "../lib/api";

export interface SalesSummary {
  todaySales: number;
  weekSales: number;
  weekSalesYoY?: number | null;
  weekSalesWoW?: number | null;
}

export interface InventoryAlertItem {
  prodId: string;
  prodNm: string;
  storeId: string;
  stockStatus: string;
  totalQty: number;
}

export interface TodayAttendanceItem {
  empId: string;
  empNm: string;
  grade?: string | null;
  storeId: string;
  clockInTs?: string | null;
  clockOutTs?: string | null;
  status: string;
}

export interface VacationTodayItem {
  empId: string;
  empNm: string;
  vacationType: string;
  vacationDt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface MainDashboardResponse {
  salesSummary: SalesSummary;
  inventoryAlerts: InventoryAlertItem[];
  todayAttendance: TodayAttendanceItem[];
  vacationToday: VacationTodayItem[];
  notifications: NotificationItem[];
  todaySalesSeries: { timeLabel: string; sales: number }[];
  weekPeakSeries: { dayLabel: string; sales: number }[];
}

export interface ManagementKpi {
  totalSales: number;
  totalMargin?: number | null;
  totalCustomers?: number | null;
  avgBasketSize?: number | null;
  inventoryTurnover?: number | null;
}

export interface ManagementDashboardResponse {
  kpi: ManagementKpi;
  charts: Record<string, unknown>;
}

export function fetchMainDashboard(params?: {
  store_id?: string;
  date?: string;
}): Promise<MainDashboardResponse> {
  return get<MainDashboardResponse>("/dashboard/main", params);
}

export function fetchManagementDashboard(params: {
  store_id?: string;
  start_dt: string;
  end_dt: string;
}): Promise<ManagementDashboardResponse> {
  return get<ManagementDashboardResponse>("/dashboard/management", params);
}












