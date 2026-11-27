"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { inputCls, labelCls } from "@/components/admin/ui";

export function ImageField({
  name = "image",
  defaultValue = "",
  label = "Image",
  hint,
}: {
  name?: string;
  defaultValue?: string;
  label?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed");
      setValue(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={`Upload ${label}`}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-accent-orange disabled:opacity-60"
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-gray-400 group-hover:text-accent-orange" />
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="h-5 w-5 animate-spin text-accent-orange" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            name={name}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://... or click the box to upload"
            className={inputCls}
          />
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="font-semibold text-accent-orange hover:underline disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="font-medium text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}
