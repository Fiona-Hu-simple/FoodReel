import type { Food, MealRecord, RecordsByDate } from '../types';

type Account = { id: string; name: string; salt: string; hash: string };
type Profile = { deletedDefaults?: string[]; account: Account; foods: Food[] | null; records: RecordsByDate };
type Backup = { format: 'food-decider-backup'; version: 1; exportedAt: string; profiles: Profile[] };
const ACCOUNTS = 'food-decider:accounts';
// 拼接指定用户和数据类别对应的本地存储键。
const key = (id: string, kind: string) => 'food-decider:user:' + id + ':' + kind;
// 判断值是否为非空且非数组的对象。
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// 判断值是否为非空字符串。
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
// 判断值是否为非负的有限数字时间戳。
const timestamp = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
// 断言校验条件成立，否则以统一的备份格式错误终止操作。
function check(ok: unknown): asserts ok { if (!ok) throw new Error('备份格式不正确或数据损坏，未导入任何数据。'); }
// 校验数据列表中的标识是否唯一。
function unique(items: { id: string }[]) { check(new Set(items.map(v => v.id /* 提取列表项标识用于重复检查。 */)).size === items.length); }
// 校验备份版本、账号凭据、食物、删除偏好及日期记录，并拒绝重复账号与记录标识。
function validate(value: unknown): Backup {
  check(object(value) && value.format === 'food-decider-backup' && value.version === 1 && text(value.exportedAt) && Array.isArray(value.profiles));
  const ids = new Set<string>(), names = new Set<string>();
  for (const profile of value.profiles) {
    check(object(profile) && object(profile.account));
    const a = profile.account;
    check(text(a.id) && /^[a-zA-Z0-9-]{1,100}$/.test(a.id) && text(a.name) && a.name.trim() === a.name && a.name.length <= 32);
    check(typeof a.salt === 'string' && /^[a-f0-9]{32}$/.test(a.salt) && typeof a.hash === 'string' && /^[a-f0-9]{64}$/.test(a.hash));
    check(!ids.has(a.id) && !names.has(a.name.toLowerCase()));
    ids.add(a.id); names.add(a.name.toLowerCase());
    check(profile.foods === null || Array.isArray(profile.foods));
    if (Array.isArray(profile.foods)) {
      for (const food of profile.foods) check(object(food) && text(food.id) && text(food.name) && food.name.length <= 20 && timestamp(food.createdAt) && (food.isDefault === undefined || typeof food.isDefault === 'boolean'));
      unique(profile.foods);
    }
    check(profile.deletedDefaults === undefined || (Array.isArray(profile.deletedDefaults) && profile.deletedDefaults.every(name => text(name) && name.length <= 20 /* 检查删除偏好中的食物名称是否有效且不超过二十个字符。 */)));
    check(object(profile.records));
    const recordIds = new Set<string>();
    for (const [date, records] of Object.entries(profile.records)) {
      check(/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(records));
      for (const record of records) {
        check(object(record) && text(record.id) && text(record.foodName) && timestamp(record.timestamp) && !recordIds.has(record.id));
        recordIds.add(record.id);
      }
    }
  }
  return value as unknown as Backup;
}
// 读取所有本机账号及其食物、删除偏好和记录，生成经过校验的备份快照。
function snapshot(): Backup {
  const accounts: Account[] = JSON.parse(localStorage.getItem(ACCOUNTS) || '[]');
  check(Array.isArray(accounts));
  return validate({ format: 'food-decider-backup', version: 1, exportedAt: new Date().toISOString(), profiles: accounts.map(account => {
    check(object(account) && text(account.id));
    return { account, deletedDefaults: JSON.parse(localStorage.getItem(key(account.id, 'deletedDefaults')) || '[]'), foods: JSON.parse(localStorage.getItem(key(account.id, 'foods')) || 'null'), records: JSON.parse(localStorage.getItem(key(account.id, 'records')) || '{}') };
  } /* 读取指定账号的全部可备份数据。 */) });
}
// 生成格式化的备份文本，仅保留白名单中的账号字段并排除自动填充密码。
export function exportBackup(): string {
  const data = snapshot();
  if (!data.profiles.length) throw new Error('本机还没有账号可备份。');
  // 仅导出白名单中的账号字段，记住的明文密码不会写入备份文件。
  data.profiles = data.profiles.map(p => ({ ...p, account: { id: p.account.id, name: p.account.name, salt: p.account.salt, hash: p.account.hash } }) /* 保留备份账号字段，排除额外账号属性。 */);
  return JSON.stringify(data, null, 2);
}
// 按标识合并两组数据，遇到同标识但内容不同的项目时终止导入。
function mergeItems<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map(item => [item.id, item] /* 建立以项目标识为键的数据条目。 */));
  for (const item of incoming) {
    const existing = merged.get(item.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(item)) throw new Error('存在同 ID 的不同数据，已取消导入以保护现有数据。');
    merged.set(item.id, item);
  }
  return [...merged.values()];
}
// 校验并合并备份与本机数据，拒绝冲突并在写入失败时回滚，返回导入账号数。
export function importBackup(raw: string): number {
  let incoming: Backup;
  try { incoming = validate(JSON.parse(raw)); } catch { throw new Error('请选择有效的 HUHU FOOD JSON 备份文件。'); }
  if (!incoming.profiles.length) throw new Error('备份文件中没有账号。');
  const current = snapshot();
  const profiles = new Map(current.profiles.map(p => [p.account.id, p] /* 建立以账号标识为键的档案条目。 */));
  for (const p of incoming.profiles) {
    const existing = profiles.get(p.account.id);
    const sameName = [...profiles.values()].find(v => v.account.name.toLowerCase() === p.account.name.toLowerCase() /* 忽略大小写查找与导入档案同名的账号。 */);
    if ((sameName && sameName.account.id !== p.account.id) || (existing && (existing.account.name !== p.account.name || existing.account.hash !== p.account.hash || existing.account.salt !== p.account.salt))) throw new Error('备份账号与本机同名账号或账号凭据冲突，已取消导入。请使用没有该同名账号的浏览器导入。');
    const records: RecordsByDate = existing ? { ...existing.records } : {};
    for (const [date, items] of Object.entries(p.records)) records[date] = mergeItems<MealRecord>(records[date] || [], items);
    const deletedDefaults = [...new Set([...(existing?.deletedDefaults || []), ...(p.deletedDefaults || [])])];
    profiles.set(p.account.id, { deletedDefaults, account: p.account, foods: existing?.foods && p.foods ? mergeItems(existing.foods, p.foods) : existing?.foods ?? p.foods, records });
  }
  const result = validate({ ...current, profiles: [...profiles.values()] });
  const writes = new Map<string, string>();
  for (const p of result.profiles) {
    if (p.foods !== null) writes.set(key(p.account.id, 'foods'), JSON.stringify(p.foods.filter(food => !food.isDefault || !p.deletedDefaults?.includes(food.name) /* 排除用户删除偏好中标记的默认食物。 */)));
    writes.set(key(p.account.id, 'deletedDefaults'), JSON.stringify(p.deletedDefaults || []));
    writes.set(key(p.account.id, 'records'), JSON.stringify(p.records));
  }
  writes.set(ACCOUNTS, JSON.stringify(result.profiles.map(p => ({ id: p.account.id, name: p.account.name, salt: p.account.salt, hash: p.account.hash }) /* 提取账号白名单字段以保存合并后的账号列表。 */)));
  const before = new Map([...writes.keys()].map(k => [k, localStorage.getItem(k)] /* 记录写入前的存储值，以便导入失败时回滚。 */));
  const applied: string[] = [];
  try {
    for (const [k, value] of writes) { localStorage.setItem(k, value); applied.push(k); }
  } catch {
    for (const k of applied.reverse()) { const old = before.get(k); if (old == null) localStorage.removeItem(k); else localStorage.setItem(k, old); }
    throw new Error('本机存储空间不足或不可用，导入未完成，已恢复原数据。');
  }
  return incoming.profiles.length;
}
