import React, { useEffect, useState } from "react";
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
import {
  CustomerSegmentLogItem,
  fetchCustomerSegmentLog,
} from "../../services/customerApi";

interface CustomerSegmentLogProps {
  onNavigate: (page: Page, id?: string) => void;
  segmentId?: string;
}

export function CustomerSegmentLog({ onNavigate, segmentId }: CustomerSegmentLogProps) {
  const [logs, setLogs] = useState<CustomerSegmentLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchCustomerSegmentLog(
          segmentId ? { segmentId } : undefined,
        );
        setLogs(res.items || []);
      } catch (e: any) {
        setError(e.message || "세그먼트 이력을 불러오지 못했습니다.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [segmentId]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">세그먼트 이동 이력</h1>
        <p className="text-gray-500">고객 세그먼트 변경 이력 조회</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>
            최근 세그먼트 이동
            {segmentId ? ` (세그먼트 ID: ${segmentId})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          {loading && !error && (
            <p className="text-xs text-gray-400 mb-2">
              이력을 불러오는 중입니다...
            </p>
          )}
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
              {logs.map((log, idx) => (
                <TableRow
                  key={`${log.customerId}-${idx}`}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="font-mono text-sm">
                    {log.customerId}
                  </TableCell>
                  <TableCell>{log.customerName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.fromSegment || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">→</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.toSegment}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {log.changedDate}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {log.reason || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !error && logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-gray-400"
                  >
                    표시할 이력 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
