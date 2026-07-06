export type BoatSlotName = "morning" | "afternoon";
export type FormulaId = "morning" | "afternoon" | "full_day";
export type PaymentType = "deposit" | "full";

export type PecheFormula = {
  id: FormulaId;
  title: string;
  time: string;
  tolerance: string;
  price: number;
  slots: BoatSlotName[];
};

export const PECHE_FORMULAS: PecheFormula[] = [
  {
    id: "morning",
    title: "Demi-journée matin",
    time: "07h15 - 12h00",
    tolerance: "+/- 30 min",
    price: 95000,
    slots: ["morning"],
  },
  {
    id: "afternoon",
    title: "Demi-journée après-midi",
    time: "13h15 - 17h45",
    tolerance: "+/- 30 min",
    price: 95000,
    slots: ["afternoon"],
  },
  {
    id: "full_day",
    title: "Journée complète",
    time: "07h15 - 15h45",
    tolerance: "+/- 30 min",
    price: 135000,
    slots: ["morning", "afternoon"],
  },
];

export const WHATSAPP_URL =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20je%20souhaite%20une%20demande%20peche%20au%20gros%20a%20Tahiti.";

export function formatPechePrice(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s/g, " ")} F CFP`;
}
