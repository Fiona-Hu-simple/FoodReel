import { useRef, useState } from "react";
import { Download, Upload, Archive } from "lucide-react";
import { exportBackup, importBackup } from "../../utils/backup";
import "./BackupControls.css";

// 提供本机所有账号数据的备份导出与导入入口，并显示处理状态。
export function BackupControls({
  disabled = false,
  onBusyChange,
}: {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  // 生成备份文件并触发下载，显示导出成功或失败信息。
  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([exportBackup()], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download =
        "huhu-food-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url) /* 释放下载文件所使用的临时对象地址。 */, 10000);
      setMessage("已生成备份，请保存下载的文件。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败");
    }
  }
  // 读取并校验备份文件，导入数据并协调导入期间的禁用状态。
  async function restore(file?: File) {
    if (!file || locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("正在读取备份…");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("备份文件不能超过 10 MB。");
      const count = importBackup(await file.text());
      setMessage(
        "已导入 " + count + " 个账号的数据。请使用备份中的原用户名和密码登录。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <details className="backup-controls">
      <summary aria-label="导出 / 导入备份" title="导出 / 导入备份">
        <Archive size={17} />
      </summary>
      <div className="backup-menu">
        <p>
          备份本机所有账号、食物和记录。不包含自动填充密码，导入后使用原密码登录。
        </p>
        <button type="button" disabled={disabled || busy} onClick={download}>
          <Download size={16} />
          导出备份
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click() /* 打开备份文件选择器。 */}
        >
          <Upload size={16} />
          导入备份
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            void restore(event.target.files?.[0]);
          } /* 读取用户选择的首个文件并启动导入。 */}
        />
        <p className="backup-status" role="status">
          {message}
        </p>
      </div>
    </details>
  );
}
