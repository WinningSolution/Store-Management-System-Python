import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Page } from "../../App";
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
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Target,
  ArrowRight,
  Zap,
  ShoppingBag,
  TrendingDown,
  Package,
  DollarSign,
  Clock,
  Calendar,
  Star,
} from "lucide-react";

interface CustomerInsightProps {
  onNavigate: (page: Page) => void;
}

// TOP 5 인사이트 데이터 (재고/매출 중심)
const topInsights = [
  {
    title: "품절 시 구매 포기율",
    value: "67%",
    change: "↓",
    type: "danger",
    chart: [95, 92, 88, 75, 67],
  },
  {
    title: "품절로 인한 예상 매출 손실",
    value: "₩2.8M",
    change: "이번 주",
    type: "warning",
    chart: [1.2, 1.8, 2.1, 2.5, 2.8],
  },
  {
    title: "재고 회전율",
    value: "8.2회",
    change: "+1.3",
    type: "success",
    chart: [6.5, 6.9, 7.3, 7.8, 8.2],
  },
  {
    title: "신규→재구매 전환율",
    value: "42%",
    change: "+5%p",
    type: "success",
    chart: [35, 37, 39, 41, 42],
  },
  {
    title: "인기 사이즈 품절률",
    value: "L/XL",
    change: "23%",
    type: "warning",
    chart: [15, 17, 19, 21, 23],
  },
];

// 고객 세그먼트 데이터 (오프라인 매장 중심)
const customerSegments = [
  {
    name: "고성장 잠재 고객",
    count: 450,
    revenue: 12500000,
    avgOrderValue: 85000,
    visitFrequency: "월 1.5회",
    conversionRate: 68,
    action: "맞춤 상품 추천",
    icon: Target,
    color: "blue",
    description: "최근 구매 빈도 증가, 평균 객단가 상승",
    topProducts: [
      { name: "여성 원피스", count: 85, percent: 28 },
      { name: "여성 블라우스", count: 68, percent: 22 },
      { name: "여성 샌들", count: 52, percent: 17 },
    ],
    preferredTime: "주말 14:00-18:00",
    categoryPreference: [
      { category: "여성", value: 65 },
      { category: "액세서리", value: 25 },
      { category: "신발", value: 10 },
    ],
  },
  {
    name: "이탈 위험 VIP",
    count: 32,
    revenue: 8900000,
    avgOrderValue: 320000,
    visitFrequency: "0회 (60일)",
    conversionRate: 15,
    action: "우선 재입고 알림",
    icon: AlertTriangle,
    color: "red",
    description: "60일 이상 미방문 | 이유: 선호 사이즈 품절 경험 3회",
    topProducts: [
      { name: "남성 정장 세트", count: 45, percent: 42 },
      { name: "남성 셔츠 (L)", count: 32, percent: 30 },
      { name: "남성 벨트", count: 18, percent: 17 },
    ],
    preferredTime: "평일 18:00-21:00",
    categoryPreference: [
      { category: "남성 정장", value: 75 },
      { category: "남성 캐주얼", value: 15 },
      { category: "액세서리", value: 10 },
    ],
  },
  {
    name: "충성 고객",
    count: 280,
    revenue: 18500000,
    avgOrderValue: 220000,
    visitFrequency: "월 2.5회",
    conversionRate: 85,
    action: "신상품 우선 안내",
    icon: TrendingUp,
    color: "green",
    description: "월 2회 이상 방문, 평균 객단가 20만원 이상",
    topProducts: [
      { name: "여성 원피스", count: 125, percent: 32 },
      { name: "남성 캐주얼", count: 98, percent: 25 },
      { name: "키즈 세트", count: 78, percent: 20 },
    ],
    preferredTime: "주말 11:00-17:00",
    categoryPreference: [
      { category: "여성", value: 45 },
      { category: "남성", value: 35 },
      { category: "키즈", value: 20 },
    ],
  },
  {
    name: "신규→활성 전환 가능",
    count: 520,
    revenue: 15600000,
    avgOrderValue: 65000,
    visitFrequency: "월 0.8회",
    conversionRate: 42,
    action: "재방문 혜택 제공",
    icon: Zap,
    color: "purple",
    description: "1회 구매 후 7일 이내, 재방문 1회 이상",
    topProducts: [
      { name: "남성 티셔츠", count: 145, percent: 35 },
      { name: "여성 스커트", count: 112, percent: 27 },
      { name: "키즈 티셔츠", count: 88, percent: 21 },
    ],
    preferredTime: "평일 12:00-15:00",
    categoryPreference: [
      { category: "남성", value: 40 },
      { category: "여성", value: 40 },
      { category: "키즈", value: 20 },
    ],
  },
];

