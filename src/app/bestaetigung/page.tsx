"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function BestaetigungContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const link = searchParams.get("link");

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Buchung bestätigt!
      </h1>
      <p className="text-gray-600 mb-6">
        Vielen Dank für Ihre Buchung. Sie erhalten in Kürze eine
        Bestätigungs-E-Mail mit allen Details.
      </p>

      {uid && (
        <p className="text-sm text-gray-500 mb-4">
          Buchungsnummer: <span className="font-mono">{uid.slice(0, 8)}</span>
        </p>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-4 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm truncate"
        >
          📷 Schadensbilder ansehen
        </a>
      )}

      <Link
        href="/"
        className="inline-block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Zurück zur Buchungsseite
      </Link>
    </div>
  );
}

export default function Bestaetigung() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <p className="text-gray-500">Lade Bestätigung...</p>
          </div>
        }
      >
        <BestaetigungContent />
      </Suspense>
    </div>
  );
}
