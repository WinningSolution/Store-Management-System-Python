import { get } from "../lib/api";

export interface ProductListItem {
  prodId: string;
  prodNm?: string | null;
  season?: string | null;
  prodLine?: string | null;
  category?: string | null;
  color?: string | null;
  size?: string | null;
  originPrice?: number | null;
  regDt?: string | null;
  outDt?: string | null;
  saleState?: string | null;
}

export interface ProductListResponse {
  items: ProductListItem[];
}

export interface ProductListParams {
  season?: string;
  prod_line?: string;
  category?: string;
  sale_state?: string;
}

export function fetchProducts(
  params: ProductListParams = {},
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.season) query.set("season", params.season);
  if (params.prod_line) query.set("prod_line", params.prod_line);
  if (params.category) query.set("category", params.category);
  if (params.sale_state) query.set("sale_state", params.sale_state);

  const qs = query.toString();
  const path = qs ? `/products?${qs}` : "/products";
  return get<ProductListResponse>(path);
}