// 재고 있을 때 vs 품절일 때 구매율 비교
const stockoutImpactData = [
  { product: "남성 반팔", inStock: 95, outOfStock: 28 },
  { product: "여성 원피스", inStock: 92, outOfStock: 35 },
  { product: "키즈 티셔츠", inStock: 88, outOfStock: 22 },
  { product: "남성 청바지", inStock: 90, outOfStock: 31 },
  { product: "여성 블라우스", inStock: 87, outOfStock: 25 },
];

// 카테고리별 품절 빈도 및 영향
const stockoutByCategory = [
  {
    category: "남성",
    stockoutRate: 18,
    lostSales: 850000,
    frequency: 12,
  },
  {
    category: "여성",
    stockoutRate: 23,
    lostSales: 1200000,
    frequency: 15,
  },
  {
    category: "키즈",
    stockoutRate: 15,
    lostSales: 680000,
    frequency: 9,
  },
];

// 장바구니 분석 (함께 구매되는 상품)
const marketBasketData = [
  {
    product1: "남성 반팔 티셔츠",
    product2: "남성 청바지",
    frequency: 245,
    confidence: 78,
    lift: 2.3,
  },
  {
    product1: "여성 원피스",
    product2: "여성 샌들",
    frequency: 198,
    confidence: 72,
    lift: 2.1,
  },
  {
    product1: "키즈 티셔츠",
    product2: "키즈 반바지",
    frequency: 156,
    confidence: 85,
    lift: 2.8,
  },
  {
    product1: "남성 셔츠",
    product2: "남성 벨트",
    frequency: 132,
    confidence: 68,
    lift: 1.9,
  },
];

// 인기 상품 사이즈별 재고 현황
const sizeInventoryData = [
  { size: "S", stock: 45, demand: 28, status: "충분" },
  { size: "M", stock: 32, demand: 58, status: "부족" },
  { size: "L", stock: 18, demand: 72, status: "긴급" },
  { size: "XL", stock: 12, demand: 65, status: "긴급" },
  { size: "XXL", stock: 38, demand: 22, status: "충분" },
];

// 시간대별 세그먼트 방문 패턴
const visitPatternByTime = [
  { time: "09-12시", vip: 12, loyal: 45, growing: 28, newCustomer: 35 },
  { time: "12-15시", vip: 18, loyal: 68, growing: 52, newCustomer: 88 },
  { time: "15-18시", vip: 25, loyal: 92, growing: 78, newCustomer: 65 },
  { time: "18-21시", vip: 48, loyal: 58, growing: 42, newCustomer: 38 },
];

// 요일별 세그먼트 방문 패턴
const visitPatternByDay = [
  { day: "월", vip: 8, loyal: 32, growing: 45, newCustomer: 52 },
  { day: "화", vip: 12, loyal: 38, growing: 48, newCustomer: 58 },
  { day: "수", vip: 15, loyal: 42, growing: 52, newCustomer: 62 },
  { day: "목", vip: 18, loyal: 48, growing: 58, newCustomer: 68 },
  { day: "금", vip: 28, loyal: 65, growing: 78, newCustomer: 85 },
  { day: "토", vip: 35, loyal: 92, growing: 95, newCustomer: 108 },
  { day: "일", vip: 32, loyal: 88, growing: 88, newCustomer: 95 },
];

// Lifecycle 단계 데이터 (오프라인 매장 중심)
const lifecycleStages = [
  {
    stage: "신규",
    count: 1200,
    conversionRate: 42,
    riskCount: 680,
    actions: ["웰컴 혜택", "매장 안내"],
  },
  {
    stage: "활성",
    count: 580,
    conversionRate: 72,
    riskCount: 95,
    actions: ["재방문 혜택", "관심 상품 알림"],
  },
  {
    stage: "유지",
    count: 420,
    conversionRate: 78,
    riskCount: 65,
    actions: ["정기 혜택", "VIP 프로그램"],
  },
  {
    stage: "충성",
    count: 280,
    conversionRate: 85,
    riskCount: 15,
    actions: ["프리미엄 혜택", "신상품 우선 안내"],
  },
  {
    stage: "이탈",
    count: 320,
    conversionRate: 8,
    riskCount: 320,
    actions: ["복귀 혜택", "품절 상품 입고 알림"],
  },
];

const getSegmentColor = (color: string) => {
  const colors = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: "text-red-600",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      icon: "text-green-600",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
  };
  return colors[color as keyof typeof colors] || colors.blue;
};

const getInsightColor = (type: string) => {
  switch (type) {
    case "success":
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
      };
    case "warning":
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
      };
    case "danger":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
      };
    default:
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
      };
  }
};

