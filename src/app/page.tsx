"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    telefon: "",
    marke: "",
    modell: "",
    kennzeichen: "",
    baujahr: "",
    notizen: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNext() {
    if (!form.name || !form.email || !form.marke) return;
    const bookingData = {
      name: form.name,
      email: form.email,
      telefon: form.telefon,
      vehicle: {
        marke: form.marke,
        modell: form.modell,
        kennzeichen: form.kennzeichen,
        baujahr: form.baujahr,
      },
      imageUrls: images,
      notizen: form.notizen,
    };
    sessionStorage.setItem("bookingForm", JSON.stringify(bookingData));
    router.push("/termin-wahlen");
  }

  const isValid =
    form.name.trim() &&
    form.email.trim() &&
    form.marke.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Autoaufbereitung buchen
          </h1>
          <p className="text-gray-600 mt-2">
            Vereinbaren Sie einen Termin für Ihre Fahrzeugaufbereitung
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-8">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 1
                  ? "bg-blue-600 text-white"
                  : "bg-green-100 text-green-700"
              }`}
            >
              1
            </div>
            <span
              className={`text-sm font-medium ${
                step === 1 ? "text-blue-600" : "text-green-700"
              }`}
            >
              Fahrzeugdaten & Bilder
            </span>
            <div className="flex-1 h-px bg-gray-200 mx-3" />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              2
            </div>
            <span
              className={`text-sm font-medium ${
                step === 2 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              Termin wählen
            </span>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="max@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={form.telefon}
                onChange={(e) => update("telefon", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="+49 123 456789"
              />
            </div>

            <hr className="border-gray-200" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fahrzeugmarke *
                </label>
                <input
                  type="text"
                  value={form.marke}
                  onChange={(e) => update("marke", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="BMW"
                  list="marken"
                />
                <datalist id="marken">
                  <option value="BMW" />
                  <option value="Mercedes-Benz" />
                  <option value="Audi" />
                  <option value="Volkswagen" />
                  <option value="Porsche" />
                  <option value="Tesla" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modell
                </label>
                <input
                  type="text"
                  value={form.modell}
                  onChange={(e) => update("modell", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="X5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kennzeichen
                </label>
                <input
                  type="text"
                  value={form.kennzeichen}
                  onChange={(e) => update("kennzeichen", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="AB-CD 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Baujahr
                </label>
                <input
                  type="text"
                  value={form.baujahr}
                  onChange={(e) => update("baujahr", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="2022"
                />
              </div>
            </div>

            <ImageUpload images={images} onImagesChange={setImages} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen / Besonderheiten
              </label>
              <textarea
                value={form.notizen}
                onChange={(e) => update("notizen", e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                placeholder="z.B. Innenraumreinigung + Politur, Kratzer an der Tür..."
              />
            </div>

            <button
              type="button"
              disabled={!isValid || saving}
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              Weiter zum Termin auswählen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
