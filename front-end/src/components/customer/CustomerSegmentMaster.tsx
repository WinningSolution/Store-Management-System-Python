import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Plus } from "lucide-react";

interface CustomerSegmentMasterProps {
  onNavigate: (page: Page) => void;
}

const segmentData = [
  {
    id: "SEG001",
    name: "VIP 고객",
    type: "RFM",
    description: "R≥4, F≥5, M≥1M",
    customerCount: 280,
    isActive: true,
  },
  {
    id: "SEG002",
    name: "Active 고객",
    type: "RFM",
    description: "R≥3, F≥3, M≥500k",
    customerCount: 580,
    isActive: true,
  },
  {
    id: "SEG003",
    name: "신규 고객",
    type: "CLUSTER",
    description: "가입 후 30일 이내",
    customerCount: 420,
    isActive: true,
  },
  {
    id: "SEG004",
    name: "이탈 위험",
    type: "RFM",
    description: "R≤2, F≥5, M≥1M",
    customerCount: 95,
    isActive: true,
  },
  {
    id: "SEG005",
    name: "Churned 고객",
    type: "RFM",
    description: "R=1, 90일 이상 미구매",
    customerCount: 320,
    isActive: false,
  },
];

export function CustomerSegmentMaster({ onNavigate }: CustomerSegmentMasterProps) {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">세그먼트 관리</h1>
          <p className="text-gray-500">고객 세그먼트 정의 및 관리</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          새 세그먼트 생성
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>전체 세그먼트 ({segmentData.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>세그먼트 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>정의</TableHead>
                <TableHead className="text-right">고객 수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentData.map((segment) => (
                <TableRow key={segment.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {segment.id}
                  </TableCell>
                  <TableCell>{segment.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{segment.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {segment.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {segment.customerCount}명
                  </TableCell>
                  <TableCell>
                    {segment.isActive ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        활성
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        비활성
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('customer-segment-log')}
                      >
                        이력
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
