import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface CustomerSegmentLogProps {
  onNavigate: (page: Page) => void;
}

const segmentLogData = [
  {
    customerId: "C00001",
    customerName: "김민준",
    fromSegment: "Active",
    toSegment: "VIP",
    changedDate: "2024-06-15",
    reason: "구매 금액 증가",
  },
  {
    customerId: "C00003",
    customerName: "박지후",
    fromSegment: "VIP",
    toSegment: "Churned",
    changedDate: "2024-06-10",
    reason: "90일 이상 미구매",
  },
  {
    customerId: "C00004",
    customerName: "최하은",
    fromSegment: "New",
    toSegment: "Active",
    changedDate: "2024-06-08",
    reason: "재구매 발생",
  },
  {
    customerId: "C00007",
    customerName: "강서준",
    fromSegment: "Active",
    toSegment: "이탈 위험",
    changedDate: "2024-06-05",
    reason: "60일 이상 미구매",
  },
];

export function CustomerSegmentLog({ onNavigate }: CustomerSegmentLogProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">세그먼트 이동 이력</h1>
        <p className="text-gray-500">고객 세그먼트 변경 이력 조회</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>최근 세그먼트 이동</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객 ID</TableHead>
                <TableHead>고객명</TableHead>
                <TableHead>이전 세그먼트</TableHead>
                <TableHead></TableHead>
                <TableHead>변경 세그먼트</TableHead>
                <TableHead>변경일</TableHead>
                <TableHead>변경 사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentLogData.map((log, idx) => (
                <TableRow key={idx} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {log.customerId}
                  </TableCell>
                  <TableCell>{log.customerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.fromSegment}</Badge>
                  </TableCell>
                  <TableCell className="text-center">→</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.toSegment}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {log.changedDate}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {log.reason}
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
