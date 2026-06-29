import { redirect } from "next/navigation";
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

  const paramsStr = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
  redirect(`/termin/${uid}${paramsStr}`);
}