const getSizeStatusColor = (status: string) => {
  switch (status) {
    case "긴급":
      return "bg-red-100 text-red-700 border-red-300";
    case "부족":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "충분":
      return "bg-green-100 text-green-700 border-green-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const COLORS = {
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#10b981",
  red: "#ef4444",
  orange: "#f59e0b",
};

export function CustomerInsight({
  onNavigate,
}: CustomerInsightProps) {
  const [periodFilter, setPeriodFilter] = useState("month");
  const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <div className="pt-0 px-8 pb-8">
      {/* 필터 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-3">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="week">지난 주</option>
            <option value="month">지난 달</option>
            <option value="quarter">지난 분기</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">전체 카테고리</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="kids">키즈</option>
          </select>
        </div>
      </div>



      {/* 고객 세그먼트 인사이트 보드 */}
      <div className="mb-8">
        <h2 className="text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          고객 세그먼트 상세 분석 (RFM 기반)
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {customerSegments.map((segment, idx) => {
            const Icon = segment.icon;
            const colors = getSegmentColor(segment.color);
            return (
              <Card
                key={idx}
                className={`border-0 shadow-sm ${colors.bg} border ${colors.border}`}
              >
                <CardContent className="p-6">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center`}
                      >
                        <Icon
                          className={`w-6 h-6 ${colors.icon}`}
                        />
                      </div>
                      <div>
                        <h3 className="text-gray-900">
                          {segment.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {segment.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 주요 지표 */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        고객 수
                      </p>
                      <p className={`${colors.text}`}>
                        {segment.count}명
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        예상 매출
                      </p>
                      <p className={`${colors.text}`}>
                        ₩{(segment.revenue / 10000).toFixed(0)}만
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        평균 객단가
                      </p>
                      <p className={`${colors.text}`}>
                        ₩{(segment.avgOrderValue / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        방문 빈도
                      </p>
                      <p className={`${colors.text}`}>
                        {segment.visitFrequency}
                      </p>
                    </div>
                  </div>

                  {/* 선호 상품 TOP 3 */}
                  <div className="mb-4 p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-700">
                        선호 상품 TOP 3
                      </p>
                    </div>
                    <div className="space-y-2">
                      {segment.topProducts.map((product, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {i + 1}.
                            </span>
                            <span className="text-sm text-gray-900">
                              {product.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colors.bg}`}
                                style={{
                                  width: `${product.percent}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-8">
                              {product.count}회
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 구매 패턴 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <p className="text-xs text-gray-500">
                          선호 시간대
                        </p>
                      </div>
                      <p className="text-sm text-gray-900">
                        {segment.preferredTime}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-3 h-3 text-gray-500" />
                        <p className="text-xs text-gray-500">
                          전환 가능성
                        </p>
                      </div>
                      <p className="text-sm text-gray-900">
                        {segment.conversionRate}%
                      </p>
                    </div>
                  </div>

                  {/* 카테고리 선호도 */}
                  <div className="mb-4 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">
                      카테고리 선호도
                    </p>
                    <div className="space-y-2">
                      {segment.categoryPreference.map((cat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-700 w-16">
                            {cat.category}
                          </span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bg}`}
                              style={{ width: `${cat.value}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-8">
                            {cat.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 추천 액션 */}
                  <div
                    className={`p-3 ${colors.bg} rounded-lg border ${colors.border} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag
                        className={`w-4 h-4 ${colors.icon}`}
                      />
                      <span
                        className={`text-sm ${colors.text}`}
                      >
                        추천 액션:
                      </span>
                      <span className="text-sm text-gray-900">
                        {segment.action}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      실행
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 세그먼트별 방문 패턴 분석 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              시간대별 세그먼트 방문 패턴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitPatternByTime}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  label={{
                    value: "방문 고객 수",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="vip"
                  fill={COLORS.red}
                  name="이탈위험VIP"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="loyal"
                  fill={COLORS.green}
                  name="충성고객"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="growing"
                  fill={COLORS.blue}
                  name="고성장잠재"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="newCustomer"
                  fill={COLORS.purple}
                  name="신규전환가능"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-bold">💡 인사이트:</span>{" "}
                VIP 고객은 평일 18:00-21:00에 집중, 신규 고객은 점심시간(12-15시)에 가장 많이 방문
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              요일별 세그먼트 방문 패턴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitPatternByDay}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  label={{
                    value: "방문 고객 수",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="vip"
                  stroke={COLORS.red}
                  name="이탈위험VIP"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="loyal"
                  stroke={COLORS.green}
                  name="충성고객"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="growing"
                  stroke={COLORS.blue}
                  name="고성장잠재"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="newCustomer"
                  stroke={COLORS.purple}
                  name="신규전환가능"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <span className="font-bold">💡 인사이트:</span>{" "}
                주말(토, 일) 방문 고객 수 급증. 충성 고객과 신규 고객이 주말에 집중되므로 주말 인력 배치 강화 필요
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 재고 Impact 분석 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              재고 있을 때 vs 품절일 때 구매율 비교
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockoutImpactData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="product" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  label={{
                    value: "구매율 (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="inStock"
                  fill="#10b981"
                  name="재고 있을 때"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="outOfStock"
                  fill="#ef4444"
                  name="품절일 때"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-900">
                  <span className="font-bold">
                    ⚠️ 품절 Impact:
                  </span>{" "}
                  품절 시 평균 구매율 67% 하락 (95% → 28%)
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">
                    💡 개선 액션:
                  </span>{" "}
                  L/XL 사이즈 우선 발주, 품절 상품 대체 추천
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              카테고리별 품절로 인한 매출 손실
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockoutByCategory}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="category" stroke="#9ca3af" />
                <YAxis
                  stroke="#9ca3af"
                  label={{
                    value: "매출 손실액 (만원)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tickFormatter={(value) =>
                    (value / 10000).toFixed(0)
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₩${(value / 10000).toFixed(0)}만원`,
                    "매출 손실",
                  ]}
                />
                <Bar
                  dataKey="lostSales"
                  fill="#ef4444"
                  name="매출 손실액"
                  radius={[4, 4, 0, 0]}
                >
                  {stockoutByCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.stockoutRate > 20
                          ? "#ef4444"
                          : entry.stockoutRate > 15
                            ? "#f59e0b"
                            : "#10b981"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-900">
                <span className="font-bold">📊 인사이트:</span>{" "}
                여성 라인 품절률 23%로 가장 높음, 이번 주 매출
                손실 ₩120만원
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 장바구니 분석 */}
      <div className="mb-8">
        <h2 className="text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-600" />
          장바구니 분석 (함께 구매되는 상품)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {marketBasketData.map((item, idx) => (
            <Card
              key={idx}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {item.product1}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        {item.product2}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      함께 구매 횟수
                    </p>
                    <p className="text-gray-900">
                      {item.frequency}회
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      신뢰도
                    </p>
                    <p className="text-blue-600">
                      {item.confidence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      연관성
                    </p>
                    <p className="text-green-600">
                      {item.lift}x
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    추천 전략:
                  </p>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                      진열 인접 배치
                    </div>
                    <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                      세트 할인
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 인기 상품 사이즈별 재고 현황 */}
      <div className="mb-8">
        <h2 className="text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          인기 상품 사이즈별 재고 현황 (남성 반팔 티셔츠)
        </h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-5 gap-4">
              {sizeInventoryData.map((size, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getSizeStatusColor(size.status)}`}
                >
                  <div className="text-center mb-3">
                    <p className="text-gray-600 text-sm mb-1">
                      사이즈
                    </p>
                    <p className="text-2xl">{size.size}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        재고
                      </span>
                      <span className="text-gray-900">
                        {size.stock}개
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        수요
                      </span>
                      <span className="text-blue-600">
                        {size.demand}개
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-current">
                    <p className="text-center text-sm">
                      {size.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-900">
                <span className="font-bold">
                  ⚠️ 긴급 발주 필요:
                </span>{" "}
                L, XL 사이즈 재고 부족 (수요 대비 70% 부족). 3일
                내 품절 예상
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle 자동화 흐름도 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Customer Lifecycle 자동화 흐름
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex items-center justify-between">
              {lifecycleStages.map((stage, idx) => (
                <div key={idx} className="relative flex-1">
                  {/* 연결선 */}
                  {idx < lifecycleStages.length - 1 && (
                    <div className="absolute top-16 left-1/2 w-full h-0.5 bg-gray-300 z-0">
                      <ArrowRight className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  )}

                  {/* 단계 카드 */}
                  <div className="relative z-10 px-2">
                    <div className="bg-white border-2 border-blue-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="text-center mb-3">
                        <h3 className="text-gray-900 mb-1">
                          {stage.stage}
                        </h3>
                        <p className="text-2xl text-blue-600">
                          {stage.count}명
                        </p>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            전환율
                          </span>
                          <span className="text-gray-900">
                            {stage.conversionRate}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-500">
                            위험 고객
                          </span>
                          <span className="text-red-600">
                            {stage.riskCount}명
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">
                          자동 액션:
                        </p>
                        <div className="space-y-1">
                          {stage.actions.map((action, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                              <span className="text-gray-700">
                                {action}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-900">
              <span className="font-bold">🤖 자동화 현황:</span>{" "}
              총 2,800명의 고객에 대해 라이프사이클 기반 자동
              운영 중. 신규 고객 680명이 활성 전환 대상이며,
              이탈 위험 고객 320명에게 품절 상품 입고 알림 및
              복귀 혜택을 제공합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
