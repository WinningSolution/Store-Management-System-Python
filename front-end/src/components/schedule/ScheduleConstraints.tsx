import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Settings, Clock, Users, Award } from "lucide-react";

interface ScheduleConstraintsProps {
  onNavigate: (page: Page) => void;
}

export function ScheduleConstraints({ onNavigate }: ScheduleConstraintsProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">자동 스케줄링 제약조건 설정</h1>
        <p className="text-gray-500">스케줄 생성 시 적용할 규칙 및 제약조건 관리</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 근로시간 규칙 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              근로시간 규칙
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                주당 최대 근무시간
              </label>
              <input
                type="number"
                defaultValue="40"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                일일 최대 근무시간
              </label>
              <input
                type="number"
                defaultValue="8"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                최대 연속 근무일
              </label>
              <input
                type="number"
                defaultValue="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                휴게시간 (시간 단위)
              </label>
              <input
                type="number"
                defaultValue="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* 인원 배치 규칙 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              인원 배치 규칙
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                시간대별 최소 인원
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">오전 (09-14)</span>
                  <input
                    type="number"
                    defaultValue="2"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">오후 (14-19)</span>
                  <input
                    type="number"
                    defaultValue="3"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">저녁 (19-22)</span>
                  <input
                    type="number"
                    defaultValue="2"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                시간대별 최대 인원
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">오전 (09-14)</span>
                  <input
                    type="number"
                    defaultValue="5"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">오후 (14-19)</span>
                  <input
                    type="number"
                    defaultValue="6"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32">저녁 (19-22)</span>
                  <input
                    type="number"
                    defaultValue="4"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 직급/스킬 규칙 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              직급/스킬 규칙
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                시간대별 매니저 필수 배치
              </label>
              <div className="space-y-2">
                {["오전", "오후", "저녁"].map((time) => (
                  <div key={time} className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id={`manager-${time}`}
                      defaultChecked={time !== "저녁"}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <label htmlFor={`manager-${time}`} className="text-sm text-gray-700">
                      {time} 시간대
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                신입사원 단독 근무 금지
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* 기타 제약조건 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              기타 제약조건
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                선호 근무일 우선 배치
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                주말 근무 형평성 고려
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                야간 근무 후 익일 오전 근무 금지
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 저장 버튼 */}
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline">초기화</Button>
        <Button className="bg-gray-900 hover:bg-gray-800">저장</Button>
      </div>
    </div>
  );
}
