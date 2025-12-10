import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Page } from '../../App';
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchOrderForecastSummary, fetchOrderForecastItems, OrderForecastItem } from '../../services/orderForecastApi';
import { fetchStores, StoreListItem } from '../../services/storeApi';

interface InventoryForecastProps {
  onNavigate: (page: Page) => void;
  /** 대시보드/재고 화면 등에서 넘어온 초기 점포 ID */
  initialStoreId?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case '긴급':
      return 'bg-red-100 text-red-700';
    case '높음':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
};

type PriorityFilter = 'ALL' | '긴급' | '높음' | '보통';

export function InventoryForecast({ onNavigate, initialStoreId }: InventoryForecastProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeId, setStoreId] = useState<string | undefined>(initialStoreId);
  const [summary, setSummary] = useState<{
    urgentCount: number;
    totalRecommendQty: number;
    coveragePct: number;
  } | null>(null);
  const [items, setItems] = useState<OrderForecastItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        const all = (res.items || []).filter((s) => {
          const name = (s.storeNm || '').toLowerCase();
          return !name.includes('온라인') && !name.includes('online');
        });
        setStores(all);
        // initialStoreId 가 없을 때만 기본 점포를 자동 선택
        if (!initialStoreId && all.length > 0) {
          setStoreId(all[0].storeId);
        }
      } catch {
        // ignore
      }
    };
    loadStores();
  }, [initialStoreId]);

  const loadData = useMemo(
    () => async (targetStoreId?: string, priority: PriorityFilter = priorityFilter) => {
      if (!targetStoreId) return;
      try {
        setLoading(true);
        const [summaryRes, itemsRes] = await Promise.all([
          fetchOrderForecastSummary({ store_id: targetStoreId }),
          fetchOrderForecastItems({
            store_id: targetStoreId,
            priority: priority === 'ALL' ? undefined : priority,
            page: 1,
            page_size: 100,
          }),
        ]);
        setSummary({
          urgentCount: summaryRes.summary.urgentCount,
          totalRecommendQty: summaryRes.summary.totalRecommendQty,
          coveragePct: summaryRes.summary.coveragePct,
        });
        setItems(itemsRes.items || []);
        setTotalItems(itemsRes.total || 0);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load order forecast:', e);
      } finally {
        setLoading(false);
      }
    },
    [priorityFilter],
  );

  useEffect(() => {
    if (storeId) {
      loadData(storeId, priorityFilter);
    }
  }, [storeId, priorityFilter, loadData]);

  const demandTrend = useMemo(
    () => [
      { week: '지난주', actual: 0, predicted: 0 },
      { week: '다음주', actual: 0, predicted: summary?.totalRecommendQty || 0 },
    ],
    [summary?.totalRecommendQty],
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-semibold">AI 발주 예측</h1>
          <p className="text-gray-500 text-sm">
            누적된 판매·재고 데이터를 기반으로 최근 판매 패턴과 재고 현황을 분석해, 다음 7일 동안 필요한 발주량을 점포별·SKU별로 추천합니다.
          </p>
        </div>
        {stores.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="block mb-1">점포 선택</span>
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
        )}
      </div>

      {/* AI 모델 정보 */}
      <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">AI 회귀 모델 예측 시스템</h3>
              <p className="text-gray-600 mb-4 text-sm">
                누적된 판매·재고 데이터를 기반으로 점포·SKU별 다음 7일 판매량을 예측하고, 현재 재고와 비교해 적정 발주량을 제안합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-gray-500 mb-1">예측 단위</p>
                  <p className="text-gray-900">점포·SKU별 7일 판매량</p>
                </div>
                <div className="p-3 bg-white rounded-lg md:col-span-2">
                  <p className="text-gray-500 mb-2">주요 고려 요소</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                      최근 판매 패턴
                    </span>
                    <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                      현재 재고 현황
                    </span>
                    <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                      재고 흐름
                    </span>
                    <span className="px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                      상품·달력 특성
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">긴급 발주 필요</p>
            <p className="text-gray-900 text-xl font-semibold">
              {summary ? `${summary.urgentCount.toLocaleString()}개 SKU` : '–'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">총 추천 발주량</p>
            <p className="text-gray-900 text-xl font-semibold">
              {summary ? `${summary.totalRecommendQty.toLocaleString()}개` : '–'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">예측 발주 커버리지</p>
            <p className="text-gray-900 text-xl font-semibold">
              {summary ? `${summary.coveragePct.toFixed(1)}%` : '–'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              최근 90일 전체 매출 금액 중, 예측 발주 대상 SKU가 차지하는 매출 비중입니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 수요 예측 차트 (간단 요약) */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>주간 수요 예측 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={demandTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="predicted" fill="#3b82f6" name="예측 수요(7일)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 발주 추천 테이블 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SKU별 발주 추천</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mr-4">
                <span>우선순위</span>
                <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                  {(['ALL', '긴급', '높음', '보통'] as PriorityFilter[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2 py-0.5 rounded-full text-[11px] ${
                        priorityFilter === p ? 'bg-gray-900 text-white' : 'text-gray-600'
                      }`}
                    >
                      {p === 'ALL' ? '전체' : p}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" disabled>
                전체 발주 요청
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            모델이 제안하는 발주량은 다음 7일 예상 판매량과 현재 재고를 비교한 결과이며, 실제 발주 시 매장 상황을 함께
            고려해주세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>
              총 {totalItems.toLocaleString()}개 중 {items.length.toLocaleString()}개 표시
            </span>
            {loading && <span className="text-blue-600">로딩 중...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">우선순위</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">상품</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">현재 재고</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">추천 발주량</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">AI 예측 근거</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.storeId}-${item.prodId}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      <div className="flex flex-col">
                        <span className="text-sm">{item.prodNm || item.prodId}</span>
                        <span className="text-[11px] text-gray-400 font-mono">{item.prodId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={item.currStock <= 10 ? 'text-red-600' : 'text-gray-900'}>
                        {item.currStock.toLocaleString()}개
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-blue-600 font-medium">
                        {item.recommendQty.toLocaleString()}개
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs max-w-md">
                      {item.explainText || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm" disabled>
                        발주하기
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                      현재 선택한 점포에는 예측 발주 대상 SKU가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

