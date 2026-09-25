import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Grobe Zugriffsprüfung: kein Login -> /login, Login aber keine der beiden
// Rollen -> /kein-zugang (siehe PROJ-1 Acceptance Criteria). Läuft komplett
// über die JWT-Session (keine Datenbank-Abhängigkeit wie im Kundenportal-
// Projekt), daher hier direkt im Proxy möglich statt in einem separaten
// Server-Layout.
//
// Wichtige technische Funde:
// 1. Next.js 16 hat "middleware.ts" zu "proxy.ts" umbenannt — eine
//    middleware.ts wird jetzt kommentarlos ignoriert (siehe
//    node_modules/next/dist/docs/.../proxy.md).
// 2. proxy.ts muss auf derselben Ebene wie app/ liegen — bei diesem Projekt
//    (mit src/-Verzeichnis) also unter src/proxy.ts, NICHT im Projekt-Root.
//    Anders als middleware.ts im Kundenportal-Projekt, das dort bewusst im
//    Root liegt (siehe dessen PROJ-2 Decision Log zu einem ähnlichen, aber
//    anderen Namens-Stolperstein in einer älteren Next.js-16-Version) — bei
//    proxy.ts an derselben Stelle im Root wird die Datei komplett ignoriert,
//    ohne jede Fehlermeldung oder Warnung.
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.auth;
  const roles = request.auth?.user?.roles ?? [];
  const hatZugang = roles.includes("bearbeiter") || roles.includes("freigeber");

  const isPublicPath = pathname === "/login" || pathname === "/kein-zugang";

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isLoggedIn && !hatZugang && pathname !== "/kein-zugang") {
    return NextResponse.redirect(new URL("/kein-zugang", request.nextUrl));
  }

  if (isLoggedIn && hatZugang && (pathname === "/login" || pathname === "/kein-zugang")) {
    return NextResponse.redirect(new URL("/start", request.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)"],
};
