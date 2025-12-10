import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Page } from "../../App";
import {
  fetchScheduleCalendar,
  ScheduleCalendarItem,
} from "../../services/scheduleApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface ScheduleCalendarProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
  initialStoreId?: string;
  /** 기준일(YYYY-MM-DD). 이 날짜가 포함된 주차를 초기 주차로 설정 */
  initialBaseDate?: string;
}

type DayIssue = "지각" | "조퇴" | "결근";

interface DayCellData {
  shift: string;
  issue?: DayIssue;
}

interface EmployeeWeekRow {
  empId: string;
  empNm: string;
  days: Record<number, DayCellData>;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getShiftColor(shift: string, hasIssue: boolean) {
  if (hasIssue) return "bg-red-100 text-red-700 border border-red-300";
  if (shift === "휴무") return "bg-gray-100 text-gray-600";
  if (shift.startsWith("09")) return "bg-blue-100 text-blue-700";
  if (shift.startsWith("12")) return "bg-green-100 text-green-700";
  if (shift.startsWith("14")) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

function formatShift(start?: string | null, end?: string | null): string {
  if (!start || !end) return "휴무";
  // "HH:MM:SS" → "HH-HH" 형태로 단순화
  const startHour = start.slice(0, 2);
  const endHour = end.slice(0, 2);
  return `${startHour}-${endHour}`;
}

function getIssue(item: ScheduleCalendarItem): DayIssue | undefined {
  if (item.lateFlag === "Y") return "지각";
  if (item.earlyFlag === "Y") return "조퇴";
  return undefined;
}

function toDateOnlyString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(d.getDate() + days);
  return nd;
}

export function ScheduleCalendar({
  onNavigate,
  initialStoreId,
  initialBaseDate,
}: ScheduleCalendarProps) {
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

  // 기준 주차: initialBaseDate 가 있으면 그 주의 월요일, 없으면 오늘 기준
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const base = initialBaseDate ? new Date(initialBaseDate) : new Date();
    return getMonday(base);
  });
  // 화면에서 선택 중인 "기준 월" (주차 드롭다운은 이 월 기준)
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = initialBaseDate ? new Date(initialBaseDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string>(initialStoreId || "");
  const [storeError, setStoreError] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleCalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

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

  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);

  const currentWeekLabel = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    const firstMonday = getMonday(new Date(year, month - 1, 1));
    const diffDays =
      (weekStart.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24);
    const weekIndex = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 5);
    return `${year}년 ${month}월 ${weekIndex}주차`;
  }, [viewMonth, weekStart]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
  }, [weekStart]);

  const employeeRows: EmployeeWeekRow[] = useMemo(() => {
    const map = new Map<string, EmployeeWeekRow>();

    items.forEach((item) => {
      const key = item.empId;
      if (!map.has(key)) {
        map.set(key, {
          empId: item.empId,
          empNm: item.empNm || item.empId,
          days: {},
        });
      }
      const row = map.get(key)!;

      const workDate = new Date(item.workDt);
      workDate.setHours(0, 0, 0, 0);
      const diffDays =
        (workDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      const dayIndex = Math.floor(diffDays);

      if (dayIndex >= 0 && dayIndex < 7) {
        row.days[dayIndex] = {
          shift: formatShift(item.shiftStartPlan, item.shiftEndPlan),
          issue: getIssue(item),
        };
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.empNm.localeCompare(b.empNm, "ko"),
    );
  }, [items, weekStart]);

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

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!storeId) {
        setItems([]);
        return;
      }
      const res = await fetchScheduleCalendar({
        store_id: storeId,
        start_date: toDateOnlyString(weekStart),
        end_date: toDateOnlyString(weekEnd),
      });
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
      setError("스케줄 데이터를 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!storeId) return;
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, storeId]);

  const renderDayCell = (data?: DayCellData) => {
    const shift = data?.shift ?? "휴무";
    const issue = data?.issue;
    const hasIssue = !!issue;
    return (
      <div
        className={`px-3 py-2 rounded-lg text-center text-sm relative group ${getShiftColor(
          shift,
          hasIssue,
        )}`}
      >
        {shift}
        {issue && (
          <>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                {issue}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">스케줄 캘린더</h1>
          <p className="text-gray-500">
            근태 데이터를 기반으로 주간 근무 스케줄을 조회합니다
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button
            onClick={() => onNavigate("auto-scheduling")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            자동 스케줄 생성
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
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
              {/* 점포 선택 필터 (직원 목록과 동일한 형태) */}
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
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              스케줄 데이터를 불러오는 중입니다...
            </div>
          ) : employeeRows.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              선택한 기간에 대한 근무 스케줄이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-gray-500 min-w-[120px]">
                      직원
                    </th>
                    {daysOfWeek.map((d, idx) => (
                      <th
                        key={idx}
                        className="text-center py-4 px-4 text-gray-500 min-w-[100px]"
                      >
                        {DAY_LABELS[idx]} (
                        {`${d.getMonth() + 1}/${d.getDate()}`}
                        )
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.map((row) => (
                    <tr
                      key={row.empId}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                            {row.empNm[0]}
                          </div>
                          <span className="text-gray-900">{row.empNm}</span>
                          <Badge
                            variant="outline"
                            className="ml-1 text-xs text-gray-500 border-gray-300"
                          >
                            {row.empId}
                          </Badge>
                        </div>
                      </td>
                      {Array.from({ length: 7 }, (_, dayIdx) => (
                        <td key={dayIdx} className="py-3 px-4">
                          {renderDayCell(row.days[dayIdx])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100"></div>
              <span className="text-sm text-gray-600">오픈 (09-18)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100"></div>
              <span className="text-sm text-gray-600">미들 (12-21)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100"></div>
              <span className="text-sm text-gray-600">클로징 (14-23)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100"></div>
              <span className="text-sm text-gray-600">휴무</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span className="text-sm text-gray-600">
                특이사항 (지각/조퇴)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}