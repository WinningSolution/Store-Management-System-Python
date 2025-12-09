import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ArrowLeft, User, ShoppingBag, TrendingUp } from "lucide-react";

interface CustomerDetailProps {
  customerId: string;
  onNavigate: (page: Page) => void;
}

const customerInfo = {
  id: "C00001",
  name: "김민준",
  gender: "남성",
  age: "30대",
  region: "서울 강남구",
  phone: "010-1234-5678",
  email: "minjun.kim@email.com",
  joinDate: "2023-05-12",
  segment: "VIP",
  rfm: {
    recency: 5,
    frequency: 8,
    monetary: 1250000,
  },
};

const purchaseHistory = [
  {
    date: "2024-06-15",
    orderId: "ORD2024061501",
    amount: 185000,
    products: "남성 반팔 티셔츠 외 2건",
  },
  {
    date: "2024-05-22",
    orderId: "ORD2024052201",
    amount: 245000,
    products: "남성 청바지, 벨트",
  },
  {
    date: "2024-04-18",
    orderId: "ORD2024041801",
    amount: 125000,
    products: "남성 셔츠",
  },
];

export function CustomerDetail({ customerId, onNavigate }: CustomerDetailProps) {
  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => onNavigate('customer-list')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        고객 목록으로
      </Button>

      <div className="grid grid-cols-3 gap-6">
        {/* 좌측: 프로필 및 RFM */}
        <div className="col-span-1 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                고객 프로필
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-600">
                  {customerInfo.name[0]}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">고객 ID</span>
                  <span className="text-sm text-gray-900 font-mono">
                    {customerInfo.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">이름</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">성별</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.gender}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">연령대</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.age}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">지역</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.region}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">연락처</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">이메일</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">가입일</span>
                  <span className="text-sm text-gray-900">
                    {customerInfo.joinDate}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">세그먼트</span>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    {customerInfo.segment}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                RFM 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Recency</span>
                    <span className="text-sm text-gray-900">
                      {customerInfo.rfm.recency}점
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(customerInfo.rfm.recency / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Frequency</span>
                    <span className="text-sm text-gray-900">
                      {customerInfo.rfm.frequency}회
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${Math.min((customerInfo.rfm.frequency / 10) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Monetary</span>
                    <span className="text-sm text-gray-900">
                      ₩{(customerInfo.rfm.monetary / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${Math.min((customerInfo.rfm.monetary / 2000000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 구매 이력 */}
        <div className="col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                최근 주문 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseHistory.map((purchase, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-900">{purchase.products}</p>
                        <p className="text-sm text-gray-500">
                          주문번호: {purchase.orderId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">
                          ₩{purchase.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{purchase.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button className="flex-1 bg-gray-900 hover:bg-gray-800">
                  쿠폰 발급
                </Button>
                <Button variant="outline" className="flex-1">
                  세그먼트 변경
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
