"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ListPlus,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { ProductField } from "@/db/schema";
import { inputCls, labelCls, selectCls } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type FieldType = ProductField["type"];

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  number: "Number",
  email: "Email",
  password: "Password",
  tel: "Phone",
  select: "Dropdown",
  radio: "Choice buttons",
  textarea: "Long text",
};

const PRESETS: Array<{ label: string; type: FieldType; placeholder: string; required: boolean }> = [
  { label: "Player ID", type: "text", placeholder: "Enter your player ID", required: true },
  { label: "Zone ID", type: "text", placeholder: "Enter your zone ID", required: true },
  { label: "Email", type: "email", placeholder: "you@example.com", required: true },
  { label: "Phone", type: "tel", placeholder: "01XXXXXXXXX", required: true },
];

type Option = { value: string; label: string };
type EditableField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string;
  options: Option[];
  keyTouched: boolean;
};

const HAS_OPTIONS = (type: FieldType) => type === "select" || type === "radio";

function toEditable(field: ProductField): EditableField {
  return {
    key: field.id,
    label: field.label,
    type: field.type,
    required: Boolean(field.required),
    placeholder: field.placeholder ?? "",
    options: (field.options ?? []).map((option) => ({ ...option })),
    keyTouched: true,
  };
}

function blankField(label = "", type: FieldType = "text"): EditableField {
  return {
    key: "",
    label,
    type,
    required: true,
    placeholder: "",
    options: HAS_OPTIONS(type) ? [{ value: "", label: "" }] : [],
    keyTouched: false,
  };
}

