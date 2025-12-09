import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Package, Users, DollarSign } from "lucide-react";

interface ManagementDashboardProps {
  onNavigate: (page: Page) => void;
}

// 매출 추이 데이터
const salesTrendData = [
  { month: "1월", sales: 45000000, target: 42000000 },
  { month: "2월", sales: 48000000, target: 45000000 },
  { month: "3월", sales: 52000000, target: 48000000 },
  { month: "4월", sales: 49000000, target: 50000000 },
  { month: "5월", sales: 55000000, target: 52000000 },
  { month: "6월", sales: 58000000, target: 55000000 },
];

// 재고 회전율 데이터
const inventoryTurnoverData = [
  { category: "남성", turnover: 8.5 },
  { category: "여성", turnover: 7.2 },
  { category: "키즈", turnover: 6.8 },
  { category: "액세서리", turnover: 5.5 },
];

// 인력 비용 데이터
const laborCostData = [
  { month: "1월", cost: 12000000, sales: 45000000 },
  { month: "2월", cost: 13000000, sales: 48000000 },
  { month: "3월", cost: 13500000, sales: 52000000 },
  { month: "4월", cost: 12500000, sales: 49000000 },
  { month: "5월", cost: 14000000, sales: 55000000 },
  { month: "6월", cost: 14500000, sales: 58000000 },
];

export function ManagementDashboard({ onNavigate }: ManagementDashboardProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">경영 지표 대시보드</h1>
        <p className="text-gray-500">매출, 재고, 인력 KPI 종합 현황</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm text-green-600">+12.5%</div>
            </div>
            <p className="text-sm text-gray-500 mb-1">이번 달 매출</p>
            <p className="text-2xl text-gray-900">₩58M</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm text-green-600">+0.8</div>
            </div>
            <p className="text-sm text-gray-500 mb-1">재고 회전율</p>
            <p className="text-2xl text-gray-900">7.2회</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-sm text-red-600">+2.3%</div>
            </div>
            <p className="text-sm text-gray-500 mb-1">인력비용/매출 비율</p>
            <p className="text-2xl text-gray-900">25.0%</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-sm text-green-600">+5.8%</div>
            </div>
            <p className="text-sm text-gray-500 mb-1">목표 달성률</p>
            <p className="text-2xl text-gray-900">105.5%</p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 매출 추이 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>매출 추이 (목표 대비)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: number) => `₩${(value / 1000000).toFixed(1)}M`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="실제 매출"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="목표"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 재고 회전율 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>카테고리별 재고 회전율</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryTurnoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar
                  dataKey="turnover"
                  fill="#10b981"
                  name="회전율"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 인력 비용 */}
        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader>
            <CardTitle>인력 비용 vs 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={laborCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: number) => `₩${(value / 1000000).toFixed(1)}M`}
                />
                <Legend />
                <Bar
                  dataKey="cost"
                  fill="#a855f7"
                  name="인력 비용"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="sales"
                  fill="#3b82f6"
                  name="매출"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
