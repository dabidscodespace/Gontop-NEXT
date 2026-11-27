"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useState } from "react";

function Feedback({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
        error
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {error ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {error || success}
    </div>
  );
}

export function ProfileForm({
  defaultName,
  defaultPhone,
  email,
}: {
  defaultName: string;
  defaultPhone: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save.");
      setSuccess("Profile updated.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
        <input
          value={email}
          disabled
          className="h-11 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500"
        />
      </div>
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-xs font-semibold text-gray-600">
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-xs font-semibold text-gray-600">
          Phone
        </label>
        <input
          id="profile-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="01XXXXXXXXX"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>
      <Feedback error={error} success={success} />
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-orange text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not update password.");
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-xs font-semibold text-gray-600">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Google-only accounts can leave this empty and set a password for the first time.
        </p>
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-gray-600">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>
      <Feedback error={error} success={success} />
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-accent-orange hover:text-accent-orange disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}
