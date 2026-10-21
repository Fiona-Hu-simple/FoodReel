import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { LockKeyhole, UserRound, Sparkles } from "lucide-react";
import { authenticate, rememberedLogin } from "../../utils/auth";
import type { User } from "../../utils/auth";
import "./LoginPage.css";
import { BackupControls } from "../BackupControls/BackupControls";
import { useToast } from "../../hooks/useToast";
import { Toast } from "../Toast/Toast";

// 渲染本地账号登录和注册表单，并集成备份入口与提示消息。
export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [saved] = useState(rememberedLogin);
  const { toast, showToast } = useToast();
  const [name, setName] = useState(saved.name.toUpperCase());
  const [password, setPassword] = useState(saved.password);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false); // 使用引用保存即时提交锁，避免状态更新前发生重复提交。

  // 校验用户名，防止重复提交，执行登录或注册并更新错误与忙碌状态。
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();//阻止表单的默认提交行为，防止页面刷新
    if (submitting.current || backupBusy) return;//如果正在提交，直接返回，避免重复提交
    if (!/^[A-Z]{1,7}$/.test(name)) {
      showToast("请输入1-7个英文字母", "error");
      return;
    }
    submitting.current = true;//标记为正在提交
    setBusy(true);// 更新忙碌状态，在处理登录请求期间禁用表单输入和按钮。
    setError("");//清空错误信息
    try {
      onLogin(await authenticate(name, password, register));// 根据用户名、密码和注册模式验证身份，成功后更新当前登录用户。
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Retry");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-row">
        <div className="login-brand">
          <Sparkles aria-hidden="true" /> HUHU FOOD
        </div>
        <BackupControls disabled={busy} onBusyChange={setBackupBusy} />
        </div>
        <div className="login-modes" aria-label="????">
          <button
            type="button"
            aria-pressed={!register}
            disabled={busy || backupBusy}
            onClick={() => {
              setRegister(false);
              setError("");
            } /* 切换到登录模式并清除错误。 */}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={register}
            disabled={busy || backupBusy}
            onClick={() => {
              setRegister(true);
              setPassword("");
              setError("");
            } /* 切换到注册模式，清空密码并清除错误。 */}
          >
            Register
          </button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="login-name">name</label>
          <div className="login-field">
            <UserRound size={18} aria-hidden="true" />
            <input
              id="login-name"
              name="username"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              value={name}

              required
              disabled={busy || backupBusy}
              onChange={(event) => {
                const nextName = event.target.value.replace(/[a-z]/g, (letter) => letter.toUpperCase() /* 将匹配到的小写字母转换为大写。 */);
                setName(nextName);
                if (nextName.length > 7 || /[^A-Z]/.test(nextName)) {
                  showToast("请输入1-7个英文字母", "error");
                }
              } /* 同步用户名，将小写字母转为大写并提示不符合格式的输入。 */}
              placeholder="Enter 1-7 capitalletters"
            />
          </div>
          <label htmlFor="login-password">password</label>
          <div className="login-field">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              value={password}
              minLength={register ? 6 : 1}
              maxLength={128}
              required
              disabled={busy || backupBusy}
              onChange={(event) => setPassword(event.target.value) /* 同步密码输入内容。 */}
              placeholder={
                register ? "Enter a new password" : "Enter your password"
              }
            />
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="login-enter" disabled={busy || backupBusy}>
            {busy ? "Logging in..." : "Enter"}
          </button>
        </form>
      </section>
      <Toast toast={toast} />
    </main>
  );
}
