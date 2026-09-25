"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// Server hat vor der Hydration keinen Theme-Wert; useSyncExternalStore statt
// useState+useEffect vermeidet das von der react-hooks-Lint-Regel
// "set-state-in-effect" beanstandete synchrone setState im Effekt.
function subscribeNoop() {
  return () => {};
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Farbschema umschalten"
      title="Farbschema umschalten"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? "☀" : "☾"}
    </Button>
  );
}
