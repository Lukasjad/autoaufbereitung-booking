import { redirect } from "next/navigation";
import { getAllBookings } from "@/lib/cal";

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

  if (booking?.uid) {
    const accessToken = booking.metadata?.access_token || "";
    const query = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
    redirect(`/termin/${booking.uid}${query}`);
  }

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
