import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  fetchStoreRanking,
  StoreRankingItem,
  fetchStoreCategoryHeatmap,
  StoreCategoryHeatmapItem,
  fetchStoreTopProducts,
  StoreTopProductItem,
  fetchCategoryTopProducts,
  CategoryTopProductItem,
  fetchCategoryTrend,
  CategoryTrendItem,
  fetchLineTrend,
  LineTrendItem,
  fetchLineTopProducts,
  LineTopProductItem,
  fetchDiscountEvents,
  DiscountEventItem,
  fetchDiscountSummary,
  DiscountSummary,
  fetchDiscountTopProducts,
  DiscountTopProductItem,
} from "../../services/salesApi";
import { Filter } from "lucide-react";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface SalesCompositionProps {
  onNavigate: (page: Page) => void;
  // 추세 비교 페이지와 동일한 필터를 연동하기 위한 선택적 프리셋
  baseMonth?: string;
}

// 카테고리/라인 탭용 더미 데이터 (9개 카테고리 비중 예시)
const categoryCompositionData = [
  {
    month: "1월",
    티셔츠: 18000000,
    셔츠: 12000000,
    바지: 9000000,
    아우터: 7000000,
    니트: 6000000,
    이너: 5000000,
    홈웨어: 4000000,
    악세서리: 3000000,
    원피스: 2000000,
  },
  {
    month: "2월",
    티셔츠: 19000000,
    셔츠: 12500000,
    바지: 9500000,
    아우터: 7200000,
    니트: 6200000,
    이너: 5200000,
    홈웨어: 4200000,
    악세서리: 3200000,
    원피스: 2200000,
  },
  {
    month: "3월",
    티셔츠: 20000000,
    셔츠: 13000000,
    바지: 9800000,
    아우터: 7500000,
    니트: 6500000,
    이너: 5400000,
    홈웨어: 4300000,
    악세서리: 3400000,
    원피스: 2300000,
  },
  {
    month: "4월",
    티셔츠: 18500000,
    셔츠: 12000000,
    바지: 9200000,
    아우터: 7000000,
    니트: 6200000,
    이너: 5200000,
    홈웨어: 4100000,
    악세서리: 3100000,
    원피스: 2100000,
  },
  {
    month: "5월",
    티셔츠: 21000000,
    셔츠: 14000000,
    바지: 10000000,
    아우터: 7800000,
    니트: 6800000,
    이너: 5600000,
    홈웨어: 4500000,
    악세서리: 3600000,
    원피스: 2500000,
  },
  {
    month: "6월",
    티셔츠: 22000000,
    셔츠: 14500000,
    바지: 10500000,
    아우터: 8000000,
    니트: 7000000,
    이너: 5800000,
    홈웨어: 4600000,
    악세서리: 3800000,
    원피스: 2700000,
  },
];

// 라인별 (여/남/키즈) 매출 추이용 기본 값 (API 응답 없을 때 대비)
const emptyLineCompositionData = [
  { month: "1월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "2월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "3월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "4월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "5월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "6월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "7월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "8월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "9월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "10월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "11월", 남성: 0, 여성: 0, 키즈: 0 },
  { month: "12월", 남성: 0, 여성: 0, 키즈: 0 },
];

// 점포별 카테고리별 매출 히트맵용 카테고리 축 (총 9개)
const heatmapCategories = [
  "티셔츠",
  "셔츠",
  "바지",
  "아우터",
  "니트",
  "이너",
  "홈웨어",
  "악세서리",
  "원피스",
];

// DB 내 세부 카테고리명을 히트맵용 9개 축으로 매핑
const normalizeCategoryForHeatmap = (category?: string | null): string => {
  const c = (category || "").trim();
  if (!c) return "원피스";

  // 구체적인 것부터 먼저 체크 (부분 문자열 충돌 방지)
  if (c === "아우터") return "아우터";
  if (c.includes("티셔츠")) return "티셔츠";
  if (c.includes("셔츠")) return "셔츠"; // 티셔츠는 위에서 이미 걸러짐
  if (c.includes("바지") || c.toLowerCase().includes("pants")) return "바지";

  if (
    c.includes("코트") ||
    c.includes("재킷") ||
    c.includes("자켓") ||
    c.includes("패딩") ||
    c.includes("점퍼") ||
    c.includes("아노락")
  )
    return "아우터";

  if (c.includes("니트") || c.includes("스웨터") || c.includes("가디건"))
    return "니트";

  if (
    c.includes("이너") ||
    c.includes("언더웨어") ||
    c.includes("속옷") ||
    c.includes("브라") ||
    c.includes("팬티")
  )
    return "이너";

  if (c.includes("홈웨어") || c.includes("룸웨어") || c.includes("파자마"))
    return "홈웨어";

  if (
    c.includes("악세") ||
    c.includes("액세") ||
    c.toLowerCase().includes("accessor")
  )
    return "악세서리";

  // 나머지는 원피스/기타류로 통합
  if (c.includes("원피스")) return "원피스";
  return "원피스";
};

