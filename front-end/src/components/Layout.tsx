import { ReactNode, useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, Calendar, ShoppingCart, Package, 
  TrendingUp, Brain, Menu, ChevronRight, X, UserCircle,
  BarChart3, Clock, Gift, Settings
} from 'lucide-react';
import { Page } from '../App';
import { fetchStores, StoreListItem } from '../services/storeApi';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItem {
  icon: any;
  label: string;
  page: Page;
  children?: { label: string; page: Page }[];
}

const navigation: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: '대시보드',
    page: 'main-dashboard',
    children: [
      { label: '메인 대시보드', page: 'main-dashboard' },
      { label: '경영 지표', page: 'management-dashboard' },
    ],
  },
  {
    icon: ShoppingCart,
    label: '판매관리',
    page: 'sales-list',
    children: [{ label: '판매 내역', page: 'sales-list' }],
  },
  {
    icon: BarChart3,
    label: '매출분석',
    page: 'sales-analytics-summary',
    children: [
      { label: '매출 추세 비교', page: 'sales-analytics-summary' },
      { label: '매출 상세 비교', page: 'sales-composition' },
    ],
  },
  {
    icon: UserCircle,
    label: '고객분석',
    page: 'customer-list',
    children: [
      { label: '고객 목록', page: 'customer-list' },
      { label: '세그먼트 관리', page: 'customer-segment-master' },
      { label: '리텐션·코호트 분석', page: 'segment-performance' },
      { label: '권역·세그먼트 분석', page: 'customer-region-analytics' },
      { label: '쿠폰 발급', page: 'coupon-issue' },
      { label: 'A/B 테스트', page: 'ab-test-dashboard' },
    ],
  },
  {
    icon: Package,
    label: '재고발주관리',
    page: 'inventory-list',
    children: [
      { label: '재고 현황', page: 'inventory-list' },
      { label: 'Dead Stock', page: 'dead-stock-monitor' },
      { label: '발주 예측 관리', page: 'inventory-forecast' },
    ],
  },
  {
    icon: Users,
    label: '직원근태관리',
    page: 'employee-list',
    children: [
      { label: '직원 목록', page: 'employee-list' },
      { label: '스케줄 캘린더', page: 'schedule-calendar' },
      { label: '휴가 관리', page: 'vacation-management' },
      { label: '근무 가능 시간', page: 'schedule-ingredient' },
    ],
  },
  {
    icon: Brain,
    label: '자동 스케줄링',
    page: 'demand-forecast',
    children: [
      { label: '피크 타임 예측', page: 'demand-forecast' },
      { label: '자동 인력 배치', page: 'auto-scheduling' },
      { label: '제약조건 설정', page: 'schedule-constraints' },
    ],
  },
  {
    icon: Settings,
    label: '시스템설정',
    page: 'store-master',
    children: [
      { label: '매장 정보', page: 'store-master' },
      { label: '상품 마스터', page: 'product-master' },
      { label: '재고 정책', page: 'inventory-policy' },
      { label: '스케줄 정책', page: 'schedule-policy' },
    ],
  },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');

  // 사이드바 하단 프로필에 표시할 점포 ID (부산 센텀시티점 기준)
  useEffect(() => {
    const loadStoreId = async () => {
      try {
        const res = await fetchStores();
        const items: StoreListItem[] = res.items || [];
        // 점포명이 '부산'과 '센텀시티'를 모두 포함하는 점포를 우선 탐색
        const centum = items.find((s) => {
          const name = (s.storeNm || '').toLowerCase();
          return name.includes('부산') && (name.includes('센텀') || name.includes('centum'));
        });
        if (centum) {
          setCurrentStoreId(centum.storeId);
        } else if (items.length > 0) {
          // 못 찾으면 첫 번째 점포 ID라도 표기
          setCurrentStoreId(items[0].storeId);
        }
      } catch {
        // 실패 시에는 기본값 유지
      }
    };
    loadStoreId();
  }, []);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${isOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-red-600 font-semibold text-xl">UNIQLO</h1>
          <p className="text-gray-500 text-sm mt-1">Store Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isExpanded = expandedMenus.includes(item.label);
            const isActive = currentPage === item.page || item.children?.some(child => child.page === currentPage);
            
            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (item.children) {
                      toggleMenu(item.label);
                    } else {
                      onNavigate(item.page);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.children && (
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  )}
                </button>
                
                {item.children && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.page}
                        onClick={() => onNavigate(child.page)}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                          currentPage === child.page
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
              {currentStoreId || 'S001'}
            </div>
            <div>
              <p className="text-sm text-gray-900">점장 관리자</p>
              <p className="text-xs text-gray-500">부산 센텀시티점</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[100] w-10 h-10 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        style={{ left: isOpen ? '260px' : '16px', transition: 'left 0.3s' }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16">
        <div className="relative">
          {children}
        </div>
      </main>
    </div>
  );
}
