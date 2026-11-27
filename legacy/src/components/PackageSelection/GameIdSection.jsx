// src/components/product/GameIdSection.jsx
import { AlertTriangle, Loader } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProductGameInputs } from "../../api/gameInputs";
import { useGameValidation } from "../../hooks/useGameValidation";

const LOGIN_CATEGORY_ID = 91;

const decodeHtml = (html) => {
  if (!html) return "";
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
};

export default function GameIdSection({ product, onGameDataChange }) {
  const [fields, setFields] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // ← fetch error
  const [sectionTitle, setSectionTitle] = useState("");
  const [showWarning, setShowWarning] = useState(true);

  const isLoginType = useMemo(
    () =>
      product?.categories?.some(
        (cat) =>
          cat.id === LOGIN_CATEGORY_ID || cat.parent === LOGIN_CATEGORY_ID
      ) ?? false,
    [product?.categories]
  );

  const {
    checking,
    username,
    region,
    error: validationError,
    isValid,
    validate,
    hasValidation,
    unavailableVariations,
    fieldMapping,
  } = useGameValidation(product?.id, fields);

  // -------- Fetch product fields once --------
  useEffect(() => {
    if (!product?.id) return;

    let cancelled = false;

    const fetchInputs = async () => {
      setLoading(true);
      setError(null);
      setFields([]);
      setFormData({});

      try {
        const data = await getProductGameInputs(product.id);
        if (cancelled) return;

        const all = data?.fields || [];


        const EXCLUDED_TYPES = ["section", "sectionend", "p", "heading"];
        const filtered = all.filter(
          (f) => !EXCLUDED_TYPES.includes(f.type?.toLowerCase())
        );


        const labels = Object.fromEntries(
          filtered.map((f) => [f.id, decodeHtml(f.label)])
        );

        setFields(filtered);
        setFieldLabels(labels);
        setSectionTitle(data?.sectionTitle || "");

        onGameDataChange?.({
          fieldLabels: labels,
          hasFields: filtered.length > 0,
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[GameIdSection] Error fetching fields:", err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInputs();
    return () => {
      cancelled = true;
    };
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Handle field changes --------
  const handleChange = (id, label, readableLabel, rawValue) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [id]: {
          label: decodeHtml(label),
          value: readableLabel,
          rawValue,
        },
      };

      const allFilled = fields.every((f) => {
        const v = updated[f.id]?.value;
        return v && v.toString().trim() !== "";
      });

      if (allFilled) validate(updated);

      return updated;
    });
  };

  const isComplete =
    fields.length > 0 &&
    fields.every((f) =>
      formData[f.id]?.value
        ? formData[f.id].value.toString().trim() !== ""
        : false
    );

  const isVerified = hasValidation ? isValid : isComplete;

  // -------- Upstream sync --------
  // Use ref to prevent stale closure + unnecessary re-renders
  const onGameDataChangeRef = useRef(onGameDataChange);
  useEffect(() => {
    onGameDataChangeRef.current = onGameDataChange;
  });

  useEffect(() => {
    const flatFields = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v.value])
    );

    onGameDataChangeRef.current?.({
      formData,
      fields: flatFields,
      fieldLabels,
      isValid,
      isComplete,
      isVerified,
      username,
      region,
      checking,
      error: validationError,
      hasValidation,
      hasFields: fields.length > 0,
      unavailableVariations,
      fieldMapping,
    });
  }, [
    formData,
    fieldLabels,
    isValid,
    isComplete,
    isVerified,
    username,
    region,
    checking,
    validationError,
    hasValidation,
    fields.length,
    unavailableVariations,
    fieldMapping,
  ]);

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Loader className="h-5 w-5 animate-spin text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Loading game fields...
            </p>
            <p className="text-xs text-gray-500">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Failed to load game fields: {error}</span>
        </div>
      </div>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10">
          <div className="absolute bottom-0 left-1 h-8 w-8 rounded-lg bg-orange-300" />
          <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white shadow-md">
            1
          </div>
        </div>
        <h3 className="text-sm font-bold text-gray-800">
          {sectionTitle || "Enter Game Details"}
        </h3>
      </div>

      {/* Login warning */}
      {isLoginType && showWarning && (
        <WarningNote onClose={() => setShowWarning(false)} />
      )}

      {/* Fields */}
      <div className="flex flex-wrap gap-3">
        {fields.map((field) => (
          <div
            key={field.id}
            className="min-w-[calc(50%-0.375rem)] flex-1 space-y-1"
          >
            {/* Field label */}
            <label
              htmlFor={field.id}
              className="block text-xs font-medium text-gray-600"
            >
              {decodeHtml(field.label)}
            </label>

            <Field
              field={field}
              value={formData[field.id]?.value || ""}
              rawValue={formData[field.id]?.rawValue || ""}
              onChange={(raw, readable) =>
                handleChange(field.id, field.label, readable, raw)
              }
            />
          </div>
        ))}
      </div>

      {/* Validation status */}
      {isComplete && (
        <ValidationStatus
          checking={checking}
          username={username}
          region={region}
          error={validationError}
          isValid={isValid}
          hasValidation={hasValidation}
        />
      )}
    </div>
  );
}

