import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | Autoaufbereitung",
};

export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Impressum</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          <strong>ELB Smart Repair</strong><br />
          [Name des Inhabers]<br />
          [Straße Hausnr.]<br />
          [PLZ Stadt]
        </p>
        <p>
          <strong>Kontakt</strong><br />
          E-Mail: info@elb-smart-repair.de<br />
          Telefon: 040 / 123456789
        </p>
        <p>
          <strong>Umsatzsteuer-ID</strong><br />
          DE123456789
        </p>
        <p>
          <strong>Verantwortlich für den Inhalt</strong><br />
          [Name], [Straße Hausnr.], [PLZ Stadt]
        </p>
        <p className="text-xs text-gray-400 mt-8">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </p>
      </div>
    </div>
  );
}
