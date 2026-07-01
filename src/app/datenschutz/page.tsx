import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Autoaufbereitung",
};

export default function DatenschutzPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Datenschutzerklärung</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900 mt-6">1. Verantwortlicher</h2>
        <p>
          ELB Smart Repair<br />
          [Name des Inhabers]<br />
          [Straße Hausnr.]<br />
          [PLZ Stadt]<br />
          E-Mail: info@elb-smart-repair.de
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">
          2. Erhebung und Verarbeitung personenbezogener Daten
        </h2>
        <p>
          Wir erheben und verarbeiten personenbezogene Daten ausschließlich zum Zweck der
          Terminvereinbarung und -abwicklung. Dies umfasst:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name</li>
          <li>E-Mail-Adresse</li>
          <li>Telefonnummer</li>
          <li>Fahrzeugmarke und -modell</li>
          <li>Kennzeichen (freiwillig)</li>
          <li>Sonstige von Ihnen mitgeteilte Informationen (z.B. Schadensbeschreibung, Bilder)</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">3. Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
          (Vertragsanbahnung / Vertragserfüllung) sowie Ihrer Einwilligung gemäß Art. 6 Abs. 1
          lit. a DSGVO.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">4. Datenweitergabe</h2>
        <p>
          Eine Weitergabe Ihrer Daten an Dritte erfolgt nur, soweit dies für die
          Terminabwicklung erforderlich ist:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cal.com – Terminverwaltung (USA, Privacy-Shield)</li>
          <li>SendGrid – E-Mail-Versand (USA, Privacy-Shield)</li>
          <li>Uploadthing – Bild-Upload (USA, Privacy-Shield)</li>
          <li>Supabase – Chat-Nachrichten (Deutschland)</li>
        </ul>
        <p>Mit allen Dienstleistern bestehen Auftragsverarbeitungsverträge (AVV).</p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">5. Speicherdauer</h2>
        <p>
          Wir speichern Ihre Daten für die Dauer der Terminabwicklung sowie darüber hinaus für
          gesetzliche Aufbewahrungsfristen (max. 3 Jahre nach Abschluss). Abgeschlossene oder
          stornierte Buchungen werden nach Ablauf der Frist automatisch anonymisiert.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">
          6. Ihre Rechte
        </h2>
        <p>
          Sie haben jederzeit das Recht auf:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerruf Ihrer Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
        </ul>
        <p>
          Wenden Sie sich dazu an: <strong>info@elb-smart-repair.de</strong>
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">7. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren, wenn Sie der
          Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO
          verstößt.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-6">8. Kein Einsatz von Cookies</h2>
        <p>
          Diese Webseite verwendet keine Cookies. Es kommt ausschließlich der
          <strong> sessionStorage </strong>
          des Browsers zum Einsatz, der technisch notwendige Daten wie den Buchungsstatus
          während einer Sitzung zwischenspeichert. Diese Daten werden nach Schließen des
          Browser-Tabs automatisch gelöscht.
        </p>

        <p className="text-xs text-gray-400 mt-8">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </p>
      </div>
    </div>
  );
}
