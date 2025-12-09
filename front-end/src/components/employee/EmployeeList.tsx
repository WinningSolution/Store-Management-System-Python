import { useEffect, useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Page } from '../../App';
import { fetchEmployees, EmployeeListItem } from '../../services/employeeApi';
import { fetchStores, StoreListItem } from '../../services/storeApi';

interface EmployeeListProps {
  onNavigate: (page: Page, id?: string) => void;
}

export function EmployeeList({ onNavigate }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all | 재직 | 퇴사
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>('all'); // all | STORE_ID

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchEmployees({
          keyword: searchTerm || undefined,
          work_status: statusFilter === 'all' ? undefined : statusFilter,
          store_id: storeFilter === 'all' ? undefined : storeFilter,
          page: 1,
          page_size: 100,
        });
        setEmployees(res.items || []);
        setTotal(res.total ?? res.items.length);
      } catch (e: any) {
        setError(e.message || '직원 목록을 불러오지 못했습니다.');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, [searchTerm, statusFilter, storeFilter]);

  // 매장 목록 로딩 (최초 1회)
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        setStores(res.items || []);
      } catch {
        // 매장 목록 로딩 실패는 치명적이지 않으므로 무시
      }
    };
    loadStores();
  }, []);

  // 권역 키 타입 및 라벨 (매출 추세 비교 페이지와 동일한 분류 로직 사용)
  type RegionKey =
    | 'seoulIncheon'
    | 'gyeonggi'
    | 'chungcheong'
    | 'honam'
    | 'yeongnam'
    | 'gangwonJeju'
    | 'others';

  const regionLabels: Record<RegionKey, string> = {
    seoulIncheon: '서울·인천',
    gyeonggi: '경기권',
    chungcheong: '충청권',
    honam: '호남권',
    yeongnam: '영남권',
    gangwonJeju: '강원·제주',
    others: '기타',
  };

  const getRegionKey = (storeNm?: string | null): RegionKey => {
    const name = (storeNm || '').toLowerCase();
    if (name.includes('서울') || name.includes('인천')) return 'seoulIncheon';
    if (name.includes('경기')) return 'gyeonggi';
    if (name.includes('충청') || name.includes('대전') || name.includes('세종'))
      return 'chungcheong';
    if (name.includes('광주') || name.includes('전주') || name.includes('전라'))
      return 'honam';
    if (
      name.includes('부산') ||
      name.includes('대구') ||
      name.includes('울산') ||
      name.includes('경상')
    )
      return 'yeongnam';
    if (name.includes('강원') || name.includes('제주')) return 'gangwonJeju';
    return 'others';
  };

  const storesByRegion = useMemo(() => {
    const map: Record<RegionKey, StoreListItem[]> = {
      seoulIncheon: [],
      gyeonggi: [],
      chungcheong: [],
      honam: [],
      yeongnam: [],
      gangwonJeju: [],
      others: [],
    };
    (stores || []).forEach((s) => {
      const key = getRegionKey(s.storeNm);
      map[key].push(s);
    });
    return map;
  }, [stores]);

  const [activeRegion, setActiveRegion] = useState<RegionKey | null>(null);

  // 스토어 목록이 로딩되면 데이터가 있는 첫 권역을 기본 선택
  useEffect(() => {
    if (activeRegion) return;
    const order: RegionKey[] = [
      'seoulIncheon',
      'gyeonggi',
      'chungcheong',
      'honam',
      'yeongnam',
      'gangwonJeju',
      'others',
    ];
    for (const key of order) {
      if (storesByRegion[key] && storesByRegion[key].length > 0) {
        setActiveRegion(key);
        break;
      }
    }
  }, [storesByRegion, activeRegion]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">직원 관리</h1>
          <p className="text-gray-500">전체 직원 {total}명</p>
        </div>
        <Button
          onClick={() => onNavigate('employee-form')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          직원 등록
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* 1) 검색 + 근무 상태 필터 */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="이름 또는 직원ID로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className={statusFilter === 'all' ? 'bg-blue-600' : ''}
                >
                  전체
                </Button>
                <Button
                  variant={statusFilter === '재직' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('재직')}
                  className={statusFilter === '재직' ? 'bg-blue-600' : ''}
                >
                  재직
                </Button>
              </div>
            </div>

            {/* 2) 점포 선택 필터 (권역 + 점포 칩) */}
            <div className="text-xs text-gray-500 flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  점포 선택 필터 (권역 선택 후 점포 선택)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={storeFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStoreFilter('all')}
                    className="text-xs"
                  >
                    전체 점포
                  </Button>
                </div>
              </div>
              {/* 권역 선택 버튼 */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    'seoulIncheon',
                    'gyeonggi',
                    'chungcheong',
                    'honam',
                    'yeongnam',
                    'gangwonJeju',
                  ] as RegionKey[]
                ).map((regionKey) => {
                  const list = storesByRegion[regionKey];
                  if (!list || list.length === 0) return null;
                  const isActive = activeRegion === regionKey;
                  return (
                    <button
                      key={regionKey}
                      type="button"
                      onClick={() => setActiveRegion(regionKey)}
                      className={`px-3 py-1 rounded-full border text-[11px] transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {regionLabels[regionKey]}
                    </button>
                  );
                })}
              </div>
              {/* 선택된 권역의 점포 칩 */}
              {activeRegion && storesByRegion[activeRegion] && (
                <div className="flex flex-wrap gap-1 max-w-full">
                  {storesByRegion[activeRegion].map((s) => {
                    const active = storeFilter === s.storeId;
                    return (
                      <button
                        key={s.storeId}
                        type="button"
                        onClick={() =>
                          setStoreFilter(
                            storeFilter === s.storeId ? 'all' : s.storeId
                          )
                        }
                        className={`px-2 py-1 rounded-full border text-[11px] transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {s.storeNm || s.storeId}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          {loading && !error && (
            <p className="text-xs text-gray-400 mb-2">직원 목록을 불러오는 중입니다...</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-500">직원ID</th>
                  <th className="text-left py-4 px-4 text-gray-500">이름</th>
                  <th className="text-left py-4 px-4 text-gray-500">지점</th>
                  <th className="text-left py-4 px-4 text-gray-500">입사일</th>
                  <th className="text-left py-4 px-4 text-gray-500">근무상태</th>
                  <th className="text-left py-4 px-4 text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr 
                    key={`${employee.storeId}-${employee.empId}`} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      onNavigate(
                        'employee-detail',
                        `${employee.storeId}__${employee.empId}`
                      )
                    }
                  >
                    <td className="py-4 px-4 text-gray-600">{employee.empId}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {employee.empNm[0]}
                        </div>
                        <span className="text-gray-900">{employee.empNm}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {employee.storeNm || employee.storeId}
                    </td>
                    <td className="py-4 px-4 text-gray-600">{employee.hireDt}</td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant={employee.workStatus === '재직' ? 'default' : 'outline'}
                        className={
                          employee.workStatus === '재직'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {employee.workStatus}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(
                            'employee-detail',
                            `${employee.storeId}__${employee.empId}`
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
        </CardContent>
      </Card>
    </div>
  );
}
