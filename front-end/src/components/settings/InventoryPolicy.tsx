import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Settings } from "lucide-react";

interface InventoryPolicyProps {
  onNavigate: (page: Page) => void;
}

const policyData = [
  {
    id: "POL001",
    target: "남성 반팔 티셔츠 (M)",
    minStock: 20,
    optimalStock: 50,
    maxStock: 100,
    leadTime: 7,
  },
  {
    id: "POL002",
    target: "여성 원피스 (FREE)",
    minStock: 15,
    optimalStock: 40,
    maxStock: 80,
    leadTime: 10,
  },
  {
    id: "POL003",
    target: "키즈 반팔 (120)",
    minStock: 10,
    optimalStock: 30,
    maxStock: 60,
    leadTime: 5,
  },
];

export function InventoryPolicy({ onNavigate }: InventoryPolicyProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">재고/발주 정책 설정</h1>
        <p className="text-gray-500">상품별 재고 기준 및 발주 정책 관리</p>
      </div>

      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            전체 정책 ({policyData.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정책 ID</TableHead>
                <TableHead>대상 상품</TableHead>
                <TableHead className="text-right">최소 재고</TableHead>
                <TableHead className="text-right">적정 재고</TableHead>
                <TableHead className="text-right">최대 재고</TableHead>
                <TableHead className="text-right">리드타임 (일)</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policyData.map((policy) => (
                <TableRow key={policy.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {policy.id}
                  </TableCell>
                  <TableCell>{policy.target}</TableCell>
                  <TableCell className="text-right">
                    {policy.minStock}개
                  </TableCell>
                  <TableCell className="text-right">
                    {policy.optimalStock}개
                  </TableCell>
                  <TableCell className="text-right">
                    {policy.maxStock}개
                  </TableCell>
                  <TableCell className="text-right">
                    {policy.leadTime}일
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <Button className="bg-gray-900 hover:bg-gray-800">
              새 정책 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 정책 설명 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>정책 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <span className="font-bold text-gray-900">최소 재고:</span> 이 수량 이하로 떨어지면 발주 알림 발생
            </p>
            <p>
              <span className="font-bold text-gray-900">적정 재고:</span> 권장 보유 재고량
            </p>
            <p>
              <span className="font-bold text-gray-900">최대 재고:</span> 재고 과잉 경고 기준
            </p>
            <p>
              <span className="font-bold text-gray-900">리드타임:</span> 발주 후 입고까지 소요 기간
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
