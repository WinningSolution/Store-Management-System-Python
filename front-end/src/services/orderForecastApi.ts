import { get } from "../lib/api";

export interface OrderForecastSummary {
  baseDate: string;
  storeId?: string | null;
  urgentCount: number;
  totalRecommendQty: number;
  coveragePct: number;
}

export interface OrderForecastSummaryResponse {
  summary: OrderForecastSummary;
}

export interface OrderForecastItem {
  storeId: string;
  prodId: string;
  prodNm?: string | null;
  baseDate: string;
  pred7dQty: number;
  currStock: number;
  recommendQty: number;
  priority: string;
  explainText?: string | null;
}

export interface OrderForecastItemsResponse {
  items: OrderForecastItem[];
  total: number;
}

export function fetchOrderForecastSummary(params?: {
  store_id?: string;
}): Promise<OrderForecastSummaryResponse> {
  return get<OrderForecastSummaryResponse>("/order-forecast/summary", params);
}

export function fetchOrderForecastItems(params?: {
  store_id?: string;
  priority?: string;
  page?: number;
  page_size?: number;
}): Promise<OrderForecastItemsResponse> {
  return get<OrderForecastItemsResponse>("/order-forecast/items", params);
}



