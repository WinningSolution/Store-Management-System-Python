import { useEffect, useMemo, useState } from "react";
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
import {
  fetchCustomers,
  CustomerListItem,
  fetchCustomerSegmentOptions,
  CustomerSegmentOptionsResponse,
} from "../../services/customerApi";

interface CustomerListProps {
  onNavigate: (page: Page, id?: string) => void;
}

export function CustomerList({ onNavigate }: CustomerListProps) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [signupChannel, setSignupChannel] = useState<string>("all");
  const [signupFrom, setSignupFrom] = useState<string>("");
  const [signupTo, setSignupTo] = useState<string>("");
  const [lastPurchaseFrom, setLastPurchaseFrom] = useState<string>("");
  const [lastPurchaseTo, setLastPurchaseTo] = useState<string>("");
  const [amountBand, setAmountBand] = useState<string>("all");
  const [countBand, setCountBand] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("last_purchase_desc");
  const [refreshToken, setRefreshToken] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [segmentOptions, setSegmentOptions] = useState<string[]>([]);

  // 고객 목록 로딩
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 구매액/구매횟수 구간을 백엔드 숫자 파라미터로 매핑
        let minTotalAmount: number | undefined;
        let maxTotalAmount: number | undefined;
        if (amountBand === "1") {
          minTotalAmount = 0;
          maxTotalAmount = 100_000;
        } else if (amountBand === "2") {
          minTotalAmount = 100_000;
          maxTotalAmount = 500_000;
        } else if (amountBand === "3") {
          minTotalAmount = 500_000;
          maxTotalAmount = 1_000_000;
        } else if (amountBand === "4") {
          minTotalAmount = 1_000_000;
        }

        let minPurchaseCount: number | undefined;
        let maxPurchaseCount: number | undefined;
        if (countBand === "1") {
          minPurchaseCount = 1;
          maxPurchaseCount = 1;
        } else if (countBand === "2") {
          minPurchaseCount = 2;
          maxPurchaseCount = 5;
        } else if (countBand === "3") {
          minPurchaseCount = 6;
          maxPurchaseCount = 10;
        } else if (countBand === "4") {
          minPurchaseCount = 11;
        }

        const res = await fetchCustomers({
          gender: genderFilter === "all" ? undefined : genderFilter,
          age_group: ageFilter === "all" ? undefined : ageFilter,
          region: regionFilter === "all" ? undefined : regionFilter,
          segment: segmentFilter === "all" ? undefined : segmentFilter,
          signup_channel: signupChannel === "all" ? undefined : signupChannel,
          start_signup_dt: signupFrom || undefined,
          end_signup_dt: signupTo || undefined,
          start_last_purchase_dt: lastPurchaseFrom || undefined,
          end_last_purchase_dt: lastPurchaseTo || undefined,
          min_total_amount: minTotalAmount,
          max_total_amount: maxTotalAmount,
          min_purchase_count: minPurchaseCount,
          max_purchase_count: maxPurchaseCount,
          sort: sortKey,
          keyword: searchTerm || undefined,
          page,
          page_size: pageSize,
        });
        const items = res.items || [];
        setCustomers(items);
        // 디버깅용: 전역에 최근 조회 고객 목록 노출
        (window as any).customers = items;
        setTotal(res.total ?? res.items.length);
      } catch (e: any) {
        setError(e.message || "고객 목록을 불러오지 못했습니다.");
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, pageSize, refreshToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleGenderChange = (value: string) => {
    setGenderFilter(value);
    setPage(1);
  };

  const handleAgeChange = (value: string) => {
    setAgeFilter(value);
    setPage(1);
  };

  const handleRegionChange = (value: string) => {
    setRegionFilter(value);
    setPage(1);
  };

  const [segmentFilter, setSegmentFilter] = useState<string>("all");

  const handleChannelChange = (value: string) => {
    setSignupChannel(value);
    setPage(1);
  };

  // 세그먼트 옵션 로딩 (1회)
  useEffect(() => {
    const loadSegments = async () => {
      try {
        const res = await fetchCustomerSegmentOptions();
        setSegmentOptions(res.items || []);
      } catch {
        // 실패해도 치명적이지 않으므로 무시
      }
    };
    loadSegments();
  }, []);

  const toggleSort = (field: "signup" | "last_purchase" | "amount") => {
    let next: string;
    if (field === "signup") {
      next = sortKey === "signup_desc" ? "signup_asc" : "signup_desc";
    } else if (field === "amount") {
      next = sortKey === "amount_desc" ? "amount_asc" : "amount_desc";
    } else {
      // last_purchase
      next =
        sortKey === "last_purchase_desc"
          ? "last_purchase_asc"
          : "last_purchase_desc";
    }
    setSortKey(next);
    setPage(1);
    setRefreshToken((prev) => prev + 1);
  };

  const handleSearchClick = () => {
    // 필터 적용 후 1페이지부터 조회
    setPage(1);
    setRefreshToken((prev) => prev + 1);
  };

  const formatAmount = (value: number) =>
    `₩${Math.round(value).toLocaleString()}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">고객 목록</h1>
        <p className="text-gray-500">
          점포별 고객 정보 및 구매 이력을 조회합니다. (총 {total.toLocaleString()}
          명)
        </p>
      </div>

      {/* 필터 + 점포 선택 */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base mb-2">검색 · 필터</CardTitle>
            <Button
              size="default"
              className="px-6 py-2 text-sm font-semibold rounded-full"
              onClick={handleSearchClick}
              disabled={loading}
            >
              조회
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1행: 검색 + 성별/연령대 필터 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="고객 ID 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <select
              value={genderFilter}
              onChange={(e) => handleGenderChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">전체 성별</option>
              <option value="남">남</option>
              <option value="여">여</option>
              <option value="기타">기타</option>
            </select>
            <select
              value={ageFilter}
              onChange={(e) => handleAgeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">전체 연령대</option>
              <option value="10대">10대</option>
              <option value="20대">20대</option>
              <option value="30대">30대</option>
              <option value="40대">40대</option>
              <option value="50대+">50대+</option>
            </select>
            <select
              value={segmentFilter}
              onChange={(e) => {
                setSegmentFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">전체 세그먼트</option>
              {segmentOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 2행: 가입일 / 최근구매일 기간 */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-16 text-right">가입일</span>
              <input
                type="date"
                value={signupFrom}
                onChange={(e) => {
                  setSignupFrom(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <span>~</span>
              <input
                type="date"
                value={signupTo}
                onChange={(e) => {
                  setSignupTo(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-right">최근구매일</span>
              <input
                type="date"
                value={lastPurchaseFrom}
                onChange={(e) => {
                  setLastPurchaseFrom(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <span>~</span>
              <input
                type="date"
                value={lastPurchaseTo}
                onChange={(e) => {
                  setLastPurchaseTo(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* 3행: 지역 / 가입 채널 / 구매액·구매횟수 구간 / 정렬 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span>지역</span>
              <select
                value={regionFilter}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">전체 지역</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="광주">광주</option>
                <option value="대전">대전</option>
                <option value="울산">울산</option>
                <option value="강원">강원</option>
                <option value="충북">충북</option>
                <option value="충남">충남</option>
                <option value="경북">경북</option>
                <option value="경남">경남</option>
                <option value="전북">전북</option>
                <option value="전남">전남</option>
                <option value="제주">제주</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>가입 채널</span>
              <select
                value={signupChannel}
                onChange={(e) => handleChannelChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">전체</option>
                <option value="오프라인">오프라인</option>
                <option value="온라인">온라인</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>총구매액</span>
              <select
                value={amountBand}
                onChange={(e) => {
                  setAmountBand(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">전체</option>
                <option value="1">~ 10만</option>
                <option value="2">10만 ~ 50만</option>
                <option value="3">50만 ~ 100만</option>
                <option value="4">100만 이상</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>구매횟수</span>
              <select
                value={countBand}
                onChange={(e) => {
                  setCountBand(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">전체</option>
                <option value="1">1회</option>
                <option value="2">2~5회</option>
                <option value="3">6~10회</option>
                <option value="4">11회 이상</option>
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span>정렬</span>
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setPage(1);
                  setRefreshToken((prev) => prev + 1);
                }}
                className="h-9 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="last_purchase_desc">최근구매일 ↓</option>
                <option value="last_purchase_asc">최근구매일 ↑</option>
                <option value="amount_desc">총구매액 ↓</option>
                <option value="amount_asc">총구매액 ↑</option>
                <option value="count_desc">구매횟수 ↓</option>
                <option value="count_asc">구매횟수 ↑</option>
                <option value="signup_desc">가입일 ↓</option>
                <option value="signup_asc">가입일 ↑</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객 테이블 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>고객 목록 ({total.toLocaleString()}명)</CardTitle>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                페이지 {page} / {totalPages}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || 50;
                  setPageSize(next);
                  setPage(1);
                }}
                className="h-8 px-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value={20}>20명씩</option>
                <option value={50}>50명씩</option>
                <option value={100}>100명씩</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          {loading && !error && (
            <p className="text-xs text-gray-400 mb-2">
              고객 목록을 불러오는 중입니다...
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객 ID</TableHead>
                <TableHead>성별</TableHead>
                <TableHead>연령대</TableHead>
                <TableHead>지역</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("signup")}
                >
                  가입일{" "}
                  {sortKey === "signup_desc"
                    ? "↓"
                    : sortKey === "signup_asc"
                    ? "↑"
                    : ""}
                </TableHead>
                <TableHead>가입 채널</TableHead>
                <TableHead>세그먼트</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("last_purchase")}
                >
                  최근구매일{" "}
                  {sortKey === "last_purchase_desc"
                    ? "↓"
                    : sortKey === "last_purchase_asc"
                    ? "↑"
                    : ""}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => toggleSort("amount")}
                >
                  총구매액{" "}
                  {sortKey === "amount_desc"
                    ? "↓"
                    : sortKey === "amount_asc"
                    ? "↑"
                    : ""}
                </TableHead>
                <TableHead className="text-right">구매횟수</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.customerId}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    onNavigate("customer-detail", customer.customerId)
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {customer.customerId}
                  </TableCell>
                  <TableCell>{customer.gender || "-"}</TableCell>
                  <TableCell>{customer.ageGroup || "-"}</TableCell>
                  <TableCell>{customer.region || "-"}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {customer.signupDt}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {customer.signupChannel || "-"}
                  </TableCell>
                  <TableCell>{customer.segment || "-"}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {customer.lastPurchaseDt || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAmount(customer.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.purchaseCount.toLocaleString()}회
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("customer-detail", customer.customerId);
                      }}
                    >
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && customers.length === 0 && !error && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-8 text-center text-xs text-gray-400"
                  >
                    표시할 고객 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              총 {total.toLocaleString()}명 중{" "}
              {total === 0
                ? "0명"
                : `${(page - 1) * pageSize + 1}–${Math.min(
                    page * pageSize,
                    total,
                  ).toLocaleString()}명`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
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


