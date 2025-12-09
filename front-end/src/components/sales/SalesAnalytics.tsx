import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Page } from '../../App';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users } from 'lucide-react';

interface SalesAnalyticsProps {
  onNavigate: (page: Page) => void;
}

const monthlySales = [
  { month: '5월', sales: 32500, prevYear: 28000 },
  { month: '6월', sales: 35200, prevYear: 30500 },
  { month: '7월', sales: 38900, prevYear: 33200 },
  { month: '8월', sales: 41200, prevYear: 35800 },
  { month: '9월', sales: 39800, prevYear: 34500 },
  { month: '10월', sales: 45600, prevYear: 38900 },
  { month: '11월', sales: 48200, prevYear: 41200 },
];

const categoryData = [
  { name: '남성', value: 38, color: '#3b82f6' },
  { name: '여성', value: 45, color: '#ec4899' },
  { name: '키즈', value: 17, color: '#10b981' },
];

const topProductsDaily = [
  { product: '여성 반팔 티셔츠', sales: 45, revenue: 895500 },
  { product: '남성 청바지', sales: 38, revenue: 2656200 },
  { product: '여성 니트', sales: 32, revenue: 1596800 },
  { product: '남성 셔츠', sales: 28, revenue: 1117200 },
  { product: '키즈 후드티', sales: 24, revenue: 717600 },
];

const topProductsWeekly = [
  { product: '여성 반팔 티셔츠', sales: 312, revenue: 6208800 },
  { product: '남성 청바지', sales: 265, revenue: 18523500 },
  { product: '여성 니트', sales: 224, revenue: 11177600 },
  { product: '남성 셔츠', sales: 196, revenue: 7820400 },
  { product: '키즈 후드티', sales: 168, revenue: 5023200 },
];

const topProductsMonthly = [
  { product: '여성 반팔 티셔츠', sales: 1250, revenue: 24875000 },
  { product: '남성 청바지', sales: 980, revenue: 68530000 },
  { product: '여성 니트', sales: 850, revenue: 42415000 },
  { product: '남성 셔츠', sales: 720, revenue: 28728000 },
  { product: '키즈 후드티', sales: 650, revenue: 19435000 },
];

const topProductsYearly = [
  { product: '여성 반팔 티셔츠', sales: 15200, revenue: 302480000 },
  { product: '남성 청바지', sales: 12300, revenue: 859770000 },
  { product: '여성 니트', sales: 10800, revenue: 538920000 },
  { product: '남성 셔츠', sales: 9200, revenue: 367080000 },
  { product: '키즈 후드티', sales: 8100, revenue: 242190000 },
];

const weeklySales = [
  { day: '월', sales: 5200 },
  { day: '화', sales: 6100 },
  { day: '수', sales: 6800 },
  { day: '목', sales: 7200 },
  { day: '금', sales: 9800 },
  { day: '토', sales: 12500 },
  { day: '일', sales: 11200 },
];

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function SalesAnalytics({ onNavigate }: SalesAnalyticsProps) {
  const [topProductsPeriod, setTopProductsPeriod] = useState<PeriodType>('monthly');

  const getTopProducts = () => {
    switch (topProductsPeriod) {
      case 'daily': return topProductsDaily;
      case 'weekly': return topProductsWeekly;
      case 'monthly': return topProductsMonthly;
      case 'yearly': return topProductsYearly;
    }
  };

  const getPeriodLabel = () => {
    switch (topProductsPeriod) {
      case 'daily': return '오늘';
      case 'weekly': return '이번 주';
      case 'monthly': return '이번 달';
      case 'yearly': return '올해';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">매출 분석</h1>
        <p className="text-gray-500">매출 추이 및 상세 분석</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +15.2%
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">이번 달 매출</p>
            <p className="text-gray-900">₩482,000,000</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.5%
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">거래 건수</p>
            <p className="text-gray-900">3,425건</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.3%
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">평균 객단가</p>
            <p className="text-gray-900">₩140,730</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                -2.1%
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">방문 전환율</p>
            <p className="text-gray-900">68.5%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* 월별 매출 추이 */}
        <Card className="col-span-2 border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>월별 매출 추이 (전년 대비)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">년</Button>
                <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600">월</Button>
                <Button variant="outline" size="sm">주</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="prevYear" stroke="#93c5fd" strokeWidth={2} name="전년" dot={{ fill: '#93c5fd', r: 4 }} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="올해" dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">평균 전년 대비 성장률: <span className="font-bold">+15.8%</span></p>
            </div>
          </CardContent>
        </Card>

        {/* 카테고리별 매출 비율 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>카테고리별 매출 비율</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-gray-600">{cat.name}</span>
                  </div>
                  <span className="text-gray-900">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 주간 매출 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>이번 주 일별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 상품 - 기간별 전환 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>인기 상품 Top 5</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={topProductsPeriod === 'daily' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopProductsPeriod('daily')}
                  className={topProductsPeriod === 'daily' ? 'bg-blue-600' : ''}
                >
                  일별
                </Button>
                <Button 
                  variant={topProductsPeriod === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopProductsPeriod('weekly')}
                  className={topProductsPeriod === 'weekly' ? 'bg-blue-600' : ''}
                >
                  주별
                </Button>
                <Button 
                  variant={topProductsPeriod === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopProductsPeriod('monthly')}
                  className={topProductsPeriod === 'monthly' ? 'bg-blue-600' : ''}
                >
                  월별
                </Button>
                <Button 
                  variant={topProductsPeriod === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopProductsPeriod('yearly')}
                  className={topProductsPeriod === 'yearly' ? 'bg-blue-600' : ''}
                >
                  연도별
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-gray-500">
              {getPeriodLabel()} 기준
            </div>
            <div className="space-y-4">
              {getTopProducts().map((product, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{product.product}</p>
                    <p className="text-sm text-gray-500">{product.sales}개 판매</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900">₩{(product.revenue / 10000).toFixed(0)}만</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
