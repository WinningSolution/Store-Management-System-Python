import React, { useEffect, useMemo, useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
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
  fetchCustomerRetentionTrend,
  fetchCustomerCohortRetention,
  RetentionTrendItem,
  CohortRetentionItem,
} from "../../services/customerApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface SegmentPerformanceProps {
  onNavigate: (page: Page) => void;
}

const getColorClass = (value: number | null) => {
  if (value === null) return "bg-gray-100 text-gray-400";
  if (value === 100) return "bg-blue-600 text-white";
  if (value >= 50) return "bg-green-500 text-white";
  if (value >= 40) return "bg-green-400 text-white";
  if (value >= 30) return "bg-yellow-400 text-gray-900";
  if (value >= 20) return "bg-orange-400 text-white";
  return "bg-red-400 text-white";
};

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

export function SegmentPerformance({ onNavigate }: SegmentPerformanceProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  const [trendByStore, setTrendByStore] = useState<
    Record<string, RetentionTrendItem[]>
  >({});
  const [cohortItems, setCohortItems] = useState<CohortRetentionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const storeLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    (stores || []).forEach((s) => {
      m[s.storeId] = s.storeNm || s.storeId;
    });
    return m;
  }, [stores]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        setStoreError(null);
        const res = await fetchStores();
        setStores(res.items || []);
      } catch (e) {
        console.error(e);
        setStoreError("점포 목록을 불러오지 못했습니다.");
      }
    };
    loadStores();
  }, []);

  // 스토어 목록이 로딩되면 데이터가 있는 첫 권역을 기본 선택
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

  const loadRetentionAndCohort = async () => {
    try {
      setLoading(true);
      setError(null);

      // 항상 "전체 점포" 라인은 유지하고,
      // 여기에 선택된 점포들(최대 5개)을 추가해서 최대 6개 라인을 비교
      const idsToQuery = Array.from(
        new Set(["__ALL__", ...selectedStoreIds]),
      );

      const trendResults: Record<string, RetentionTrendItem[]> = {};

      await Promise.all(
        idsToQuery.map(async (id) => {
          const params =
            id === "__ALL__"
              ? {}
              : {
                  store_id: id,
                };
          const res = await fetchCustomerRetentionTrend(params);
          trendResults[id] = res.items || [];
        }),
      );

      setTrendByStore(trendResults);

      // 코호트는 선택된 첫 점포 기준(없으면 전체)
      const cohortStoreId = selectedStoreIds[0];
      const cohortParams = cohortStoreId ? { store_id: cohortStoreId } : {};
      const cohortRes = await fetchCustomerCohortRetention(cohortParams);
      setCohortItems(cohortRes.items || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "리텐션·코호트 데이터를 불러오지 못했습니다.");
      setTrendByStore({});
      setCohortItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetentionAndCohort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreIds]);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId);
      }
      if (prev.length >= 5) {
        setStoreError("점포는 최대 5개까지 선택할 수 있습니다.");
        return prev;
      }
      setStoreError(null);
      return [...prev, storeId];
    });
  };

  const clearStores = () => {
    setSelectedStoreIds([]);
    setStoreError(null);
  };

  // 라인차트용: month 기준으로 점포별 시계열 구성
  const retentionData = useMemo(() => {
    const map: Record<string, any> = {};

    const entries = Object.entries(trendByStore);
    entries.forEach(([key, items]) => {
      const label =
        key === "__ALL__" ? "전체 점포" : storeLabelById[key] || key;
      items.forEach((item) => {
        const row = (map[item.month] = map[item.month] || {
          month: item.month,
        });
        row[label] = Math.round(item.retentionRate * 100);
      });
    });

    return Object.values(map);
  }, [trendByStore, storeLabelById]);

  const lineKeys = useMemo(() => {
    const keys = new Set<string>();
    retentionData.forEach((row: any) => {
      Object.keys(row).forEach((k) => {
        if (k !== "month") keys.add(k);
      });
    });
    return Array.from(keys);
  }, [retentionData]);

  // 코호트 히트맵용: startMonth 별로 m0~m5 컬럼 구성
  const cohortData = useMemo(() => {
    const map: Record<string, any> = {};
    cohortItems.forEach((item) => {
      const row =
        (map[item.startMonth] =
          map[item.startMonth] || {
            cohort: item.startMonth,
            m0: null,
            m1: null,
            m2: null,
            m3: null,
            m4: null,
            m5: null,
          });
      const key = `m${item.period}` as "m0" | "m1" | "m2" | "m3" | "m4" | "m5";
      row[key] = Math.round(item.retention * 100);
    });
    return Object.values(map);
  }, [cohortItems]);

  const segmentColors = ["#a855f7", "#10b981", "#3b82f6", "#f97316", "#ef4444"];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">리텐션·코호트 분석</h1>
        <p className="text-gray-500">
          최초 구매월 기준 코호트를 사용해, 점포별 리텐션 추이와 코호트별
          재구매율을 비교합니다.
        </p>
      </div>

      {/* 점포 선택 필터 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>점포 선택 필터</CardTitle>
            <button
              type="button"
              onClick={clearStores}
              className="px-3 py-1 rounded-full border text-[11px] bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              전체 점포
            </button>
          </div>
          {storeError && (
            <p className="text-xs text-red-500 mt-2">{storeError}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 text-sm text-gray-600 w-full">
            {/* 권역 선택 버튼 */}
            <div className="flex flex-wrap gap-1">
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
            {/* 선택된 권역의 점포 칩 (최대 5개 선택) */}
            {activeRegion && storesByRegion[activeRegion] && (
              <div className="flex flex-wrap gap-1 max-w-full">
                {storesByRegion[activeRegion].map((s) => {
                  const active = selectedStoreIds.includes(s.storeId);
                  return (
                    <button
                      key={s.storeId}
                      type="button"
                      onClick={() => toggleStore(s.storeId)}
                      className={`px-2 py-1 rounded-full border text-[11px] transition-colors ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {s.storeNm || s.storeId}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-gray-400">
              최대 5개 점포까지 선택하여 리텐션 추이를 비교할 수 있습니다. 점포를
              선택하지 않으면 전체 점포 기준으로 집계됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
      {loading && !error && (
        <p className="text-xs text-gray-400 mb-4">
          리텐션·코호트 데이터를 불러오는 중입니다...
        </p>
      )}

      {/* 리텐션 추이 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>점포별 리텐션 추이 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis
                stroke="#9ca3af"
                tickFormatter={(v: number) => `${v}%`}
                label={{
                  value: "리텐션 (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                formatter={(value: any, name: string) => [
                  `${value}%`,
                  name,
                ]}
              />
              <Legend />
              {lineKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={segmentColors[idx % segmentColors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 코호트 리텐션 히트맵 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>코호트 리텐션 히트맵 (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm text-gray-600 border-b border-gray-200">
                    Cohort
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+0
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+1
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+2
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+3
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+4
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+5
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row: any) => (
                  <tr key={row.cohort}>
                    <td className="p-3 text-sm text-gray-900 border-b border-gray-100">
                      {row.cohort}
                    </td>
                    {(["m0", "m1", "m2", "m3", "m4", "m5"] as const).map((key) => (
                      <td
                        key={key}
                        className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(
                          row[key],
                        )}`}
                      >
                        {row[key] !== null ? `${row[key]}%` : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


