"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Image from "next/image";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: "/api/uploadthing",
});

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
  attendees: { name: string; email: string }[];
  metadata: Record<string, string>;
  bookingFieldsResponses: Record<string, string>;
}

function TerminDetailContent() {
  const { uid } = useParams<{ uid: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const legacy = searchParams.get("legacy") === "1";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uid) {
      setError("Keine Buchungs-ID");
      setLoading(false);
      return;
    }
    // Token aus sessionStorage falls nicht in URL (z.B. nach Refresh)
    const tkn = token || sessionStorage.getItem(`termin_token_${uid}`) || "";
    if (!tkn && !legacy) {
      setError("Fehlender Zugriffstoken");
      setLoading(false);
      return;
    }
    const params = tkn
      ? `token=${encodeURIComponent(tkn)}`
      : "legacy=1";
    fetch(`/api/bookings/${uid}?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401) throw new Error("Ungültiger oder abgelaufener Zugriff");
        const b = data?.data;
        if (!b) throw new Error("Buchung nicht gefunden");
        setBooking(b);
        // Token in sessionStorage sichern (für Refresh-Sicherheit)
        if (tkn) {
          sessionStorage.setItem(`termin_token_${uid}`, tkn);
        }
        // Token aus der URL entfernen (browser history, Referrer, Server-Logs)
        if (token && window.location.search.includes("token=")) {
          window.history.replaceState({}, "", `/termin/${uid}`);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [uid, token, legacy]);

  function activeToken(): string {
    return token || sessionStorage.getItem(`termin_token_${uid}`) || "";
  }

  function loadMessages() {
    const t = activeToken();
    if (!uid || !t) return;
    fetch(`/api/bookings/${uid}/messages?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const data = await r.json();
        if (data?.data) setMessages(data.data);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!booking || !token) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [booking, token, uid]);

  async function sendMessage(text?: string) {
    const t = activeToken();
    const msg = text ?? inputText.trim();
    if (!msg || !t) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${uid}/messages?token=${encodeURIComponent(t)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
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

  async function handleImageUpload(files: FileList | null) {
    const t = activeToken();
    if (!files || files.length === 0 || !t) return;
    setUploading(true);
    try {
      const res = await uploadFiles("damageImage", {
        files: Array.from(files),
      });
      const urls = res.map((f) => f.ufsUrl ?? f.url).filter(Boolean);
      if (urls.length > 0) {
        await fetch(`/api/bookings/${uid}/messages?token=${encodeURIComponent(t)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: urls }),
        });
        loadMessages();
      }
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
      alert(`Upload fehlgeschlagen: ${msg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Lade Buchungsdetails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-sm text-gray-500">
            Der Link ist ungültig oder die Buchung existiert nicht.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const meta = booking.metadata || {};
  const bfr = booking.bookingFieldsResponses || {};
  const attendee = booking.attendees?.[0];
  const bilderStr = meta.bilder || "";
  const bilder = bilderStr ? bilderStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Deine Buchung
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Buchung {booking.uid.slice(0, 8)}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500">Kunde</p>
                  <p className="font-medium">{attendee?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">E-Mail</p>
                  <p className="font-medium">{attendee?.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Termin</p>
                  <p className="font-medium">
                    {format(new Date(booking.start), "dd.MM.yyyy HH:mm", { locale: de })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">{booking.status}</p>
                </div>
              </div>

              {meta.service && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {meta.service}
                  </span>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="font-medium">Fahrzeug:</span> {bfr.fahrzeugmarke} {bfr.fahrzeugmodell}</p>
                <p><span className="font-medium">Kennzeichen:</span> {bfr.kennzeichen || "—"}</p>
                <p><span className="font-medium">Baujahr:</span> {meta.baujahr || "—"}</p>
                {meta.treibstoff && <p><span className="font-medium">Treibstoff:</span> {meta.treibstoff}</p>}
                {meta.kilometerstand && <p><span className="font-medium">Kilometerstand:</span> {meta.kilometerstand}</p>}
                {meta.schadensbeschreibung && <p><span className="font-medium">Schadensbeschreibung:</span> {meta.schadensbeschreibung}</p>}
                {meta.notizen && <p><span className="font-medium">Notizen:</span> {meta.notizen}</p>}
              </div>

              {bilder.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Schadensbilder ({bilder.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {bilder.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 group">
                          <Image
                            src={url}
                            alt={`Schaden ${i + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="400px"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                        <p className="text-xs text-blue-600 mt-1 truncate">
                          Bild {i + 1} öffnen →
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-[600px]">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Nachrichten</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hier kannst du Fragen stellen oder weitere Bilder hochladen
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
                    className={`flex flex-col ${msg.sender === "customer" ? "items-end" : "items-start"}`}
                  >
                    <span className={`text-[10px] mb-0.5 px-1 ${msg.sender === "customer" ? "text-blue-500" : "text-gray-400"}`}>
                      {msg.sender === "customer" ? "Du" : "Elbe Smart Repair"}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender === "customer"
                          ? "bg-blue-600 text-white"
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
                          msg.sender === "customer" ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>

              <div className="px-5 py-3 border-t border-gray-100 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
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
                </form>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
                  >
                    {uploading ? "Upload läuft..." : "+ Bilder hochladen"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TerminDetail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Lade...</p>
      </div>
    }>
      <TerminDetailContent />
    </Suspense>
  );
}
