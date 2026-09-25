import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Workforce-Tenant (nicht External ID/CIAM) — der einfache, gut unterstützte
// Standardfall für interne Microsoft-365-Konten. Die "roles"-Claim im
// ID-Token kommt automatisch von Entra ID, sobald App Roles im
// App-Registrierung-Manifest definiert und Nutzern zugewiesen sind (siehe
// PROJ-1 Spec) — keine zusätzliche Scope-Konfiguration nötig.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    // profile enthält die dekodierten ID-Token-Claims beim Login — die
    // Rollen-Liste wird einmalig ins JWT übernommen, damit sie bei jedem
    // Request ohne erneuten Token-Zugriff verfügbar ist.
    async jwt({ token, profile }) {
      if (profile && "roles" in profile) {
        token.roles = (profile.roles as string[] | undefined) ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.roles = (token.roles as string[] | undefined) ?? [];
      return session;
    },
  },
});
