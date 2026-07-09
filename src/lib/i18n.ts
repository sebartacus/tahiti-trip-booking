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

export const pecheBookingTranslations = {
  fr: {
    bookingEyebrow: "Réservation",
    chooseTrip: "Choisissez votre sortie",
    date: "Date",
    calendar: {
      locale: "fr-FR",
      previousMonth: "Mois précédent",
      nextMonth: "Mois suivant",
      available: "Disponible",
      partial: "Partiellement disponible",
      unavailable: "Indisponible",
      loading: "Chargement des disponibilités...",
      error: "Disponibilités indisponibles.",
      dayLabels: ["L", "M", "M", "J", "V", "S", "D"],
    },
    formulas: {
      morning: "Demi-journée matin",
      afternoon: "Demi-journée après-midi",
      full_day: "Journée complète",
    },
    tolerance: "Tolérance horaires",
    unavailable: "Indisponible",
    unavailableFormula: "Déjà réservé",
    unavailableFullDay: "Journée complète indisponible sur cette date",
    dateUnavailable: "Cette date n'est plus disponible. Merci de choisir une autre date.",
    partialUnavailable: "Certaines formules ne sont plus disponibles sur cette date.",
    checkingBoat: "Vérification du calendrier bateau...",
    onboardEyebrow: "À bord",
    allReady: "Tout est prêt",
    skipper: "Skipper",
    fishingGear: "Matériel de pêche",
    drinks: "Eau, sodas, bières et chips",
    fullDayLunch: "Déjeuner pour la journée complète",
    fishingDisclaimer:
      "La pêche reste la pêche : aucune capture ne peut être garantie, mais nous mettons tout en œuvre pour maximiser vos chances.",
    participants: "Participants",
    participantsText:
      "De 1 à 4 personnes incluses. Les enfants comptent comme une personne et sont acceptés à partir de 8 ans.",
    moreThanFour:
      "Vous souhaitez être plus de 4 personnes ? Contactez-nous pour une demande spécifique.",
    childrenOk: "Je certifie que tous les participants ont au moins 8 ans.",
    manager: "Responsable",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    whatsappLabel: "Discuter sur WhatsApp",
    activityLabel: "Sortie pêche",
    totalBoat: "Total bateau",
    reservationSaved: "Réservation enregistrée. Redirection vers PayZen...",
    errors: {
      loadBoatCalendar: "Impossible de charger le calendrier bateau.",
      chooseDate: "Choisissez une date de sortie.",
      slotReserved:
        "Ce créneau vient d'être réservé. Choisissez une autre date ou formule.",
      onlineLimit: "La réservation en ligne est limitée à 4 personnes.",
      minimumOne: "Indiquez au moins 1 personne.",
      firstName: "Indiquez le prénom du responsable.",
      lastName: "Indiquez le nom du responsable.",
      email: "Indiquez l'email du responsable.",
      phone: "Indiquez le téléphone du responsable.",
      children: "Confirmez que les enfants ont au moins 8 ans.",
      saveReservation: "Impossible d'enregistrer la réservation.",
      preparePayment: "Erreur lors de la préparation du paiement.",
    },
    payment: {
      fullPaymentEyebrow: "Paiement complet",
      depositTitle: "Réserver avec un acompte",
      depositButton: "Réserver avec acompte",
      depositDescription: "Le solde sera réglé le jour de votre sortie.",
      fullTitle: "Payer la totalité",
      fullButton: "Payer la totalité",
      fullDescription: "Aucun solde à régler le jour de la sortie.",
      reassuranceTitle: "Réservez en toute sérénité",
      weatherIntro: "En cas d'annulation liée aux conditions météorologiques :",
      freeReschedule: "report gratuit de votre sortie",
      refund: "ou remboursement de votre paiement",
      bankFees:
        "Seuls les frais bancaires liés au paiement sécurisé (3 %) restent à la charge du client.",
    },
  },
  en: {
    bookingEyebrow: "Booking",
    chooseTrip: "Choose your trip",
    date: "Date",
    calendar: {
      locale: "en-US",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      available: "Available",
      partial: "Partially available",
      unavailable: "Unavailable",
      loading: "Loading availability...",
      error: "Availability unavailable.",
      dayLabels: ["M", "T", "W", "T", "F", "S", "S"],
    },
    formulas: {
      morning: "Morning half-day",
      afternoon: "Afternoon half-day",
      full_day: "Full day",
    },
    tolerance: "Schedule tolerance",
    unavailable: "Unavailable",
    unavailableFormula: "Already booked",
    unavailableFullDay: "Full day unavailable on this date",
    dateUnavailable: "This date is no longer available. Please choose another date.",
    partialUnavailable: "Some trips are no longer available on this date.",
    checkingBoat: "Checking boat calendar...",
    onboardEyebrow: "On board",
    allReady: "Everything is ready",
    skipper: "Skipper",
    fishingGear: "Fishing gear",
    drinks: "Water, sodas, beers and chips",
    fullDayLunch: "Lunch for the full-day trip",
    fishingDisclaimer:
      "Fishing is still fishing: no catch can be guaranteed, but we do everything we can to maximize your chances.",
    participants: "Participants",
    participantsText:
      "From 1 to 4 people included. Children count as one person and are accepted from 8 years old.",
    moreThanFour:
      "Would you like to come with more than 4 people? Contact us for a custom request.",
    childrenOk: "I confirm that all participants are at least 8 years old.",
    manager: "Main contact",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    whatsappLabel: "Chat on WhatsApp",
    activityLabel: "Fishing trip",
    totalBoat: "Boat total",
    reservationSaved: "Booking saved. Redirecting to PayZen...",
    errors: {
      loadBoatCalendar: "Unable to load the boat calendar.",
      chooseDate: "Choose a trip date.",
      slotReserved:
        "This slot has just been booked. Please choose another date or trip.",
      onlineLimit: "Online booking is limited to 4 people.",
      minimumOne: "Enter at least 1 person.",
      firstName: "Enter the main contact's first name.",
      lastName: "Enter the main contact's last name.",
      email: "Enter the main contact's email.",
      phone: "Enter the main contact's phone number.",
      children: "Confirm that children are at least 8 years old.",
      saveReservation: "Unable to save the booking.",
      preparePayment: "Error while preparing payment.",
    },
    payment: {
      fullPaymentEyebrow: "Full payment",
      depositTitle: "Book with a deposit",
      depositButton: "Book with deposit",
      depositDescription: "The balance will be paid on the day of your trip.",
      fullTitle: "Pay in full",
      fullButton: "Pay in full",
      fullDescription: "No balance to pay on the day of the trip.",
      reassuranceTitle: "Book with peace of mind",
      weatherIntro: "In case of weather-related cancellation:",
      freeReschedule: "free rescheduling of your trip",
      refund: "or refund of your payment",
      bankFees:
        "Only bank fees related to secure payment (3%) remain at the customer's charge.",
    },
  },
} as const;
