"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, addMonths, subMonths, isBefore, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import "react-day-picker/style.css";

interface CalendarPickerProps {
  onSelect: (datetime: string) => void;
  selected?: string;
}

export default function CalendarPicker({ onSelect, selected }: CalendarPickerProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    selected ? new Date(selected) : undefined
  );
  const [slots, setSlots] = useState<Record<string, { time: string; booked?: boolean }[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [error, setError] = useState("");

  const today = startOfDay(new Date());

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    fetch(`/api/slots?date=${dateStr}&timeZone=Europe/Berlin`)
      .then((r) => r.json())
      .then((data) => {
        const slotsMap: Record<string, { time: string; booked?: boolean }[]> = {};
        const raw = data?.data?.[dateStr] ?? data?.slots?.[dateStr] ?? [];
        if (Array.isArray(raw)) {
          slotsMap[dateStr] = raw.map((s: { start: string; time?: string }) => ({
            time: s.start || s.time || "",
          }));
        }
        const bookedKey = `${dateStr}_booked`;
        const rawBooked = data?.data?.[bookedKey] ?? data?.slots?.[bookedKey] ?? [];
        if (Array.isArray(rawBooked) && rawBooked.length > 0) {
          const existing = slotsMap[dateStr] || [];
          slotsMap[dateStr] = [
            ...existing,
            ...rawBooked.map((s: { start: string; time?: string }) => ({
              time: s.start || s.time || "",
              booked: true,
            })),
          ];
        }
        setSlots(slotsMap);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const daySlots = selectedDate ? slots[format(selectedDate, "yyyy-MM-dd")] || [] : [];

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedTime("");
  }

  function handleConfirm() {
    if (!selectedDate || !selectedTime) return;
    const iso = new Date(selectedTime).toISOString();
    onSelect(iso);
  }

  return (
    <div className="space-y-6">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        month={month}
        onMonthChange={setMonth}
        locale={de}
        disabled={(date) => isBefore(date, today)}
        showOutsideDays={false}
        className="mx-auto"
      />

      {selectedDate && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Verfügbare Zeiten am {format(selectedDate, "dd.MM.yyyy")}
          </h4>

          {loading && <p className="text-sm text-gray-500">Lade verfügbare Zeiten...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && daySlots.length === 0 && (
            <p className="text-sm text-gray-500">Keine freien Termine an diesem Tag.</p>
          )}

          {!loading && daySlots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {daySlots.map((slot) => {
                const timeStr = format(new Date(slot.time), "HH:mm");
                const isActive = selectedTime === slot.time;
                const isBooked = slot.booked;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isBooked}
                    onClick={() => !isBooked && setSelectedTime(slot.time)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      isBooked
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                        : isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                    }`}
                    title={isBooked ? "Bereits gebucht" : timeStr}
                  >
                    {timeStr}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedDate || !selectedTime}
        onClick={handleConfirm}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Ausgewählten Termin bestätigen
      </button>
    </div>
  );
}
