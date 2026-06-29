"use client";

import Image from "next/image";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BookingCardProps {
  booking: {
    id: number;
    uid: string;
    start: string;
    status: string;
    attendees: { name: string; email: string; phoneNumber?: string }[];
    metadata?: Record<string, string>;
    bookingFieldsResponses?: Record<string, string>;
  };
}

export default function AdminBookingCard({ booking }: BookingCardProps) {
  const meta = booking.metadata || {};
  const attendee = booking.attendees?.[0];
  const bilderStr = meta.bilder || "";
  const bilder = bilderStr ? bilderStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      accepted: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {attendee?.name || "Unbekannt"}
          </h3>
          <p className="text-sm text-gray-500">{attendee?.email}</p>
          {attendee?.phoneNumber && (
            <p className="text-sm text-gray-500">Tel: {attendee.phoneNumber}</p>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge(booking.status)}`}
        >
          {booking.status === "accepted"
            ? "Bestätigt"
            : booking.status === "pending"
              ? "Unbestätigt"
              : booking.status === "cancelled"
                ? "Storniert"
                : booking.status}
        </span>
      </div>

      <div className="text-sm text-gray-700">
        <p>
          <span className="font-medium">Termin:</span>{" "}
          {format(new Date(booking.start), "dd.MM.yyyy HH:mm", { locale: de })}
        </p>
        <p>
          <span className="font-medium">Buchungs-ID:</span> {booking.uid.slice(0, 8)}...
        </p>
      </div>

      {meta.service && (
        <div className="text-sm">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
            {meta.service}
          </span>
        </div>
      )}

      {(meta.fahrzeugmarke || meta.fahrzeugmodell) && (
        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">Fahrzeug</p>
          <p>
            {meta.fahrzeugmarke} {meta.fahrzeugmodell}
          </p>
          {meta.kennzeichen && <p>Kennzeichen: {meta.kennzeichen}</p>}
          {meta.baujahr && <p>Baujahr: {meta.baujahr}</p>}
          {meta.treibstoff && <p>Treibstoff: {meta.treibstoff}</p>}
          {meta.kilometerstand && <p>Kilometerstand: {meta.kilometerstand}</p>}
        </div>
      )}

      {meta.schadensbeschreibung && (
        <div className="text-sm text-gray-700">
          <p className="font-medium">Schadensbeschreibung</p>
          <p className="text-gray-600">{meta.schadensbeschreibung}</p>
        </div>
      )}

      {meta.notizen && (
        <div className="text-sm text-gray-700">
          <p className="font-medium">Notizen</p>
          <p className="text-gray-600">{meta.notizen}</p>
        </div>
      )}

      {bilder.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Schadensbilder ({bilder.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bilder.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 block"
              >
                <Image
                  src={url}
                  alt={`Schaden ${i + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                  sizes="200px"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
