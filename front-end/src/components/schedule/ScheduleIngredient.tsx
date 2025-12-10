import { useEffect, useMemo, useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Check, X } from "lucide-react";
import {
  fetchScheduleIngredients,
  saveScheduleIngredients,
  ScheduleIngredientItem,
} from "../../services/scheduleApi";
import { fetchEmployees, EmployeeListItem } from "../../services/employeeApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";
import { toast } from "sonner";

interface ScheduleIngredientProps {
  onNavigate: (page: Page) => void;
}

const dayDefs = [
  { code: "Mon", label: "월" },
  { code: "Tue", label: "화" },
  { code: "Wed", label: "수" },
  { code: "Thu", label: "목" },
  { code: "Fri", label: "금" },
  { code: "Sat", label: "토" },
  { code: "Sun", label: "일" },
];

const shiftDefs = [
  { code: "오전", label: "오전 (09-14)" },
  { code: "오후", label: "오후 (14-23)" },
];

type AvailabilityMap = Record<string, Record<string, boolean>>;

export function ScheduleIngredient({ onNavigate }: ScheduleIngredientProps) {
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

  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [storeError, setStoreError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // 점포 목록 로딩
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

  // 권역 기본 선택
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

  // 직원 목록 로딩 (선택된 점포 기준)
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        if (!selectedStoreId) {
          setEmployees([]);
          setSelectedEmployee(null);
          return;
        }
        const res = await fetchEmployees({
          store_id: selectedStoreId,
          page: 1,
          page_size: 100,
        });
        const list = res.items || [];
        setEmployees(list);
        if (list.length > 0) {
          setSelectedEmployee(list[0].empId);
        } else {
          setSelectedEmployee(null);
        }
      } catch (e) {
        console.error(e);
        toast.error("직원 목록을 불러오지 못했습니다.");
      }
    };
    loadEmployees();
  }, [selectedStoreId]);

  // 선택 직원의 근무 가능 요일/시간대 로딩
  useEffect(() => {
    const loadIngredients = async () => {
      if (!selectedEmployee) return;
      try {
        setLoading(true);
        const res = await fetchScheduleIngredients({ emp_id: selectedEmployee });
        const map: AvailabilityMap = { ...availability };
        const keyPrefix = selectedEmployee;
        if (!map[keyPrefix]) {
          map[keyPrefix] = {};
        }
        // 초기화
        dayDefs.forEach((d) => {
          shiftDefs.forEach((s) => {
            const key = `${d.code}-${s.code}`;
            map[keyPrefix][key] = false;
          });
        });
        // API 데이터 반영
        res.items.forEach((item) => {
          const key = `${item.dayname}-${item.workType}`;
          map[keyPrefix][key] = item.status === 1;
        });
        setAvailability(map);
      } catch (e) {
        console.error(e);
        toast.error("근무 가능 시간 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee]);

  const toggleAvailability = (dayCode: string, shiftCode: string) => {
    if (!selectedEmployee) return;
    const empKey = selectedEmployee;
    const key = `${dayCode}-${shiftCode}`;
    setAvailability((prev) => {
      const next = { ...prev };
      if (!next[empKey]) next[empKey] = {};
      next[empKey] = { ...next[empKey], [key]: !next[empKey][key] };
      return next;
    });
  };

  const isAvailable = (dayCode: string, shiftCode: string) => {
    if (!selectedEmployee) return false;
    const empKey = selectedEmployee;
    const key = `${dayCode}-${shiftCode}`;
    return availability[empKey]?.[key] || false;
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    try {
      setSaving(true);
      const empKey = selectedEmployee;
      const items: ScheduleIngredientItem[] = [];
      dayDefs.forEach((d) => {
        shiftDefs.forEach((s) => {
          const key = `${d.code}-${s.code}`;
          const avail = availability[empKey]?.[key] || false;
          items.push({
            empId: empKey,
            dayname: d.code,
            workType: s.code,
            status: avail ? 1 : 0,
          });
        });
      });
      await saveScheduleIngredients({
        empId: empKey,
        items,
      });
      toast.success("근무 가능 시간이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("근무 가능 시간을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmployeeName = useMemo(() => {
    if (!selectedEmployee) return "";
    const emp = employees.find((e) => e.empId === selectedEmployee);
    return emp ? emp.empNm : selectedEmployee;
  }, [employees, selectedEmployee]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">근무 가능 요일/시간대 관리</h1>
        <p className="text-gray-500">
          직원별 근무 가능한 시간대 설정
          {loading ? " (로딩중...)" : ""}
        </p>
      </div>

      {/* 점포/직원 선택 (직원 목록 페이지의 점포 필터와 동일한 UX) */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-sm text-gray-900">
            점포 및 직원 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
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
                  const active = selectedStoreId === s.storeId;
                  return (
                    <button
                      key={s.storeId}
                      type="button"
                      onClick={() =>
                        setSelectedStoreId(
                          selectedStoreId === s.storeId ? "" : s.storeId,
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

          {/* 직원 선택 칩 */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-gray-500 font-medium">
              직원 선택
            </span>
            {selectedStoreId ? (
              employees.length > 0 ? (
                <select
                  value={selectedEmployee ?? ""}
                  onChange={(e) =>
                    setSelectedEmployee(e.target.value || null)
                  }
                  className="mt-1 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {employees.map((emp) => (
                    <option key={emp.empId} value={emp.empId}>
                      {emp.empNm} ({emp.grade ?? "직원"})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400">
                  선택한 점포에 등록된 직원이 없습니다.
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400">
                먼저 상단에서 점포를 선택해 주세요.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 근무 가능 시간 그리드 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedEmployeeName
                ? `${selectedEmployeeName}님의 근무 가능 시간`
                : "직원을 선택하세요"}
            </CardTitle>
            <Button
              size="sm"
              className="bg-gray-900 hover:bg-gray-800"
              onClick={handleSave}
              disabled={!selectedEmployee || saving}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-4 text-left text-sm text-gray-500 border-b border-gray-200">
                    시간대 / 요일
                  </th>
                  {dayDefs.map((d) => (
                    <th
                      key={d.code}
                      className="p-4 text-center text-sm text-gray-900 border-b border-gray-200"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftDefs.map((shift) => (
                  <tr key={shift.code}>
                    <td className="p-4 text-sm text-gray-700 border-b border-gray-100">
                      {shift.label}
                    </td>
                    {dayDefs.map((d) => {
                      const available = isAvailable(d.code, shift.code);
                      return (
                        <td
                          key={`${d.code}-${shift.code}`}
                          className="p-4 border-b border-gray-100"
                        >
                          <button
                            onClick={() =>
                              toggleAvailability(d.code, shift.code)
                            }
                            className={`w-full h-12 rounded-lg flex items-center justify-center transition-colors ${
                              available
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            {available ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-bold">가이드:</span>
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 초록색: 근무 가능</li>
              <li>• 회색: 근무 불가</li>
              <li>• 각 칸을 클릭하여 근무 가능 여부를 토글할 수 있습니다</li>
              <li>• 변경 사항은 반드시 "저장" 버튼을 클릭해야 반영됩니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
