import { API_URL } from "./config";

async function request(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No internet connection. Please try again.");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || data.success === false) {
    const err = new Error(data.error || `Something went wrong (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Public data (same APIs the website uses) ──
export const api = {
  generalServices: () => request("/api/detailed-services").then(d => d.services || []),
  specialServices: () => request("/api/special-services").then(d => d.services || []),
  vehicleBrands: () => request("/api/vehicle-brands").then(d => d.brands || []),
  carBrands: () => request("/api/car-brands").then(d => d.brands || []),
  carModels: () => request("/api/car-models").then(d => d.models || []),
  createBooking: booking => request("/api/bookings", { method: "POST", body: booking }),
  sendMessage: msg => request("/api/contact", { method: "POST", body: msg }),

  // ── Staff (signed token) ──
  staffLogin: (username, password) => request("/api/mobile/login", { method: "POST", body: { username, password } }),
  staffBookings: token => request("/api/mobile/bookings", { token }).then(d => d.bookings || []),
  setBookingStatus: (token, id, status) => request("/api/mobile/bookings", { method: "PATCH", token, body: { id, status } }),
  deleteBooking: (token, id) => request(`/api/mobile/bookings?id=${id}`, { method: "DELETE", token }),
};
