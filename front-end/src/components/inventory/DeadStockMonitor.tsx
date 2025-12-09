import { useEffect, useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  fetchDeadStockMonitor,
  fetchDeadStockItems,
  DeadStockMonitorResponse,
  DeadStockItemsResponse,
} from "../../services/inventoryApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface DeadStockMonitorProps {
  onNavigate: (page: Page) => void;
}

// 더미: 점포별 Dead Stock TOP5
const storeDeadStockSummary = [
  { store: "서울 강남역점", amount: 8200000 },
  { store: "서울 신촌점", amount: 6400000 },
  { store: "경기 분당점", amount: 5100000 },
  { store: "부산 서면점", amount: 4300000 },
  { store: "대구 동성로점", amount: 3700000 },
];

// 더미: 카테고리별 Dead Stock 비중
const categoryDeadStockSummary = [
  { category: "아우터", ratio: 28 },
  { category: "바지", ratio: 22 },
  { category: "셔츠", ratio: 18 },
  { category: "티셔츠", ratio: 15 },
  { category: "원피스", ratio: 10 },
  { category: "악세서리", ratio: 7 },
];

const deadStockData = [
  {
    productId: "P1001",
    productName: "남성 여름 재킷 (XS)",
    store: "강남점",
    stock: 45,
    daysWithoutSale: 180,
    lastSaleDate: "2023-12-15",
    costValue: 2700000,
    category: "남성",
  },
  {
    productId: "P1023",
    productName: "여성 겨울 코트 (XXL)",
    store: "강남점",
    stock: 32,
    daysWithoutSale: 150,
    lastSaleDate: "2024-01-10",
    costValue: 4800000,
    category: "여성",
  },
  {
    productId: "P1045",
    productName: "키즈 반팔 (140)",
    store: "홍대점",
    stock: 28,
    daysWithoutSale: 120,
    lastSaleDate: "2024-02-20",
    costValue: 1120000,
    category: "키즈",
  },
  {
    productId: "P1067",
    productName: "남성 청바지 (28)",
    store: "강남점",
    stock: 18,
    daysWithoutSale: 95,
    lastSaleDate: "2024-03-10",
    costValue: 1440000,
    category: "남성",
  },
  {
    productId: "P1089",
    productName: "여성 원피스 (S)",
    store: "홍대점",
    stock: 15,
    daysWithoutSale: 88,
    lastSaleDate: "2024-03-20",
    costValue: 1050000,
    category: "여성",
  },
];

const deadStockTrendData = [
  { month: "1월", ratio: 8.5, value: 12500000 },
  { month: "2월", ratio: 9.2, value: 13800000 },
  { month: "3월", ratio: 10.5, value: 15200000 },
  { month: "4월", ratio: 11.8, value: 17100000 },
  { month: "5월", ratio: 12.3, value: 18500000 },
  { month: "6월", ratio: 13.1, value: 20200000 },
];

const getSeverityBadge = (days: number) => {
  if (days >= 365) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        심각
      </Badge>
    );
  }
  if (days >= 180) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        긴급
      </Badge>
    );
  }
  // Dead Stock 기준에는 원래 180일 미만이 없지만, 방어적으로 표시
  return (
    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
      관찰
    </Badge>
  );
};

