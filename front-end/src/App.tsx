import { useState } from 'react';
import { Layout } from './components/Layout';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { EmployeeList } from './components/employee/EmployeeList';
import { EmployeeDetail } from './components/employee/EmployeeDetail';
import { EmployeeForm } from './components/employee/EmployeeForm';
import { ScheduleCalendar } from './components/schedule/ScheduleCalendar';
import { VacationManagement } from './components/schedule/VacationManagement';
import { ScheduleIngredient } from './components/schedule/ScheduleIngredient';
import { DemandForecast } from './components/schedule/DemandForecast';
import { AutoScheduling } from './components/schedule/AutoScheduling';
import { ScheduleConstraints } from './components/schedule/ScheduleConstraints';
import { SalesList } from './components/sales/SalesList';
import { SalesDetail } from './components/sales/SalesDetail';
import { SalesAnalyticsSummary } from './components/sales/SalesAnalyticsSummary';
import { SalesComposition } from './components/sales/SalesComposition';
import { CohortRetention } from './components/sales/CohortRetention';
import { InventoryList } from './components/inventory/InventoryList';
import { InventoryDetail } from './components/inventory/InventoryDetail';
import { InventoryForecast } from './components/inventory/InventoryForecast';
import { DeadStockMonitor } from './components/inventory/DeadStockMonitor';
import { CustomerList } from './components/customer/CustomerList';
import { CustomerDetail } from './components/customer/CustomerDetail';
import { CustomerSegmentMaster } from './components/customer/CustomerSegmentMaster';
import { CustomerSegmentLog } from './components/customer/CustomerSegmentLog';
import { SegmentPerformance } from './components/customer/SegmentPerformance';
import { CouponIssue } from './components/customer/CouponIssue';
import { AbTestDashboard } from './components/customer/AbTestDashboard';
import { CustomerRegionSegmentAnalytics } from './components/customer/CustomerRegionSegmentAnalytics';
import { StoreMaster } from './components/settings/StoreMaster';
import { ProductMaster } from './components/settings/ProductMaster';
import { SchedulePolicy } from './components/settings/SchedulePolicy';
import { Toaster } from 'sonner@2.0.3';

export type Page = 
  // 대시보드
  | 'main-dashboard'
  // 직원·근태 관리
  | 'employee-list' | 'employee-detail' | 'employee-form'
  | 'schedule-calendar'
  | 'vacation-management'
  | 'schedule-ingredient'
  // 자동 스케줄링
  | 'demand-forecast'
  | 'auto-scheduling'
  | 'schedule-constraints'
  // 판매 관리
  | 'sales-list' | 'sales-detail'
  // 매출 분석
  | 'sales-analytics-summary'
  | 'sales-composition'
  | 'cohort-retention'
  // 재고·발주 관리
  | 'inventory-list'
  | 'inventory-detail'
  | 'inventory-forecast'
  | 'dead-stock-monitor'
  // 고객 분석
  | 'customer-list' | 'customer-detail'
  | 'customer-segment-master'
  | 'customer-segment-log'
  | 'segment-performance'
  | 'customer-region-analytics'
  | 'coupon-issue'
  | 'ab-test-dashboard'
  // 시스템 설정
  | 'store-master'
  | 'product-master'
  | 'schedule-policy';

