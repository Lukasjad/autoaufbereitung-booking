"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Image from "next/image";

interface BookingData {
  uid: string;
  start: string;
  status: string;
  attendees: { name: string; email: string }[];
  metadata: Record<string, string>;
  bookingFieldsResponses: Record<string, string>;
}

export default function TerminDetail() {
  const { uid } = useParams<{ uid: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    fetch(`/api/bookings/${uid}`)
      .then((r) => r.json())
      .then((data) => {
        const b = data?.data;
        if (!b) throw new Error("Buchung nicht gefunden");
        setBooking(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Lade Buchungsdetails...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || "Nicht gefunden"}</p>
        </div>
      </div>
    );
  }

  const meta = booking.metadata || {};
  const bfr = booking.bookingFieldsResponses || {};
  const attendee = booking.attendees?.[0];
  const bilderStr = meta.bilder || "";
  const bilder = bilderStr ? bilderStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Buchungsdetails
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Buchung {booking.uid.slice(0, 8)}...
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">Kunde</p>
              <p className="font-medium">{attendee?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">E-Mail</p>
              <p className="font-medium">{attendee?.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Termin</p>
              <p className="font-medium">
                {format(new Date(booking.start), "dd.MM.yyyy HH:mm", { locale: de })}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-medium">{booking.status}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm mb-6 space-y-1">
            <p><span className="font-medium">Fahrzeug:</span> {bfr.fahrzeugmarke} {bfr.fahrzeugmodell}</p>
            <p><span className="font-medium">Kennzeichen:</span> {bfr.kennzeichen || "—"}</p>
            <p><span className="font-medium">Baujahr:</span> {meta.baujahr || "—"}</p>
            {meta.notizen && <p><span className="font-medium">Notizen:</span> {meta.notizen}</p>}
          </div>

          {bilder.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schadensbilder ({bilder.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {bilder.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 group">
                      <Image
                        src={url}
                        alt={`Schaden ${i + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="400px"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <p className="text-xs text-blue-600 mt-1 truncate">
                      Bild {i + 1} öffnen →
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
