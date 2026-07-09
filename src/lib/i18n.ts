export const locales = ["fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
};

export const localeHomePaths: Record<Locale, string> = {
  fr: "/",
  en: "/en",
};

export const englishRoutes = {
  home: "/en",
  fishing: "/en/fishing",
  whaleWatching: "/en/whale-watching",
  contact: "/en/contact",
} as const;

export const homeTranslations = {
  en: {
    nav: {
      fishing: "Fishing",
      whales: "Whale watching",
      contact: "Contact",
    },
    hero: {
      badge: "Tahiti Trip Fishing",
      title: "Discover Tahiti from the ocean",
      subtitle:
        "Private sport fishing, respectful whale watching and authentic sea experiences with a local crew.",
      primary: "Explore experiences",
      secondary: "Contact us",
    },
    intro: {
      eyebrow: "Tahiti Trip",
      title: "Choose your ocean experience",
      text: "From offshore fishing to whale watching and private charters, Tahiti Trip Fishing helps you enjoy the ocean around Tahiti with clear organization and a passionate local crew.",
    },
    experiences: {
      eyebrow: "Experiences",
      title: "Book your trip",
      fishing: {
        title: "Sport fishing",
        text: "Private offshore fishing trip in Tahiti with professional gear and an experienced crew.",
      },
      whales: {
        title: "Whale watching",
        text: "Small-group whale watching during the season, with respect for the animals and the ocean.",
      },
      contact: {
        title: "Contact",
        text: "Ask a question, plan a private request, or organize your day at sea from Tahiti.",
      },
      cta: "Discover",
    },
    trust: [
      "Small groups",
      "Experienced crew",
      "Secure payment",
      "Marina Taina departure",
    ],
    contact: {
      eyebrow: "Contact",
      title: "Need help before booking?",
      phone: "Phone: +689 87 32 16 31",
      email: "Email: contact@tahiti-trip.com",
      note: "Departure from Moorea may be possible with a fuel supplement.",
      whatsapp: "WhatsApp",
    },
    footer: {
      text: "Sport fishing, whale watching and private sea experiences in Tahiti.",
      activities: "Activities",
    },
  },
} as const;
