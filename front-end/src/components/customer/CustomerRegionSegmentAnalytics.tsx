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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchRegionSegmentMetrics,
  fetchRegionSegmentTopCategories,
  fetchRegionSegmentTopProducts,
  fetchRegionSegmentTrend,
  RegionSegmentMetricsItem,
  RegionSegmentTopCategoryItem,
  RegionSegmentTopProductItem,
  RegionSegmentTrendItem,
} from "../../services/customerApi";

interface CustomerRegionSegmentAnalyticsProps {
  onNavigate: (page: Page, id?: string) => void;
}

const SEGMENT_OPTIONS = [
  { id: "ALL", name: "전체 세그먼트" },
  { id: "F01", name: "F01 · 우량고객" },
  { id: "F02", name: "F02 · 충성고객" },
  { id: "F03", name: "F03 · 일반고객" },
  { id: "F04", name: "F04 · 이탈위험" },
];

const REGION_FILTERS = ["ALL", "수도권+강원권", "충청권", "호남+제주권", "영남권"] as const;

// 세그먼트별 그래프 색상 (빨/주/노/초/파/핑/보/남 + 추가색 기준으로 강한 대비)
const SEGMENT_COLOR_MAP: Record<string, string> = {
  // 기본 8색
  Churned: "#DC2626", // 빨강
  "At-Risk (90+ days no purchase)": "#EA580C", // 주황
  "New Customers (Last 30 days)": "#EAB308", // 노랑
  "High-Value Loyal": "#16A34A", // 초록
  Active: "#2563EB", // 파랑
  "Newly Acquired": "#EC4899", // 핑크
  "Online First": "#7C3AED", // 보라
  // Active(파랑)과 더 잘 구분되도록, 남색 대신 청록 계열로 변경
  "Offline Heavy User": "#0F766E", // 청록(녹청색)
  // 추가 구분 색상
  "One-Timer": "#14B8A6", // 청록
};

// 그 외 세그먼트에 쓸 예비 팔레트 (서로 다른 계열 위주)
const SEGMENT_FALLBACK_COLORS: string[] = [
  "#F97316", // 강한 주황
  "#22C55E", // 라임 그린
  "#0EA5E9", // 하늘색
  "#A855F7", // 연보라
  "#F43F5E", // 진한 핑크/레드
];

interface RegionDistributionTooltipProps {
  active?: boolean;
  label?: string;
  payload?: any[];
}

const RegionDistributionTooltip = ({
  active,
  label,
  payload,
}: RegionDistributionTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .filter((p) => p && typeof p.value === "number" && p.value > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs min-w-[160px]">
      <div className="mb-1 font-semibold text-gray-800">권역: {label}</div>
      <table className="w-full border-t border-gray-100 pt-1">
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.dataKey}>
              <td className="pr-2 py-[1px] whitespace-nowrap">
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                  style={{ backgroundColor: entry.color }}
                />
                <span
                  className="align-middle font-medium"
                  style={{ color: entry.color }}
                >
                  {entry.name}
                </span>
              </td>
              <td className="text-right text-gray-900 py-[1px]">
                {Number(entry.value).toLocaleString()}명
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface SegmentTrendTooltipProps {
  active?: boolean;
  label?: string;
  payload?: any[];
}

const SegmentTrendTooltip = ({
  active,
  label,
  payload,
}: SegmentTrendTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .filter((p) => p && typeof p.value === "number")
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs min-w-[180px]">
      <div className="mb-1 font-semibold text-gray-800">
        기준월: {label}
      </div>
      <table className="w-full border-t border-gray-100 pt-1">
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.dataKey}>
              <td className="pr-2 py-[1px] whitespace-nowrap">
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                  style={{ backgroundColor: entry.color }}
                />
                <span
                  className="align-middle font-medium"
                  style={{ color: entry.color }}
                >
                  {entry.name}
                </span>
              </td>
              <td className="text-right text-gray-900 py-[1px]">
                {Number(entry.value).toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                M
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 text-[10px] text-gray-400">
        (단위: 월별 세그먼트 매출, 백만 단위)
      </div>
    </div>
  );
};

