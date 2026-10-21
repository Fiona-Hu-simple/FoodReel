export type Coordinates = [number, number];
type LngLat = { getLng: () => number; getLat: () => number };
export type MapBounds = { getSouthWest: () => LngLat; getNorthEast: () => LngLat };
export type Place = {
  id: string;
  name: string;
  address?: string;
  distance?: number | string;
  location: LngLat;
};
export type MapHotspot = { id: string; name: string; lnglat: LngLat };
export type MapInstance = {
  on: (event: 'hotspotclick', callback: (hotspot: MapHotspot) => void) => void;
  destroy: () => void;
  getBounds: () => MapBounds;
  setZoomAndCenter: (zoom: number, center: Coordinates | LngLat, immediately?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  remove: (markers: MarkerInstance[]) => void;
};
type MarkerInstance = { on: (event: string, callback: () => void) => void };
type ServiceResult = {
  position?: LngLat;
  formattedAddress?: string;
  message?: string;
  info?: string;
  poiList?: { pois?: Place[] };
};
type Callback = (status: string, result: ServiceResult) => void;
export type MapSDK = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  Geolocation: new (options: Record<string, unknown>) => {
    getCurrentPosition: (callback: Callback) => void;
  };
  PlaceSearch: new (options: Record<string, unknown>) => {
    searchInBounds: (keyword: string, bounds: MapBounds, callback: Callback) => void;
  };
};

declare global {
  interface Window {
    AMap?: MapSDK;
    _AMapSecurityConfig?: { securityJsCode?: string; serviceHost?: string };
  }
}

let sdkPromise: Promise<MapSDK> | undefined;

// 校验地图配置并复用地图服务加载任务，动态加载高德地图与定位搜索插件。
export function loadMapSDK(): Promise<MapSDK> {
  if (sdkPromise) return sdkPromise;
  const key = import.meta.env.VITE_AMAP_KEY?.trim();
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim();
  const serviceHost = import.meta.env.VITE_AMAP_SERVICE_HOST?.trim();
  if (!key || (!securityJsCode && !serviceHost)) {
    return Promise.reject(new Error('地图服务暂未配置，请联系管理员。'));
  }
  window._AMapSecurityConfig = serviceHost ? { serviceHost } : { securityJsCode };
  sdkPromise = new Promise<MapSDK>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail() /* 在脚本加载超时后执行失败清理。 */, 15000);
    // 清理加载定时器和脚本事件，移除脚本并拒绝加载任务。
    const fail = () => {
      window.clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      reject(new Error('地图加载失败，请检查网络后重试。'));
    };
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Geolocation,AMap.PlaceSearch`;
    script.onerror = fail;
    // 校验地图及插件是否可用，清除定时器并返回地图服务。
    script.onload = () => {
      if (!window.AMap?.Map || !window.AMap.Geolocation || !window.AMap.PlaceSearch) {
        fail();
        return;
      }
      window.clearTimeout(timer);
      script.onload = script.onerror = null;
      resolve(window.AMap);
    };
    document.head.appendChild(script);
  } /* 创建地图脚本并注册超时、成功和失败回调。 */).catch((error: unknown) => {
    sdkPromise = undefined;
    throw error;
  } /* 清空失败的加载缓存并继续抛出错误，使后续调用可以重试。 */);
  return sdkPromise;
}

// 将高德服务回调封装为带超时和异常处理的异步任务。
function requestService(run: (callback: Callback) => void, timeoutMessage: string): Promise<ServiceResult> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(timeoutMessage)) /* 服务请求超时后以指定错误信息拒绝任务。 */, 15000);
    try {
      run((status, result) => {
        window.clearTimeout(timer);
        if (status === 'complete' || status === 'no_data') resolve(result);
        else reject(new Error(result.message || result.info || '服务请求失败'));
      } /* 清除超时定时器，根据服务状态返回结果或抛出错误。 */);
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  } /* 启动服务请求，设置超时并将服务状态转换为成功或失败结果。 */);
}

// 在安全上下文中请求设备定位，返回坐标与位置描述并转换定位错误。
export async function locateUser(sdk: MapSDK) {
  if (!window.isSecureContext) {
    throw new Error('定位需要 HTTPS 或 localhost，请改用安全地址，或拖动地图搜索。');
  }
  const geolocation = new sdk.Geolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    convert: true,
    needAddress: true,
    // 设备定位被拒绝时，不自动改用网络地址推算的位置。
    GeoLocationFirst: true,
    noIpLocate: 3,
    noGeoLocation: 0,
  });
  let result: ServiceResult;
  try {
    result = await requestService((callback) => geolocation.getCurrentPosition(callback) /* 调用高德定位服务并传入统一的结果回调。 */, '定位超时');
  } catch {
    throw new Error('无法获取当前位置，请检查定位权限后重试，也可以拖动地图搜索此区域。');
  }
  if (!result.position) throw new Error('未获取到位置，请重新定位，或拖动地图搜索。');
  return {
    center: [result.position.getLng(), result.position.getLat()] as Coordinates,
    label: result.formattedAddress || '当前位置',
  };
}

// 按当前地图边界与可选关键词搜索最多二十个餐饮地点，并排除缺少坐标或名称的结果。
export async function searchNearby(sdk: MapSDK, bounds: MapBounds, keyword = ''): Promise<Place[]> {
  const search = new sdk.PlaceSearch({ type: '050000', pageSize: 20, pageIndex: 1, extensions: 'base' });
  const result = await requestService(
    (callback) => search.searchInBounds(keyword.trim(), bounds, callback) /* 将关键词和地图边界传给高德区域搜索服务。 */,
    '搜索超时，请重试。',
  );
  return (result.poiList?.pois || []).filter((place) => place.location && place.name /* 仅保留同时具有位置和名称的餐饮地点。 */);
}
