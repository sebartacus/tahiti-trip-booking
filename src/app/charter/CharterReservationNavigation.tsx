"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { CharterFormula } from "@/lib/charter-availability";

type CharterReservationContextValue = {
  formula: CharterFormula;
  reservationRef: RefObject<HTMLElement | null>;
  selectFormula: (formula: CharterFormula) => void;
  selectFormulaAndScroll: (formula: CharterFormula) => void;
};

const CharterReservationContext = createContext<CharterReservationContextValue | null>(null);

export function CharterReservationProvider({ children }: { children: ReactNode }) {
  const [formula, setFormula] = useState<CharterFormula>("tetiaroa_2j_1n");
  const reservationRef = useRef<HTMLElement>(null);

  const selectFormula = useCallback((nextFormula: CharterFormula) => {
    setFormula(nextFormula);
  }, []);

  const selectFormulaAndScroll = useCallback((nextFormula: CharterFormula) => {
    setFormula(nextFormula);
    reservationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <CharterReservationContext.Provider
      value={{ formula, reservationRef, selectFormula, selectFormulaAndScroll }}
    >
      {children}
    </CharterReservationContext.Provider>
  );
}

export function useCharterReservation() {
  const context = useContext(CharterReservationContext);
  if (!context) {
    throw new Error("useCharterReservation must be used inside CharterReservationProvider");
  }
  return context;
}

export function CharterReserveButton({
  formula,
  variant = "light",
  locale = "fr",
}: {
  formula: CharterFormula;
  variant?: "light" | "dark" | "sunset";
  locale?: "fr" | "en";
}) {
  const { selectFormulaAndScroll } = useCharterReservation();
  const colors = {
    light: "bg-cyan-950 text-white hover:bg-cyan-900",
    dark: "bg-white text-cyan-950 hover:bg-cyan-50",
    sunset: "bg-rose-950 text-white hover:bg-rose-900",
  }[variant];

  return (
    <button
      type="button"
      onClick={() => selectFormulaAndScroll(formula)}
      className={`mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-base font-black shadow-lg transition hover:-translate-y-0.5 sm:w-auto ${colors}`}
    >
      {locale === "en" ? "Book" : "Réserver"}
    </button>
  );
}
