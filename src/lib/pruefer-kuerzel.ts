// 1:1 aus der Legacy-Power-App übernommen (siehe PROJ-4 Product Decisions):
// Set(varPruefer, Lower(Left(User().FullName,2)) & Lower(Mid(User().FullName, Find(" ", User().FullName)+1, 2)))
// Erste 2 Buchstaben vor dem ersten Leerzeichen + erste 2 Buchstaben danach, beides klein.
// Fallback (nicht in der Power App vorgesehen): enthält der Name kein Leerzeichen,
// werden die ersten 4 Zeichen des ganzen Namens verwendet.
export function computePrueferKuerzel(fullName: string): string {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return trimmed.slice(0, 4).toLowerCase();
  }

  const vorname = trimmed.slice(0, 2);
  const nachname = trimmed.slice(spaceIndex + 1, spaceIndex + 3);
  return (vorname + nachname).toLowerCase();
}
