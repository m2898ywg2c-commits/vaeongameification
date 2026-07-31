import Disclaimer, { DISCLAIMER_VERSION } from "../Disclaimer";
import { BrandLockup } from "../Brand";

export const metadata = {
  title: "Training and AI disclaimer | Vaeon Fitness",
  description: "How Vaeon's guidance works, and what it is not.",
};

// Standalone page so the signup tick box has something to link to, and so the
// disclaimer has a stable URL that can be pointed at from a footer, an email or
// an app store listing.
export default function DisclaimerPage() {
  return (
    <main className="min-h-screen text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <BrandLockup size={26} full />
        </div>

        <h1 className="font-display text-3xl font-normal mb-2">Training and AI disclaimer</h1>
        <p className="text-xs text-gray-500 mb-8">Version {DISCLAIMER_VERSION}</p>

        <Disclaimer />

        <div className="mt-10 pt-6 border-t border-brand-line">
          <a href="/dashboard" className="text-sm underline" style={{ color: "#22D3EE" }}>
            Back to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