export function DeadStockMonitor({ onNavigate }: DeadStockMonitorProps) {
  const [data, setData] = useState<DeadStockMonitorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [list, setList] = useState<DeadStockItemsResponse | null>(null);
  const [listLoading, setListLoading] = useState(false);

  // 점포 목록 로딩
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        const all = (res.items || []).filter((s) => {
          const name = (s.storeNm || "").toLowerCase();
          return !name.includes("온라인") && !name.includes("online");
        });
        setStores(all);
        if (all.length > 0) {
          setStoreId(all[0].storeId);
        }
      } catch {
        // 무시
      }
    };
    loadStores();
  }, []);

  // Dead Stock 요약 데이터 로딩 (점포별 실적용)
  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchDeadStockMonitor({ store_id: storeId });
        setData(res);
      } catch (e: any) {
        setError(e.message || "Dead Stock 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  // Dead Stock 상세 목록 로딩 (서버사이드 페이지네이션)
  useEffect(() => {
    if (!storeId) return;
    const loadList = async () => {
      try {
        setListLoading(true);
        setError(null);
        const res = await fetchDeadStockItems({
          store_id: storeId,
          page,
          page_size: PAGE_SIZE,
        });
        setList(res);
      } catch (e: any) {
        setError(
          e.message || "Dead Stock 상세 목록 데이터를 불러오지 못했습니다."
        );
      } finally {
        setListLoading(false);
      }
    };
    loadList();
  }, [storeId, page]);

  const summary = data?.summary;

  const amountDiffPct =
    summary && summary.prevTotalAmount > 0
      ? ((summary.totalAmount - summary.prevTotalAmount) / summary.prevTotalAmount) * 100
      : null;
  const skuDiff =
    summary && summary.prevSkuCount !== undefined
      ? summary.skuCount - summary.prevSkuCount
      : null;
  const ratioDiff =
    summary && summary.prevTotalRatio !== undefined
      ? summary.totalRatio - summary.prevTotalRatio
      : null;

  const storeSummary =
    data?.stores?.map((s) => ({
      store: s.storeNm || s.storeId,
      amount: s.amount,
    })) || storeDeadStockSummary;
  const categorySummary = data?.categories || categoryDeadStockSummary;

  const totalItems = list?.total ?? deadStockData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pagedItems =
    list?.items ??
    deadStockData.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE
    );

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Dead Stock 모니터링
          </h1>
          <p className="text-gray-500 text-sm">
            장기 미판매 재고 규모와 분포를 한눈에 보고, 우선 조치가 필요한 점포·카테고리를
            찾아볼 수 있는 대시보드입니다.
          </p>
        </div>
        {stores.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="block mb-1">점포 선택</span>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {stores.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeNm || s.storeId}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 권장 조치 안내 */}
      <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200 text-xs text-orange-900">
        <span className="font-bold mr-1">⚠️ 권장 조치:</span>
        180일 이상 미판매 재고는 할인 판매, 타 매장 이동, 또는 폐기 검토가 필요합니다.
      </div>

      {/* 1행: 요약 KPI 카드 (3개 카드) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        {/* 총 Dead Stock 금액 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-xs text-gray-500">총 Dead Stock 금액</span>
              </div>
              {amountDiffPct !== null && (
                <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                  전월 대비{" "}
                  {amountDiffPct >= 0 ? "▲" : "▼"} {Math.abs(amountDiffPct).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">
              {summary
                ? `₩${Math.round(summary.totalAmount).toLocaleString()}`
                : "₩20.2M"}
            </p>
            <p className="text-xs text-gray-400">
              기준: 전월{" "}
              {summary
                ? `₩${Math.round(summary.prevTotalAmount).toLocaleString()}`
                : "₩18.7M"}
            </p>
          </CardContent>
        </Card>

        {/* Dead Stock 비율 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Dead Stock 비율</span>
              {ratioDiff !== null && (
                <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                  전월 대비 {ratioDiff >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(ratioDiff).toFixed(1)}%p
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">
              {summary ? `${summary.totalRatio.toFixed(1)}%` : "13.1%"}
            </p>
            <p className="text-xs text-gray-400">
              기준: 전월{" "}
              {summary ? `${summary.prevTotalRatio.toFixed(1)}%` : "12.3%"}
            </p>
          </CardContent>
        </Card>

        {/* Dead Stock SKU 수 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">Dead Stock SKU 수</span>
              {skuDiff !== null && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">
                  전월 대비 {skuDiff >= 0 ? "▲" : "▼"} {Math.abs(skuDiff)}개
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">
              {summary ? `${summary.skuCount.toLocaleString()}개` : "138개"}
            </p>
            <p className="text-xs text-gray-400">
              기준: 전월{" "}
              {summary ? `${summary.prevSkuCount.toLocaleString()}개` : "126개"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2행: 점포/카테고리 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">점포별 Dead Stock TOP5 (금액 기준)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={storeSummary}
                margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="store"
                  angle={-20}
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => `₩${v.toLocaleString()}`}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">카테고리별 Dead Stock 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={categorySummary}
                margin={{ top: 8, right: 16, left: 40, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="ratio" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dead Stock 목록 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Dead Stock 상세 목록
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}
          <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-600">
            <span className="font-medium text-gray-700">심각도 기준</span>
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 px-2 py-0.5 text-[11px] font-normal">
              심각 · 365일 이상 미판매
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 px-2 py-0.5 text-[11px] font-normal">
              긴급 · 180일 이상 365일 미만
            </Badge>
          </div>
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <span>
              총 {totalItems.toLocaleString()}개 중{" "}
              {totalItems === 0
                ? "0개"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE,
                    totalItems
                  )}개`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || listLoading}
                className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                이전
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalItems === 0 || listLoading}
                className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                다음
              </button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품ID</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>매장</TableHead>
                <TableHead className="text-right">재고량</TableHead>
                <TableHead className="text-right">미판매일수</TableHead>
                <TableHead>최종판매일</TableHead>
                <TableHead className="text-right">재고금액</TableHead>
                <TableHead>심각도</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((item: any) => (
                <TableRow key={item.prodId} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {item.prodId}
                  </TableCell>
                  <TableCell>{item.prodNm}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.storeNm || item.storeId || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.stock}개</TableCell>
                  <TableCell className="text-right text-red-600">
                    {item.daysWithoutSale}일
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {item.lastSaleDate || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    ₩{Math.round(item.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{getSeverityBadge(item.daysWithoutSale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
