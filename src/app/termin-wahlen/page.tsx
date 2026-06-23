"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarPicker from "@/components/CalendarPicker";
import type { BookingFormData } from "@/lib/types";

export default function TerminWahlen() {
  const router = useRouter();
  const [formData, setFormData] = useState<BookingFormData | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("bookingForm");
    if (!stored) {
      router.replace("/");
      return;
    }
    setFormData(JSON.parse(stored));
  }, [router]);

  async function handleBook() {
    if (!formData || !selectedDateTime) return;
    setBooking(true);
    setError("");

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: selectedDateTime,
          attendee: {
            name: formData.name,
            email: formData.email,
            timeZone: "Europe/Berlin",
            telefon: formData.telefon,
          },
          metadata: {
            fahrzeugmarke: formData.vehicle.marke,
            fahrzeugmodell: formData.vehicle.modell,
            kennzeichen: formData.vehicle.kennzeichen,
            baujahr: formData.vehicle.baujahr,
            bilder: formData.imageUrls.join(","),
            notizen: formData.notizen,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Buchung fehlgeschlagen");

      sessionStorage.removeItem("bookingForm");
      const uid = data?.data?.uid || "";
      const link = data?.terminLink || "";
      router.push(`/bestaetigung?uid=${uid}&link=${encodeURIComponent(link)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBooking(false);
    }
  }

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Termin auswählen</h1>
          <p className="text-gray-600 mt-2">
            Wählen Sie einen freien Termin für Ihre Autoaufbereitung
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-100 text-green-700">
              ✓
            </div>
            <span className="text-sm font-medium text-green-700">
              Fahrzeugdaten & Bilder
            </span>
            <div className="flex-1 h-px bg-green-300 mx-3" />
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">
              2
            </div>
            <span className="text-sm font-medium text-blue-600">
              Termin wählen
            </span>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Fahrzeug:</span> {formData.vehicle.marke}{" "}
              {formData.vehicle.modell} ({formData.vehicle.kennzeichen})
            </p>
            <p>
              <span className="font-medium">Kunde:</span> {formData.name} (
              {formData.email})
            </p>
            {formData.imageUrls.length > 0 && (
              <p>
                <span className="font-medium">Bilder:</span>{" "}
                {formData.imageUrls.length} hochgeladen
              </p>
            )}
          </div>

          <CalendarPicker
            onSelect={setSelectedDateTime}
            selected={selectedDateTime}
          />

          {selectedDateTime && (
            <button
              type="button"
              disabled={booking}
              onClick={handleBook}
              className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
            >
              {booking ? "Buchung läuft..." : "Buchung abschließen"}
            </button>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-3 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
