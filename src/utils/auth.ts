export type User = { id: string; name: string };
type Account = User & { salt: string; hash: string };
const ACCOUNTS_KEY = "food-decider:accounts";
const REMEMBER_KEY = "food-decider:remembered-login";

function accounts(): Account[] {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("本机账号数据无法读取");
  return value;
}

export function rememberedLogin(): { name: string; password: string } {
  try {
    const value = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "{}");
    return {
      name: typeof value.name === "string" ? value.name : "",
      password: typeof value.password === "string" ? value.password : "",
    };
  } catch {
    return { name: "", password: "" };
  }
}

function secureRandomBytes(length: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("当前浏览器不支持安全随机数，请使用 HTTPS。");
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function createUserId(): string {
  const provider = globalThis.crypto;
  if (typeof provider?.randomUUID === "function") return provider.randomUUID();
  const bytes = secureRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const digest = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210000 },
    key,
    256,
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authenticate(nameInput: string, password: string, register: boolean): Promise<User> {
  const name = nameInput.trim();
  if (!name || name.length > 8) throw new Error("请输入 1–8 个字符的 name");
  if (!password || password.length > 12) throw new Error("请输入 1–12 个字符的 password");
  const list = accounts();
  let account = list.find((item) => item.name.toLowerCase() === name.toLowerCase());

  if (register) {
    if (account) throw new Error("该 name 已注册，请登录");
    if (password.length < 6) throw new Error("注册密码至少需要 6 个字符");
    const salt = Array.from(secureRandomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
    account = { id: createUserId(), name, salt, hash: await passwordHash(password, salt) };
    if (list.length === 0) {
      for (const kind of ["foods", "records"]) {
        const legacy = localStorage.getItem("food-decider:" + kind);
        if (legacy !== null) localStorage.setItem("food-decider:user:" + account.id + ":" + kind, legacy);
      }
    }
    const latest = accounts();
    if (latest.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("该 name 已注册，请登录");
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...latest, account]));
  } else if (!account || (await passwordHash(password, account.salt)) !== account.hash) {
    throw new Error("name 或 password 不正确");
  }

  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: account.name, password }));
  return { id: account.id, name: account.name };
}