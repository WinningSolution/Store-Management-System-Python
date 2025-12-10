import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Gift } from "lucide-react";

interface CouponIssueProps {
  onNavigate: (page: Page) => void;
}

export function CouponIssue({ onNavigate }: CouponIssueProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">쿠폰 발급·이력</h1>
        <p className="text-gray-500">세그먼트별 타겟 쿠폰 발급 관리</p>
      </div>

      {/* 타겟 필터 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            대상 고객 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2">세그먼트</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option>전체</option>
                <option>VIP</option>
                <option>Active</option>
                <option>이탈 위험</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">최근 구매일</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option>전체</option>
                <option>30일 이내</option>
                <option>60일 이상</option>
                <option>90일 이상</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">LTV 구간</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option>전체</option>
                <option>1M 이상</option>
                <option>500k-1M</option>
                <option>500k 이하</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">구매 주기</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option>전체</option>
                <option>주 1회 이상</option>
                <option>월 1회 이상</option>
                <option>분기 1회 이상</option>
              </select>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              필터 조건에 맞는 대상 고객: <span className="font-bold">280명</span>
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="bg-gray-900 hover:bg-gray-800">
              선택한 고객에게 쿠폰 발급
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 쿠폰 발급 이력 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>최근 쿠폰 발급 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-900">VIP 고객 전용 20% 할인 쿠폰</p>
                <span className="text-sm text-gray-500">2024-06-20</span>
              </div>
              <p className="text-sm text-gray-600">
                발급 대상: VIP 세그먼트 280명
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-900">신규 고객 환영 쿠폰</p>
                <span className="text-sm text-gray-500">2024-06-15</span>
              </div>
              <p className="text-sm text-gray-600">
                발급 대상: New 세그먼트 420명
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