/** Makes every field key unique and non-empty, matching what the server stores. */
function resolveKeys(fields: EditableField[]): string[] {
  const seen = new Map<string, number>();
  return fields.map((field, index) => {
    const base = slugify(field.key || field.label) || `field-${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

export function FieldsEditor({ initial = [] }: { initial?: ProductField[] }) {
  const [fields, setFields] = useState<EditableField[]>(() => initial.map(toEditable));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const keys = useMemo(() => resolveKeys(fields), [fields]);

  const serialized = JSON.stringify(
    fields.map((field, index) => ({
      id: keys[index],
      label: field.label.trim() || "Field",
      type: field.type,
      required: field.required,
      placeholder: field.placeholder.trim() || undefined,
      options: HAS_OPTIONS(field.type)
        ? field.options
            .map((option) => ({ value: option.value.trim(), label: option.label.trim() }))
            .filter((option) => option.value && option.label)
            .map((option) => ({ value: option.value, label: option.label }))
        : undefined,
    })),
  );

  function patch(index: number, next: Partial<EditableField>) {
    setFields((current) =>
      current.map((field, i) => {
        if (i !== index) return field;
        const merged = { ...field, ...next };
        if (next.type && HAS_OPTIONS(next.type) && merged.options.length === 0) {
          merged.options = [{ value: "", label: "" }];
        }
        return merged;
      }),
    );
  }

  function add(preset?: (typeof PRESETS)[number]) {
    setFields((current) => {
      const field = preset
        ? { ...blankField(preset.label, preset.type), placeholder: preset.placeholder, required: preset.required }
        : blankField();
      return [...current, field];
    });
    setOpenIndex(fields.length);
  }

  function remove(index: number) {
    setFields((current) => current.filter((_, i) => i !== index));
    setOpenIndex(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOpenIndex(target);
  }

  const presetsToAdd = PRESETS.filter(
    (preset) => !fields.some((field) => field.label.trim().toLowerCase() === preset.label.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <input type="hidden" name="fields" value={serialized} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <UserRound className="h-4 w-4 text-accent-orange" /> Player input fields
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Details the customer enters before ordering, such as Player ID or Server.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {fields.length} field{fields.length === 1 ? "" : "s"}
        </span>
      </div>

      {presetsToAdd.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-3">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-orange-700">
            <Sparkles className="h-3.5 w-3.5" /> Quick add
          </span>
          {presetsToAdd.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => add(preset)}
              className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700 transition hover:border-accent-orange hover:bg-accent-orange hover:text-white"
            >
              <Plus className="h-3 w-3" /> {preset.label}
            </button>
          ))}
        </div>
      )}

      {fields.length === 0 ? (
        <button
          type="button"
          onClick={() => add()}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-6 py-8 text-center transition hover:border-accent-orange hover:bg-orange-50/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
            <Plus className="h-5 w-5" />
          </span>
          <span className="mt-3 text-sm font-semibold text-gray-800">Add the first player field</span>
          <span className="mt-1 max-w-xs text-xs text-gray-500">
            Without fields, the order is placed with no extra details.
          </span>
        </button>
      ) : (
        <ol className="space-y-2">
          {fields.map((field, index) => {
            const open = openIndex === index;
            return (
              <li
                key={index}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white transition",
                  open ? "border-accent-orange/40 shadow-md shadow-orange-500/5" : "border-gray-200",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {field.label.trim() || <span className="text-gray-400">Untitled field</span>}
                    </span>
                    <span className="hidden shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:inline">
                      {TYPE_LABELS[field.type]}
                    </span>
                    {field.required && (
                      <span className="hidden shrink-0 rounded-md bg-accent-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-orange sm:inline">
                        Required
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center">
                    <IconButton label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Remove field" danger onClick={() => remove(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                    <button
                      type="button"
                      aria-label={open ? "Collapse" : "Edit field"}
                      onClick={() => setOpenIndex(open ? null : index)}
                      className="ml-1 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-gray-100 bg-gray-50/60 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Label</label>
                        <input
                          value={field.label}
                          onChange={(event) => {
                            const label = event.target.value;
                            patch(index, {
                              label,
                              key: field.keyTouched ? field.key : slugify(label),
                            });
                          }}
                          placeholder="e.g. Player ID"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Input type</label>
                        <select
                          value={field.type}
                          onChange={(event) => patch(index, { type: event.target.value as FieldType })}
                          className={selectCls}
                        >
                          {(Object.keys(TYPE_LABELS) as FieldType[]).map((type) => (
                            <option key={type} value={type}>
                              {TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Placeholder</label>
                        <input
                          value={field.placeholder}
                          onChange={(event) => patch(index, { placeholder: event.target.value })}
                          placeholder="Shown inside the empty input"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Field key</label>
                        <input
                          value={field.keyTouched ? field.key : keys[index]}
                          onChange={(event) =>
                            patch(index, { key: slugify(event.target.value), keyTouched: true })
                          }
                          className={cn(inputCls, "font-mono text-xs")}
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                          Internal name used in orders. Generated from the label unless you edit it.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-3">
                        <span className="relative inline-flex h-5 w-9">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) => patch(index, { required: event.target.checked })}
                            className="peer sr-only"
                          />
                          <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange" />
                          <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                        </span>
                        <span className="text-sm font-medium text-gray-700">Required</span>
                      </label>
                    </div>

                    {HAS_OPTIONS(field.type) && (
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-700">Options</p>
                          <button
                            type="button"
                            onClick={() => patch(index, { options: [...field.options, { value: "", label: "" }] })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-orange hover:underline"
                          >
                            <ListPlus className="h-3.5 w-3.5" /> Add option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {field.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                value={option.value}
                                onChange={(event) =>
                                  patch(index, {
                                    options: field.options.map((item, i) =>
                                      i === optionIndex ? { ...item, value: event.target.value } : item,
                                    ),
                                  })
                                }
                                placeholder="Value (sent to us)"
                                className={cn(inputCls, "h-9 font-mono text-xs")}
                              />
                              <input
                                value={option.label}
                                onChange={(event) =>
                                  patch(index, {
                                    options: field.options.map((item, i) =>
                                      i === optionIndex ? { ...item, label: event.target.value } : item,
                                    ),
                                  })
                                }
                                placeholder="Label (shown to customer)"
                                className={cn(inputCls, "h-9 text-xs")}
                              />
                              <IconButton
                                label="Remove option"
                                danger
                                disabled={field.options.length === 1}
                                onClick={() =>
                                  patch(index, { options: field.options.filter((_, i) => i !== optionIndex) })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </IconButton>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {fields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => add()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:border-accent-orange hover:text-accent-orange"
          >
            <Plus className="h-3.5 w-3.5" /> Add custom field
          </button>
          <CustomerPreview fields={fields} keys={keys} />
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-gray-400 transition disabled:cursor-not-allowed disabled:opacity-30",
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-gray-100 hover:text-gray-700",
      )}
    >
      {children}
    </button>
  );
}

function CustomerPreview({ fields, keys }: { fields: EditableField[]; keys: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-semibold text-gray-500 underline-offset-4 hover:text-accent-orange hover:underline"
      >
        {open ? "Hide" : "Preview"} what the customer sees
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-[#121212] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-orange">
            Account details
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field, index) => (
              <div key={keys[index]} className={cn(field.type === "textarea" && "sm:col-span-2")}>
                <p className="mb-1 text-xs font-semibold text-white/80">
                  {field.label.trim() || "Field"}
                  {field.required && <span className="text-accent-orange"> *</span>}
                </p>
                {HAS_OPTIONS(field.type) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {field.options
                      .filter((option) => option.label.trim())
                      .map((option, i) => (
                        <span
                          key={`${keys[index]}-${i}`}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
                        >
                          {option.label}
                        </span>
                      ))}
                  </div>
                ) : field.type === "textarea" ? (
                  <div className="h-16 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/35">
                    {field.placeholder || "..."}
                  </div>
                ) : (
                  <div className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/35">
                    {field.placeholder || "..."}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
