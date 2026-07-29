"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Field, INPUT } from "./FormPrimitives";
import * as api from "@/lib/client-api";
import type { Address, SaveAddressPayload } from "@/lib/client-api";

const EMPTY_FORM: SaveAddressPayload = {
  addressTitle: "",
  recipientName: "",
  street: "",
  city: "",
  district: "",
  zipCode: "",
  country: "Türkiye",
  phoneNumber: "",
  isDefault: false,
};

/** Musterinin adres defteri. Checkout ve profil sayfasi ayni ucu kullanir. */
export default function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SaveAddressPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAddresses(await api.getAddresses());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adresler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    const { id, ...rest } = address;
    setForm(rest);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) await api.updateAddress(editing.id, form);
      else await api.createAddress(form);

      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adres kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Bu adresi silmek istediğinize emin misiniz?")) return;

    await api.deleteAddress(id).catch(() => undefined);
    await load();
  };

  const makeDefault = async (id: number) => {
    await api.setDefaultAddress(id).catch(() => undefined);
    await load();
  };

  return (
    <Card
      title="Adres defteri"
      action={
        !showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            Yeni adres
          </button>
        )
      }
    >
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="border border-border rounded-2xl p-4 mb-6 space-y-4">
          <h3 className="text-sm font-semibold">
            {editing ? "Adresi düzenle" : "Yeni adres ekle"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Adres başlığı">
              <input
                value={form.addressTitle}
                onChange={(e) => setForm({ ...form, addressTitle: e.target.value })}
                placeholder="Ev, İş..."
                required
                className={INPUT}
              />
            </Field>
            <Field label="Alıcı adı">
              <input
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                required
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Adres">
            <textarea
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-foreground resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="İl">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className={INPUT}
              />
            </Field>
            <Field label="İlçe">
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                required
                className={INPUT}
              />
            </Field>
            <Field label="Posta kodu">
              <input
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telefon">
              <input
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                required
                className={INPUT}
              />
            </Field>
            <Field label="Ülke">
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={INPUT}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            Varsayılan adresim olsun
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-40 rounded-lg bg-muted/50 animate-pulse" />
      ) : addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Henüz kayıtlı adresiniz yok.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div key={address.id} className="border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{address.addressTitle}</h3>
                {address.isDefault && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground text-white">
                    Varsayılan
                  </span>
                )}
              </div>

              <p className="text-sm mt-2">{address.recipientName}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {address.street}
                <br />
                {address.district} / {address.city}
                {address.zipCode ? ` ${address.zipCode}` : ""}
                <br />
                {address.country}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{address.phoneNumber}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => openEdit(address)}
                  className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition"
                >
                  Düzenle
                </button>
                {!address.isDefault && (
                  <button
                    onClick={() => makeDefault(address.id)}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition"
                  >
                    Varsayılan yap
                  </button>
                )}
                <button
                  onClick={() => remove(address.id)}
                  className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
