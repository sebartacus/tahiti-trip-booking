import type { CharterFormula } from "./charter-availability";

export type CharterPaymentType = "deposit" | "full";
export type SunsetDrink = "white_wine" | "champagne_included";

export type CharterFormulaDetails = {
  label: string;
  detail: string;
  maxParticipants: number;
  isTetiaroa: boolean;
};

export const CHARTER_FORMULA_DETAILS: Record<CharterFormula, CharterFormulaDetails> = {
  tetiaroa_2j_1n: {
    label: "Tetiaroa 2 jours / 1 nuit",
    detail: "2 jours · 1 nuit",
    maxParticipants: 9,
    isTetiaroa: true,
  },
  tetiaroa_3j_2n: {
    label: "Tetiaroa 3 jours / 2 nuits",
    detail: "3 jours · 2 nuits",
    maxParticipants: 9,
    isTetiaroa: true,
  },
  moorea_matin: {
    label: "Moorea 7h–13h",
    detail: "Demi-journée privée",
    maxParticipants: 12,
    isTetiaroa: false,
  },
  moorea_journee: {
    label: "Moorea journée",
    detail: "Journée privée",
    maxParticipants: 12,
    isTetiaroa: false,
  },
  sunset: {
    label: "Sunset privatif",
    detail: "2h30 environ",
    maxParticipants: 10,
    isTetiaroa: false,
  },
};

export function getCharterPrice(
  formula: CharterFormula,
  participants: number,
  champagneSupplement = false
) {
  const { maxParticipants } = CHARTER_FORMULA_DETAILS[formula];
  if (!Number.isInteger(participants) || participants < 1 || participants > maxParticipants) {
    throw new RangeError("Nombre de participants invalide pour cette formule.");
  }

  let amount: number;
  if (formula === "tetiaroa_2j_1n") amount = 310000;
  else if (formula === "tetiaroa_3j_2n") amount = 429000;
  else if (formula === "moorea_matin") amount = 95000 + Math.max(0, participants - 4) * 5000;
  else if (formula === "moorea_journee") amount = 145000 + Math.max(0, participants - 6) * 5000;
  else amount = 75000 + Math.floor((participants - 1) / 2) * 10000;

  if (formula === "sunset" && participants >= 3 && champagneSupplement) {
    amount += 15000;
  }
  return amount;
}

export function getCharterPaymentAmounts(total: number, paymentType: CharterPaymentType) {
  const deposit = Math.round(total * 0.3);
  return {
    deposit,
    balance: paymentType === "deposit" ? total - deposit : 0,
    amountToPay: paymentType === "deposit" ? deposit : total,
  };
}

export function formatXpf(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s/g, " ")} F CFP`;
}

export function validateCharterBooking(input: {
  formula: CharterFormula;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  participants: number;
  sunsetDrinkSelected: boolean;
  sleepingAccepted: boolean;
  conditionsAccepted: boolean;
}) {
  const details = CHARTER_FORMULA_DETAILS[input.formula];
  if (!input.firstName.trim()) return "Le prénom est obligatoire.";
  if (!input.lastName.trim()) return "Le nom est obligatoire.";
  if (!input.phone.trim()) return "Le téléphone est obligatoire.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Saisissez une adresse e-mail valide.";
  }
  if (!Number.isInteger(input.participants) || input.participants < 1 || input.participants > details.maxParticipants) {
    return "Le nombre de participants est invalide.";
  }
  if (input.formula === "sunset" && input.participants <= 2 && !input.sunsetDrinkSelected) {
    return "Choisissez la boisson incluse pour le Sunset.";
  }
  if (details.isTetiaroa && input.participants === 9 && !input.sleepingAccepted) {
    return "Confirmez avoir pris connaissance de l’organisation des couchages.";
  }
  if (!input.conditionsAccepted) {
    return "Vous devez accepter les conditions de réservation et d’annulation.";
  }
  return "";
}
