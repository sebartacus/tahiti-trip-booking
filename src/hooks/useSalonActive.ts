"use client";

import { useEffect, useState } from "react";
import { isSalonActive, SALON_END, SALON_START } from "@/lib/salon-period";

export function useSalonActive() {
  const [active, setActive] = useState(() => isSalonActive());
  useEffect(() => {
    let timer: number | undefined;
    const updateAndSchedule = () => {
      setActive(isSalonActive());
      const now = Date.now();
      const nextBoundary = [Date.parse(SALON_START), Date.parse(SALON_END)].find((value) => value > now);
      if (nextBoundary) timer = window.setTimeout(updateAndSchedule, Math.min(nextBoundary - now + 25, 2_147_483_647));
    };
    updateAndSchedule();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, []);
  return active;
}

export function salonEvaluationDate(active: boolean) {
  return active ? new Date(SALON_START) : new Date(0);
}
