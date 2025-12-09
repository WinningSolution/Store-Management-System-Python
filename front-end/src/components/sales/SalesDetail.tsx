import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Page } from '../../App';
import {
  fetchSalesDetail,
  SalesDetailResponse,
  SalesDetailItem,
} from '../../services/salesApi';

interface SalesDetailProps {
  saleId: string;
  onNavigate: (page: Page) => void;
}

export function SalesDetail({ saleId, onNavigate }: SalesDetailProps) {
  const [data, setData] = useState<SalesDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchSalesDetail(saleId);
        setData(res);
      } catch (e: any) {
        setError(e.message || '판매 상세 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [saleId]);

  const header = data?.header;
  const items: SalesDetailItem[] = data?.items ?? [];

  const handlePrintReceipt = () => {
    if (!header) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const saleDate = new Date(header.saleDt).toLocaleString();

    const rowsHtml = items
      .map(
        (item) => `
          <tr>
            <td style="padding:4px 0;">${item.prodNm ?? ''}</td>
            <td style="padding:4px 0; text-align:right;">${item.qty.toLocaleString()}</td>
            <td style="padding:4px 0; text-align:right;">${item.unitPrice.toLocaleString()}</td>
            <td style="padding:4px 0; text-align:right;">${item.amount.toLocaleString()}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>영수증 - ${header.saleId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; font-size: 11px; margin: 16px; }
            h1 { font-size: 14px; margin-bottom: 8px; text-align: center; }
            .section { margin-bottom: 8px; }
            .label { color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th, td { border-bottom: 1px solid #e5e7eb; }
            th { text-align: left; padding: 4px 0; font-weight: 600; }
            .total-row td { border-top: 1px solid #000; font-weight: 600; padding-top: 6px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>UNIQLO 매장 영수증</h1>

          <div class="section">
            <div><span class="label">거래번호</span> ${header.saleId}</div>
            <div><span class="label">거래일시</span> ${saleDate}</div>
            <div><span class="label">매장</span> ${header.storeNm || header.storeId}</div>
            <div><span class="label">고객번호</span> ${header.customerId || '-'}</div>
          </div>

          <div class="section">
            <div><span class="label">결제수단</span> ${header.payType || '-'}</div>
            <div><span class="label">채널</span> ${header.channel || '-'}</div>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th style="text-align:right;">수량</th>
                  <th style="text-align:right;">단가</th>
                  <th style="text-align:right;">금액</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3">총 결제금액</td>
                  <td style="text-align:right;">${header.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section" style="text-align:center; margin-top:12px;">
            감사합니다.
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate('sales-list')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          판매 내역으로
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">판매 상세</h1>
            <p className="text-gray-500">{header?.saleId || saleId}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Receipt className="w-4 h-4 mr-2" />
              영수증 출력
            </Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              취소/환불
            </Button>
          </div>
        </div>
      </div>

      {loading && <p className="text-gray-500">로딩 중...</p>}
      {error && !loading && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {header && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* 상품 목록 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>주문 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <p className="text-gray-900">{item.prodNm}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          상품코드: {item.prodId} / 라인: {item.prodLine || '-'} / 카테고리:{' '}
                          {item.category || '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">
                          ₩{item.unitPrice.toLocaleString()} × {item.qty}
                        </p>
                        <p className="text-gray-600 mt-1">
                          ₩{item.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-gray-900">
                    <span>총 수량</span>
                    <span>{header.totalQty.toLocaleString()}개</span>
                  </div>
                  <div className="flex justify-between text-gray-900">
                    <span>총 결제금액</span>
                    <span className="text-xl">₩{header.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">결제 방법</p>
                    <Badge className="bg-blue-100 text-blue-700">
                      {header.payType || '정보 없음'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">채널</p>
                    <p className="text-gray-900">{header.channel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">결제 금액</p>
                    <p className="text-gray-900">
                      ₩{header.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">결제 일시</p>
                    <p className="text-gray-900">
                      {new Date(header.saleDt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* 거래 정보 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>거래 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">거래번호</p>
                  <p className="text-gray-900 text-sm">{header.saleId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">거래일시</p>
                  <p className="text-gray-900">
                    {new Date(header.saleDt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">매장</p>
                  <p className="text-gray-900">
                    {header.storeNm || header.storeId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">고객번호</p>
                  <p className="text-gray-900">
                    {header.customerId || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 상태 (간단 표시) */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>거래 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">결제 완료</p>
                      <p className="text-xs text-gray-500">
                        {new Date(header.saleDt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}