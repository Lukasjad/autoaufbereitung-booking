import Link from "next/link";
import { getAllBookings, getBookingByUid } from "@/lib/cal";

export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ metaId: string }>;
}) {
  const { metaId } = await params;
  const data = await getAllBookings();
  const bookings = data?.data || data?.bookings || [];
  const booking = bookings.find(
    (b: any) => b.metadata?.buchung_link_id === metaId
  );

  let accessToken = "";
  let uid = booking?.uid || "";

  if (booking?.uid) {
    try {
      const full = await getBookingByUid(booking.uid);
      const meta = full?.data?.metadata || {};
      accessToken = meta.access_token || meta.accessToken || "";
    } catch {
      // fallback
    }
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link nicht gefunden
          </h1>
          <p className="text-gray-600">
            Der angeforderte Buchungslink ist ungültig oder die Buchung existiert
            nicht mehr.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Buchung gefunden
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Wähle, wie du fortfahren möchtest:
        </p>

        <div className="space-y-3">
          <Link
            href={`/termin/${uid}?token=${encodeURIComponent(accessToken)}`}
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kundenansicht (Chat & Bilder)
          </Link>

          <Link
            href={`/admin/${uid}`}
            className="block w-full py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Adminbereich
          </Link>
        </div>

        {uid && (
          <p className="text-xs text-gray-400 mt-6">
            Buchung: {uid.slice(0, 8)}
          </p>
        )}
      </div>
    </div>
  );
}
