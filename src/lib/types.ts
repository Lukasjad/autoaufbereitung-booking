export interface VehicleInfo {
  marke: string;
  modell: string;
  kennzeichen: string;
  baujahr: string;
}

export interface BookingFormData {
  name: string;
  email: string;
  telefon: string;
  vehicle: VehicleInfo;
  imageUrls: string[];
  notizen: string;
}

export interface TimeSlot {
  time: string;
  attendees: number | null;
}

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  description: string;
  start: string;
  end: string;
  status: string;
  attendees: { name: string; email: string; timeZone: string }[];
  metadata: Record<string, string>;
  bookingFieldsResponses: Record<string, string>;
}
