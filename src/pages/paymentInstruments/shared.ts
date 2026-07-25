// shared.ts - types/constantes/helpers communs à la page de déclaration
// (DeclarePaymentInstrument) et à la page de suivi (PaymentInstrumentsList) -
// scindées en deux pages distinctes (décision équipe 2026-07-25).
import axios from "axios";

export interface ClientB2B {
  id: number;
  name: string;
}

export type InstrumentType = "CHEQUE" | "VIREMENT" | "TRAITE";
export type InstrumentStatus = "PENDING" | "RECEIVED" | "REJECTED";

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
  RECEIVED: "Encaissé",
  REJECTED: "Rejeté",
};

export const STATUS_COLORS: Record<InstrumentStatus, "warning" | "success" | "error"> = {
  PENDING: "warning",
  RECEIVED: "success",
  REJECTED: "error",
};

export const isOverdue = (i: PaymentInstrument) =>
  i.status === "PENDING" && new Date(i.expected_date) < new Date();

export const isDueSoon = (i: PaymentInstrument) => {
  if (i.status !== "PENDING") return false;
  const days = (new Date(i.expected_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
};

export const errorMessageOf = (e: unknown) =>
  axios.isAxiosError(e) ? e.response?.data?.message || e.message : "Erreur inattendue.";
