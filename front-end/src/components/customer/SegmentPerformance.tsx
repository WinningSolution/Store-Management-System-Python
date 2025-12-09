import { Page } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SegmentPerformanceProps {
  onNavigate: (page: Page) => void;
}

const segmentRFMData = [
  { segment: "VIP", recency: 4.5, frequency: 8.2, monetary: 1350000 },
  { segment: "Active", recency: 3.8, frequency: 4.5, monetary: 720000 },
  { segment: "New", recency: 4.2, frequency: 1.2, monetary: 280000 },
  { segment: "이탈위험", recency: 2.1, frequency: 6.8, monetary: 950000 },
  { segment: "Churned", recency: 1.2, frequency: 5.2, monetary: 850000 },
];

const retentionData = [
  { month: "M+0", VIP: 100, Active: 100, New: 100 },
  { month: "M+1", VIP: 85, Active: 65, New: 42 },
  { month: "M+2", VIP: 78, Active: 52, New: 28 },
  { month: "M+3", VIP: 72, Active: 45, New: 20 },
  { month: "M+6", VIP: 65, Active: 35, New: 12 },
];

export function SegmentPerformance({ onNavigate }: SegmentPerformanceProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">세그먼트 성과·리텐션</h1>
        <p className="text-gray-500">세그먼트별 RFM 평균 및 리텐션 곡선</p>
      </div>

      {/* 세그먼트별 RFM */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>세그먼트별 평균 R/F/M</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={segmentRFMData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="segment" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="recency" fill="#3b82f6" name="Recency" />
              <Bar dataKey="frequency" fill="#10b981" name="Frequency" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 세그먼트별 리텐션 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>세그먼트별 리텐션 곡선</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "리텐션 (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="VIP" stroke="#a855f7" strokeWidth={2} />
              <Line type="monotone" dataKey="Active" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="New" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
