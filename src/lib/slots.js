// Appointment times: hourly, 7 AM – 7 PM, at most SLOT_CAPACITY cars per hour.
// Shared by the website, the app (through /api/bookings/availability) and the server check.
import clientPromise from "@/lib/mongodb";

export const SLOT_CAPACITY = 2;
export const SLOT_TIMES = [
  "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM",
];
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today's date in India (bookings are for the Guntur workshop).
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

// Minutes since midnight for "02:00 PM".
const minutesOf = slot => {
  const [, h, m, ap] = slot.match(/(\d+):(\d+) (AM|PM)/);
  return ((+h % 12) + (ap === "PM" ? 12 : 0)) * 60 + +m;
};

// A slot today is bookable until 1 hour before it starts (India time).
export function slotPassed(date, slot) {
  const today = todayIST();
  if (date < today) return true;
  if (date > today) return false;
  const now = new Date(Date.now() + 5.5 * 3600e3);
  return minutesOf(slot) - (now.getUTCHours() * 60 + now.getUTCMinutes()) < 60;
}

// { "07:00 AM": 1, … } — active (not cancelled) bookings per slot on that date.
export async function bookedCounts(date) {
  const rows = await (await clientPromise)
    .db("automotivecarcare")
    .collection("bookings")
    .aggregate([
      { $match: { bookingDate: date, status: { $ne: "cancelled" } } },
      { $group: { _id: "$bookingTime", n: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map(r => [r._id, r.n]));
}

export async function availability(date) {
  const counts = await bookedCounts(date);
  return SLOT_TIMES.map(time => {
    const booked = counts[time] || 0;
    const left = Math.max(SLOT_CAPACITY - booked, 0);
    return { time, left, passed: slotPassed(date, time), available: left > 0 && !slotPassed(date, time) };
  });
}
