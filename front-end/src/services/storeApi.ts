import { get } from "../lib/api";

export interface StoreListItem {
  storeId: string;
  storeNm?: string | null;
  gu?: string | null;
  dong?: string | null;
  managerNm?: string | null;
  address?: string | null;
   lat?: number | null;
   lng?: number | null;
   storeGeojson?: any;
}

export interface StoreListResponse {
  items: StoreListItem[];
}

export function fetchStores(): Promise<StoreListResponse> {
  return get<StoreListResponse>("/stores");
}