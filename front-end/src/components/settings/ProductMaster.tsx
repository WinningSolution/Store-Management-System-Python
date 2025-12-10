import { useEffect, useMemo, useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Plus, Filter } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  fetchProducts,
  ProductListItem,
  ProductListParams,
} from "../../services/productApi";

interface ProductMasterProps {
  onNavigate: (page: Page) => void;
}

export function ProductMaster({ onNavigate }: ProductMasterProps) {
  const [items, setItems] = useState<ProductListItem[]>([]);
  // 전체 상품 목록 (필터 옵션 계산용)
  const [allItems, setAllItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [season, setSeason] = useState<string>("ALL");
  const [line, setLine] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [saleState, setSaleState] = useState<string>("ALL");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: ProductListParams = {};
      if (season !== "ALL") params.season = season;
      if (line !== "ALL") params.prod_line = line;
      if (category !== "ALL") params.category = category;
      if (saleState !== "ALL") params.sale_state = saleState;
      const res = await fetchProducts(params);
      const list = res.items || [];
      setItems(list);
      // 필터 미적용 상태(전체 조회)에서는 allItems도 갱신
      if (
        season === "ALL" &&
        line === "ALL" &&
        category === "ALL" &&
        saleState === "ALL"
      ) {
        setAllItems(list);
      }
    } catch (e: any) {
      setError(e.message || "상품 정보를 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = items.length;

  // 실제 데이터 기준으로 동적 필터 옵션 구성
  const seasonOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((p) => p.season)
            .filter((v): v is string => !!v),
        ),
      ),
    [allItems],
  );

  const lineOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((p) => p.prodLine)
            .filter((v): v is string => !!v),
        ),
      ),
    [allItems],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((p) => p.category)
            .filter((v): v is string => !!v),
        ),
      ),
    [allItems],
  );

  const saleStateOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((p) => p.saleState)
            .filter((v): v is string => !!v),
        ),
      ),
    [allItems],
  );

  const filteredSummary = useMemo(() => {
    if (items.length === 0) return null;
    const active = items.filter((p) => p.saleState === "판매중").length;
    const discontinued = items.filter((p) => p.saleState && p.saleState !== "판매중").length;
    return { active, discontinued };
  }, [items]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">상품 마스터 관리</h1>
          <p className="text-gray-500">상품 정보 등록 및 수정</p>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          새 상품 등록
        </Button>
      </div>

      {/* 필터 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option value="ALL">전체 시즌</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            >
              <option value="ALL">전체 라인</option>
              {lineOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">전체 카테고리</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={saleState}
              onChange={(e) => setSaleState(e.target.value)}
            >
              <option value="ALL">전체 상태</option>
              {saleStateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="ml-auto"
              size="sm"
              onClick={loadProducts}
              disabled={loading}
            >
              {loading ? "불러오는 중..." : "조회"}
            </Button>
          </div>
          {filteredSummary && (
            <div className="text-xs text-gray-500">
              판매중:{" "}
              <span className="font-semibold text-green-600">
                {filteredSummary.active}개
              </span>
              {" / "}
              단종/기타:{" "}
              <span className="font-semibold text-gray-700">
                {filteredSummary.discontinued}개
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상품 테이블 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>
            전체 상품{" "}
            <span className="text-sm text-gray-500">
              {loading ? "(로딩 중...)" : `(${total}개)`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품 ID</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>시즌</TableHead>
                <TableHead>라인</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>색상</TableHead>
                <TableHead>사이즈</TableHead>
                <TableHead className="text-right">가격</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow key={product.prodId} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {product.prodId}
                  </TableCell>
                  <TableCell>{product.prodNm || "-"}</TableCell>
                  <TableCell>
                    {product.season && (
                      <Badge variant="outline">{product.season}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{product.prodLine || "-"}</TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>{product.color || "-"}</TableCell>
                  <TableCell>{product.size || "-"}</TableCell>
                  <TableCell className="text-right">
                    {product.originPrice != null
                      ? `₩${Math.round(product.originPrice).toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {product.saleState === "판매중" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        판매중
                      </Badge>
                    ) : product.saleState ? (
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        {product.saleState}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-4 text-center text-sm text-gray-500"
                  >
                    조건에 해당하는 상품이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
