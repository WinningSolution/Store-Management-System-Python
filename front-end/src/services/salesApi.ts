import { get } from "../lib/api";

export interface SalesListItem {
  saleId: string;
  saleDt: string;
  storeId: string;
  storeNm?: string | null;
  prodId: string;
  prodNm?: string | null;
  prodLine?: string | null;
  category?: string | null;
  qty: number;
  unitPrice: number;
  amount: number;
  payType?: string | null;
  channel?: string | null;
}

export interface SalesListResponse {
  items: SalesListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DailySalesItem {
  date: string;
  totalAmount: number;
}

export interface LineSalesItem {
  line?: string | null;
  totalAmount: number;
}

export interface PaymentSalesItem {
  payType?: string | null;
  totalAmount: number;
}

export interface SalesSummaryResponse {
  daily: DailySalesItem[];
  byLine: LineSalesItem[];
  byPayment: PaymentSalesItem[];
}

export interface SalesDetailItem {
  prodId: string;
  prodNm?: string | null;
  qty: number;
  unitPrice: number;
  amount: number;
  prodLine?: string | null;
  category?: string | null;
}

export interface SalesDetailHeader {
  saleId: string;
  saleDt: string;
  storeId: string;
  storeNm?: string | null;
  customerId?: string | null;
  payType?: string | null;
  channel?: string | null;
  totalAmount: number;
  totalQty: number;
}

export interface SalesDetailResponse {
  header: SalesDetailHeader;
  items: SalesDetailItem[];
}

export interface TrendComparePoint {
  label: string;
  base: number;
  compare: number;
}

export interface PeriodSummaryItem {
  label: string;
  sales: number;
  orders: number;
  aov: number;
}

export interface LineCompareItem {
  line?: string | null;
  baseAmount: number;
  compareAmount: number;
}

export interface SalesTrendCompareResponse {
  basePeriodLabel: string;
  comparePeriodLabel: string;
  trend: TrendComparePoint[];
  summary: PeriodSummaryItem[];
  lineCompare: LineCompareItem[];
}

export interface CategoryCompareItem {
  category?: string | null;
  baseAmount: number;
  compareAmount: number;
}

export interface SalesCategoryCompareResponse {
  basePeriodLabel: string;
  comparePeriodLabel: string;
  categories: CategoryCompareItem[];
}

export interface StoreRankingItem {
  storeId: string;
  storeNm?: string | null;
  sales: number;
}

export interface StoreRankingResponse {
  items: StoreRankingItem[];
  totalSalesAll: number;
}

export interface StoreCategoryHeatmapItem {
  storeId: string;
  storeNm?: string | null;
  category?: string | null;
  sales: number;
}

export interface StoreCategoryHeatmapResponse {
  items: StoreCategoryHeatmapItem[];
}

export interface StoreTopProductMonthlyItem {
  month: string;
  amount: number;
}

export interface StoreTopProductItem {
  rank: number;
  prodId: string;
  prodNm?: string | null;
  sales: number;
  qty: number;
  share: number;
  stock: number;
  monthly: StoreTopProductMonthlyItem[];
}

export interface StoreTopProductsResponse {
  items: StoreTopProductItem[];
}

export interface CategoryTopProductItem {
  rank: number;
  prodId: string;
  prodNm?: string | null;
  category?: string | null;
  sales: number;
  qty: number;
  share: number;
}

export interface CategoryTopProductsResponse {
  items: CategoryTopProductItem[];
}

export interface CategoryTrendItem {
  month: number; // 1~12
  category?: string | null;
  sales: number;
}

export interface CategoryTrendResponse {
  items: CategoryTrendItem[];
}

export interface LineTrendItem {
  month: number; // 1~12
  line?: string | null;
  sales: number;
}

export interface LineTrendResponse {
  items: LineTrendItem[];
}

export interface LineTopProductItem {
  rank: number;
  prodId: string;
  prodNm?: string | null;
  line?: string | null;
  sales: number;
  qty: number;
  share: number;
}

export interface LineTopProductsResponse {
  items: LineTopProductItem[];
}

export interface DiscountEventItem {
  eventId: number;
  eventNm: string;
  eventType?: string | null;
  startDt: string;
  endDt: string;
}

export interface DiscountEventsResponse {
  items: DiscountEventItem[];
}

export interface DiscountSummary {
  totalSales: number;
  totalOrders: number;
  eventSales: number;
  eventOrders: number;
  eventSalesShare: number;
}

export function fetchSalesList(params?: {
  store_id?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  pay_type?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}): Promise<SalesListResponse> {
  return get<SalesListResponse>("/sales", params);
}

export function fetchSalesSummary(params?: {
  store_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<SalesSummaryResponse> {
  return get<SalesSummaryResponse>("/sales/summary", params);
}

export function fetchSalesDetail(saleId: string): Promise<SalesDetailResponse> {
  return get<SalesDetailResponse>(`/sales/${encodeURIComponent(saleId)}`);
}

export function fetchSalesTrendCompare(params?: {
  base_month?: string;
  compare_mode?: "prev_year" | "prev_month";
  store_id?: string;
}): Promise<SalesTrendCompareResponse> {
  return get<SalesTrendCompareResponse>("/sales/trend-compare", params);
}

export function fetchSalesCategoryCompare(params?: {
  base_month?: string;
  compare_mode?: "prev_year" | "prev_month";
  store_id?: string;
}): Promise<SalesCategoryCompareResponse> {
  return get<SalesCategoryCompareResponse>("/sales/category-compare", params);
}

export function fetchStoreRanking(params?: {
  period?: "recent" | "past";
  top_n?: number;
  base_month?: string;
}): Promise<StoreRankingResponse> {
  return get<StoreRankingResponse>("/sales/store-ranking", params);
}

export function fetchStoreCategoryHeatmap(params?: {
  period?: "recent" | "past";
  store_id?: string[];
  base_month?: string;
}): Promise<StoreCategoryHeatmapResponse> {
  return get<StoreCategoryHeatmapResponse>("/sales/store-category-heatmap", params);
}

export function fetchStoreTopProducts(params: {
  store_id: string;
  period?: "recent" | "past";
  top_n?: number;
  base_month?: string;
}): Promise<StoreTopProductsResponse> {
  return get<StoreTopProductsResponse>("/sales/store-top-products", params);
}

export function fetchCategoryTopProducts(params?: {
  period?: "recent" | "past";
  top_n?: number;
  base_month?: string;
  store_id?: string;
}): Promise<CategoryTopProductsResponse> {
  return get<CategoryTopProductsResponse>("/sales/category-top-products", params);
}

export function fetchCategoryTrend(params?: {
  period?: "recent" | "past";
  base_month?: string;
  store_id?: string;
}): Promise<CategoryTrendResponse> {
  return get<CategoryTrendResponse>("/sales/category-trend", params);
}

export function fetchLineTrend(params?: {
  period?: "recent" | "past";
  base_month?: string;
  store_id?: string;
}): Promise<LineTrendResponse> {
  return get<LineTrendResponse>("/sales/line-trend", params);
}

export function fetchLineTopProducts(params?: {
  period?: "recent" | "past";
  top_n?: number;
  base_month?: string;
  store_id?: string;
}): Promise<LineTopProductsResponse> {
  return get<LineTopProductsResponse>("/sales/line-top-products", params);
}

export function fetchDiscountEvents(params?: {
  base_month?: string;
  active_only?: boolean;
}): Promise<DiscountEventsResponse> {
  return get<DiscountEventsResponse>("/sales/discount-events", params);
}

export function fetchDiscountSummary(params?: {
  base_month?: string;
  store_id?: string;
  event_id?: number;
}): Promise<DiscountSummary> {
  return get<DiscountSummary>("/sales/discount-summary", params);
}

export interface DiscountTopProductItem {
  rank: number;
  prodId: string;
  prodNm?: string | null;
  category?: string | null;
  line?: string | null;
  sales: number;
  qty: number;
  share: number;
}

export interface DiscountTopProductsResponse {
  items: DiscountTopProductItem[];
}

export function fetchDiscountTopProducts(params?: {
  base_month?: string;
  store_id?: string;
  event_id?: number;
  top_n?: number;
}): Promise<DiscountTopProductsResponse> {
  return get<DiscountTopProductsResponse>("/sales/discount-top-products", params);
}
