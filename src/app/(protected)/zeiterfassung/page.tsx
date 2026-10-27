import { redirect } from "next/navigation";

// PROJ-14: Einstieg der Zeiterfassung. Der Zeitnachweis (PROJ-13) folgt —
// bis dahin führt der Menüpunkt direkt zu den Personen.
export default function ZeiterfassungPage() {
  redirect("/zeiterfassung/personen");
}