export function CustomerRegionSegmentAnalytics({
  onNavigate,
}: CustomerRegionSegmentAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<string>("combined");
  const [metricsItems, setMetricsItems] = useState<RegionSegmentMetricsItem[]>([]);
  const [trendItems, setTrendItems] = useState<RegionSegmentTrendItem[]>([]);
  const [topCategoryItems, setTopCategoryItems] = useState<RegionSegmentTopCategoryItem[]>([]);
  const [topProductItems, setTopProductItems] = useState<RegionSegmentTopProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [perMetric, setPerMetric] = useState<"amount" | "count" | "qty">(
    "amount",
  );
  const [topCategoryRegion, setTopCategoryRegion] = useState<string>("수도권+강원권");
  const [topCategorySegment, setTopCategorySegment] = useState<string>("Active");
  const [salesTrendRegion, setSalesTrendRegion] = useState<string>("ALL");
  const [perTrendRegion, setPerTrendRegion] = useState<string>("ALL");

  // 현재 데이터에서 등장하는 세그먼트 코드 목록 (정렬)
  const segmentKeys = useMemo(() => {
    const set = new Set<string>();
    metricsItems.forEach((m) => {
      const key = (m.segment || "기타").trim();
      if (key) set.add(key);
    });
    trendItems.forEach((t) => {
      const key = (t.segment || "기타").trim();
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [metricsItems, trendItems]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, trendRes, topCatRes, topProdRes] = await Promise.all([
          // 기간/권역/세그먼트 필터 없이 전체 시계열 기준으로 조회
          fetchRegionSegmentMetrics(),
          fetchRegionSegmentTrend(),
          fetchRegionSegmentTopCategories({ top_n: 3 }),
          fetchRegionSegmentTopProducts({ top_n: 3 }),
        ]);

        // 디버깅용 로그
        // eslint-disable-next-line no-console
        console.log("region-metrics", metricsRes);
        // eslint-disable-next-line no-console
        console.log("region-trend", trendRes);
        // eslint-disable-next-line no-console
        console.log("region-top-categories", topCatRes);
        // eslint-disable-next-line no-console
        console.log("region-top-products", topProdRes);

        setMetricsItems(metricsRes.items || []);
        setTrendItems(trendRes.items || []);
        setTopCategoryItems(topCatRes.items || []);
        setTopProductItems(topProdRes.items || []);
      } catch (e: any) {
        setError(e.message || "권역·세그먼트 분석 데이터를 불러오지 못했습니다.");
        setMetricsItems([]);
        setTrendItems([]);
        setTopCategoryItems([]);
        setTopProductItems([]);
        // eslint-disable-next-line no-console
        console.error("customer region/segment analytics load error", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredDistribution = useMemo(() => {
    return metricsItems;
  }, [metricsItems]);

  const stackedDistribution = useMemo(() => {
    // region 단위로 세그먼트별 고객 수를 쌓기 위해 변환
    const map: Record<string, any> = {};
    filteredDistribution.forEach((row) => {
      const segKey = (row.segment || "기타").trim() || "기타";
      if (!map[row.region]) {
        map[row.region] = { region: row.region };
      }
      map[row.region][segKey] = row.customerCount;
    });
    return Object.values(map);
  }, [filteredDistribution]);

  const filteredTrend = useMemo(() => {
    if (!trendItems.length) return [];

    // 월별·세그먼트별 매출 추이 (선택 권역 기준, ALL이면 전국 합산)
    const byMonth: Record<string, any> = {};
    trendItems.forEach((item) => {
      if (salesTrendRegion !== "ALL" && item.region !== salesTrendRegion) return;
      const key = item.month;
      const segKey = (item.segment || "기타").trim() || "기타";
      if (!byMonth[key]) {
        byMonth[key] = { month: item.month };
      }
      byMonth[key][segKey] =
        (byMonth[key][segKey] || 0) + item.sales / 1_000_000; // 금액 단위 M
    });
    return Object.values(byMonth).sort((a: any, b: any) =>
      a.month > b.month ? 1 : -1,
    );
  }, [trendItems, salesTrendRegion]);

  const filteredPerCustomer = useMemo(() => {
    return metricsItems.map((m) => ({
      region: m.region,
      segment: m.segment,
      avgAmount: m.avgAmountPerCustomer,
      avgPurchaseCount: m.avgPurchaseCount,
      avgQty: m.avgQtyPerCustomer,
    }));
  }, [metricsItems]);

  const topCategoryByRegion = useMemo(() => {
    const regions = ["수도권+강원권", "충청권", "호남+제주권", "영남권"];
    const result: Record<string, any[]> = {};

    regions.forEach((r) => {
      const regionItems = topCategoryItems.filter((item) => item.region === r);
      if (!regionItems.length) {
        result[r] = [];
        return;
      }

      const catSegMap: Record<string, Record<string, number>> = {};
      const catTotal: Record<string, number> = {};

      regionItems.forEach((item) => {
        const category = item.category || "기타";
        const seg = (item.segment || "기타").trim() || "기타";
        if (!catSegMap[category]) {
          catSegMap[category] = {};
        }
        catSegMap[category][seg] =
          (catSegMap[category][seg] || 0) + (item.sales || 0);
        catTotal[category] =
          (catTotal[category] || 0) + (item.sales || 0);
      });

      const topCats = Object.entries(catTotal)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))
        .slice(0, 3)
        .map(([category]) => {
          const row: any = { category };
          const segMap = catSegMap[category] || {};
          segmentKeys.forEach((seg) => {
            const v = segMap[seg];
            if (v != null && v !== 0) {
              row[seg] = v;
            }
          });
          return row;
        });

      result[r] = topCats;
    });

    return result;
  }, [topCategoryItems, segmentKeys]);

  const topProductByRegion = useMemo(() => {
    const regions = ["수도권+강원권", "충청권", "호남+제주권", "영남권"];
    const result: Record<string, any[]> = {};

    regions.forEach((r) => {
      const regionItems = topProductItems.filter((item) => item.region === r);
      if (!regionItems.length) {
        result[r] = [];
        return;
      }

      // 세그먼트별 TOP5 상품 기준으로, 상품명을 축으로 세그먼트별 매출을 쌓기
      const productSegMap: Record<string, Record<string, number>> = {};
      const orderedProducts: string[] = [];

      regionItems.forEach((item) => {
        if (item.rank && item.rank > 3) return; // TOP3까지만 사용
        const product = item.prodNm || "상품명 없음";
        const seg = (item.segment || "기타").trim() || "기타";
        if (!productSegMap[product]) {
          productSegMap[product] = {};
          orderedProducts.push(product);
        }
        productSegMap[product][seg] =
          (productSegMap[product][seg] || 0) + (item.sales || 0);
      });

      const rows = orderedProducts.map((product) => {
        const row: any = { product };
        const segMap = productSegMap[product] || {};
        segmentKeys.forEach((seg) => {
          const v = segMap[seg];
          if (v != null && v !== 0) {
            row[seg] = v;
          }
        });
        return row;
      });

      result[r] = rows;
    });

    return result;
  }, [topProductItems, segmentKeys]);

  const filteredTopProducts = useMemo(() => {
    return topProductItems;
  }, [topProductItems]);

  const activeSegment = selectedSegment || hoveredSegment;

  const perCustomerHeatmap = useMemo(() => {
    if (!filteredPerCustomer.length) {
      return {
        regions: [] as string[],
        segments: [] as string[],
        values: {} as Record<string, number | null>,
        min: 0,
        max: 0,
      };
    }

    const regions = Array.from(
      new Set(filteredPerCustomer.map((r) => r.region)),
    );
    const segments = Array.from(
      new Set(filteredPerCustomer.map((r) => r.segment)),
    );

    const values: Record<string, number | null> = {};
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    filteredPerCustomer.forEach((row) => {
      const key = `${row.region}||${row.segment}`;
      const v =
        perMetric === "amount"
          ? row.avgAmount
          : perMetric === "count"
          ? row.avgPurchaseCount
          : row.avgQty;
      values[key] = v;
      if (v != null && isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    });

    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 0;
    }

    return { regions, segments, values, min, max };
  }, [filteredPerCustomer, perMetric]);

  const perCustomerDrilldown = useMemo(() => {
    if (!selectedSegment) return [];

    const map: Record<string, number> = {};
    filteredPerCustomer.forEach((row) => {
      if (row.segment !== selectedSegment) return;
      const base =
        perMetric === "amount"
          ? row.avgAmount
          : perMetric === "count"
          ? row.avgPurchaseCount
          : row.avgQty;
      map[row.region] = base;
    });

    return Object.entries(map)
      .map(([region, value]) => ({ region, value }))
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [filteredPerCustomer, perMetric, selectedSegment]);

  const getHeatColor = (
    value: number | null | undefined,
    min: number,
    max: number,
  ) => {
    if (value == null || !isFinite(value) || max <= min) {
      return "#f9fafb";
    }
    const ratio = (value - min) / (max - min || 1);
    const alpha = 0.15 + ratio * 0.75; // 0.15 ~ 0.9
    return `rgba(37, 99, 235, ${alpha})`; // 파란색 계열
  };

  const perCustomerTrend = useMemo(() => {
    if (!trendItems.length) return [];

    type Agg = {
      month: string;
      segment: string;
      sales: number;
      orders: number;
      customers: number;
      qty: number;
    };

    const aggMap: Record<string, Agg> = {};
    trendItems.forEach((item) => {
      if (perTrendRegion !== "ALL" && item.region !== perTrendRegion) return;
      const segKey = (item.segment || "기타").trim() || "기타";
      const key = `${item.month}||${segKey}`;
      if (!aggMap[key]) {
        aggMap[key] = {
          month: item.month,
          segment: segKey,
          sales: 0,
          orders: 0,
          customers: 0,
          qty: 0,
        };
      }
      aggMap[key].sales += item.sales || 0;
      aggMap[key].orders += item.orders || 0;
      aggMap[key].customers += item.customers || 0;
      aggMap[key].qty += item.qty || 0;
    });

    const byMonth: Record<string, any> = {};
    Object.values(aggMap).forEach((rec) => {
      const key = rec.month;
      if (!byMonth[key]) {
        byMonth[key] = { month: rec.month };
      }
      const denom = rec.customers || 1;
      let v: number;
      if (perMetric === "amount") {
        v = rec.sales / denom;
      } else if (perMetric === "count") {
        v = rec.orders / denom;
      } else {
        v = rec.qty / denom;
      }
      byMonth[key][rec.segment] = v;
    });

    return Object.values(byMonth).sort((a: any, b: any) =>
      a.month > b.month ? 1 : -1,
    );
  }, [trendItems, perMetric, perTrendRegion]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">권역·세그먼트별 고객 분석</h1>
        <p className="text-gray-500">
          전국 기준으로 권역·세그먼트별 고객 분포와 월별 매출 추이, 1인당 구매
          지표, TOP 카테고리/상품을 시각적으로 확인합니다.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      {/* 공통 세그먼트 범례 – 페이지 상단 고정 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="combined">권역별 세그먼트 분포 및 매출 추이</TabsTrigger>
          <TabsTrigger value="per-customer">1인당 구매 지표</TabsTrigger>
          <TabsTrigger value="top-category">TOP 카테고리</TabsTrigger>
          <TabsTrigger value="top-product">TOP 상품</TabsTrigger>
        </TabsList>

        {/* 공통 세그먼트 선택 pill – 탭 바로 아래 */}
        {segmentKeys.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3 justify-center text-xs">
            {segmentKeys.map((seg, idx) => {
              const color =
                SEGMENT_COLOR_MAP[seg] ||
                SEGMENT_FALLBACK_COLORS[idx % SEGMENT_FALLBACK_COLORS.length];
              const isActive = activeSegment === seg;
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() =>
                    setSelectedSegment((prev) => (prev === seg ? null : seg))
                  }
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="align-middle font-medium"
                    style={{
                      color: isActive ? "#ffffff" : color,
                    }}
                  >
                    {seg}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 탭 1: 권역별 세그먼트 분포 + 매출 추이 */}
        <TabsContent value="combined">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>권역별 세그먼트 분포 (고객 수 기준)</CardTitle>
            </CardHeader>
            <CardContent>
              {stackedDistribution.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                  데이터가 없습니다.
                </div>
              ) : (
                <div className="h-[360px] overflow-x-auto">
                  <BarChart
                    width={800}
                    height={340}
                    data={stackedDistribution}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="region" stroke="#9ca3af" />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<RegionDistributionTooltip />} />
                    <Legend
                      onClick={(o: any) => {
                        const key = (o?.dataKey || o?.value) as string;
                        setSelectedSegment((prev) =>
                          prev === key ? null : key,
                        );
                      }}
                    />
                    {segmentKeys.map((seg, idx) => (
                      <Bar
                        key={seg}
                        dataKey={seg}
                        stackId="customers"
                        name={seg}
                        fill={
                          SEGMENT_COLOR_MAP[seg] ||
                          SEGMENT_FALLBACK_COLORS[
                            idx % SEGMENT_FALLBACK_COLORS.length
                          ]
                        }
                        onMouseOver={() => setHoveredSegment(seg)}
                        onMouseOut={() => setHoveredSegment(null)}
                        opacity={
                          activeSegment && activeSegment !== seg ? 0.25 : 1
                        }
                      />
                    ))}
                  </BarChart>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>
                권역·세그먼트별 월별 매출 추이{" "}
                <span className="text-xs text-gray-500 ml-2">
                  (
                  {salesTrendRegion === "ALL"
                    ? "전국 기준"
                    : `${salesTrendRegion} 기준`}
                  )
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">권역</span>
                  <div className="flex flex-wrap gap-1">
                    {REGION_FILTERS.map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={salesTrendRegion === r ? "default" : "outline"}
                        className={salesTrendRegion === r ? "bg-gray-900" : ""}
                        onClick={() => setSalesTrendRegion(r)}
                      >
                        {r === "ALL" ? "전국" : r}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400">
                  권역을 변경하면 해당 권역 기준으로 세그먼트별 월별 매출 추이를
                  확인할 수 있습니다.
                </div>
              </div>

              {filteredTrend.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                  데이터가 없습니다.
                </div>
              ) : (
                <div className="h-[360px] overflow-x-auto">
                  <LineChart
                    width={800}
                    height={340}
                    data={filteredTrend}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(v) => `${v.toLocaleString()}M`}
                    />
                    <Tooltip content={<SegmentTrendTooltip />} />
                    <Legend
                      onClick={(o: any) => {
                        const key = (o?.dataKey || o?.value) as string;
                        setSelectedSegment((prev) =>
                          prev === key ? null : key,
                        );
                      }}
                    />
                    {segmentKeys.map((seg, idx) => (
                      <Line
                        key={seg}
                        type="monotone"
                        dataKey={seg}
                        name={seg}
                        stroke={
                          SEGMENT_COLOR_MAP[seg] ||
                          SEGMENT_FALLBACK_COLORS[
                            idx % SEGMENT_FALLBACK_COLORS.length
                          ]
                        }
                        strokeWidth={activeSegment === seg ? 3 : 1.5}
                        opacity={
                          activeSegment && activeSegment !== seg ? 0.25 : 1
                        }
                        onMouseOver={() => setHoveredSegment(seg)}
                        onMouseOut={() => setHoveredSegment(null)}
                      />
                    ))}
                  </LineChart>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탭 3: 1인당 구매 지표 */}
        <TabsContent value="per-customer">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>권역·세그먼트별 1인당 평균 구매 지표</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Heatmap + 지표 토글 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPerMetric("amount")}
                    className={`px-3 py-1 rounded-full border transition-colors ${
                      perMetric === "amount"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    1인당 구매액
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerMetric("count")}
                    className={`px-3 py-1 rounded-full border transition-colors ${
                      perMetric === "count"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    1인당 구매횟수
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerMetric("qty")}
                    className={`px-3 py-1 rounded-full border transition-colors ${
                      perMetric === "qty"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    1인당 구매수량
                  </button>
                </div>
                <div className="text-[11px] text-gray-400">
                  색이 진할수록 선택한 지표 값이 높은 권역·세그먼트 조합입니다.
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="min-w-[540px] text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b border-gray-200 px-2 py-2 text-left bg-gray-50">
                        권역
                      </th>
                      {perCustomerHeatmap.segments.map((seg, idx) => {
                        const color =
                          SEGMENT_COLOR_MAP[seg] ||
                          SEGMENT_FALLBACK_COLORS[
                            idx % SEGMENT_FALLBACK_COLORS.length
                          ];
                        const isActive = selectedSegment === seg;
                        return (
                          <th
                            key={seg}
                            onClick={() =>
                              setSelectedSegment((prev) =>
                                prev === seg ? null : seg,
                              )
                            }
                            className={`border-b border-gray-200 px-2 py-2 text-center whitespace-nowrap cursor-pointer transition-colors ${
                              isActive
                                ? "bg-gray-900 text-white"
                                : "bg-gray-50 hover:bg-gray-100"
                            }`}
                            style={{
                              color: isActive ? "#ffffff" : color,
                            }}
                          >
                            {seg}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {perCustomerHeatmap.regions.map((region) => (
                      <tr key={region}>
                        <td className="border-b border-gray-100 px-2 py-2 text-left font-medium text-gray-700 bg-white sticky left-0">
                          {region}
                        </td>
                        {perCustomerHeatmap.segments.map((seg) => {
                          const key = `${region}||${seg}`;
                          const v = perCustomerHeatmap.values[key] ?? null;
                          const bg = getHeatColor(
                            v,
                            perCustomerHeatmap.min,
                            perCustomerHeatmap.max,
                          );
                          const display =
                            v == null
                              ? "-"
                              : perMetric === "amount"
                              ? `₩${Math.round(v).toLocaleString()}`
                              : perMetric === "count"
                              ? `${v.toFixed(1)}회`
                              : `${v.toFixed(1)}개`;
                          return (
                            <td
                              key={key}
                              className="border-b border-gray-100 px-2 py-2 text-center text-[11px]"
                              style={{ backgroundColor: bg }}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {perCustomerHeatmap.regions.length === 0 && (
                      <tr>
                        <td
                          colSpan={perCustomerHeatmap.segments.length + 1}
                          className="py-8 text-center text-gray-400"
                        >
                          데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </CardContent>
          </Card>

          {/* 세그먼트별 권역 비교 차트 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>
                세그먼트별 권역 비교
                <span className="text-xs text-gray-500 ml-2">
                  (상단 Heatmap에서 세그먼트명을 클릭해 선택)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSegment ? (
                <p className="text-xs text-gray-400">
                  세그먼트를 선택하면 해당 세그먼트의 권역별 1인당 지표를 그래프로
                  확인할 수 있습니다.
                </p>
              ) : perCustomerDrilldown.length === 0 ? (
                <p className="text-xs text-gray-400">
                  선택한 세그먼트에 대한 데이터가 없습니다.
                </p>
              ) : (
                <div className="h-[320px] overflow-x-auto">
                  <BarChart
                    width={720}
                    height={280}
                    data={perCustomerDrilldown}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="region" stroke="#9ca3af" />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(v) =>
                        perMetric === "amount"
                          ? `₩${Math.round(v / 1000).toLocaleString()}k`
                          : perMetric === "count"
                          ? `${v.toFixed(1)}회`
                          : `${v.toFixed(1)}개`
                      }
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        perMetric === "amount"
                          ? `₩${Math.round(value).toLocaleString()}`
                          : perMetric === "count"
                          ? `${(value as number).toFixed(2)}회`
                          : `${(value as number).toFixed(2)}개`
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name={
                        perMetric === "amount"
                          ? `1인당 구매액 (${selectedSegment})`
                          : perMetric === "count"
                          ? `1인당 구매횟수 (${selectedSegment})`
                          : `1인당 구매수량 (${selectedSegment})`
                      }
                      fill={
                        SEGMENT_COLOR_MAP[selectedSegment] ||
                        "#2563EB"
                      }
                    />
                  </BarChart>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 세그먼트별 1인당 지표 월별 추이 */}
          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <CardTitle>
                세그먼트별 1인당 지표 월별 추이{" "}
                <span className="text-xs text-gray-500 ml-2">
                  (
                  {perTrendRegion === "ALL"
                    ? "전국 기준"
                    : `${perTrendRegion} 기준`}
                  )
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">권역</span>
                  <div className="flex flex-wrap gap-1">
                    {REGION_FILTERS.map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={perTrendRegion === r ? "default" : "outline"}
                        className={perTrendRegion === r ? "bg-gray-900" : ""}
                        onClick={() => setPerTrendRegion(r)}
                      >
                        {r === "ALL" ? "전국" : r}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400">
                  권역을 변경하면 해당 권역 기준으로 세그먼트별 1인당 지표 추이를
                  확인할 수 있습니다.
                </div>
              </div>

              {perCustomerTrend.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                  데이터가 없습니다.
                </div>
              ) : (
                <div className="h-[360px] overflow-x-auto">
                  <LineChart
                    width={800}
                    height={340}
                    data={perCustomerTrend}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(v) =>
                        perMetric === "amount"
                          ? `${Math.round(v / 10000).toLocaleString()}만`
                          : perMetric === "count"
                          ? `${v.toFixed(1)}회`
                          : `${v.toFixed(1)}개`
                      }
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const v = Number(value);
                        if (perMetric === "amount") {
                          return [
                            `₩${Math.round(v).toLocaleString()}`,
                            name,
                          ];
                        }
                        if (perMetric === "count") {
                          return [`${v.toFixed(2)}회`, name];
                        }
                        return [`${v.toFixed(2)}개`, name];
                      }}
                    />
                    <Legend
                      onClick={(o: any) => {
                        const key = (o?.dataKey || o?.value) as string;
                        setSelectedSegment((prev) =>
                          prev === key ? null : key,
                        );
                      }}
                    />
                    {segmentKeys.map((seg, idx) => (
                      <Line
                        key={seg}
                        type="monotone"
                        dataKey={seg}
                        name={seg}
                        stroke={
                          SEGMENT_COLOR_MAP[seg] ||
                          SEGMENT_FALLBACK_COLORS[
                            idx % SEGMENT_FALLBACK_COLORS.length
                          ]
                        }
                        strokeWidth={activeSegment === seg ? 3 : 1.5}
                        opacity={
                          activeSegment && activeSegment !== seg ? 0.25 : 1
                        }
                        onMouseOver={() => setHoveredSegment(seg)}
                        onMouseOut={() => setHoveredSegment(null)}
                      />
                    ))}
                  </LineChart>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탭 4: TOP 카테고리 */}
        <TabsContent value="top-category">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>권역별 세그먼트별 TOP3 카테고리</CardTitle>
              <p className="mt-1 text-xs text-gray-500">
                각 권역에서 세그먼트 기준으로 매출 상위 3개 카테고리를 가로 막대
                그래프로 비교합니다.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {["수도권+강원권", "충청권", "호남+제주권", "영남권"].map(
                  (region) => {
                    const data = topCategoryByRegion[region] || [];
                    return (
                      <div
                        key={region}
                        className="border border-gray-100 rounded-lg p-4 bg-white"
                      >
                        <div className="text-sm font-semibold text-gray-800 mb-2">
                          {region} 세그먼트별 TOP3 카테고리
                        </div>
                        {data.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            데이터가 없습니다.
                          </p>
                        ) : (
                          <BarChart
                            layout="vertical"
                            width={520}
                            height={260}
                            data={data}
                            margin={{
                              top: 10,
                              right: 20,
                              left: 80,
                              bottom: 20,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                              vertical={false}
                            />
                            <XAxis
                              type="number"
                              stroke="#9ca3af"
                              tickFormatter={(v) =>
                                `₩${Math.round(
                                  (v as number) / 100000000,
                                ).toLocaleString()}억`
                              }
                            />
                            <YAxis
                              type="category"
                              dataKey="category"
                              stroke="#9ca3af"
                              width={80}
                            />
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                `₩${Number(value).toLocaleString()}`,
                                name,
                              ]}
                            />
                            {segmentKeys.map((seg, idx) => (
                              <Bar
                                key={seg}
                                dataKey={seg}
                                name={seg}
                                barSize={10}
                                radius={[2, 2, 2, 2]}
                                fill={
                                  SEGMENT_COLOR_MAP[seg] ||
                                  SEGMENT_FALLBACK_COLORS[
                                    idx % SEGMENT_FALLBACK_COLORS.length
                                  ]
                                }
                                onMouseOver={() => setHoveredSegment(seg)}
                                onMouseOut={() => setHoveredSegment(null)}
                                opacity={
                                  activeSegment && activeSegment !== seg
                                    ? 0.25
                                    : 1
                                }
                              />
                            ))}
                          </BarChart>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탭 5: TOP 상품 */}
        <TabsContent value="top-product">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle>권역별 세그먼트별 구매 TOP5 상품</CardTitle>
              <p className="mt-1 text-xs text-gray-500">
                각 권역에서 세그먼트 기준으로 매출 상위 5개 상품을 가로 막대 그래프로
                비교합니다.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {["수도권+강원권", "충청권", "호남+제주권", "영남권"].map(
                  (region) => {
                    const baseData = topProductByRegion[region] || [];
                    const filteredForActive =
                      activeSegment &&
                      baseData.some(
                        (row) =>
                          row[activeSegment] != null && row[activeSegment] !== 0,
                      )
                        ? baseData.filter(
                            (row) =>
                              row[activeSegment] != null &&
                              row[activeSegment] !== 0,
                          )
                        : baseData;
                    const data = filteredForActive;
                    const rowCount = data.length || 1;
                    const chartHeight = 80 + rowCount * 40;
                    return (
                      <div
                        key={region}
                        className="border border-gray-100 rounded-lg p-4 bg-white"
                      >
                        <div className="text-sm font-semibold text-gray-800 mb-2">
                          {region} 세그먼트별 TOP5 상품
                        </div>
                        {data.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            데이터가 없습니다.
                          </p>
                        ) : (
                          <BarChart
                            layout="vertical"
                            width={660}
                            height={chartHeight}
                            data={data}
                            margin={{
                              top: 16,
                              right: 20,
                              left: 220,
                              bottom: 20,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f0f0f0"
                              vertical={false}
                            />
                            <XAxis
                              type="number"
                              stroke="#9ca3af"
                              tickFormatter={(v) =>
                                `₩${Math.round(
                                  (v as number) / 1000000,
                                ).toLocaleString()}만`
                              }
                            />
                            <YAxis
                              type="category"
                              dataKey="product"
                              stroke="#9ca3af"
                              width={220}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                `₩${Number(value).toLocaleString()}`,
                                name,
                              ]}
                            />
                            {segmentKeys.map((seg, idx) => (
                              <Bar
                                key={seg}
                                dataKey={seg}
                                name={seg}
                                barSize={12}
                                radius={[2, 2, 2, 2]}
                                fill={
                                  SEGMENT_COLOR_MAP[seg] ||
                                  SEGMENT_FALLBACK_COLORS[
                                    idx % SEGMENT_FALLBACK_COLORS.length
                                  ]
                                }
                                onMouseOver={() => setHoveredSegment(seg)}
                                onMouseOut={() => setHoveredSegment(null)}
                                opacity={
                                  activeSegment && activeSegment !== seg
                                    ? 0.25
                                    : 1
                                }
                              />
                            ))}
                          </BarChart>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


