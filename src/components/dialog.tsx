"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

/** A modal built on the native <dialog>: focus trap, Escape to close, backdrop click closes. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start on the button marked as the main action, not the close button.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-panel p-0 text-text shadow-2xl backdrop:bg-black/60 ${
        wide ? "max-w-3xl" : "max-w-md"
      }`}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {title}
            </h2>
            <button type="button" className="btn btn-icon -mt-1 -mr-2 border-transparent bg-transparent" onClick={onClose} aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-3">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Asks before a destructive action. The confirm button names exactly what happens. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-muted">{body}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
