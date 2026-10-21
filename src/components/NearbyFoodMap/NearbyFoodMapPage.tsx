import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, LocateFixed, Minus, Plus, Search, MapPin } from 'lucide-react';
import { loadMapSDK, locateUser, searchNearby } from '../../utils/amap';
import type { MapInstance, MapSDK, Place } from '../../utils/amap';
import './NearbyFoodMap.css';

type Props = { onClose: () => void; onAdd: (name: string) => { success: boolean; message: string } };
type Actions = { locate: () => void; search: (keyword?: string) => void; select: (place: Place) => void; zoom: (direction: number) => void };

// 展示附近美食地图和店铺列表，协调定位、区域搜索、筛选和食物添加弹窗。
export function NearbyFoodMapPage({ onClose, onAdd }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('正在加载地图…');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [searched, setSearched] = useState(false);
  const [addingPlace, setAddingPlace] = useState<Place | null>(null);
  const [addMessage, setAddMessage] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const keywordRef = useRef('');

  // 打开地图模态窗口并锁定页面滚动，记录原焦点和滚动样式。
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    } /* 关闭地图窗口，恢复页面滚动和原焦点。 */;
  }, []);

  // 初始化地图服务和操作入口，并在重试或卸载时使旧请求失效并释放地图。
  useEffect(() => {
    let disposed = false;
    let requestId = 0;
    let map: MapInstance | undefined;
    let markers: InstanceType<MapSDK['Marker']>[] = [];
    let userMarker: InstanceType<MapSDK['Marker']> | undefined;

    // 加载地图服务、创建可交互地图、注册店铺事件并执行首次定位。
    async function start() {
      try {
        const sdk = await loadMapSDK();
        if (disposed || !container.current) return;
        const activeMap = new sdk.Map(container.current, {
          zoom: 13, viewMode: '2D', resizeEnable: true, isHotspot: true,
          dragEnable: true, zoomEnable: true, touchZoom: true, scrollWheel: true,
        });
        map = activeMap;
        // 选中店铺并将地图缩放定位到店铺坐标。
        const select = (place: Place) => {
          setSelected(place);
          activeMap.setZoomAndCenter(16, place.location);
        };
        // 设置当前店铺并打开编辑添加窗口。
        const openPlaceDialog = (place: Place) => {
          if (disposed) return;
          setAddMessage('');
          setAddingPlace(place);
          setSelected(place);
        };
        activeMap.on('hotspotclick', (hotspot) => {
          if (!hotspot.name || !hotspot.lnglat) return;
          openPlaceDialog({ id: hotspot.id, name: hotspot.name, location: hotspot.lnglat });
        } /* 将点击的有效地图热点转换为店铺信息并打开添加窗口。 */);
        // 搜索当前地图范围内的餐饮，更新标记和列表并忽略过期结果。
        const search = async (id: number) => {
          setPlaces([]);
          setSelected(null);
          setSearched(false);
          activeMap.remove(markers);
          markers = [];
          try {
            const results = await searchNearby(sdk, activeMap.getBounds(), keywordRef.current);
            if (disposed || id !== requestId) return;
            markers = results.map((place, index) => {
              // 创建页面节点并单独设置文本，避免把第三方店铺名称拼接为超文本标记。
              const pin = document.createElement('button');
              pin.type = 'button';
              pin.className = 'food-map-pin';
              pin.textContent = String(index + 1);
              pin.setAttribute('aria-label', place.name);
              const marker = new sdk.Marker({
                map: activeMap, position: place.location, content: pin,
                anchor: 'bottom-center', title: place.name, bubble: false,
              });
              marker.on('click', () => openPlaceDialog(place) /* 点击店铺标记时打开编辑添加窗口。 */);
              // 键盘激活自定义按钮时不会触发地图服务的指针事件，因此单独处理键盘操作。
              pin.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  openPlaceDialog(place);
                }
              } /* 按回车键或空格键激活店铺标记并阻止事件继续传播。 */);
              return marker;
            } /* 为单个搜索结果创建带编号及键盘交互的地图标记。 */);
            setPlaces(results);
            setSearched(true);
          } catch {
            if (!disposed && id === requestId) setError('周边美食搜索失败，请稍后点击右上角搜索按钮重试。');
          } finally {
            if (!disposed && id === requestId) setBusy(false);
          }
        };
        // 获取当前位置，更新用户位置标记和地图中心后搜索附近餐饮。
        const locate = async () => {
          const id = ++requestId;
          setBusy(true);
          setError('');
          setLocation('正在获取当前位置…');
          try {
            const position = await locateUser(sdk);
            if (disposed || id !== requestId) return;
            setLocation(position.label);
            if (userMarker) activeMap.remove([userMarker]);
            const dot = document.createElement('span');
            dot.className = 'food-map-user-dot';
            dot.title = '我的位置';
            userMarker = new sdk.Marker({ map: activeMap, position: position.center, content: dot, anchor: 'center' });
            activeMap.setZoomAndCenter(15, position.center, true);
            await search(id);
          } catch (reason) {
            if (disposed || id !== requestId) return;
            setLocation('尚未获取当前位置');
            setError(reason instanceof Error ? reason.message : '定位失败，请重试。');
            setBusy(false);
          }
        };
        actions.current = {
          locate: () => { void locate(); } /* 触发异步定位操作。 */,
          search: (nextKeyword) => {
            if (nextKeyword !== undefined) {
              keywordRef.current = nextKeyword.trim();
              setKeyword(keywordRef.current);
            }
            const id = ++requestId;

            setBusy(true);
            setError('');
            setLocation('当前地图范围');
            void search(id);
          } /* 更新筛选关键词并发起当前地图范围的新搜索。 */,
          select,
          zoom: (direction) => direction > 0 ? activeMap.zoomIn() : activeMap.zoomOut() /* 根据方向放大或缩小地图。 */,
        };
        setReady(true);
        await locate();
      } catch (reason) {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : '地图加载失败');
        setLocation('地图暂不可用');
        setBusy(false);
      }
    }
    void start();
    return () => {
      disposed = true;
      requestId++;
      actions.current = null;
      map?.destroy();
    } /* 使请求失效，清空操作入口并销毁地图实例。 */;
  }, [attempt]);

  return createPortal(
    <dialog ref={dialog} className="food-map-page" aria-labelledby="food-map-title" onCancel={(event) => { event.preventDefault(); onClose(); } /* 拦截模态窗口的默认取消行为并关闭地图详情。 */}>
      <header className="food-map-header">
        <button type="button" onClick={onClose} aria-label="返回添加食物"><ArrowLeft size={22} /></button>
        <div><h2 id="food-map-title">周边美食</h2><p>点击右侧按钮探索周边美食</p></div>
        <button type="button" className="food-map-search" disabled={!ready || busy} onClick={() => actions.current?.search() /* 搜索当前地图可见区域的餐饮。 */}><Search size={24} /></button>
      </header>
      <div className="food-map-location"><MapPin size={17} aria-hidden="true" /><span>{location}</span></div>
      <div className="food-map-detail-canvas">
        <div ref={container} className="food-map-canvas" aria-label="可拖动和缩放的美食地图" />
        <div className="food-map-tools">
          <button type="button" disabled={!ready || busy} onClick={() => actions.current?.locate() /* 重新定位并搜索周边餐饮。 */} aria-label="重新定位"><LocateFixed size={20} /></button>
          <button type="button" disabled={!ready} onClick={() => actions.current?.zoom(1) /* 放大地图。 */} aria-label="放大地图"><Plus size={20} /></button>
          <button type="button" disabled={!ready} onClick={() => actions.current?.zoom(-1) /* 缩小地图。 */} aria-label="缩小地图"><Minus size={20} /></button>
        </div>
      </div>
      <section className="food-map-results" aria-label="周边餐饮列表" aria-busy={busy}>
        <div className="food-map-results-heading"><button type="button" disabled={!ready || busy} onClick={() => setIsFilterOpen(true) /* 打开美食关键词筛选窗口。 */}>筛选特定美食</button><span>当前地图范围 · 最多 20 家</span></div>
        {keyword && <p>当前筛选：{keyword}</p>}
        {busy && <p role="status">{ready ? '正在定位或搜索周边美食…' : '正在加载地图…'}</p>}
        {error && <div className="food-map-error" role="alert"><p>{error}</p>{!ready && <button type="button" onClick={() => { setError(''); setBusy(true); setAttempt((value) => value + 1 /* 增加地图加载重试次数。 */); } /* 清空错误并增加重试次数以重新初始化地图。 */}>重新加载</button>}</div>}
        {!busy && !error && searched && places.length === 0 && <p>此区域暂未找到符合条件的餐饮，试试修改关键词或拖动地图后重新搜索。</p>}
        {addMessage && <p role="status">{addMessage}</p>}
        <ol className="food-map-list">
          {places.map((place, index) => {
            const distance = place.distance === undefined || place.distance === '' ? NaN : Number(place.distance);
            return <li key={place.id} className={`food-map-card${selected?.id === place.id ? ' is-selected' : ''}`}>
              <button type="button" className="food-map-card-main" aria-pressed={selected?.id === place.id} onClick={() => actions.current?.select(place) /* 选中列表中的店铺并将地图移至该店铺。 */}>
                <span className="food-map-number">{index + 1}</span>
                <span className="food-map-place"><strong>{place.name}</strong><span>{place.address || '暂无详细地址'}</span></span>
              </button>
              <span>
                <button type="button" className="food-map-add" aria-label={`添加${place.name}`} onClick={() => { setAddMessage(''); setAddingPlace(place); } /* 清空添加提示并打开当前店铺的添加窗口。 */}><Plus size={32} /></button>
                {Number.isFinite(distance) && <small className="food-map-distance">距搜索中心 {distance < 1000 ? `${Math.round(distance)} 米` : `${(distance / 1000).toFixed(1)} 公里`}</small>}
              </span>
            </li>;
          } /* 渲染店铺名称、地址、距离以及定位和添加按钮。 */)}
        </ol>
      </section>
      {isFilterOpen && (
        <FoodSearchDialog
          keyword={keyword}
          onClose={() => setIsFilterOpen(false) /* 关闭美食关键词筛选窗口。 */}
          onSearch={(value) => {
            actions.current?.search(value);
            setIsFilterOpen(false);
          } /* 用提交的关键词执行搜索并关闭筛选窗口。 */}
        />
      )}
      {addingPlace && (
        <AddNearbyFoodDialog
          name={addingPlace.name}
          onClose={() => setAddingPlace(null) /* 关闭店铺编辑添加窗口。 */}
          onAdd={(name) => {
            const result = onAdd(name);
            if (result.success) {
              setAddingPlace(null);
              setAddMessage(`${name.trim()}：${result.message}`);
            }
            return result;
          } /* 提交店铺名称，成功后关闭窗口并显示添加结果。 */}
        />
      )}
    </dialog>, document.body,
  );
}

