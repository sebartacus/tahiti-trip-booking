type WhatsAppChannelCardProps = {
  locale?: "fr" | "en";
};

const channelUrl = "https://whatsapp.com/channel/0029Vb8Dz9dCnA7n8C4LnB3v";

const labels = {
  fr: {
    title: "📲 Rejoignez notre chaîne WhatsApp",
    text: "Recevez les disponibilités de dernière minute, les photos des sorties et les actualités Tahiti Trip.",
    button: "Ouvrir la chaîne",
  },
  en: {
    title: "📲 Join our WhatsApp Channel",
    text: "Get last-minute availability, trip photos and Tahiti Trip updates.",
    button: "Open channel",
  },
} as const;

export function WhatsAppChannelCard({
  locale = "fr",
}: WhatsAppChannelCardProps) {
  const t = labels[locale];

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950 shadow-[0_16px_38px_rgba(16,185,129,0.10)] md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 className="text-xl font-black leading-tight md:text-2xl">
            {t.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-emerald-900 md:text-base">
            {t.text}
          </p>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(37,211,102,0.22)] transition hover:-translate-y-0.5 hover:bg-[#20bd5a]"
        >
          {t.button}
        </a>
      </div>
    </section>
  );
}
