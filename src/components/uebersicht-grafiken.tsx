"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMinutenMitVorzeichen } from "@/lib/zeiterfassung/format";
import type { UebersichtZeile } from "@/components/uebersicht-tabelle";

// PROJ-17: Farben mit dem dataviz-Validator geprüft (2026-10-27), hell auf
// Weiss und dunkel auf der Kartenfarbe #1d2129:
// - Gleitzeit = Polarität: Blau (Plus) ↔ Rot (Minus), alle Checks bestanden
// - Ferien = Teile eines Ganzen: eine Blau-Stufenfolge (bezogen dunkel → Rest hell),
//   im Dark Mode umgekehrt (bezogen hell); negativer Rest im Minus-Rot
const gleitzeitConfig = {
  plus: { label: "Plus", theme: { light: "#2a78d6", dark: "#3987e5" } },
  minus: { label: "Minus", theme: { light: "#e34948", dark: "#e66767" } },
} satisfies ChartConfig;

const ferienConfig = {
  bezogen: { label: "bezogen", theme: { light: "#1c5cab", dark: "#9ec5f4" } },
  geplant: { label: "geplant", theme: { light: "#5598e7", dark: "#5598e7" } },
  rest: { label: "Rest", theme: { light: "#86b6ef", dark: "#256abf" } },
  minus: { label: "überzogen", theme: { light: "#e34948", dark: "#e66767" } },
} satisfies ChartConfig;

/** Horizontale Balken: Höhe wächst mit der Anzahl Personen, damit Namen lesbar bleiben. */
function hoehe(anzahl: number): number {
  return Math.max(160, anzahl * 36 + 56);
}

function kurzname(name: string): string {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

function Ausgelassen({ namen, grund }: { namen: string[]; grund: string }) {
  if (namen.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {grund}: {namen.join(", ")}
    </p>
  );
}

export function UebersichtGrafiken({ zeilen, jahr }: { zeilen: UebersichtZeile[]; jahr: number }) {
  const mitGleitzeit = zeilen.filter((z) => z.gleitzeitMinuten !== null);
  const gleitzeitDaten = mitGleitzeit.map((z) => ({
    name: kurzname(z.anzeige),
    vollerName: z.anzeige,
    stunden: Math.round((z.gleitzeitMinuten! / 60) * 100) / 100,
  }));

  // QA BUG-1: Rest = Saldo am Jahresende, damit bezogen + geplant + Rest dem
  // verfügbaren Total entspricht (der Saldo am Monatsende zählte später
  // geplante Ferien doppelt).
  const mitFerien = zeilen.filter((z) => z.ferienSaldoJahresende !== null);
  const ferienDaten = mitFerien.map((z) => {
    const rest = z.ferienSaldoJahresende!;
    return {
      name: kurzname(z.anzeige),
      vollerName: z.anzeige,
      bezogen: z.ferienBezogen,
      geplant: z.ferienGeplant,
      rest: Math.max(rest, 0),
      // Negativer Saldo links der Nulllinie (stackOffset "sign").
      minus: Math.min(rest, 0),
    };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gleitzeit</CardTitle>
          <CardDescription>Saldo am Monatsende (laufender Monat: Stand heute) in Stunden</CardDescription>
        </CardHeader>
        <CardContent>
          {gleitzeitDaten.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Keine Gleitzeit in diesem Monat.</p>
          ) : (
            <ChartContainer config={gleitzeitConfig} className="aspect-auto w-full" style={{ height: hoehe(gleitzeitDaten.length) }}>
              <BarChart data={gleitzeitDaten} layout="vertical" margin={{ left: 8, right: 16 }} accessibilityLayer>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `${v} h`} />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.vollerName}
                      formatter={(wert) => formatMinutenMitVorzeichen(Number(wert) * 60)}
                    />
                  }
                />
                <Bar dataKey="stunden" radius={4} maxBarSize={22}>
                  {gleitzeitDaten.map((d) => (
                    <Cell key={d.vollerName} fill={d.stunden < 0 ? "var(--color-minus)" : "var(--color-plus)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          <Ausgelassen
            namen={zeilen.filter((z) => z.gleitzeitMinuten === null).map((z) => z.anzeige)}
            grund="Ohne Gleitzeit (kein Arbeitsmodell oder vor dem Beginn)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ferien {jahr}</CardTitle>
          <CardDescription>Tage: bezogen, geplant und Rest am Jahresende</CardDescription>
        </CardHeader>
        <CardContent>
          {ferienDaten.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Keine Ferienwerte in diesem Jahr.</p>
          ) : (
            <ChartContainer config={ferienConfig} className="aspect-auto w-full" style={{ height: hoehe(ferienDaten.length) + 24 }}>
              <BarChart data={ferienDaten} layout="vertical" stackOffset="sign" margin={{ left: 8, right: 16 }} accessibilityLayer>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `${v}`} />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.vollerName}
                      formatter={(wert, name) => (
                        <span className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{ferienConfig[name as keyof typeof ferienConfig]?.label}</span>
                          <span className="font-medium tabular-nums">{Number(wert)} Tage</span>
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {/* 2px Fuge in Kartenfarbe zwischen den gestapelten Segmenten. */}
                <Bar dataKey="bezogen" stackId="f" fill="var(--color-bezogen)" stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={22} />
                <Bar dataKey="geplant" stackId="f" fill="var(--color-geplant)" stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={22} />
                <Bar dataKey="rest" stackId="f" fill="var(--color-rest)" stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={22} />
                <Bar dataKey="minus" stackId="f" fill="var(--color-minus)" stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={22} />
              </BarChart>
            </ChartContainer>
          )}
          <Ausgelassen
            namen={zeilen.filter((z) => z.ferienSaldoJahresende === null).map((z) => z.anzeige)}
            grund="Ohne Feriensaldo"
          />
        </CardContent>
      </Card>
    </div>
  );
}
