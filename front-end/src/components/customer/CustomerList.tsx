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
import { Filter, Search } from "lucide-react";
import { Badge } from "../ui/badge";

interface CustomerListProps {
  onNavigate: (page: Page, id?: string) => void;
}

const customerData = [
  {
    id: "C00001",
    name: "김민준",
    gender: "남성",
    age: "30대",
    region: "서울",
    joinDate: "2023-05-12",
    lastPurchaseDate: "2024-06-15",
    totalAmount: 1250000,
    purchaseCount: 8,
    segment: "VIP",
  },
  {
    id: "C00002",
    name: "이서연",
    gender: "여성",
    age: "20대",
    region: "경기",
    joinDate: "2023-08-20",
    lastPurchaseDate: "2024-06-20",
    totalAmount: 850000,
    purchaseCount: 5,
    segment: "Active",
  },
  {
    id: "C00003",
    name: "박지후",
    gender: "남성",
    age: "40대",
    region: "서울",
    joinDate: "2023-03-15",
    lastPurchaseDate: "2024-02-10",
    totalAmount: 2100000,
    purchaseCount: 12,
    segment: "Churned",
  },
  {
    id: "C00004",
    name: "최하은",
    gender: "여성",
    age: "30대",
    region: "인천",
    joinDate: "2024-01-05",
    lastPurchaseDate: "2024-06-18",
    totalAmount: 450000,
    purchaseCount: 3,
    segment: "New",
  },
  {
    id: "C00005",
    name: "정우진",
    gender: "남성",
    age: "20대",
    region: "서울",
    joinDate: "2023-11-22",
    lastPurchaseDate: "2024-06-22",
    totalAmount: 1580000,
    purchaseCount: 10,
    segment: "VIP",
  },
];

const getSegmentBadge = (segment: string) => {
  switch (segment) {
    case "VIP":
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">VIP</Badge>;
    case "Active":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    case "New":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">New</Badge>;
    case "Churned":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Churned</Badge>;
    default:
      return <Badge>{segment}</Badge>;
  }
};

export function CustomerList({ onNavigate }: CustomerListProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">고객 목록</h1>
        <p className="text-gray-500">전체 고객 정보 및 구매 이력 조회</p>
      </div>

      {/* 필터 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="고객 ID, 이름 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 성별</option>
              <option>남성</option>
              <option>여성</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 연령대</option>
              <option>20대</option>
              <option>30대</option>
              <option>40대</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 세그먼트</option>
              <option>VIP</option>
              <option>Active</option>
              <option>New</option>
              <option>Churned</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 고객 테이블 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>전체 고객 ({customerData.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>성별</TableHead>
                <TableHead>연령대</TableHead>
                <TableHead>지역</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>최근구매일</TableHead>
                <TableHead className="text-right">총구매액</TableHead>
                <TableHead className="text-right">구매횟수</TableHead>
                <TableHead>세그먼트</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerData.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onNavigate('customer-detail', customer.id)}
                >
                  <TableCell className="font-mono text-sm">
                    {customer.id}
                  </TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.gender}</TableCell>
                  <TableCell>{customer.age}</TableCell>
                  <TableCell>{customer.region}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {customer.joinDate}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {customer.lastPurchaseDate}
                  </TableCell>
                  <TableCell className="text-right">
                    ₩{(customer.totalAmount / 1000).toFixed(0)}k
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.purchaseCount}회
                  </TableCell>
                  <TableCell>{getSegmentBadge(customer.segment)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('customer-detail', customer.id);
                      }}
                    >
                      상세
                    </Button>
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
