// Adressen der Zeiterfassung (von Server- und Client-Komponenten genutzt).

export function personHref(email: string): string {
  return `/zeiterfassung/personen/${encodeURIComponent(email)}`;
}

export function zeitnachweisHref(person: string | null, monat: string): string {
  const params = new URLSearchParams();
  if (person) params.set("person", person);
  params.set("monat", monat);
  return `/zeiterfassung/zeitnachweis?${params}`;
}

/** PROJ-17: Übersicht aller Mitarbeitenden für einen Monat. */
export function uebersichtHref(monat: string): string {
  return `/zeiterfassung?${new URLSearchParams({ monat })}`;
}
