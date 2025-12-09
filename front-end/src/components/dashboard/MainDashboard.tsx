import { DollarSign, Package, Users, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Page } from '../../App';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MainDashboardProps {
  onNavigate: (page: Page) => void;
}

const salesData = [
  { time: '09:00', sales: 120 },
  { time: '11:00', sales: 280 },
  { time: '13:00', sales: 450 },
  { time: '15:00', sales: 320 },
  { time: '17:00', sales: 580 },
  { time: '19:00', sales: 720 },
  { time: '21:00', sales: 460 },
];

const peakData = [
  { day: '월', predicted: 45, actual: 42 },
  { day: '화', predicted: 52, actual: 50 },
  { day: '수', predicted: 48, actual: 51 },
  { day: '목', predicted: 55, actual: 53 },
  { day: '금', predicted: 78, actual: 75 },
  { day: '토', predicted: 95, actual: 92 },
  { day: '일', predicted: 88, actual: 0 },
];

export function MainDashboard({ onNavigate }: MainDashboardProps) {
  return (
    <div className="pt-0 px-8 pb-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-500">오늘의 매장 운영 현황을 확인하세요</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('sales-analytics')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">+12.5%</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 매출</p>
            <p className="text-gray-900">₩8,420,000</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('inventory-list')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">주의</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">재고 부족 알림</p>
            <p className="text-gray-900">23개 상품</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('employee-list')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">오늘 출근 직원</p>
            <p className="text-gray-900">18명 / 25명</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('schedule-calendar')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">진행중인 휴가</p>
            <p className="text-gray-900">3명</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 오늘 매출 추이 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>오늘 매출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 피크 시간 예측 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>주간 피크 시간 예측</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="predicted" fill="#93c5fd" name="예측 필요인원" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#3b82f6" name="실제 배치" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 오늘 출근 직원 */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader>
          <CardTitle>오늘 출근 직원 (18명)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {['김민준', '이서연', '박지호', '최유진', '정우영', '강하늘', '윤서준', '한지우', '임민서', '조현우', '신예린', '권도윤', '장서아', '오준혁', '송지민', '배은채', '노시우', '홍수아'].map((name, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                  {name[0]}
                </div>
                <div>
                  <p className="text-sm">{name}</p>
                  <p className="text-xs text-gray-500">09:00-18:00</p>
                </div>
              </div>
            ))}
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
            <div 
              className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => onNavigate('inventory-list')}
            >
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-900">재고 긴급: 남성 반팔 티셔츠 (화이트/L) 5개 남음</p>
                <p className="text-sm text-red-600 mt-1">발주 권장량: 50개</p>
              </div>
            </div>
            <div 
              className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => onNavigate('schedule-demand')}
            >
              <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-orange-900">금요일 피크 시간 예상: 18:00-20:00</p>
                <p className="text-sm text-orange-600 mt-1">필요 인원: 15명 / 현재 배치: 12명 (3명 부족)</p>
              </div>
            </div>
            <div 
              className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => onNavigate('sales-analytics')}
            >
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-blue-900">이번 주 매출 전주 대비 +15.3% 증가</p>
                <p className="text-sm text-blue-600 mt-1">여성 라인 매출 특히 증가 (+23%)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}