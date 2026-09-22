import React from 'react';
import { GlassButton } from '../common/GlassButton';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete Vehicle',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl glass-modal p-6 border border-red-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(239,68,68,0.15)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-white">{title}</h3>
            <span className="text-xs text-red-300 uppercase tracking-wider font-semibold">Irreversible Action</span>
          </div>
        </div>

        <p className="text-sm text-neutral-300 mb-6 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3">
          <GlassButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
