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
import { Plus, MapPin } from "lucide-react";
import { Badge } from "../ui/badge";
import { fetchStores, StoreListItem } from "../../services/storeApi";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  Tooltip,
} from "react-leaflet";

interface StoreMasterProps {
  onNavigate: (page: Page) => void;
}

export function StoreMaster({ onNavigate }: StoreMasterProps) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>("ALL");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchStores();
        setStores(res.items || []);
      } catch (e: any) {
        setError(e.message || "매장 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 권역 분류: 매장명/주소를 기반으로 간단히 분류
  const getRegionKey = (s: StoreListItem): string => {
    const text = `${s.storeNm || ""} ${s.address || ""}`.toLowerCase();
    if (text.includes("서울")) return "seoul";
    if (text.includes("경기")) return "gyeonggi";
    if (text.includes("인천")) return "incheon";
    if (
      text.includes("부산") ||
      text.includes("대구") ||
      text.includes("울산") ||
      text.includes("경상") ||
      text.includes("경북") ||
      text.includes("경남")
    )
      return "yeongnam";
    if (
      text.includes("광주") ||
      text.includes("전라") ||
      text.includes("전주") ||
      text.includes("전북") ||
      text.includes("전남")
    )
      return "honam";
    if (
      text.includes("충청") ||
      text.includes("충북") ||
      text.includes("충남") ||
      text.includes("대전") ||
      text.includes("세종")
    )
      return "chungcheong";
    if (text.includes("강원") || text.includes("제주")) return "gangwonJeju";
    return "others";
  };

  const regionLabels: Record<string, string> = {
    ALL: "전체",
    seoul: "서울권",
    incheon: "인천권",
    gyeonggi: "경기권",
    chungcheong: "충청권",
    honam: "호남권",
    yeongnam: "영남권",
    gangwonJeju: "강원·제주",
    others: "기타",
  };

  const filteredStores = useMemo(() => {
    if (regionFilter === "ALL") return stores;
    return stores.filter((s) => getRegionKey(s) === regionFilter);
  }, [stores, regionFilter]);

  const center = useMemo<[number, number]>(() => {
    const source = filteredStores.length > 0 ? filteredStores : stores;
    const withCoords = source.filter(
      (s) => s.lat != null && s.lng != null,
    );
    if (withCoords.length > 0) {
      return [withCoords[0].lat as number, withCoords[0].lng as number];
    }
    // 서울 시청 좌표 (fallback)
    return [37.5665, 126.978];
  }, [stores]);

  const getNearestStores = (base: StoreListItem, limit = 5) => {
    if (base.lat == null || base.lng == null) return [];
    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    return stores
      .filter(
        (s) =>
          s.storeId !== base.storeId &&
          s.lat != null &&
          s.lng != null,
      )
      .map((s) => {
        const dLat = toRad((s.lat as number) - (base.lat as number));
        const dLng = toRad((s.lng as number) - (base.lng as number));
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(base.lat as number)) *
            Math.cos(toRad(s.lat as number)) *
            Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        return { store: s, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  };

  // 현재 선택된 매장의 인근 매장 ID 집합 (지도에서 시각적으로 강조)
  const nearestStoreIds = useMemo<Set<string>>(() => {
    if (!selectedStoreId) return new Set();
    const base = stores.find((s) => s.storeId === selectedStoreId);
    if (!base) return new Set();
    const nearest = getNearestStores(base);
    return new Set(nearest.map(({ store }) => store.storeId));
  }, [selectedStoreId, stores]);

  const total = filteredStores.length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">매장 정보 관리</h1>
          <p className="text-gray-500">
            실제 DB에 등록된 매장 목록을 조회하고 관리합니다.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 whitespace-nowrap">권역</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(regionLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRegionFilter(key)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    regionFilter === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button className="bg-gray-900 hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" />
            새 매장 등록
          </Button>
        </div>
      </div>

      {/* 레이아웃: 좌측 매장 목록(2), 우측 지도(1) */}
      <div className="grid grid-cols-3 gap-6">
        {/* 매장 목록 */}
        <div className="col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>
                전체 매장{" "}
                <span className="text-sm text-gray-500">
                  {loading ? "(로딩 중...)" : `(${total}개)`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장 ID</TableHead>
                    <TableHead>매장명</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead>점장</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow
                      key={store.storeId}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedStoreId === store.storeId
                          ? "bg-blue-50"
                          : ""
                      }`}
                      onClick={() => setSelectedStoreId(store.storeId)}
                    >
                      <TableCell className="font-mono text-sm">
                        {store.storeId}
                      </TableCell>
                      <TableCell>{store.storeNm || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {store.address ||
                          [store.gu, store.dong].filter(Boolean).join(" ") ||
                          "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {store.managerNm || "-"}
                      </TableCell>
                      <TableCell>
                        {/* 현재는 상태 컬럼이 DB에 없으므로, 모두 '운영중'으로 표기 */}
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          운영중
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          수정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && stores.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-4 text-center text-sm text-gray-500"
                      >
                        등록된 매장이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 지도 뷰 */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                매장 위치
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 순수 지도만 보이도록 배경색 제거 */}
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={center}
                  zoom={11}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredStores
                    .filter((s) => s.lat != null && s.lng != null)
                    .map((s) => (
                      <CircleMarker
                        key={s.storeId}
                        center={[s.lat as number, s.lng as number]}
                        radius={
                          selectedStoreId === s.storeId
                            ? 10
                            : nearestStoreIds.has(s.storeId)
                            ? 8
                            : 6
                        }
                        pathOptions={{
                          color: selectedStoreId === s.storeId
                            ? "#2563eb" // 선택 매장: 파란색
                            : nearestStoreIds.has(s.storeId)
                            ? "#22c55e" // 인근 매장: 초록색
                            : "#fb923c", // 기타 매장: 주황색
                          fillColor: selectedStoreId === s.storeId
                            ? "#2563eb"
                            : nearestStoreIds.has(s.storeId)
                            ? "#22c55e"
                            : "#fb923c",
                          fillOpacity: 0.9,
                        }}
                        eventHandlers={{
                          click: () => setSelectedStoreId(s.storeId),
                        }}
                      >
                        {/* 인근 매장(초록색 마커)에 마우스 오버 시 간단 툴팁 */}
                        {nearestStoreIds.has(s.storeId) && (
                          <Tooltip direction="top" offset={[0, -4]}>
                            <span className="text-xs">
                              <span className="font-mono text-[10px] text-gray-300">
                                {s.storeId}
                              </span>
                              {" | "}
                              <span className="font-semibold">
                                {s.storeNm || "-"}
                              </span>
                              {s.address && (
                                <>
                                  <br />
                                  <span className="text-[10px] text-gray-400">
                                    {s.address}
                                  </span>
                                </>
                              )}
                            </span>
                          </Tooltip>
                        )}
                        <Popup>
                          <div className="text-sm">
                            <div className="font-mono text-xs text-gray-500 mb-1">
                              {s.storeId}
                            </div>
                            <div className="font-semibold">
                              {s.storeNm || "-"}
                            </div>
                            <div className="mt-2 border-t border-gray-100 pt-2">
                              <div className="text-[11px] text-gray-500 mb-1">
                                인근 매장 (최대 5개)
                              </div>
                              {getNearestStores(s).map(({ store, distance }) => (
                                <div
                                  key={store.storeId}
                                  className="text-[11px] text-gray-600"
                                >
                                  {store.storeNm || store.storeId}{" "}
                                  <span className="text-gray-400">
                                    ({distance.toFixed(1)}km)
                                  </span>
                                </div>
                              ))}
                              {getNearestStores(s).length === 0 && (
                                <div className="text-[11px] text-gray-400">
                                  인근 매장 정보가 없습니다.
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  {/* 선택된 매장의 GeoJSON 경계가 있으면 강조 표시 */}
                  {stores
                    .filter(
                      (s) =>
                        s.storeGeojson &&
                        (!selectedStoreId || s.storeId === selectedStoreId),
                    )
                    .map((s) => (
                      <GeoJSON
                        key={`${s.storeId}-geojson`}
                        data={s.storeGeojson}
                        style={{
                          color: "#22c55e",
                          weight: 2,
                          fillOpacity: 0.1,
                        }}
                      />
                    ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