interface NavigationOptions {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  baseMonth?: string;
  sku?: string;
  // 자동 스케줄링용: 기준 주 시작일(월요일)
  weekStartDt?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('main-dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navOptions, setNavOptions] = useState<NavigationOptions | null>(null);

  const navigateTo = (
    page: Page,
    id?: string,
    options?: NavigationOptions
  ) => {
    setCurrentPage(page);
    if (id) {
      setSelectedId(id);
    } else {
      setSelectedId(null);
    }
    setNavOptions(options || null);
  };

  const renderPage = () => {
    switch (currentPage) {
      // 대시보드
      case 'main-dashboard':
        return <MainDashboard onNavigate={navigateTo} />;
      
      // 직원·근태 관리
      case 'employee-list':
        return <EmployeeList onNavigate={navigateTo} />;
      case 'employee-detail':
        return <EmployeeDetail employeeKey={selectedId!} onNavigate={navigateTo} />;
      case 'employee-form':
        return <EmployeeForm employeeId={selectedId} onNavigate={navigateTo} />;
      case 'schedule-calendar':
        return (
          <ScheduleCalendar
            onNavigate={navigateTo}
            initialStoreId={navOptions?.storeId}
            initialBaseDate={navOptions?.dateFrom}
          />
        );
      case 'vacation-management':
        return (
          <VacationManagement
            onNavigate={navigateTo}
            initialStoreId={navOptions?.storeId}
            initialBaseDate={navOptions?.dateFrom}
          />
        );
      case 'schedule-ingredient':
        return <ScheduleIngredient onNavigate={navigateTo} />;
      
      // 자동 스케줄링
      case 'demand-forecast':
        return <DemandForecast onNavigate={navigateTo} />;
      case 'auto-scheduling':
        return (
          <AutoScheduling
            onNavigate={navigateTo}
            initialStoreId={navOptions?.storeId}
            initialWeekStart={navOptions?.weekStartDt}
            initialPeakDate={navOptions?.dateFrom}
          />
        );
      case 'schedule-constraints':
        return <ScheduleConstraints onNavigate={navigateTo} />;
      
      // 판매 관리
      case 'sales-list':
        return (
          <SalesList
            onNavigate={navigateTo}
            initialDateFrom={navOptions?.dateFrom}
            initialDateTo={navOptions?.dateTo}
            initialStoreId={navOptions?.storeId}
          />
        );
      case 'sales-detail':
        return <SalesDetail saleId={selectedId!} onNavigate={navigateTo} />;
      
      // 매출 분석
      case 'sales-analytics-summary':
        return (
          <SalesAnalyticsSummary
            onNavigate={navigateTo}
            initialBaseMonth={navOptions?.baseMonth}
            initialStoreId={navOptions?.storeId}
          />
        );
      case 'sales-composition':
        return (
          <SalesComposition
            onNavigate={navigateTo}
            baseMonth={navOptions?.baseMonth}
            initialStoreId={navOptions?.storeId}
          />
        );
      case 'cohort-retention':
        return <CohortRetention onNavigate={navigateTo} />;
      
      // 재고·발주 관리
      case 'inventory-list':
        return (
          <InventoryList
            onNavigate={navigateTo}
            initialStoreId={navOptions?.storeId}
          />
        );
      case 'inventory-detail':
        return <InventoryDetail itemId={selectedId!} onNavigate={navigateTo} />;
      case 'inventory-forecast':
        return (
          <InventoryForecast
            onNavigate={navigateTo}
            initialStoreId={navOptions?.storeId}
          />
        );
      case 'dead-stock-monitor':
        return <DeadStockMonitor onNavigate={navigateTo} />;
      
      // 고객 분석
      case 'customer-list':
        return <CustomerList onNavigate={navigateTo} />;
      case 'customer-detail':
        return <CustomerDetail customerId={selectedId!} onNavigate={navigateTo} />;
      case 'customer-segment-master':
        return <CustomerSegmentMaster onNavigate={navigateTo} />;
      case 'customer-segment-log':
        return (
          <CustomerSegmentLog
            onNavigate={navigateTo}
            segmentId={selectedId || undefined}
          />
        );
      case 'segment-performance':
        return <SegmentPerformance onNavigate={navigateTo} />;
      case 'customer-region-analytics':
        return <CustomerRegionSegmentAnalytics onNavigate={navigateTo} />;
      case 'coupon-issue':
        return <CouponIssue onNavigate={navigateTo} />;
      case 'ab-test-dashboard':
        return <AbTestDashboard onNavigate={navigateTo} />;
      
      // 시스템 설정
      case 'store-master':
        return <StoreMaster onNavigate={navigateTo} />;
      case 'product-master':
        return <ProductMaster onNavigate={navigateTo} />;
      case 'schedule-policy':
        return <SchedulePolicy onNavigate={navigateTo} />;
      
      default:
        return <MainDashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={navigateTo}>
        {renderPage()}
      </Layout>
      <Toaster position="top-right" />
    </>
  );
}
