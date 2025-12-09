import { get } from "../lib/api";

// ---------------------------
// 고객 목록 (점포별 고객 리스트)
// ---------------------------

export interface CustomerListItem {
  customerId: string;
  gender?: string | null;
  ageGroup?: string | null;
  region?: string | null;
  signupDt: string;
  signupChannel?: string | null;
  lastPurchaseDt?: string | null;
  totalAmount: number;
  purchaseCount: number;
   segment?: string | null;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerSegmentOptionsResponse {
  items: string[];
}

export interface CustomerDetailRfm {
  recency: number;
  frequency: number;
  monetary: number;
}

export interface CustomerDetailPurchaseItem {
  saleDt: string;
  saleId: string;
  amount: number;
  products?: string | null;
}

export interface CustomerDetailResponse {
  customerId: string;
  gender?: string | null;
  ageGroup?: string | null;
  region?: string | null;
  signupDt: string;
  signupChannel?: string | null;
  segment?: string | null;
  totalAmount: number;
  purchaseCount: number;
  lastPurchaseDt?: string | null;
  rfm: CustomerDetailRfm;
  recentPurchases: CustomerDetailPurchaseItem[];
}

export function fetchCustomers(params?: {
  store_id?: string;
  gender?: string;
  age_group?: string;
  region?: string;
  segment?: string;
  start_signup_dt?: string;
  end_signup_dt?: string;
  start_last_purchase_dt?: string;
  end_last_purchase_dt?: string;
  signup_channel?: string;
  min_total_amount?: number;
  max_total_amount?: number;
  min_purchase_count?: number;
  max_purchase_count?: number;
  sort?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}): Promise<CustomerListResponse> {
  return get<CustomerListResponse>("/customers", params);
}

export function fetchCustomerDetail(
  customerId: string,
): Promise<CustomerDetailResponse> {
  return get<CustomerDetailResponse>(`/customers/${customerId}`);
}

export function fetchCustomerSegmentOptions(): Promise<CustomerSegmentOptionsResponse> {
  return get<CustomerSegmentOptionsResponse>("/customer/segments/options");
}

// ---------------------------
// 권역·세그먼트 분석용 API
// ---------------------------

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

export interface CustomerSegmentMasterItem {
  segmentId: string;
  segmentName: string;
  segmentType: string;
  description?: string | null;
  customerCount: number;
  isActive: boolean;
}

export interface CustomerSegmentMasterResponse {
  items: CustomerSegmentMasterItem[];
}

export interface CustomerSegmentLogItem {
  customerId: string;
  customerName?: string | null;
  fromSegment?: string | null;
  toSegment: string;
  changedDate: string;
  reason?: string | null;
}

export interface CustomerSegmentLogResponse {
  items: CustomerSegmentLogItem[];
}

export interface RetentionTrendItem {
  month: string;
  segment: string;
  retentionRate: number;
}

export interface RetentionTrendResponse {
  items: RetentionTrendItem[];
}

export interface CohortRetentionItem {
  startMonth: string;
  period: number;
  retention: number;
}

export interface CohortRetentionResponse {
  items: CohortRetentionItem[];
}

export function fetchRegionSegmentMetrics(params?: {
  region?: string;
  segment?: string;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentMetricsResponse> {
  return get<RegionSegmentMetricsResponse>(
    "/customer/segments/region-metrics",
    params,
  );
}

export function fetchRegionSegmentTrend(params?: {
  region?: string;
  segment?: string;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTrendResponse> {
  return get<RegionSegmentTrendResponse>(
    "/customer/segments/region-trend",
    params,
  );
}

export function fetchRegionSegmentTopCategories(params?: {
  region?: string;
  segment?: string;
  top_n?: number;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTopCategoriesResponse> {
  return get<RegionSegmentTopCategoriesResponse>(
    "/customer/segments/top-categories",
    params,
  );
}

export function fetchRegionSegmentTopProducts(params?: {
  region?: string;
  segment?: string;
  top_n?: number;
  start_month?: number;
  end_month?: number;
}): Promise<RegionSegmentTopProductsResponse> {
  return get<RegionSegmentTopProductsResponse>(
    "/customer/segments/top-products",
    params,
  );
}

export function fetchCustomerSegmentsMaster(): Promise<CustomerSegmentMasterResponse> {
  return get<CustomerSegmentMasterResponse>("/customer/segments/master");
}

export function fetchCustomerSegmentLog(params?: {
  segmentId?: string;
  customerId?: string;
}): Promise<CustomerSegmentLogResponse> {
  const mapped: Record<string, string> = {};
  if (params?.segmentId) mapped["segment_id"] = params.segmentId;
  if (params?.customerId) mapped["customer_id"] = params.customerId;
  return get<CustomerSegmentLogResponse>("/customer/segments/log", mapped);
}

export function fetchCustomerRetentionTrend(params?: {
  segment?: string;
  start_month?: number;
  end_month?: number;
  store_id?: string;
}): Promise<RetentionTrendResponse> {
  return get<RetentionTrendResponse>("/customer/retention/trend", params);
}

export function fetchCustomerCohortRetention(params?: {
  start_month?: number;
  end_month?: number;
  store_id?: string;
}): Promise<CohortRetentionResponse> {
  return get<CohortRetentionResponse>("/customer/retention/cohort", params);
}
