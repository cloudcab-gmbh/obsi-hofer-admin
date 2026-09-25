import type { DefaultSession } from "next-auth";

// Erweitert die Session um die Entra-ID-App-Roles (Bearbeiter/Freigeber),
// siehe auth.ts jwt/session-Callbacks.
declare module "next-auth" {
  interface Session {
    user: {
      roles: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
  }
}
