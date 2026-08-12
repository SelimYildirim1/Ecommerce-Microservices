"use client";

import { useState } from "react";
import { Card, Field, INPUT } from "@/components/FormPrimitives";
import * as api from "@/lib/client-api";
import { notify } from "@/lib/feedback";

export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (next !== confirm) {
      notify.error("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      notify.success("Şifreniz güncellendi.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Şifre değiştir">
      <form onSubmit={submit} className="max-w-md space-y-4">
        <Field label="Mevcut şifre">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className={INPUT}
          />
        </Field>
        <Field label="Yeni şifre">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            className={INPUT}
          />
        </Field>
        <Field label="Yeni şifre (tekrar)">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className={INPUT}
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Güncelleniyor..." : "Şifreyi değiştir"}
        </button>
      </form>
    </Card>
  );
}
