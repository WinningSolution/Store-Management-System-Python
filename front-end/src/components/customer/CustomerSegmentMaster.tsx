import { useEffect, useState } from "react";
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
import {
  fetchCustomerSegmentsMaster,
  CustomerSegmentMasterItem,
} from "../../services/customerApi";

interface CustomerSegmentMasterProps {
  onNavigate: (page: Page) => void;
}

export function CustomerSegmentMaster({ onNavigate }: CustomerSegmentMasterProps) {
  const [segments, setSegments] = useState<CustomerSegmentMasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchCustomerSegmentsMaster();
        setSegments(res.items || []);
      } catch (e: any) {
        setError(e.message || "세그먼트 목록을 불러오지 못했습니다.");
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
          <CardTitle>
            전체 세그먼트 ({segments.length.toLocaleString()}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          {loading && !error && (
            <p className="text-xs text-gray-400 mb-2">
              세그먼트 목록을 불러오는 중입니다...
            </p>
          )}
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
              {segments.map((segment) => (
                <TableRow
                  key={segment.segmentId}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="font-mono text-sm">
                    {segment.segmentId}
                  </TableCell>
                  <TableCell>{segment.segmentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{segment.segmentType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {segment.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {segment.customerCount.toLocaleString()}명
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
                        onClick={() =>
                          onNavigate("customer-segment-log", segment.segmentId)
                        }
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
