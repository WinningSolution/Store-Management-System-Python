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
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { fetchVacations, VacationItem } from "../../services/scheduleApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";
import { toast } from "sonner";

interface VacationManagementProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
  initialStoreId?: string;
  /** 기준일(YYYY-MM-DD). 이 날짜가 포함된 주차를 초기 주차로 설정 */
  initialBaseDate?: string;
}

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
  if (
    name.includes("충청") ||
    name.includes("충북") ||
    name.includes("충남") ||
    name.includes("대전") ||
    name.includes("세종")
  )
    return "chungcheong";
  if (
    name.includes("광주") ||
    name.includes("전주") ||
    name.includes("전라") ||
    name.includes("전북") ||
    name.includes("전남")
  )
    return "honam";
  if (
    name.includes("부산") ||
    name.includes("대구") ||
    name.includes("울산") ||
    name.includes("경상") ||
    name.includes("경북") ||
    name.includes("경남")
  )
    return "yeongnam";
  if (name.includes("강원") || name.includes("제주")) return "gangwonJeju";
  return "others";
};

const toDateOnlyString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonday = (d: Date): Date => {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const addDays = (d: Date, days: number): Date => {
  const nd = new Date(d);
  nd.setDate(d.getDate() + days);
  return nd;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "승인":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">승인</Badge>;
    case "대기":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">대기</Badge>;
    case "반려":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">반려</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export function VacationManagement({
  onNavigate,
  initialStoreId,
  initialBaseDate,
}: VacationManagementProps) {
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [items, setItems] = useState<VacationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string>(initialStoreId || "");
  const [storeError, setStoreError] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const base = initialBaseDate ? new Date(initialBaseDate) : new Date();
    return getMonday(base);
  });
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = initialBaseDate ? new Date(initialBaseDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const currentWeekLabel = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    const firstMonday = getMonday(new Date(year, month - 1, 1));
    const diffDays =
      (weekStart.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24);
    const weekIndex = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 5);
    return `${year}년 ${month}월 ${weekIndex}주차`;
  }, [viewMonth, weekStart]);

  const currentMonthInput = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  }, [viewMonth]);

  const currentWeekIndexForSelect = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    const firstMonday = getMonday(new Date(year, month - 1, 1));
    const diffDays =
      (weekStart.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 5);
  }, [viewMonth, weekStart]);

  const weekOptionLabel = (weekIndex: number) => {
    const ref = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 + (weekIndex - 1) * 7,
    );
    const monday = getMonday(ref);
    const sunday = addDays(monday, 6);
    const m1 = monday.getMonth() + 1;
    const d1 = monday.getDate();
    const m2 = sunday.getMonth() + 1;
    const d2 = sunday.getDate();
    return `${weekIndex}주차 (${m1}/${d1}~${m2}/${d2})`;
  };

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const next = addDays(prev, -7);
      setViewMonth(
        new Date(next.getFullYear(), next.getMonth(), 1),
      );
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const next = addDays(prev, 7);
      setViewMonth(
        new Date(next.getFullYear(), next.getMonth(), 1),
      );
      return next;
    });
  };

  const handleThisWeek = () => {
    const today = new Date();
    const monday = getMonday(today);
    setWeekStart(monday);
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // "YYYY-MM"
    if (!value) return;
    const [yearStr, monthStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const firstDay = new Date(year, month, 1);
    const firstMonday = getMonday(firstDay);
    setViewMonth(new Date(year, month, 1));
    setWeekStart(firstMonday);
  };

  const handleWeekSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const weekIndex = Number(e.target.value);
    if (!weekIndex) return;
    const ref = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 + (weekIndex - 1) * 7,
    );
    setWeekStart(getMonday(ref));
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

  useEffect(() => {
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

  useEffect(() => {
    const load = async () => {
      if (!storeId) {
        setItems([]);
        return;
      }
      try {
        setLoading(true);
        const res = await fetchVacations({
          store_id: storeId,
          start_dt: toDateOnlyString(weekStart),
          end_dt: toDateOnlyString(weekEnd),
        });
        setItems(res.items || []);
      } catch (e) {
        console.error(e);
        toast.error("휴가 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, weekStart, weekEnd]);

  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, { empNm: string; items: VacationItem[] }>();
    items.forEach((v) => {
      if (!map.has(v.empId)) {
        map.set(v.empId, { empNm: v.empNm, items: [] });
      }
      map.get(v.empId)!.items.push(v);
    });
    return { list: items, byEmp: map };
  }, [items]);

  const selectedEmpItems = useMemo(() => {
    if (!selectedEmpId) return [];
    return items.filter((v) => v.empId === selectedEmpId);
  }, [items, selectedEmpId]);

  const usedDays = useMemo(() => {
    if (!selectedEmpItems.length) return 0;
    // 승인된 휴가 일수 합산 (소수점 포함)
    return selectedEmpItems
      .filter((v) => v.status === "승인")
      .reduce((sum, v) => sum + Number(v.days || 0), 0);
  }, [selectedEmpItems]);

  const TOTAL_ANNUAL_DAYS = 15;
  const remainDays = Math.max(TOTAL_ANNUAL_DAYS - usedDays, 0);

  const vacationDateSet = useMemo(() => {
    const set = new Set<string>();
    if (!selectedEmpItems.length) return set;
    const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);

    selectedEmpItems.forEach((v) => {
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      let cur = new Date(start);
      while (cur <= end) {
        if (cur >= monthStart && cur <= monthEnd) {
          set.add(toDateOnlyString(cur));
        }
        cur = addDays(cur, 1);
      }
    });
    return set;
  }, [selectedEmpItems, viewMonth]);

  const daysInCalendarMonth = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [viewMonth]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">휴가 관리</h1>
        <p className="text-gray-500">
          직원 휴가 신청 및 승인 관리
          {loading ? " (로딩중...)" : ""}
        </p>
      </div>

      {/* 점포/기간 선택 필터 (스케줄 캘린더와 동일 컨셉) */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>{currentWeekLabel}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevWeek}
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThisWeek}
                  disabled={loading}
                >
                  이번 주
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextWeek}
                  disabled={loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-gray-600 w-full">
              {/* 점포 선택 필터 */}
              <div className="text-xs text-gray-500 flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    점포 선택 필터 (권역 선택 후 점포 선택)
                  </span>
                  {storeError && (
                    <span className="text-xs text-red-500">{storeError}</span>
                  )}
                </div>
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
                {/* 선택된 권역의 점포 칩 */}
                {activeRegion && storesByRegion[activeRegion] && (
                  <div className="flex flex-wrap gap-1 max-w-full">
                    {storesByRegion[activeRegion].map((s) => {
                      const active = storeId === s.storeId;
                      return (
                        <button
                          key={s.storeId}
                          type="button"
                          onClick={() =>
                            setStoreId(
                              storeId === s.storeId ? "" : s.storeId,
                            )
                          }
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
              </div>

              {/* 기간 설정 */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">기간 설정</span>
                  <input
                    type="month"
                    value={currentMonthInput}
                    onChange={handleMonthChange}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <select
                    value={currentWeekIndexForSelect}
                    onChange={handleWeekSelectChange}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        {weekOptionLabel(w)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    기준 주:
                    <span className="ml-1">
                      {toDateOnlyString(weekStart)} ~ {toDateOnlyString(weekEnd)}
                    </span>
                  </span>
                  {storeId && (
                    <span className="text-xs text-gray-500">
                      / 선택 점포:{" "}
                      <span className="font-medium">
                        {stores.find((s) => s.storeId === storeId)?.storeNm ||
                          storeId}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* 휴가 목록 */}
        <div className="col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>휴가 신청 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직원</TableHead>
                    <TableHead>휴가일</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>일수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead>승인일</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByEmployee.list.map((vacation, idx) => (
                    <TableRow
                      key={idx}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedEmpId(vacation.empId);
                        setSelectedEmployeeName(vacation.empNm);
                      }}
                    >
                      <TableCell>{vacation.empNm}</TableCell>
                      <TableCell className="text-sm">
                        {vacation.startDate} ~ {vacation.endDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{vacation.vacationType}</Badge>
                      </TableCell>
                      <TableCell>{vacation.days}일</TableCell>
                      <TableCell>{getStatusBadge(vacation.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {vacation.appliedDate.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {vacation.approvedDate
                          ? vacation.approvedDate.slice(0, 10)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {vacation.status === "대기" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              승인
                            </Button>
                            <Button size="sm" variant="outline">
                              반려
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 우측 패널: 선택 직원 정보 */}
        <div>
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader>
              <CardTitle>직원 휴가 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployeeName && selectedEmpItems.length > 0 ? (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-gray-900">{selectedEmployeeName}</p>
                      <Badge variant="outline">
                        {selectedEmpItems[0].storeId}
                      </Badge>
                    </div>
                    
                    {/* 연차 게이지 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">사용 연차</span>
                        <span className="text-sm text-gray-900">
                          {usedDays.toFixed(1).replace(/\.0$/, "")}일 /{" "}
                          {TOTAL_ANNUAL_DAYS}일
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${Math.min(
                              (usedDays / TOTAL_ANNUAL_DAYS) * 100,
                              100,
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-500">남은 연차</span>
                      <span className="text-blue-600">
                        {remainDays.toFixed(1).replace(/\.0$/, "")}일
                      </span>
                    </div>
                  </div>

                  {/* 간단한 캘린더 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm text-gray-900">
                        {viewMonth.getFullYear()}년{" "}
                        {viewMonth.getMonth() + 1}월
                      </h3>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs">
                      {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                        <div key={day} className="text-gray-500 pb-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: daysInCalendarMonth }, (_, i) => {
                        const date = i + 1;
                        const d = new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth(),
                          date,
                        );
                        const isVacation = vacationDateSet.has(
                          toDateOnlyString(d),
                        );
                        return (
                          <div
                            key={i}
                            className={`py-2 rounded ${
                              isVacation
                                ? "bg-blue-100 text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            {date}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  휴가 항목을 선택하세요
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
