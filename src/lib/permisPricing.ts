export type PermisFormula = "Classique" | "Sérénité";
export type PermisPricingType =
  | "normal"
  | "promo_internet"
  | "salon_tourisme";

type PermisPrices = Record<PermisFormula, number>;

type GetPermisPricingOptions = {
  promotionReservationsSold?: number;
  now?: Date;
};

const PROMOTION_LIMIT = 20;

const NORMAL_PRICES: PermisPrices = {
  Classique: 25000,
  Sérénité: 33000,
};

const PROMOTION_PRICES: PermisPrices = {
  Classique: 19000,
  Sérénité: 27000,
};

const SALON_PRICES: PermisPrices = {
  Classique: 21000,
  Sérénité: 29000,
};

function getTahitiDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Tahiti",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isSalonTourismePeriod(date: Date) {
  const dateKey = getTahitiDateKey(date);
  return dateKey >= "2026-09-04" && dateKey <= "2026-09-06";
}

export function getPermisPricing(options: GetPermisPricingOptions = {}) {
  const now = options.now ?? new Date();
  const rawPromotionReservationsSold = Math.max(
    0,
    options.promotionReservationsSold ?? 0
  );
  const promotionReservationsSold = Math.min(
    rawPromotionReservationsSold,
    PROMOTION_LIMIT
  );
  const promotionsRemaining = Math.max(
    0,
    PROMOTION_LIMIT - rawPromotionReservationsSold
  );
  const isPromotionAvailable = promotionsRemaining > 0;
  const isSalon = isSalonTourismePeriod(now);

  if (isSalon) {
    return {
      prices: SALON_PRICES,
      pricingType: "salon_tourisme" as const,
      isPromotionActive: false,
      promotionReservationsSold,
      promotionsRemaining,
      requiresExam: false,
    };
  }

  if (isPromotionAvailable) {
    return {
      prices: PROMOTION_PRICES,
      pricingType: "promo_internet" as const,
      isPromotionActive: true,
      promotionReservationsSold,
      promotionsRemaining,
      requiresExam: true,
    };
  }

  return {
    prices: NORMAL_PRICES,
    pricingType: "normal" as const,
    isPromotionActive: false,
    promotionReservationsSold,
    promotionsRemaining,
    requiresExam: false,
  };
}

export function getPermisPriceForFormula(
  formula: string,
  pricing: ReturnType<typeof getPermisPricing>
) {
  return pricing.prices[formula as PermisFormula] ?? 0;
}

export function formatXpf(price: number) {
  return `${price.toLocaleString("fr-FR")} XPF`;
}
