import { useEffect, useMemo, useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Filter } from "lucide-react";
import {
  fetchSalesTrendCompare,
  SalesTrendCompareResponse,
  fetchSalesCategoryCompare,
  SalesCategoryCompareResponse,
} from "../../services/salesApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface SalesAnalyticsSummaryProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
  /** 대시보드 등에서 넘어온 초기 기준 월(YYYY-MM). 없으면 기본값 사용 */
  initialBaseMonth?: string;
  /** 대시보드 등에서 넘어온 초기 점포 ID. 없으면 'all' */
  initialStoreId?: string;
}

type CompareMode = "전년 동기간" | "전월 동기간";

// 더미 데이터(초기 로딩용): 기준 기간 vs 비교 기간 일별 매출
const fallbackTrendCompareData = [
  { day: "1일", base: 1800000, compare: 1500000 },
  { day: "2일", base: 1900000, compare: 1550000 },
  { day: "3일", base: 2100000, compare: 1700000 },
  { day: "4일", base: 2050000, compare: 1680000 },
  { day: "5일", base: 2300000, compare: 1850000 },
  { day: "6일", base: 2500000, compare: 1900000 },
  { day: "7일", base: 2600000, compare: 2000000 },
  { day: "8일", base: 2550000, compare: 1950000 },
  { day: "9일", base: 2700000, compare: 2050000 },
  { day: "10일", base: 3000000, compare: 2200000 },
  { day: "11일", base: 3100000, compare: 2300000 },
  { day: "12일", base: 2950000, compare: 2250000 },
  { day: "13일", base: 3200000, compare: 2400000 },
  { day: "14일", base: 3400000, compare: 2550000 },
  { day: "15일", base: 3600000, compare: 2600000 },
];

// 더미 데이터(초기 로딩용): 기간 요약 비교
const fallbackPeriodSummaryData = [
  { label: "전년 동월", sales: 88000000, orders: 3200, aov: 27500 },
  { label: "전월", sales: 95000000, orders: 3400, aov: 28000 },
  { label: "이번 달", sales: 110000000, orders: 3800, aov: 29000 },
];

// 더미 데이터(초기 로딩용): 라인별 기준/비교 매출
const fallbackLineCompareData = [
  { line: "남성", base: 42000000, compare: 36000000 },
  { line: "여성", base: 48000000, compare: 41000000 },
  { line: "키즈", base: 20000000, compare: 17000000 },
];

// 더미 데이터: 카테고리별 전년/올해 매출 (초기 렌더링용)
const fallbackCategoryLastYear = [
  { category: "티셔츠", amount: 18000000 },
  { category: "셔츠", amount: 14000000 },
  { category: "바지", amount: 16000000 },
  { category: "아우터", amount: 20000000 },
  { category: "이너", amount: 8000000 },
];

const fallbackCategoryThisYear = [
  { category: "티셔츠", amount: 22000000 },
  { category: "셔츠", amount: 15500000 },
  { category: "바지", amount: 18500000 },
  { category: "아우터", amount: 23000000 },
  { category: "이너", amount: 9000000 },
];

// Power BI 지도 시각화 URL (추후 .env 로 분리 가능)
const powerBiMapUrl =
  (import.meta as any).env?.VITE_POWERBI_STORE_MAP_URL || "";

