// Services, brands and models, loaded once per app session and shared by screens.
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

let cache = null;
let pending = null;
const listeners = new Set();

const norm = s =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// "MAHINDRA,MAHINDRA SUV (...)" -> "Mahindra", "TOYOTA" -> "Toyota", "MG (Morris Garages)" -> "MG"
export function brandLabel(name) {
  const s = String(name || "").split(/[,(]/)[0].trim();
  if (s.length <= 3) return s.toUpperCase();
  return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase()) : s;
}

export const initials = name =>
  brandLabel(name).split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

// Service names in the database contain emoji; strip them for display.
export function cleanName(name) {
  const s = String(name || "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b\w+/g, w => (/^(ac|abs|ecu|ecm)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    : s;
}

export const cleanText = text =>
  String(text || "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function build({ general, special, vehicleBrands, carBrands, carModels }) {
  const services = [
    ...general.map(s => ({ ...s, type: "general", hero: s.image })),
    ...special.map(s => ({ ...s, type: "special", hero: s.heroImage })),
  ]
    .filter(s => s.slug)
    .map(s => ({ ...s, title: cleanName(s.name) }));

  // Booking brands come from "vehicleBrands"; logos from "carbrands".
  const brands = vehicleBrands.map(b => {
    const key = norm(b.name);
    const first = norm(brandLabel(b.name));
    const cb = carBrands.find(c => {
      const k = norm(c.name);
      return k && (k === key || key.startsWith(k) || k === first);
    });
    const models = [
      ...new Set((b.models || []).flatMap(m => String(m).split(/\n+/)).map(m => m.trim()).filter(Boolean)),
    ];
    return { ...b, label: brandLabel(b.name), logo: cb?.logo || null, brandSlug: cb?.brandSlug || b.slug, models };
  });

  return { services, brands, carBrands, carModels };
}

// Photo for a trim: exact model name → listed variant → longest name prefix ("Creta SX" → "Creta").
export function modelPhoto(carModels, brand, trim) {
  const photos = carModels.filter(m => m.brandSlug === brand.brandSlug);
  const k = norm(trim);
  return (
    photos.find(p => norm(p.name) === k) ||
    photos.find(p => (p.variants || []).some(v => norm(v) === k)) ||
    photos
      .filter(p => p.name && trim.toLowerCase().startsWith(p.name.toLowerCase() + " "))
      .sort((a, b) => b.name.length - a.name.length)[0] ||
    null
  );
}

async function load() {
  const [general, special, vehicleBrands, carBrands, carModels] = await Promise.all([
    api.generalServices(),
    api.specialServices(),
    api.vehicleBrands(),
    api.carBrands().catch(() => []),
    api.carModels().catch(() => []),
  ]);
  return build({ general, special, vehicleBrands, carBrands, carModels });
}

export function useCatalog() {
  const [state, setState] = useState({ data: cache, error: null, loading: !cache });

  const refresh = useCallback(async (force = false) => {
    if (cache && !force) return setState({ data: cache, error: null, loading: false });
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      pending ??= load();
      cache = await pending;
      listeners.forEach(fn => fn(cache));
    } catch (error) {
      setState(s => ({ ...s, loading: false, error }));
    } finally {
      pending = null;
    }
  }, []);

  useEffect(() => {
    const fn = data => setState({ data, error: null, loading: false });
    listeners.add(fn);
    refresh();
    return () => listeners.delete(fn);
  }, [refresh]);

  return { ...state, refresh: () => refresh(true) };
}
