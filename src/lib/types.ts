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
  services: string[];
  treibstoff: string;
  kilometerstand: string;
  schadensbeschreibung: string;
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

export const CAR_BRANDS = [
  "Alfa Romeo", "Alpina", "Alpine", "Aston Martin", "Audi", "Bentley",
  "BMW", "Bugatti", "Cadillac", "Chevrolet", "Citroën", "Cupra", "Dacia",
  "DS", "Ferrari", "Fiat", "Ford", "Honda", "Hyundai", "Infiniti", "Isuzu",
  "Jaguar", "Jeep", "Kia", "Lada", "Lamborghini", "Land Rover", "Lexus",
  "Lotus", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mini",
  "Mitsubishi", "Nissan", "Opel", "Peugeot", "Polestar", "Porsche",
  "Renault", "Rolls-Royce", "Seat", "Skoda", "Smart", "SsangYong",
  "Subaru", "Suzuki", "Tesla", "Toyota", "Volvo", "VW",
];

export interface ServiceInfo {
  name: string;
  price: string;
  description: string;
}

export const SERVICES: ServiceInfo[] = [
  {
    name: "Dellen & Beulen Beseitigung",
    price: "ab 79 €",
    description: "Fachgerechte Ausbeulung von Hagel-, Park-, und Türschäden – ohne Lackierung (Dellendrücken).",
  },
  {
    name: "Lackschäden Beseitigung",
    price: "ab 109 €",
    description: "Ausbesserung von Kratzern, Steinschlägen und Lackabplatzern – inklusive Farbabstimmung.",
  },
  {
    name: "Felgenservice",
    price: "ab 69 €",
    description: "Aufbereitung, Ausbesserung von Kratzern und Bordsteinschäden an Alu- und Stahlfelgen.",
  },
  {
    name: "Leasing Return Vorbereitung",
    price: "nach Aufwand",
    description: "Professionelle Aufbereitung für die fristgerechte Rückgabe – Schadensfrei und leasingsicher.",
  },
];

export const SERVICE_NAMES = SERVICES.map((s) => s.name);

export const FUEL_TYPES = [
  "Benzin", "Diesel", "Diesel-Hybrid", "Benzin-Hybrid",
];

export const MILEAGE_OPTIONS = [
  "bis 25.000 km", "bis 50.000 km", "bis 75.000 km", "bis 100.000 km",
  "bis 125.000 km", "bis 150.000 km", "bis 175.000 km", "bis 200.000 km",
  "bis 225.000 km", "bis 250.000 km", "bis 275.000 km", "bis 300.000 km",
  "über 300.000 km",
];
