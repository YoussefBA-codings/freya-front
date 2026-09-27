import axios from "axios";
import { AxiosInstance } from "../api/axios/axiosInstance";
import { PORTAL_URL } from "./portalAuth";

// Lecture unique des erreurs : le message du serveur quand il y en a un, sinon une explication
// claire selon la situation (connexion, session, taille du fichier, serveur arrêté…).

export class SessionExpiredError extends Error {
  constructor() {
    super("Votre session a expiré. Reconnectez-vous puis réessayez.");
    this.name = "SessionExpiredError";
  }
}

const BY_STATUS: Record<number, string> = {
  400: "Données invalides.",
  401: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  403: "Accès refusé.",
  404: "Élément introuvable.",
  408: "Le serveur a mis trop de temps à répondre, réessayez.",
  409: "Conflit avec des données existantes.",
  413: "Fichier trop volumineux (20 Mo maximum).",
  415: "Format de fichier non pris en charge.",
  429: "Trop de demandes en même temps, réessayez dans un instant.",
  500: "Erreur du serveur, réessayez.",
  502: "Le serveur ne répond pas, réessayez dans un instant.",
  503: "Le serveur est momentanément indisponible, réessayez dans un instant.",
  504: "Le serveur a mis trop de temps à répondre, réessayez.",
};

// Message du serveur : { message }, { error }, tableau de messages ou texte brut (hors pages HTML de nginx)
function serverMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    const text = data.trim();
    if (!text || text.startsWith("<")) return null;
    return text.replace(/^Erreur\s*:\s*/i, "");
  }
  if (typeof data === "object") {
    const d = data as Record<string, unknown>;
    const m = d.message ?? d.error;
    if (Array.isArray(m)) return m.filter(Boolean).join(" · ") || null;
    if (typeof m === "string" && m.trim() && m !== "Internal server error") return m.trim();
  }
  return null;
}

const withDot = (s: string) => (/[.!?…»)]$/.test(s) ? s : `${s}.`);

/** Texte à afficher pour une erreur ; `action` décrit ce qui a échoué (« Enregistrement de la facture impossible »). */
export function errorMessage(e: unknown, action?: string): string {
  let reason: string;
  if (e instanceof SessionExpiredError) reason = e.message;
  else if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    if (!e.response) {
      reason =
        e.code === "ECONNABORTED" || e.code === "ETIMEDOUT"
          ? "Le serveur a mis trop de temps à répondre, réessayez."
          : navigator.onLine === false
            ? "Pas de connexion internet."
            : "Serveur injoignable. Vérifiez votre connexion (et Tailscale), puis réessayez.";
    } else if (status === 413) reason = BY_STATUS[413];
    else if (status === 401) reason = BY_STATUS[401];
    else reason = serverMessage(e.response.data) ?? (status ? BY_STATUS[status] : undefined) ?? `Erreur inattendue (code ${status}).`;
  } else if (e instanceof Error && e.message) reason = e.message;
  else if (typeof e === "string" && e) reason = e;
  else reason = "Erreur inattendue.";
  return action ? `${action} : ${withDot(/^[A-ZÀ-Ý][a-zà-ÿ]/.test(reason) ? reason.charAt(0).toLowerCase() + reason.slice(1) : reason)}` : withDot(reason);
}

// Session expirée : nginx redirige les appels vers la page de connexion du portail (réponse HTML en 200).
// On la transforme en erreur claire au lieu de laisser passer une page HTML comme si c'étaient des données.
function detectLoginRedirect(response: import("axios").AxiosResponse) {
  const url: string = response.request?.responseURL ?? "";
  const html = typeof response.data === "string" && response.data.trimStart().startsWith("<");
  if (html && (url.endsWith("/login") || url.startsWith(`${PORTAL_URL}/login`))) throw new SessionExpiredError();
  return response;
}
axios.interceptors.response.use(detectLoginRedirect);
AxiosInstance.interceptors.response.use(detectLoginRedirect);
