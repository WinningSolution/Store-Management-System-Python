import { get } from "../lib/api";

export interface InventoryItem {
  sku: string;
  prodNm: string;
  prodLine?: string | null;
  color?: string | null;
  size?: string | null;
  price: number;
  location: string;
  stock: number;
  status: string; // 정상 / 임박 / 긴급 / 품절
  recommended: number;
  last7: number;
  last90: number;
  aiSuggested: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
}

export function fetchInventoryList(params?: {
  store_id?: string;
}): Promise<InventoryListResponse> {
  return get<InventoryListResponse>("/inventory", params);
}

// 상세 화면용 타입
export interface InventoryStockHistoryPoint {
  date: string;
  stock: number;
}

export interface InventoryChangeLogItem {
  date: string;
  moveType: string;
  qty: number;
  beforeQty: number;
  afterQty: number;
  location?: string | null;
}

export interface InventoryDetailItem {
  sku: string;
  prodNm: string;
  category?: string | null;
  color?: string | null;
  size?: string | null;
  price: number;
  location: string;
  stock: number;
  status: string;
  recommended: number;
  avgSalesPerDay: number;
  daysUntilOut?: number | null;
  aiSuggested?: number | null;
  aiExplain?: string | null;
}

export interface InventoryFlowSummary {
  prevCarry: number;
  hqInbound: number;
  customerReturn: number;
  sold: number;
  current: number;
}

export interface InventoryDetailResponse {
  item: InventoryDetailItem;
  stockHistory: InventoryStockHistoryPoint[];
  changeLog: InventoryChangeLogItem[];
  flowReferenceDate: string;
  flow: InventoryFlowSummary;
}

// Dead Stock 모니터링용 타입
export interface DeadStockSummary {
  totalAmount: number;
  totalRatio: number;
  skuCount: number;
  avgDaysWithoutSale: number;
  prevTotalAmount: number;
  prevTotalRatio: number;
  prevSkuCount: number;
  prevAvgDaysWithoutSale: number;
}

export interface DeadStockStoreItem {
  storeId: string;
  storeNm?: string | null;
  amount: number;
}

export interface DeadStockCategoryItem {
  category?: string | null;
  amount: number;
  ratio: number;
}

export interface DeadStockTrendPoint {
  month: string;
  ratio: number;
  amount: number;
}

export interface DeadStockListItem {
  prodId: string;
  prodNm: string;
  storeId: string;
  storeNm?: string | null;
  stock: number;
  daysWithoutSale: number;
  lastSaleDate?: string | null;
  amount: number;
  category?: string | null;
}

export interface DeadStockMonitorResponse {
  summary: DeadStockSummary;
  stores: DeadStockStoreItem[];
  categories: DeadStockCategoryItem[];
  trend: DeadStockTrendPoint[];
  items: DeadStockListItem[];
}

export interface DeadStockItemsResponse {
  items: DeadStockListItem[];
  total: number;
}

export function fetchInventoryDetail(params: {
  store_id: string;
  prod_id: string;
}): Promise<InventoryDetailResponse> {
  return get<InventoryDetailResponse>("/inventory/detail", params);
}

export function fetchDeadStockMonitor(params?: {
  store_id?: string;
}): Promise<DeadStockMonitorResponse> {
  return get<DeadStockMonitorResponse>("/inventory/dead-stock", params);
}

export function fetchDeadStockItems(params: {
  store_id?: string;
  page?: number;
  page_size?: number;
}): Promise<DeadStockItemsResponse> {
  return get<DeadStockItemsResponse>("/inventory/dead-stock/items", params);
}



