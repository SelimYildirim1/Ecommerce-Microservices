"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Field, INPUT } from "@/components/FormPrimitives";
import * as api from "@/lib/client-api";
import { notify } from "@/lib/feedback";

export default function ProfileForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    userName: "",
    createdAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.getProfile();
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phoneNumber: profile.phoneNumber ?? "",
        email: profile.email,
        userName: profile.userName,
        createdAt: profile.createdAt,
      });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });
      notify.success("Profil bilgileriniz güncellendi.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <Card title="Profil bilgileri">
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ad">
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Soyad">
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Telefon">
          <input
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="5xx xxx xx xx"
            className={INPUT}
          />
        </Field>

        <Field label="E-posta">
          <input
            value={form.email}
            disabled
            className={`${INPUT} bg-muted/50 text-muted-foreground`}
          />
        </Field>

        <Field label="Kullanıcı adı">
          <input
            value={form.userName}
            disabled
            className={`${INPUT} bg-muted/50 text-muted-foreground`}
          />
        </Field>

        {form.createdAt && (
          <p className="text-xs text-muted-foreground">
            Üyelik tarihi: {new Date(form.createdAt).toLocaleDateString("tr-TR")}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </Card>
  );
}
