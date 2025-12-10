import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, TrendingDown, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Page } from '../../App';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Sankey,
  Rectangle,
} from 'recharts';
import { toast } from 'sonner';
import {
  fetchInventoryDetail,
  InventoryChangeLogItem,
  InventoryDetailItem,
  InventoryStockHistoryPoint,
  InventoryFlowSummary,
} from '../../services/inventoryApi';

interface InventoryDetailProps {
  itemId: string;
  onNavigate: (page: Page) => void;
}

export function InventoryDetail({ itemId, onNavigate }: InventoryDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stockValue, setStockValue] = useState<number>(0);
  const [item, setItem] = useState<InventoryDetailItem | null>(null);
  const [stockHistory, setStockHistory] = useState<InventoryStockHistoryPoint[]>([]);
  const [changeLog, setChangeLog] = useState<InventoryChangeLogItem[]>([]);
  const [flowReferenceDate, setFlowReferenceDate] = useState<string>('');
  const [flow, setFlow] = useState<InventoryFlowSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { storeId, sku } = useMemo(() => {
    const [store, prod] = itemId.split('::');
    return { storeId: store, sku: prod || store };
  }, [itemId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchInventoryDetail({
          store_id: storeId,
          prod_id: sku,
        });
        setItem(res.item);
        setStockValue(res.item.stock);
        setStockHistory(res.stockHistory);
        setChangeLog(res.changeLog);
        setFlowReferenceDate(res.flowReferenceDate);
        setFlow(res.flow);
      } catch (e: any) {
        setError(e.message || '재고 상세 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, sku]);

  const sankeyData = useMemo(() => {
    const current = flow?.current ?? item?.stock ?? 0;
    const sold = flow?.sold ?? 0;
    const total = current + sold;
    if (total <= 0) {
      return { nodes: [], links: [] };
    }

    return {
      nodes: [
        { name: '총 입고' }, // 0
        { name: '판매' }, // 1
        { name: '현재재고' }, // 2
      ],
      links: [
        { source: 0, target: 1, value: sold },
        { source: 0, target: 2, value: current },
      ],
    };
  }, [flow, item?.stock]);

  const hasFlow = useMemo(() => {
    const current = flow?.current ?? item?.stock ?? 0;
    const sold = flow?.sold ?? 0;
    return current + sold > 0;
  }, [flow, item?.stock]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '긴급':
        return 'bg-red-100 text-red-700';
      case '임박':
        return 'bg-orange-100 text-orange-700';
      case '품절':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => onNavigate('inventory-list')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          재고 목록으로
        </Button>
        <p className="text-sm text-gray-500">재고 상세 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => onNavigate('inventory-list')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          재고 목록으로
        </Button>
        <p className="text-sm text-red-500">{error || '해당 재고 정보를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const handleSave = () => {
    // TODO: 추후 API 연동 예정 (현재는 단순 토스트만)
    toast.success('재고가 수정되었습니다');
    setIsEditing(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('inventory-list')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          재고 목록으로
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">{item.prodNm}</h1>
            <p className="text-gray-500">{item.sku}</p>
          </div>
          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* 기본 정보 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">상품명</p>
              <p className="text-gray-900">{item.prodNm}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">카테고리</p>
              <p className="text-gray-900">{item.category}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">색상</p>
                <p className="text-gray-900">{item.color}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">사이즈</p>
                <p className="text-gray-900">{item.size}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">가격</p>
              <p className="text-gray-900">₩{item.price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">위치</p>
              <Badge className="bg-blue-100 text-blue-700">{item.location}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 재고 정보 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>재고 정보</CardTitle>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">현재 재고</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={stockValue}
                    onChange={(e) => setStockValue(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button size="sm" onClick={handleSave} className="bg-blue-600">저장</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStockValue(item.stock);
                      setIsEditing(false);
                    }}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <p className="text-gray-900">{stockValue}개</p>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-red-900">품절 임박</p>
                <p className="text-xs text-red-600">{item.daysUntilOut}일 후 품절 예상</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">일평균 판매량</p>
              <p className="text-gray-900">{item.avgSalesPerDay}개/일</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb1">AI 추천 발주량 (AI)</p>
              <p className="text-blue-600">
                {(item.aiSuggested ?? item.recommended).toLocaleString()}개
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI 예측 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              AI 발주 예측
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">추천 발주량 (AI)</p>
              <p className="text-blue-600 text-xl font-semibold">
                {(item.aiSuggested ?? item.recommended).toLocaleString()}개
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-500">근거:</p>
              <ul className="space-y-1 text-gray-600">
                {item.aiExplain && <li>• {item.aiExplain}</li>}
                <li>• 최근 판매 패턴 (L7/L30 판매량, 주말/평일)</li>
                <li>• 현재 재고 현황 (매장+BR 재고)</li>
                <li>• 재고 흐름 (최근 입고/출고, 순입고)</li>
                <li>• 상품·달력 특성 (시즌, 라인/카테고리, 요일)</li>
              </ul>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled>
              발주 요청하기
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 재고 흐름 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>
            재고 흐름{' '}
            {flowReferenceDate
              ? `(${new Date(flowReferenceDate).toLocaleDateString('ko-KR')} 기준)`
              : '(기준일 정보 없음)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2 text-[11px] text-gray-500">
            <span>IN (전월이월 · 본사입고 · 고객반품)</span>
            <span>OUT (판매 · 현재재고)</span>
          </div>
          {hasFlow ? (
            <ResponsiveContainer width="100%" height={260}>
              <Sankey
                data={sankeyData}
                nodeWidth={18}
                nodePadding={40}
                link={{ stroke: '#60a5fa', strokeOpacity: 0.7 }}
                node={<Rectangle fill="#2563eb" stroke="#1d4ed8" strokeWidth={1} />}
              >
                <Tooltip
                  content={({ payload }: any) => {
                    if (!payload || !payload.length) return null;
                    const data = payload[0].payload;
                    if (data.source !== undefined) {
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="text-sm text-gray-900">
                            {sankeyData.nodes[data.source].name} →{' '}
                            {sankeyData.nodes[data.target].name}
                          </p>
                          <p className="text-sm text-blue-600 font-medium">
                            {data.value}개
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <p className="mt-3 text-xs text-gray-400">
              표시할 재고 흐름 데이터가 없습니다. (입고·판매 이력이 충분하지 않습니다.)
            </p>
          )}
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p>
              이 그래프는{' '}
              <span className="font-medium">
                전월이월 {flow?.prevCarry ?? 0}개 · 본사입고 {flow?.hqInbound ?? 0}개 · 고객반품{' '}
                {flow?.customerReturn ?? 0}개
              </span>
              가 어떻게 사용되었는지를 한 번에 보여줍니다.
            </p>
            <p>
              총{' '}
              <span className="font-medium">
                {(flow?.prevCarry ?? 0) +
                  (flow?.hqInbound ?? 0) +
                  (flow?.customerReturn ?? 0)}
                개 입고
              </span>{' '}
              중{' '}
              <span className="font-medium text-blue-700">
                {flow?.sold ?? 0}개는 판매
              </span>
              로 나가고,{' '}
              <span className="font-medium text-gray-700">
                {flow?.current ?? item.stock}개는 현재 재고
              </span>
              로 남아 있습니다. 선의 두께는 각각의 수량(개수)에 비례합니다.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-3">들어온 곳 (IN)</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">전월이월</span>
                  <span className="text-sm text-green-700">
                    {flow?.prevCarry ?? 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">본사입고</span>
                  <span className="text-sm text-green-700">
                    {flow?.hqInbound ?? 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">고객반품</span>
                  <span className="text-sm text-green-700">
                    {flow?.customerReturn ?? 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-100 rounded border border-green-200">
                  <span className="text-sm text-green-900">총 입고</span>
                  <span className="text-sm text-green-900">
                    {(flow?.prevCarry ?? 0) +
                      (flow?.hqInbound ?? 0) +
                      (flow?.customerReturn ?? 0)}
                    개
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-3">나간 곳 (OUT)</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm text-gray-700">판매</span>
                  <span className="text-sm text-blue-700">
                    {flow?.sold ?? 0}개
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">현재재고</span>
                  <span className="text-sm text-gray-700">
                    {flow?.current ?? item.stock}개
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-100 rounded border border-blue-200">
                  <span className="text-sm text-blue-900">총 출고</span>
                  <span className="text-sm text-blue-900">
                    {(flow?.sold ?? 0) + (flow?.current ?? item.stock)}개
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 재고 추이 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <CardTitle>재고 추이 (최근 4주)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stockHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 변경 이력 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>재고 변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500">일시</th>
                  <th className="text-left py-3 px-4 text-gray-500">유형</th>
                  <th className="text-left py-3 px-4 text-gray-500">변경 전</th>
                  <th className="text-left py-3 px-4 text-gray-500">변경량</th>
                  <th className="text-left py-3 px-4 text-gray-500">변경 후</th>
                  <th className="text-left py-3 px-4 text-gray-500">위치</th>
                </tr>
              </thead>
              <tbody>
                {changeLog.map((log, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(log.date).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={
                        log.moveType === '입고'
                          ? 'bg-green-100 text-green-700'
                          : log.moveType === '판매'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }>
                        {log.moveType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{log.beforeQty}개</td>
                    <td className="py-3 px-4">
                      <span className={log.qty > 0 ? 'text-green-600' : 'text-red-600'}>
                        {log.qty > 0 ? '+' : ''}
                        {log.qty}개
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{log.afterQty}개</td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.location || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
