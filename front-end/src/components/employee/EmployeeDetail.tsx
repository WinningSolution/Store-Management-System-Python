import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Page } from '../../App';
import {
  AttendanceLogItem,
  EmployeeBasic,
  EmployeeDetailResponse,
  fetchEmployeeDetail,
} from '../../services/employeeApi';

interface EmployeeDetailProps {
  employeeKey: string; // "STORE_ID__EMP_ID" 형태
  onNavigate: (page: Page, id?: string) => void;
}

export function EmployeeDetail({ employeeKey, onNavigate }: EmployeeDetailProps) {
  // "STORE_ID__EMP_ID" 형태의 키를 파싱
  const [storeId, empId] = useMemo(() => {
    const parts = employeeKey.split('__');
    if (parts.length === 2) return [parts[0], parts[1]];
    return ['', employeeKey];
  }, [employeeKey]);

  const [data, setData] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!empId) return;
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, '0')}`;
        const res = await fetchEmployeeDetail({
          emp_id: empId,
          store_id: storeId,
          month: monthStr,
        });
        setData(res);
      } catch (e: any) {
        setError(e.message || '직원 상세 정보를 불러오지 못했습니다.');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empId, storeId]);

  const basic: EmployeeBasic | null = data?.basic ?? null;
  const attendanceSummary = data?.attendanceSummary;
  const recentAttendance: AttendanceLogItem[] = data?.recentAttendanceLogs ?? [];
  const vacations = data?.vacations ?? [];

  const vacationUsed = useMemo(() => vacations.length, [vacations]);
  const vacationRemain = useMemo(() => {
    const withRemain = vacations.find((v) => v.remainDays != null);
    return withRemain?.remainDays ?? 0;
  }, [vacations]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => onNavigate('employee-list')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          직원 목록으로
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-1">{basic ? basic.empNm : empId}</h1>
            <p className="text-gray-500 text-sm">
              {basic ? `${basic.storeId} · ${basic.empId}` : employeeKey}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onNavigate('employee-form', employeeKey)}
            >
              <Edit className="w-4 h-4 mr-2" />
              수정
            </Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
        {loading && !error && (
          <p className="text-xs text-gray-400 mt-2">
            직원 상세 정보를 불러오는 중입니다...
          </p>
        )}
      </div>

      {/* 기본 정보 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">이름</p>
              <p className="text-gray-900">{basic?.empNm ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">직원ID</p>
              <p className="text-gray-900">{basic?.empId ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">지점</p>
              <p className="text-gray-900">{basic?.storeId ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">직급</p>
              <p className="text-gray-900">{basic?.grade ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">입사일</p>
              <p className="text-gray-900">{basic?.hireDt ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">스케줄 상태</p>
              <p className="text-gray-900">{basic?.schStatus ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">근무 상태</p>
              <Badge
                className={
                  basic?.workStatus === '재직'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {basic?.workStatus ?? '-'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* 근태 요약 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              이번 달 근태 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">출근일</span>
                  <span className="text-gray-900">
                    {attendanceSummary?.workDays ?? 0}일
                  </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">지각</span>
                  <span className="text-orange-600">
                    {attendanceSummary?.lateCount ?? 0}회
                  </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">결근</span>
                  <span className="text-red-600">
                    {attendanceSummary?.earlyLeaveCount ?? 0}회
                  </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">총 근무시간</span>
                  <span className="text-gray-900">-</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 휴가 요약 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              휴가 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">사용한 휴가</span>
                <span className="text-gray-900">{vacationUsed}일</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">남은 휴가</span>
                <span className="text-blue-600">{vacationRemain}일</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">총 휴가</span>
                <span className="text-gray-900">
                  {vacationUsed + Number(vacationRemain)}일
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{
                    width:
                      vacationUsed + Number(vacationRemain) > 0
                        ? `${(vacationUsed /
                            (vacationUsed + Number(vacationRemain))) *
                          100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 스케줄 요약 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              이번 주 스케줄
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">근무일</span>
                <span className="text-gray-900">5일</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">휴무일</span>
                <span className="text-gray-900">2일</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">예상 근무시간</span>
                <span className="text-gray-900">40시간</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => onNavigate('schedule-calendar')}
              >
                전체 스케줄 보기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 스케줄 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>최근 근태 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500">날짜</th>
                  <th className="text-left py-3 px-4 text-gray-500">근무 시간</th>
                  <th className="text-left py-3 px-4 text-gray-500">지각/조퇴</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((log, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{log.workDt}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.shiftStartPlan && log.shiftEndPlan
                        ? `${log.shiftStartPlan} ~ ${log.shiftEndPlan}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          log.lateFlag === 'Y' || log.earlyFlag === 'Y'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          log.lateFlag === 'Y' || log.earlyFlag === 'Y'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {log.lateFlag === 'Y'
                          ? '지각'
                          : log.earlyFlag === 'Y'
                          ? '조퇴'
                          : '정상'}
                      </Badge>
                    </td>
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
