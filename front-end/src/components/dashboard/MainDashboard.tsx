import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Page } from "../../App";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchMainDashboard,
  MainDashboardResponse,
} from "../../services/dashboardApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";
import {
  fetchSalesSummary,
  DailySalesItem,
} from "../../services/salesApi";
import {
  fetchSalesCategoryCompare,
  SalesCategoryCompareResponse,
} from "../../services/salesApi";

interface MainDashboardProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
}

export function MainDashboard({ onNavigate }: MainDashboardProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<MainDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeklyDaily, setWeeklyDaily] = useState<DailySalesItem[]>([]);
  const [categoryMix, setCategoryMix] = useState<
    { category: string; amount: number }[]
  >([]);

  const categoryTotal = React.useMemo(
    () =>
      categoryMix.reduce(
        (sum, item) => sum + (item.amount != null ? item.amount : 0),
        0,
      ),
    [categoryMix],
  );

  const loadStores = async () => {
    try {
      const res = await fetchStores();
      setStores(res.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 로딩 중복 방지를 위한 ref
  const isLoadingRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    // 이미 로딩 중이면 중복 호출 방지
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      const params: { store_id?: string; date?: string } = {};
      if (selectedStoreId) params.store_id = selectedStoreId;
      if (selectedDate) params.date = selectedDate;
      const summaryParams: { store_id?: string } = {};
      if (selectedStoreId) summaryParams.store_id = selectedStoreId;
      const baseMonth =
        selectedDate && selectedDate.length >= 7
          ? selectedDate.slice(0, 7)
          : undefined;
      const categoryParams: {
        base_month?: string;
        compare_mode?: "prev_year" | "prev_month";
        store_id?: string;
      } = { compare_mode: "prev_year" };
      if (baseMonth) categoryParams.base_month = baseMonth;
      if (selectedStoreId) categoryParams.store_id = selectedStoreId;

      const [res, summaryRes, categoryRes] = await Promise.all([
        fetchMainDashboard(params),
        fetchSalesSummary(summaryParams),
        fetchSalesCategoryCompare(categoryParams),
      ]);
      
      // 상태 업데이트를 한 번에 처리하여 리렌더링 최소화
      setData(res);
      setWeeklyDaily(summaryRes.daily || []);
      const cmix = (categoryRes.categories || []).map((c) => ({
        category: c.category || "기타",
        amount: c.baseAmount,
      }));
      setCategoryMix(cmix);
    } catch (e: any) {
      console.error(e);
      setError("대시보드 데이터를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [selectedStoreId, selectedDate]);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const todaySales =
    data?.salesSummary?.todaySales != null
      ? Math.round(data.salesSummary.todaySales)
      : 0;
  const weekSales =
    data?.salesSummary?.weekSales != null
      ? Math.round(data.salesSummary.weekSales)
      : 0;
  const weekWoW =
    data?.salesSummary?.weekSalesWoW != null
      ? data.salesSummary.weekSalesWoW
      : null;
  const inventoryAlertCount = data?.inventoryAlerts?.length ?? 0;
  const attendanceCount = data?.todayAttendance?.length ?? 0;
  const vacationCount = data?.vacationToday?.length ?? 0;

  const weeklySummary = React.useMemo(
    () => {
      let base: { date: string; totalAmount: number }[] = [];
      if (weeklyDaily.length > 0) {
        base = weeklyDaily.map((d) => ({
          date: d.date,
          totalAmount: d.totalAmount,
        }));
      }
      const sorted = [...base].sort((a, b) => a.date.localeCompare(b.date));
      return sorted.slice(-7);
    },
    [weeklyDaily],
  );

  return (
    <div className="pt-0 px-8 pb-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2">매장 운영 현황</h1>
          <p className="text-gray-500">
            선택한 점포와 기준일 기준으로 오늘의 매장 운영 현황을 확인합니다.
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
              <option value="">전체 점포</option>
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
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* 오늘 매출 → 판매 실적 페이지 */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() =>
            onNavigate("sales-list", undefined, {
              dateFrom: selectedDate || undefined,
              dateTo: selectedDate || undefined,
              storeId: selectedStoreId || undefined,
            })
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                {weekWoW == null
                  ? "전주 대비 -"
                  : `전주 대비 ${weekWoW >= 0 ? "+" : ""}${weekWoW.toFixed(
                      1,
                    )}%`}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 매출</p>
            <p className="text-gray-900">
              {loading && !data
                ? "로딩 중..."
                : `₩${todaySales.toLocaleString("ko-KR")}`}
            </p>
          </CardContent>
        </Card>

        {/* 재고 부족 알림 → 재고 현황 페이지 */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() =>
            onNavigate("inventory-list", undefined, {
              storeId: selectedStoreId || undefined,
            })
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">주의</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">재고 부족 알림</p>
            <p className="text-gray-900">
              {loading && !data ? "로딩 중..." : `${inventoryAlertCount}개 상품`}
            </p>
          </CardContent>
        </Card>

        {/* 오늘 출근 직원 → 스케줄 캘린더 페이지 */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() =>
            onNavigate("schedule-calendar", undefined, {
              storeId: selectedStoreId || undefined,
              dateFrom: selectedDate || undefined,
            })
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 출근 직원</p>
            <p className="text-gray-900">
              {loading && !data ? "로딩 중..." : `${attendanceCount}명`}
            </p>
          </CardContent>
        </Card>

        {/* 진행중인 휴가 → 휴가 관리 페이지 */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() =>
            onNavigate("vacation-management", undefined, {
              storeId: selectedStoreId || undefined,
              dateFrom: selectedDate || undefined,
            })
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">진행중인 휴가</p>
            <p className="text-gray-900">
              {loading && !data ? "로딩 중..." : `${vacationCount}명`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 최근 7일 매출 추이 */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            const baseMonth =
              selectedDate && selectedDate.length >= 7
                ? selectedDate.slice(0, 7)
                : undefined;
            onNavigate("sales-analytics-summary", undefined, {
              baseMonth,
              storeId: selectedStoreId || undefined,
            });
          }}
        >
          <CardHeader>
            <CardTitle>최근 7일 매출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  formatter={(value: any) =>
                    `₩${Number(value || 0).toLocaleString("ko-KR")}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="totalAmount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 카테고리별 매출 구성비 (선택 월 기준) */}
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            const baseMonth =
              selectedDate && selectedDate.length >= 7
                ? selectedDate.slice(0, 7)
                : undefined;
            onNavigate("sales-composition", undefined, {
              baseMonth,
              storeId: selectedStoreId || undefined,
            });
          }}
        >
          <CardHeader>
            <CardTitle>카테고리별 매출 구성비 (선택 월)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              {categoryMix.length > 0 ? (
                <PieChart width={340} height={260}>
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const amount = Number(value || 0);
                      const amountText = `₩${amount.toLocaleString("ko-KR")}`;
                      const percentRaw =
                        categoryTotal > 0
                          ? (amount / categoryTotal) * 100
                          : null;
                      const percentText =
                        percentRaw != null
                          ? `${percentRaw.toFixed(1)}%`
                          : null;

                      // 툴팁 값: "₩금액 (xx.x%)" 형태로 표기
                      const valueText = percentText
                        ? `${amountText} (${percentText})`
                        : amountText;

                      return [valueText, name];
                    }}
                  />
                  <Pie
                    data={categoryMix}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {categoryMix.map((entry, index) => {
                      const colors = [
                        "#ef4444",
                        "#f97316",
                        "#eab308",
                        "#22c55e",
                        "#3b82f6",
                        "#6366f1",
                        "#8b5cf6",
                        "#14b8a6",
                      ];
                      return (
                        <Cell
                          key={`${entry.category}-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    formatter={(value: any) => (
                      <span className="text-xs text-gray-700 ml-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              ) : (
                <p className="text-xs text-gray-400">
                  선택한 기간에 대한 카테고리 매출 데이터가 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 오늘 출근 직원 */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader>
          <CardTitle>
            오늘 출근 직원
            {data && ` (${attendanceCount}명)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {(data?.todayAttendance || []).map((att, idx) => (
              <div
                key={`${att.empId}-${idx}`}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                  {att.empNm[0]}
                </div>
                <div>
                  <p className="text-sm">{att.empNm}</p>
                  <p className="text-xs text-gray-500">
                    {att.status === "미출근"
                      ? "미출근"
                      : att.clockInTs
                      ? `출근: ${new Date(att.clockInTs).toLocaleTimeString(
                          "ko-KR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}`
                      : "근무"}
                  </p>
                </div>
              </div>
            ))}
            {!loading && (data?.todayAttendance || []).length === 0 && (
              <p className="text-xs text-gray-500 col-span-6">
                오늘 출근한 직원이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 주요 알림 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>주요 알림</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.notifications || []).map((n) => {
              const isInventory = n.type === "inventory";
              const isAttendance = n.type === "attendance";
              const isVacation = n.type === "vacation";
              const baseClasses =
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors";
              let colorClasses =
                "bg-blue-50 border-blue-100 hover:bg-blue-100";
              let Icon = TrendingUp;
              let onClick = () => onNavigate("sales-analytics-summary");

              if (isInventory) {
                colorClasses = "bg-red-50 border-red-100 hover:bg-red-100";
                Icon = AlertTriangle;
                // 재고 관련 알림 클릭 시: 선택된 점포 컨텍스트로 발주 예측 관리 페이지로 이동
                onClick = () =>
                  onNavigate("inventory-forecast", undefined, {
                    storeId: selectedStoreId || undefined,
                  });
              } else if (isAttendance) {
                colorClasses =
                  "bg-orange-50 border-orange-100 hover:bg-orange-100";
                Icon = Users;
                onClick = () => onNavigate("employee-list");
              } else if (isVacation) {
                colorClasses =
                  "bg-purple-50 border-purple-100 hover:bg-purple-100";
                Icon = Calendar;
                onClick = () => onNavigate("vacation-management");
              }

              return (
                <div
                  key={n.id}
                  className={`${baseClasses} ${colorClasses}`}
                  onClick={onClick}
                >
                  <Icon className="w-5 h-5 mt-0.5 text-gray-700" />
                  <div>
                    <p className="text-sm text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })}
            {!loading && (data?.notifications || []).length === 0 && (
              <p className="text-xs text-gray-500">
                표시할 알림이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}