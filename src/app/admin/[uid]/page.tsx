"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Image from "next/image";

interface Message {
  id: number;
  booking_uid: string;
  sender: "customer" | "admin";
  text: string | null;
  image_urls: string[] | null;
  created_at: string;
  read: boolean;
}

interface BookingData {
  uid: string;
  start: string;
  status: string;
  attendees: { name: string; email: string; phoneNumber?: string }[];
  metadata: Record<string, string>;
  bookingFieldsResponses: Record<string, string>;
}

export default function AdminBookingDetail() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Session-Passwort beim Mount laden und einmalig verifizieren
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) { setLoginLoading(false); return; }

    // Passwort nur setzen (damit Login-Form nicht flackert) und
    // dann im selben Effekt gegen die API prüfen
    setPassword(stored);
    setLoginLoading(true);

    fetch(`/api/bookings/${uid}`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          sessionStorage.removeItem("admin_password");
          return; // Login-Form zeigen
        }
        const data = await r.json();
        if (data?.data) {
          setBooking(data.data);
          setLoggedIn(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoginLoading(false));
  }, [uid]);

  function loadMessages() {
    fetch(`/api/bookings/${uid}/messages`, {
      headers: { Authorization: `Bearer ${password}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (data?.data) setMessages(data.data);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!password || !loggedIn) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [uid, password, loggedIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) {
        alert("Falsches Passwort");
        return;
      }
      // Passwort gültig → Booking-Details laden
      const bookingRes = await fetch(`/api/bookings/${uid}`, {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (bookingRes.ok) {
        const data = await bookingRes.json();
        if (data?.data) setBooking(data.data);
      }
      sessionStorage.setItem("admin_password", password);
      setLoggedIn(true);
    } catch {
      alert("Fehler beim Login");
    } finally {
      setLoginLoading(false);
    }
  }

  async function sendMessage() {
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${uid}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ text: inputText.trim() }),
      });
      if (res.ok) {
        setInputText("");
        inputRef.current?.blur();
        loadMessages();
      }
    } finally {
      setSending(false);
    }
  }

  if (!password || !loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin-Passwort"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!password || loginLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {loginLoading ? "Lädt..." : "Einloggen"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Lade Buchung...</p>
      </div>
    );
  }

  const meta = booking.metadata || {};
  const attendee = booking.attendees?.[0];
  const bilderStr = meta.bilder || "";
  const bilder = bilderStr ? bilderStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 block"
        >
          ← Zurück zur Übersicht
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {attendee?.name || "Unbekannt"}
                  </h1>
                  <p className="text-sm text-gray-500">{attendee?.email}</p>
                  {attendee?.phoneNumber && (
                    <p className="text-sm text-gray-500">Tel: {attendee.phoneNumber}</p>
                  )}
                </div>
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-800">
                  {booking.status === "accepted" ? "Bestätigt" : booking.status}
                </span>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">Termin:</span>{" "}
                  {format(new Date(booking.start), "dd.MM.yyyy HH:mm", { locale: de })}
                </p>
                <p>
                  <span className="font-medium">Buchungs-ID:</span> {booking.uid}
                </p>
              </div>

              {meta.service && (
                <div className="mt-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {meta.service}
                  </span>
                </div>
              )}

              <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                {(meta.fahrzeugmarke || meta.fahrzeugmodell) && (
                  <p>
                    <span className="font-medium">Fahrzeug:</span>{" "}
                    {meta.fahrzeugmarke} {meta.fahrzeugmodell}
                  </p>
                )}
                {meta.kennzeichen && (
                  <p>
                    <span className="font-medium">Kennzeichen:</span> {meta.kennzeichen}
                  </p>
                )}
                {meta.baujahr && (
                  <p>
                    <span className="font-medium">Baujahr:</span> {meta.baujahr}
                  </p>
                )}
                {meta.treibstoff && (
                  <p>
                    <span className="font-medium">Treibstoff:</span> {meta.treibstoff}
                  </p>
                )}
                {meta.kilometerstand && (
                  <p>
                    <span className="font-medium">Kilometerstand:</span> {meta.kilometerstand}
                  </p>
                )}
                {meta.schadensbeschreibung && (
                  <p>
                    <span className="font-medium">Schadensbeschreibung:</span>{" "}
                    {meta.schadensbeschreibung}
                  </p>
                )}
                {meta.notizen && (
                  <p>
                    <span className="font-medium">Notizen:</span> {meta.notizen}
                  </p>
                )}
              </div>

              {bilder.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Schadensbilder ({bilder.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
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
                          alt={`Bild ${i + 1}`}
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
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Nachrichten</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {messages.length} Nachrichten
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-gray-400 text-center pt-8">
                    Noch keine Nachrichten.
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}
                  >
                    <span className={`text-[10px] mb-0.5 px-1 ${msg.sender === "admin" ? "text-emerald-500" : "text-gray-400"}`}>
                      {msg.sender === "admin" ? "Du" : attendee?.name || "Kunde"}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender === "admin"
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.text && (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}
                      {msg.image_urls && msg.image_urls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.image_urls.map((url, i) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-black/10">
                                <Image
                                  src={url}
                                  alt={`Bild ${i + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="128px"
                                />
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender === "admin" ? "text-emerald-200" : "text-gray-400"
                        }`}
                      >
                        {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="px-5 py-3 border-t border-gray-100"
              >
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nachricht eingeben..."
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  >
                    {sending ? "..." : "Senden"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
