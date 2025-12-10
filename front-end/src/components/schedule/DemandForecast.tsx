import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Page } from "../../App";
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
import { TrendingUp, Users, DollarSign } from "lucide-react";
import { fetchStores, StoreListItem } from "../../services/storeApi";
import {
  fetchDemandForecast,
  DemandForecastResponse,
} from "../../services/scheduleApi";

interface DemandForecastProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
}

export function DemandForecast({ onNavigate }: DemandForecastProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [forecast, setForecast] = useState<DemandForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 매장 목록 로딩
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        const items = res.items || [];
        setStores(items);
        if (items.length > 0 && !selectedStoreId) {
          setSelectedStoreId(items[0].storeId);
        }
      } catch (e) {
        console.error(e);
        setError("매장 정보를 불러오지 못했습니다.");
      }
    };
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 수요 예측 데이터 로딩
  useEffect(() => {
    const loadForecast = async () => {
      if (!selectedStoreId || !targetDate) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetchDemandForecast({
          store_id: selectedStoreId,
          target_dt: targetDate,
          history_days: 28,
        } as any);
        setForecast(res);
      } catch (e) {
        console.error(e);
        setError("수요 예측 데이터를 불러오지 못했습니다.");
        setForecast(null);
      } finally {
        setLoading(false);
      }
    };
    loadForecast();
  }, [selectedStoreId, targetDate]);

  // 시간대별 집계 (heatmap → BarChart 용 데이터)
  const hourlyData = useMemo(() => {
    if (!forecast || !forecast.heatmap) return [];
    const byHour = new Map<
      number,
      { salesSum: number; requiredMax: number; cnt: number }
    >();

    forecast.heatmap.forEach((item) => {
      const cur = byHour.get(item.hour) || {
        salesSum: 0,
        requiredMax: 0,
        cnt: 0,
      };
      cur.salesSum += item.salesAmt;
      cur.requiredMax = Math.max(cur.requiredMax, item.requiredStaff);
      cur.cnt += 1;
      byHour.set(item.hour, cur);
    });

    const hours = Array.from(byHour.keys()).sort((a, b) => a - b);
    return hours.map((h) => {
      const agg = byHour.get(h)!;
      const avgSales =
        agg.cnt > 0 ? agg.salesSum / agg.cnt : 0;
      // 방문객은 평균 매출을 객단가 2만원으로 나눈 값으로 재계산
      const avgVisitors = Math.max(
        0,
        Math.round((avgSales || 0) / 20000),
      );
      return {
        time: `${String(h).padStart(2, "0")}:00`,
        visitors: avgVisitors,
        required: agg.requiredMax,
      };
    });
  }, [forecast]);

  const expectedVisitors =
    forecast?.expectedVisitorsToday != null
      ? forecast.expectedVisitorsToday
      : 0;
  const expectedSales =
    forecast?.expectedSalesToday != null ? forecast.expectedSalesToday : 0;
  const peakHour = forecast?.peakHour;
  const peakRequired = forecast?.peakRequiredStaff ?? null;

  const peakText =
    peakRequired && peakHour != null
      ? `${peakRequired}명 (${String(peakHour).padStart(2, "0")}:00 기준)`
      : "-";

  // 주간 매출 예측 vs 실제 (라인 차트용)
  const weeklyData = useMemo(() => {
    if (!forecast || !forecast.weeklySummary) return [];
    const dayLabelMap: Record<string, string> = {
      Mon: "월",
      Tue: "화",
      Wed: "수",
      Thu: "목",
      Fri: "금",
      Sat: "토",
      Sun: "일",
    };
    return forecast.weeklySummary.map((p) => ({
      day: dayLabelMap[p.dayname] || p.dayname,
      predicted: p.predictedSales,
      actual: p.actualSales,
    }));
  }, [forecast]);

  const weeklyAccuracy =
    forecast?.weeklyAccuracy != null ? forecast.weeklyAccuracy : null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2">수요 예측 대시보드</h1>
          <p className="text-gray-500">
            SALES 데이터를 기반으로 시간대별 방문객·매출·필요 인원을 예측합니다.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 whitespace-nowrap">점포</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[180px]"
            >
              {stores.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeNm || s.storeId}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 whitespace-nowrap">기준일</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                최근 4주 평균
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 예상 방문객</p>
            <p className="text-gray-900">
              {loading && !forecast
                ? "로딩 중..."
                : `${expectedVisitors.toLocaleString("ko-KR")}명`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                최근 4주 평균
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 예상 매출</p>
            <p className="text-gray-900">
              {loading && !forecast
                ? "로딩 중..."
                : `₩${Math.round(expectedSales).toLocaleString("ko-KR")}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">피크 시간 필요 인원</p>
            <p className="text-gray-900">
              {loading && !forecast ? "로딩 중..." : peakText}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 시간대별 예측 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>시간대별 방문객 및 필요 인원 예측</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === "예상 방문객") {
                    return [`${value}명`, name];
                  }
                  if (name === "필요 인원") {
                    return [`${value}명`, name];
                  }
                  return [value, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="visitors" fill="#3b82f6" name="예상 방문객" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="required" fill="#8b5cf6" name="필요 인원" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* 주간 매출 예측 vs 실제 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>주간 매출 예측 vs 실제</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#9ca3af" />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(v) =>
                        `${Math.round(v / 1000000).toLocaleString("ko-KR")}M`
                      }
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `₩${Math.round(Number(value) || 0).toLocaleString(
                          "ko-KR",
                        )}`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#93c5fd"
                      strokeWidth={2}
                      name="예측 매출"
                      dot={{ fill: "#93c5fd", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="실제 매출"
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    예측 정확도:{" "}
                    <span className="font-bold">
                      {weeklyAccuracy != null
                        ? `${weeklyAccuracy.toFixed(1)}%`
                        : "-"}
                    </span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    기준일 포함 주차(월~일) 기준, 최근 4주 패턴 기반 예측 정확도
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                해당 주차에 대한 매출 데이터가 충분하지 않아 예측 비교를 표시할
                수 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 추천 조치사항 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>AI 추천 조치사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
                {forecast && forecast.summaryPeaks.length > 0 ? (
                  <>
                    {forecast.summaryPeaks.slice(0, 3).map((p, idx) => (
                      <div
                        key={`${p.date}-${p.hour}-${idx}`}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />
                          <div>
                            <p className="text-red-900">
                              피크 시간대 예측 ·{" "}
                              {String(p.hour).padStart(2, "0")}:00
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              예상 매출{" "}
                              {`₩${Math.round(p.salesAmt).toLocaleString(
                                "ko-KR",
                              )}`}{" "}
                              / 필요 인원 {p.requiredStaff}명
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    최근 4주 기준 피크 시간대 데이터를 찾지 못했습니다.
                  </p>
                )}
            </div>

            <Button
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // 기준일이 속한 주의 월요일을 계산하여 자동 스케줄링 페이지에 전달
                let weekStartStr = targetDate;
                if (targetDate) {
                  const d = new Date(targetDate);
                  const day = d.getDay(); // 0=Sun..6=Sat
                  const diff = day === 0 ? -6 : 1 - day;
                  d.setDate(d.getDate() + diff);
                  weekStartStr = d.toISOString().slice(0, 10);
                }
                onNavigate("auto-scheduling", undefined, {
                  storeId: selectedStoreId || undefined,
                  dateFrom: targetDate,
                  weekStartDt: weekStartStr,
                });
              }}
            >
              자동 스케줄 조정하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
