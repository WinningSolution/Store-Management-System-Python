import { get } from "../lib/api";

export interface StoreListItem {
  storeId: string;
  storeNm?: string | null;
}

export interface StoreListResponse {
  items: StoreListItem[];
}

export function fetchStores(): Promise<StoreListResponse> {
  return get<StoreListResponse>("/stores");
}




