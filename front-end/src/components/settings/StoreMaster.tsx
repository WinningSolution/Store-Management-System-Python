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
import { Plus, MapPin } from "lucide-react";
import { Badge } from "../ui/badge";

interface StoreMasterProps {
  onNavigate: (page: Page) => void;
}

const storeData = [
  {
    id: "ST001",
    name: "강남점",
    address: "서울 강남구 테헤란로 123",
    phone: "02-1234-5678",
    manager: "김점장",
    openDate: "2020-03-15",
    status: "운영중",
  },
  {
    id: "ST002",
    name: "홍대점",
    address: "서울 마포구 홍익로 456",
    phone: "02-2345-6789",
    manager: "이점장",
    openDate: "2021-06-20",
    status: "운영중",
  },
  {
    id: "ST003",
    name: "명동점",
    address: "서울 중구 명동길 789",
    phone: "02-3456-7890",
    manager: "박점장",
    openDate: "2019-11-10",
    status: "임시휴업",
  },
];

export function StoreMaster({ onNavigate }: StoreMasterProps) {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">매장 정보 관리</h1>
          <p className="text-gray-500">매장 등록 및 정보 수정</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          새 매장 등록
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 매장 목록 */}
        <div className="col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>전체 매장 ({storeData.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장 ID</TableHead>
                    <TableHead>매장명</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>점장</TableHead>
                    <TableHead>개점일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeData.map((store) => (
                    <TableRow key={store.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {store.id}
                      </TableCell>
                      <TableCell>{store.name}</TableCell>
                      <TableCell className="text-sm">{store.address}</TableCell>
                      <TableCell className="text-sm">{store.phone}</TableCell>
                      <TableCell>{store.manager}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {store.openDate}
                      </TableCell>
                      <TableCell>
                        {store.status === "운영중" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            운영중
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                            임시휴업
                          </Badge>
                        )}
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
            </CardContent>
          </Card>
        </div>

        {/* 지도 뷰 (플레이스홀더) */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                매장 위치
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">지도 영역</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
