import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Page } from '../../App';
import { API_BASE_URL } from '../../lib/api';
import {
  fetchSalesList,
  fetchSalesSummary,
  DailySalesItem,
  SalesListItem,
} from '../../services/salesApi';
import { fetchStores, StoreListItem } from '../../services/storeApi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface SalesListProps {
  onNavigate: (page: Page, id?: string, options?: any) => void;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export function SalesList({
  onNavigate,
  initialDateFrom,
  initialDateTo,
}: SalesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom || '');
  const [dateTo, setDateTo] = useState<string>(initialDateTo || '');
  const [storeId, setStoreId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(0);

  const [rows, setRows] = useState<SalesListItem[]>([]);
  const [summaryDaily, setSummaryDaily] = useState<DailySalesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreListItem[]>([]);

  // 금액/수량 정렬 상태
  const [sortKey, setSortKey] = useState<'amount' | 'qty' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const listParams: any = {
          page,
          page_size: pageSize,
        };
        if (dateFrom) {
          listParams.date_from = dateFrom;
        }
        if (dateTo) {
          listParams.date_to = dateTo;
        }
        if (storeId !== 'all') {
          listParams.store_id = storeId;
        }
        if (paymentFilter !== 'all') {
          listParams.pay_type = paymentFilter;
        }

        const summaryParams: any = {};
        if (storeId !== 'all') {
          summaryParams.store_id = storeId;
        }
        if (paymentFilter !== 'all') {
          summaryParams.pay_type = paymentFilter;
        }

        const [listRes, summaryRes] = await Promise.all([
          fetchSalesList(listParams),
          fetchSalesSummary(summaryParams),
        ]);

        setRows(listRes.items || []);
        setTotal(listRes.total || 0);
        setSummaryDaily(summaryRes.daily || []);
      } catch (e: any) {
        setError(e.message || '판매 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, pageSize, dateFrom, dateTo, storeId, paymentFilter]);

  // 매장 목록은 최초 한 번만 로딩
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        setStores(res.items || []);
      } catch {
        // 매장 목록 실패 시에도 화면은 동작해야 하므로 조용히 무시
      }
    };
    loadStores();
  }, []);

  // 일자별 매출 추이: 서버 요약 데이터를 우선 사용하되, 없으면 rows 기준으로 계산
  const dailySummary = useMemo(() => {
    let base: { date: string; totalAmount: number }[] = [];

    if (summaryDaily.length > 0) {
      base = summaryDaily.map((d) => ({
        date: d.date,
        totalAmount: d.totalAmount,
      }));
    } else {
      const map = new Map<string, number>();
      rows.forEach((sale) => {
        const day = sale.saleDt.slice(0, 10); // YYYY-MM-DD
        map.set(day, (map.get(day) || 0) + sale.amount);
      });
      base = Array.from(map.entries()).map(([date, totalAmount]) => ({
        date,
        totalAmount,
      }));
    }

    // 날짜 오름차순 정렬 후, 최근 7일만 사용 (최소 5일 이상 보이도록)
    const sorted = [...base].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-7);
  }, [summaryDaily, rows]);

  const lineSummary = useMemo(() => {
    const map = new Map<string | null | undefined, number>();
    rows.forEach((sale) => {
      const key = sale.prodLine || sale.category || '기타';
      map.set(key, (map.get(key) || 0) + sale.amount);
    });
    return Array.from(map.entries()).map(([line, totalAmount]) => ({
      line: line || '기타',
      totalAmount,
    }));
  }, [rows]);

  const categorySummary = useMemo(() => {
    const map = new Map<string | null | undefined, number>();
    rows.forEach((sale) => {
      const key = sale.category || '기타';
      map.set(key, (map.get(key) || 0) + sale.amount);
    });
    return Array.from(map.entries()).map(([category, totalAmount]) => ({
      category: category || '기타',
      totalAmount,
    }));
  }, [rows]);

  // 시각적으로 구분이 잘 되도록 레인보우 계열 색상 사용 (주로 카테고리용)
  const pieColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6'];

  // 라인(키즈/남성/여성) 전용 색상 맵
  const lineColorMap: Record<string, string> = {
    키즈: '#ef4444', // 빨
    남성: '#3b82f6', // 파
    여성: '#22c55e', // 초
  };
  // 검색 + 정렬된 판매 리스트
  const filteredSales = useMemo(() => {
    const base = rows.filter((sale) => {
      const matchesSearch =
        sale.saleId.includes(searchTerm) ||
        (sale.prodNm ? sale.prodNm.includes(searchTerm) : false);
      // 결제수단 필터는 백엔드에서 처리하므로 여기서는 검색 조건만 적용
      return matchesSearch;
    });

    if (!sortKey) {
      return base;
    }

    const sorted = [...base].sort((a, b) => {
      const aVal = sortKey === 'amount' ? a.amount : a.qty;
      const bVal = sortKey === 'amount' ? b.amount : b.qty;
      if (sortDirection === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    return sorted;
  }, [rows, searchTerm, sortKey, sortDirection]);

  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);

  // 전체 기간 기준 총 결제금액 (요약 데이터 우선 활용)
  const totalAmountAll = useMemo(() => {
    if (summaryDaily.length > 0) {
      return summaryDaily.reduce((sum, d) => sum + d.totalAmount, 0);
    }
    return rows.reduce((sum, sale) => sum + sale.amount, 0);
  }, [summaryDaily, rows]);

  const latestDate = useMemo(() => {
    if (summaryDaily.length > 0) {
      const sorted = [...summaryDaily].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[sorted.length - 1]?.date;
    }
    if (rows.length > 0) {
      const max = rows.reduce((acc, cur) =>
        acc && acc > cur.saleDt ? acc : cur.saleDt,
        rows[0].saleDt
      );
      return max.slice(0, 10);
    }
    return undefined;
  }, [summaryDaily, rows]);

  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return `₩${num.toLocaleString()}`;
  };

  // 파이 차트용 툴팁 (금액 + 비중 % 함께 표시)
  const renderPieTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;

    const item = payload[0];
    const name =
      item.name ||
      item.payload?.line ||
      item.payload?.category ||
      '';
    const value =
      item.payload?.totalAmount ??
      item.value ??
      0;

    // 어떤 파이 차트인지에 따라 전체 합 계산
    let totalForPie = 0;
    if (item.payload?.line !== undefined) {
      // 라인별 매출 비중
      totalForPie = lineSummary.reduce(
        (sum, d) => sum + d.totalAmount,
        0
      );
    } else if (item.payload?.category !== undefined) {
      // 카테고리별 매출 비중
      totalForPie = categorySummary.reduce(
        (sum, d) => sum + d.totalAmount,
        0
      );
    } else {
      // 예비: 전체 매출 합
      totalForPie = totalAmountAll;
    }

    const percent =
      totalForPie > 0 ? (Number(value) / totalForPie) * 100 : 0;

    return (
      <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs text-gray-700">
        <div className="font-medium mb-1">{name}</div>
        <div>매출: {formatCurrency(value)}</div>
        <div className="text-blue-600 mt-0.5">비중: {percent.toFixed(1)}%</div>
      </div>
    );
  };

  // 카테고리 범례용 TOP5
  const categoryLegendTop5 = useMemo(() => {
    const sorted = [...categorySummary].sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
    return sorted.slice(0, 5);
  }, [categorySummary]);

  // 카테고리 범례 렌더러 (라인별 범례와 동일 스타일, TOP5만 표시)
  const renderCategoryLegend = (props: any) => {
    const payload = (props?.payload || []) as { value: string; color: string }[];
    if (!payload.length) return null;

    // Legend payload 에서 카테고리 이름 → 색상 매핑
    const colorMap = new Map<string, string>();
    payload.forEach((p) => {
      if (p.value) {
        colorMap.set(p.value, p.color);
      }
    });

    return (
      <div className="flex flex-col ml-2 space-y-1">
        {categoryLegendTop5.map((entry, idx) => {
          const name = entry.category || '기타';
          const color =
            colorMap.get(name) ?? pieColors[idx % pieColors.length];
          return (
            <div
              key={`${name}-${idx}`}
              className="flex items-center text-sm text-gray-700"
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: color }}
              />
              <span>{name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDownloadExcel = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (storeId !== 'all') params.append('store_id', storeId);
    if (paymentFilter !== 'all') params.append('pay_type', paymentFilter);
    if (searchTerm) params.append('keyword', searchTerm);

    const query = params.toString();
    const url = `${API_BASE_URL}/sales/export${query ? `?${query}` : ''}`;

    // 새 탭으로 열어서 브라우저 기본 다운로드 동작 사용
    window.open(url, '_blank');
  };

  const handleChartClick = (state: any) => {
    const date = state?.activeLabel as string | undefined;
    if (!date) return;
    setPage(1);
    // 같은 날짜를 다시 클릭하면 날짜 필터 해제
    if (dateFrom === date && dateTo === date) {
      setDateFrom('');
      setDateTo('');
    } else {
      setDateFrom(date);
      setDateTo(date);
    }
  };

  const handleSort = (key: 'amount' | 'qty') => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDir) => (prevDir === 'desc' ? 'asc' : 'desc'));
        return prevKey;
      }
      // 새로운 컬럼 클릭 시 기본은 내림차순
      setSortDirection('desc');
      return key;
    });
  };

  return (
    <div className="p-8">
      {/* 상단 요약 + 인사이트 차트 3개 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-gray-900">판매 내역</h1>
              <select
                value={storeId}
                onChange={(e) => {
                  setPage(1);
                  setStoreId(e.target.value);
                }}
                className="h-9 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">전체 매장</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeNm ? `${s.storeNm} (${s.storeId})` : s.storeId}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-gray-500">
              누적 결제건수 {total.toLocaleString()}건 / 누적 결제금액 ₩
              {totalAmountAll.toLocaleString()}
              {latestDate && (
                <span className="ml-2 text-xs text-gray-400">
                  (기준일 {latestDate})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadExcel}>
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* 1) 일자별 매출 추이 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">최근 7일 매출 추이</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40">
                <LineChart
                  width={320}
                  height={160}
                  data={dailySummary}
                  onClick={handleChartClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={formatCurrency} />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </div>
            </CardContent>
          </Card>

          {/* 2) 라인(카테고리)별 매출 비중 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">라인별 매출 비중</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40 flex items-center">
                <PieChart width={260} height={180}>
                  <Tooltip content={renderPieTooltip} />
                  <Pie
                    data={lineSummary}
                    dataKey="totalAmount"
                    nameKey="line"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {lineSummary.map((entry, index) => {
                      const key = entry.line || '';
                      const color = lineColorMap[key] || pieColors[index % pieColors.length];
                      return <Cell key={key || index} fill={color} />;
                    })}
                  </Pie>
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    formatter={(value: any) => (
                      <span className="text-sm text-gray-700 ml-1">{value}</span>
                    )}
                  />
                </PieChart>
              </div>
            </CardContent>
          </Card>

          {/* 3) 결제수단별 매출 비중 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">카테고리별 매출 비중</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40 flex items-center">
                <PieChart width={260} height={180}>
                  <Tooltip content={renderPieTooltip} />
                  <Pie
                    data={categorySummary}
                    dataKey="totalAmount"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {categorySummary.map((entry, index) => (
                      <Cell
                        key={entry.category || index}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    content={renderCategoryLegend}
                  />
                </PieChart>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="거래번호 또는 상품명으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {/* 날짜 필터 */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setPage(1);
                  setDateFrom(e.target.value);
                }}
                className="h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="self-center text-gray-400 text-sm">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setPage(1);
                  setDateTo(e.target.value);
                }}
                className="h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {/* 결제수단 필터 */}
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPage(1);
                  setPaymentFilter(e.target.value);
                }}
                className="h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">전체 결제수단</option>
                <option value="신용카드">신용카드</option>
                <option value="체크카드">체크카드</option>
                <option value="모바일결제">모바일결제</option>
                <option value="현금">현금</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-500">거래번호</th>
                  <th className="text-left py-4 px-4 text-gray-500">일시</th>
                  <th className="text-left py-4 px-4 text-gray-500">매장</th>
                  <th className="text-left py-4 px-4 text-gray-500">상품</th>
                  <th className="text-left py-4 px-4 text-gray-500">카테고리</th>
                  <th className="text-left py-4 px-4 text-gray-500">
                    <button
                      type="button"
                      onClick={() => handleSort('qty')}
                      className="inline-flex items-center gap-1"
                    >
                      수량
                      {sortKey === 'qty' && (
                        <span className="text-xs text-gray-400">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-gray-500">
                    <button
                      type="button"
                      onClick={() => handleSort('amount')}
                      className="inline-flex items-center gap-1"
                    >
                      금액
                      {sortKey === 'amount' && (
                        <span className="text-xs text-gray-400">
                          {sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-4 text-gray-500">결제</th>
                  <th className="text-left py-4 px-4 text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr 
                    key={`${sale.saleId}-${sale.prodId}`} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('sales-detail', sale.saleId)}
                  >
                    <td className="py-4 px-4 text-gray-600 text-sm">{sale.saleId}</td>
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {new Date(sale.saleDt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {sale.storeNm || sale.storeId}
                    </td>
                    <td className="py-4 px-4 text-gray-900">{sale.prodNm}</td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant="outline"
                        className={
                          sale.category === '남성'
                            ? 'bg-blue-100 text-blue-700'
                            : sale.category === '여성'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {sale.category || '-'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{sale.qty}개</td>
                    <td className="py-4 px-4 text-gray-900">₩{sale.amount.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <Badge variant={sale.payType === '카드' ? 'default' : 'secondary'}>
                        {sale.payType || '-'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('sales-detail', sale.saleId);
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

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
            <p className="text-gray-600">
              총 <span className="text-gray-900">{total.toLocaleString()}</span>건
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </Button>
              <span className="px-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
