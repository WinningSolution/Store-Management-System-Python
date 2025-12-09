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
import { Plus, Filter } from "lucide-react";
import { Badge } from "../ui/badge";

interface ProductMasterProps {
  onNavigate: (page: Page) => void;
}

const productData = [
  {
    id: "P1001",
    name: "남성 반팔 티셔츠",
    season: "SS24",
    line: "남성",
    category: "상의",
    color: "화이트",
    size: "M",
    price: 29000,
    status: "판매중",
  },
  {
    id: "P1002",
    name: "여성 원피스",
    season: "SS24",
    line: "여성",
    category: "원피스",
    color: "블랙",
    size: "FREE",
    price: 49000,
    status: "판매중",
  },
  {
    id: "P1003",
    name: "키즈 반팔",
    season: "SS24",
    line: "키즈",
    category: "상의",
    color: "블루",
    size: "120",
    price: 19000,
    status: "판매중",
  },
  {
    id: "P1004",
    name: "남성 청바지",
    season: "SS24",
    line: "남성",
    category: "하의",
    color: "인디고",
    size: "32",
    price: 59000,
    status: "단종",
  },
];

export function ProductMaster({ onNavigate }: ProductMasterProps) {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">상품 마스터 관리</h1>
          <p className="text-gray-500">상품 정보 등록 및 수정</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          새 상품 등록
        </Button>
      </div>

      {/* 필터 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 시즌</option>
              <option>SS24</option>
              <option>FW23</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 라인</option>
              <option>남성</option>
              <option>여성</option>
              <option>키즈</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 카테고리</option>
              <option>상의</option>
              <option>하의</option>
              <option>원피스</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option>전체 상태</option>
              <option>판매중</option>
              <option>단종</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 상품 테이블 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>전체 상품 ({productData.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품 ID</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>시즌</TableHead>
                <TableHead>라인</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>색상</TableHead>
                <TableHead>사이즈</TableHead>
                <TableHead className="text-right">가격</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productData.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {product.id}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.season}</Badge>
                  </TableCell>
                  <TableCell>{product.line}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.color}</TableCell>
                  <TableCell>{product.size}</TableCell>
                  <TableCell className="text-right">
                    ₩{product.price.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {product.status === "판매중" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        판매중
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        단종
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
  );
}
