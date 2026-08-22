export const SALON_PRICING = {
  permis: {
    classique: { salon: 20_900, normal: 25_000 },
    serenite: { salon: 28_900, normal: 33_000 },
    validite: "31 janvier 2027",
  },
  peche: {
    place: { demiJournee: 33_000, journee: 40_000 },
    offreTrois: { demiJournee: 66_000, journee: 80_000 },
    privatisation: {
      demiJournee: { salon: 79_000, normal: 95_000, equivalentParPersonne: 19_750 },
      journee: { salon: 110_000, normal: 135_000, equivalentParPersonne: 27_500 },
      capacite: 4,
    },
    validite: "31 janvier 2027",
  },
  baleines: {
    miseEau: { salon: 12_500, normal: 15_000 },
    observateur: { salon: 8_500, normal: 8_500 },
    enfantMoinsDouze: { salon: 7_000, normal: 7_000 },
    enfantMoinsCinq: 0,
    groupe: { placesPayees: 5, placesTotales: 6, total: 62_500, normal: 90_000 },
    carnets: [
      { sorties: 5, total: 55_000, normal: 65_000, parSortie: 11_000 },
      { sorties: 10, total: 100_000, normal: 115_000, parSortie: 10_000 },
    ],
    validiteCarnets: "20 novembre 2027",
  },
  charter: {
    tetiaroaDeuxJours: {
      salon: 290_000,
      normal: 310_000,
      capacite: 9,
      validite: "31 janvier 2027",
    },
    tetiaroaTroisJours: { prix: null },
  },
} as const;

export const SALON_CONTACT = {
  phoneDisplay: "+689 87 32 16 31",
  phoneHref: "tel:+68987321631",
  whatsappHref:
    "https://wa.me/68987321631?text=Ia%20orana%2C%20je%20souhaite%20profiter%20d%27une%20offre%20Salon%20du%20Tourisme.",
  email: "contact@tahiti-trip.com",
} as const;

export function formatSalonPrice(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFP`;
}
