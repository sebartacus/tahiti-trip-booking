import Script from "next/script";

const ELFSIGHT_SCRIPT_ID = "elfsight-platform";
const GOOGLE_REVIEWS_WIDGET_ID = "4f0dbd66-fb21-4560-b82b-85d382c39f82";

export function GoogleReviews() {
  return (
    <div className="w-full min-w-0">
      <Script
        id={ELFSIGHT_SCRIPT_ID}
        src="https://elfsightcdn.com/platform.js"
        strategy="afterInteractive"
      />
      <div
        className={`elfsight-app-${GOOGLE_REVIEWS_WIDGET_ID} w-full`}
        data-elfsight-app-lazy
      />
    </div>
  );
}
