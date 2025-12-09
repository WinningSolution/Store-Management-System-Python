import { get } from "../lib/api";

export interface RegionSegmentMetricsItem {
  region: string;
  segment: string;
  customerCount: number;
  purchaseCount: number;
  totalAmount: number;
  totalQty: number;
  avgAmountPerTxn: number;
  avgAmountPerCustomer: number;
  avgPurchaseCount: number;
  avgQtyPerCustomer: number;
}

export interface RegionSegmentMetricsResponse {
  items: RegionSegmentMetricsItem[];
}

export interface RegionSegmentTrendItem {
  month: string; // YYYY-MM
  region: string;
  segment: string;
  sales: number;
  orders: number;
  customers: number;
  qty: number;
}

export interface RegionSegmentTrendResponse {
  items: RegionSegmentTrendItem[];
}

export interface RegionSegmentTopCategoryItem {
  region: string;
  segment: string;
  rank: number;
  category: string;
  sales: number;
  share: number;
}

export interface RegionSegmentTopCategoriesResponse {
  items: RegionSegmentTopCategoryItem[];
}

export interface RegionSegmentTopProductItem {
  region: string;
  segment: string;
  rank: number;
  prodId: string;
  prodNm?: string | null;
  category?: string | null;
  sales: number;
  qty: number;
}

export interface RegionSegmentTopProductsResponse {
  items: RegionSegmentTopProductItem[];
}

export function fetchRegionSegmentMetrics(params?: {
  region?: string;
  segment?: string;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentMetricsResponse> {
  return get<RegionSegmentMetricsResponse>("/customer/segments/region-metrics", params);
}

export function fetchRegionSegmentTrend(params?: {
  region?: string;
  segment?: string;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTrendResponse> {
  return get<RegionSegmentTrendResponse>("/customer/segments/region-trend", params);
}

export function fetchRegionSegmentTopCategories(params?: {
  region?: string;
  segment?: string;
  top_n?: number;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTopCategoriesResponse> {
  return get<RegionSegmentTopCategoriesResponse>("/customer/segments/top-categories", params);
}

export function fetchRegionSegmentTopProducts(params?: {
  region?: string;
  segment?: string;
  top_n?: number;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTopProductsResponse> {
  return get<RegionSegmentTopProductsResponse>("/customer/segments/top-products", params);
}