// 渲染可编辑店铺名称的添加窗口，校验输入并防止重复提交。
function AddNearbyFoodDialog({ name, onClose, onAdd }: Props & { name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(name);
  const submitted = useRef(false);

  // 打开添加窗口，聚焦并选中名称，记录原焦点。
  useEffect(() => {
    const element = dialogRef.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    } /* 关闭添加窗口并恢复打开前的焦点。 */;
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="food-map-add-dialog"
      aria-label="编辑并添加美食"
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); } /* 阻止默认取消行为与事件传播并关闭添加窗口。 */}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      } /* 点击弹窗边界外的遮罩区域时关闭窗口。 */}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        if (submitted.current) return;
        submitted.current = true;
        const result = onAdd(value);
        if (!result.success) {
          submitted.current = false;
          inputRef.current?.setCustomValidity(result.message);
          inputRef.current?.reportValidity();
        }
      } /* 阻止表单刷新并提交食物，失败时解除提交锁并显示输入校验提示。 */}>
        <input
          ref={inputRef}
          type="text"
          aria-label="美食名称"
          placeholder="输入食物名称"
          value={value}
          required
          onChange={(event) => { setValue(event.target.value); event.target.setCustomValidity(''); } /* 同步食物名称并清除之前的自定义校验错误。 */}
        />
        <button type="submit" className="food-map-add" aria-label="确认添加美食" disabled={!value.trim()}><Plus size={32} /></button>
      </form>
    </dialog>
  );
}
// 渲染关键词筛选窗口，支持留空搜索全部餐饮。
function FoodSearchDialog({ keyword, onClose, onSearch }: {
  keyword: string;
  onClose: () => void;
  onSearch: (keyword: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(keyword);

  // 打开筛选窗口，聚焦并选中关键词，记录原焦点。
  useEffect(() => {
    const element = dialogRef.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    } /* 关闭筛选窗口并恢复打开前的焦点。 */;
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="food-map-add-dialog"
      aria-label="筛选附近美食"
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); } /* 阻止默认取消行为与事件传播并关闭筛选窗口。 */}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      } /* 点击弹窗边界外的遮罩区域时关闭窗口。 */}
    >
      <form onSubmit={(event) => { event.preventDefault(); onSearch(value.trim()); } /* 阻止表单刷新并提交去除首尾空白的关键词。 */}>
        <input
          ref={inputRef}
          type="search"
          aria-label="美食关键词，留空搜索全部餐饮"
          placeholder="如火锅、烧烤；留空搜索全部"
          value={value}
          onChange={(event) => setValue(event.target.value) /* 同步搜索关键词输入内容。 */}
        />
        <button type="submit" className="food-map-add" aria-label="搜索附近美食"><Search size={24} /></button>
      </form>
    </dialog>
  );
}