// TOP 상품 테이블용 샘플 데이터 (점포/카테고리 공통 사용)
const topCategoryProducts = [
  { rank: 1, product: "남성 반팔 티셔츠", sales: 12000000, count: 450, share: 34.3 },
  { rank: 2, product: "남성 청바지", sales: 9500000, count: 320, share: 27.1 },
  { rank: 3, product: "남성 셔츠", sales: 7200000, count: 280, share: 20.6 },
  { rank: 4, product: "남성 반바지", sales: 4800000, count: 190, share: 13.7 },
  { rank: 5, product: "남성 양말", sales: 1500000, count: 95, share: 4.3 },
];

export function SalesComposition({ onNavigate }: SalesCompositionProps) {
  const [activeTab, setActiveTab] = useState("category");
  const [basePeriod, setBasePeriod] = useState<string>("2025-09");
  const [periodRange, setPeriodRange] = useState<"recent" | "past">("recent");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [allStores, setAllStores] = useState<StoreListItem[]>([]);
  const [storeRanking, setStoreRanking] = useState<StoreRankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingSegment, setRankingSegment] = useState(1); // 1~6 (1~5위, 6~10위, ...)
  const [heatmapItems, setHeatmapItems] = useState<StoreCategoryHeatmapItem[]>(
    []
  );
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [storeTopProducts, setStoreTopProducts] = useState<StoreTopProductItem[]>(
    []
  );
  const [storeTopLoading, setStoreTopLoading] = useState(false);
  const [storeTopError, setStoreTopError] = useState<string | null>(null);
  const [categoryTopProducts, setCategoryTopProducts] =
    useState<CategoryTopProductItem[]>([]);
  const [categoryTopLoading, setCategoryTopLoading] = useState(false);
  const [categoryTopError, setCategoryTopError] = useState<string | null>(null);
  const [categoryPage, setCategoryPage] = useState(1); // 1~3
  const [categoryTopBaseMonth, setCategoryTopBaseMonth] =
    useState<string>("2025-09");
  const [categoryTrendItems, setCategoryTrendItems] = useState<CategoryTrendItem[]>([]);
  const [categoryTrendLoading, setCategoryTrendLoading] = useState(false);
  const [categoryTrendError, setCategoryTrendError] = useState<string | null>(null);
  const [lineTrendItems, setLineTrendItems] = useState<LineTrendItem[]>([]);
  const [lineTrendLoading, setLineTrendLoading] = useState(false);
  const [lineTrendError, setLineTrendError] = useState<string | null>(null);
  const [lineTopProducts, setLineTopProducts] = useState<LineTopProductItem[]>([]);
  const [lineTopLoading, setLineTopLoading] = useState(false);
  const [lineTopError, setLineTopError] = useState<string | null>(null);
  const [lineTopPage, setLineTopPage] = useState(1);
  const [discountEvents, setDiscountEvents] = useState<DiscountEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>();
  const [discountSummary, setDiscountSummary] = useState<DiscountSummary | null>(null);
  const [discountTopProducts, setDiscountTopProducts] = useState<
    DiscountTopProductItem[]
  >([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const periodLabel = "최근 1년";

  // 점포별 매출 랭킹 데이터 로딩 (최근 1년 고정)
  useEffect(() => {
    const loadRanking = async () => {
      try {
        setLoadingRanking(true);
        setRankingError(null);
        const res = await fetchStoreRanking({
          period: "recent",
          top_n: 100,
          base_month: basePeriod,
        });
        setStoreRanking(res.items || []);
        if (!selectedStoreId && res.items && res.items.length > 0) {
          setSelectedStoreId(res.items[0].storeId);
        }
      } catch (e: any) {
        setRankingError(e.message || "점포별 매출 랭킹 데이터를 불러오지 못했습니다.");
        setStoreRanking([]);
      } finally {
        setLoadingRanking(false);
      }
    };
    loadRanking();
    setRankingSegment(1);
  }, [selectedStoreId, basePeriod]);

  // 전체 점포 목록 로딩 (점포 선택 드롭다운용)
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        setAllStores(res.items || []);
        if (!selectedStoreId && res.items && res.items.length > 0) {
          setSelectedStoreId(res.items[0].storeId);
        }
      } catch {
        // 점포 목록 로딩 실패 시에는 단순히 랭킹 기반 옵션만 사용
      }
    };
    loadStores();
  }, [selectedStoreId]);

  const storeRankingChartData = useMemo(
    () =>
      storeRanking
        // 온라인 스토어(온라인/Online 이 포함된 점포명)는 제외
        .filter((s) => {
          const name = (s.storeNm || s.storeId || "").toLowerCase();
          return !name.includes("온라인") && !name.includes("online");
        })
        .map((s) => ({
          storeId: s.storeId,
          storeName: s.storeNm || s.storeId,
          sales: s.sales,
        })),
    [storeRanking]
  );

  const rankingSegmentCount = useMemo(
    () => Math.max(1, Math.ceil(storeRankingChartData.length / 10)),
    [storeRankingChartData]
  );

  const rankingSegmentData = useMemo(() => {
    const clampedSegment = Math.min(rankingSegment, rankingSegmentCount);
    const start = (clampedSegment - 1) * 10;
    const end = start + 10;
    return storeRankingChartData.slice(start, end);
  }, [storeRankingChartData, rankingSegment, rankingSegmentCount]);

  const storeOptions = useMemo(
    () => {
      if (allStores.length > 0) {
        return allStores.map((s) => ({
          id: s.storeId,
          name: s.storeNm || s.storeId,
        }));
      }
      // fallback: 랭킹 데이터 기반 (초기 로딩 실패 시)
      return storeRankingChartData.map((s) => ({
        id: s.storeId,
        name: s.storeName,
      }));
    },
    [allStores, storeRankingChartData]
  );

  // 선택한 대상 매장이 포함된 순위 구간이 자동으로 보이도록 조정
  useEffect(() => {
    if (!selectedStoreId) return;
    if (storeRankingChartData.length === 0) return;
    const index = storeRankingChartData.findIndex(
      (s) => s.storeId === selectedStoreId
    );
    if (index === -1) return;
    const segment = Math.floor(index / 10) + 1;
    if (segment !== rankingSegment) {
      setRankingSegment(segment);
    }
  }, [selectedStoreId, storeRankingChartData, rankingSegment]);

  const selectedStoreName = useMemo(() => {
    const found = storeOptions.find((s) => s.id === selectedStoreId);
    return found?.name || "";
  }, [storeOptions, selectedStoreId]);

  // 점포별 랭킹 차트에서 선택된 점포는 빨간색으로 표시하는 Y축 tick 렌더러
  const renderStoreAxisTick = useCallback(
    (props: any) => {
      const { x, y, payload } = props;
      const value: string = payload?.value ?? "";
      const isSelected = value === selectedStoreName;
      return (
        <text
          x={x}
          y={y}
          dy={4}
          textAnchor="end"
          fill={isSelected ? "#ef4444" : "#6b7280"}
          fontSize={11}
          fontWeight={isSelected ? 700 : 400}
        >
          {value}
        </text>
      );
    },
    [selectedStoreName]
  );

  const heatmapPageCount = useMemo(
    () => Math.max(1, Math.ceil(storeRankingChartData.length / 10)),
    [storeRankingChartData]
  );

  // 히트맵도 점포별 매출 랭킹과 동일한 순위 구간을 사용
  const heatmapStores = useMemo(() => {
    const clampedSegment = Math.min(rankingSegment, heatmapPageCount);
    const start = (clampedSegment - 1) * 10;
    const end = start + 10;
    return storeRankingChartData.slice(start, end);
  }, [storeRankingChartData, rankingSegment, heatmapPageCount]);

  const pageStoreIds = useMemo(
    () => new Set(heatmapStores.map((s) => s.storeId)),
    [heatmapStores]
  );

  // 히트맵용: 현재 페이지 점포 기준으로 점포×카테고리별 합계와 점포별 총합 계산
  const heatmapByStore = useMemo(() => {
    const result = new Map<
      string,
      { total: number; byCategory: Record<string, number> }
    >();
    heatmapItems.forEach((item) => {
      if (!pageStoreIds.has(item.storeId)) return;
      const cat = normalizeCategoryForHeatmap(item.category);
      const existing =
        result.get(item.storeId) || { total: 0, byCategory: {} as Record<string, number> };
      const current = existing.byCategory[cat] || 0;
      const sales = item.sales || 0;
      existing.byCategory[cat] = current + sales;
      existing.total += sales;
      result.set(item.storeId, existing);
    });
    return result;
  }, [heatmapItems, pageStoreIds]);

  // 각 점포에서 카테고리별 매출이 차지하는 "구성비(%)" 를 0~1 스케일로 반환
  const getHeatmapRatio = (storeId: string, category: string): number => {
    const store = heatmapByStore.get(storeId);
    if (!store || store.total <= 0) return 0;
    const value = store.byCategory[category] || 0;
    return value / store.total;
  };

  // 점포별 카테고리별 히트맵 데이터 로딩 (현재 페이지의 10개 점포 기준, 최근 1년 고정)
  useEffect(() => {
    const loadHeatmap = async () => {
      if (heatmapStores.length === 0) {
        setHeatmapItems([]);
        return;
      }
      try {
        setHeatmapLoading(true);
        setHeatmapError(null);
          const storeIds = heatmapStores.map((s) => s.storeId);
          const res = await fetchStoreCategoryHeatmap({
            period: "recent",
            store_id: storeIds,
            base_month: basePeriod,
          });
        setHeatmapItems(res.items || []);
      } catch (e: any) {
        setHeatmapError(
          e.message || "점포별 카테고리별 매출 데이터를 불러오지 못했습니다."
        );
        setHeatmapItems([]);
      } finally {
        setHeatmapLoading(false);
      }
    };
    loadHeatmap();
  }, [heatmapStores, basePeriod]);

  // 점포별 TOP 상품 데이터 로딩 (기준 기간 / 대상 매장 기준)
  useEffect(() => {
    const loadTopProducts = async () => {
      if (!selectedStoreId) {
        setStoreTopProducts([]);
        return;
      }
      try {
        setStoreTopLoading(true);
        setStoreTopError(null);
        const res = await fetchStoreTopProducts({
          store_id: selectedStoreId,
          period: "recent",
          top_n: 10,
          base_month: basePeriod,
        });
        setStoreTopProducts(res.items || []);
      } catch (e: any) {
        setStoreTopError(
          e.message || "점포별 TOP 30 상품 데이터를 불러오지 못했습니다."
        );
        setStoreTopProducts([]);
      } finally {
        setStoreTopLoading(false);
      }
    };
    loadTopProducts();
  }, [selectedStoreId, basePeriod]);

  // 카테고리별 TOP30 상품 데이터 로딩 (대상 매장 + 기준연월별 최근 1년)
  useEffect(() => {
    const loadCategoryTop = async () => {
      if (!selectedStoreId) {
        setCategoryTopProducts([]);
        return;
      }
      try {
        setCategoryTopLoading(true);
        setCategoryTopError(null);
        const res = await fetchCategoryTopProducts({
          period: "recent",
          top_n: 30,
          base_month: categoryTopBaseMonth,
          store_id: selectedStoreId,
        });
        setCategoryTopProducts(res.items || []);
        setCategoryPage(1);
      } catch (e: any) {
        setCategoryTopError(
          e.message || "카테고리별 TOP 30 상품 데이터를 불러오지 못했습니다."
        );
        setCategoryTopProducts([]);
      } finally {
        setCategoryTopLoading(false);
      }
    };
    loadCategoryTop();
  }, [selectedStoreId, categoryTopBaseMonth]);

  // 카테고리별 매출 추이 (최근 1년) 데이터 로딩 – 기준년(월) 없이 항상 최근 1년 기준
  useEffect(() => {
    const loadCategoryTrend = async () => {
      try {
        setCategoryTrendLoading(true);
        setCategoryTrendError(null);
        const res = await fetchCategoryTrend({
          period: periodRange,
          store_id: selectedStoreId || undefined,
        });
        setCategoryTrendItems(res.items || []);
      } catch (e: any) {
        setCategoryTrendError(
          e.message || "카테고리별 매출 추이 데이터를 불러오지 못했습니다."
        );
        setCategoryTrendItems([]);
      } finally {
        setCategoryTrendLoading(false);
      }
    };
    loadCategoryTrend();
  }, [periodRange, selectedStoreId]);

  const topProductMaxSales = useMemo(
    () =>
      storeTopProducts.reduce(
        (max, p) => (p.sales > max ? p.sales : max),
        0
      ) || 1,
    [storeTopProducts]
  );

  const categoryPageSize = 10;
  const pagedCategoryProducts = useMemo(
    () =>
      categoryTopProducts.slice(
        (categoryPage - 1) * categoryPageSize,
        categoryPage * categoryPageSize
      ),
    [categoryTopProducts, categoryPage]
  );

  const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const computedCategoryCompositionData = useMemo(() => {
    // 12개월 × 9카테고리 기본 0으로 초기화
    const base = monthLabels.map((label) => ({
      month: label,
      티셔츠: 0,
      셔츠: 0,
      바지: 0,
      아우터: 0,
      니트: 0,
      이너: 0,
      홈웨어: 0,
      악세서리: 0,
      원피스: 0,
    }));

    // 1) 월별 카테고리 매출 합계 누적
    categoryTrendItems.forEach((item) => {
      const m = item.month;
      if (!m || m < 1 || m > 12) return;
      const idx = m - 1;
      const cat = normalizeCategoryForHeatmap(item.category);
      const current = (base[idx] as any)[cat] || 0;
      (base[idx] as any)[cat] = current + item.sales;
    });

    // 2) 각 월별 총 매출을 기준으로 100% 구성비로 변환
    return base.map((row) => {
      const total =
        row.티셔츠 +
        row.셔츠 +
        row.바지 +
        row.아우터 +
        row.니트 +
        row.이너 +
        row.홈웨어 +
        row.악세서리 +
        row.원피스;

      if (total <= 0) {
        return row;
      }

      const toPct = (v: number) => (v / total) * 100;

      return {
        ...row,
        티셔츠: toPct(row.티셔츠),
        셔츠: toPct(row.셔츠),
        바지: toPct(row.바지),
        아우터: toPct(row.아우터),
        니트: toPct(row.니트),
        이너: toPct(row.이너),
        홈웨어: toPct(row.홈웨어),
        악세서리: toPct(row.악세서리),
        원피스: toPct(row.원피스),
      };
    });
  }, [categoryTrendItems, monthLabels]);

  // 라인별 (여/남/키즈) 매출 추이 데이터 로딩 – 기준 기간 / 대상 매장 기준
  useEffect(() => {
    const loadLineTrend = async () => {
      if (!selectedStoreId) {
        setLineTrendItems([]);
        return;
      }
      try {
        setLineTrendLoading(true);
        setLineTrendError(null);
        const res = await fetchLineTrend({
          period: "recent",
          base_month: basePeriod,
          store_id: selectedStoreId,
        });
        setLineTrendItems(res.items || []);
      } catch (e: any) {
        setLineTrendError(
          e.message || "라인별 매출 추이 데이터를 불러오지 못했습니다."
        );
        setLineTrendItems([]);
      } finally {
        setLineTrendLoading(false);
      }
    };
    loadLineTrend();
  }, [basePeriod, selectedStoreId]);

  const lineCompositionData = useMemo(() => {
    const base = [...emptyLineCompositionData];
    lineTrendItems.forEach((item) => {
      const m = item.month;
      if (!m || m < 1 || m > 12) return;
      const idx = m - 1;
      const line = (item.line || "").trim();
      const key =
        line === "남성"
          ? "남성"
          : line === "여성"
          ? "여성"
          : line === "키즈"
          ? "키즈"
          : null;
      if (!key) return;
      // @ts-ignore
      base[idx][key] = (base[idx][key] || 0) + item.sales;
    });
    return base;
  }, [lineTrendItems]);

  const lineTopPageSize = 10;
  const pagedLineTopProducts = useMemo(
    () =>
      lineTopProducts.slice(
        (lineTopPage - 1) * lineTopPageSize,
        lineTopPage * lineTopPageSize
      ),
    [lineTopProducts, lineTopPage]
  );

  // 라인별 TOP 30 상품 (기준 기간 / 대상 매장 기준)
  useEffect(() => {
    const loadLineTop = async () => {
      if (!selectedStoreId) {
        setLineTopProducts([]);
        return;
      }
      try {
        setLineTopLoading(true);
        setLineTopError(null);
        const res = await fetchLineTopProducts({
          period: "recent",
          top_n: 30,
          base_month: basePeriod,
          store_id: selectedStoreId,
        });
        setLineTopProducts(res.items || []);
        setLineTopPage(1);
      } catch (e: any) {
        setLineTopError(
          e.message || "라인별 TOP 30 상품 데이터를 불러오지 못했습니다."
        );
        setLineTopProducts([]);
      } finally {
        setLineTopLoading(false);
      }
    };
    loadLineTop();
  }, [basePeriod, selectedStoreId]);

  // 이벤트 목록 로딩 (이벤트 탭용)
  useEffect(() => {
    const loadDiscountEvents = async () => {
      try {
        const res = await fetchDiscountEvents({
          base_month: basePeriod,
          active_only: true,
        });
        setDiscountEvents(res.items || []);
        // 기본값: 첫 번째 이벤트 자동 선택 (없으면 undefined 유지)
        if (!selectedEventId && res.items && res.items.length > 0) {
          setSelectedEventId(res.items[0].eventId);
        }
      } catch {
        // 이벤트가 없어도 치명적이지 않으므로 조용히 무시
      }
    };
    loadDiscountEvents();
  }, [basePeriod, selectedEventId]);

  // 이벤트별 요약 + TOP 상품 (기준 기간 / 이벤트 기준: 전체 점포 집계)
  useEffect(() => {
    const loadDiscountData = async () => {
      try {
        setDiscountLoading(true);
        setDiscountError(null);

        const [summary, top] = await Promise.all([
          fetchDiscountSummary({
            base_month: basePeriod,
            // 이벤트 탭에서는 전체 점포 기준으로 집계 (store_id 미전달)
            event_id: selectedEventId,
          }),
          fetchDiscountTopProducts({
            base_month: basePeriod,
            event_id: selectedEventId,
            top_n: 30,
          }),
        ]);

        setDiscountSummary(summary);
        setDiscountTopProducts(top.items || []);
      } catch (e: any) {
        setDiscountError(
          e.message || "이벤트별 매출 데이터를 불러오지 못했습니다."
        );
        setDiscountSummary(null);
        setDiscountTopProducts([]);
      } finally {
        setDiscountLoading(false);
      }
    };

    // 이벤트 선택이 없어도 "전체 이벤트" 기준으로 보도록 호출
    loadDiscountData();
  }, [basePeriod, selectedStoreId, selectedEventId]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">매출 상세 비교</h1>
            <p className="text-gray-500">
              점포별 · 카테고리별 · 라인별 TOP 상품과 기준 기간/비교 기준에 따른 매출 상세 내용을 함께 살펴봅니다.
            </p>
          </div>
        </div>

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="store">점포별</TabsTrigger>
          <TabsTrigger value="category">카테고리별</TabsTrigger>
          <TabsTrigger value="line">라인별 (여/남/키즈)</TabsTrigger>
          <TabsTrigger value="event">이벤트별</TabsTrigger>
        </TabsList>

        {/* 점포별 탭 */}
        <TabsContent value="store">
          {/* 점포별 탭 필터 영역 */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className=" p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">기준 기간</span>
                  <input
                    type="month"
                    value={basePeriod}
                    onChange={(e) => {
                      setBasePeriod(e.target.value);
                    }}
                    className="h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>대상 매장</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => {
                      setSelectedStoreId(e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {storeOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 상단: 점포별 매출 랭킹 + 점포별 카테고리별 매출 히트맵 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* 점포별 매출 랭킹 (10개씩 구간 선택, 최대 100위까지) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>점포별 매출 랭킹</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>순위 구간</span>
                  <select
                    value={rankingSegment}
                    onChange={(e) => setRankingSegment(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    {Array.from({ length: rankingSegmentCount }).map((_, idx) => {
                      const startRank = idx * 10 + 1;
                      const endRank = Math.min((idx + 1) * 10, storeRankingChartData.length);
                      return (
                        <option key={idx + 1} value={idx + 1}>
                          {startRank}~{endRank}위
                        </option>
                      );
                    })}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-2">
                {rankingError && (
                  <p className="text-sm text-red-500 mb-2">{rankingError}</p>
                )}
                {storeRankingChartData.length === 0 && !rankingError ? (
                  <p className="text-sm text-gray-400">
                    {loadingRanking
                      ? "점포별 매출 랭킹을 불러오는 중입니다..."
                      : "표시할 점포 매출 데이터가 없습니다."}
                  </p>
                ) : (
                  <div className="mt-2 h-[360px] flex items-center">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        layout="vertical"
                        data={rankingSegmentData}
                        margin={{ left: 56, right: 16, top: 16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#9ca3af"
                          domain={[0, 40_000_000]}
                          ticks={[
                            0,
                            10_000_000,
                            20_000_000,
                            30_000_000,
                            40_000_000,
                          ]}
                          tickFormatter={(v) => `${v / 1_000_000}M`}
                        />
                      <YAxis
                        type="category"
                        dataKey="storeName"
                        stroke="#9ca3af"
                        tick={renderStoreAxisTick}
                        interval={0} // 모든 점포 이름 표시
                      />
                        <Tooltip
                          formatter={(value: any) =>
                            `₩${Number(value).toLocaleString()}`
                          }
                        />
                        <Bar
                          dataKey="sales"
                          radius={[0, 4, 4, 0]}
                        >
                          {rankingSegmentData.map((entry, index) => {
                            const colors = [
                              "#1d4ed8", // 파랑
                              "#ec4899", // 핑크
                              "#22c55e", // 초록
                              "#f97316", // 주황
                              "#a855f7", // 보라
                            ];
                            return (
                              <Cell
                                key={entry.storeId}
                                fill={colors[index % colors.length]}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 점포별 카테고리별 매출 히트맵 (상단 우측 카드) */}
            <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>점포별 카테고리별 매출 히트맵</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>점포 구간</span>
                  <select
                    value={rankingSegment}
                    onChange={(e) => setRankingSegment(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    {Array.from({ length: heatmapPageCount }).map((_, idx) => {
                      const startRank = idx * 10 + 1;
                      const endRank = (idx + 1) * 10;
                      return (
                        <option key={idx + 1} value={idx + 1}>
                          {startRank}~{endRank}위
                        </option>
                      );
                    })}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {heatmapError && (
                  <p className="text-xs text-red-500 mb-2">{heatmapError}</p>
                )}
                {heatmapLoading && !heatmapError && (
                  <p className="text-xs text-gray-400 mb-2">
                    점포별 카테고리별 매출 데이터를 불러오는 중입니다...
                  </p>
                )}
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-xs">
                    <thead>
                      <tr>
                      <th className="py-1 pr-4 text-left text-gray-500 w-32">
                        점포
                      </th>
                        {heatmapCategories.map((c) => (
                          <th
                            key={c}
                          className="px-1 py-1 text-center text-gray-500 w-12"
                          >
                          <span className="inline-block w-9 text-center truncate">
                            {c}
                          </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapStores.map((store) => {
                        const isSelected = store.storeId === selectedStoreId;
                        return (
                        <tr key={store.storeId}>
                          <td
                            className={`py-1 pr-4 whitespace-nowrap ${
                              isSelected ? "text-red-600 font-semibold" : "text-gray-600"
                            }`}
                          >
                            {store.storeName}
                          </td>
                          {heatmapCategories.map((category) => {
                            const ratio = getHeatmapRatio(
                              store.storeId,
                              category
                            ); // 0~1 (점포 내 구성비)
                            // 히트맵 목적: 점포 내 구성비 30% 이상이면 "매우 강한 축"으로 강조
                            // → 0~30% 구간을 0~1 로 노멀라이즈하고, 30% 이상은 최대로 채움
                            const normalized = Math.min(ratio / 0.3, 1); // 30% ⇒ 1
                            // 0 → 90% (아주 연한 파랑), 1 → 40% (매우 진한 파랑)
                            const lightness = 90 - Math.round(normalized * 50);
                            const bg = `hsl(217 91% ${lightness}%)`; // 파란 계열
                            return (
                            <td key={category} className="px-1 py-1">
                                <div
                                className="w-9 h-9 rounded-sm border border-gray-200 flex items-center justify-center"
                                  style={{ backgroundColor: bg }}
                                  title={`${store.storeName} ${category}: ${(
                                    ratio * 100
                                  ).toFixed(1)}% (점포 내 매출 구성 비중)`}
                                >
                                <span className="text-[10px] text-gray-800">
                                    {ratio > 0
                                      ? Math.round(ratio * 100).toString()
                                      : ""}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 하단: 점포 선택 + TOP10 테이블 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col">
                <CardTitle>점포별 TOP 10 상품</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>점포 선택</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {storeOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {storeTopError && (
                <p className="text-xs text-red-500 mb-2">{storeTopError}</p>
              )}
              {storeTopLoading && !storeTopError && (
                <p className="text-xs text-gray-400 mb-2">
                  선택한 점포의 TOP 10 상품 데이터를 불러오는 중입니다...
                </p>
              )}
              {storeTopProducts.length === 0 && !storeTopLoading && !storeTopError ? (
                <p className="text-xs text-gray-400">
                  표시할 TOP 10 상품 데이터가 없습니다.
                </p>
              ) : (
                <div className="border border-gray-100 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">순위</TableHead>
                        <TableHead>상품명</TableHead>
                        <TableHead className="text-right">매출</TableHead>
                        <TableHead className="text-right">판매수</TableHead>
                        <TableHead className="text-right">점유율</TableHead>
                        <TableHead className="text-right">현재 재고</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeTopProducts.map((p) => (
                        <TableRow key={p.rank}>
                          <TableCell className="text-center">
                            {p.rank}
                          </TableCell>
                          <TableCell>{p.prodNm || p.prodId}</TableCell>
                          <TableCell className="text-right">
                            {/* 미니 바 */}
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                                <div
                                  className="h-1.5 bg-blue-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (p.sales / topProductMaxSales) * 100
                                    ).toFixed(0)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">
                                ₩{(p.sales / 1_000_000).toFixed(1)}M
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {p.qty.toLocaleString()}개
                          </TableCell>
                          <TableCell className="text-right">
                            {p.share.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {p.stock.toLocaleString()}개
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 카테고리별 탭 */}
        <TabsContent value="category">
          {/* 카테고리별 탭 필터 영역 – 이 탭 안에서만 기준 연월 + 대상 매장 선택 */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    최근 1년 기준 대상 매장 카테고리 분석
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">기준 연월</span>
                  <input
                    type="month"
                    value={categoryTopBaseMonth}
                    onChange={(e) =>
                      setCategoryTopBaseMonth(e.target.value || "2025-09")
                    }
                    className="h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>대상 매장</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {storeOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>카테고리별 매출 구성비 추이 (최근 1년)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={computedCategoryCompositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis
                    stroke="#9ca3af"
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  {/* 9개 카테고리용 명확한 구분 색상 팔레트 */}
                  <Bar dataKey="티셔츠" stackId="a" fill="#2563EB" /> {/* 선명한 블루 */}
                  <Bar dataKey="셔츠" stackId="a" fill="#F97316" /> {/* 오렌지 */}
                  <Bar dataKey="바지" stackId="a" fill="#10B981" /> {/* 에메랄드 그린 */}
                  <Bar dataKey="아우터" stackId="a" fill="#EF4444" /> {/* 레드 */}
                  <Bar dataKey="니트" stackId="a" fill="#8B5CF6" /> {/* 보라 */}
                  <Bar dataKey="이너" stackId="a" fill="#0EA5E9" /> {/* 시안 */}
                  <Bar dataKey="홈웨어" stackId="a" fill="#F59E0B" /> {/* 머스타드 */}
                  <Bar dataKey="악세서리" stackId="a" fill="#EC4899" /> {/* 핑크 */}
                  <Bar dataKey="원피스" stackId="a" fill="#6B7280" /> {/* 그레이 */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>대상 매장 카테고리별 TOP 30 상품</CardTitle>
                <span className="text-xs text-gray-400">
                  기준 연월: {categoryTopBaseMonth} 당월 기준
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>순위 구간</span>
                <select
                  value={categoryPage}
                  onChange={(e) => setCategoryPage(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value={1}>1~10위</option>
                  <option value={2}>11~20위</option>
                  <option value={3}>21~30위</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {categoryTopError && (
                <p className="text-xs text-red-500 mb-2">{categoryTopError}</p>
              )}
              {categoryTopLoading && !categoryTopError && (
                <p className="text-xs text-gray-400 mb-2">
                  카테고리별 TOP 30 상품 데이터를 불러오는 중입니다...
                </p>
              )}
              {pagedCategoryProducts.length === 0 &&
              !categoryTopLoading &&
              !categoryTopError ? (
                <p className="text-xs text-gray-400">
                  표시할 카테고리별 TOP 30 상품 데이터가 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">순위</TableHead>
                      <TableHead className="w-32">카테고리</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">판매수</TableHead>
                      <TableHead className="text-right">점유율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCategoryProducts.map((product) => (
                      <TableRow key={product.rank}>
                        <TableCell className="text-center">
                          {product.rank}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">
                          {product.category || "-"}
                        </TableCell>
                        <TableCell>{product.prodNm || product.prodId}</TableCell>
                        <TableCell className="text-right">
                          ₩{(product.sales / 1_000_000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right">
                          {product.qty.toLocaleString()}개
                        </TableCell>
                        <TableCell className="text-right">
                          {product.share.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 라인별 탭 */}
        <TabsContent value="line">
          {/* 라인별 탭 필터 영역 */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">기준 기간</span>
                  <input
                    type="month"
                    value={basePeriod}
                    onChange={(e) => setBasePeriod(e.target.value)}
                    className="h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>대상 매장</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {storeOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>라인별 (여/남/키즈) 매출 추이 ({periodLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={lineCompositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis
                    stroke="#9ca3af"
                    tickFormatter={(value) => `${value / 1000000}M`}
                  />
                  <Tooltip
                    formatter={(value: number) => `₩${(value / 1000000).toFixed(1)}M`}
                  />
                  <Legend />
                  <Bar dataKey="남성" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="여성" stackId="a" fill="#a855f7" />
                  <Bar dataKey="키즈" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>라인별 TOP 30 상품</CardTitle>
                <span className="text-xs text-gray-400">
                  기준 기간: {basePeriod} / 대상 매장 기준
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>순위 구간</span>
                <select
                  value={lineTopPage}
                  onChange={(e) => setLineTopPage(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value={1}>1~10위</option>
                  <option value={2}>11~20위</option>
                  <option value={3}>21~30위</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {lineTopError && (
                <p className="text-xs text-red-500 mb-2">{lineTopError}</p>
              )}
              {lineTopLoading && !lineTopError && (
                <p className="text-xs text-gray-400 mb-2">
                  라인별 TOP 30 상품 데이터를 불러오는 중입니다...
                </p>
              )}
              {pagedLineTopProducts.length === 0 &&
              !lineTopLoading &&
              !lineTopError ? (
                <p className="text-xs text-gray-400">
                  표시할 라인별 TOP 30 상품 데이터가 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">순위</TableHead>
                      <TableHead className="w-24">라인</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">판매수</TableHead>
                      <TableHead className="text-right">점유율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLineTopProducts.map((product) => (
                      <TableRow key={product.rank}>
                        <TableCell className="text-center">
                          {product.rank}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">
                          {product.line || "-"}
                        </TableCell>
                        <TableCell>{product.prodNm || product.prodId}</TableCell>
                        <TableCell className="text-right">
                          ₩{(product.sales / 1_000_000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right">
                          {product.qty.toLocaleString()}개
                        </TableCell>
                        <TableCell className="text-right">
                          {product.share.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이벤트별 탭 */}
        <TabsContent value="event">
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    이벤트별 매출 실적 조회
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>이벤트</span>
                  <select
                    value={selectedEventId ?? ""}
                    onChange={(e) =>
                      setSelectedEventId(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">전체 이벤트</option>
                    {discountEvents.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventNm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <CardHeader>
              <CardTitle>이벤트별 매출 요약</CardTitle>
            </CardHeader>
            <CardContent>
              {discountError && (
                <p className="text-xs text-red-500 mb-2">{discountError}</p>
              )}
              {!discountError && !discountSummary && discountLoading && (
                <p className="text-xs text-gray-400 mb-2">
                  이벤트별 매출 요약 데이터를 불러오는 중입니다...
                </p>
              )}
              {discountSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">기준 기간 총 매출</p>
                    <p className="font-semibold">
                      ₩{(discountSummary.totalSales / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">이벤트 매출</p>
                    <p className="font-semibold">
                      ₩{(discountSummary.eventSales / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">이벤트 매출 비중</p>
                    <p className="font-semibold">
                      {discountSummary.eventSalesShare.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">이벤트 거래 수</p>
                    <p className="font-semibold">
                      {discountSummary.eventOrders.toLocaleString()}건
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>이벤트별 TOP 30 상품</CardTitle>
                <span className="text-xs text-gray-400">
                  전체 점포 기준 / 선택 이벤트 매출 상위 상품
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {discountLoading && !discountError && (
                <p className="text-xs text-gray-400 mb-2">
                  이벤트별 TOP 30 상품 데이터를 불러오는 중입니다...
                </p>
              )}
              {discountTopProducts.length === 0 &&
              !discountLoading &&
              !discountError ? (
                <p className="text-xs text-gray-400">
                  표시할 이벤트별 TOP 30 상품 데이터가 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">순위</TableHead>
                      <TableHead className="w-28">카테고리</TableHead>
                      <TableHead className="w-24">라인</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">판매수</TableHead>
                      <TableHead className="text-right">점유율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountTopProducts.map((p) => (
                      <TableRow key={p.rank}>
                        <TableCell className="text-center">
                          {p.rank}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">
                          {p.category || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">
                          {p.line || "-"}
                        </TableCell>
                        <TableCell>{p.prodNm || p.prodId}</TableCell>
                        <TableCell className="text-right">
                          ₩{(p.sales / 1_000_000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right">
                          {p.qty.toLocaleString()}개
                        </TableCell>
                        <TableCell className="text-right">
                          {p.share.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
