import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// Exercise the real adapter with controlled SDK callbacks; no credentials or network needed.
const source = readFileSync(new URL('../src/utils/amap.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replaceAll('import.meta.env', 'globalThis.testEnv'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function adapter(env = {}, secure = true) {
  const timers = new Map();
  const scripts = [];
  let id = 0;
  const context = {
    exports: {}, testEnv: env,
    window: {
      isSecureContext: secure,
      setTimeout(callback) { timers.set(++id, callback); return id; },
      clearTimeout(timer) { timers.delete(timer); },
    },
    document: {
      createElement() { return { remove() { this.removed = true; } }; },
      head: { appendChild(script) { scripts.push(script); } },
    },
  };
  vm.runInNewContext(compiled, context);
  return { api: context.exports, context, scripts, timers };
}

const configured = { VITE_AMAP_KEY: 'test-key', VITE_AMAP_SECURITY_CODE: 'test-code' };

test('missing configuration fails without making a network request', async () => {
  const { api, scripts } = adapter();
  await assert.rejects(api.loadMapSDK(), /暂未配置/);
  assert.equal(scripts.length, 0);
});

test('concurrent mounts share one SDK load and use server proxy when configured', async () => {
  const { api, context, scripts, timers } = adapter({ ...configured, VITE_AMAP_SERVICE_HOST: 'https://example.com/_AMapService' });
  const first = api.loadMapSDK();
  const second = api.loadMapSDK();
  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  assert.equal(context.window._AMapSecurityConfig.serviceHost, 'https://example.com/_AMapService');
  assert.equal(context.window._AMapSecurityConfig.securityJsCode, undefined);
  context.window.AMap = { Map() {}, Geolocation() {}, PlaceSearch() {} };
  scripts[0].onload();
  assert.equal(await first, context.window.AMap);
  assert.equal(timers.size, 0);
});

test('failed SDK script is removed and can be retried', async () => {
  const { api, scripts } = adapter(configured);
  const first = api.loadMapSDK();
  scripts[0].onerror();
  await assert.rejects(first, /加载失败/);
  assert.equal(scripts[0].removed, true);
  const retry = api.loadMapSDK();
  assert.equal(scripts.length, 2);
  scripts[1].onerror();
  await assert.rejects(retry);
});

test('SDK load timeout releases the pending load', async () => {
  const { api, timers, scripts } = adapter(configured);
  const pending = api.loadMapSDK();
  [...timers.values()][0]();
  await assert.rejects(pending, /加载失败/);
  assert.equal(scripts[0].removed, true);
});

test('insecure origins cannot request user geolocation', async () => {
  const { api } = adapter({}, false);
  await assert.rejects(api.locateUser({}), /HTTPS/);
});

test('successful geolocation uses converted coordinates and clears its timeout', async () => {
  const { api, timers } = adapter();
  let options;
  const result = await api.locateUser({
    Geolocation: class {
      constructor(value) { options = value; }
      getCurrentPosition(callback) {
        callback('complete', { position: { getLng: () => 121.5, getLat: () => 31.2 }, formattedAddress: '测试位置' });
      }
    },
  });
  assert.equal(options.convert, true);
  assert.equal(options.noIpLocate, 3);
  assert.deepEqual(Array.from(result.center), [121.5, 31.2]);
  assert.equal(result.label, '测试位置');
  assert.equal(timers.size, 0);
});

test('denied geolocation suggests manual map search', async () => {
  const { api } = adapter();
  await assert.rejects(api.locateUser({
    Geolocation: class { getCurrentPosition(callback) { callback('error', { message: 'User denied' }); } },
  }), /定位权限.*拖动地图/);
});

test('viewport query is limited to restaurants and 20 results, and drops unmappable POIs', async () => {
  const { api } = adapter();
  const bounds = { getSouthWest: () => [121.4, 31.1], getNorthEast: () => [121.6, 31.3] };
  const valid = { id: 'one', name: '面馆', location: { getLng: () => 121.5, getLat: () => 31.2 } };
  const result = await api.searchNearby({
    PlaceSearch: class {
      constructor(options) { assert.equal(options.type, '050000'); assert.equal(options.pageSize, 20); }
      searchInBounds(keyword, area, callback) {
        assert.equal(keyword, ''); assert.equal(area, bounds);
        callback('complete', { poiList: { pois: [valid, { id: 'two', name: '无坐标' }] } });
      }
    },
  }, bounds);
  assert.equal(result.length, 1);
  assert.equal(result[0], valid);
});

test('empty search results are distinct from service failure', async () => {
  const { api } = adapter();
  const empty = await api.searchNearby({
    PlaceSearch: class { searchInBounds(_keyword, _bounds, callback) { callback('no_data', {}); } },
  }, [0, 0]);
  assert.equal(empty.length, 0);
  await assert.rejects(api.searchNearby({
    PlaceSearch: class { searchInBounds(_keyword, _bounds, callback) { callback('error', { info: 'INVALID_USER_KEY' }); } },
  }, [0, 0]), /INVALID_USER_KEY/);
});

test('a stalled restaurant search times out', async () => {
  const { api, timers } = adapter();
  const pending = api.searchNearby({ PlaceSearch: class { searchInBounds() {} } }, [0, 0]);
  [...timers.values()][0]();
  await assert.rejects(pending, /搜索超时/);
});

test('keyword search sends trimmed criteria to the API with the requested viewport and limit', async () => {
  const { api } = adapter();
  const bounds = { getSouthWest: () => [121.4, 31.1], getNorthEast: () => [121.6, 31.3] };
  await api.searchNearby({
    PlaceSearch: class {
      constructor(options) {
        assert.equal(options.type, '050000');
        assert.equal(options.pageSize, 20);
        assert.equal(options.pageIndex, 1);
      }
      searchInBounds(keyword, area, callback) {
        assert.equal(keyword, '火锅');
        assert.equal(area, bounds);

        callback('no_data', {});
      }
    },
  }, bounds, '  火锅  ');
});
