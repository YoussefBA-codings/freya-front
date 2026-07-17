// Freya Hub n'a pas sa propre notion de session : l'authentification vit sur
// Freya Portal (voir tools/freyaOMS/docs/ARCHITECTURE.md, "Topologie SSO
// Freya"). Hub est servi sous /compta sur le MÊME host+port que le portail
// (443) — donc ces appels sont same-origin, pas de souci CORS/credentials.
const PORTAL_URL = "https://ip-172-26-14-45.tail515d61.ts.net";

/** Email de l'utilisateur connecté (session du portail) — null si absent/expiré. */
export async function getPortalUserEmail(): Promise<string | null> {
  try {
    const res = await fetch(`${PORTAL_URL}/api/auth/session`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Déconnexion réelle (pas juste visuelle) : appelle le signOut NextAuth du
 * portail. Le cookie de session étant scopé par hostname (pas par port, RFC
 * 6265, voir docs/ARCHITECTURE.md), ça déconnecte aussi freyaOMS - une seule
 * déconnexion pour tout, symétrique à l'unique connexion.
 */
export async function signOutOfPortal(): Promise<void> {
  const csrfRes = await fetch(`${PORTAL_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await fetch(`${PORTAL_URL}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken }),
  });
  window.location.href = `${PORTAL_URL}/login`;
}

export { PORTAL_URL };
