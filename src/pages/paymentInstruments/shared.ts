// shared.ts - types/constantes/helpers communs à la page de déclaration
// (DeclarePaymentInstrument) et à la page de suivi (PaymentInstrumentsList) -
// scindées en deux pages distinctes (décision équipe 2026-07-25).
import axios from "axios";

export interface ClientB2B {
  id: number;
  name: string;
}

export type InstrumentType = "CHEQUE" | "VIREMENT" | "TRAITE";
// DEPOSITED : chèque/traite physiquement déposé en banque - jamais pour un
// virement, qui passe directement de PENDING à RECEIVED/REJECTED (décision
// équipe 2026-07-25, voir backend PaymentInstrumentService.deposit).
export type InstrumentStatus = "PENDING" | "DEPOSITED" | "RECEIVED" | "REJECTED";

export interface PaymentInstrumentPayment {
  id: number;
  order_id: number;
  amount: string;
  order: { id: number; invoice_number: string | null } | null;
}

export interface OutstandingOrder {
  id: number;
  invoice_number: string | null;
  total_ttc: number;
  payable_amount: number;
  remaining: number;
}

export interface PaymentInstrument {
  id: number;
  client_id: number;
  client: ClientB2B;
  type: InstrumentType;
  amount: string;
  reference: string | null;
  expected_date: string;
  status: InstrumentStatus;
  deposited_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  payments: PaymentInstrumentPayment[];
  justificatif_url: string | null;
}

export interface ConfirmResult {
  allocations: { order_id: number; amount: number }[];
  unallocated: number;
}

export const TYPE_LABELS: Record<InstrumentType, string> = {
  CHEQUE: "Chèque",
  VIREMENT: "Virement",
  TRAITE: "Traite",
};

export const STATUS_LABELS: Record<InstrumentStatus, string> = {
  PENDING: "En attente",
  DEPOSITED: "Déposé",
  RECEIVED: "Encaissé",
  REJECTED: "Rejeté",
};

export const STATUS_COLORS: Record<InstrumentStatus, "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  DEPOSITED: "info",
  RECEIVED: "success",
  REJECTED: "error",
};

// Un virement n'a pas d'étape de dépôt - il passe directement de PENDING à
// RECEIVED/REJECTED. Un chèque/traite doit d'abord être déposé (voir
// requiresDeposit ci-dessous).
export const requiresDeposit = (type: InstrumentType) => type !== "VIREMENT";

// Statut à partir duquel confirmer/rejeter est possible : DEPOSITED pour un
// chèque/traite, PENDING directement pour un virement (voir backend
// PaymentInstrumentService.requiredStatusBeforeConfirmation - même règle,
// dupliquée ici pour piloter l'affichage des actions dans la liste).
export const canConfirmOrReject = (i: PaymentInstrument) =>
  requiresDeposit(i.type) ? i.status === "DEPOSITED" : i.status === "PENDING";

export const canDeposit = (i: PaymentInstrument) => requiresDeposit(i.type) && i.status === "PENDING";

export const isOverdue = (i: PaymentInstrument) =>
  i.status === "PENDING" && new Date(i.expected_date) < new Date();

export const isDueSoon = (i: PaymentInstrument) => {
  if (i.status !== "PENDING") return false;
  const days = (new Date(i.expected_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
};

// Un chèque/traite se DÉPOSE en banque à l'échéance (l'encaissement n'a
// lieu qu'après, une fois la banque passée) ; un virement, lui, s'encaisse
// directement, sans étape de dépôt (voir requiresDeposit ci-dessus). Ne
// jamais dire "à encaisser" pour un chèque/une traite pas encore déposé(e) -
// décision équipe 2026-07-25, terminologie revue pour rester exacte (même
// logique côté backend, payment-instrument.service.ts:actionLabel).
export const dueActionLabel = (i: PaymentInstrument): string => {
  const isDeposit = requiresDeposit(i.type);
  const days = Math.floor((Date.now() - new Date(i.expected_date).getTime()) / (1000 * 60 * 60 * 24));
  if (days > 0) return isDeposit ? `Dépôt en retard de ${days} jour(s)` : `Encaissement en retard de ${days} jour(s)`;
  if (days === 0) return isDeposit ? "À déposer en banque aujourd'hui" : "À encaisser aujourd'hui";
  return isDeposit ? "Dépôt en banque à venir" : "Encaissement à venir";
};

// Ajoute `days` jours ouvrés (hors samedi/dimanche) à une date - même
// logique que le backend (payment-instrument.repository.ts:addBusinessDays).
const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
};

// Chèque/traite déposé depuis au moins 2 jours ouvrés, toujours en attente
// de mise à jour (accepté/rejeté) - à vérifier en banque.
export const needsDepositUpdate = (i: PaymentInstrument) =>
  i.status === "DEPOSITED" && !!i.deposited_at && addBusinessDays(new Date(i.deposited_at), 2) <= new Date();

export const errorMessageOf = (e: unknown) =>
  axios.isAxiosError(e) ? e.response?.data?.message || e.message : "Erreur inattendue.";
