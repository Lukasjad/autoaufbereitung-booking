"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Image from "next/image";
import { xhrUpload } from "@/lib/xhr-upload";

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
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const stagedFilesRef = useRef<File[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session-Token beim Mount laden und verifizieren
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_session");
    if (!stored) { setLoginLoading(false); return; }

    setSessionToken(stored);
    setLoginLoading(true);

    fetch(`/api/bookings/${uid}`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          sessionStorage.removeItem("admin_session");
          return;
        }
        const data = await r.json();
        if (data?.data) {
          setBooking(data.data);
          setLoggedIn(true);
          fetch(`/api/bookings/${uid}/messages`, {
            headers: { Authorization: `Bearer ${stored}` },
          })
            .then(async (r2) => { const d = await r2.json(); if (d?.data) setMessages(d.data); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoginLoading(false));
  }, [uid]);

  async function refreshBooking() {
    try {
      const res = await fetch(`/api/bookings/${uid}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setBooking(data.data);
      }
    } catch {}
  }

  async function handleStatusChange(newStatus: "ACCEPTED" | "REJECTED") {
    setStatusUpdating(newStatus);
    try {
      const res = await fetch(`/api/bookings/${uid}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await refreshBooking();
      } else {
        const err = await res.json();
        alert(err.error || "Fehler beim Aktualisieren des Status");
      }
    } catch {
      alert("Fehler beim Aktualisieren des Status");
    } finally {
      setStatusUpdating(null);
    }
  }

  // Polling für neue Nachrichten
  useEffect(() => {
    if (!sessionToken || !loggedIn) return;
    const iv = setInterval(() => {
      fetch(`/api/bookings/${uid}/messages`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then(async (r) => { const d = await r.json(); if (d?.data) setMessages(d.data); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, [uid, sessionToken, loggedIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        alert("Falsches Passwort");
        return;
      }
      const { token } = await res.json();
      setSessionToken(token);
      sessionStorage.setItem("admin_session", token);

      const bookingRes = await fetch(`/api/bookings/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bookingRes.ok) {
        const data = await bookingRes.json();
        if (data?.data) setBooking(data.data);
      }
      setLoggedIn(true);
    } catch {
      alert("Fehler beim Login");
    } finally {
      setLoginLoading(false);
    }
  }

  async function sendMessage() {
    const msg = inputText.trim();
    if (!msg && stagedFilesRef.current.length === 0) return;
    setSending(true);
    try {
      let imageUrls: string[] = [];
      if (stagedFilesRef.current.length > 0) {
        setUploading(true);
        const res = await xhrUpload("damageImage", stagedFilesRef.current);
        imageUrls = res.map((f) => f.ufsUrl ?? f.url).filter(Boolean);
        setUploading(false);
      }
      const body: Record<string, any> = {};
      if (msg) body.text = msg;
      if (imageUrls.length > 0) body.imageUrls = imageUrls;
      const res = await fetch(`/api/bookings/${uid}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setInputText("");
        stagedFilesRef.current = [];
        setStagedImages([]);
        inputRef.current?.blur();
        fetch(`/api/bookings/${uid}/messages`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
          .then(async (r) => { const d = await r.json(); if (d?.data) setMessages(d.data); })
          .catch(() => {});
      } else {
        const errBody = await res.json().catch(() => ({ error: res.statusText || `Fehler ${res.status}` }));
        throw new Error(errBody.error || `Serverfehler (${res.status})`);
      }
    } catch (err) {
      console.error("Send error:", err);
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
      alert(`Fehler beim Senden: ${msg}`);
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function handleImageSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const neue = Array.from(files);
    stagedFilesRef.current = [...stagedFilesRef.current, ...neue];
    setStagedImages(stagedFilesRef.current.map((f) => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeStagedImage(index: number) {
    const url = stagedImages[index];
    if (url) URL.revokeObjectURL(url);
    stagedFilesRef.current = stagedFilesRef.current.filter((_, i) => i !== index);
    setStagedImages(stagedFilesRef.current.map((f) => URL.createObjectURL(f)));
  }

  if (!password || !loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Kundenbereich */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Kundenlogin
            </h2>
            {tokenParam ? (
              <a
                href={`/termin/${uid}?token=${encodeURIComponent(tokenParam)}`}
                className="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg text-center hover:bg-green-700 transition-colors"
              >
                Zur Buchungsseite →
              </a>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Kein Zugangstoken vorhanden.
              </p>
            )}
          </div>

          {/* Admin Login */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Admin Login
            </h2>
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
  const accessToken = meta.access_token || meta.accessToken || "";
  const attendee = booking.attendees?.[0];
  const bilderStr = meta.bilder || "";
  const bilder = bilderStr ? bilderStr.split(",").map((u) => u.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-4">
          {accessToken && (
            <a
              href={`/termin/${booking.uid}?token=${encodeURIComponent(accessToken)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
            >
              Kundenansicht öffnen ↗
            </a>
          )}
        </div>

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
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                  booking.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : booking.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : booking.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {booking.status === "accepted"
                    ? "Bestätigt"
                    : booking.status === "pending"
                    ? "Unbestätigt"
                    : booking.status === "rejected"
                    ? "Abgelehnt"
                    : booking.status}
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

              {booking.status === "pending" && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleStatusChange("ACCEPTED")}
                    disabled={statusUpdating !== null}
                    className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-green-700 transition-colors"
                  >
                    {statusUpdating === "ACCEPTED" ? "Wird bestätigt..." : "Annehmen"}
                  </button>
                  <button
                    onClick={() => handleStatusChange("REJECTED")}
                    disabled={statusUpdating !== null}
                    className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors"
                  >
                    {statusUpdating === "REJECTED" ? "Wird abgelehnt..." : "Ablehnen"}
                  </button>
                </div>
              )}

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
                className="px-5 py-3 border-t border-gray-100 space-y-2"
              >
                {stagedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {stagedImages.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt={`Bild ${i + 1}`}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeStagedImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Nachricht eingeben..."
                    disabled={sending}
                    rows={1}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && stagedImages.length === 0) || sending || uploading}
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  >
                    {uploading ? "Upload..." : sending ? "..." : "Senden"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40"
                  >
                    + Bilder
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageSelect(e.target.files)}
                    className="hidden"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
