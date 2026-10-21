import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './RestoreDefaultsDialog.css';

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

export function RestoreDefaultsDialog({ open, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className="restore-dialog"
      aria-labelledby="restore-dialog-title"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <h2 id="restore-dialog-title">恢复默认食物？</h2>
      <p>此操作会清除个人添加或删除的食物。</p>
      <p className="restore-dialog-note">食物库将恢复为最新默认列表，饮食记录不受影响。</p>
      <div className="restore-dialog-actions">
        <button type="button" className="restore-dialog-cancel" onClick={onCancel}>取消</button>
        <button type="button" className="restore-dialog-confirm" onClick={onConfirm}>确认恢复</button>
      </div>
    </dialog>,
    document.body,
  );
}