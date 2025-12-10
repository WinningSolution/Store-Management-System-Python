import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Wand2, Settings, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Page } from "../../App";
import {
  runAutoScheduling,
  fetchScheduleResult,
  applySchedule,
  ScheduleResultItem,
} from "../../services/scheduleApi";
import { toast } from "sonner";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface AutoSchedulingProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
  /** 피크타임 예측에서 넘어온 대상 점포 ID */
  initialStoreId?: string;
  /** 피크타임 예측에서 넘어온 기준 주 시작일(월요일, YYYY-MM-DD) */
  initialWeekStart?: string;
  /** 피크타임 예측에서 사용한 기준일(YYYY-MM-DD) */
  initialPeakDate?: string;
}

export function AutoScheduling({
  onNavigate,
  initialStoreId,
  initialWeekStart,
  initialPeakDate,
}: AutoSchedulingProps) {
  const [showResults, setShowResults] = useState(false);
  const [constraints, setConstraints] = useState({
    maxHoursPerWeek: 40,
    maxConsecutiveDays: 5,
    minRestHours: 11,
    minBreakTime: 1,
    minStaff: 3,
    maxStaff: 8,
  });
  const [weekStart, setWeekStart] = useState<string>(() => {
    if (initialWeekStart) return initialWeekStart;
    // 기본값: 더미 데이터 마지막 주 (2025-09-29 월요일)
    return "2025-09-29";
  });
  const targetStoreId = initialStoreId || "S001";
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [results, setResults] = useState<ScheduleResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        setStores(res.items || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadStores();
  }, []);

  const targetStoreLabel = useMemo(() => {
    if (!initialStoreId) return "";
    const store = stores.find((s) => s.storeId === initialStoreId);
    if (!store) return initialStoreId;
    const name = store.storeNm || store.storeId;
    return `${name} (${store.storeId})`;
  }, [stores, initialStoreId]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      toast.success("AI 기반 최적 스케줄을 생성중입니다...");

      await runAutoScheduling({
        storeId: targetStoreId,
        weekStartDt: weekStart,
        strategy: "full",
      });

      const res = await fetchScheduleResult({
        store_id: targetStoreId,
        week_start_dt: weekStart,
      });
      setResults(res.items);
      setShowResults(true);
      toast.success("스케줄 생성이 완료되었습니다");
    } catch (e) {
      console.error(e);
      toast.error("스케줄을 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      // 확정 스케줄을 백엔드에 저장
      await applySchedule({
        storeId: targetStoreId,
        weekStartDt: weekStart,
      });
      toast.success("스케줄이 승인되어 캘린더에 반영되었습니다.");
      onNavigate("schedule-calendar", undefined, {
        storeId: targetStoreId,
        dateFrom: weekStart,
      });
    } catch (e) {
      console.error(e);
      toast.error("스케줄 적용 중 오류가 발생했습니다.");
    } finally {
      setApproving(false);
    }
  };

  const groupedByDay = useMemo(() => {
    const map = new Map<string, ScheduleResultItem[]>();
    results.forEach((r) => {
      if (!map.has(r.dayname)) {
        map.set(r.dayname, []);
      }
      map.get(r.dayname)!.push(r);
    });
    return Array.from(map.entries()).map(([dayname, items]) => ({
      dayname,
      items,
    }));
  }, [results]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => onNavigate("schedule-calendar")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          스케줄 캘린더로
        </Button>
        <h1 className="text-gray-900 text-xl font-semibold mb-2">
          자동 스케줄 생성
        </h1>
        <p className="text-gray-500">
          알고리즘 기반 최적 스케줄링 작성
        </p>
        <div className="mt-2 text-sm text-gray-500 flex flex-wrap gap-4">
          {initialPeakDate && (
            <span>
              피크타임 기준일:{" "}
              <span className="font-medium">{initialPeakDate}</span>
            </span>
          )}
          {initialStoreId && (
            <span>
              대상 점포:{" "}
              <span className="font-medium">
                {targetStoreLabel || initialStoreId}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              제약 조건 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxHours">주당 최대 근무시간</Label>
              <Input
                id="maxHours"
                type="number"
                value={constraints.maxHoursPerWeek}
                onChange={(e) => setConstraints({ ...constraints, maxHoursPerWeek: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="maxDays">최대 연속 근무일</Label>
              <Input
                id="maxDays"
                type="number"
                value={constraints.maxConsecutiveDays}
                onChange={(e) => setConstraints({ ...constraints, maxConsecutiveDays: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="restHours">연속 근무 사이 최소 휴게시간 (시간)</Label>
              <Input
                id="restHours"
                type="number"
                value={constraints.minRestHours}
                onChange={(e) => setConstraints({ ...constraints, minRestHours: Number(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                전일 퇴근 시각부터 익일 출근 시각까지 확보해야 하는 최소 휴게시간입니다.
              </p>
            </div>
            <div>
              <Label htmlFor="breakTime">근무 중 휴게시간 (시간)</Label>
              <Input
                id="breakTime"
                type="number"
                step="0.5"
                value={constraints.minBreakTime}
                onChange={(e) => setConstraints({ ...constraints, minBreakTime: Number(e.target.value) })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">8시간 이상 근무 시 최소 1시간 휴게시간 자동 배정</p>
            </div>
            <div>
              <Label htmlFor="minStaff">시간대별 최소 인원</Label>
              <Input
                id="minStaff"
                type="number"
                value={constraints.minStaff}
                onChange={(e) => setConstraints({ ...constraints, minStaff: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="maxStaff">시간대별 최대 인원</Label>
              <Input
                id="maxStaff"
                type="number"
                value={constraints.maxStaff}
                onChange={(e) => setConstraints({ ...constraints, maxStaff: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>스케줄 생성</CardTitle>
          </CardHeader>
          <CardContent>
            {!showResults ? (
              <div className="text-center py-12">
                <Wand2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-gray-900 mb-2">AI 기반 최적 스케줄 생성</h3>
                <p className="text-gray-500 mb-6">
                  수요 예측, 직원 선호도, 법적 제약을 고려하여<br />
                  최적의 스케줄을 자동으로 생성합니다
                </p>
                <div className="max-w-md mx-auto space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900">근로기준법 자동 준수</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900">피크 시간대 최적 인원 배치</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900">
                      직원 선호 패턴 및 휴가 일정 반영
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-900">휴게시간 자동 배치 (8시간 이상 근무 시)</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="weekStart">주 시작일 (월요일)</Label>
                    <Input
                      id="weekStart"
                      type="date"
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button
                    onClick={handleGenerate}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {loading ? "생성 중..." : "스케줄 자동 생성"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-green-900">스케줄 생성 완료</p>
                    <p className="text-sm text-green-600 mt-1">
                      기준 주차: {weekStart}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-500">
                          요일
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500">
                          근무 타입
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500">
                          필요 인원
                        </th>
                        <th className="text-left py-3 px-4 text-gray-500">
                          배정된 직원 수
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByDay.map(({ dayname, items }) =>
                        items.map((row, idx) => (
                          <tr
                            key={`${dayname}-${row.workType}-${idx}`}
                            className="border-b border-gray-100"
                          >
                            <td className="py-3 px-4 text-gray-900">
                              {dayname}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {row.workType}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {row.requiredCnt}명
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {row.assignedEmpList.length}명
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={approving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {approving ? "적용 중..." : "스케줄 승인 및 적용"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowResults(false)}>
                    다시 생성
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}