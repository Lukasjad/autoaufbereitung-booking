"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import {
  CAR_BRANDS,
  SERVICES,
  SERVICE_NAMES,
  FUEL_TYPES,
  MILEAGE_OPTIONS,
} from "@/lib/types";

const KENNZEICHEN_PATTERN = /^[A-Za-zÄÖÜäöü]{1,3}$/;
const KENNZEICHEN_BEZEICHNER_PATTERN = /^[A-Za-zÄÖÜäöü]{1,2}$/;
const KENNZEICHEN_ZIFFERN_PATTERN = /^\d{1,4}$/;

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    telefon: "",
    marke: "",
    modell: "",
    kennzeichenPrefix: "",
    kennzeichenBuchstaben: "",
    kennzeichenZiffern: "",
    baujahr: "",
    notizen: "",
    services: [] as string[],
    treibstoff: "",
    kilometerstand: "",
    schadensbeschreibung: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [dsgvoConsent, setDsgvoConsent] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleService(s: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((v) => v !== s)
        : [...prev.services, s],
    }));
  }

  function handleKennzeichenChange(field: "prefix" | "buchstaben" | "ziffern", raw: string) {
    const key: Record<string, string> = {
      prefix: "kennzeichenPrefix",
      buchstaben: "kennzeichenBuchstaben",
      ziffern: "kennzeichenZiffern",
    };
    const upper = raw.replace(/[^A-Za-zÄÖÜäöü0-9]/g, "").toUpperCase();
    if (field === "ziffern") {
      const digits = upper.replace(/[^0-9]/g, "").slice(0, 4);
      update(key[field], digits);
    } else {
      const letters = upper.replace(/[^A-ZÄÖÜ]/g, "").slice(0, field === "prefix" ? 3 : 2);
      update(key[field], letters);
    }
  }

  function getKennzeichen(): string {
    const parts = [
      form.kennzeichenPrefix,
      form.kennzeichenBuchstaben,
      form.kennzeichenZiffern,
    ].filter(Boolean);
    return parts.length === 3 ? parts.join(" ") : "";
  }

  function handleNext() {
    if (!form.name || !form.email || !form.marke || form.services.length === 0 || !dsgvoConsent)
      return;
    const bookingData = {
      name: form.name,
      email: form.email,
      telefon: form.telefon,
      vehicle: {
        marke: form.marke,
        modell: form.modell,
        kennzeichen: getKennzeichen(),
        baujahr: form.baujahr,
      },
      imageUrls: images,
      notizen: form.notizen,
      services: form.services,
      treibstoff: form.treibstoff,
      kilometerstand: form.kilometerstand,
      schadensbeschreibung: form.schadensbeschreibung,
    };
    sessionStorage.setItem("bookingForm", JSON.stringify(bookingData));
    router.push("/termin-wahlen");
  }

  const isValid =
    form.name.trim() &&
    form.email.trim() &&
    form.marke.trim() &&
    form.services.length > 0 &&
    dsgvoConsent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Autoaufbereitung buchen
          </h1>
          <p className="text-gray-600 mt-2">
            Wählen Sie Ihren Service und vereinbaren Sie einen Termin
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">1</div>
            <span className="text-sm font-medium text-blue-600">Angaben</span>
            <div className="flex-1 h-px bg-gray-200 mx-3" />
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-400">2</div>
            <span className="text-sm font-medium text-gray-400">Termin wählen</span>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Serviceauswahl * (mehrere möglich)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {SERVICES.map((s) => {
                const active = form.services.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleService(s.name)}
                    className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          active
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {active && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-sm text-blue-600 font-semibold whitespace-nowrap">
                            {s.price}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Vehicle Brand */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Automobilhersteller *
            </label>
            <div className="relative">
              <select
                value={form.marke}
                onChange={(e) => update("marke", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="">Hersteller auswählen...</option>
                {CAR_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Model + License plate (3 fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genaue Modellbezeichnung
              </label>
              <input
                type="text"
                value={form.modell}
                onChange={(e) => update("modell", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="z.B. C220, GTI, X5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kennzeichen
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={form.kennzeichenPrefix}
                  onChange={(e) => handleKennzeichenChange("prefix", e.target.value)}
                  className="w-16 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center uppercase font-mono"
                  placeholder="AB"
                  maxLength={3}
                />
                <span className="text-gray-400 text-lg">-</span>
                <input
                  type="text"
                  value={form.kennzeichenBuchstaben}
                  onChange={(e) => handleKennzeichenChange("buchstaben", e.target.value)}
                  className="w-16 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center uppercase font-mono"
                  placeholder="CD"
                  maxLength={2}
                />
                <span className="text-gray-400 text-lg">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.kennzeichenZiffern}
                  onChange={(e) => handleKennzeichenChange("ziffern", e.target.value)}
                  className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center font-mono"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Stadtkürzel – Buchstaben – Ziffern (z.B. AB CD 123)
              </p>
            </div>
          </div>

          {/* Fuel + Mileage + Build year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treibstoff
              </label>
              <select
                value={form.treibstoff}
                onChange={(e) => update("treibstoff", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">—</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilometerstand
              </label>
              <select
                value={form.kilometerstand}
                onChange={(e) => update("kilometerstand", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">—</option>
                {MILEAGE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Baujahr
              </label>
              <input
                type="text"
                value={form.baujahr}
                onChange={(e) => update("baujahr", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="2022"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Damage description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schadensbeschreibung
            </label>
            <textarea
              value={form.schadensbeschreibung}
              onChange={(e) => update("schadensbeschreibung", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Beschreiben Sie den Schaden oder die gewünschte Leistung..."
            />
          </div>

          <ImageUpload images={images} onImagesChange={setImages} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen / Besonderheiten
            </label>
            <textarea
              value={form.notizen}
              onChange={(e) => update("notizen", e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Weitere Anmerkungen..."
            />
          </div>

          <hr className="border-gray-200" />

          {/* Personal data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vor- & Nachname *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="max@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon / Handynummer
            </label>
            <input
              type="tel"
              value={form.telefon}
              onChange={(e) => update("telefon", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="+49 123 456789"
            />
          </div>

          <hr className="border-gray-200" />

          {/* DSGVO Consent */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setDsgvoConsent(!dsgvoConsent)}
              role="checkbox"
              aria-checked={dsgvoConsent}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                dsgvoConsent
                  ? "border-blue-600 bg-blue-600"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
            >
              {dsgvoConsent && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="text-sm text-gray-600 leading-relaxed">
              Ich stimme zu, dass meine Angaben zur Terminvereinbarung verarbeitet werden.{" "}
              <Link href="/datenschutz" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
                Datenschutzerklärung
              </Link>
            </span>
          </label>

          <button
            type="button"
            disabled={!isValid}
            onClick={handleNext}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Weiter zum Termin auswählen
          </button>
        </div>
      </div>
    </div>
  );
}
