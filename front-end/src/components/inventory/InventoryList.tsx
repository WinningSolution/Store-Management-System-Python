/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Search, Download, Plus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Page } from "../../App";
import { fetchInventoryList, InventoryItem } from "../../services/inventoryApi";
import { fetchStores, StoreListItem } from "../../services/storeApi";

interface InventoryListProps {
  onNavigate: (page: Page, id?: string) => void;
}

export function InventoryList({ onNavigate }: InventoryListProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 30;

  // 점포 목록 로딩 (온라인 점포 제외)
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        const all = (res.items || []).filter((s) => {
          const name = (s.storeNm || "").toLowerCase();
          return !name.includes("온라인") && !name.includes("online");
        });
        setStores(all);
        if (!storeId && all.length > 0) {
          setStoreId(all[0].storeId);
        }
      } catch {
        // 점포 목록 로딩 실패 시에는 조용히 무시 (별도 토스트는 추후 추가 가능)
      }
    };
    loadStores();
  }, [storeId]);

  // 재고 데이터 로딩
  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchInventoryList({ store_id: storeId });
        setItems(res.items || []);
      } catch (e: any) {
        setError(e.message || "재고 데이터를 불러오지 못했습니다.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  const filteredItems = items.filter((item) => {
    const name = item.prodNm || "";
    const sku = item.sku || "";
    const matchesSearch =
      !searchTerm || name.includes(searchTerm) || sku.includes(searchTerm);
    const matchesLine =
      lineFilter === "all" || item.prodLine === lineFilter;
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "critical"
        ? ["긴급", "임박"].includes(item.status)
        : item.status === statusFilter;
    return matchesSearch && matchesLine && matchesStatus;
  });

  const totalSku = items.length;
  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalAssetValue = items.reduce(
    (sum, i) => sum + i.price * i.stock,
    0
  );
  const deadStockValue = items
    .filter((i) => i.last90 === 0)
    .reduce((sum, i) => sum + i.price * i.stock, 0);
  const deadStockRatio =
    totalAssetValue > 0 ? (deadStockValue / totalAssetValue) * 100 : 0;
  const urgentCount = items.filter((i) => i.status === "긴급").length;
  const warningCount = items.filter((i) => i.status === "임박").length;
  const oosCount = items.filter((i) => i.status === "품절").length;

  // 상단 "오늘 조치가 필요한 재고"는 전체 점포 재고 기준으로만 계산 (하단 필터와 무관)
  const criticalInventory = items.filter((i) =>
    ["긴급", "임박", "품절"].includes(i.status)
  );

  const todayTop = [...criticalInventory]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const formatWon = (value: number) =>
    `₩${Math.round(value).toLocaleString()}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "긴급":
        return "bg-red-100 text-red-700";
      case "임박":
        return "bg-orange-100 text-orange-700";
      case "품절":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            재고 현황
          </h1>
          <p className="text-gray-500 text-sm">
            오늘 바로 챙겨야 할 재고 인사이트입니다.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onNavigate("inventory-forecast")}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            AI 발주 예측
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            재고 등록
          </Button>
        </div>
      </div>

      {/* 점포 선택 필터 */}
      <div className="flex items-center justify_between gap-4">
        <div>
          <span className="block text-xs text-gray-500 mb-1">점포 선택</span>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {stores.map((s) => (
              <option key={s.storeId} value={s.storeId}>
                {s.storeNm || s.storeId}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-400">
          {loading
            ? "선택한 점포의 재고를 불러오는 중입니다..."
            : error
            ? error
            : ""}
        </div>
      </div>

      {/* 상태 산출 기준 설명 */}
      <p className="text-xs text-gray-400">
        최근 7일간의 판매수량을 기준으로 적정 재고를 산출합니다. 현재 재고가 이
        적정 재고의 30% 이하이면 <span className="font-medium">긴급</span>, 30%
        초과 70% 이하이면 <span className="font-medium">임박</span>, 그 외는{" "}
        <span className="font-medium">정상</span>으로 표시됩니다. 재고가 0개이면{" "}
        <span className="font-medium">품절</span>입니다.
      </p>

      {/* 주요 인사이트 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="border-0 shadow-sm bg-red-50 border-red-100 cursor-pointer"
          onClick={() => {
            setStatusFilter("critical");
            setPage(1);
          }}
        >
          <CardContent className="p-5">
            <p className="text-xs font-medium text-red-600 mb-1">
              오늘 당장 확인해야 할 재고
            </p>
            <p className="text-2xl font-semibold text-red-900 mb-1">
              {urgentCount + warningCount}개 SKU
            </p>
            <p className="text-xs text-red-700">
              긴급 {urgentCount} · 임박 {warningCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-amber-50 border-amber-100">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-amber-600 mb-1">
              품절 / Dead Stock 징후
            </p>
            <p className="text-2xl font-semibold text-amber-900 mb-1">
              {oosCount}개 SKU
            </p>
            <p className="text-xs text-amber-700">
              품절로 인한 판매 손실 가능성이 있는 상품입니다.
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-slate-50 border-slate-100 cursor-pointer hover:bg-slate-100"
          onClick={() => onNavigate("dead-stock-monitor")}
        >
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-600 mb-1">
              전체 재고 자산
            </p>
            <p className="text-2xl font-semibold text-slate-900 mb-1">
              {formatWon(totalAssetValue)}
            </p>
            <p className="text-xs text-slate-600">
              Dead Stock 비중 약 {deadStockRatio.toFixed(1)}% (최근 180일 무판매 기준)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 오늘 조치가 필요한 재고 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>오늘 조치가 필요한 재고</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              긴급·임박·품절 상태 중 우선순위 높은 SKU를 모아봤어요.
            </p>
          </div>
          {criticalInventory.length > 0 && (
            <span className="text-xs text-gray-500">
              총 {criticalInventory.length}개 중 상위 {todayTop.length}개 표시
            </span>
          )}
        </CardHeader>
        <CardContent>
          {todayTop.length === 0 ? (
            <p className="text-xs text-gray-400">
              현재 조치가 필요한 재고는 없습니다. 👍
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-3 text-left text-gray-500">상품</th>
                    <th className="py-2 px-3 text-left text-gray-500">옵션</th>
                    <th className="py-2 px-3 text-left text-gray-500">
                      현재 재고
                    </th>
                    <th className="py-2 px-3 text-left text-gray-500">상태</th>
                    <th className="py-2 px-3 text-left text-gray-500">
                      추천 조치
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {todayTop.map((item) => (
                    <tr
                      key={item.sku}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        onNavigate("inventory-detail", `${storeId}::${item.sku}`)
                      }
                    >
                      <td className="py-2 px-3 text-gray-900">
                        {item.prodNm}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {item.color} / {item.size}
                      </td>
                      <td className="py-2 px-3 text-gray-900">
                        {item.stock}개
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={getStatusColor(item.status)}
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate("inventory-forecast", item.sku);
                            }}
                          >
                            발주 검토
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(
                                "inventory-detail",
                                `${storeId}::${item.sku}`
                              );
                            }}
                          >
                            상세보기
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 전체 재고 리스트 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="상품명 또는 SKU로 검색"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={lineFilter}
                onChange={(e) => {
                  setLineFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">전체 라인</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
                <option value="키즈">키즈</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">전체 상태</option>
                <option value="critical">긴급+임박</option>
                <option value="긴급">긴급만</option>
                <option value="임박">임박만</option>
                <option value="품절">품절만</option>
                <option value="정상">정상만</option>
              </select>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            이 점포 보유 SKU {totalSku}개 · 현재 필터 {totalFiltered}개 표시 중
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-500">SKU</th>
                  <th className="text-left py-4 px-4 text-gray-500">상품명</th>
                  <th className="text-left py-4 px-4 text-gray-500">색상</th>
                  <th className="text-left py-4 px-4 text-gray-500">사이즈</th>
                  <th className="text-left py-4 px-4 text-gray-500">가격</th>
                  <th className="text-left py-4 px-4 text-gray-500">위치</th>
                  <th className="text-left py-4 px-4 text-gray-500">재고</th>
                  <th className="text-left py-4 px-4 text-gray-500">상태</th>
                  <th className="text-left py-4 px-4 text-gray-500">AI 추천</th>
                  <th className="text-left py-4 px-4 text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.sku}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        onNavigate("inventory-detail", `${storeId}::${item.sku}`)
                      }
                  >
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {item.sku}
                    </td>
                    <td className="py-4 px-4 text-gray-900">{item.prodNm}</td>
                    <td className="py-4 px-4 text-gray-600">{item.color}</td>
                    <td className="py-4 px-4 text-gray-600">{item.size}</td>
                    <td className="py-4 px-4 text-gray-900">
                      ₩{item.price.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="outline"
                        className={
                          item.location === "매장"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }
                      >
                        {item.location}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-900">
                      {item.stock}개
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="outline"
                        className={getStatusColor(item.status)}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-900">
                      {item.aiSuggested}개
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(
                            "inventory-detail",
                            `${storeId}::${item.sku}`
                          );
                        }}
                      >
                        상세보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>
              페이지 {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


