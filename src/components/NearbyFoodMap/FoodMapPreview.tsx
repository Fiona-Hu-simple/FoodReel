import { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { loadMapSDK } from '../../utils/amap';
import type { MapInstance } from '../../utils/amap';
import './NearbyFoodMap.css';

// 显示不可交互的地图缩略图、加载状态和地图详情入口。
export function FoodMapPreview({ onOpen }: { onOpen: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('正在加载地图…');

  // 异步加载地图缩略图，并在卸载时销毁地图。
  useEffect(() => {
    let cancelled = false;
    let map: MapInstance | undefined;
    loadMapSDK().then((sdk) => {
      if (cancelled || !container.current) return;
      map = new sdk.Map(container.current, {
        zoom: 11, dragEnable: false, zoomEnable: false, keyboardEnable: false,
        doubleClickZoom: false, scrollWheel: false, touchZoom: false,
      });
      setMessage('点击地图，定位并发现周边美食');
    } /* 在组件仍挂载时创建不可拖动缩放的地图并更新提示。 */).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : '地图暂不可用');
    } /* 在组件仍挂载时显示地图加载错误。 */);
    return () => { cancelled = true; map?.destroy(); } /* 标记加载已取消并销毁缩略地图实例。 */;
  }, []);

  return (
    <section className="food-map-preview" aria-label="周边美食地图">
      <button type="button" className="food-map-entry" onClick={onOpen}>
        <MapPin size={19} aria-hidden="true" />
        <span>发现附近美食</span>
        <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      <div className="food-map-thumbnail">
        <div ref={container} className="food-map-canvas" aria-hidden="true" />
        <button type="button" className="food-map-open" onClick={onOpen} aria-label="打开地图详情，定位并查看附近美食">
          <span>{message}</span>
        </button>
      </div>
    </section>
  );
}
