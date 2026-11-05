"use client";

import Modal from "./Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} width="380px">
      <h3 className="text-lg font-semibold text-heading mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed mb-6">{message}</p>
      <div className="flex gap-2.5 justify-end">
        <button
          onClick={onCancel}
          className="border border-border rounded-full px-4 py-2 text-sm font-medium hover:bg-thead transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="bg-danger text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-danger/90 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}
