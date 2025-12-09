import { useState } from "react";
import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp } from "lucide-react";

interface CohortRetentionProps {
  onNavigate: (page: Page) => void;
}

// 코호트 히트맵 데이터 (오른쪽이 최근 코호트)
const cohortData = [
  { cohort: "2024-01", m0: 100, m1: 45, m2: 32, m3: 28, m4: 25, m5: 23 },
  { cohort: "2024-02", m0: 100, m1: 48, m2: 35, m3: 30, m4: 27, m5: null },
  { cohort: "2024-03", m0: 100, m1: 52, m2: 38, m3: 33, m4: null, m5: null },
  { cohort: "2024-04", m0: 100, m1: 55, m2: 42, m3: null, m4: null, m5: null },
  { cohort: "2024-05", m0: 100, m1: 58, m2: null, m3: null, m4: null, m5: null },
  { cohort: "2024-06", m0: 100, m1: null, m2: null, m3: null, m4: null, m5: null },
];

const getColorClass = (value: number | null) => {
  if (value === null) return "bg-gray-100 text-gray-400";
  if (value === 100) return "bg-blue-600 text-white";
  if (value >= 50) return "bg-green-500 text-white";
  if (value >= 40) return "bg-green-400 text-white";
  if (value >= 30) return "bg-yellow-400 text-gray-900";
  if (value >= 20) return "bg-orange-400 text-white";
  return "bg-red-400 text-white";
};

export function CohortRetention({ onNavigate }: CohortRetentionProps) {
  const [cohortType, setCohortType] = useState("signup");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">코호트·리텐션 분석</h1>
        <p className="text-gray-500">고객 코호트별 재구매율 및 리텐션 추이</p>
      </div>

      {/* 코호트 기준 선택 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700">코호트 기준:</label>
            <select
              value={cohortType}
              onChange={(e) => setCohortType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="signup">가입월 기준</option>
              <option value="firstPurchase">첫 구매월 기준</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 코호트 히트맵 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            코호트 리텐션 히트맵 (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm text-gray-600 border-b border-gray-200">
                    Cohort
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+0
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+1
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+2
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+3
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+4
                  </th>
                  <th className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">
                    M+5
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row, idx) => (
                  <tr key={row.cohort}>
                    <td className="p-3 text-sm text-gray-900 border-b border-gray-100">
                      {row.cohort}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m0)}`}>
                      {row.m0 !== null ? `${row.m0}%` : "-"}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m1)}`}>
                      {row.m1 !== null ? `${row.m1}%` : "-"}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m2)}`}>
                      {row.m2 !== null ? `${row.m2}%` : "-"}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m3)}`}>
                      {row.m3 !== null ? `${row.m3}%` : "-"}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m4)}`}>
                      {row.m4 !== null ? `${row.m4}%` : "-"}
                    </td>
                    <td className={`p-3 text-center text-sm border-b border-gray-100 ${getColorClass(row.m5)}`}>
                      {row.m5 !== null ? `${row.m5}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-bold">범례:</span>
            </p>
            <div className="grid grid-cols-6 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
                <span>100%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span>50%+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-400 rounded"></div>
                <span>40-50%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                <span>30-40%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-400 rounded"></div>
                <span>20-30%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-400 rounded"></div>
                <span>20% 미만</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 인사이트 카드 */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-2">평균 M+1 리텐션</p>
            <p className="text-3xl text-gray-900 mb-1">51.6%</p>
            <p className="text-sm text-green-600">+8.2% 전월 대비</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-2">평균 M+3 리텐션</p>
            <p className="text-3xl text-gray-900 mb-1">30.3%</p>
            <p className="text-sm text-green-600">+3.5% 전월 대비</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-2">최고 성과 코호트</p>
            <p className="text-3xl text-gray-900 mb-1">2024-06</p>
            <p className="text-sm text-blue-600">M+1: 58%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
