import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus } from "lucide-react";

interface AbTestDashboardProps {
  onNavigate: (page: Page) => void;
}

const testData = [
  {
    id: "AB001",
    name: "VIP 쿠폰 20% vs 30%",
    status: "진행중",
    targetMetric: "CVR",
    startDate: "2024-06-01",
    endDate: "2024-06-30",
    groupA: { name: "20% 할인", cvr: 12.5, sales: 8500000, users: 140 },
    groupB: { name: "30% 할인", cvr: 18.2, sales: 11200000, users: 140 },
    pValue: 0.032,
    lift: 45.6,
  },
  {
    id: "AB002",
    name: "신규 고객 환영 메시지 A/B",
    status: "완료",
    targetMetric: "재구매율",
    startDate: "2024-05-01",
    endDate: "2024-05-31",
    groupA: { name: "기본 메시지", cvr: 28.3, sales: 5200000, users: 200 },
    groupB: { name: "맞춤 메시지", cvr: 35.8, sales: 6800000, users: 200 },
    pValue: 0.018,
    lift: 26.5,
  },
];

export function AbTestDashboard({ onNavigate }: AbTestDashboardProps) {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">A/B 테스트 관리</h1>
          <p className="text-gray-500">실험 설계 및 성과 분석</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          새 실험 생성
        </Button>
      </div>

      <div className="space-y-6">
        {testData.map((test) => (
          <Card key={test.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{test.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {test.startDate} ~ {test.endDate}
                  </p>
                </div>
                <Badge
                  className={
                    test.status === "진행중"
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                      : "bg-green-100 text-green-700 hover:bg-green-100"
                  }
                >
                  {test.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Group A */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-3">Group A: {test.groupA.name}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">대상 고객</span>
                      <span className="text-sm text-gray-900">{test.groupA.users}명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{test.targetMetric}</span>
                      <span className="text-sm text-gray-900">{test.groupA.cvr}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">매출</span>
                      <span className="text-sm text-gray-900">
                        ₩{(test.groupA.sales / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group B */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-3">Group B: {test.groupB.name}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">대상 고객</span>
                      <span className="text-sm text-gray-900">{test.groupB.users}명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{test.targetMetric}</span>
                      <span className="text-sm text-blue-700">{test.groupB.cvr}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">매출</span>
                      <span className="text-sm text-gray-900">
                        ₩{(test.groupB.sales / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 통계적 유의성 */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lift</p>
                    <p className="text-green-700">+{test.lift}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">p-value</p>
                    <p className="text-green-700">
                      {test.pValue}{" "}
                      {test.pValue < 0.05 && (
                        <span className="text-xs">(통계적 유의)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