const formatCurrency = (v: number) =>
  `₩${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const GRAY_BAR = "#d1d5db"; // 전년/전월 막대 공통 색상
const METRIC_COLOR_SALES = "#3b82f6"; // 파란색
const METRIC_COLOR_ORDERS = "#eab308"; // 노란색
const METRIC_COLOR_AOV = "#ef4444"; // 빨간색

const LINE_COLOR_NAVY = "#1e3a8a"; // 남성
const LINE_COLOR_PINK = "#ec4899"; // 여성
const LINE_COLOR_GREEN = "#22c55e"; // 키즈

// 카테고리 도넛용 팔레트: 빨주노초파남보 7색 + 추가 2색
const CATEGORY_PALETTE = [
  "#ef4444", // 빨강
  "#f97316", // 주황
  "#eab308", // 노랑
  "#22c55e", // 초록
  "#3b82f6", // 파랑
  "#6366f1", // 남(인디고)
  "#8b5cf6", // 보라
  "#14b8a6", // 청록
  "#92400e", // 브라운
];

export function SalesAnalyticsSummary({
  onNavigate,
  initialBaseMonth,
  initialStoreId,
}: SalesAnalyticsSummaryProps) {
  const [compareMode, setCompareMode] = useState<CompareMode>("전년 동기간");
  const [metricTab, setMetricTab] = useState<"매출" | "건수" | "객단가">("매출");

  const [basePeriod, setBasePeriod] = useState<string>(
    initialBaseMonth || "2025-09"
  );
  const [trendData, setTrendData] = useState(fallbackTrendCompareData);
  const [summaryData, setSummaryData] = useState(fallbackPeriodSummaryData);
  const [lineData, setLineData] = useState(fallbackLineCompareData);
  const [categoryLastYear, setCategoryLastYear] = useState(
    fallbackCategoryLastYear
  );
  const [categoryThisYear, setCategoryThisYear] = useState(
    fallbackCategoryThisYear
  );
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string>(initialStoreId || "all");
  // 최대 5개 점포까지 선택해서 일별 추이를 비교하기 위한 상태
  const [compareStoreIds, setCompareStoreIds] = useState<string[]>([]);
  const [compareStoreTrends, setCompareStoreTrends] = useState<
    Record<
      string,
      {
        day: string;
        amount: number;
      }[]
    >
  >({});
  const [loading, setLoading] = useState(false);

  const handleOpenPowerBI = () => {
    if (!powerBiMapUrl) return;
    window.open(powerBiMapUrl, "_blank");
  };

  const handleGoToSalesList = () => {
    if (!basePeriod) {
      onNavigate("sales-list");
      return;
    }
    const [yearStr, monthStr] = basePeriod.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) {
      onNavigate("sales-list");
      return;
    }
    const lastDay = new Date(year, month, 0).getDate();
    const dateFrom = `${basePeriod}-01`;
    const dateTo = `${basePeriod}-${String(lastDay).padStart(2, "0")}`;
    onNavigate("sales-list", undefined, { dateFrom, dateTo });
  };

  // 기준 월 input 변경 시 상태 업데이트
  const handleBasePeriodChange = (value: string) => {
    setBasePeriod(value || "2025-09");
  };

  // 비교 점포 토글 (최대 5개까지)
  const toggleCompareStore = (id: string) => {
    setCompareStoreIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 5) {
        return prev; // 최대 5개
      }
      return [...prev, id];
    });
  };

  // DB 연동: 매출 추세 비교 데이터 로딩
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (basePeriod) {
          params.base_month = basePeriod;
        }
        // 비교 기준: 전년 동기간 / 전월 동기간
        if (compareMode === "전년 동기간") {
          params.compare_mode = "prev_year";
        } else {
          params.compare_mode = "prev_month";
        }
        if (storeId !== "all") {
          params.store_id = storeId;
        }

        const [trendRes, categoryRes]: [
          SalesTrendCompareResponse,
          SalesCategoryCompareResponse
        ] = await Promise.all([
          fetchSalesTrendCompare(params),
          fetchSalesCategoryCompare(params),
        ]);

        // 일별 추세
        const trend = trendRes.trend.map((p) => ({
          day: p.label,
          base: p.base,
          compare: p.compare,
        }));
        setTrendData(trend);

        // 기간 요약: [비교 기간, 기준 기간] 형태를 유지
        const mappedSummary =
          trendRes.summary.length >= 2
            ? trendRes.summary.map((s) => ({
                label: s.label,
                sales: s.sales,
                orders: s.orders,
                aov: s.aov,
              }))
            : fallbackPeriodSummaryData;
        setSummaryData(mappedSummary);

        // 라인별 비교
        const mappedLine =
          trendRes.lineCompare.length > 0
            ? trendRes.lineCompare.map((l) => ({
                line: l.line || "기타",
                base: l.baseAmount,
                compare: l.compareAmount,
              }))
            : fallbackLineCompareData;
        setLineData(mappedLine);

        // 카테고리별 비교
        if (categoryRes.categories && categoryRes.categories.length > 0) {
          const lastYearArr = categoryRes.categories.map((c) => ({
            category: c.category || "기타",
            amount: c.compareAmount,
          }));
          const thisYearArr = categoryRes.categories.map((c) => ({
            category: c.category || "기타",
            amount: c.baseAmount,
          }));
          setCategoryLastYear(lastYearArr);
          setCategoryThisYear(thisYearArr);
        } else {
          setCategoryLastYear(fallbackCategoryLastYear);
          setCategoryThisYear(fallbackCategoryThisYear);
        }
      } catch {
        // 실패 시 더미 데이터 유지
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [basePeriod, compareMode, storeId]);

  // 비교 점포용 일별 추이 로딩 (현재 기준 월/비교 기준과 동일하게)
  useEffect(() => {
    const loadCompareStores = async () => {
      if (!basePeriod || compareStoreIds.length === 0) {
        setCompareStoreTrends({});
        return;
      }

      try {
        const paramsBase: any = {
          base_month: basePeriod,
          compare_mode: compareMode === "전년 동기간" ? "prev_year" : "prev_month",
        };

        const results = await Promise.all(
          compareStoreIds.map(async (sid) => {
            const res = await fetchSalesTrendCompare({
              ...paramsBase,
              store_id: sid,
            });
            const trendArr = res.trend.map((p) => ({
              day: p.label,
              amount: p.base,
            }));
            return { storeId: sid, trend: trendArr };
          })
        );

        const next: typeof compareStoreTrends = {};
        for (const item of results) {
          next[item.storeId] = item.trend;
        }
        setCompareStoreTrends(next);
      } catch {
        // 비교 점포 로딩 실패 시에는 기존 데이터 유지
      }
    };

    loadCompareStores();
  }, [basePeriod, compareMode, compareStoreIds]);

  // 매장 목록 로딩 (최초 1회)
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        setStores(res.items || []);
      } catch {
        // 매장 목록 실패 시에도 화면은 동작해야 하므로 무시
      }
    };
    loadStores();
  }, []);

  // 점포 ID -> 점포명 매핑
  const storeNameMap: Record<string, string> = {};
  stores.forEach((s) => {
    storeNameMap[s.storeId] = s.storeNm || s.storeId;
  });

  // 점포를 권역별로 그룹화
  type RegionKey =
    | "seoulIncheon"
    | "gyeonggi"
    | "chungcheong"
    | "honam"
    | "yeongnam"
    | "gangwonJeju"
    | "others";

  const regionLabels: Record<RegionKey, string> = {
    seoulIncheon: "서울·인천",
    gyeonggi: "경기권",
    chungcheong: "충청권",
    honam: "호남권",
    yeongnam: "영남권",
    gangwonJeju: "강원·제주",
    others: "기타",
  };

  const getRegionKey = (storeNm?: string | null): RegionKey => {
    const name = (storeNm || "").toLowerCase();
    if (name.includes("서울") || name.includes("인천")) return "seoulIncheon";
    if (name.includes("경기")) return "gyeonggi";
    if (name.includes("충청") || name.includes("대전") || name.includes("세종"))
      return "chungcheong";
    if (name.includes("광주") || name.includes("전주") || name.includes("전라"))
      return "honam";
    if (
      name.includes("부산") ||
      name.includes("대구") ||
      name.includes("울산") ||
      name.includes("경상")
    )
      return "yeongnam";
    if (name.includes("강원") || name.includes("제주")) return "gangwonJeju";
    return "others";
  };

  const storesByRegion = useMemo(() => {
    const map: Record<RegionKey, StoreListItem[]> = {
      seoulIncheon: [],
      gyeonggi: [],
      chungcheong: [],
      honam: [],
      yeongnam: [],
      gangwonJeju: [],
      others: [],
    };
    (stores || []).forEach((s) => {
      const key = getRegionKey(s.storeNm);
      map[key].push(s);
    });
    return map;
  }, [stores]);

  // 권역 토글용 활성 권역 상태
  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);

  // 최초/스토어 목록 변경 시, 데이터가 있는 첫 권역을 기본 선택
  useEffect(() => {
    if (activeRegion) return;
    const order: RegionKey[] = [
      "seoulIncheon",
      "gyeonggi",
      "chungcheong",
      "honam",
      "yeongnam",
      "gangwonJeju",
      "others",
    ];
    for (const key of order) {
      if (storesByRegion[key] && storesByRegion[key].length > 0) {
        setActiveRegion(key);
        break;
      }
    }
  }, [storesByRegion, activeRegion]);

  // 일별 추이 데이터에 비교 점포 라인을 병합
  const mergedTrendData = trendData.map((pt) => {
    const base = { ...pt } as any;
    compareStoreIds.forEach((sid) => {
      const trendArr = compareStoreTrends[sid] || [];
      const found = trendArr.find((t) => t.day === pt.day);
      base[`store_${sid}`] = found ? found.amount : 0;
    });
    return base;
  });

  const kpiCurrent = summaryData[summaryData.length - 1] ?? fallbackPeriodSummaryData[2];
  const kpiPrev =
    summaryData.length >= 2
      ? summaryData[0]
      : compareMode === "전년 동기간"
      ? fallbackPeriodSummaryData[0]
      : fallbackPeriodSummaryData[1];

  const salesGrowth = ((kpiCurrent.sales - kpiPrev.sales) / kpiPrev.sales) * 100;
  const orderGrowth = ((kpiCurrent.orders - kpiPrev.orders) / kpiPrev.orders) * 100;
  const aovGrowth = ((kpiCurrent.aov - kpiPrev.aov) / kpiPrev.aov) * 100;

  const compareLabelShort = compareMode === "전년 동기간" ? "전년 대비" : "전월 대비";
  const compareBaselineLabel =
    compareMode === "전년 동기간" ? "전년 동기간" : "전월 동기간";

  const isYoY = compareMode === "전년 동기간";
  const categoryBaseLabel = isYoY ? "전년" : "전월";
  const categoryCurrentLabel = isYoY ? "올해" : "이번";

  const metricDataKey = metricTab === "매출" ? "sales" : metricTab === "건수" ? "orders" : "aov";

  const metricYAxisFormatter =
    metricTab === "매출"
      ? (v: number) => `${(v / 1000000).toFixed(0)}M`
      : metricTab === "건수"
      ? (v: number) => `${(v / 1000).toFixed(0)}k`
      : (v: number) => v.toLocaleString();

  const metricTooltipFormatter =
    metricTab === "매출"
      ? (v: number) => formatCurrency(v)
      : metricTab === "건수"
      ? (v: number) => `${v.toLocaleString()}건`
      : (v: number) => `${v.toLocaleString()}원`;

  // 카테고리별 색상 매핑 (전년/올해 도넛 모두 동일한 색상 사용)
  const allCategoryNames = Array.from(
    new Set([
      ...categoryLastYear.map((c) => c.category),
      ...categoryThisYear.map((c) => c.category),
    ])
  );
  const categoryColorMap: Record<string, string> = {};
  allCategoryNames.forEach((name, idx) => {
    if (!name) return;
    categoryColorMap[name] = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
  });

  // 카테고리 도넛용 총액 (비율 계산용)
  const categoryLastYearTotal = useMemo(
    () =>
      categoryLastYear.reduce(
        (sum, item) => sum + (item.amount != null ? item.amount : 0),
        0,
      ),
    [categoryLastYear],
  );
  const categoryThisYearTotal = useMemo(
    () =>
      categoryThisYear.reduce(
        (sum, item) => sum + (item.amount != null ? item.amount : 0),
        0,
      ),
    [categoryThisYear],
  );

  // 일별 추세 그래프: 기준/비교 최고/최저점 계산
  const baseValues = trendData.map((d) => d.base);
  const compareValues = trendData.map((d) => d.compare);
  const baseMax = baseValues.length ? Math.max(...baseValues) : null;
  const baseMin = baseValues.length ? Math.min(...baseValues) : null;
  const compareMax = compareValues.length
    ? Math.max(...compareValues)
    : null;
  const compareMin = compareValues.length
    ? Math.min(...compareValues)
    : null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">매출 추세 비교</h1>
          <p className="text-gray-500">
            기준 기간과 선택한 비교 기준(전년/전월)의 매출 패턴을 한눈에 비교합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToSalesList}
          >
            판매내역 바로가기
          </Button>
        </div>
      </div>

      {/* 필터 영역 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">기준 기간</span>
              <input
                type="month"
                value={basePeriod}
                onChange={(e) => handleBasePeriodChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 mr-1">비교 기준</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={compareMode === "전년 동기간" ? "default" : "outline"}
                  onClick={() => setCompareMode("전년 동기간")}
                >
                  전년 동기간
                </Button>
                <Button
                  size="sm"
                  variant={compareMode === "전월 동기간" ? "default" : "outline"}
                  onClick={() => setCompareMode("전월 동기간")}
                >
                  전월 동기간
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">대상 매장</span>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">전체 매장</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeNm ? `${s.storeNm} (${s.storeId})` : s.storeId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상단 KPI 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-500">총 매출</span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  salesGrowth >= 0
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {compareLabelShort} {salesGrowth >= 0 ? "▲" : "▼"}{" "}
                {salesGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-lg text-gray-900 mb-1">
              {formatCurrency(kpiCurrent.sales)}
            </p>
            <p className="text-xs text-gray-400">
              기준: {compareBaselineLabel} {formatCurrency(kpiPrev.sales)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">거래 건수</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  orderGrowth >= 0
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {compareLabelShort} {orderGrowth >= 0 ? "▲" : "▼"}{" "}
                {orderGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-lg text-gray-900 mb-1">
              {kpiCurrent.orders.toLocaleString()}건
            </p>
            <p className="text-xs text-gray-400">
              기준: {compareBaselineLabel} {kpiPrev.orders.toLocaleString()}건
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">평균 객단가</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  aovGrowth >= 0
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {compareLabelShort} {aovGrowth >= 0 ? "▲" : "▼"}{" "}
                {aovGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-lg text-gray-900 mb-1">
              {Math.round(kpiCurrent.aov).toLocaleString()}원
            </p>
            <p className="text-xs text-gray-400">
              기준: {compareBaselineLabel} {Math.round(kpiPrev.aov).toLocaleString()}원
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {(() => {
              if (!lineData || lineData.length === 0) {
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        라인별 성장 포인트 (전년 대비)
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">데이터가 충분하지 않습니다.</p>
                    <p className="text-xs text-gray-400">
                      매출 데이터가 적재되면 라인별 성장 포인트가 자동으로 계산됩니다.
                    </p>
                  </>
                );
              }

              const totalBase = lineData.reduce((sum, l) => sum + l.base, 0);
              const totalPrev = lineData.reduce((sum, l) => sum + l.compare, 0);

              if (totalBase <= 0 || totalPrev <= 0) {
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        라인별 성장 포인트 (전년 대비)
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">전년 대비 비교 가능한 데이터가 없습니다.</p>
                    <p className="text-xs text-gray-400">
                      기준 기간과 전년 동기간 모두 매출이 존재할 때 성장 포인트를 표시합니다.
                    </p>
                  </>
                );
              }

              let best = lineData[0];
              let bestDelta = -Infinity;
              let bestShareBase = 0;
              let bestSharePrev = 0;

              lineData.forEach((l) => {
                const shareBase = l.base / totalBase;
                const sharePrev = l.compare / totalPrev;
                const delta = shareBase - sharePrev;
                if (delta > bestDelta) {
                  bestDelta = delta;
                  best = l;
                  bestShareBase = shareBase;
                  bestSharePrev = sharePrev;
                }
              });

              const deltaPct = bestDelta * 100;
              const baseSharePct = bestShareBase * 100;
              const prevSharePct = bestSharePrev * 100;

              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">라인별 성장 포인트</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        deltaPct >= 0
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {compareLabelShort} {deltaPct >= 0 ? "▲" : "▼"}{" "}
                      {deltaPct.toFixed(1)}%p
                    </span>
                  </div>
                  <p className="text-lg text-gray-900 mb-1">
                    {best.line} 라인 {baseSharePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    기준: {compareBaselineLabel} {prevSharePct.toFixed(1)}% → 올해{" "}
                    {baseSharePct.toFixed(1)}%
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* 메인: 일별 추세 비교 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 w-full">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              일별 매출 추세 비교
            </CardTitle>
            {/* 비교 점포 선택 (최대 5개) */}
            <div className="text-xs text-gray-500 flex flex-col gap-2 md:items-end">
              <span className="font-medium">
                비교 점포 (최대 5개) · 권역 선택 후 점포 선택
              </span>
              {/* 권역 선택 버튼들 */}
              <div className="flex flex-wrap gap-1 mb-1">
                {(
                  [
                    "seoulIncheon",
                    "gyeonggi",
                    "chungcheong",
                    "honam",
                    "yeongnam",
                    "gangwonJeju",
                  ] as RegionKey[]
                ).map((regionKey) => {
                  const list = storesByRegion[regionKey];
                  if (!list || list.length === 0) return null;
                  const isActive = activeRegion === regionKey;
                  return (
                    <button
                      key={regionKey}
                      type="button"
                      onClick={() => setActiveRegion(regionKey)}
                      className={`px-3 py-1 rounded-full border text-[11px] transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {regionLabels[regionKey]}
                    </button>
                  );
                })}
              </div>
              {/* 선택된 권역의 점포 목록 */}
              {activeRegion && storesByRegion[activeRegion] && (
                <div className="flex flex-wrap gap-1 max-w-[480px]">
                  {storesByRegion[activeRegion].map((s) => {
                    const active = compareStoreIds.includes(s.storeId);
                    const disabled = !active && compareStoreIds.length >= 5;
                    return (
                      <button
                        key={s.storeId}
                        type="button"
                        onClick={() => toggleCompareStore(s.storeId)}
                        disabled={disabled}
                        className={`px-2 py-1 rounded-full border text-[11px] transition-colors ${
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        } ${
                          disabled ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        {s.storeNm || s.storeId}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-xs text-gray-400 mb-2">
              매출 추세 데이터를 불러오는 중입니다...
            </p>
          )}
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={mergedTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                stroke="#9ca3af"
                tickLine={false}
                interval={3}
              />
              <YAxis
                stroke="#9ca3af"
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Legend />
              {/* 1. 대상 매장의 기준 기간 라인 (항상 표시) */}
              <Line
                type="monotone"
                dataKey="base"
                stroke="#3b82f6"
                strokeWidth={2.5}
                name="기준 기간(대상 매장)"
                dot={(props: any) => {
                  const { cx, cy, value } = props;
                  if (baseMax !== null && value === baseMax) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  if (baseMin !== null && value === baseMin) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return (
                    <circle cx={cx} cy={cy} r={2} fill="#3b82f6" stroke="none" />
                  );
                }}
              />
              {/* 2. 대상 매장의 전년/전월 동기간 라인 (항상 표시) */}
              <Line
                type="monotone"
                dataKey="compare"
                stroke="#9ca3af"
                strokeWidth={2}
                name={`대상 매장 · ${compareBaselineLabel}`}
                strokeDasharray="5 5"
                dot={(props: any) => {
                  const { cx, cy, value } = props;
                  if (compareMax !== null && value === compareMax) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  if (compareMin !== null && value === compareMin) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return (
                    <circle cx={cx} cy={cy} r={2} fill="#9ca3af" stroke="none" />
                  );
                }}
              />

              {/* 3. 비교 점포별 기준 기간 라인 (최대 5개) */}
              {compareStoreIds.map((sid, index) => {
                // 점포별 꺾은선 색상 팔레트 (서로 명확히 구분되도록)
                const colorPalette = [
                  "#0ea5e9", // 하늘색
                  "#22c55e", // 초록
                  "#f97316", // 주황
                  "#a855f7", // 보라
                  "#e11d48", // 진한 핑크
                ];
                const color = colorPalette[index % colorPalette.length];
                const dataKey = `store_${sid}`;
                const name = storeNameMap[sid] || sid;
                return (
                  <Line
                    key={sid}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    name={name}
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 하단: 기간 요약 + 라인별 비교 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 기간별 요약 비교 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>기간별 요약 비교</CardTitle>
            <div className="flex gap-2 text-xs">
              <Button
                size="sm"
                variant={metricTab === "매출" ? "default" : "outline"}
                onClick={() => setMetricTab("매출")}
              >
                매출
              </Button>
              <Button
                size="sm"
                variant={metricTab === "건수" ? "default" : "outline"}
                onClick={() => setMetricTab("건수")}
              >
                건수
              </Button>
              <Button
                size="sm"
                variant={metricTab === "객단가" ? "default" : "outline"}
                onClick={() => setMetricTab("객단가")}
              >
                객단가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  tickFormatter={metricYAxisFormatter}
                />
                <Tooltip
                  formatter={(value: any) =>
                    metricTooltipFormatter(Number(value))
                  }
                />
                <Bar dataKey={metricDataKey} radius={[4, 4, 0, 0]}>
                  {summaryData.map((_, index) => {
                    const isCurrent = index === summaryData.length - 1;
                    let color = GRAY_BAR;
                    if (isCurrent) {
                      color =
                        metricTab === "매출"
                          ? METRIC_COLOR_SALES
                          : metricTab === "건수"
                          ? METRIC_COLOR_ORDERS
                          : METRIC_COLOR_AOV;
                    }
                    return <Cell key={`summary-bar-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 라인별 기준/비교 매출 비교 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>
              라인별 매출 비교 (기준 vs {compareBaselineLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="line" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Bar
                  dataKey="compare"
                  name={compareBaselineLabel}
                  fill={GRAY_BAR}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="base"
                  name="기준 기간"
                  radius={[4, 4, 0, 0]}
                >
                  {lineData.map((item, index) => {
                    let color = LINE_COLOR_NAVY;
                    if (item.line === "여성") {
                      color = LINE_COLOR_PINK;
                    } else if (item.line === "키즈") {
                      color = LINE_COLOR_GREEN;
                    }
                    return <Cell key={`line-base-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 추가: 카테고리별 전년/올해 매출 비교 + 지점별 매출 지도 */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* 카테고리별 전년/올해 도넛 비교 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>
              카테고리별 매출 비교 (기준 vs {compareBaselineLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="h-64">
                <PieChart width={220} height={220}>
                  <Pie
                    data={categoryLastYear}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {categoryLastYear.map((entry) => {
                      const color =
                        (entry.category &&
                          categoryColorMap[entry.category]) ||
                        "#9ca3af";
                      return (
                        <Cell
                          key={entry.category}
                          fill={color}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => {
                      const amount = Number(v || 0);
                      const amountText = formatCurrency(amount);
                      const percentRaw =
                        categoryLastYearTotal > 0
                          ? (amount / categoryLastYearTotal) * 100
                          : null;
                      const percentText =
                        percentRaw != null
                          ? `${percentRaw.toFixed(1)}%`
                          : null;
                      const valueText = percentText
                        ? `${amountText} (${percentText})`
                        : amountText;
                      return [valueText, name];
                    }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-600"
                  >
                    {categoryBaseLabel}
                  </text>
                </PieChart>
              </div>
              <div className="h-64">
                <PieChart width={220} height={220}>
                  <Pie
                    data={categoryThisYear}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {categoryThisYear.map((entry) => {
                      const color =
                        (entry.category &&
                          categoryColorMap[entry.category]) ||
                        "#9ca3af";
                      return (
                        <Cell
                          key={entry.category}
                          fill={color}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => {
                      const amount = Number(v || 0);
                      const amountText = formatCurrency(amount);
                      const percentRaw =
                        categoryThisYearTotal > 0
                          ? (amount / categoryThisYearTotal) * 100
                          : null;
                      const percentText =
                        percentRaw != null
                          ? `${percentRaw.toFixed(1)}%`
                          : null;
                      const valueText = percentText
                        ? `${amountText} (${percentText})`
                        : amountText;
                      return [valueText, name];
                    }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-600"
                  >
                    {categoryCurrentLabel}
                  </text>
                </PieChart>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {categoryThisYear.map((c) => (
                <div key={c.category} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        (c.category && categoryColorMap[c.category]) ||
                        "#9ca3af",
                    }}
                  />
                  <span className="text-gray-600">{c.category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 지점별 매출 비교 - Power BI 지도 시각화 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>지점별 매출 비교 (Power BI 지도)</CardTitle>
            {powerBiMapUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenPowerBI}
              >
                시각화 크게 보기
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-72 border border-dashed border-gray-300 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
              {powerBiMapUrl ? (
                <iframe
                  src={powerBiMapUrl}
                  title="지점별 매출 지도"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <div className="text-center text-sm text-gray-500 px-4">
                  Power BI 지도 시각화 URL이 아직 설정되지 않았습니다.
                  <br />
                  <span className="text-xs">
                    .env 의 VITE_POWERBI_STORE_MAP_URL 값을 설정하면 이 영역에
                    실시간 지점별 매출 지도가 표시됩니다.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