// ─── Field Component ────────────────────────────────────────────────────────

function Field({ field, value, rawValue, onChange }) {
  const base =
    "w-full h-12 rounded-lg border border-gray-300 bg-white px-3 text-sm " +
    "text-gray-800 placeholder:text-gray-400 focus:border-orange-500 " +
    "focus:bg-orange-50/50 focus:outline-none focus:ring-2 " +
    "focus:ring-orange-500/20 transition-all";

  const label = decodeHtml(field.label);
  const type = field.type?.toLowerCase();

  // ── text / number / email / password ──
  if (["text", "number", "email", "password", "tel"].includes(type)) {
    return (
      <input
        id={field.id}
        type={type}
        value={value}
        placeholder={field.options?.placeholder || label}
        onChange={(e) => onChange(e.target.value, e.target.value)}
        className={base}
      />
    );
  }

  // ── select / dropdown ──
  if (["select", "dropdown"].includes(type)) {
    // Support both array and object shapes for choices
    const rawChoices = field.options?.choices ?? field.choices ?? [];

    // Normalize: [{slug, label}] or {"slug": "label"} or ["value"]
    const options = normalizeChoices(rawChoices);

    console.log(`[Field] select "${field.id}" options:`, options);

    return (
      <select
        id={field.id}
        value={rawValue || ""}
        onChange={(e) => {
          const selected = options.find((o) => o.slug === e.target.value);
          onChange(e.target.value, decodeHtml(selected?.label || e.target.value));
        }}
        className={`${base} cursor-pointer`}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {decodeHtml(opt.label)}
          </option>
        ))}
      </select>
    );
  }

  // ── radio ──
  if (type === "radio") {
    const rawChoices = field.options?.choices ?? field.choices ?? [];
    const options = normalizeChoices(rawChoices);

    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((opt) => (
          <label
            key={opt.slug}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all ${
              rawValue === opt.slug
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-orange-300"
            }`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt.slug}
              checked={rawValue === opt.slug}
              onChange={() => onChange(opt.slug, decodeHtml(opt.label))}
              className="sr-only"
            />
            {decodeHtml(opt.label)}
          </label>
        ))}
      </div>
    );
  }

  // ── textarea ──
  if (type === "textarea") {
    return (
      <textarea
        id={field.id}
        value={value}
        placeholder={field.options?.placeholder || label}
        onChange={(e) => onChange(e.target.value, e.target.value)}
        rows={3}
        className={`${base} h-auto py-2`}
      />
    );
  }

  // ── Fallback: unknown type — show debug info in dev ──
  if (process.env.NODE_ENV === "development") {
    return (
      <div className="rounded border border-dashed border-yellow-400 bg-yellow-50 p-2 text-xs text-yellow-700">
        Unsupported field type: <strong>{field.type}</strong> (id: {field.id})
        <pre className="mt-1 overflow-auto text-[10px]">
          {JSON.stringify(field, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}

/**
 * Normalize choices from various API shapes:
 *  - Array of {slug, label}  → as-is
 *  - Array of {value, label} → map value→slug
 *  - Array of strings        → {slug: s, label: s}
 *  - Plain object            → Object.entries → {slug: k, label: v}
 */
function normalizeChoices(choices) {
  if (!choices) return [];

  if (Array.isArray(choices)) {
    return choices.map((c) => {
      if (typeof c === "string") return { slug: c, label: c };
      return {
        slug: c.slug ?? c.value ?? c.key ?? String(c),
        label: c.label ?? c.name ?? c.text ?? String(c),
      };
    });
  }

  if (typeof choices === "object") {
    return Object.entries(choices).map(([k, v]) => ({
      slug: k,
      label: typeof v === "string" ? v : v?.label ?? k,
    }));
  }

  return [];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function WarningNote({ onClose }) {
  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
        <span className="text-xl text-white">🤖</span>
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-none bg-white/60 px-4 py-3 backdrop-blur-sm">
        <p className="text-sm font-semibold text-gray-700">Hey there! 👋</p>
        <p className="mt-1 text-xs text-gray-500">
          Make sure your login details are correct for fastest delivery 🚀
        </p>
      </div>
      <button
        onClick={onClose}
        className="cursor-pointer text-[11px] font-semibold text-blue-400 hover:text-blue-600"
      >
        Close
      </button>
    </div>
  );
}

function ValidationStatus({
  checking,
  username,
  region,
  error,
  isValid,
  hasValidation,
}) {
  if (checking) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-gray-700">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />
        <span className="text-sm font-medium">Verifying account...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (hasValidation && isValid && username) {
    return (
      <div className="rounded-lg bg-green-50 p-3 text-green-600">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span className="text-sm font-medium">
            IGN: <strong>{username}</strong>
          </span>
        </div>
        {region && (
          <div className="ml-7 text-sm text-gray-600">
            Region: <strong>{region}</strong>
          </div>
        )}
      </div>
    );
  }

  if (!hasValidation && isValid) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
        <CheckIcon />
        <span className="text-sm">Please make sure your details are correct</span>
      </div>
    );
  }

  return null;
}

function CheckIcon() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
      <svg
        className="h-3 w-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}