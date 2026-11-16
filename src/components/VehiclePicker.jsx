"use client";

import { useMemo, useState } from "react";

// Visual brand → model picker for the booking form.
// Brands and model names come from "vehicleBrands"; brand logos come from
// "carbrands" and model photos from "carmodels" (both uploaded in the admin
// dashboard). Anything without an image gets a clean placeholder tile.

const norm = s =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// "MAHINDRA,MAHINDRA SUV (...)" -> "MAHINDRA", "MG (Morris Garages)" -> "MG"
const displayBrand = name => String(name || "").split(/[,(]/)[0].trim();

const initials = name =>
  displayBrand(name)
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

function CarSilhouette() {
  return (
    <svg viewBox="0 0 64 32" className="vp-silhouette" aria-hidden="true">
      <path
        d="M6 22c0-3 1.5-4.5 4-5.2l7-2.3 6.5-5.3C25 8 26.6 7.5 28.5 7.5h11c2 0 3.6.7 5 2l5.3 5 6 1.6c2.4.6 4.2 2.4 4.2 4.9v3H55a5 5 0 0 0-10 0H21a5 5 0 0 0-10 0H6v-2Z"
        fill="currentColor"
      />
      <circle cx="16" cy="24" r="3.6" fill="currentColor" />
      <circle cx="50" cy="24" r="3.6" fill="currentColor" />
    </svg>
  );
}

export default function VehiclePicker({ brands, logos, modelImages, brand, model, onChange }) {
  const [brandQuery, setBrandQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [otherModel, setOtherModel] = useState(false);

  // Attach logo to each brand (match "SKODA" with "ŠKODA", "MAHINDRA,..." with "Mahindra", etc.)
  const brandList = useMemo(
    () =>
      brands.map(b => {
        const key = norm(b.name);
        const logo = logos.find(l => {
          const lk = norm(l.name);
          return lk && (lk === key || key.startsWith(lk) || lk.startsWith(norm(displayBrand(b.name))));
        });
        return { ...b, label: displayBrand(b.name), logo: logo?.logo || null };
      }),
    [brands, logos]
  );

  const selectedBrand = brandList.find(b => b.slug === brand);

  const modelList = useMemo(() => {
    if (!selectedBrand) return [];
    const bKey = norm(selectedBrand.label);
    const photos = modelImages.filter(m => {
      const mk = norm(m.brand);
      return mk && (mk === bKey || norm(selectedBrand.name).startsWith(mk) || mk.startsWith(bKey));
    });
    // Some stored entries hold two models separated by a line break.
    const names = [
      ...new Set(
        (selectedBrand.models || [])
          .flatMap(m => String(m).split(/\n+/))
          .map(m => m.trim())
          .filter(Boolean)
      ),
    ];
    // Photo priority: exact model name → listed as a variant of a model →
    // name starts with the model's name (e.g. "Creta SX" → "Creta").
    const findPhoto = name => {
      const k = norm(name);
      return (
        photos.find(p => norm(p.name) === k) ||
        photos.find(p => (p.variants || []).some(v => norm(v) === k)) ||
        photos
          .filter(p => p.name && name.toLowerCase().startsWith(p.name.toLowerCase() + " "))
          .sort((a, b) => b.name.length - a.name.length)[0] ||
        null
      );
    };
    return names.map(name => {
      const p = findPhoto(name);
      return {
        name,
        image: p?.image || null,
        credit: p?.photoCredit ? `Photo: ${p.photoCredit}${p.photoLicense ? `, ${p.photoLicense}` : ""} (Wikimedia Commons)` : "",
      };
    });
  }, [selectedBrand, modelImages]);

  const q = norm(brandQuery);
  const shownBrands = q ? brandList.filter(b => norm(b.name).includes(q)) : brandList;
  const mq = norm(modelQuery);
  const shownModels = mq ? modelList.filter(m => norm(m.name).includes(mq)) : modelList;

  const pickBrand = slug => {
    setModelQuery("");
    setOtherModel(false);
    onChange({ brand: slug, model: "" });
  };

  // ── Step 2: models of the chosen brand ───────────────────────────────────
  if (selectedBrand) {
    return (
      <div className="vp">
        <div className="vp-selected">
          <div className="vp-selected-logo">
            {selectedBrand.logo ? (
              <img src={selectedBrand.logo} alt={`${selectedBrand.label} logo`} />
            ) : (
              <span className="vp-initials">{initials(selectedBrand.name)}</span>
            )}
          </div>
          <div className="vp-selected-text">
            <span className="vp-step">Brand</span>
            <strong>{selectedBrand.label}</strong>
          </div>
          <button type="button" className="vp-change" onClick={() => pickBrand("")}>
            Change brand
          </button>
        </div>

        <div className="vp-head">
          <label className="form-label" htmlFor="vp-model-search">
            Select your {selectedBrand.label} model *
          </label>
          {model && !otherModel && <span className="vp-chosen">✓ {model}</span>}
        </div>

        {modelList.length > 8 && (
          <input
            id="vp-model-search"
            type="search"
            className="form-input vp-search"
            placeholder={`Search ${modelList.length} ${selectedBrand.label} models…`}
            value={modelQuery}
            onChange={e => setModelQuery(e.target.value)}
          />
        )}

        <div className="vp-grid vp-grid-models" role="radiogroup" aria-label="Vehicle model">
          {shownModels.map(m => {
            const active = !otherModel && model === m.name;
            return (
              <button
                type="button"
                key={m.name}
                role="radio"
                aria-checked={active}
                className={`vp-tile vp-model${active ? " vp-active" : ""}`}
                onClick={() => {
                  setOtherModel(false);
                  onChange({ brand, model: m.name });
                }}
              >
                <span className="vp-model-img">
                  {m.image ? (
                    <img
                      src={m.image}
                      alt={`${selectedBrand.label} ${m.name}`}
                      title={m.credit || undefined}
                      loading="lazy"
                    />
                  ) : (
                    <CarSilhouette />
                  )}
                </span>
                <span className="vp-name">{m.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={otherModel}
            className={`vp-tile vp-model${otherModel ? " vp-active" : ""}`}
            onClick={() => {
              setOtherModel(true);
              onChange({ brand, model: "" });
            }}
          >
            <span className="vp-model-img vp-other-icon">+</span>
            <span className="vp-name">Other model</span>
          </button>
        </div>

        {shownModels.length === 0 && modelQuery && (
          <p className="helper-text">No model matches “{modelQuery}”. Choose “Other model” to type it.</p>
        )}

        {otherModel && (
          <input
            type="text"
            className="form-input vp-other-input"
            placeholder={`Type your ${selectedBrand.label} model`}
            value={model}
            onChange={e => onChange({ brand, model: e.target.value })}
            autoFocus
            required
          />
        )}
      </div>
    );
  }

  // ── Step 1: brands ───────────────────────────────────────────────────────
  return (
    <div className="vp">
      <div className="vp-head">
        <label className="form-label" htmlFor="vp-brand-search">Select your car brand *</label>
      </div>
      {brandList.length > 8 && (
        <input
          id="vp-brand-search"
          type="search"
          className="form-input vp-search"
          placeholder="Search brands…"
          value={brandQuery}
          onChange={e => setBrandQuery(e.target.value)}
        />
      )}
      <div className="vp-grid vp-grid-brands" role="radiogroup" aria-label="Vehicle brand">
        {shownBrands.map(b => (
          <button
            type="button"
            key={b._id || b.slug}
            role="radio"
            aria-checked={false}
            className="vp-tile vp-brand"
            onClick={() => pickBrand(b.slug)}
          >
            <span className="vp-logo">
              {b.logo ? (
                <img src={b.logo} alt={`${b.label} logo`} loading="lazy" />
              ) : (
                <span className="vp-initials">{initials(b.name)}</span>
              )}
            </span>
            <span className="vp-name">{b.label}</span>
            <span className="vp-count">{(b.models || []).length} models</span>
          </button>
        ))}
      </div>
      {shownBrands.length === 0 && (
        <p className="helper-text">No brand matches “{brandQuery}”.</p>
      )}
    </div>
  );
}

