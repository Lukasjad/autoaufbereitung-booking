"use client";

import { useState, useEffect } from "react";
import AdminBookingCard from "@/components/AdminBookingCard";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) throw new Error("Falsches Passwort");
      const data = await res.json();
      const list = data?.data || data?.bookings || [];
      setBookings(Array.isArray(list) ? list : []);
      setLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${password}` },
      });
      const data = await res.json();
      const list = data?.data || data?.bookings || [];
      setBookings(Array.isArray(list) ? list : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loggedIn) loadBookings();
  }, [loggedIn]);

  if (!loggedIn) {
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
              disabled={!password || loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {loading ? "Lädt..." : "Einloggen"}
            </button>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Buchungsübersicht
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {bookings.length} Buchung{bookings.length !== 1 ? "en" : ""}
            </p>
          </div>
          <button
            onClick={loadBookings}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Aktualisieren
          </button>
        </div>

        {loading && (
          <p className="text-center text-gray-500 py-12">
            Buchungen werden geladen...
          </p>
        )}

        {!loading && bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Noch keine Buchungen vorhanden.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {bookings.map((b) => (
            <AdminBookingCard key={b.id || b.uid} booking={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
