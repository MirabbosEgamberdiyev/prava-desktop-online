import { memo } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Fluent-style confirmation dialog. Enter confirms, Esc cancels (wired by the exam shortcut hook). */
export const ConfirmDialog = memo(function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <div className="xd-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="xd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="xd-dialog-title">
        <div className="xd-dialog__icon" aria-hidden="true">
          <IconAlertTriangle size={24} />
        </div>
        <h2 id="xd-dialog-title" className="xd-dialog__title">
          {title}
        </h2>
        <p className="xd-dialog__desc">{description}</p>
        <div className="xd-dialog__actions">
          <button type="button" className="xd-btn" onClick={onCancel}>
            {cancelLabel} <kbd className="xd-kbd">Esc</kbd>
          </button>
          <button type="button" className="xd-btn xd-btn--danger" onClick={onConfirm}>
            {confirmLabel} <kbd className="xd-kbd">↵</kbd>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ConfirmDialog;
