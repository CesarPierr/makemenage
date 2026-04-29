"use client";

import { Dialog } from "@/components/ui/dialog";

type BoxDeleteDialogProps = {
  isOpen: boolean;
  boxName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function BoxDeleteDialog({ isOpen, boxName, onClose, onConfirm }: BoxDeleteDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Supprimer l'enveloppe ?"
      type="danger"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm font-semibold"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary bg-red-600 hover:bg-red-700 border-red-700 px-4 py-2 text-sm font-semibold"
            onClick={onConfirm}
          >
            Supprimer définitivement
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Toute l&apos;historique de <strong>{boxName}</strong> sera définitivement supprimé.
        Cette action est irréversible.
      </p>
    </Dialog>
  );
}
