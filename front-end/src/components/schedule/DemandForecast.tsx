import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Page } from '../../App';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

interface DemandForecastProps {
  onNavigate: (page: Page) => void;
}

const hourlyData = [
  { time: '09:00', visitors: 45, sales: 1200, required: 3 },
  { time: '10:00', visitors: 68, sales: 1800, required: 4 },
  { time: '11:00', visitors: 92, sales: 2500, required: 5 },
  { time: '12:00', visitors: 120, sales: 3200, required: 6 },
  { time: '13:00', visitors: 135, sales: 3600, required: 7 },
  { time: '14:00', visitors: 110, sales: 2900, required: 6 },
  { time: '15:00', visitors: 95, sales: 2400, required: 5 },
  { time: '16:00', visitors: 88, sales: 2200, required: 5 },
  { time: '17:00', visitors: 115, sales: 3100, required: 6 },
  { time: '18:00', visitors: 145, sales: 4200, required: 7 },
  { time: '19:00', visitors: 165, sales: 4800, required: 8 },
  { time: '20:00', visitors: 140, sales: 4000, required: 7 },
  { time: '21:00', visitors: 98, sales: 2600, required: 5 },
  { time: '22:00', visitors: 52, sales: 1400, required: 3 },
];

const weeklyData = [
  { day: '월', predicted: 2800, actual: 2650 },
  { day: '화', predicted: 3200, actual: 3100 },
  { day: '수', predicted: 3500, actual: 3450 },
  { day: '목', predicted: 3800, actual: 3900 },
  { day: '금', predicted: 5200, actual: 5100 },
  { day: '토', predicted: 6800, actual: 6500 },
  { day: '일', predicted: 6200, actual: 6300 },
];

export function DemandForecast({ onNavigate }: DemandForecastProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">수요 예측 대시보드</h1>
        <p className="text-gray-500">AI 기반 방문객 및 매출 예측</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">+8.5%</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 예상 방문객</p>
            <p className="text-gray-900">1,450명</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">+12.3%</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 예상 매출</p>
            <p className="text-gray-900">₩8,950,000</p>
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
            <p className="text-gray-900">8명 (18:00-20:00)</p>
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
              <Tooltip />
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="predicted" stroke="#93c5fd" strokeWidth={2} name="예측 매출" dot={{ fill: '#93c5fd', r: 4 }} />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="실제 매출" dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">예측 정확도: <span className="font-bold">94.8%</span></p>
              <p className="text-xs text-blue-600 mt-1">지난 4주 평균 기준</p>
            </div>
          </CardContent>
        </Card>

        {/* 추천 조치사항 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>AI 추천 조치사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-600 mt-2"></div>
                  <div>
                    <p className="text-red-900">금요일 18-20시 인원 부족 예상</p>
                    <p className="text-sm text-red-600 mt-1">현재 배치: 6명 / 필요: 8명 (+2명 필요)</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-600 mt-2"></div>
                  <div>
                    <p className="text-orange-900">토요일 피크 시간 예측</p>
                    <p className="text-sm text-orange-600 mt-1">예상 방문객 1,800명 (전주 대비 +15%)</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                  <div>
                    <p className="text-blue-900">이번 주 예상 매출 증가</p>
                    <p className="text-sm text-blue-600 mt-1">전주 대비 +12.3% 증가 예상</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                  <div>
                    <p className="text-green-900">월요일 여유 인력</p>
                    <p className="text-sm text-green-600 mt-1">예상 방문객 대비 1명 여유</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              onClick={() => onNavigate('schedule-auto')}
            >
              자동 스케줄 조정하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
