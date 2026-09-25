"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";

// Federated Logout: Auth.js' eigenes signOut() beendet nur unsere lokale
// Session, nicht die Microsoft-Sitzung selbst — ohne diesen Zusatzschritt
// bliebe man beim nächsten Anmeldeversuch automatisch (still) angemeldet.
// Gleicher Bug wurde im Kundenportal-Projekt (dortiges PROJ-2) erst
// nachträglich gefunden, hier von Anfang an mit eingeplant (siehe PROJ-1
// Product Decisions).
export async function signOutEverywhere(): Promise<void> {
  await signOut({ redirect: false });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const postLogoutRedirectUri = encodeURIComponent(`${baseUrl}/login`);
  const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

  redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`
  );
}
